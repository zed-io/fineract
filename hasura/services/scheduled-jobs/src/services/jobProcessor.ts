import { 
  Job,
  JobProcessor,
  JobWorker,
  JobType,
  JobStatus,
  JobError,
  JobTimeoutError,
  JobWorkerNotFoundError,
  JobParameters
} from '../models/job';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { createContextLogger } from '../utils/logger';
import { getNodeId } from '../utils/nodeId';

/**
 * Implementation of the job processor
 * Handles job execution and worker management
 */
export class DefaultJobProcessor implements JobProcessor {
  private workers: Map<JobType, JobWorker> = new Map();
  private jobPollInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private pollIntervalMs: number = 5000; // 5 seconds by default
  private processingJobs: Set<string> = new Set(); // Currently processing job IDs
  private maxConcurrentJobs: number = 10; // Maximum number of concurrent jobs
  private jobLogger = createContextLogger('JobProcessor');
  
  constructor(pollIntervalMs?: number, maxConcurrentJobs?: number) {
    if (pollIntervalMs) {
      this.pollIntervalMs = pollIntervalMs;
    }
    
    if (maxConcurrentJobs) {
      this.maxConcurrentJobs = maxConcurrentJobs;
    }
  }
  
  /**
   * Register a job worker
   * @param worker The worker to register
   */
  registerWorker(worker: JobWorker): void {
    const jobType = worker.getJobType();
    
    if (this.workers.has(jobType)) {
      this.jobLogger.warn(`Worker for job type ${jobType} is being replaced`);
    }
    
    this.workers.set(jobType, worker);
    this.jobLogger.info(`Worker registered for job type: ${jobType}`);
  }
  
