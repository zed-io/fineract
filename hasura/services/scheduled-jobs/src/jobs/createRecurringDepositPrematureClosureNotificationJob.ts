/**
 * Creates the recurring deposit premature closure notification job
 */

import { Job, JobType, JobStatus, JobExecutionInterval, JobPriority } from '../models/job';
import { JobManager } from '../managers/jobManager';
import { createContextLogger } from '../utils/logger';

const logger = createContextLogger('CreateRecurringDepositPrematureClosureNotificationJob');

/**
 * Creates the recurring deposit premature closure notification job
 * @param jobManager Job manager instance
 */
export async function createRecurringDepositPrematureClosureNotificationJob(jobManager: JobManager): Promise<void> {
  try {
    // Check if job already exists
    const existingJobs = await jobManager.getAllJobs();
    const existingJob = existingJobs.find(j => j.name === 'Recurring Deposit Premature Closure Notification');
    
    if (existingJob) {
      logger.info('Recurring deposit premature closure notification job already exists', { jobId: existingJob.id });
      return;
    }
    
    logger.info('Creating recurring deposit premature closure notification job');
    
    const job: Job = {
      id: undefined,
      name: 'Recurring Deposit Premature Closure Notification',
      description: 'Sends notifications for premature closures of recurring deposit accounts',
      jobType: JobType.CUSTOM,
      cronExpression: '0 10 * * *', // Run at 10 AM every day
      executionInterval: JobExecutionInterval.DAILY,
      status: JobStatus.SCHEDULED,
      priority: JobPriority.MEDIUM,
      parameters: {
        daysToLookAhead: 7, // Look ahead 7 days
        batchSize: 100, // Process up to 100 closures per run
        sendEmailNotifications: true,
        sendSmsNotifications: true
      },
      nextRunTime: new Date(Date.now() + 9 * 60000), // Start in 9 minutes
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      retryCount: 0,
      maxRetries: 2,
      timeoutSeconds: 600, // 10 minutes timeout
      version: 1
    };
    
    const createdJob = await jobManager.scheduleJob(job);
    logger.info('Created recurring deposit premature closure notification job', { jobId: createdJob.id });
  } catch (error) {
    logger.error('Failed to create recurring deposit premature closure notification job:', error);
  }
}