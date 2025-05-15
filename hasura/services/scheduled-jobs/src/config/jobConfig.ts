/**
 * Job configuration settings
 */

// Default poll interval for due jobs (in milliseconds)
export const DEFAULT_POLL_INTERVAL_MS = 5000;

// Default maximum number of concurrent jobs
export const DEFAULT_MAX_CONCURRENT_JOBS = 10;

// Default job timeout (in seconds)
export const DEFAULT_JOB_TIMEOUT_SECONDS = 3600; // 1 hour

// Job execution history retention (in days)
export const JOB_HISTORY_RETENTION_DAYS = 30;

// Database maintenance settings
export const DB_MAINTENANCE_CONFIG = {
  // Whether to perform VACUUM FULL (more thorough but locks tables)
  vacuumFull: false,
  
  // Whether to perform REINDEX
  reindex: true,
  
  // Maximum runtime in seconds
  timeoutSeconds: 7200, // 2 hours
};

// Default end of day job configuration
export const END_OF_DAY_CONFIG = {
  // Default timeout in seconds
  timeoutSeconds: 3600, // 1 hour
  
  // Default priority
  priority: 'critical',
  
  // Default max retries
  maxRetries: 3,
};

// System health check configuration
export const SYSTEM_HEALTH_CHECK_CONFIG = {
  // Default timeout in seconds
  timeoutSeconds: 300, // 5 minutes
  
  // Default interval (in cron format)
  cronExpression: '0 */1 * * *', // Every hour
  
  // Default priority
  priority: 'medium',
};

// Whether to auto-initialize built-in system jobs on startup
export const AUTO_INIT_SYSTEM_JOBS = true;

// Built-in job types to auto-initialize
export const SYSTEM_JOB_TYPES = [
  'system_health_check',
  'database_maintenance'
];