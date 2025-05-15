/**
 * Recurring Deposit Interest Service
 * Provides functionality for calculating and posting interest to recurring deposit accounts
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import Decimal from 'decimal.js';

/**
 * Interface for interest posting transaction
 */
export interface InterestPostingTransaction {
  id: string;
  accountId: string;
  amount: string;
  date: string;
  fromDate: string;
  toDate: string;
}

/**
 * Interface for interest calculation result
 */
export interface InterestCalculationResult {
  accountId: string;
  accountNo: string;
  depositBalance: string;
  interestRate: string;
  interestEarned: string;
  calculationDate: string;
  fromDate: string;
  toDate: string;
  daysInPeriod: number;
  compoundingFrequency: string;
}

export class RecurringDepositInterestService {
  
  /**
   * Calculate interest for a recurring deposit account without posting
   * @param accountId Account ID
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  async calculateInterest(accountId: string, calculationDate: string, fromDate?: string, toDate?: string): Promise<InterestCalculationResult> {
    logger.info('Calculating interest for recurring deposit account', { accountId, calculationDate });
    
    try {
      // Get account details
      const accountResult = await query(
        `SELECT rda.*, sa.account_no, sa.currency_code, sa.status,
                sa.interest_compounding_period_type, sa.interest_posting_period_type,
                sa.interest_calculation_type, sa.interest_calculation_days_in_year_type
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         WHERE rda.id = $1`,
        [accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Recurring deposit account with ID ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Validate account status
      if (account.status !== 'active') {
        throw new Error(`Cannot calculate interest for account with status ${account.status}`);
      }
      
      // Get last interest posting date if fromDate not provided
      if (!fromDate) {
        const lastPostingResult = await query(
          `SELECT MAX(transaction_date) as last_posting_date
           FROM recurring_deposit_transaction
           WHERE recurring_deposit_account_id = $1 AND transaction_type = 'INTEREST_POSTING'`,
          [accountId]
        );
        
        fromDate = lastPostingResult.rows[0].last_posting_date 
          ? lastPostingResult.rows[0].last_posting_date.toISOString().split('T')[0] 
          : account.activated_on_date?.toISOString().split('T')[0] || account.approved_on_date?.toISOString().split('T')[0];
      }
      
      // Use provided calculation date or current date
      const calcDate = toDate || calculationDate;
      
      // Calculate days in period
      const from = new Date(fromDate);
      const to = new Date(calcDate);
      const daysInPeriod = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      
      // Get account balance as of from date
      const balanceResult = await query(
        `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount
                              WHEN transaction_type = 'withdrawal' THEN -amount
                              WHEN transaction_type = 'interest_posting' THEN amount
                              ELSE 0 END), 0) as balance
         FROM savings_account_transaction
         WHERE savings_account_id = $1
           AND transaction_date <= $2
           AND is_reversed = false`,
        [account.savings_account_id, from]
      );
      
      // Get transaction history within the period for daily balance calculation
      const transactionsResult = await query(
        `SELECT transaction_date, transaction_type, amount
         FROM savings_account_transaction
         WHERE savings_account_id = $1
           AND transaction_date > $2
           AND transaction_date <= $3
           AND is_reversed = false
         ORDER BY transaction_date ASC`,
        [account.savings_account_id, from, to]
      );
      
      // Calculate interest based on account configuration and transaction history
      const interestRate = new Decimal(account.interest_rate);
      
      // Get compounding type and calculate daily interest rate
      const compoundingFrequency = this.mapCompoundingFrequency(account.interest_compounding_period_type);
      const daysInYear = this.getDaysInYear(account.interest_calculation_days_in_year_type);
      const dailyInterestRate = interestRate.div(100).div(daysInYear);
      
      // Calculate interest based on the chosen calculation type
      let interestEarned = new Decimal(0);
      
      // Use balance as base for calculation
      const initialBalance = new Decimal(balanceResult.rows[0].balance);
      
      if (account.interest_calculation_type === 'daily_balance') {
        // Calculate interest on daily balance
        let runningBalance = initialBalance;
        let prevDate = from;
        
        // Add interest for each day, considering transactions
        for (const tx of transactionsResult.rows) {
          const txDate = new Date(tx.transaction_date);
          
          // Calculate days between previous date and this transaction
          const daysBetween = Math.floor((txDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysBetween > 0) {
            // Calculate interest for this period
            const periodInterest = runningBalance.mul(dailyInterestRate).mul(daysBetween);
            interestEarned = interestEarned.add(periodInterest);
          }
          
          // Update balance and date for next iteration
          if (tx.transaction_type === 'deposit' || tx.transaction_type === 'interest_posting') {
            runningBalance = runningBalance.add(new Decimal(tx.amount));
          } else if (tx.transaction_type === 'withdrawal') {
            runningBalance = runningBalance.sub(new Decimal(tx.amount));
          }
          
          prevDate = txDate;
        }
        
        // Calculate interest for remaining days
        const remainingDays = Math.floor((to.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (remainingDays > 0) {
          const remainingInterest = runningBalance.mul(dailyInterestRate).mul(remainingDays);
          interestEarned = interestEarned.add(remainingInterest);
        }
      } else if (account.interest_calculation_type === 'average_daily_balance') {
        // Calculate average daily balance
        let totalDailyBalances = initialBalance.mul(daysInPeriod);
        let prevDate = from;
        let runningBalance = initialBalance;
        
        // Calculate daily balances considering transactions
        for (const tx of transactionsResult.rows) {
          const txDate = new Date(tx.transaction_date);
          
          // Calculate days between previous date and this transaction
          const daysBetween = Math.floor((txDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysBetween > 0) {
            // Add to total daily balances
            totalDailyBalances = totalDailyBalances.add(runningBalance.mul(daysBetween));
          }
          
          // Update balance and date for next iteration
          if (tx.transaction_type === 'deposit' || tx.transaction_type === 'interest_posting') {
            runningBalance = runningBalance.add(new Decimal(tx.amount));
          } else if (tx.transaction_type === 'withdrawal') {
            runningBalance = runningBalance.sub(new Decimal(tx.amount));
          }
          
          prevDate = txDate;
        }
        
        // Calculate for remaining days
        const remainingDays = Math.floor((to.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (remainingDays > 0) {
          totalDailyBalances = totalDailyBalances.add(runningBalance.mul(remainingDays));
        }
        
        // Calculate average daily balance
        const averageDailyBalance = totalDailyBalances.div(daysInPeriod);
        
        // Calculate interest on average daily balance
        interestEarned = averageDailyBalance.mul(dailyInterestRate).mul(daysInPeriod);
      } else {
        // Minimum balance or other methods (simplified)
        interestEarned = initialBalance.mul(dailyInterestRate).mul(daysInPeriod);
      }
      
      // Round to currency precision (assuming 2 decimal places)
      const roundedInterest = interestEarned.toDecimalPlaces(2);
      
      return {
        accountId,
        accountNo: account.account_no,
        depositBalance: initialBalance.toString(),
        interestRate: interestRate.toString(),
        interestEarned: roundedInterest.toString(),
        calculationDate: calcDate,
        fromDate,
        toDate: calcDate,
        daysInPeriod,
        compoundingFrequency
      };
    } catch (error) {
      logger.error('Error calculating interest for recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Post interest to a recurring deposit account
   * @param accountId Account ID
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  async postInterest(
    accountId: string, 
    interestAmount: string | number, 
    postingDate: string, 
    fromDate: string, 
    toDate: string, 
    userId?: string
  ): Promise<InterestPostingTransaction> {
    logger.info('Posting interest to recurring deposit account', { 
      accountId, 
      interestAmount, 
      postingDate 
    });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.id as savings_account_id, sa.status, sa.currency_code
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );
        
        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }
        
        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'active') {
          throw new Error(`Cannot post interest to account with status ${account.status}`);
        }
        
        // Get current balance
        const balanceResult = await client.query(
          `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount
                              WHEN transaction_type = 'withdrawal' THEN -amount
                              WHEN transaction_type = 'interest_posting' THEN amount
                              ELSE 0 END), 0) as current_balance
           FROM savings_account_transaction
           WHERE savings_account_id = $1 AND is_reversed = false`,
          [account.savings_account_id]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0].current_balance) || 0;
        const interestDecimal = typeof interestAmount === 'string' 
          ? parseFloat(interestAmount) 
          : interestAmount;
        
        const newBalance = currentBalance + interestDecimal;
        
        // Create savings account transaction for interest posting
        const transactionDate = new Date(postingDate);
        const savingsTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_account_transaction (
            id, savings_account_id, transaction_type, transaction_date,
            amount, currency_code, running_balance, submitted_on_date,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            savingsTransactionId,
            account.savings_account_id,
            'interest_posting',
            transactionDate,
            interestDecimal,
            account.currency_code,
            newBalance,
            transactionDate,
            userId || null
          ]
        );
        
        // Create recurring deposit transaction
        const recurringDepositTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_transaction (
            id, savings_account_transaction_id, recurring_deposit_account_id,
            transaction_type, amount, balance_after_transaction,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            recurringDepositTransactionId,
            savingsTransactionId,
            accountId,
            'INTEREST_POSTING',
            interestDecimal,
            newBalance,
            userId || null
          ]
        );
        
        // Update account interest earned
        const interestEarned = parseFloat(account.interest_earned) || 0;
        const newInterestEarned = interestEarned + interestDecimal;
        
        await client.query(
          `UPDATE recurring_deposit_account
           SET interest_earned = $1,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [
            newInterestEarned,
            userId || null,
            accountId
          ]
        );
        
        // Record interest posting in history table
        const interestHistoryId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_interest_posting_history (
            id, account_id, transaction_id, posting_date, from_date, to_date,
            interest_amount, balance_after_posting, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            interestHistoryId,
            accountId,
            recurringDepositTransactionId,
            transactionDate,
            new Date(fromDate),
            new Date(toDate),
            interestDecimal,
            newBalance,
            userId || null
          ]
        );
        
        // If account is configured to transfer interest to linked account
        if (account.transfer_interest_to_linked_account && account.linked_account_id) {
          // Get linked account details
          const linkedAccountResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1 AND status = $2',
            [account.linked_account_id, 'active']
          );
          
          if (linkedAccountResult.rowCount > 0) {
            const linkedAccount = linkedAccountResult.rows[0];
            
            // Transfer interest to linked account
            const transferTransactionId = uuidv4();
            
            await client.query(
              `INSERT INTO savings_account_transaction (
                id, savings_account_id, transaction_type, transaction_date,
                amount, currency_code, description, is_reversed,
                created_by, created_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
              [
                transferTransactionId,
                account.linked_account_id,
                'deposit',
                transactionDate,
                interestDecimal,
                account.currency_code,
                'Interest transfer from recurring deposit',
                false,
                userId || null
              ]
            );
            
            logger.info('Transferred interest to linked account', {
              recurringDepositId: accountId,
              linkedAccountId: account.linked_account_id,
              amount: interestDecimal
            });
          } else {
            logger.warn('Could not transfer interest to linked account', {
              recurringDepositId: accountId,
              linkedAccountId: account.linked_account_id,
              reason: 'Linked account not active or not found'
            });
          }
        }
        
        return {
          id: recurringDepositTransactionId,
          accountId,
          amount: interestDecimal.toString(),
          date: postingDate,
          fromDate,
          toDate
        };
      });
    } catch (error) {
      logger.error('Error posting interest to recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Get interest posting history for account
   * @param accountId Account ID
   * @param limit Maximum number of records to return
   * @returns Interest posting history
   */
  async getInterestPostingHistory(accountId: string, limit: number = 10): Promise<any[]> {
    logger.info('Getting interest posting history', { accountId, limit });
    
    try {
      const historyResult = await query(
        `SELECT rdh.*, rdt.savings_account_transaction_id
         FROM recurring_deposit_interest_posting_history rdh
         JOIN recurring_deposit_transaction rdt ON rdh.transaction_id = rdt.id
         WHERE rdh.account_id = $1
         ORDER BY rdh.posting_date DESC
         LIMIT $2`,
        [accountId, limit]
      );
      
      return historyResult.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        transactionId: row.transaction_id,
        savingsTransactionId: row.savings_account_transaction_id,
        postingDate: row.posting_date.toISOString().split('T')[0],
        fromDate: row.from_date.toISOString().split('T')[0],
        toDate: row.to_date.toISOString().split('T')[0],
        interestAmount: row.interest_amount,
        balanceAfterPosting: row.balance_after_posting,
        createdDate: row.created_date.toISOString()
      }));
    } catch (error) {
      logger.error('Error getting interest posting history', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Map interest compounding type to a compounding frequency
   * @param compoundingType Interest compounding type
   * @returns Compounding frequency string
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
   * Get compounding periods per year
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
    switch (daysInYearType.toLowerCase()) {
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
}

// Export a singleton instance
export const recurringDepositInterestService = new RecurringDepositInterestService();