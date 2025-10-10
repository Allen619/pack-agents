// UTF-8
export interface LoggerAdapter {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const createConsoleLogger = (prefix = 'coordination'): LoggerAdapter => {
  const withPrefix = (level: string, msg: string) => `[${prefix}] ${level}: ${msg}`;
  return {
    debug: (msg, meta) => console.debug(withPrefix('DEBUG', msg), meta ?? {}),
    info: (msg, meta) => console.info(withPrefix('INFO', msg), meta ?? {}),
    warn: (msg, meta) => console.warn(withPrefix('WARN', msg), meta ?? {}),
    error: (msg, meta) => console.error(withPrefix('ERROR', msg), meta ?? {}),
  };
};

