/**
 * Job Manager Implementation
 * 
 * Provides functionality for managing scheduled jobs including:
 * - Registration of job workers
 * - Scheduling jobs
 * - Executing jobs
 * - Retrieving job history
 */

import { 
  Job, 
  JobWorker, 
  JobManager as JobManagerInterface,
  JobStatus, 
  JobType,
  JobExecution,
  JobParameters,
  JobWorkerNotFoundError,
  JobNotFoundError,
  JobAlreadyRunningError
} from '../models/job';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import * as cron from 'node-cron';

// Map to store worker instances
const workers = new Map<JobType, JobWorker[]>();

// Map to store active cron jobs
const cronJobs = new Map<string, cron.ScheduledTask>();

// Create logger
const logger = createContextLogger('JobManager');

/**
 * Job Manager implementation
 */
class JobManager implements JobManagerInterface {
  private nodeId: string;
  private initialized: boolean = false;
  
  constructor() {
    // Generate a unique node ID for this instance
    this.nodeId = uuidv4();
    logger.info(`Job manager created with node ID: ${this.nodeId}`);
  }
  
  /**
   * Register a worker to handle jobs
   * @param worker The worker to register
   */
  registerWorker(worker: JobWorker): void {
    const jobType = worker.getJobType();
    
    // Get existing workers for this job type or create a new array
    const existingWorkers = workers.get(jobType) || [];
    
    // Add worker to array
    existingWorkers.push(worker);
    
    // Store in map
    workers.set(jobType, existingWorkers);
    
    logger.info(`Registered worker for job type: ${jobType}`);
  }
  
  /**
   * Find a worker that can handle the job
   * @param job The job to find a worker for
   * @returns The worker that can handle the job or null if none found
   */
  private findWorker(job: Job): JobWorker | null {
    // Get workers for this job type
    const jobWorkers = workers.get(job.jobType) || [];
    
    // First check for workers that explicitly say they can handle this job
    for (const worker of jobWorkers) {
      if (worker.canHandle && worker.canHandle(job)) {
        return worker;
      }
    }
    
    // If no specific handler found, use the first worker for this job type
    if (jobWorkers.length > 0) {
      return jobWorkers[0];
    }
    
    return null;
  }
  
  /**
   * Schedule a job
   * @param job The job to schedule
   * @returns The scheduled job
   */
  async scheduleJob(job: Job): Promise<Job> {
    // Find worker that can handle this job
    const worker = this.findWorker(job);
    if (!worker) {
      throw new JobWorkerNotFoundError(job.jobType);
    }
    
    // Generate ID if not provided
    if (!job.id) {
      job.id = uuidv4();
    }
    
    // Set default values
    const scheduledJob: Job = {
      ...job,
      status: JobStatus.SCHEDULED,
      retryCount: job.retryCount || 0,
      maxRetries: job.maxRetries || 3,
      timeoutSeconds: job.timeoutSeconds || 600, // Default 10 minutes
      isActive: job.isActive !== false, // Default to active
      createdAt: job.createdAt || new Date(),
      updatedAt: new Date(),
      version: job.version || 1
    };
    
    // Insert into database
    await this.saveJob(scheduledJob);
    
    // Schedule using cron if applicable
    if (scheduledJob.cronExpression && scheduledJob.isActive) {
      this.scheduleCronJob(scheduledJob);
    }
    
    logger.info(`Scheduled job: ${scheduledJob.name}`, { jobId: scheduledJob.id });
    
    return scheduledJob;
  }
  
