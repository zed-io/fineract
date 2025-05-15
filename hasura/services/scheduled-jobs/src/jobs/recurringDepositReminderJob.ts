import { 
  Job, 
  JobWorker, 
  JobType, 
  JobParameters 
} from '../models/job';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import axios from 'axios';

/**
 * Interface for Recurring Deposit Reminder Job Parameters
 */
export interface RecurringDepositReminderJobParameters extends JobParameters {
  daysInAdvance?: number; // How many days before due date to send reminders (default: 3)
  notificationTypes?: string[]; // Types of notifications to send (default: ['email', 'sms'])
  testMode?: boolean; // Whether to run in test mode (doesn't actually send notifications)
}

/**
 * Recurring Deposit Reminder Job Worker
 * Sends reminders for upcoming recurring deposit installments
 */
export class RecurringDepositReminderJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositReminder');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Processing results
   */
  async process(job: Job, parameters?: RecurringDepositReminderJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit reminder job', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositReminderJobParameters || {};
      
      // Default parameters
      const daysInAdvance = jobParams.daysInAdvance || 3;
      const notificationTypes = jobParams.notificationTypes || ['email', 'sms'];
      const testMode = jobParams.testMode || false;
      
      // Calculate the target date (e.g., 3 days from now)
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysInAdvance);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      this.logger.info(`Finding installments due on ${targetDateStr}`, { daysInAdvance });
      
      // Find all active accounts with installments due on target date
      const accountsResult = await db.query(
        `SELECT rda.id as account_id, rda.deposit_amount, sa.account_no, sa.client_id, sa.currency_code,
                c.first_name || ' ' || c.last_name as client_name, c.email, c.mobile_no,
                rdsi.id as installment_id, rdsi.installment_number, rdsi.due_date, 
                rdsi.deposit_amount as installment_amount
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN client c ON sa.client_id = c.id
         JOIN recurring_deposit_schedule_installment rdsi ON rda.id = rdsi.account_id
         WHERE sa.status = 'active'
         AND rdsi.completed = false
         AND rdsi.due_date = $1::date
         ORDER BY sa.account_no`,
        [targetDateStr]
      );
      
      const totalAccounts = accountsResult.rowCount;
      let remindersSent = 0;
      const accountResults = [];
      
      // Process each account with due installments
      for (const account of accountsResult.rows) {
        try {
          // Prepare notification data
          const notificationData = {
            accountId: account.account_id,
            accountNo: account.account_no,
            clientId: account.client_id,
            clientName: account.client_name,
            installmentNumber: account.installment_number,
            dueDate: account.due_date,
            amount: account.installment_amount,
            currency: account.currency_code,
            clientEmail: account.email,
            clientPhone: account.mobile_no
          };
          
          // Send notifications
          const notificationResults = [];
          
          // Only actually send if not in test mode
          if (!testMode) {
            // Send via notification service
            const response = await axios.post(`${this.actionsUrl}/api/notifications/send`, {
              input: {
                recipientId: account.client_id,
                recipientType: 'client',
                recipientEmail: account.email,
                recipientPhone: account.mobile_no,
                notificationType: notificationTypes.includes('email') ? 'email' : 'sms',
                templateType: 'recurring_deposit_due_reminder',
                priority: 'medium',
                data: {
                  accountNo: account.account_no,
                  clientName: account.client_name,
                  dueDate: account.due_date,
                  amount: account.installment_amount,
                  currency: account.currency_code,
                  installmentNumber: account.installment_number
                }
              },
              request_query: "",
              session_variables: {
                'x-hasura-role': 'admin'
              }
            });
            
            notificationResults.push(response.data);
            remindersSent++;
          }
          
          // Add to results
          accountResults.push({
            accountId: account.account_id,
            accountNo: account.account_no,
            clientId: account.client_id,
            clientName: account.client_name,
            installmentNumber: account.installment_number,
            dueDate: account.due_date,
            notificationSent: !testMode,
            testMode,
            notificationResults: testMode ? [] : notificationResults
          });
        } catch (error) {
          this.logger.error('Error sending reminder for account', { 
            error, accountId: account.account_id, accountNo: account.account_no 
          });
          
          // Add failed result
          accountResults.push({
            accountId: account.account_id,
            accountNo: account.account_no,
            clientId: account.client_id,
            error: error.message,
            success: false
          });
        }
      }
      
      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        targetDate: targetDateStr,
        daysInAdvance,
        totalAccounts,
        remindersSent,
        testMode,
        accounts: accountResults,
        status: 'completed',
        message: `Sent ${remindersSent} reminders for ${totalAccounts} accounts`
      };
      
      this.logger.info('Recurring deposit reminder job completed', { 
        executionTimeMs,
        totalAccounts,
        remindersSent
      });
      
      return results;
    } catch (error) {
      this.logger.error('Recurring deposit reminder job failed', { error });
      
      // Calculate execution time even for failures
      const executionTimeMs = Date.now() - startTime;
      
      return {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        status: 'failed',
        error: error.message,
        stack: error.stack
      };
    }
  }
  
  /**
   * Get job type handled by this worker
   */
  getJobType(): JobType {
    return JobType.CUSTOM;
  }
  
  /**
   * Check if worker can handle the job
   * @param job The job to check
   */
  canHandle(job: Job): boolean {
    return job.jobType === JobType.CUSTOM && 
           job.name === 'Recurring Deposit Reminder';
  }
}