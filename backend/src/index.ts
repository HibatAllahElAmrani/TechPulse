import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { getEnv } from './config/env.js';
import pgPlugin from './plugins/pg.js';
import redisPlugin from './plugins/redis.js';
import socketioPlugin from './plugins/socketio.js';
import healthRoutes from './routes/health.js';
import projectsRoutes from './routes/projects.js';
import alertsRoutes from './routes/alerts.js';
import { createMetricsQueue, createMetricsWorker } from './workers/metricsWorker.js';
import { createAlertsQueue, createAlertsWorker } from './workers/alertsWorker.js';
import { startScheduler } from './workers/scheduler.js';



async function buildServer() {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
  });

  
  // ---- Global plugins ----
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // ---- Infrastructure plugins ----
  await app.register(pgPlugin);
  await app.register(redisPlugin);
  await app.register(socketioPlugin);

  // ---- Workers ----
  const metricsQueue = createMetricsQueue();
  const metricsWorker = createMetricsWorker(app);
  const alertsQueue = createAlertsQueue();
  const alertsWorker = createAlertsWorker(app);
  await startScheduler(app, metricsQueue, alertsQueue);

  app.addHook('onClose', async () => {
    await metricsWorker.close();
    await metricsQueue.close();
    await alertsWorker.close(); 
    await alertsQueue.close();
  });

  // ---- Routes ----
  await app.register(healthRoutes);
  await app.register(
    async (fastify) => {
      await fastify.register(projectsRoutes, { metricsQueue });
      await fastify.register(alertsRoutes);
    },
    { prefix: '/api/v1' }
  );


  // ---- Root ----
  app.get('/', async () => ({
    name: 'OSS Pulse API',
    version: '0.1.0',
    docs: '/api/v1',
  }));

  return app;
}

async function start() {
  const env = getEnv();
  try {
    const app = await buildServer();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Backend running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
