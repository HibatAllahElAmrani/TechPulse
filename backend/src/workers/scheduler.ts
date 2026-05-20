import type { Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import type { CollectJobData } from './metricsWorker.js';

/** Scheduler — periodic job dispatcher
 
 * Acts as the heartbeat of the data pipeline. Rather than fetching GitHub data directly (from the API), it enqueues collection jobs into the BullMQ queue at different frequencies depending on how often each metric changes:

    - HIGH   (every 30s)  : stars, issues      — fast-changing, user-facing
    - MEDIUM (every 5min) : commits, PRs        — moderate change rate
    - LOW    (every 15min): contributors        — rarely changes
 
 * Also evaluates all active user alerts every 30s, checking whether any tracked metric has crossed its configured threshold.
 
 * Uses setInterval() for all recurring tasks. All intervals are registered in the Fastify onClose hook so they're cleaned up on server shutdown.
 */

export async function startScheduler(
  fastify: FastifyInstance,
  metricsQueue: Queue<CollectJobData>,
  alertsQueue: Queue,
) {
  const HIGH_INTERVAL = 30_000;       // 30s
  const MEDIUM_INTERVAL = 5 * 60_000; // 5 min
  const LOW_INTERVAL = 15 * 60_000;   // 15 min


  // ---- Metrics collection jobs (setInterval — enqueue only, lightweight) ----
  async function enqueueAll(priority: 'high' | 'medium' | 'low') {
    const { rows } = await fastify.pg.query<{
      id: string;
      owner: string;
      repo: string;
    }>(`SELECT id, owner, repo FROM projects WHERE is_archived = FALSE LIMIT 100`);

    if (rows.length === 0) return;

    fastify.log.debug(
      `📅 Scheduler enqueuing ${rows.length} ${priority}-priority jobs`
    );

    await Promise.all(
      rows.map((row) =>
        metricsQueue.add(
          `collect:${priority}:${row.id}`,
          { projectId: row.id, owner: row.owner, repo: row.repo, priority },
          {
            jobId: `${priority}:${row.id}:${Date.now()}`,
            priority: priority === 'high' ? 1 : priority === 'medium' ? 2 : 3,
          }
        )
      )
    );
  }

  const handles = [
    setInterval(() => enqueueAll('high')
                      .catch((err) => 
                        fastify.log.error({ err }, 'High scheduler failed')), 
                        HIGH_INTERVAL
                ),
    setInterval(() => enqueueAll('medium')
                      .catch((err) => 
                        fastify.log.error({ err }, 'Medium scheduler failed')),
                        MEDIUM_INTERVAL
                ),
    setInterval(() => enqueueAll('low')
                      .catch((err) => 
                        fastify.log.error({ err }, 'Low scheduler failed')), 
                        LOW_INTERVAL
                ),
  ];

   // ---- Alerts evaluation job (BullMQ repeatable — survives restarts) ----
   await alertsQueue.add(
    'evaluate-alerts',
    {}, // no payload needed, the worker fetches everything itself
    {
      jobId: 'evaluate-alerts-repeatable',
      repeat: { every: HIGH_INTERVAL }, 
    }
   );

  fastify.log.info('📅 Scheduler started (high=30s, medium=5min, low=15min, alerts=30s via BullM)');

  fastify.addHook('onClose', async () => {
    handles.forEach((h) => clearInterval(h));
    await alertsQueue.removeRepeatable('evaluate-alerts', { every: HIGH_INTERVAL });
  });
}
