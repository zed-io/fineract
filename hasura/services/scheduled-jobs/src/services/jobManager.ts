import { 
  Job, 
  JobManager, 
  JobWorker, 
  JobScheduler, 
  JobProcessor,
  JobExecution,
  JobType,
  JobError,
  JobNotFoundError,
  JobStatus
} from '../models/job';
import { DatabaseJobScheduler } from './jobScheduler';
import { DefaultJobProcessor } from './jobProcessor';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { createContextLogger } from '../utils/logger';

/**
 * Implementation of the job manager
 * Combines scheduler and processor functionality
 */
export class DefaultJobManager implements JobManager {
  private scheduler: JobScheduler;
  private processor: JobProcessor;
  private managerLogger = createContextLogger('JobManager');
  
  /**
   * Create a new job manager
   * @param scheduler Optional custom scheduler implementation
   * @param processor Optional custom processor implementation
   */
  constructor(scheduler?: JobScheduler, processor?: JobProcessor) {
    this.scheduler = scheduler || new DatabaseJobScheduler();
    this.processor = processor || new DefaultJobProcessor();
  }
  
  /**
   * Register a job worker
   * @param worker The worker to register
   */
  registerWorker(worker: JobWorker): void {
    this.processor.registerWorker(worker);
  }
  
  /**
   * Schedule a job
   * @param job The job to schedule
   * @returns The scheduled job
   */
  async scheduleJob(job: Job): Promise<Job> {
    return await this.scheduler.scheduleJob(job);
  }
  
  /**
   * Execute a job immediately
   * @param job The job to execute
   * @returns The execution result
   */
  async executeJob(job: Job): Promise<any> {
    // Create a copy of the job if it doesn't have an ID
    let jobToRun = job;
    
    if (!job.id) {
      // This is a one-time execution, schedule it first
      jobToRun = await this.scheduler.scheduleJob({
        ...job,
        status: JobStatus.SCHEDULED,
        nextRunTime: new Date() // Set to run immediately
      });
    }
    
    try {
      return await this.processor.processJob(jobToRun);
    } catch (error) {
      this.managerLogger.error('Error executing job', { 
        jobId: jobToRun.id, 
        jobType: jobToRun.jobType, 
        error 
      });
      throw error;
    }
  }
  
  /**
   * Cancel a scheduled job
   * @param jobId The job ID to cancel
   * @returns Whether cancellation was successful
   */
  async cancelJob(jobId: string): Promise<boolean> {
    return await this.scheduler.cancelJob(jobId);
  }
  
  /**
   * Pause a job
   * @param jobId The job ID to pause
   * @returns Whether pause was successful
   */
  async pauseJob(jobId: string): Promise<boolean> {
    return await this.scheduler.pauseJob(jobId);
  }
  
  /**
   * Resume a paused job
   * @param jobId The job ID to resume
   * @returns Whether resume was successful
   */
  async resumeJob(jobId: string): Promise<boolean> {
    return await this.scheduler.resumeJob(jobId);
  }
  
  /**
   * Get a job by ID
   * @param jobId The job ID
   * @returns The job or null if not found
   */
  async getJob(jobId: string): Promise<Job | null> {
    return await this.scheduler.getJob(jobId);
  }
  
  /**
   * Get job execution history
   * @param jobId The job ID
   * @param limit Maximum number of records to return
   * @returns Array of job executions
   */
  async getJobExecutionHistory(jobId: string, limit: number = 10): Promise<JobExecution[]> {
    try {
      // Check if job exists
      const job = await this.getJob(jobId);
      
      if (!job) {
        throw new JobNotFoundError();
      }
      
      // Get execution history
      const result = await db.query(
        `SELECT * FROM job_execution 
         WHERE job_id = $1 
         ORDER BY start_time DESC 
         LIMIT $2`,
        [jobId, limit]
      );
      
      return result.rows.map(row => this.mapExecutionFromDb(row));
    } catch (error) {
      this.managerLogger.error('Failed to get job execution history', { jobId, error });
      
      if (error instanceof JobNotFoundError) {
        throw error;
      }
      
      throw new JobError(`Failed to get job execution history: ${error.message}`);
    }
  }
  
  /**
   * Initialize the job manager
   * Initializes both scheduler and processor
   */
  async initialize(): Promise<void> {
    this.managerLogger.info('Initializing job manager');
    
    // Initialize database
    const dbConnected = await db.initDatabase();
    
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }
    
    // Initialize scheduler and processor
    await this.scheduler.initialize();
    await this.processor.initialize();
    
    this.managerLogger.info('Job manager initialized successfully');
  }
  
  /**
   * Shutdown the job manager
   * Shuts down both scheduler and processor
   */
  async shutdown(): Promise<void> {
    this.managerLogger.info('Shutting down job manager');
    
    // Shutdown processor and scheduler
    await this.processor.shutdown();
    await this.scheduler.shutdown();
    
    this.managerLogger.info('Job manager shutdown complete');
  }
  
  /**
   * Get all jobs
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of all jobs
   */
  async getAllJobs(includeInactive: boolean = false): Promise<Job[]> {
    return await this.scheduler.getAllJobs(includeInactive);
  }
  
  /**
   * Get jobs by type
   * @param jobType The job type
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs of the specified type
   */
  async getJobsByType(jobType: JobType, includeInactive: boolean = false): Promise<Job[]> {
    return await this.scheduler.getJobsByType(jobType, includeInactive);
  }
  
  /**
   * Get jobs by status
   * @param status The job status
   * @returns Array of jobs with the specified status
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    return await this.scheduler.getJobsByStatus(status);
  }
  
  /**
   * Get jobs by tenant
   * @param tenantId The tenant ID
   * @param includeInactive Whether to include inactive jobs
   * @returns Array of jobs for the specified tenant
   */
  async getJobsByTenant(tenantId: string, includeInactive: boolean = false): Promise<Job[]> {
    return await this.scheduler.getJobsByTenant(tenantId, includeInactive);
  }
  
  /**
   * Update an existing job
   * @param job The job to update
   * @returns The updated job
   */
  async updateJob(job: Job): Promise<Job> {
    // Ensure job exists
    const existingJob = await this.getJob(job.id);
    
    if (!existingJob) {
      throw new JobNotFoundError();
    }
    
    // Schedule job (which will update it)
    return await this.scheduler.scheduleJob({
      ...existingJob,
      ...job,
      version: existingJob.version // Ensure version matches
    });
  }
  
  /**
   * Map database row to JobExecution object
   * @param row Database row
   * @returns JobExecution object
   */
  private mapExecutionFromDb(row: any): JobExecution {
    return {
      id: row.id,
      jobId: row.job_id,
      jobName: row.job_name,
      jobType: row.job_type,
      startTime: row.start_time,
      endTime: row.end_time,
      status: row.status,
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
}