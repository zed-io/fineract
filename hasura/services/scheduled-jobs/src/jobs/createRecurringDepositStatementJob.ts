import { 
  Job, 
  JobStatus, 
  JobType, 
  JobExecutionInterval, 
  JobPriority 
} from '../models/job';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('CreateRecurringDepositStatementJob');

/**
 * Create a recurring deposit statement generation job
 * @param jobManager The job manager
 */
export async function createRecurringDepositStatementJob(jobManager: any) {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Statement Generation');
    
    if (existingJob) {
      logger.info('Recurring deposit statement job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit statement job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Statement Generation',
      description: 'Generates statements for recurring deposit accounts',
      jobType: JobType.CUSTOM,
      cronExpression: '0 3 * * *', // Run at 3 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.MEDIUM,
      parameters: {
        sendEmail: true, // Send email notifications for generated statements
        testMode: false // Set to true for testing
      },
      nextRunTime: new Date(Date.now() + 20 * 60000), // Start in 20 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 3,
      timeoutSeconds: 1800, // 30 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit statement job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit statement job:', error);
  }
}