/**
 * Interest Calculation Service
 * Provides functionality for calculating and posting interest for various account types
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
  accountType: string;
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
  accountType: string;
  balance: string;
  interestRate: string;
  interestEarned: string;
  calculationDate: string;
  fromDate: string;
  toDate: string;
  daysInPeriod: number;
  compoundingFrequency: string;
  calculationType: string;
}

/**
 * Interface for daily accrual record
 */
export interface DailyAccrualRecord {
  id: string;
  accountId: string;
  accrualDate: string;
  amount: string;
  balance: string;
  interestRate: string;
  isPosted: boolean;
  postedDate?: string;
  postedTransactionId?: string;
}

/**
 * Account types supported by interest calculation
 */
export enum AccountType {
  SAVINGS = 'savings',
  LOAN = 'loan', 
  RECURRING_DEPOSIT = 'recurring_deposit',
  FIXED_DEPOSIT = 'fixed_deposit'
}

export class InterestCalculationService {
  
  /**
   * Calculate interest for an account without posting
   * @param accountId Account ID
   * @param accountType Type of account (savings, loan, recurring_deposit, fixed_deposit)
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  async calculateInterest(
    accountId: string, 
    accountType: AccountType,
    calculationDate: string, 
    fromDate?: string, 
    toDate?: string
  ): Promise<InterestCalculationResult> {
    logger.info('Calculating interest', { accountId, accountType, calculationDate });
    
    try {
      // Different account types require different calculation logic
      switch (accountType) {
        case AccountType.SAVINGS:
          return this.calculateSavingsInterest(accountId, calculationDate, fromDate, toDate);
        case AccountType.LOAN:
          return this.calculateLoanInterest(accountId, calculationDate, fromDate, toDate);
        case AccountType.RECURRING_DEPOSIT:
          return this.calculateRecurringDepositInterest(accountId, calculationDate, fromDate, toDate);
        case AccountType.FIXED_DEPOSIT:
          return this.calculateFixedDepositInterest(accountId, calculationDate, fromDate, toDate);
        default:
          throw new Error(`Unsupported account type: ${accountType}`);
      }
    } catch (error) {
      logger.error('Error calculating interest', { error, accountId, accountType });
      throw error;
    }
  }
  
  /**
   * Post interest to an account
   * @param accountId Account ID
   * @param accountType Type of account
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  async postInterest(
    accountId: string, 
    accountType: AccountType,
    interestAmount: string | number, 
    postingDate: string, 
    fromDate: string, 
    toDate: string, 
    userId?: string
  ): Promise<InterestPostingTransaction> {
    logger.info('Posting interest', { 
      accountId, 
      accountType,
      interestAmount, 
      postingDate 
    });
    
    try {
      // Different account types require different posting logic
      switch (accountType) {
        case AccountType.SAVINGS:
          return this.postSavingsInterest(accountId, interestAmount, postingDate, fromDate, toDate, userId);
        case AccountType.LOAN:
          return this.postLoanInterest(accountId, interestAmount, postingDate, fromDate, toDate, userId);
        case AccountType.RECURRING_DEPOSIT:
          return this.postRecurringDepositInterest(accountId, interestAmount, postingDate, fromDate, toDate, userId);
        case AccountType.FIXED_DEPOSIT:
          return this.postFixedDepositInterest(accountId, interestAmount, postingDate, fromDate, toDate, userId);
        default:
          throw new Error(`Unsupported account type: ${accountType}`);
      }
    } catch (error) {
      logger.error('Error posting interest', { error, accountId, accountType });
      throw error;
    }
  }
  
  /**
   * Record daily interest accrual
   * @param accountId Account ID
   * @param accountType Type of account
   * @param accrualDate Date of accrual
   * @param amount Accrued interest amount
   * @param balance Account balance used for calculation
   * @param interestRate Interest rate used
   * @param userId Current user ID
   * @returns Created accrual record
   */
  async recordDailyAccrual(
    accountId: string,
    accountType: AccountType,
    accrualDate: string,
    amount: string | number,
    balance: string | number,
    interestRate: string | number,
    userId?: string
  ): Promise<DailyAccrualRecord> {
    logger.info('Recording daily interest accrual', {
      accountId,
      accountType,
      accrualDate,
      amount
    });
    
    try {
      const accrualAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      const accrualBalance = typeof balance === 'string' ? parseFloat(balance) : balance;
      const rate = typeof interestRate === 'string' ? parseFloat(interestRate) : interestRate;
      
      // Create accrual record
      const accrualId = uuidv4();
      
      await query(
        `INSERT INTO interest_accrual (
          id, account_id, account_type, accrual_date, amount, 
          balance, interest_rate, is_posted, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          accrualId,
          accountId,
          accountType,
          new Date(accrualDate),
          accrualAmount,
          accrualBalance,
          rate,
          false,
          userId || null
        ]
      );
      
      return {
        id: accrualId,
        accountId,
        accrualDate,
        amount: accrualAmount.toString(),
        balance: accrualBalance.toString(),
        interestRate: rate.toString(),
        isPosted: false
      };
    } catch (error) {
      logger.error('Error recording daily interest accrual', { error, accountId, accountType });
      throw error;
    }
  }
  
  /**
   * Get daily accruals for an account within a date range
   * @param accountId Account ID
   * @param accountType Type of account
   * @param fromDate Start date
   * @param toDate End date
   * @param onlyUnposted Get only accruals that haven't been posted
   * @returns List of daily accrual records
   */
  async getDailyAccruals(
    accountId: string,
    accountType: AccountType,
    fromDate: string,
    toDate: string,
    onlyUnposted: boolean = false
  ): Promise<DailyAccrualRecord[]> {
    logger.info('Getting daily interest accruals', {
      accountId,
      accountType,
      fromDate,
      toDate,
      onlyUnposted
    });
    
    try {
      let queryStr = `
        SELECT id, account_id, account_type, accrual_date, amount, 
               balance, interest_rate, is_posted, posted_date, posted_transaction_id
        FROM interest_accrual
        WHERE account_id = $1
          AND account_type = $2
          AND accrual_date >= $3
          AND accrual_date <= $4
      `;
      
      const queryParams = [accountId, accountType, new Date(fromDate), new Date(toDate)];
      
      if (onlyUnposted) {
        queryStr += ' AND is_posted = false';
      }
      
      queryStr += ' ORDER BY accrual_date ASC';
      
      const result = await query(queryStr, queryParams);
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        accrualDate: row.accrual_date.toISOString().split('T')[0],
        amount: row.amount.toString(),
        balance: row.balance.toString(),
        interestRate: row.interest_rate.toString(),
        isPosted: row.is_posted,
        postedDate: row.posted_date ? row.posted_date.toISOString().split('T')[0] : undefined,
        postedTransactionId: row.posted_transaction_id
      }));
    } catch (error) {
      logger.error('Error getting daily interest accruals', { error, accountId, accountType });
      throw error;
    }
  }
  
  /**
   * Get interest posting history for an account
   * @param accountId Account ID
   * @param accountType Type of account
   * @param limit Maximum number of records to return
   * @param offset Number of records to skip
   * @returns Interest posting history
   */
  async getInterestPostingHistory(
    accountId: string,
    accountType: AccountType,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    logger.info('Getting interest posting history', { accountId, accountType, limit, offset });
    
    try {
      const historyResult = await query(
        `SELECT * FROM interest_posting_history
         WHERE account_id = $1 AND account_type = $2
         ORDER BY posting_date DESC
         LIMIT $3 OFFSET $4`,
        [accountId, accountType, limit, offset]
      );
      
      return historyResult.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        accountType: row.account_type,
        transactionId: row.transaction_id,
        postingDate: row.posting_date.toISOString().split('T')[0],
        fromDate: row.from_date.toISOString().split('T')[0],
        toDate: row.to_date.toISOString().split('T')[0],
        interestAmount: row.interest_amount.toString(),
        balanceAfterPosting: row.balance_after_posting.toString(),
        createdDate: row.created_date.toISOString()
      }));
    } catch (error) {
      logger.error('Error getting interest posting history', { error, accountId, accountType });
      throw error;
    }
  }
  
  /**
   * Calculate interest for a savings account
   * @param accountId Savings account ID
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  private async calculateSavingsInterest(
    accountId: string,
    calculationDate: string,
    fromDate?: string,
    toDate?: string
  ): Promise<InterestCalculationResult> {
    // Get account details
    const accountResult = await query(
      `SELECT sa.*, p.name as product_name 
       FROM savings_account sa 
       JOIN savings_product p ON sa.product_id = p.id 
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rowCount === 0) {
      throw new Error(`Savings account with ID ${accountId} not found`);
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
         FROM savings_account_transaction
         WHERE savings_account_id = $1 AND transaction_type = 'interest_posting'`,
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
      [accountId, from]
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
      [accountId, from, to]
    );
    
    // Calculate interest based on account configuration and transaction history
    const interestRate = new Decimal(account.nominal_annual_interest_rate || 0);
    
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
    } else if (account.interest_calculation_type === 'minimum_balance') {
      // Find minimum balance during the period
      let minBalance = initialBalance;
      let runningBalance = initialBalance;
      
      // Check transactions for minimum balance
      for (const tx of transactionsResult.rows) {
        if (tx.transaction_type === 'deposit' || tx.transaction_type === 'interest_posting') {
          runningBalance = runningBalance.add(new Decimal(tx.amount));
        } else if (tx.transaction_type === 'withdrawal') {
          runningBalance = runningBalance.sub(new Decimal(tx.amount));
          if (runningBalance.lessThan(minBalance)) {
            minBalance = runningBalance;
          }
        }
      }
      
      // Calculate interest on minimum balance
      interestEarned = minBalance.mul(dailyInterestRate).mul(daysInPeriod);
    } else {
      // Default to simple calculation on initial balance
      interestEarned = initialBalance.mul(dailyInterestRate).mul(daysInPeriod);
    }
    
    // Round to currency precision (assuming 2 decimal places)
    const roundedInterest = interestEarned.toDecimalPlaces(2);
    
    return {
      accountId,
      accountNo: account.account_no,
      accountType: AccountType.SAVINGS,
      balance: initialBalance.toString(),
      interestRate: interestRate.toString(),
      interestEarned: roundedInterest.toString(),
      calculationDate: calcDate,
      fromDate,
      toDate: calcDate,
      daysInPeriod,
      compoundingFrequency,
      calculationType: account.interest_calculation_type
    };
  }
  
  /**
   * Post interest to a savings account
   * @param accountId Savings account ID
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  private async postSavingsInterest(
    accountId: string,
    interestAmount: string | number,
    postingDate: string,
    fromDate: string,
    toDate: string,
    userId?: string
  ): Promise<InterestPostingTransaction> {
    return await transaction(async (client) => {
      // Get account details
      const accountResult = await client.query(
        'SELECT * FROM savings_account WHERE id = $1',
        [accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Savings account with ID ${accountId} not found`);
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
        [accountId]
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
          accountId,
          'interest_posting',
          transactionDate,
          interestDecimal,
          account.currency_code,
          newBalance,
          transactionDate,
          userId || null
        ]
      );
      
