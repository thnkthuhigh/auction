import Redis from 'ioredis';
import { logger } from '../utils/logger';

const REDIS_URL =
  process.env.REDIS_URL ||
  process.env.REDISCLOUD_URL ||
  process.env.REDIS_TLS_URL ||
  process.env.UPSTASH_REDIS_TLS_URL ||
  process.env.UPSTASH_REDIS_URL ||
  'redis://localhost:6379';

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
  auctionRecentBids: (auctionId: string) => `auction:${auctionId}:recentBids`,
  auctionRealtimeSnapshot: (auctionId: string) => `auction:${auctionId}:realtimeSnapshot`,
  userRateLimit: (userId: string) => `ratelimit:bid:${userId}`,
  bidRateLimit: (userId: string, auctionId: string) => `ratelimit:bid:${userId}:${auctionId}`,
  bidIdempotencyResult: (userId: string, auctionId: string, requestId: string) =>
    `idempotency:bid:result:${userId}:${auctionId}:${requestId}`,
  bidIdempotencyLock: (userId: string, auctionId: string, requestId: string) =>
    `idempotency:bid:lock:${userId}:${auctionId}:${requestId}`,
};
