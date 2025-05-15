/**
 * Scheduled Job Models and Interfaces
 */

/**
 * Job status enum
 */
export enum JobStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

/**
 * Job priority enum
 */
export enum JobPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Job type enum
 */
export enum JobType {
  // Base system jobs
  SYSTEM_HEALTH_CHECK = 'system_health_check',
  DATABASE_MAINTENANCE = 'database_maintenance',
  
  // Core batch jobs
  END_OF_DAY = 'end_of_day',
  END_OF_MONTH = 'end_of_month',
  END_OF_YEAR = 'end_of_year',
  
  // Loan-related jobs
  LOAN_COB = 'loan_cob',
  LOAN_INTEREST_POSTING = 'loan_interest_posting',
  LOAN_DUE_NOTIFICATION = 'loan_due_notification',
  LOAN_DELINQUENCY_CALCULATION = 'loan_delinquency_calculation',
  LOAN_OVERDUE_FEE_POSTING = 'loan_overdue_fee_posting',
  
  // Savings-related jobs
  SAVINGS_INTEREST_CALCULATION = 'savings_interest_calculation',
  SAVINGS_INTEREST_POSTING = 'savings_interest_posting',
  SAVINGS_DORMANCY_CHECK = 'savings_dormancy_check',
  
  // Accounting-related jobs
  ACCOUNTING_ENTRY_VALIDATION = 'accounting_entry_validation',
  ACCOUNTING_CLOSURE = 'accounting_closure',
  
  // Communications
  EMAIL_NOTIFICATION = 'email_notification',
  SMS_NOTIFICATION = 'sms_notification',
  
  // Reports
  REPORT_GENERATION = 'report_generation',
  
  // Custom jobs
  CUSTOM = 'custom'
}

/**
 * Job execution interval enum
 */
export enum JobExecutionInterval {
  ONCE = 'once',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

/**
 * Base job model
 */
export interface Job {
  id: string;
  name: string;
  description?: string;
  jobType: JobType;
  cronExpression?: string;
  executionInterval: JobExecutionInterval;
  status: JobStatus;
  priority: JobPriority;
  parameters?: JobParameters;
  nextRunTime?: Date;
  lastRunTime?: Date;
  lastCompletionTime?: Date;
  lastFailureTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  tenantId?: string;
  isActive: boolean;
  retryCount: number;
  maxRetries: number;
  timeoutSeconds: number;
  lockId?: string;
  lockExpiresAt?: Date;
  version: number;
}

/**
 * Job parameters
 */
export interface JobParameters {
  [key: string]: any;
}

/**
 * Job execution history
 */
export interface JobExecution {
  id: string;
  jobId: string;
  jobName: string;
  jobType: JobType;
  startTime: Date;
  endTime?: Date;
  status: JobStatus;
  errorMessage?: string;
  errorStack?: string;
  parameters?: JobParameters;
  result?: any;
  tenantId?: string;
  executedBy?: string;
  processingTimeMs?: number;
  nodeId?: string;
}

/**
 * Job configuration
 */
export interface JobConfig {
  id: string;
  jobType: JobType;
  enabled: boolean;
  cronExpression?: string;
  executionInterval: JobExecutionInterval;
  priority: JobPriority;
  maxRetries: number;
  timeoutSeconds: number;
  parameters?: JobParameters;
  tenantId?: string;
  description?: string;
  isSystemJob: boolean;
  concurrencyLimit: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job worker interface - defines how jobs are processed
 */
export interface JobWorker {
  /**
   * Process a job
   * @param job The job to process
   * @param parameters Optional job parameters
   * @returns Processing result
   */
  process(job: Job, parameters?: JobParameters): Promise<any>;
  
  /**
   * Get job type handled by this worker
   */
  getJobType(): JobType;
  
  /**
   * Check if worker can handle the job
   * @param job The job to check
   */
  canHandle(job: Job): boolean;
}

/**
 * Job logging options
 */
export interface JobLogOptions {
  logStart?: boolean;
  logCompletion?: boolean;
  logParameters?: boolean;
  logResult?: boolean;
}

/**
 * Job scheduler interface
 */
export interface JobScheduler {
  /**
   * Schedule a job
   * @param job The job to schedule
   */
  scheduleJob(job: Job): Promise<Job>;
  
  /**
   * Cancel a scheduled job
   * @param jobId The job ID to cancel
   */
  cancelJob(jobId: string): Promise<boolean>;
  
  /**
   * Pause a job
   * @param jobId The job ID to pause
   */
  pauseJob(jobId: string): Promise<boolean>;
  
  /**
   * Resume a paused job
   * @param jobId The job ID to resume
   */
  resumeJob(jobId: string): Promise<boolean>;
  
  /**
   * Get a job by ID
   * @param jobId The job ID
   */
  getJob(jobId: string): Promise<Job | null>;
  
  /**
   * Get all jobs
   * @param includeInactive Whether to include inactive jobs
   */
  getAllJobs(includeInactive?: boolean): Promise<Job[]>;
  
  /**
   * Get jobs by type
   * @param jobType The job type
   * @param includeInactive Whether to include inactive jobs
   */
  getJobsByType(jobType: JobType, includeInactive?: boolean): Promise<Job[]>;
  
  /**
   * Get jobs by status
   * @param status The job status
   */
  getJobsByStatus(status: JobStatus): Promise<Job[]>;
  
  /**
   * Get jobs by tenant
   * @param tenantId The tenant ID
   * @param includeInactive Whether to include inactive jobs
   */
  getJobsByTenant(tenantId: string, includeInactive?: boolean): Promise<Job[]>;
  
