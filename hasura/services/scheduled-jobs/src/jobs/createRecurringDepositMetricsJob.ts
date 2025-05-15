import { 
  Job, 
  JobStatus, 
  JobType, 
  JobExecutionInterval, 
  JobPriority 
} from '../models/job';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('CreateRecurringDepositMetricsJob');

/**
 * Create a recurring deposit metrics generation job
 * @param jobManager The job manager
 */
export async function createRecurringDepositMetricsJob(jobManager: any) {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Metrics Generation');
    
    if (existingJob) {
      logger.info('Recurring deposit metrics job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit metrics job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Metrics Generation',
      description: 'Generates and caches performance metrics for recurring deposits',
      jobType: JobType.CUSTOM,
      cronExpression: '0 4 * * *', // Run at 4 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.MEDIUM,
      parameters: {
        cacheMetrics: true, // Cache metrics for faster retrieval
        refreshAll: true // Refresh all metrics
      },
      nextRunTime: new Date(Date.now() + 25 * 60000), // Start in 25 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 3,
      timeoutSeconds: 900, // 15 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit metrics job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit metrics job:', error);
  }
}