import type { Queue } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import type { CollectJobData } from './metricsWorker.js';

/**
 * Periodically enqueues collection jobs based on priority tiers,
 * matching the cahier des charges spec:
 *   HIGH:   stars/issues   → every 30s
 *   MEDIUM: commits/PRs    → every 5min
 *   LOW:    contributors   → every 15min
 *
 * For MVP simplicity, we use a single job that fetches everything,
 * with the `priority` field controlling whether to refresh contributors/commits.
 */
export function startScheduler(
  fastify: FastifyInstance,
  queue: Queue<CollectJobData>
) {
  const HIGH_INTERVAL = 30_000;     // 30s
  const MEDIUM_INTERVAL = 5 * 60_000; // 5 min
  const LOW_INTERVAL = 15 * 60_000;   // 15 min

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
        queue.add(
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
    setInterval(() => enqueueAll('high').catch((err) => fastify.log.error({ err }, 'High scheduler failed')), HIGH_INTERVAL),
    setInterval(() => enqueueAll('medium').catch((err) => fastify.log.error({ err }, 'Medium scheduler failed')), MEDIUM_INTERVAL),
    setInterval(() => enqueueAll('low').catch((err) => fastify.log.error({ err }, 'Low scheduler failed')), LOW_INTERVAL),
  ];

  fastify.log.info('📅 Scheduler started (high=30s, medium=5min, low=15min)');

  fastify.addHook('onClose', async () => {
    handles.forEach((h) => clearInterval(h));
  });
}
