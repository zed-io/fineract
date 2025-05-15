/**
 * Create Fixed Deposit Maturity Notification Job
 * 
 * This function creates the job for sending notifications about upcoming fixed deposit maturities
 */

import { JobManager, Job, JobType, JobStatus, JobExecutionInterval, JobPriority } from '../models/job';
import { createContextLogger } from '../utils/logger';

// Create logger
const logger = createContextLogger('CreateFixedDepositMaturityNotificationJob');

/**
 * Create fixed deposit maturity notification job
 * @param jobManager JobManager instance
 */
export async function createFixedDepositMaturityNotificationJob(jobManager: JobManager): Promise<void> {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Fixed Deposit Maturity Notification');
    
    if (existingJob) {
      logger.info('Fixed deposit maturity notification job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating fixed deposit maturity notification job');
    
    const job: Job = {
      id: undefined,
      name: 'Fixed Deposit Maturity Notification',
      description: 'Sends notifications for fixed deposits approaching maturity',
      jobType: JobType.CUSTOM,
      cronExpression: '0 9 * * *', // Run at 9 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.MEDIUM,
      parameters: {
        daysBeforeMaturity: 7, // Send notifications 7 days before maturity
        notificationTypes: ['email', 'sms', 'in_app'], // Send all notification types
        testMode: false // Set to true for testing
      },
      nextRunTime: new Date(Date.now() + 6 * 60000), // Start in 6 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 2,
      timeoutSeconds: 600, // 10 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created fixed deposit maturity notification job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create fixed deposit maturity notification job:', error);
  }
}