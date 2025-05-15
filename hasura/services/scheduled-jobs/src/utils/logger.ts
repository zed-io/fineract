import winston from 'winston';

/**
 * Logger configuration for the scheduled jobs service
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fineract-scheduled-jobs' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Creates a logger with context-specific metadata
 * @param context Context name to add to logger
 * @param metadata Additional metadata to add
 * @returns Winston logger with context
 */
export function createContextLogger(context: string, metadata: Record<string, any> = {}) {
  return logger.child({
    context,
    ...metadata
  });
}