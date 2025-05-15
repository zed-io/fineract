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
 * Interface for Recurring Deposit Installment Tracking Job Parameters
 */
export interface RecurringDepositInstallmentTrackingJobParameters extends JobParameters {
  asOfDate?: string; // Optional date to use for tracking
  trackOverdueOnly?: boolean; // Whether to track only overdue installments
  applyPenalties?: boolean; // Whether to apply penalties for overdue installments
  sendNotifications?: boolean; // Whether to send notifications for overdue installments
  testMode?: boolean; // Whether to run in test mode (doesn't actually send notifications)
}

/**
 * Recurring Deposit Installment Tracking Job Worker
 * Tracks installment due dates and updates overdue information
 */
export class RecurringDepositInstallmentTrackingJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositInstallmentTracking');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Tracking results
   */
  async process(job: Job, parameters?: RecurringDepositInstallmentTrackingJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit installment tracking', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositInstallmentTrackingJobParameters || {};

      // Extract parameters with defaults
      const applyPenalties = jobParams.applyPenalties || false;
      const sendNotifications = jobParams.sendNotifications || false;
      const testMode = jobParams.testMode || false;

      // Execute tracking via the actions service
      const response = await axios.post(`${this.actionsUrl}/api/recurring-deposit/track-installments`, {
        input: {
          asOfDate: jobParams.asOfDate || new Date().toISOString().split('T')[0],
          applyPenalties: applyPenalties
        },
        request_query: "",
        session_variables: {
          'x-hasura-role': 'admin'
        }
      });
      
      const trackingResults = response.data;

      // Send notifications for overdue installments if enabled
      let notificationsSent = 0;
      const notificationResults = [];

      if (sendNotifications && trackingResults.accountsWithOverdueInstallments > 0) {
        this.logger.info(`Sending notifications for ${trackingResults.accountsWithOverdueInstallments} accounts with overdue installments`);

        // Process each account with overdue installments
        for (const account of trackingResults.accounts) {
          try {
            // Only send if not in test mode
            if (!testMode) {
              // Send notification via notification service
              const notificationResponse = await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                input: {
                  recipientId: account.clientId,
                  recipientType: 'client',
                  recipientEmail: account.clientEmail || undefined, // Will be fetched by service if not provided
                  recipientPhone: account.clientPhone || undefined, // Will be fetched by service if not provided
                  notificationType: 'email', // Default to email, can be overridden by parameter
                  templateType: account.penaltyApplied ? 'recurring_deposit_penalty_applied' : 'recurring_deposit_overdue',
                  priority: 'high',
                  data: {
                    accountNo: account.accountNo,
                    clientName: account.clientName,
                    overdueInstallments: account.overdueInstallments,
                    totalOverdueAmount: account.totalOverdueAmount,
                    currency: 'USD', // Should be fetched from account in a real implementation
                    penaltyApplied: account.penaltyApplied,
                    penaltyAmount: account.penaltyAmount
                  }
                },
                request_query: "",
                session_variables: {
                  'x-hasura-role': 'admin'
                }
              });

              notificationResults.push({
                accountId: account.accountId,
                success: true,
                notificationId: notificationResponse.data.id
              });

              notificationsSent++;
            } else {
              // Test mode - log but don't send
              notificationResults.push({
                accountId: account.accountId,
                success: true,
                testMode: true
              });

              notificationsSent++;
            }
          } catch (error) {
            this.logger.error('Error sending notification for account', {
              error, accountId: account.accountId
            });

            notificationResults.push({
              accountId: account.accountId,
              success: false,
              error: error.message
            });
          }
        }

        this.logger.info(`Sent ${notificationsSent} notifications for overdue installments`);
      }

      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        trackingResults,
        notificationResults: sendNotifications ? {
          sent: notificationsSent,
          details: notificationResults
        } : null,
        status: 'completed',
        message: `Processed ${trackingResults.totalAccountsChecked} accounts, found ${trackingResults.accountsWithOverdueInstallments} with overdue installments${sendNotifications ? `, sent ${notificationsSent} notifications` : ''}`
      };
      
      this.logger.info('Recurring deposit installment tracking completed', { 
        executionTimeMs,
        totalAccounts: trackingResults.totalAccountsChecked,
        overdueAccounts: trackingResults.accountsWithOverdueInstallments
      });
      
      return results;
    } catch (error) {
      this.logger.error('Recurring deposit installment tracking failed', { error });
      
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
           job.name === 'Recurring Deposit Installment Tracking';
  }
}