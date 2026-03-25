type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_WEIGHT) return envLevel;
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const ACTIVE_LEVEL = resolveLogLevel();
const APP_NAME = process.env.APP_NAME || 'auction-backend';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[ACTIVE_LEVEL];
}

function serializeMeta(meta: unknown): unknown {
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  return meta;
}

function toLogLine(level: LogLevel, message: string, meta?: unknown): string {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    app: APP_NAME,
    message,
  };

  if (meta !== undefined) {
    payload.meta = serializeMeta(meta);
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({
      ...payload,
      meta: 'unserializable-meta',
    });
  }
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (!shouldLog(level)) return;
  const line = `${toLogLine(level, message, meta)}\n`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
  http: (message: string, meta?: unknown) => write('info', message, meta),
};
