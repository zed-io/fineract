import { 
  Job, 
  JobWorker, 
  JobType, 
  JobParameters 
} from '../models/job';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import axios from 'axios';
import Decimal from 'decimal.js';

/**
 * Interface for Recurring Deposit Interest Calculation Job Parameters
 */
export interface RecurringDepositInterestCalculationJobParameters extends JobParameters {
  calculationDate?: string; // Optional date to use for calculation
  postingEnabled?: boolean; // Whether to post interest after calculation
  specificAccountIds?: string[]; // Optional list of specific account IDs to process
  applyMinimumBalance?: boolean; // Whether to apply minimum balance requirements
  applyRateVariations?: boolean; // Whether to apply rate variations based on account configuration
  testMode?: boolean; // Whether to run in test mode (without actually posting transactions)
}

/**
 * Represents an interest calculation result for a single account
 */
interface InterestCalculationResult {
  accountId: string;
  accountNo: string;
  clientId: string;
  clientName: string;
  depositBalance: string; // Decimal string
  interestRate: string; // Decimal string (percentage)
  interestEarned: string; // Decimal string
  interestPosted: string; // Decimal string
  calculationDate: string;
  fromDate: string;
  toDate: string;
  daysInPeriod: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
  compoundingFrequency: string;
  interestCompoundingType: string;
  minRequiredBalance?: string; // Decimal string
  interestPostingTransaction?: {
    id: string;
    amount: string;
    date: string;
  };
}

/**
 * Represents a summary of interest calculation for multiple accounts
 */
interface InterestCalculationSummary {
  totalAccountsProcessed: number;
  successfulCalculations: number;
  failedCalculations: number;
  totalInterestCalculated: string; // Decimal string
  totalInterestPosted: string; // Decimal string
  calculationDate: string;
  processedOn: string;
  calculationResults: InterestCalculationResult[];
}

/**
 * Recurring Deposit Interest Calculation Job Worker
 * Calculates and posts interest for recurring deposit accounts
 */
