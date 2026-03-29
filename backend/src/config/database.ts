import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const DB_QUERY_LOG_ENABLED = process.env.DB_QUERY_LOG_ENABLED === 'true';
const prismaLogConfig: Array<'query' | 'error' | 'warn'> = DB_QUERY_LOG_ENABLED
  ? ['query', 'error', 'warn']
  : ['error', 'warn'];

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: prismaLogConfig,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