  /**
   * Initialize the scheduler
   */
  initialize(): Promise<void>;
  
  /**
   * Shutdown the scheduler
   */
  shutdown(): Promise<void>;
}

/**
 * Job processor interface
 */
export interface JobProcessor {
  /**
   * Register a job worker
   * @param worker The worker to register
   */
  registerWorker(worker: JobWorker): void;
  
  /**
   * Process a job
   * @param job The job to process
   */
  processJob(job: Job): Promise<any>;
  
  /**
   * Initialize the processor
   */
  initialize(): Promise<void>;
  
  /**
   * Shutdown the processor
   */
  shutdown(): Promise<void>;
}

/**
 * Job manager interface - combines scheduler and processor
 */
export interface JobManager {
  /**
   * Register a job worker
   * @param worker The worker to register
   */
  registerWorker(worker: JobWorker): void;
  
  /**
   * Schedule a job
   * @param job The job to schedule
   */
  scheduleJob(job: Job): Promise<Job>;
  
  /**
   * Execute a job immediately
   * @param job The job to execute
   */
  executeJob(job: Job): Promise<any>;
  
  /**
   * Cancel a scheduled job
   * @param jobId The job ID to cancel
   */
  cancelJob(jobId: string): Promise<boolean>;
  
  /**
   * Pause a job
   * @param jobId The job ID to pause
   */
  pauseJob(jobId: string): Promise<boolean>;
  
  /**
   * Resume a paused job
   * @param jobId The job ID to resume
   */
  resumeJob(jobId: string): Promise<boolean>;
  
  /**
   * Get a job by ID
   * @param jobId The job ID
   */
  getJob(jobId: string): Promise<Job | null>;
  
  /**
   * Get job execution history
   * @param jobId The job ID
   * @param limit Maximum number of records to return
   */
  getJobExecutionHistory(jobId: string, limit?: number): Promise<JobExecution[]>;
  
  /**
   * Initialize the job manager
   */
  initialize(): Promise<void>;
  
  /**
   * Shutdown the job manager
   */
  shutdown(): Promise<void>;
}

/**
 * Job locking interface - for distributed job processing
 */
export interface JobLocker {
  /**
   * Acquire a lock for a job
   * @param jobId The job ID
   * @param nodeId The node ID
   * @param timeoutSeconds Lock timeout in seconds
   */
  acquireLock(jobId: string, nodeId: string, timeoutSeconds: number): Promise<boolean>;
  
  /**
   * Release a lock for a job
   * @param jobId The job ID
   * @param nodeId The node ID
   */
  releaseLock(jobId: string, nodeId: string): Promise<boolean>;
  
  /**
   * Refresh a lock for a job
   * @param jobId The job ID
   * @param nodeId The node ID
   * @param timeoutSeconds Lock timeout in seconds
   */
  refreshLock(jobId: string, nodeId: string, timeoutSeconds: number): Promise<boolean>;
  
  /**
   * Check if a job is locked
   * @param jobId The job ID
   */
  isLocked(jobId: string): Promise<boolean>;
}

/**
 * Error related to job processing
 */
export class JobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobError';
  }
}

/**
 * Job timeout error
 */
export class JobTimeoutError extends JobError {
  constructor(message: string = 'Job execution timed out') {
    super(message);
    this.name = 'JobTimeoutError';
  }
}

/**
 * Job already running error
 */
export class JobAlreadyRunningError extends JobError {
  constructor(message: string = 'Job is already running') {
    super(message);
    this.name = 'JobAlreadyRunningError';
  }
}

/**
 * Job not found error
 */
export class JobNotFoundError extends JobError {
  constructor(message: string = 'Job not found') {
    super(message);
    this.name = 'JobNotFoundError';
  }
}

/**
 * Job worker not found error
 */
export class JobWorkerNotFoundError extends JobError {
  constructor(jobType: JobType) {
    super(`No worker registered for job type: ${jobType}`);
    this.name = 'JobWorkerNotFoundError';
  }
}

/**
 * Database migration job parameters
 */
export interface DatabaseMaintenanceJobParameters extends JobParameters {
  analysisOnly?: boolean;
  tables?: string[];
  vacuumFull?: boolean;
  reindex?: boolean;
}

/**
 * End of day job parameters
 */
export interface EndOfDayJobParameters extends JobParameters {
  businessDate?: string;
  executeTransactions?: boolean;
  processAccruals?: boolean;
  processProvisions?: boolean;
}

/**
 * Loan COB job parameters
 */
export interface LoanCOBJobParameters extends JobParameters {
  loanIds?: string[];
  processAll?: boolean;
  processOverdueLoansOnly?: boolean;
}

/**
 * Savings interest job parameters
 */
export interface SavingsInterestJobParameters extends JobParameters {
  accountIds?: string[];
  processAll?: boolean;
  processActiveAccountsOnly?: boolean;
}

/**
 * Email notification job parameters
 */
export interface EmailNotificationJobParameters extends JobParameters {
  templateId?: string;
  recipients?: string[];
  subject?: string;
  batchSize?: number;
}

/**
 * Report generation job parameters
 */
export interface ReportGenerationJobParameters extends JobParameters {
  reportId?: string;
  parameters?: { [key: string]: any };
  format?: 'PDF' | 'CSV' | 'EXCEL' | 'HTML';
  deliveryMethod?: 'EMAIL' | 'STORAGE' | 'PRINT';
  recipients?: string[];
}