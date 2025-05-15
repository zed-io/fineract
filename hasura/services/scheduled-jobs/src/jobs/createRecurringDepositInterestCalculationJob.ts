import { 
  Job, 
  JobStatus, 
  JobType, 
  JobExecutionInterval, 
  JobPriority 
} from '../models/job';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('CreateRecurringDepositInterestCalculationJob');

/**
 * Create a recurring deposit interest calculation job
 * @param jobManager The job manager
 */
export async function createRecurringDepositInterestCalculationJob(jobManager: any) {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Interest Calculation');
    
    if (existingJob) {
      logger.info('Recurring deposit interest calculation job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit interest calculation job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Interest Calculation',
      description: 'Calculates and posts interest for recurring deposit accounts',
      jobType: JobType.CUSTOM,
      cronExpression: '0 1 * * *', // Run at 1 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.HIGH, // Higher priority than tracking
      parameters: {
        postingEnabled: true, // Automatically post interest after calculation
        applyMinimumBalance: true, // Apply minimum balance requirements
        applyRateVariations: true, // Apply rate variations based on account configuration
        testMode: false // Set to true for testing without actual posting
      },
      nextRunTime: new Date(Date.now() + 10 * 60000), // Start in 10 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 3,
      timeoutSeconds: 1800, // 30 minutes timeout (interest calculation can be resource-intensive)
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit interest calculation job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit interest calculation job:', error);
  }
}