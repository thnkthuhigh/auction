import 'dotenv/config';
import cluster from 'cluster';
import { createServer } from 'http';
import os from 'os';
import app from './app';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { startAuctionScheduler } from './services/auction-scheduler.service';
import { initSocket } from './socket/socket.server';
import { logger } from './utils/logger';

const PORT = Number(process.env.BACKEND_PORT || 3001);

function resolvePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) return fallback;
  return rawValue.trim().toLowerCase() === 'true';
}

const configuredWorkers = resolvePositiveInt(process.env.CLUSTER_WORKERS, 1);
const cpuCount = Math.max(1, os.cpus().length);
const workerCount = Math.min(configuredWorkers, cpuCount);
const schedulerEnabled = resolveBoolean(process.env.SCHEDULER_ENABLED, true);

async function bootstrapWorker() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected', { pid: process.pid });

    await redis.ping();
    logger.info('Redis connected', { pid: process.pid });

    const httpServer = createServer(app);
    initSocket(httpServer);

    const shouldRunScheduler = resolveBoolean(process.env.SCHEDULER_ENABLED, true);
    if (shouldRunScheduler) {
      startAuctionScheduler();
    } else {
      logger.info('Auction scheduler disabled on this worker', { pid: process.pid });
    }

    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`, {
        pid: process.pid,
        workerId: cluster.isWorker ? cluster.worker?.id : undefined,
        scheduler: shouldRunScheduler,
      });
      logger.info('Socket.IO ready');
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = async (signal: NodeJS.Signals) => {
      logger.warn(`${signal} signal received. Closing worker...`, { pid: process.pid });
      httpServer.close(async () => {
        await prisma.$disconnect();
        redis.disconnect();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start worker', {
      pid: process.pid,
      error: error instanceof Error ? error.message : 'unknown-error',
    });
    process.exit(1);
  }
}

if (cluster.isPrimary && workerCount > 1) {
  logger.info('Starting backend in cluster mode', {
    workers: workerCount,
    schedulerEnabled,
  });

  const workerSlots = new Map<number, { slot: number; scheduler: boolean }>();

  const forkWorker = (slot: number, runScheduler: boolean) => {
    const worker = cluster.fork({
      ...process.env,
      CLUSTER_WORKERS: String(workerCount),
      SCHEDULER_ENABLED: runScheduler ? 'true' : 'false',
      WORKER_SLOT: String(slot),
    });
    workerSlots.set(worker.id, { slot, scheduler: runScheduler });
  };

  for (let slot = 0; slot < workerCount; slot += 1) {
    forkWorker(slot, schedulerEnabled && slot === 0);
  }

  cluster.on('exit', (worker, code, signal) => {
    const metadata = workerSlots.get(worker.id);
    workerSlots.delete(worker.id);

    logger.error('Worker exited', {
      workerId: worker.id,
      pid: worker.process.pid,
      code,
      signal,
      slot: metadata?.slot,
      scheduler: metadata?.scheduler,
    });

    if (!metadata) return;

    // Keep worker pool stable for high-concurrency realtime traffic.
    forkWorker(metadata.slot, metadata.scheduler);
  });
} else {
  void bootstrapWorker();
}
