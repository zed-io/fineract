/**
 * Payment Reminder Job
 * Processes payment reminders for different entity types (loans, recurring deposits, etc.)
 */

import { Pool } from 'pg';
import axios from 'axios';
import { logger } from '../utils/logger';
import { JobConfig } from '../models/job';
import { ActionServiceClient } from '../utils/actionServiceClient';

/**
 * Run the payment reminder job
 * @param pool Database connection pool
 * @param jobConfig Job configuration parameters
 * @param actionServiceClient Client for calling action service endpoints
 */
export const runPaymentReminderJob = async (
  pool: Pool,
  jobConfig: JobConfig,
  actionServiceClient: ActionServiceClient
): Promise<{ success: boolean; message: string; results: any }> => {
  try {
    logger.info('Running payment reminder job', { 
      jobType: jobConfig.job_type,
      jobId: jobConfig.id
    });
    
    const reminderTypes = (jobConfig.parameters?.reminder_types || ['loan', 'savings_recurring_deposit']) as string[];
    
    let totalReminders = 0;
    const results: Record<string, number> = {};
    
    // Process loan payment reminders
    if (reminderTypes.includes('loan')) {
      const loanResult = await pool.query('SELECT send_loan_payment_reminders() as count');
      const loanReminders = parseInt(loanResult.rows[0].count);
      totalReminders += loanReminders;
      results.loan = loanReminders;
      
      logger.info(`Sent ${loanReminders} loan payment reminders`);
    }
    
    // Process recurring deposit reminders
    if (reminderTypes.includes('savings_recurring_deposit')) {
      const depositResult = await pool.query('SELECT send_recurring_deposit_reminders() as count');
      const depositReminders = parseInt(depositResult.rows[0].count);
      totalReminders += depositReminders;
      results.recurring_deposit = depositReminders;
      
      logger.info(`Sent ${depositReminders} recurring deposit reminders`);
    }
    
    // Notify websocket server for new notifications if any were sent
    if (totalReminders > 0) {
      try {
        const wsUrl = process.env.NOTIFICATION_WS_URL || 'http://localhost:4001';
        await axios.post(`${wsUrl}/job-complete`, {
          jobType: 'payment_reminder_processing',
          jobId: jobConfig.id,
          totalNotifications: totalReminders
        });
      } catch (wsError) {
        logger.warn('Failed to notify WebSocket server about new reminders', { error: wsError });
        // Continue anyway - notifications are saved in the database
      }
    }
    
    return {
      success: true,
      message: `Processed ${totalReminders} payment reminders`,
      results
    };
  } catch (error) {
    logger.error('Error running payment reminder job', { error, jobId: jobConfig.id });
    
    return {
      success: false,
      message: `Error running payment reminder job: ${error.message}`,
      results: {}
    };
  }
};

export default runPaymentReminderJob;