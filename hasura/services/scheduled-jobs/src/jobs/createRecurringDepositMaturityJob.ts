import { 
  Job, 
  JobStatus, 
  JobType, 
  JobExecutionInterval, 
  JobPriority 
} from '../models/job';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('CreateRecurringDepositMaturityJob');

/**
 * Create a recurring deposit maturity processing job
 * @param jobManager The job manager
 */
export async function createRecurringDepositMaturityJob(jobManager: any) {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Maturity');
    
    if (existingJob) {
      logger.info('Recurring deposit maturity job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit maturity job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Maturity',
      description: 'Processes maturity for recurring deposit accounts',
      jobType: JobType.CUSTOM,
      cronExpression: '0 2 * * *', // Run at 2 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.HIGH, // High priority job
      parameters: {
        daysInAdvance: 7, // Send notifications 7 days before maturity
        autoRenew: true, // Automatically renew eligible accounts
        sendNotifications: true, // Send notifications
        notificationTypes: ['email', 'sms'], // Notification channels
        processMaturedAccounts: true, // Process matured accounts
        notifyRenewalAccounts: true, // Notify about auto-renewals
        testMode: false // Set to true for testing
      },
      nextRunTime: new Date(Date.now() + 15 * 60000), // Start in 15 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 3,
      timeoutSeconds: 1800, // 30 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit maturity job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit maturity job:', error);
  }
}