  /**
   * Process a job
   * @param job The job to process
   * @returns Processing result
   */
  async processJob(job: Job): Promise<any> {
    // Skip if we're already processing this job
    if (this.processingJobs.has(job.id)) {
      return;
    }
    
    // Get worker for job type
    const worker = this.workers.get(job.jobType);
    
    if (!worker) {
      throw new JobWorkerNotFoundError(job.jobType);
    }
    
    // Get job-specific logger
    const jobLogger = createContextLogger('JobProcessor', {
      jobId: job.id,
      jobType: job.jobType,
      tenantId: job.tenantId
    });
    
    try {
      jobLogger.info('Starting job processing', { 
        jobName: job.name,
        priority: job.priority 
      });
      
      // Mark job as being processed
      this.processingJobs.add(job.id);
      
      // Mark job as running in database
      await db.query(
        `UPDATE job 
         SET status = $1, 
             last_run_time = NOW(),
             lock_id = $2,
             lock_expires_at = NOW() + (interval '1 second' * $3),
             updated_at = NOW(),
             version = version + 1
         WHERE id = $4 
         AND status = $5`,
        [JobStatus.RUNNING, getNodeId(), job.timeoutSeconds, job.id, JobStatus.SCHEDULED]
      );
      
      // Record execution start
      const startTime = new Date();
      await this.logJobExecution(job, JobStatus.RUNNING, startTime);
      
      // Create timeout for job
      const timeoutMs = job.timeoutSeconds * 1000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new JobTimeoutError()), timeoutMs);
      });
      
      // Execute the job with timeout
      const result = await Promise.race([
        worker.process(job, job.parameters),
        timeoutPromise
      ]);
      
      // Record execution end
      const endTime = new Date();
      
      // Mark job as completed
      await this.markJobCompleted(job.id);
      await this.logJobExecution(job, JobStatus.COMPLETED, startTime, endTime, null, job.parameters, result);
      
      jobLogger.info('Job completed successfully', {
        jobName: job.name,
        duration: endTime.getTime() - startTime.getTime()
      });
      
      return result;
    } catch (error) {
      const endTime = new Date();
      
      jobLogger.error('Job processing failed', { 
        error: error.message,
        stack: error.stack
      });
      
      // Mark job as failed
      try {
        await this.markJobFailed(job.id, error);
        await this.logJobExecution(
          job, 
          JobStatus.FAILED, 
          job.lastRunTime || new Date(), 
          endTime, 
          error, 
          job.parameters
        );
      } catch (loggingError) {
        jobLogger.error('Failed to log job failure', { error: loggingError });
      }
      
      throw error;
    } finally {
      // Remove job from processing set
      this.processingJobs.delete(job.id);
    }
  }
  
  /**
   * Initialize the processor
   * Sets up job polling and cleanup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.jobLogger.warn('Job processor already initialized');
      return;
    }
    
    try {
      this.jobLogger.info('Initializing job processor', {
        pollInterval: this.pollIntervalMs,
        maxConcurrentJobs: this.maxConcurrentJobs
      });
      
      // Start polling for jobs
      this.startJobPolling();
      
      // Cleanup any stale running jobs for this node
      await this.cleanupStaleJobs();
      
      this.isInitialized = true;
      this.jobLogger.info('Job processor initialized successfully', {
        registeredWorkers: this.workers.size
      });
    } catch (error) {
      this.jobLogger.error('Failed to initialize job processor', { error });
      throw new JobError(`Failed to initialize job processor: ${error.message}`);
    }
  }
  
  /**
   * Shutdown the processor
   * Stops job polling and waits for running jobs to complete
   */
  async shutdown(): Promise<void> {
    try {
      this.jobLogger.info('Shutting down job processor');
      
      // Stop polling for jobs
      if (this.jobPollInterval) {
        clearInterval(this.jobPollInterval);
        this.jobPollInterval = null;
      }
      
      // Wait for running jobs to complete
      if (this.processingJobs.size > 0) {
        this.jobLogger.info(`Waiting for ${this.processingJobs.size} running jobs to complete...`);
        
        // Give jobs some time to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      this.isInitialized = false;
      this.jobLogger.info('Job processor shutdown complete');
    } catch (error) {
      this.jobLogger.error('Error during job processor shutdown', { error });
    }
  }
  
  /**
   * Poll for jobs that need to be processed
   */
  private startJobPolling(): void {
    if (this.jobPollInterval) {
      clearInterval(this.jobPollInterval);
    }
    
    this.jobPollInterval = setInterval(async () => {
      try {
        // Skip if we're at max capacity
        if (this.processingJobs.size >= this.maxConcurrentJobs) {
          return;
        }
        
        // Get available capacity
        const availableSlots = this.maxConcurrentJobs - this.processingJobs.size;
        
        // Find jobs to process
        const jobs = await this.getJobsToProcess(availableSlots);
        
        if (jobs.length > 0) {
          this.jobLogger.debug(`Found ${jobs.length} jobs to process`);
          
          // Process jobs (in parallel)
          for (const job of jobs) {
            // Skip jobs we're already processing
            if (this.processingJobs.has(job.id)) {
              continue;
            }
            
            // Skip jobs with no registered worker
            if (!this.workers.has(job.jobType)) {
              this.jobLogger.warn(`No worker registered for job type: ${job.jobType}`);
              continue;
            }
            
            // Lock job for processing
            const locked = await this.lockJob(job.id);
            
            if (!locked) {
              // Job might be locked by another node
              continue;
            }
            
            // Process job
            this.processJob(job).catch(error => {
              this.jobLogger.error('Error processing job', {
                jobId: job.id,
                jobType: job.jobType,
                error: error.message
              });
            });
          }
        }
      } catch (error) {
        this.jobLogger.error('Error polling for jobs', { error });
      }
    }, this.pollIntervalMs);
  }
  
  /**
   * Get jobs that need to be processed
   * @param limit Maximum number of jobs to return
   * @returns Array of jobs to process
   */
  private async getJobsToProcess(limit: number): Promise<Job[]> {
    try {
      const nodeId = getNodeId();
      const now = new Date();
      
      // Get jobs that are scheduled and due for processing
      const result = await db.query(
        `SELECT j.* FROM job j
         LEFT JOIN job_lock l ON j.id = l.job_id
         WHERE j.status = $1 
         AND j.is_active = true
         AND j.next_run_time <= $2
         AND (l.job_id IS NULL OR l.expires_at < $2)
         ORDER BY j.priority DESC, j.next_run_time ASC
         LIMIT $3`,
        [JobStatus.SCHEDULED, now, limit]
      );
      
      return result.rows.map(row => this.mapJobFromDb(row));
    } catch (error) {
      this.jobLogger.error('Failed to get jobs to process', { error });
      return [];
    }
  }
  
  /**
   * Lock a job for processing
   * @param jobId The job ID to lock
   * @returns Whether lock was successful
   */
  private async lockJob(jobId: string): Promise<boolean> {
    try {
      const nodeId = getNodeId();
      const lockExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes default lock
      
      const result = await db.query(
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
      
      return result.rowCount > 0;
    } catch (error) {
      this.jobLogger.error('Failed to lock job', { jobId, error });
      return false;
    }
  }
  
  /**
   * Clean up stale running jobs for this node
   */
  private async cleanupStaleJobs(): Promise<void> {
    try {
      const nodeId = getNodeId();
      
      // Find jobs that were running on this node but may have been interrupted
      const result = await db.query(
        `SELECT * FROM job 
         WHERE status = $1 
         AND lock_id = $2`,
        [JobStatus.RUNNING, nodeId]
      );
      
      if (result.rowCount === 0) {
        return;
      }
      
      this.jobLogger.info(`Found ${result.rowCount} stale jobs from this node, resetting status...`);
      
      // Reset jobs to scheduled status
      await db.query(
        `UPDATE job 
         SET status = $1,
             lock_id = NULL,
             lock_expires_at = NULL,
             updated_at = NOW(),
             version = version + 1
         WHERE status = $2 
         AND lock_id = $3`,
        [JobStatus.SCHEDULED, JobStatus.RUNNING, nodeId]
      );
      
      // Remove locks
      await db.query(
        `DELETE FROM job_lock 
         WHERE node_id = $1`,
        [nodeId]
      );
    } catch (error) {
      this.jobLogger.error('Failed to cleanup stale jobs', { error });
    }
  }
  
  /**
   * Mark a job as completed
   * @param jobId The job ID
   */
  private async markJobCompleted(jobId: string): Promise<void> {
    try {
      // Get job to check if it has a cron expression
      const jobResult = await db.query(
        'SELECT * FROM job WHERE id = $1',
        [jobId]
      );
      
      if (jobResult.rowCount === 0) {
        return;
      }
      
      const job = this.mapJobFromDb(jobResult.rows[0]);
      
      // Update job completion time
      await db.query(
        `UPDATE job 
         SET last_completion_time = NOW(),
             retry_count = 0,
             updated_at = NOW()
         WHERE id = $1`,
        [jobId]
      );
      
      // Update status and next run time
      let nextRunTime = null;
      let status = JobStatus.COMPLETED;
      
      // If job has cron expression, calculate next run time
      if (job.cronExpression) {
        const CronJob = require('cron').CronJob;
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
        status = JobStatus.SCHEDULED;
      }
      
      await db.query(
        `UPDATE job 
         SET status = $1, 
             next_run_time = $2,
             lock_id = NULL,
             lock_expires_at = NULL,
             updated_at = NOW(),
             version = version + 1
         WHERE id = $3`,
        [status, nextRunTime, jobId]
      );
      
      // Release the lock
      await db.query('DELETE FROM job_lock WHERE job_id = $1', [jobId]);
    } catch (error) {
      this.jobLogger.error('Failed to mark job as completed', { jobId, error });
    }
  }
  
  /**
   * Mark a job as failed
   * @param jobId The job ID
   * @param error The error that occurred
   */
  private async markJobFailed(jobId: string, error: Error): Promise<void> {
    try {
      // Get job to check retry count and cron expression
      const jobResult = await db.query(
        'SELECT * FROM job WHERE id = $1',
        [jobId]
      );
      
      if (jobResult.rowCount === 0) {
        return;
      }
      
      const job = this.mapJobFromDb(jobResult.rows[0]);
      
      // Increment retry count
      const retryCount = job.retryCount + 1;
      
      // Check if we should retry or mark as failed
      const shouldRetry = retryCount <= job.maxRetries;
      const status = shouldRetry ? JobStatus.SCHEDULED : JobStatus.FAILED;
      
      // Calculate next run time for retry
      let nextRunTime = null;
      
      if (shouldRetry) {
        // Exponential backoff for retries (5s, 25s, 125s, etc.)
        const delaySeconds = Math.pow(5, retryCount);
        nextRunTime = new Date(Date.now() + delaySeconds * 1000);
      } else if (job.cronExpression) {
        // If it's a recurring job, set next run time based on cron
        const CronJob = require('cron').CronJob;
        const cronJob = new CronJob(job.cronExpression);
        nextRunTime = cronJob.nextDate().toDate();
        status = JobStatus.SCHEDULED;
      }
      
      // Update job in database
      await db.query(
        `UPDATE job 
         SET status = $1, 
             next_run_time = $2,
             retry_count = $3,
             last_failure_time = NOW(),
             updated_at = NOW(),
             lock_id = NULL,
             lock_expires_at = NULL,
             version = version + 1
         WHERE id = $4`,
        [status, nextRunTime, retryCount, jobId]
      );
      
      // Release the lock
      await db.query('DELETE FROM job_lock WHERE job_id = $1', [jobId]);
    } catch (error) {
      this.jobLogger.error('Failed to mark job as failed', { jobId, error });
    }
  }
  
  /**
   * Log job execution
   * @param job The job
   * @param status Execution status
   * @param startTime Start time
   * @param endTime Optional end time
   * @param error Optional error
   * @param parameters Optional parameters
   * @param result Optional result
   */
  private async logJobExecution(
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
        ) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
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
      this.jobLogger.error('Failed to log job execution', { jobId: job.id, error });
    }
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
      parameters: row.parameters,
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