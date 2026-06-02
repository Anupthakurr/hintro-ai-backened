import winston from 'winston';
import { config } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, traceId, ...meta }) => {
  const trace = traceId ? ` [${traceId}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts}${trace} [${level.toUpperCase()}] ${message}${metaStr}`;
});

const jsonFormat = combine(
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  errors({ stack: true }),
  winston.format.json()
);

const prettyFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
  errors({ stack: true }),
  logFormat
);

export const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: config.isDevelopment ? prettyFormat : jsonFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: jsonFormat,
    }),
  ],
});

/**
 * Returns a child logger with the given traceId bound to every log entry.
 */
export function getTraceLogger(traceId: string) {
  return logger.child({ traceId });
}