  /**
   * Schedule a job using cron
   * @param job The job to schedule
   */
  private scheduleCronJob(job: Job): void {
    // Cancel existing cron job if it exists
    if (cronJobs.has(job.id)) {
      cronJobs.get(job.id).stop();
      cronJobs.delete(job.id);
    }
    
    // Schedule new cron job if cron expression is provided
    if (job.cronExpression && job.isActive) {
      logger.info(`Scheduling cron job: ${job.name} with expression: ${job.cronExpression}`, { jobId: job.id });
      
      try {
        const task = cron.schedule(job.cronExpression, async () => {
          try {
            // Check if job still exists and is active
            const currentJob = await this.getJob(job.id);
            if (!currentJob || !currentJob.isActive || currentJob.status === JobStatus.PAUSED) {
              logger.info(`Skipping execution of job ${job.name} as it is not active or has been paused`, { jobId: job.id });
              return;
            }
            
            // Execute job
            await this.executeJob(currentJob);
          } catch (error) {
            logger.error(`Error executing scheduled job: ${job.name}`, { error, jobId: job.id });
          }
        });
        
        // Store cron job
        cronJobs.set(job.id, task);
      } catch (error) {
        logger.error(`Failed to schedule cron job: ${job.name}`, { error, jobId: job.id, cronExpression: job.cronExpression });
      }
    }
  }
  
  /**
   * Execute a job immediately
   * @param job The job to execute
   * @returns The result of the job execution
   */
  async executeJob(job: Job): Promise<any> {
    logger.info(`Executing job: ${job.name}`, { jobId: job.id });
    
    // Find worker that can handle this job
    const worker = this.findWorker(job);
    if (!worker) {
      throw new JobWorkerNotFoundError(job.jobType);
    }
    
    // Check if job is already running
    if (job.status === JobStatus.RUNNING) {
      throw new JobAlreadyRunningError();
    }
    
    // Update job status to running
    const executionStart = new Date();
    const updatedJob: Job = {
      ...job,
      status: JobStatus.RUNNING,
      lastRunTime: executionStart,
      updatedAt: executionStart
    };
    
    await this.saveJob(updatedJob);
    
    // Create execution record
    const execution: JobExecution = {
      id: uuidv4(),
      jobId: job.id,
      jobName: job.name,
      jobType: job.jobType,
      startTime: executionStart,
      status: JobStatus.RUNNING,
      parameters: job.parameters,
      tenantId: job.tenantId,
      nodeId: this.nodeId
    };
    
    await this.saveExecution(execution);
    
    try {
      // Execute job with timeout
      const timeoutMs = (job.timeoutSeconds || 600) * 1000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Job execution timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      
      const executionPromise = worker.process(job, job.parameters);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Update job status to completed
      const executionEnd = new Date();
      const completedJob: Job = {
        ...job,
        status: JobStatus.COMPLETED,
        lastCompletionTime: executionEnd,
        updatedAt: executionEnd,
        retryCount: 0 // Reset retry count on success
      };
      
      await this.saveJob(completedJob);
      
      // Update execution record
      const completedExecution: JobExecution = {
        ...execution,
        endTime: executionEnd,
        status: JobStatus.COMPLETED,
        result,
        processingTimeMs: executionEnd.getTime() - executionStart.getTime()
      };
      
      await this.saveExecution(completedExecution);
      
      logger.info(`Job executed successfully: ${job.name}`, { 
        jobId: job.id, 
        executionTimeMs: completedExecution.processingTimeMs 
      });
      
      return result;
    } catch (error) {
      // Update job status to failed
      const executionEnd = new Date();
      const retryCount = (job.retryCount || 0) + 1;
      const maxRetries = job.maxRetries || 3;
      
      const failedJob: Job = {
        ...job,
        status: retryCount >= maxRetries ? JobStatus.FAILED : JobStatus.SCHEDULED,
        lastFailureTime: executionEnd,
        updatedAt: executionEnd,
        retryCount
      };
      
      await this.saveJob(failedJob);
      
      // Update execution record
      const failedExecution: JobExecution = {
        ...execution,
        endTime: executionEnd,
        status: JobStatus.FAILED,
        errorMessage: error.message,
        errorStack: error.stack,
        processingTimeMs: executionEnd.getTime() - executionStart.getTime()
      };
      
      await this.saveExecution(failedExecution);
      
      logger.error(`Job execution failed: ${job.name}`, { 
        jobId: job.id, 
        error, 
        retryCount, 
        maxRetries 
      });
      
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled job
   * @param jobId The job ID to cancel
   * @returns Whether the job was cancelled
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      return false;
    }
    
    // Stop cron job if it exists
    if (cronJobs.has(jobId)) {
      cronJobs.get(jobId).stop();
      cronJobs.delete(jobId);
    }
    
    // Update job status
    const cancelledJob: Job = {
      ...job,
      status: JobStatus.CANCELLED,
      isActive: false,
      updatedAt: new Date()
    };
    
    await this.saveJob(cancelledJob);
    
    logger.info(`Cancelled job: ${job.name}`, { jobId });
    
    return true;
  }
  
