import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { initSocket } from './socket/socket.server';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { startAuctionScheduler } from './services/auction-scheduler.service';

const PORT = process.env.BACKEND_PORT || 3001;

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    console.log('✅ PostgreSQL connected');

    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected');

    const httpServer = createServer(app);

    // Initialize Socket.IO
    initSocket(httpServer);

    // Start auction scheduler (auto-start/end auctions)
    startAuctionScheduler();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing server...');
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
});
