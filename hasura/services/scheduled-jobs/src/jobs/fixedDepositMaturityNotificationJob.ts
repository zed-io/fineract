/**
 * Fixed Deposit Maturity Notification Job Worker
 */

import { JobWorker, Job, JobExecutionResult } from '../models/job';
import { createContextLogger } from '../utils/logger';
import { processFixedDepositMaturityNotifications } from '../fixedDepositMaturityNotification';

// Create logger
const logger = createContextLogger('FixedDepositMaturityNotificationJob');

export class FixedDepositMaturityNotificationJobWorker implements JobWorker {
  readonly jobName = 'Fixed Deposit Maturity Notification';
  
  async execute(job: Job): Promise<JobExecutionResult> {
    logger.info('Executing fixed deposit maturity notification job', { jobId: job.id });
    
    try {
      // Extract parameters
      const daysBeforeMaturity = job.parameters?.daysBeforeMaturity || 7;
      const testMode = job.parameters?.testMode || false;
      
      if (testMode) {
        logger.info('Running in test mode - no notifications will be sent');
        return {
          success: true,
          message: 'Job executed successfully in test mode',
          result: {
            notificationCount: 0,
            testMode: true
          }
        };
      }
      
      // Process notifications
      const notificationCount = await processFixedDepositMaturityNotifications(daysBeforeMaturity);
      
      return {
        success: true,
        message: `Sent ${notificationCount} maturity notifications`,
        result: {
          notificationCount,
          daysBeforeMaturity
        }
      };
    } catch (error) {
      logger.error('Error executing fixed deposit maturity notification job', error);
      
      return {
        success: false,
        message: `Job execution failed: ${error.message}`,
        error: error
      };
    }
  }
}