import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { startAuctionScheduler } from './services/auction-scheduler.service';
import { initSocket } from './socket/socket.server';
import { logger } from './utils/logger';

const PORT = process.env.BACKEND_PORT || 3001;

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');

    await redis.ping();
    logger.info('Redis connected');

    const httpServer = createServer(app);
    initSocket(httpServer);
    startAuctionScheduler();

    httpServer.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info('Socket.IO ready');
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGTERM', async () => {
  logger.warn('SIGTERM signal received. Closing server...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
