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
 * Interface for Recurring Deposit Penalty Job Parameters
 */
export interface RecurringDepositPenaltyJobParameters extends JobParameters {
  asOfDate?: string; // Optional date to use for penalty application
  dryRun?: boolean; // Whether to run in dry-run mode (doesn't actually apply penalties)
  notifyOnPenalty?: boolean; // Whether to send notifications when penalties are applied
  productIds?: string[]; // Specific product IDs to process (otherwise all products)
}

/**
 * Recurring Deposit Penalty Job Worker
 * Applies penalties for missed recurring deposit installments
 */
export class RecurringDepositPenaltyJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositPenalty');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Penalty application results
   */
  async process(job: Job, parameters?: RecurringDepositPenaltyJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit penalty job', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositPenaltyJobParameters || {};

      // Extract parameters with defaults
      const dryRun = jobParams.dryRun || false;
      const notifyOnPenalty = jobParams.notifyOnPenalty || false;
      
      // If in dry-run mode, just log
      if (dryRun) {
        this.logger.info('Running in dry-run mode, no penalties will be applied');
      }

      // Apply penalties via the dedicated penalty service
      this.logger.info('Applying penalties using penalty service');
      
      // Only apply penalties if not in dry-run mode
      if (!dryRun) {
        const penaltyResponse = await axios.post(`${this.actionsUrl}/api/recurring-deposit-penalty/apply`, {
          input: {
            asOfDate: jobParams.asOfDate || new Date().toISOString().split('T')[0]
          },
          request_query: "",
          session_variables: {
            'x-hasura-role': 'admin'
          }
        });
        
        const penaltyResults = penaltyResponse.data;
        
        // Send notifications for applied penalties if enabled
        let notificationsSent = 0;
        const notificationResults = [];
        
        if (notifyOnPenalty && penaltyResults.accountsWithPenalties > 0) {
          this.logger.info(`Sending notifications for ${penaltyResults.accountsWithPenalties} accounts with penalties`);
          
          // Group penalties by account for consolidated notifications
          const accountPenalties = this.groupPenaltiesByAccount(penaltyResults.penalties);
          
          // Process each account with penalties
          for (const [accountId, penalties] of Object.entries(accountPenalties)) {
            try {
              const account = penalties[0]; // Use first penalty for account info
              
              // Calculate total penalty amount for this account
              const totalPenaltyAmount = penalties.reduce((sum, penalty) => sum + penalty.penaltyAmount, 0);
              
              // Send notification via notification service
              const notificationResponse = await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                input: {
                  recipientId: account.clientId || accountId, // Fallback to account ID if client ID not available
                  recipientType: 'client',
                  notificationType: 'email',
                  templateType: 'recurring_deposit_penalty_applied',
                  priority: 'high',
                  data: {
                    accountNo: account.accountNo,
                    clientName: account.clientName || 'Valued Customer',
                    overdueInstallments: penalties.length,
                    dueDate: penalties[0].dueDate,
                    penaltyAmount: totalPenaltyAmount,
                    currency: 'USD', // Should be fetched from account in a real implementation
                    penaltyDate: penalties[0].penaltyDate
                  }
                },
                request_query: "",
                session_variables: {
                  'x-hasura-role': 'admin'
                }
              });
              
              notificationResults.push({
                accountId,
                success: true,
                notificationId: notificationResponse.data.id,
                penalties: penalties.length,
                totalAmount: totalPenaltyAmount
              });
              
              notificationsSent++;
            } catch (error) {
              this.logger.error('Error sending penalty notification for account', {
                error, accountId
              });
              
              notificationResults.push({
                accountId,
                success: false,
                error: error.message
              });
            }
          }
          
          this.logger.info(`Sent ${notificationsSent} notifications for applied penalties`);
        }
        
        // Calculate execution time
        const executionTimeMs = Date.now() - startTime;
        
        // Compile results
        const results = {
          timestamp: new Date().toISOString(),
          executionTimeMs,
          penaltyResults,
          notificationResults: notifyOnPenalty ? {
            sent: notificationsSent,
            details: notificationResults
          } : null,
          status: 'completed',
          message: `Applied ${penaltyResults.totalPenaltiesApplied} penalties to ${penaltyResults.accountsWithPenalties} accounts for a total of ${penaltyResults.totalPenaltyAmount}${notifyOnPenalty ? `, sent ${notificationsSent} notifications` : ''}`
        };
        
        this.logger.info('Recurring deposit penalty job completed', { 
          executionTimeMs,
          totalAccounts: penaltyResults.totalAccountsProcessed,
          accountsWithPenalties: penaltyResults.accountsWithPenalties,
          totalPenalties: penaltyResults.totalPenaltiesApplied,
          totalAmount: penaltyResults.totalPenaltyAmount
        });
        
        return results;
      } else {
        // Dry run - just return placeholder result
        const executionTimeMs = Date.now() - startTime;
        
        return {
          timestamp: new Date().toISOString(),
          executionTimeMs,
          dryRun: true,
          status: 'completed',
          message: 'Dry run completed, no penalties were applied'
        };
      }
    } catch (error) {
      this.logger.error('Recurring deposit penalty job failed', { error });
      
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
   * Group penalties by account ID
   * @param penalties Array of penalties
   * @returns Object with account IDs as keys and arrays of penalties as values
   */
  private groupPenaltiesByAccount(penalties) {
    return penalties.reduce((grouped, penalty) => {
      if (!grouped[penalty.accountId]) {
        grouped[penalty.accountId] = [];
      }
      grouped[penalty.accountId].push(penalty);
      return grouped;
    }, {});
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
           job.name === 'Recurring Deposit Penalty Application';
  }
}