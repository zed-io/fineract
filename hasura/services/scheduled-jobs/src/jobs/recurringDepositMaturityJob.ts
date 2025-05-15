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
 * Interface for Recurring Deposit Maturity Job Parameters
 */
export interface RecurringDepositMaturityJobParameters extends JobParameters {
  daysInAdvance?: number; // How many days before maturity to send notifications
  autoRenew?: boolean; // Whether to automatically renew eligible accounts
  sendNotifications?: boolean; // Whether to send notifications for upcoming maturities
  notificationTypes?: string[]; // Types of notifications to send
  processMaturedAccounts?: boolean; // Whether to process accounts reaching maturity
  notifyRenewalAccounts?: boolean; // Whether to notify about auto-renewals
  testMode?: boolean; // Whether to run in test mode (doesn't actually process maturities or send notifications)
}

/**
 * Recurring Deposit Maturity Job Worker
 * Processes maturity for recurring deposit accounts
 */
export class RecurringDepositMaturityJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositMaturity');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Processing results
   */
  async process(job: Job, parameters?: RecurringDepositMaturityJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit maturity job', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositMaturityJobParameters || {};
      
      // Default parameters
      const daysInAdvance = jobParams.daysInAdvance || 7;
      const autoRenew = jobParams.autoRenew !== undefined ? jobParams.autoRenew : true;
      const sendNotifications = jobParams.sendNotifications !== undefined ? jobParams.sendNotifications : true;
      const notificationTypes = jobParams.notificationTypes || ['email', 'sms'];
      const processMaturedAccounts = jobParams.processMaturedAccounts !== undefined ? jobParams.processMaturedAccounts : true;
      const notifyRenewalAccounts = jobParams.notifyRenewalAccounts !== undefined ? jobParams.notifyRenewalAccounts : true;
      const testMode = jobParams.testMode || false;
      
      this.logger.info('Processing with parameters', { 
        daysInAdvance, 
        autoRenew, 
        sendNotifications, 
        processMaturedAccounts,
        testMode 
      });
      
      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calculate the upcoming maturity date for notifications
      const upcomingMaturityDate = new Date(today);
      upcomingMaturityDate.setDate(today.getDate() + daysInAdvance);
      const upcomingMaturityDateStr = upcomingMaturityDate.toISOString().split('T')[0];
      
      // Results containers
      const processedAccounts = [];
      const notificationsResult = {
        sent: 0,
        failed: 0,
        details: []
      };
      const maturityResults = {
        processed: 0,
        renewed: 0,
        closed: 0,
        failed: 0,
        details: []
      };
      
      // Process accounts maturing today
      if (processMaturedAccounts) {
        this.logger.info(`Processing accounts maturing on ${todayStr}`);
        
        // Find accounts that are maturing today
        const maturedAccountsResult = await db.query(
          `SELECT rda.id, rda.savings_account_id, rda.expected_maturity_date, rda.expected_maturity_amount,
                  rda.on_account_closure_type, rda.transfer_to_savings_account_id, rda.is_renewal_allowed,
                  sa.account_no, sa.client_id, sa.currency_code, sa.status,
                  c.first_name || ' ' || c.last_name as client_name, c.email, c.mobile_no
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           JOIN client c ON sa.client_id = c.id
           WHERE sa.status = 'active'
           AND rda.expected_maturity_date <= $1
           ORDER BY rda.expected_maturity_date`,
          [todayStr]
        );
        
        const maturedAccounts = maturedAccountsResult.rows;
        
        this.logger.info(`Found ${maturedAccounts.length} accounts maturing today or earlier`);
        
        // Process each matured account
        for (const account of maturedAccounts) {
          try {
            if (!testMode) {
              // Process maturity based on account's closure instructions
              if (account.is_renewal_allowed && autoRenew) {
                // Renew the account with updated maturity date
                const renewalResponse = await axios.post(`${this.actionsUrl}/api/recurring-deposit/account/renew`, {
                  input: {
                    accountId: account.id,
                    renewalDate: todayStr
                  },
                  request_query: "",
                  session_variables: {
                    'x-hasura-role': 'admin'
                  }
                });
                
                if (renewalResponse.data && renewalResponse.data.success) {
                  maturityResults.renewed++;
                  
                  maturityResults.details.push({
                    accountId: account.id,
                    accountNo: account.account_no,
                    clientId: account.client_id,
                    action: 'renewed',
                    renewalDate: todayStr,
                    newMaturityDate: renewalResponse.data.newMaturityDate
                  });
                  
                  // Send renewal notification if enabled
                  if (notifyRenewalAccounts && sendNotifications) {
                    try {
                      await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                        input: {
                          recipientId: account.client_id,
                          recipientType: 'client',
                          recipientEmail: account.email,
                          recipientPhone: account.mobile_no,
                          notificationType: notificationTypes.includes('email') ? 'email' : 'sms',
                          templateType: 'recurring_deposit_renewal',
                          priority: 'medium',
                          data: {
                            accountNo: account.account_no,
                            clientName: account.client_name,
                            renewalDate: todayStr,
                            newMaturityDate: renewalResponse.data.newMaturityDate,
                            currency: account.currency_code
                          }
                        },
                        request_query: "",
                        session_variables: {
                          'x-hasura-role': 'admin'
                        }
                      });
                      
                      notificationsResult.sent++;
                    } catch (error) {
                      this.logger.error('Error sending renewal notification', { 
                        error, 
                        accountId: account.id 
                      });
                      
                      notificationsResult.failed++;
                    }
                  }
                }
              } else {
                // Process account closure based on instructions
                const closureResponse = await axios.post(`${this.actionsUrl}/api/recurring-deposit/account/mature`, {
                  input: {
                    accountId: account.id,
                    maturedOn: todayStr,
                    closureType: account.on_account_closure_type,
                    transferToSavingsAccountId: account.transfer_to_savings_account_id
                  },
                  request_query: "",
                  session_variables: {
                    'x-hasura-role': 'admin'
                  }
                });
                
                if (closureResponse.data && closureResponse.data.success) {
                  maturityResults.closed++;
                  
                  maturityResults.details.push({
                    accountId: account.id,
                    accountNo: account.account_no,
                    clientId: account.client_id,
                    action: 'closed',
                    maturityDate: todayStr,
                    maturityAmount: closureResponse.data.maturityAmount,
                    closureType: account.on_account_closure_type
                  });
                  
                  // Send maturity notification
                  if (sendNotifications) {
                    try {
                      await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                        input: {
                          recipientId: account.client_id,
                          recipientType: 'client',
                          recipientEmail: account.email,
                          recipientPhone: account.mobile_no,
                          notificationType: notificationTypes.includes('email') ? 'email' : 'sms',
                          templateType: 'recurring_deposit_maturity',
                          priority: 'medium',
                          data: {
                            accountNo: account.account_no,
                            clientName: account.client_name,
                            maturityDate: todayStr,
                            maturityAmount: closureResponse.data.maturityAmount,
                            currency: account.currency_code,
                            closureType: account.on_account_closure_type
                          }
                        },
                        request_query: "",
                        session_variables: {
                          'x-hasura-role': 'admin'
                        }
                      });
                      
                      notificationsResult.sent++;
                    } catch (error) {
                      this.logger.error('Error sending maturity notification', { 
                        error, 
                        accountId: account.id 
                      });
                      
                      notificationsResult.failed++;
                    }
                  }
                }
              }
            } else {
              // Test mode - just log what would happen
              this.logger.info(`Test mode: Would process maturity for account ${account.account_no}`);
              
              if (account.is_renewal_allowed && autoRenew) {
                maturityResults.details.push({
                  accountId: account.id,
                  accountNo: account.account_no,
                  clientId: account.client_id,
                  action: 'would_renew',
                  testMode: true
                });
              } else {
                maturityResults.details.push({
                  accountId: account.id,
                  accountNo: account.account_no,
                  clientId: account.client_id,
                  action: 'would_close',
                  closureType: account.on_account_closure_type,
                  testMode: true
                });
              }
            }
            
            maturityResults.processed++;
          } catch (error) {
            this.logger.error('Error processing maturity for account', { 
              error, 
              accountId: account.id,
              accountNo: account.account_no
            });
            
            maturityResults.failed++;
            maturityResults.details.push({
              accountId: account.id,
              accountNo: account.account_no,
              clientId: account.client_id,
              action: 'failed',
              error: error.message
            });
          }
        }
      }
      
      // Process upcoming maturity notifications
      if (sendNotifications) {
        this.logger.info(`Sending notifications for accounts maturing on ${upcomingMaturityDateStr}`);
        
        // Find accounts that will mature in the specified number of days
        const upcomingMaturityResult = await db.query(
          `SELECT rda.id, rda.savings_account_id, rda.expected_maturity_date, rda.expected_maturity_amount,
                  rda.on_account_closure_type, rda.is_renewal_allowed,
                  sa.account_no, sa.client_id, sa.currency_code,
                  c.first_name || ' ' || c.last_name as client_name, c.email, c.mobile_no
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           JOIN client c ON sa.client_id = c.id
           WHERE sa.status = 'active'
           AND rda.expected_maturity_date = $1
           ORDER BY sa.account_no`,
          [upcomingMaturityDateStr]
        );
        
        const upcomingMaturityAccounts = upcomingMaturityResult.rows;
        
        this.logger.info(`Found ${upcomingMaturityAccounts.length} accounts maturing in ${daysInAdvance} days`);
        
        // Send notifications for upcoming maturities
        for (const account of upcomingMaturityAccounts) {
          try {
            if (!testMode) {
              const notificationResponse = await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                input: {
                  recipientId: account.client_id,
                  recipientType: 'client',
                  recipientEmail: account.email,
                  recipientPhone: account.mobile_no,
                  notificationType: notificationTypes.includes('email') ? 'email' : 'sms',
                  templateType: 'recurring_deposit_upcoming_maturity',
                  priority: 'medium',
                  data: {
                    accountNo: account.account_no,
                    clientName: account.client_name,
                    maturityDate: account.expected_maturity_date,
                    maturityAmount: account.expected_maturity_amount,
                    daysToMaturity: daysInAdvance,
                    currency: account.currency_code,
                    willAutoRenew: account.is_renewal_allowed && autoRenew
                  }
                },
                request_query: "",
                session_variables: {
                  'x-hasura-role': 'admin'
                }
              });
              
              notificationsResult.sent++;
              
              notificationsResult.details.push({
                accountId: account.id,
                accountNo: account.account_no,
                clientId: account.client_id,
                templateType: 'recurring_deposit_upcoming_maturity',
                result: 'sent'
              });
            } else {
              // Test mode - just log what would happen
              this.logger.info(`Test mode: Would send upcoming maturity notification for account ${account.account_no}`);
              
              notificationsResult.details.push({
                accountId: account.id,
                accountNo: account.account_no,
                clientId: account.client_id,
                templateType: 'recurring_deposit_upcoming_maturity',
                result: 'would_send',
                testMode: true
              });
            }
          } catch (error) {
            this.logger.error('Error sending upcoming maturity notification', { 
              error, 
              accountId: account.id 
            });
            
            notificationsResult.failed++;
            notificationsResult.details.push({
              accountId: account.id,
              accountNo: account.account_no,
              clientId: account.client_id,
              templateType: 'recurring_deposit_upcoming_maturity',
              result: 'failed',
              error: error.message
            });
          }
        }
      }
      
      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const results = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        testMode,
        maturityResults,
        notificationsResult,
        status: 'completed',
        message: `Processed ${maturityResults.processed} matured accounts (${maturityResults.renewed} renewed, ${maturityResults.closed} closed) and sent ${notificationsResult.sent} notifications`
      };
      
      this.logger.info('Recurring deposit maturity job completed', { 
        executionTimeMs,
        maturedProcessed: maturityResults.processed,
        maturedRenewed: maturityResults.renewed,
        maturedClosed: maturityResults.closed,
        notificationsSent: notificationsResult.sent
      });
      
      return results;
    } catch (error) {
      this.logger.error('Recurring deposit maturity job failed', { error });
      
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
           job.name === 'Recurring Deposit Maturity';
  }
}