      // Record interest posting in history table
      const interestHistoryId = uuidv4();
      
      await client.query(
        `INSERT INTO interest_posting_history (
          id, account_id, account_type, transaction_id, posting_date, 
          from_date, to_date, interest_amount, balance_after_posting, 
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          interestHistoryId,
          accountId,
          AccountType.SAVINGS,
          savingsTransactionId,
          transactionDate,
          new Date(fromDate),
          new Date(toDate),
          interestDecimal,
          newBalance,
          userId || null
        ]
      );
      
      // Update accrual records to mark them as posted
      await client.query(
        `UPDATE interest_accrual 
         SET is_posted = true, 
             posted_date = $1, 
             posted_transaction_id = $2,
             last_modified_by = $3,
             last_modified_date = NOW()
         WHERE account_id = $4 
           AND account_type = $5
           AND accrual_date >= $6
           AND accrual_date <= $7
           AND is_posted = false`,
        [
          transactionDate,
          savingsTransactionId,
          userId || null,
          accountId,
          AccountType.SAVINGS,
          new Date(fromDate),
          new Date(toDate)
        ]
      );
      
      return {
        id: savingsTransactionId,
        accountId,
        accountType: AccountType.SAVINGS,
        amount: interestDecimal.toString(),
        date: postingDate,
        fromDate,
        toDate
      };
    });
  }
  
  /**
   * Calculate interest for a loan account
   * @param accountId Loan account ID
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  private async calculateLoanInterest(
    accountId: string,
    calculationDate: string,
    fromDate?: string,
    toDate?: string
  ): Promise<InterestCalculationResult> {
    // Get loan account details
    const loanResult = await query(
      `SELECT l.*, p.name as product_name
       FROM loan l
       JOIN loan_product p ON l.product_id = p.id
       WHERE l.id = $1`,
      [accountId]
    );
    
    if (loanResult.rowCount === 0) {
      throw new Error(`Loan account with ID ${accountId} not found`);
    }
    
    const loan = loanResult.rows[0];
    
    // Validate loan status
    if (loan.status !== 'active') {
      throw new Error(`Cannot calculate interest for loan with status ${loan.status}`);
    }
    
    // Determine calculation period
    if (!fromDate) {
      const lastAccrualResult = await query(
        `SELECT MAX(accrual_date) as last_accrual_date
         FROM interest_accrual
         WHERE account_id = $1 AND account_type = $2`,
        [accountId, AccountType.LOAN]
      );
      
      fromDate = lastAccrualResult.rows[0].last_accrual_date 
        ? lastAccrualResult.rows[0].last_accrual_date.toISOString().split('T')[0] 
        : loan.disbursement_date?.toISOString().split('T')[0];
    }
    
    // Use provided calculation date or current date
    const calcDate = toDate || calculationDate;
    
    // Calculate days in period
    const from = new Date(fromDate);
    const to = new Date(calcDate);
    const daysInPeriod = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get outstanding principal as of from date
    const principalResult = await query(
      `SELECT COALESCE(
         (SELECT principal_amount FROM loan WHERE id = $1) -
         COALESCE(SUM(principal_portion), 0), 0) as outstanding_principal
       FROM loan_repayment_schedule
       WHERE loan_id = $1 AND due_date <= $2`,
      [accountId, from]
    );
    
    const outstandingPrincipal = new Decimal(principalResult.rows[0].outstanding_principal);
    
    // Calculate daily interest rate
    const interestRate = new Decimal(loan.interest_rate);
    const daysInYear = this.getDaysInYear(loan.interest_calculation_period_type);
    const dailyInterestRate = interestRate.div(100).div(daysInYear);
    
    // Calculate simple interest for the period
    const interestAmount = outstandingPrincipal.mul(dailyInterestRate).mul(daysInPeriod);
    
    // Round to currency precision
    const roundedInterest = interestAmount.toDecimalPlaces(2);
    
    return {
      accountId,
      accountNo: loan.account_no,
      accountType: AccountType.LOAN,
      balance: outstandingPrincipal.toString(),
      interestRate: interestRate.toString(),
      interestEarned: roundedInterest.toString(),
      calculationDate: calcDate,
      fromDate,
      toDate: calcDate,
      daysInPeriod,
      compoundingFrequency: loan.interest_recalculation_enabled ? 
        this.mapCompoundingFrequency(loan.interest_recalculation_compounding_method) : 'none',
      calculationType: loan.interest_type
    };
  }
  
  /**
   * Post interest to a loan account
   * @param accountId Loan account ID
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  private async postLoanInterest(
    accountId: string,
    interestAmount: string | number,
    postingDate: string,
    fromDate: string,
    toDate: string,
    userId?: string
  ): Promise<InterestPostingTransaction> {
    return await transaction(async (client) => {
      // Get loan details
      const loanResult = await client.query(
        'SELECT * FROM loan WHERE id = $1',
        [accountId]
      );
      
      if (loanResult.rowCount === 0) {
        throw new Error(`Loan account with ID ${accountId} not found`);
      }
      
      const loan = loanResult.rows[0];
      
      // Validate loan status
      if (loan.status !== 'active') {
        throw new Error(`Cannot post interest to loan with status ${loan.status}`);
      }
      
      // Create loan transaction for interest posting
      const transactionDate = new Date(postingDate);
      const loanTransactionId = uuidv4();
      const interestDecimal = typeof interestAmount === 'string' 
        ? parseFloat(interestAmount) 
        : interestAmount;
      
      await client.query(
        `INSERT INTO loan_transaction (
          id, loan_id, transaction_type, transaction_date,
          amount, principal_portion, interest_portion, fee_portion, penalty_portion,
          submitted_on_date, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          loanTransactionId,
          accountId,
          'accrual',
          transactionDate,
          interestDecimal,
          0,
          interestDecimal,
          0,
          0,
          transactionDate,
          userId || null
        ]
      );
      
