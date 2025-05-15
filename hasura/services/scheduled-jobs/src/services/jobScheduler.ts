import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';
import { 
  Job, 
  JobScheduler, 
  JobStatus, 
  JobType, 
  JobError,
  JobNotFoundError,
  JobParameters
} from '../models/job';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { getNodeId } from '../utils/nodeId';

/**
 * Implementation of the job scheduler
 * Handles scheduling, pausing, resuming, and cancelling jobs
 */
export class DatabaseJobScheduler implements JobScheduler {
  private cronJobs: Map<string, CronJob> = new Map();
  private jobCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private pollIntervalMs: number = 10000; // 10 seconds by default
  
  constructor(pollIntervalMs?: number) {
    if (pollIntervalMs) {
      this.pollIntervalMs = pollIntervalMs;
    }
  }
  
  /**
   * Schedule a job
   * @param job The job to schedule
   * @returns The scheduled job
   */
  async scheduleJob(job: Job): Promise<Job> {
    const jobId = job.id || uuidv4();
    const now = new Date();
    
    try {
      // Calculate next run time if not provided
      let nextRunTime = job.nextRunTime;
      if (!nextRunTime && job.cronExpression) {
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
      }
      
      // Create or update job in database
      if (job.id) {
        // Update existing job
        const result = await db.query(
          `UPDATE job 
           SET name = $1, 
               description = $2, 
               job_type = $3, 
               cron_expression = $4, 
               execution_interval = $5, 
               status = $6, 
               priority = $7, 
               parameters = $8, 
               next_run_time = $9,
               tenant_id = $10,
               is_active = $11,
               max_retries = $12,
               timeout_seconds = $13,
               updated_at = $14,
               updated_by = $15,
               version = version + 1
           WHERE id = $16 AND version = $17
           RETURNING *`,
          [
            job.name,
            job.description,
            job.jobType,
            job.cronExpression,
            job.executionInterval,
            job.status,
            job.priority,
            job.parameters ? JSON.stringify(job.parameters) : null,
            nextRunTime,
            job.tenantId,
            job.isActive,
            job.maxRetries,
            job.timeoutSeconds,
            now,
            job.updatedBy,
            job.id,
            job.version
          ]
        );
        
        if (result.rowCount === 0) {
          throw new JobError('Failed to update job - it may have been modified by another process');
        }
        
        return result.rows[0] as Job;
      } else {
        // Create new job
        const result = await db.query(
          `INSERT INTO job (
             id, name, description, job_type, cron_expression, 
             execution_interval, status, priority, parameters, 
             next_run_time, created_at, updated_at, created_by,
             tenant_id, is_active, retry_count, max_retries,
             timeout_seconds, version
           ) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           RETURNING *`,
          [
            jobId,
            job.name,
            job.description,
            job.jobType,
            job.cronExpression,
            job.executionInterval,
            job.status,
            job.priority,
            job.parameters ? JSON.stringify(job.parameters) : null,
            nextRunTime,
            now,
            now,
            job.createdBy,
            job.tenantId,
            job.isActive,
            0, // retry_count
            job.maxRetries,
            job.timeoutSeconds,
            1 // version
          ]
        );
        
        return result.rows[0] as Job;
      }
      
    } catch (error) {
      logger.error('Failed to schedule job', { jobId, error });
      throw new JobError(`Failed to schedule job: ${error.message}`);
    }
  }
  
