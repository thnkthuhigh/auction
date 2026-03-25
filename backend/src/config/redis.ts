import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error('Redis error', { message: err.message }, 'redis');
});

// Keys helpers
export const REDIS_KEYS = {
  auctionCurrentPrice: (auctionId: string) => `auction:${auctionId}:currentPrice`,
  auctionBidCount: (auctionId: string) => `auction:${auctionId}:bidCount`,
  userRateLimit: (userId: string) => `ratelimit:bid:${userId}`,
};