      // Record interest posting in history table
      const interestHistoryId = uuidv4();
      
      await client.query(
        `INSERT INTO interest_posting_history (
          id, account_id, account_type, transaction_id, posting_date, 
          from_date, to_date, interest_amount, balance_after_posting, 
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          interestHistoryId,
          accountId,
          AccountType.LOAN,
          loanTransactionId,
          transactionDate,
          new Date(fromDate),
          new Date(toDate),
          interestDecimal,
          0, // Not relevant for loans
          userId || null
        ]
      );
      
      // Update accrual records to mark them as posted
      await client.query(
        `UPDATE interest_accrual 
         SET is_posted = true, 
             posted_date = $1, 
             posted_transaction_id = $2,
             last_modified_by = $3,
             last_modified_date = NOW()
         WHERE account_id = $4 
           AND account_type = $5
           AND accrual_date >= $6
           AND accrual_date <= $7
           AND is_posted = false`,
        [
          transactionDate,
          loanTransactionId,
          userId || null,
          accountId,
          AccountType.LOAN,
          new Date(fromDate),
          new Date(toDate)
        ]
      );
      
      return {
        id: loanTransactionId,
        accountId,
        accountType: AccountType.LOAN,
        amount: interestDecimal.toString(),
        date: postingDate,
        fromDate,
        toDate
      };
    });
  }
  
  /**
   * Calculate interest for a recurring deposit account
   * @param accountId Recurring deposit account ID
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  private async calculateRecurringDepositInterest(
    accountId: string,
    calculationDate: string,
    fromDate?: string,
    toDate?: string
  ): Promise<InterestCalculationResult> {
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
    
    // Get balance information and calculate interest
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
    
    // Get compounding type and calculate daily interest rate
    const interestRate = new Decimal(account.interest_rate);
    const compoundingFrequency = this.mapCompoundingFrequency(account.interest_compounding_period_type);
    const daysInYear = this.getDaysInYear(account.interest_calculation_days_in_year_type);
    const dailyInterestRate = interestRate.div(100).div(daysInYear);
    
    // Use initial balance for calculation
    const initialBalance = new Decimal(balanceResult.rows[0].balance);
    
    // Calculate simple interest for deposit
    const interestEarned = initialBalance.mul(dailyInterestRate).mul(daysInPeriod);
    const roundedInterest = interestEarned.toDecimalPlaces(2);
    
    return {
      accountId,
      accountNo: account.account_no,
      accountType: AccountType.RECURRING_DEPOSIT,
      balance: initialBalance.toString(),
      interestRate: interestRate.toString(),
      interestEarned: roundedInterest.toString(),
      calculationDate: calcDate,
      fromDate,
      toDate: calcDate,
      daysInPeriod,
      compoundingFrequency,
      calculationType: account.interest_calculation_type
    };
  }
  
  /**
   * Post interest to a recurring deposit account
   * @param accountId Recurring deposit account ID
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  private async postRecurringDepositInterest(
    accountId: string,
    interestAmount: string | number,
    postingDate: string,
    fromDate: string,
    toDate: string,
    userId?: string
  ): Promise<InterestPostingTransaction> {
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
        `INSERT INTO interest_posting_history (
          id, account_id, account_type, transaction_id, posting_date, 
          from_date, to_date, interest_amount, balance_after_posting, 
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          interestHistoryId,
          accountId,
          AccountType.RECURRING_DEPOSIT,
          recurringDepositTransactionId,
          transactionDate,
          new Date(fromDate),
          new Date(toDate),
          interestDecimal,
          newBalance,
          userId || null
        ]
      );
      