  /**
   * Pause a job
   * @param jobId The job ID to pause
   * @returns Whether the job was paused
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      return false;
    }
    
    // Update job status
    const pausedJob: Job = {
      ...job,
      status: JobStatus.PAUSED,
      updatedAt: new Date()
    };
    
    await this.saveJob(pausedJob);
    
    logger.info(`Paused job: ${job.name}`, { jobId });
    
    return true;
  }
  
  /**
   * Resume a paused job
   * @param jobId The job ID to resume
   * @returns Whether the job was resumed
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      return false;
    }
    
    // Update job status
    const resumedJob: Job = {
      ...job,
      status: JobStatus.SCHEDULED,
      updatedAt: new Date()
    };
    
    await this.saveJob(resumedJob);
    
    // Reschedule cron job if applicable
    if (job.cronExpression) {
      this.scheduleCronJob(resumedJob);
    }
    
    logger.info(`Resumed job: ${job.name}`, { jobId });
    
    return true;
  }
  
  /**
   * Get a job by ID
   * @param jobId The job ID
   * @returns The job or null if not found
   */
  async getJob(jobId: string): Promise<Job | null> {
    const result = await db.query(
      'SELECT * FROM scheduled_job WHERE id = $1',
      [jobId]
    );
    
    if (result.rowCount === 0) {
      return null;
    }
    
    return this.mapRowToJob(result.rows[0]);
  }
  
  /**
   * Get all jobs
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs
   */
  async getAllJobs(includeInactive: boolean = false): Promise<Job[]> {
    const query = includeInactive
      ? 'SELECT * FROM scheduled_job ORDER BY created_at DESC'
      : 'SELECT * FROM scheduled_job WHERE is_active = true ORDER BY created_at DESC';
    
    const result = await db.query(query);
    
    return result.rows.map(row => this.mapRowToJob(row));
  }
  
  /**
   * Get jobs by type
   * @param jobType The job type
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs
   */
  async getJobsByType(jobType: JobType, includeInactive: boolean = false): Promise<Job[]> {
    const query = includeInactive
      ? 'SELECT * FROM scheduled_job WHERE job_type = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM scheduled_job WHERE job_type = $1 AND is_active = true ORDER BY created_at DESC';
    
    const result = await db.query(query, [jobType]);
    
    return result.rows.map(row => this.mapRowToJob(row));
  }
  
  /**
   * Get jobs by status
   * @param status The job status
   * @returns Array of jobs
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    const result = await db.query(
      'SELECT * FROM scheduled_job WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    
    return result.rows.map(row => this.mapRowToJob(row));
  }
  
  /**
   * Get jobs by tenant
   * @param tenantId The tenant ID
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs
   */
  async getJobsByTenant(tenantId: string, includeInactive: boolean = false): Promise<Job[]> {
    const query = includeInactive
      ? 'SELECT * FROM scheduled_job WHERE tenant_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM scheduled_job WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC';
    
    const result = await db.query(query, [tenantId]);
    
    return result.rows.map(row => this.mapRowToJob(row));
  }
  