  /**
   * Cancel a scheduled job
   * @param jobId The job ID to cancel
   * @returns Whether cancellation was successful
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Stop cron job if running
      if (this.cronJobs.has(jobId)) {
        const cronJob = this.cronJobs.get(jobId);
        cronJob?.stop();
        this.cronJobs.delete(jobId);
      }
      
      // Update job status in database
      const result = await db.query(
        `UPDATE job 
         SET status = $1, 
             updated_at = $2,
             version = version + 1
         WHERE id = $3 
         RETURNING *`,
        [JobStatus.CANCELLED, new Date(), jobId]
      );
      
      if (result.rowCount === 0) {
        throw new JobNotFoundError();
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to cancel job', { jobId, error });
      
      if (error instanceof JobNotFoundError) {
        throw error;
      }
      
      throw new JobError(`Failed to cancel job: ${error.message}`);
    }
  }
  
  /**
   * Pause a job
   * @param jobId The job ID to pause
   * @returns Whether pause was successful
   */
  async pauseJob(jobId: string): Promise<boolean> {
    try {
      // Stop cron job if running
      if (this.cronJobs.has(jobId)) {
        const cronJob = this.cronJobs.get(jobId);
        cronJob?.stop();
      }
      
      // Update job status in database
      const result = await db.query(
        `UPDATE job 
         SET status = $1, 
             updated_at = $2,
             version = version + 1
         WHERE id = $3 AND status = $4
         RETURNING *`,
        [JobStatus.PAUSED, new Date(), jobId, JobStatus.SCHEDULED]
      );
      
      if (result.rowCount === 0) {
        const job = await this.getJob(jobId);
        if (!job) {
          throw new JobNotFoundError();
        }
        
        if (job.status === JobStatus.PAUSED) {
          return true; // Already paused
        }
        
        throw new JobError(`Cannot pause job with status: ${job.status}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to pause job', { jobId, error });
      
      if (error instanceof JobNotFoundError || error instanceof JobError) {
        throw error;
      }
      
      throw new JobError(`Failed to pause job: ${error.message}`);
    }
  }
  
  /**
   * Resume a paused job
   * @param jobId The job ID to resume
   * @returns Whether resume was successful
   */
  async resumeJob(jobId: string): Promise<boolean> {
    try {
      // Get the job
      const job = await this.getJob(jobId);
      
      if (!job) {
        throw new JobNotFoundError();
      }
      
      if (job.status !== JobStatus.PAUSED) {
        throw new JobError(`Cannot resume job with status: ${job.status}`);
      }
      
      // Update job status and next run time
      let nextRunTime = new Date();
      if (job.cronExpression) {
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
      }
      
      // Update job in database
      const result = await db.query(
        `UPDATE job 
         SET status = $1, 
             next_run_time = $2,
             updated_at = $3,
             version = version + 1
         WHERE id = $4
         RETURNING *`,
        [JobStatus.SCHEDULED, nextRunTime, new Date(), jobId]
      );
      
      if (result.rowCount === 0) {
        throw new JobError('Failed to resume job - it may have been modified by another process');
      }
      
      // If cron expression exists, schedule the job
      if (job.cronExpression) {
        this.createCronJob(result.rows[0] as Job);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to resume job', { jobId, error });
      
      if (error instanceof JobNotFoundError || error instanceof JobError) {
        throw error;
      }
      
      throw new JobError(`Failed to resume job: ${error.message}`);
    }
  }
  
  /**
   * Get a job by ID
   * @param jobId The job ID
   * @returns The job or null if not found
   */
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const result = await db.query(
        'SELECT * FROM job WHERE id = $1',
        [jobId]
      );
      
      if (result.rowCount === 0) {
        return null;
      }
      
      return this.mapJobFromDb(result.rows[0]);
    } catch (error) {
      logger.error('Failed to get job', { jobId, error });
      throw new JobError(`Failed to get job: ${error.message}`);
    }
  }
  
  /**
   * Get all jobs
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs
   */
  async getAllJobs(includeInactive: boolean = false): Promise<Job[]> {
    try {
      let query = 'SELECT * FROM job';
      
      if (!includeInactive) {
        query += ' WHERE is_active = true';
      }
      
      query += ' ORDER BY next_run_time ASC';
      
      const result = await db.query(query);
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      logger.error('Failed to get all jobs', { error });
      throw new JobError(`Failed to get all jobs: ${error.message}`);
    }
  }
  
  /**
   * Get jobs by type
   * @param jobType The job type
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs of the specified type
   */
  async getJobsByType(jobType: JobType, includeInactive: boolean = false): Promise<Job[]> {
    try {
      let query = 'SELECT * FROM job WHERE job_type = $1';
      
      if (!includeInactive) {
        query += ' AND is_active = true';
      }
      
      query += ' ORDER BY next_run_time ASC';
      
      const result = await db.query(query, [jobType]);
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      logger.error('Failed to get jobs by type', { jobType, error });
      throw new JobError(`Failed to get jobs by type: ${error.message}`);
    }
  }
  
  /**
   * Get jobs by status
   * @param status The job status
   * @returns Array of jobs with the specified status
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    try {
      const result = await db.query(
        'SELECT * FROM job WHERE status = $1 AND is_active = true ORDER BY next_run_time ASC',
        [status]
      );
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      logger.error('Failed to get jobs by status', { status, error });
      throw new JobError(`Failed to get jobs by status: ${error.message}`);
    }
  }
  
  /**
   * Get jobs by tenant
   * @param tenantId The tenant ID
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs for the specified tenant
   */
  async getJobsByTenant(tenantId: string, includeInactive: boolean = false): Promise<Job[]> {
    try {
      let query = 'SELECT * FROM job WHERE tenant_id = $1';
      
      if (!includeInactive) {
        query += ' AND is_active = true';
      }
      
      query += ' ORDER BY next_run_time ASC';
      
      const result = await db.query(query, [tenantId]);
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      logger.error('Failed to get jobs by tenant', { tenantId, error });
      throw new JobError(`Failed to get jobs by tenant: ${error.message}`);
    }
  }
  
  /**
   * Initialize the scheduler
   * Loads jobs from database and sets up interval for checking due jobs
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Job scheduler already initialized');
      return;
    }
    
    try {
      logger.info('Initializing job scheduler');
      
      // Load active scheduled jobs with cron expressions
      const jobs = await this.getActiveScheduledJobs();
      
      // Create cron jobs for each job with a cron expression
      for (const job of jobs) {
        if (job.cronExpression) {
          this.createCronJob(job);
        }
      }
      
      // Start polling for due jobs
      this.startJobPolling();
      
      this.isInitialized = true;
      logger.info('Job scheduler initialized successfully', { 
        scheduledJobs: this.cronJobs.size, 
        pollInterval: this.pollIntervalMs 
      });
    } catch (error) {
      logger.error('Failed to initialize job scheduler', { error });
      throw new JobError(`Failed to initialize job scheduler: ${error.message}`);
    }
  }
  
  /**
   * Shutdown the scheduler
   * Stops all cron jobs and clears intervals
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down job scheduler');
      
      // Stop all cron jobs
      for (const cronJob of this.cronJobs.values()) {
        cronJob.stop();
      }
      
      this.cronJobs.clear();
      
      // Clear job check interval
      if (this.jobCheckInterval) {
        clearInterval(this.jobCheckInterval);
        this.jobCheckInterval = null;
      }
      
      this.isInitialized = false;
      logger.info('Job scheduler shutdown complete');
    } catch (error) {
      logger.error('Error during job scheduler shutdown', { error });
    }
  }
  
  /**
   * Get due jobs that need to be executed
   * @returns Array of due jobs
   */
  async getDueJobs(): Promise<Job[]> {
    try {
      const now = new Date();
      
      const result = await db.query(
        `SELECT * FROM job 
         WHERE status = $1 
         AND is_active = true
         AND next_run_time <= $2
         ORDER BY priority DESC, next_run_time ASC`,
        [JobStatus.SCHEDULED, now]
      );
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      logger.error('Failed to get due jobs', { error });
      throw new JobError(`Failed to get due jobs: ${error.message}`);
    }
  }
  
  /**
   * Mark a job as running
   * @param jobId The job ID
   * @returns The updated job
   */
  async markJobRunning(jobId: string): Promise<Job | null> {
    try {
      const nodeId = getNodeId();
      const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes default lock
      
      // First try to acquire a lock
      const lockResult = await db.query(
        `INSERT INTO job_lock (job_id, node_id, locked_at, expires_at, updated_at)
         VALUES ($1, $2, NOW(), $3, NOW())
         ON CONFLICT (job_id) 
         DO UPDATE SET 
           node_id = EXCLUDED.node_id,
           locked_at = EXCLUDED.locked_at,
           expires_at = EXCLUDED.expires_at,
           updated_at = EXCLUDED.updated_at
         WHERE job_lock.expires_at < NOW()
         RETURNING *`,
        [jobId, nodeId, lockExpiresAt]
      );
      
      // If we couldn't acquire the lock, another node is processing it
      if (lockResult.rowCount === 0) {
        return null;
      }
      
      // Update job status to running
      const jobResult = await db.query(
        `UPDATE job 
         SET status = $1, 
             last_run_time = NOW(),
             lock_id = $2,
             lock_expires_at = $3,
             updated_at = NOW(),
             version = version + 1
         WHERE id = $4 
         AND status = $5
         RETURNING *`,
        [JobStatus.RUNNING, nodeId, lockExpiresAt, jobId, JobStatus.SCHEDULED]
      );
      
      if (jobResult.rowCount === 0) {
        // Release the lock since we couldn't update the job
        await db.query('DELETE FROM job_lock WHERE job_id = $1', [jobId]);
        return null;
      }
      
      return this.mapJobFromDb(jobResult.rows[0]);
    } catch (error) {
      logger.error('Failed to mark job as running', { jobId, error });
      throw new JobError(`Failed to mark job as running: ${error.message}`);
    }
  }
  
  /**
   * Update job next run time based on cron expression
   * @param job The job to update
   * @returns The updated job
   */
  async updateJobNextRunTime(job: Job): Promise<Job> {
    try {
      let nextRunTime: Date | null = null;
      
      // Calculate next run time based on cron expression
      if (job.cronExpression) {
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
      }
      
      // If there's no next run time, the job is complete
      const status = nextRunTime ? JobStatus.SCHEDULED : JobStatus.COMPLETED;
      
      // Update job in database
      const result = await db.query(
        `UPDATE job 
         SET status = $1, 
             next_run_time = $2,
             updated_at = NOW(),
             lock_id = NULL,
             lock_expires_at = NULL,
             version = version + 1
         WHERE id = $3
         RETURNING *`,
        [status, nextRunTime, job.id]
      );
      
      if (result.rowCount === 0) {
        throw new JobError('Failed to update job next run time - it may have been modified by another process');
      }
      
      // Release the lock
      await db.query('DELETE FROM job_lock WHERE job_id = $1', [job.id]);
      
      return this.mapJobFromDb(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update job next run time', { jobId: job.id, error });
      throw new JobError(`Failed to update job next run time: ${error.message}`);
    }
  }
  
  /**
   * Mark a job as completed
   * @param jobId The job ID
   * @returns The updated job
   */
  async markJobCompleted(jobId: string): Promise<Job> {
    try {
      const job = await this.getJob(jobId);
      
      if (!job) {
        throw new JobNotFoundError();
      }
      
      // Update job completion time
      const result = await db.query(
        `UPDATE job 
         SET last_completion_time = NOW(),
             retry_count = 0,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [jobId]
      );
      
      if (result.rowCount === 0) {
        throw new JobError('Failed to mark job as completed');
      }
      
      // Update next run time
      return await this.updateJobNextRunTime(this.mapJobFromDb(result.rows[0]));
    } catch (error) {
      logger.error('Failed to mark job as completed', { jobId, error });
      
      if (error instanceof JobNotFoundError) {
        throw error;
      }
      
      throw new JobError(`Failed to mark job as completed: ${error.message}`);
    }
  }
  
  /**
   * Mark a job as failed
   * @param jobId The job ID
   * @param error The error that occurred
   * @returns The updated job
   */
  async markJobFailed(jobId: string, error: Error): Promise<Job> {
    try {
      const job = await this.getJob(jobId);
      
      if (!job) {
        throw new JobNotFoundError();
      }
      
      // Increment retry count
      const retryCount = job.retryCount + 1;
      
      // Check if we should retry or mark as failed
      const shouldRetry = retryCount <= job.maxRetries;
      const status = shouldRetry ? JobStatus.SCHEDULED : JobStatus.FAILED;
      
      // Calculate next run time for retry
      let nextRunTime: Date | null = null;
      
      if (shouldRetry) {
        // Exponential backoff for retries (5s, 25s, 125s, etc.)
        const delaySeconds = Math.pow(5, retryCount);
        nextRunTime = new Date(Date.now() + delaySeconds * 1000);
      } else if (job.cronExpression) {
        // If it's a recurring job, set next run time based on cron
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
      }
      
      // Update job in database
      const result = await db.query(
        `UPDATE job 
         SET status = $1, 
             next_run_time = $2,
             retry_count = $3,
             last_failure_time = NOW(),
             updated_at = NOW(),
             lock_id = NULL,
             lock_expires_at = NULL,
             version = version + 1
         WHERE id = $4
         RETURNING *`,
        [status, nextRunTime, retryCount, jobId]
      );
      
      if (result.rowCount === 0) {
        throw new JobError('Failed to mark job as failed');
      }
      
      // Release the lock
      await db.query('DELETE FROM job_lock WHERE job_id = $1', [jobId]);
      
      return this.mapJobFromDb(result.rows[0]);
    } catch (error) {
      logger.error('Failed to mark job as failed', { jobId, error });
      
      if (error instanceof JobNotFoundError) {
        throw error;
      }
      
      throw new JobError(`Failed to mark job as failed: ${error.message}`);
    }
  }
  
  /**
   * Log job execution
   * @param jobId The job ID
   * @param status The execution status
   * @param startTime The start time
   * @param endTime The end time
   * @param error Optional error
   * @param parameters Optional job parameters
   * @param result Optional job result
   */
  async logJobExecution(
    job: Job,
    status: JobStatus,
    startTime: Date,
    endTime?: Date,
    error?: Error,
    parameters?: JobParameters,
    result?: any
  ): Promise<void> {
    try {
      const nodeId = getNodeId();
      const processingTimeMs = endTime ? endTime.getTime() - startTime.getTime() : null;
      
      await db.query(
        `INSERT INTO job_execution (
          id, job_id, job_name, job_type, start_time, end_time, 
          status, error_message, error_stack, parameters, 
          result, tenant_id, executed_by, processing_time_ms, node_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          uuidv4(),
          job.id,
          job.name,
          job.jobType,
          startTime,
          endTime,
          status,
          error?.message,
          error?.stack,
          parameters ? JSON.stringify(parameters) : null,
          result ? JSON.stringify(result) : null,
          job.tenantId,
          'system',
          processingTimeMs,
          nodeId
        ]
      );
    } catch (error) {
      logger.error('Failed to log job execution', { jobId: job.id, error });
    }
  }
  
  /**
   * Create a cron job for a scheduled job
   * @param job The job to create a cron job for
   */
  private createCronJob(job: Job): void {
    if (!job.cronExpression) {
      return;
    }
    
    // Check if job already has a cron job
    if (this.cronJobs.has(job.id)) {
      // Stop existing cron job
      this.cronJobs.get(job.id)?.stop();
    }
    
    try {
      // Create cron job
      const cronJob = new CronJob(
        job.cronExpression,
        async () => {
          try {
            await this.onCronTrigger(job);
          } catch (error) {
            logger.error('Error in cron job execution', { jobId: job.id, error });
          }
        },
        null, // onComplete
        true, // start
        'UTC' // timeZone
      );
      
      this.cronJobs.set(job.id, cronJob);
      logger.debug('Cron job created', { jobId: job.id, cronExpression: job.cronExpression });
    } catch (error) {
      logger.error('Failed to create cron job', { jobId: job.id, cronExpression: job.cronExpression, error });
    }
  }
  
  /**
   * Handle cron job trigger
   * @param job The job triggered by cron
   */
  private async onCronTrigger(job: Job): Promise<void> {
    try {
      logger.debug('Cron job triggered', { jobId: job.id, jobType: job.jobType });
      
      // Update next run time
      await db.query(
        `UPDATE job 
         SET next_run_time = NOW() 
         WHERE id = $1 
         AND status = $2`,
        [job.id, JobStatus.SCHEDULED]
      );
    } catch (error) {
      logger.error('Error handling cron trigger', { jobId: job.id, error });
    }
  }
  
  /**
   * Start polling for due jobs
   */
  private startJobPolling(): void {
    if (this.jobCheckInterval) {
      clearInterval(this.jobCheckInterval);
    }
    
    this.jobCheckInterval = setInterval(async () => {
      try {
        // Poll the database for due jobs
        const dueJobs = await this.getDueJobs();
        
        if (dueJobs.length > 0) {
          logger.debug('Found due jobs', { count: dueJobs.length });
        }
        
        // Emit event for each due job (to be consumed by job processor)
        for (const job of dueJobs) {
          // We're not doing anything here since the job processor will poll for jobs
          // This is just for logging purposes
          logger.debug('Job ready for execution', { 
            jobId: job.id, 
            jobType: job.jobType, 
            scheduledTime: job.nextRunTime 
          });
        }
      } catch (error) {
        logger.error('Error polling for due jobs', { error });
      }
    }, this.pollIntervalMs);
  }
  
  /**
   * Get all active scheduled jobs
   * @returns Array of active scheduled jobs
   */
  private async getActiveScheduledJobs(): Promise<Job[]> {
    const result = await db.query(
      `SELECT * FROM job 
       WHERE status = $1 
       AND is_active = true 
       AND cron_expression IS NOT NULL
       ORDER BY next_run_time ASC`,
      [JobStatus.SCHEDULED]
    );
    
    return result.rows.map(row => this.mapJobFromDb(row));
  }
  
  /**
   * Map database row to Job object
   * @param row Database row
   * @returns Job object
   */
  private mapJobFromDb(row: any): Job {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      jobType: row.job_type,
      cronExpression: row.cron_expression,
      executionInterval: row.execution_interval,
      status: row.status,
      priority: row.priority,
      parameters: row.parameters ? row.parameters : null,
      nextRunTime: row.next_run_time,
      lastRunTime: row.last_run_time,
      lastCompletionTime: row.last_completion_time,
      lastFailureTime: row.last_failure_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      tenantId: row.tenant_id,
      isActive: row.is_active,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      timeoutSeconds: row.timeout_seconds,
      lockId: row.lock_id,
      lockExpiresAt: row.lock_expires_at,
      version: row.version
    };
  }
}