      // Update accrual records
      await client.query(
        `UPDATE interest_accrual 
         SET is_posted = true, 
             posted_date = $1, 
             posted_transaction_id = $2,
             last_modified_by = $3,
             last_modified_date = NOW()
         WHERE account_id = $4 
           AND account_type = $5
           AND accrual_date >= $6
           AND accrual_date <= $7
           AND is_posted = false`,
        [
          transactionDate,
          recurringDepositTransactionId,
          userId || null,
          accountId,
          AccountType.RECURRING_DEPOSIT,
          new Date(fromDate),
          new Date(toDate)
        ]
      );
      
      return {
        id: recurringDepositTransactionId,
        accountId,
        accountType: AccountType.RECURRING_DEPOSIT,
        amount: interestDecimal.toString(),
        date: postingDate,
        fromDate,
        toDate
      };
    });
  }
  
  /**
   * Calculate interest for a fixed deposit account
   * @param accountId Fixed deposit account ID
   * @param calculationDate Date for calculation
   * @param fromDate Optional start date for calculation period
   * @param toDate Optional end date for calculation period
   * @returns Interest calculation result
   */
  private async calculateFixedDepositInterest(
    accountId: string,
    calculationDate: string,
    fromDate?: string,
    toDate?: string
  ): Promise<InterestCalculationResult> {
    // Get account details
    const accountResult = await query(
      `SELECT fda.*, sa.account_no, sa.currency_code, sa.status,
              sa.interest_compounding_period_type, sa.interest_posting_period_type,
              sa.interest_calculation_type, sa.interest_calculation_days_in_year_type
       FROM fixed_deposit_account fda
       JOIN savings_account sa ON fda.savings_account_id = sa.id
       WHERE fda.id = $1`,
      [accountId]
    );
    
    if (accountResult.rowCount === 0) {
      throw new Error(`Fixed deposit account with ID ${accountId} not found`);
    }
    
    const account = accountResult.rows[0];
    
    // Validate account status
    if (account.status !== 'active') {
      throw new Error(`Cannot calculate interest for account with status ${account.status}`);
    }
    
    // Get last interest posting date if fromDate not provided
    if (!fromDate) {
      const lastPostingResult = await query(
        `SELECT MAX(posting_date) as last_posting_date
         FROM interest_posting_history
         WHERE account_id = $1 AND account_type = $2`,
        [accountId, AccountType.FIXED_DEPOSIT]
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
    
    // For fixed deposit, we use the deposit amount for calculation
    const depositAmount = new Decimal(account.deposit_amount);
    const interestRate = new Decimal(account.interest_rate);
    
    // Get compounding details
    const compoundingFrequency = this.mapCompoundingFrequency(account.interest_compounding_period_type);
    const daysInYear = this.getDaysInYear(account.interest_calculation_days_in_year_type);
    const periodsPerYear = this.getCompoundingPeriodsPerYear(compoundingFrequency);
    
    let interestEarned: Decimal;
    
    if (compoundingFrequency === 'none' || periodsPerYear === 0) {
      // Simple interest calculation
      const dailyInterestRate = interestRate.div(100).div(daysInYear);
      interestEarned = depositAmount.mul(dailyInterestRate).mul(daysInPeriod);
    } else {
      // Compound interest calculation
      const periodRate = interestRate.div(100).div(periodsPerYear);
      const periodsElapsed = new Decimal(daysInPeriod).div(daysInYear).mul(periodsPerYear);
      const fullPeriods = Math.floor(periodsElapsed.toNumber());
      const partialPeriod = periodsElapsed.minus(fullPeriods);
      
      // Calculate compound interest for full periods
      const compoundFactor = Decimal.pow(Decimal.add(1, periodRate), fullPeriods);
      const compoundedAmount = depositAmount.mul(compoundFactor);
      
      // Add simple interest for partial period
      const partialInterest = compoundedAmount.mul(periodRate).mul(partialPeriod);
      
      interestEarned = compoundedAmount.sub(depositAmount).add(partialInterest);
    }
    
    // Round to currency precision
    const roundedInterest = interestEarned.toDecimalPlaces(2);
    
    return {
      accountId,
      accountNo: account.account_no,
      accountType: AccountType.FIXED_DEPOSIT,
      balance: depositAmount.toString(),
      interestRate: interestRate.toString(),
      interestEarned: roundedInterest.toString(),
      calculationDate: calcDate,
      fromDate,
      toDate: calcDate,
      daysInPeriod,
      compoundingFrequency,
      calculationType: account.interest_calculation_type
    };
  }
  
  /**
   * Post interest to a fixed deposit account
   * @param accountId Fixed deposit account ID
   * @param interestAmount Interest amount to post
   * @param postingDate Posting date
   * @param fromDate Start of interest period
   * @param toDate End of interest period
   * @param userId Current user ID
   * @returns Posted transaction details
   */
  private async postFixedDepositInterest(
    accountId: string,
    interestAmount: string | number,
    postingDate: string,
    fromDate: string,
    toDate: string,
    userId?: string
  ): Promise<InterestPostingTransaction> {
    return await transaction(async (client) => {
      // Get account details
      const accountResult = await client.query(
        `SELECT fda.*, sa.id as savings_account_id, sa.status, sa.currency_code
         FROM fixed_deposit_account fda
         JOIN savings_account sa ON fda.savings_account_id = sa.id
         WHERE fda.id = $1`,
        [accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Fixed deposit account with ID ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Validate account status
      if (account.status !== 'active') {
        throw new Error(`Cannot post interest to account with status ${account.status}`);
      }
      
      // Create savings account transaction for interest posting
      const transactionDate = new Date(postingDate);
      const savingsTransactionId = uuidv4();
      const interestDecimal = typeof interestAmount === 'string' 
        ? parseFloat(interestAmount) 
        : interestAmount;
      
      // For fixed deposits, interest is typically accrued but not added to account balance
      // until maturity
      await client.query(
        `INSERT INTO savings_account_transaction (
          id, savings_account_id, transaction_type, transaction_date,
          amount, currency_code, submitted_on_date,
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          savingsTransactionId,
          account.savings_account_id,
          'interest_posting',
          transactionDate,
          interestDecimal,
          account.currency_code,
          transactionDate,
          userId || null
        ]
      );
      
      // Create fixed deposit transaction
      const fixedDepositTransactionId = uuidv4();
      
      await client.query(
        `INSERT INTO fixed_deposit_transaction (
          id, savings_account_transaction_id, fixed_deposit_account_id,
          transaction_type, amount, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          fixedDepositTransactionId,
          savingsTransactionId,
          accountId,
          'INTEREST_POSTING',
          interestDecimal,
          userId || null
        ]
      );
      
      // Update account interest accrued
      const interestAccrued = parseFloat(account.accrued_interest) || 0;
      const newInterestAccrued = interestAccrued + interestDecimal;
      
      await client.query(
        `UPDATE fixed_deposit_account
         SET accrued_interest = $1,
             last_modified_by = $2,
             last_modified_date = NOW()
         WHERE id = $3`,
        [
          newInterestAccrued,
          userId || null,
          accountId
        ]
      );
      
      // Record interest posting in history table
      const interestHistoryId = uuidv4();
      
      await client.query(
        `INSERT INTO interest_posting_history (
          id, account_id, account_type, transaction_id, posting_date, 
          from_date, to_date, interest_amount, balance_after_posting, 
          created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          interestHistoryId,
          accountId,
          AccountType.FIXED_DEPOSIT,
          fixedDepositTransactionId,
          transactionDate,
          new Date(fromDate),
          new Date(toDate),
          interestDecimal,
          account.deposit_amount,
          userId || null
        ]
      );
      
      // Update accrual records
      await client.query(
        `UPDATE interest_accrual 
         SET is_posted = true, 
             posted_date = $1, 
             posted_transaction_id = $2,
             last_modified_by = $3,
             last_modified_date = NOW()
         WHERE account_id = $4 
           AND account_type = $5
           AND accrual_date >= $6
           AND accrual_date <= $7
           AND is_posted = false`,
        [
          transactionDate,
          fixedDepositTransactionId,
          userId || null,
          accountId,
          AccountType.FIXED_DEPOSIT,
          new Date(fromDate),
          new Date(toDate)
        ]
      );
      
      return {
        id: fixedDepositTransactionId,
        accountId,
        accountType: AccountType.FIXED_DEPOSIT,
        amount: interestDecimal.toString(),
        date: postingDate,
        fromDate,
        toDate
      };
    });
  }
  
  /**
   * Map interest compounding type to a compounding frequency
   * @param compoundingType Interest compounding type
   * @returns Compounding frequency string
   */
  private mapCompoundingFrequency(compoundingType: string): string {
    if (!compoundingType) return 'none';
    
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
      case 'none':
        return 0;
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
    if (!daysInYearType) return 365;
    
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
export const interestCalculationService = new InterestCalculationService();