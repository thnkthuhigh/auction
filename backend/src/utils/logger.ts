type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogSource = 'app' | 'http' | 'socket' | 'scheduler' | 'redis' | 'auth' | 'auction' | 'bid';
type PersistSystemLogFn = (payload: {
  level: LogLevel;
  message: string;
  source: string;
  meta?: unknown;
}) => Promise<void>;

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
const DB_LOG_ENABLED = process.env.DB_LOG_ENABLED !== 'false';
const DB_LOG_SKIP_HTTP = process.env.DB_LOG_SKIP_HTTP !== 'false';
const DB_LOG_MIN_LEVEL = resolvePersistLevel();
let persistFnPromise: Promise<PersistSystemLogFn> | null = null;

function resolvePersistLevel(): LogLevel {
  const envLevel = process.env.DB_LOG_MIN_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LEVEL_WEIGHT) return envLevel;
  return 'info';
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[ACTIVE_LEVEL];
}

function shouldPersist(level: LogLevel, source: LogSource): boolean {
  if (!DB_LOG_ENABLED) return false;
  if (DB_LOG_SKIP_HTTP && source === 'http') return false;
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[DB_LOG_MIN_LEVEL];
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

function toLogLine(level: LogLevel, message: string, source: LogSource, meta?: unknown): string {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    app: APP_NAME,
    source,
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

async function persistToDatabase(
  level: LogLevel,
  message: string,
  source: LogSource,
  meta?: unknown,
): Promise<void> {
  if (!persistFnPromise) {
    persistFnPromise = import('../services/system-log.service').then(
      (module) => module.persistSystemLog as PersistSystemLogFn,
    );
  }
  const persistSystemLog = await persistFnPromise;
  await persistSystemLog({ level, message, source, meta });
}

function write(level: LogLevel, message: string, source: LogSource = 'app', meta?: unknown): void {
  const serializedMeta = serializeMeta(meta);

  if (!shouldLog(level)) return;
  const line = `${toLogLine(level, message, source, serializedMeta)}\n`;
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }

  if (!shouldPersist(level, source)) return;

  void persistToDatabase(level, message, source, serializedMeta).catch((error: unknown) => {
    const fallback = `${toLogLine('error', 'Persist system log failed', 'app', {
      message,
      source,
      reason: error instanceof Error ? error.message : 'unknown-error',
    })}\n`;
    process.stderr.write(fallback);
  });
}

export const logger = {
  debug: (message: string, meta?: unknown, source?: LogSource) =>
    write('debug', message, source ?? 'app', meta),
  info: (message: string, meta?: unknown, source?: LogSource) =>
    write('info', message, source ?? 'app', meta),
  warn: (message: string, meta?: unknown, source?: LogSource) =>
    write('warn', message, source ?? 'app', meta),
  error: (message: string, meta?: unknown, source?: LogSource) =>
    write('error', message, source ?? 'app', meta),
  http: (message: string, meta?: unknown) => write('info', message, 'http', meta),
};