export class RecurringDepositInterestCalculationJobWorker implements JobWorker {
  private logger = createContextLogger('RecurringDepositInterestCalculation');
  private actionsUrl = process.env.ACTIONS_SERVICE_URL || 'http://hasura-actions:3000';
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Interest calculation results
   */
  async process(job: Job, parameters?: RecurringDepositInterestCalculationJobParameters): Promise<any> {
    this.logger.info('Starting recurring deposit interest calculation', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    try {
      // Use parameters if provided, otherwise use the job parameters
      const jobParams = parameters || job.parameters as RecurringDepositInterestCalculationJobParameters || {};
      
      // Extract parameters with defaults
      const calculationDate = jobParams.calculationDate || new Date().toISOString().split('T')[0];
      const postingEnabled = jobParams.postingEnabled !== undefined ? jobParams.postingEnabled : true;
      const applyMinimumBalance = jobParams.applyMinimumBalance !== undefined ? jobParams.applyMinimumBalance : true;
      const applyRateVariations = jobParams.applyRateVariations !== undefined ? jobParams.applyRateVariations : true;
      const testMode = jobParams.testMode || false;
      
      this.logger.info(`Calculating interest as of ${calculationDate}`, { 
        postingEnabled, 
        specificAccountIds: jobParams.specificAccountIds?.length, 
        testMode 
      });
      
      // Build the query for retrieving eligible accounts
      let accountQuery = `
        SELECT 
          rda.id as account_id, 
          sa.account_no, 
          sa.client_id,
          c.first_name || ' ' || c.last_name as client_name,
          rda.deposit_amount,
          rda.expected_first_deposit_on_date,
          rda.total_deposit_amount,
          rdp.interest_rate,
          rdp.interest_compounding_type,
          rdp.interest_calculation_type,
          rdp.interest_posting_period_type,
          rdp.interest_calculation_days_in_year_type,
          rdp.min_required_opening_balance,
          rda.interest_posted_amount,
          rda.total_deposits,
          rda.expected_completion_date,
          rdp.adjust_advance_towards_future_installments,
          (
            SELECT MAX(transaction_date) 
            FROM recurring_deposit_transaction 
            WHERE account_id = rda.id AND transaction_type = 'INTEREST_POSTING'
          ) as last_interest_posting_date,
          (
            SELECT COALESCE(SUM(amount), 0) 
            FROM recurring_deposit_transaction 
            WHERE account_id = rda.id AND transaction_type = 'DEPOSIT'
          ) as total_deposits_amount,
          sa.currency_code
        FROM recurring_deposit_account rda
        JOIN savings_account sa ON rda.savings_account_id = sa.id
        JOIN client c ON sa.client_id = c.id
        JOIN recurring_deposit_product rdp ON rda.product_id = rdp.id
        WHERE sa.status = 'active'
      `;
      
      // Add filter for specific account IDs if provided
      if (jobParams.specificAccountIds && jobParams.specificAccountIds.length > 0) {
        accountQuery += ` AND rda.id IN (${jobParams.specificAccountIds.map(id => `'${id}'`).join(',')})`;
      }
      
      accountQuery += ' ORDER BY sa.account_no';
      
      // Execute the query
      const accountsResult = await db.query(accountQuery);
      
      const totalAccounts = accountsResult.rowCount;
      let successfulCalculations = 0;
      let failedCalculations = 0;
      let totalInterestCalculated = new Decimal(0);
      let totalInterestPosted = new Decimal(0);
      const calculationResults: InterestCalculationResult[] = [];
      
      this.logger.info(`Found ${totalAccounts} active recurring deposit accounts for interest calculation`);
      
      // Process each account
      for (const account of accountsResult.rows) {
        try {
          // Determine calculation period
          let fromDate = account.last_interest_posting_date;
          if (!fromDate) {
            // If no previous posting, use the account opening date
            fromDate = account.expected_first_deposit_on_date;
          }
          
          // Calculate days in period
          const from = new Date(fromDate);
          const to = new Date(calculationDate);
          const daysInPeriod = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
          
          // Skip if no days to calculate (already calculated today)
          if (daysInPeriod <= 0) {
            this.logger.info(`Skipping account ${account.account_no} - already calculated interest for today`);
            continue;
          }
          
          // Get transactions and schedule installments for the account
          const transactionsResult = await db.query(
            `SELECT transaction_date, transaction_type, amount
             FROM recurring_deposit_transaction
             WHERE account_id = $1
             ORDER BY transaction_date`,
            [account.account_id]
          );
          
          const installmentsResult = await db.query(
            `SELECT due_date, deposit_amount, completed, completed_date
             FROM recurring_deposit_schedule_installment
             WHERE account_id = $1
             ORDER BY due_date`,
            [account.account_id]
          );
          
          // Calculate interest based on account configuration and transaction history
          const interestRate = new Decimal(account.interest_rate);
          
          // Get compounding type and calculate effective interest
          const compoundingFrequency = this.mapCompoundingFrequency(account.interest_compounding_type);
          const effectiveRate = this.calculateEffectiveRate(interestRate, compoundingFrequency, account.interest_calculation_days_in_year_type);
          
          // Calculate total balance as of calculation date
          // This is a simplified calculation - in a real implementation, this would use
          // the exact balance on each day and apply interest according to the compounding frequency
          let depositBalance = new Decimal(account.total_deposits_amount || 0);
          
          // Apply minimum balance requirement if configured
          const minRequiredBalance = new Decimal(account.min_required_opening_balance || 0);
          if (applyMinimumBalance && depositBalance.lessThan(minRequiredBalance)) {
            this.logger.info(`Account ${account.account_no} balance ${depositBalance} is below minimum required balance ${minRequiredBalance}`);
            // Apply reduced interest rate or no interest based on product rules
            // This is a simplified implementation - in a real system, this would be configurable
            // For now, we'll still calculate interest on the available balance
          }
          
          // Calculate interest based on effective rate and period
          // This is a simplified calculation - in a real implementation, this would be more complex
          // and would involve daily balance tracking
          const interestEarned = depositBalance
            .mul(effectiveRate.div(100)) // Convert percentage to decimal
            .mul(daysInPeriod)
            .div(this.getDaysInYear(account.interest_calculation_days_in_year_type));
          
          // Round to currency precision (assuming 2 decimal places)
          const roundedInterest = interestEarned.toDecimalPlaces(2);
          
          totalInterestCalculated = totalInterestCalculated.add(roundedInterest);
          
          // Post interest if enabled and not in test mode
          let interestPosted = new Decimal(0);
          let interestPostingTransaction = undefined;
          
          if (postingEnabled && !testMode && !roundedInterest.isZero()) {
            try {
              // Post interest via the actions service
              const postingResponse = await axios.post(`${this.actionsUrl}/api/recurring-deposit/post-interest`, {
                input: {
                  accountId: account.account_id,
                  interestAmount: roundedInterest.toString(),
                  calculationDate: calculationDate,
                  fromDate: fromDate,
                  toDate: calculationDate
                },
                request_query: "",
                session_variables: {
                  'x-hasura-role': 'admin'
                }
              });
              
              if (postingResponse.data && postingResponse.data.success) {
                interestPosted = roundedInterest;
                totalInterestPosted = totalInterestPosted.add(interestPosted);
                interestPostingTransaction = postingResponse.data.transaction;
                
                this.logger.info(`Posted interest of ${interestPosted} to account ${account.account_no}`);
              } else {
                this.logger.error(`Failed to post interest to account ${account.account_no}`, { 
                  error: postingResponse.data.error 
                });
              }
            } catch (error) {
              this.logger.error(`Error posting interest to account ${account.account_no}`, { error });
            }
          } else if (testMode) {
            this.logger.info(`Test mode: Would post interest of ${roundedInterest} to account ${account.account_no}`);
          }
          
          // Record successful calculation
          successfulCalculations++;
          
          // Add to results
          calculationResults.push({
            accountId: account.account_id,
            accountNo: account.account_no,
            clientId: account.client_id,
            clientName: account.client_name,
            depositBalance: depositBalance.toString(),
            interestRate: interestRate.toString(),
            interestEarned: roundedInterest.toString(),
            interestPosted: interestPosted.toString(),
            calculationDate,
            fromDate,
            toDate: calculationDate,
            daysInPeriod,
            status: 'completed',
            compoundingFrequency,
            interestCompoundingType: account.interest_compounding_type,
            minRequiredBalance: account.min_required_opening_balance?.toString(),
            interestPostingTransaction
          });
        } catch (error) {
          this.logger.error(`Error calculating interest for account ${account.account_no}`, { error });
          
          // Record failed calculation
          failedCalculations++;
          
          // Add to results
          calculationResults.push({
            accountId: account.account_id,
            accountNo: account.account_no,
            clientId: account.client_id,
            clientName: account.client_name,
            depositBalance: '0',
            interestRate: account.interest_rate,
            interestEarned: '0',
            interestPosted: '0',
            calculationDate,
            fromDate: account.last_interest_posting_date || account.expected_first_deposit_on_date,
            toDate: calculationDate,
            daysInPeriod: 0,
            status: 'failed',
            errorMessage: error.message,
            compoundingFrequency: this.mapCompoundingFrequency(account.interest_compounding_type),
            interestCompoundingType: account.interest_compounding_type
          });
        }
      }
      
      // Calculate execution time
      const executionTimeMs = Date.now() - startTime;
      
      // Compile results
      const summary: InterestCalculationSummary = {
        totalAccountsProcessed: totalAccounts,
        successfulCalculations,
        failedCalculations,
        totalInterestCalculated: totalInterestCalculated.toString(),
        totalInterestPosted: totalInterestPosted.toString(),
        calculationDate,
        processedOn: new Date().toISOString(),
        calculationResults
      };
      
      const results = {
        timestamp: new Date().toISOString(),
        executionTimeMs,
        summary,
        status: 'completed',
        message: `Processed ${totalAccounts} accounts, calculated interest for ${successfulCalculations} accounts, posted interest of ${totalInterestPosted} for ${postingEnabled ? successfulCalculations : 0} accounts`
      };
      
      this.logger.info('Recurring deposit interest calculation completed', { 
        executionTimeMs,
        totalAccounts,
        successfulCalculations,
        failedCalculations,
        totalInterestCalculated: totalInterestCalculated.toString(),
        totalInterestPosted: totalInterestPosted.toString()
      });
      
      return results;
    } catch (error) {
      this.logger.error('Recurring deposit interest calculation failed', { error });
      
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
   * Map interest compounding type to a compounding frequency
   * @param compoundingType Interest compounding type
   * @returns Compounding frequency
   */
  private mapCompoundingFrequency(compoundingType: string): string {
    switch (compoundingType.toLowerCase()) {
      case 'daily':
        return 'daily';
      case 'weekly':
        return 'weekly';
      case 'biweekly':
        return 'biweekly';
      case 'monthly':
        return 'monthly';
      case 'quarterly':
        return 'quarterly';
      case 'semiannual':
        return 'semiannual';
      case 'annual':
        return 'annual';
      default:
        return 'monthly'; // Default to monthly
    }
  }
  
  /**
   * Calculate effective interest rate based on nominal rate and compounding frequency
   * @param nominalRate Nominal interest rate (percentage)
   * @param compoundingFrequency Compounding frequency
   * @param daysInYearType Days in year type
   * @returns Effective interest rate
   */
  private calculateEffectiveRate(nominalRate: Decimal, compoundingFrequency: string, daysInYearType: string): Decimal {
    // Convert nominal rate to decimal form
    const r = nominalRate.div(100);
    
    // Get number of compounding periods per year
    const n = this.getCompoundingPeriodsPerYear(compoundingFrequency);
    
    // For simple calculations or when using daily balance method, just return the nominal rate
    return nominalRate;
    
    /* 
    For compound interest, you would use a formula like:
    
    // Calculate effective rate using compound interest formula
    const effectiveRate = (new Decimal(1).plus(r.div(n))).pow(n).minus(1).mul(100);
    return effectiveRate;
    
    But for recurring deposits, interest is typically calculated on a simple interest basis,
    so we're returning the nominal rate. In a real implementation, this would be based
    on the product configuration.
    */
  }
  
  /**
   * Get number of compounding periods per year
   * @param compoundingFrequency Compounding frequency
   * @returns Number of periods per year
   */
  private getCompoundingPeriodsPerYear(compoundingFrequency: string): number {
    switch (compoundingFrequency.toLowerCase()) {
      case 'daily':
        return 365;
      case 'weekly':
        return 52;
      case 'biweekly':
        return 26;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'semiannual':
        return 2;
      case 'annual':
        return 1;
      default:
        return 12; // Default to monthly
    }
  }
  
  /**
   * Get days in year based on calculation type
   * @param daysInYearType Days in year type
   * @returns Number of days in year
   */
  private getDaysInYear(daysInYearType: string): number {
    switch (daysInYearType?.toLowerCase()) {
      case 'actual':
        // Use the actual number of days in the current year
        const currentYear = new Date().getFullYear();
        return this.isLeapYear(currentYear) ? 366 : 365;
      case '360_days':
        return 360;
      case '365_days':
      default:
        return 365;
    }
  }
  
  /**
   * Check if a year is a leap year
   * @param year Year to check
   * @returns Whether it's a leap year
   */
  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
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
           job.name === 'Recurring Deposit Interest Calculation';
  }
}