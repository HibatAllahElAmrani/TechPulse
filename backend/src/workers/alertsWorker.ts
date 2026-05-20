import { Queue, Worker, type Job } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import { evaluateAlerts } from '../services/alertsEvaluator';
import { getEnv } from '../config/env';

export const ALERTS_QUEUE_NAME = 'alerts-evaluation';

/*
 * Alerts Worker : 
 
 Handles periodic evaluation of all active user alerts.
 Runs every 30s via a BullMQ repeatable job stored in Redis —
 survives server restarts unlike setInterval.

 */

 export function createAlertsQueue(): Queue {
  const env = getEnv();
  return new Queue(ALERTS_QUEUE_NAME, {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { 
        type: 'exponential',
        delay: 5_000
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });
 }

 export function createAlertsWorker(fastify: FastifyInstance): Worker {
  const env = getEnv();

  const worker = new Worker(
    ALERTS_QUEUE_NAME,
    async (job: Job) => {
      fastify.log.debug(`🔔 Running alerts evaluation (job ${job.id})`);

      const { evaluated, triggered } = await evaluateAlerts(fastify.pg);

      fastify.log.debug(`🔔 Alerts evaluated: ${evaluated}, triggered: ${triggered.length}`);

      return { evaluated, triggered };
    },
    {
      connection: { host: env.REDIS_HOST, port: env.REDIS_PORT },
      concurrency: 1, // 1 alert at a timealerts — evaluation should never run in parallel
    }
  );

  worker.on('completed', (job) => {
    fastify.log.debug({ jobId: job.id }, '✅ Alerts job completed');
  });

  worker.on('failed', (job, err) => {
    fastify.log.error({ jobId: job?.id, err }, '⚠️ Alerts job failed')
  });

  return worker;
 }