  /**
   * Get job execution history
   * @param jobId The job ID
   * @param limit Maximum number of records to return
   * @returns Array of job executions
   */
  async getJobExecutionHistory(jobId: string, limit: number = 10): Promise<JobExecution[]> {
    const result = await db.query(
      'SELECT * FROM scheduled_job_execution WHERE job_id = $1 ORDER BY start_time DESC LIMIT $2',
      [jobId, limit]
    );
    
    return result.rows.map(row => this.mapRowToExecution(row));
  }
  
  /**
   * Initialize the job manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    logger.info('Initializing job manager');
    
    try {
      // Create tables if they don't exist
      await this.initializeTables();
      
      // Load active jobs and schedule them
      const activeJobs = await this.getAllJobs(false);
      
      for (const job of activeJobs) {
        if (job.cronExpression) {
          this.scheduleCronJob(job);
        }
      }
      
      this.initialized = true;
      logger.info(`Job manager initialized, scheduled ${activeJobs.length} active jobs`);
    } catch (error) {
      logger.error('Failed to initialize job manager:', error);
      throw error;
    }
  }
  
  /**
   * Initialize database tables
   */
  private async initializeTables(): Promise<void> {
    // Create scheduled_job table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_job (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        job_type VARCHAR(50) NOT NULL,
        cron_expression VARCHAR(100),
        execution_interval VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        parameters JSONB,
        next_run_time TIMESTAMP,
        last_run_time TIMESTAMP,
        last_completion_time TIMESTAMP,
        last_failure_time TIMESTAMP,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        created_by VARCHAR(36),
        updated_by VARCHAR(36),
        tenant_id VARCHAR(36),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        timeout_seconds INTEGER NOT NULL DEFAULT 600,
        lock_id VARCHAR(36),
        lock_expires_at TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1
      )
    `);
    
    // Create job execution history table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_job_execution (
        id VARCHAR(36) PRIMARY KEY,
        job_id VARCHAR(36) NOT NULL REFERENCES scheduled_job(id),
        job_name VARCHAR(255) NOT NULL,
        job_type VARCHAR(50) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        error_stack TEXT,
        parameters JSONB,
        result JSONB,
        tenant_id VARCHAR(36),
        executed_by VARCHAR(36),
        processing_time_ms INTEGER,
        node_id VARCHAR(36)
      )
    `);
    
    // Create index on job_id for execution history
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_job_execution_job_id ON scheduled_job_execution(job_id)
    `);
    
    // Create index on job type and status
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_job_type_status ON scheduled_job(job_type, status)
    `);
    
    logger.info('Database tables initialized');
  }
  
  /**
   * Shutdown the job manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job manager');
    
    // Stop all cron jobs
    for (const [jobId, task] of cronJobs.entries()) {
      task.stop();
      logger.info(`Stopped cron job: ${jobId}`);
    }
    
    cronJobs.clear();
    
    this.initialized = false;
    logger.info('Job manager shutdown complete');
  }
  
  /**
   * Map database row to Job object
   * @param row Database row
   * @returns Job object
   */
  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      jobType: row.job_type as JobType,
      cronExpression: row.cron_expression,
      executionInterval: row.execution_interval,
      status: row.status as JobStatus,
      priority: row.priority,
      parameters: row.parameters,
      nextRunTime: row.next_run_time ? new Date(row.next_run_time) : undefined,
      lastRunTime: row.last_run_time ? new Date(row.last_run_time) : undefined,
      lastCompletionTime: row.last_completion_time ? new Date(row.last_completion_time) : undefined,
      lastFailureTime: row.last_failure_time ? new Date(row.last_failure_time) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row.tenant_id,
      isActive: row.is_active,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      timeoutSeconds: row.timeout_seconds,
      lockId: row.lock_id,
      lockExpiresAt: row.lock_expires_at ? new Date(row.lock_expires_at) : undefined,
      version: row.version
    };
  }
  
  /**
   * Map database row to JobExecution object
   * @param row Database row
   * @returns JobExecution object
   */
  private mapRowToExecution(row: any): JobExecution {
    return {
      id: row.id,
      jobId: row.job_id,
      jobName: row.job_name,
      jobType: row.job_type as JobType,
      startTime: new Date(row.start_time),
      endTime: row.end_time ? new Date(row.end_time) : undefined,
      status: row.status as JobStatus,
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      parameters: row.parameters,
      result: row.result,
      tenantId: row.tenant_id,
      executedBy: row.executed_by,
      processingTimeMs: row.processing_time_ms,
      nodeId: row.node_id
    };
  }
  
  /**
   * Save job to database
   * @param job The job to save
   */
  private async saveJob(job: Job): Promise<void> {
    const values = [
      job.id,
      job.name,
      job.description,
      job.jobType,
      job.cronExpression,
      job.executionInterval,
      job.status,
      job.priority,
      job.parameters ? JSON.stringify(job.parameters) : null,
      job.nextRunTime,
      job.lastRunTime,
      job.lastCompletionTime,
      job.lastFailureTime,
      job.createdAt,
      job.updatedAt,
      job.createdBy,
      job.updatedBy,
      job.tenantId,
      job.isActive,
      job.retryCount,
      job.maxRetries,
      job.timeoutSeconds,
      job.lockId,
      job.lockExpiresAt,
      job.version
    ];
    
    const query = `
      INSERT INTO scheduled_job (
        id, name, description, job_type, cron_expression, execution_interval, 
        status, priority, parameters, next_run_time, last_run_time, 
        last_completion_time, last_failure_time, created_at, updated_at, 
        created_by, updated_by, tenant_id, is_active, retry_count, 
        max_retries, timeout_seconds, lock_id, lock_expires_at, version
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        job_type = EXCLUDED.job_type,
        cron_expression = EXCLUDED.cron_expression,
        execution_interval = EXCLUDED.execution_interval,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        parameters = EXCLUDED.parameters,
        next_run_time = EXCLUDED.next_run_time,
        last_run_time = EXCLUDED.last_run_time,
        last_completion_time = EXCLUDED.last_completion_time,
        last_failure_time = EXCLUDED.last_failure_time,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by,
        tenant_id = EXCLUDED.tenant_id,
        is_active = EXCLUDED.is_active,
        retry_count = EXCLUDED.retry_count,
        max_retries = EXCLUDED.max_retries,
        timeout_seconds = EXCLUDED.timeout_seconds,
        lock_id = EXCLUDED.lock_id,
        lock_expires_at = EXCLUDED.lock_expires_at,
        version = EXCLUDED.version + 1
    `;
    
    await db.query(query, values);
  }
  
  /**
   * Save job execution to database
   * @param execution The job execution to save
   */
  private async saveExecution(execution: JobExecution): Promise<void> {
    const values = [
      execution.id,
      execution.jobId,
      execution.jobName,
      execution.jobType,
      execution.startTime,
      execution.endTime,
      execution.status,
      execution.errorMessage,
      execution.errorStack,
      execution.parameters ? JSON.stringify(execution.parameters) : null,
      execution.result ? JSON.stringify(execution.result) : null,
      execution.tenantId,
      execution.executedBy,
      execution.processingTimeMs,
      execution.nodeId
    ];
    
    const query = `
      INSERT INTO scheduled_job_execution (
        id, job_id, job_name, job_type, start_time, end_time,
        status, error_message, error_stack, parameters, result,
        tenant_id, executed_by, processing_time_ms, node_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        end_time = EXCLUDED.end_time,
        status = EXCLUDED.status,
        error_message = EXCLUDED.error_message,
        error_stack = EXCLUDED.error_stack,
        result = EXCLUDED.result,
        processing_time_ms = EXCLUDED.processing_time_ms
    `;
    
    await db.query(query, values);
  }
}

/**
 * Create a new job manager instance
 * @returns Job manager instance
 */
export function createJobManager(): JobManagerInterface {
  return new JobManager();
}