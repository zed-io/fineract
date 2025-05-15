import winston from 'winston';

// Create base logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'fineract-hasura-actions' },
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
 * Gets a logger instance with a specific module name
 * @param moduleName The name of the module for this logger
 * @returns A Winston logger instance with the module name added to metadata
 */
export function getLogger(moduleName: string): winston.Logger {
  return baseLogger.child({ module: moduleName });
}

// Export the default logger for backward compatibility
export const logger = baseLogger;