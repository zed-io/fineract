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
 * Interface for Recurring Deposit Statement Job Parameters
 */
export interface RecurringDepositStatementJobParameters extends JobParameters {
  frequency?: 'monthly' | 'quarterly' | 'yearly'; // Which frequency to process
  sendEmail?: boolean; // Whether to send email notifications for generated statements
  testMode?: boolean; // Whether to run in test mode (doesn't actually generate statements)
}

/**
 * Recurring Deposit Statement Job Worker
 * Generates statements for recurring deposit accounts
 */
export class RecurringDepositStatementJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositStatement');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Processing results
   */
  async process(job: Job, parameters?: RecurringDepositStatementJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit statement job', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositStatementJobParameters || {};
      
      // Default parameters
      const sendEmail = jobParams.sendEmail !== undefined ? jobParams.sendEmail : true;
      const testMode = jobParams.testMode || false;
      
      // Get today's date
      const today = new Date();
      const currentDay = today.getDate();
      const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Calculate which frequency to process based on current date
      let frequencyToProcess = jobParams.frequency;
      
      if (!frequencyToProcess) {
        // Determine frequency based on current date
        if (currentDay === 1) {
          // First day of the month - process monthly
          frequencyToProcess = 'monthly';
          
          // Also check if it's the first day of a quarter (Jan, Apr, Jul, Oct)
          if (currentMonth === 1 || currentMonth === 4 || currentMonth === 7 || currentMonth === 10) {
            frequencyToProcess = 'quarterly';
          }
          
          // Also check if it's the first day of the year (Jan)
          if (currentMonth === 1) {
            frequencyToProcess = 'yearly';
          }
        }
      }
      
      if (!frequencyToProcess) {
        this.logger.info('No frequency to process on this day');
        return {
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          status: 'completed',
          message: 'No statements to generate on this day'
        };
      }
      
      this.logger.info(`Processing ${frequencyToProcess} statements`, { currentDay, currentMonth });
      
      // Find scheduled statements to generate
      const scheduledStatementsResult = await db.query(
        `SELECT ss.id, ss.account_id, ss.format, ss.email_recipients, ss.day_of_month, ss.month_of_year,
                sa.account_no, sa.client_id, sa.currency_code, 
                c.first_name || ' ' || c.last_name as client_name,
                c.email as client_email
         FROM recurring_deposit_scheduled_statement ss
         JOIN recurring_deposit_account rda ON ss.account_id = rda.id
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN client c ON sa.client_id = c.id
         WHERE ss.frequency = $1
         AND ss.is_active = true
         AND sa.status = 'active'
         AND (ss.day_of_month = $2 OR ss.day_of_month IS NULL)
         AND (ss.frequency != 'yearly' OR ss.month_of_year = $3 OR ss.month_of_year IS NULL)`,
        [frequencyToProcess, currentDay, currentMonth]
      );
      
      const scheduledStatements = scheduledStatementsResult.rows;
      
      this.logger.info(`Found ${scheduledStatements.length} ${frequencyToProcess} statements to generate`);
      
      // Results containers
      const results = {
        generated: 0,
        failed: 0,
        skipped: 0,
        emailsSent: 0,
        details: []
      };
      
      // Set date range for statements
      const toDate = new Date(today);
      let fromDate = new Date(today);
      
      // Set from date based on frequency
      switch (frequencyToProcess) {
        case 'monthly':
          fromDate.setMonth(fromDate.getMonth() - 1);
          break;
        case 'quarterly':
          fromDate.setMonth(fromDate.getMonth() - 3);
          break;
        case 'yearly':
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
      }
      
      const fromDateStr = fromDate.toISOString().split('T')[0];
      const toDateStr = toDate.toISOString().split('T')[0];
      
      // Process each scheduled statement
      for (const statement of scheduledStatements) {
        try {
          if (!testMode) {
            // Generate statement
            const response = await axios.post(`${this.actionsUrl}/api/recurring-deposit/account/generate-statement`, {
              input: {
                accountId: statement.account_id,
                fromDate: fromDateStr,
                toDate: toDateStr,
                includeDetails: true,
                format: statement.format || 'pdf',
                download: true
              },
              request_query: "",
              session_variables: {
                'x-hasura-role': 'admin'
              }
            });
            
            if (response.data && response.data.success) {
              results.generated++;
              
              const generatedStatement = response.data.statement;
              
              // Log the generation
              await db.query(
                `INSERT INTO recurring_deposit_statement_log (
                  id, scheduled_statement_id, account_id, statement_id, status, processed_date
                ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                  uuidv4(),
                  statement.id,
                  statement.account_id,
                  generatedStatement.statementId,
                  'success'
                ]
              );
              
              // Send email if enabled
              if (sendEmail && statement.email_recipients) {
                try {
                  // Determine email recipients
                  const recipients = statement.email_recipients
                    ? statement.email_recipients.split(',').map(e => e.trim())
                    : [];
                  
                  // Add client email if not already included
                  if (statement.client_email && !recipients.includes(statement.client_email)) {
                    recipients.push(statement.client_email);
                  }
                  
                  if (recipients.length > 0) {
                    // Send notification via notification service
                    await axios.post(`${this.actionsUrl}/api/notifications/send`, {
                      input: {
                        recipientId: statement.client_id,
                        recipientType: 'client',
                        recipientEmail: recipients.join(','),
                        notificationType: 'email',
                        templateType: 'recurring_deposit_statement',
                        priority: 'medium',
                        data: {
                          accountNo: statement.account_no,
                          clientName: statement.client_name,
                          statementPeriod: `${fromDateStr} to ${toDateStr}`,
                          statementFrequency: frequencyToProcess,
                          statementId: generatedStatement.statementId,
                          statementUrl: `${this.actionsUrl}/api/recurring-deposit/account/download-statement/${generatedStatement.statementId}`
                        }
                      },
                      request_query: "",
                      session_variables: {
                        'x-hasura-role': 'admin'
                      }
                    });
                    
                    results.emailsSent++;
                  }
                } catch (error) {
                  this.logger.error('Error sending statement email notification', { 
                    error, 
                    accountId: statement.account_id 
                  });
                }
              }
              
              results.details.push({
                accountId: statement.account_id,
                accountNo: statement.account_no,
                clientName: statement.client_name,
                statementId: generatedStatement.statementId,
                success: true
              });
            } else {
              results.failed++;
              
              // Log the failure
              await db.query(
                `INSERT INTO recurring_deposit_statement_log (
                  id, scheduled_statement_id, account_id, status, error_message, processed_date
                ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                  uuidv4(),
                  statement.id,
                  statement.account_id,
                  'failed',
                  'Failed to generate statement'
                ]
              );
              
              results.details.push({
                accountId: statement.account_id,
                accountNo: statement.account_no,
                clientName: statement.client_name,
                success: false,
                error: 'Failed to generate statement'
              });
            }
          } else {
            // Test mode - just log what would happen
            this.logger.info(`Test mode: Would generate ${frequencyToProcess} statement for account ${statement.account_no}`);
            
            results.skipped++;
            results.details.push({
              accountId: statement.account_id,
              accountNo: statement.account_no,
              clientName: statement.client_name,
              testMode: true
            });
          }
        } catch (error) {
          this.logger.error('Error generating statement for account', { 
            error, 
            accountId: statement.account_id,
            accountNo: statement.account_no
          });
          
          results.failed++;
          
          // Log the error
          await db.query(
            `INSERT INTO recurring_deposit_statement_log (
              id, scheduled_statement_id, account_id, status, error_message, processed_date
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
              uuidv4(),
              statement.id,
              statement.account_id,
              'failed',
              error.message
            ]
          );
          
          results.details.push({
            accountId: statement.account_id,
            accountNo: statement.account_no,
            clientName: statement.client_name,
            success: false,
            error: error.message
          });
        }
      }
      
      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const finalResults = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        frequency: frequencyToProcess,
        fromDate: fromDateStr,
        toDate: toDateStr,
        results,
        testMode,
        status: 'completed',
        message: `Generated ${results.generated} statements, failed ${results.failed}, skipped ${results.skipped}, sent ${results.emailsSent} emails`
      };
      
      this.logger.info('Recurring deposit statement generation completed', { 
        executionTimeMs,
        frequency: frequencyToProcess,
        generated: results.generated,
        failed: results.failed,
        emailsSent: results.emailsSent
      });
      
      return finalResults;
    } catch (error) {
      this.logger.error('Recurring deposit statement job failed', { error });
      
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
           job.name === 'Recurring Deposit Statement Generation';
  }
}

// Helper function to generate UUIDs
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}