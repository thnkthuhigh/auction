import { type Prisma, SystemLogLevel } from '@prisma/client';
import { prisma } from '../config/database';

export type SystemLogPayload = {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  source: string;
  meta?: unknown;
};

const LEVEL_TO_DB: Record<SystemLogPayload['level'], SystemLogLevel> = {
  debug: SystemLogLevel.DEBUG,
  info: SystemLogLevel.INFO,
  warn: SystemLogLevel.WARN,
  error: SystemLogLevel.ERROR,
};

function toJsonValue(meta: unknown): Prisma.InputJsonValue | undefined {
  if (meta === undefined) return undefined;

  try {
    return JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue;
  } catch {
    return { note: 'unserializable-meta' };
  }
}

export async function persistSystemLog(payload: SystemLogPayload): Promise<void> {
  await prisma.systemLog.create({
    data: {
      level: LEVEL_TO_DB[payload.level],
      message: payload.message,
      source: payload.source,
      meta: toJsonValue(payload.meta),
    },
  });
}
