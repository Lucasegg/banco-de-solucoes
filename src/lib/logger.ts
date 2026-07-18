export type LogContext = Record<string, unknown>;
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const sensitive = /(^|_)(token|access_token|refresh_token|authorization|apikey|password|secret|service_role_key|anon_key)($|_)/i;
const redactText = (value: string) => value
  .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
  .replace(/(token|password|secret|apikey|authorization)\s*[=:]\s*[^\s,;]+/gi, '$1=[REDACTED]');

export function sanitizeLogContext(context: LogContext): LogContext {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => {
    if (sensitive.test(key)) return [key, '[REDACTED]'];
    if (Array.isArray(value)) return [key, value.map((item) => item && typeof item === 'object' ? sanitizeLogContext(item as LogContext) : item)];
    if (value && typeof value === 'object') return [key, sanitizeLogContext(value as LogContext)];
    return [key, typeof value === 'string' ? redactText(value) : value];
  }));
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  if (level === 'debug' && import.meta.env?.PROD) return;
  const entry = { timestamp: new Date().toISOString(), level, message, ...sanitizeLogContext(context) };
  const output = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
  output('[BancoDeSolucoes]', entry);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, error?: unknown, context: LogContext = {}) => write('error', message, { ...context, technical_message: errorMessage(error) }),
};

function errorMessage(error: unknown) { return error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error ?? 'unknown'); }
