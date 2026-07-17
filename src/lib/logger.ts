export type LogContext = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', message: string, context: LogContext = {}) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...context };
  const output = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  output('[BancoDeSolucoes]', entry);
}

export const logger = {
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: LogContext) => write('error', message, {
    ...context,
    error: error instanceof Error ? error.message : String(error ?? 'unknown'),
  }),
};
