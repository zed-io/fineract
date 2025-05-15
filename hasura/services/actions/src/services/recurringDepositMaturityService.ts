/**
 * Recurring Deposit Maturity Service for Fineract
 * Provides functionality for managing recurring deposit maturity and renewal operations
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import { recurringDepositInterestService } from './recurringDepositInterestService';
import { calculateFutureDate } from '../utils/accountUtils';
import Decimal from 'decimal.js';

/**
 * Interface for maturity processing result
 */
export interface MaturityProcessingResult {
  accountId: string;
  maturityAmount: string;
  closedOn: string;
  transactionId?: string;
}

/**
 * Interface for account renewal result
 */
export interface AccountRenewalResult {
  accountId: string;
  renewalDate: string;
  newMaturityDate: string;
  interestPosted?: string;
}

/**
 * Interface for upcoming maturity
 */
export interface UpcomingMaturity {
  accountId: string;
  accountNo: string;
  clientId: string;
  clientName: string;
  maturityDate: string;
  maturityAmount: string;
  depositAmount: string;
  totalDeposits: string;
  interestEarned: string;
  currency: string;
  isRenewalAllowed: boolean;
  onAccountClosureType: string;
  daysToMaturity: number;
}

/**
 * Interface for maturity options update
 */
export interface MaturityOptionsUpdate {
  isRenewalAllowed?: boolean;
  onAccountClosureType?: string;
  transferToSavingsAccountId?: string;
}

/**
 * Interface for maturity options result
 */
export interface MaturityOptionsResult {
  accountId: string;
  isRenewalAllowed: boolean;
  onAccountClosureType: string;
  transferToSavingsAccountId?: string;
}

export class RecurringDepositMaturityService {
  
  /**
   * Process maturity for a recurring deposit account
   * @param accountId Account ID
   * @param maturedOn Maturity date
   * @param closureType Optional override for account closure type
   * @param transferToSavingsAccountId Optional override for transfer account
   * @param userId Current user ID
   * @returns Maturity processing result
   */
  async processMaturity(
    accountId: string, 
    maturedOn: string, 
    closureType?: string,
    transferToSavingsAccountId?: string,
    userId?: string
  ): Promise<MaturityProcessingResult> {
    logger.info('Processing maturity for recurring deposit account', { accountId, maturedOn });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.id as savings_account_id, sa.account_no, sa.status, sa.currency_code,
                  sa.client_id, sa.group_id
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
          throw new Error(`Cannot process maturity for account with status ${account.status}`);
        }
        
        // Calculate maturity amount
        // Get total deposits
        const totalDeposits = parseFloat(account.total_deposits) || 0;
        
        // Get total interest earned
        const interestEarned = parseFloat(account.interest_earned) || 0;
        
        // Check if we need to calculate and post final interest
        const maturityDate = new Date(maturedOn);
        const lastInterestPostedDate = account.last_interest_posted_date 
          ? new Date(account.last_interest_posted_date) 
          : null;
        
        let finalInterest = 0;
        
        if (!lastInterestPostedDate || lastInterestPostedDate < maturityDate) {
          // Calculate interest from last posting date to maturity date
          const lastPostingDate = lastInterestPostedDate 
            ? lastInterestPostedDate.toISOString().split('T')[0] 
            : account.activated_on_date.toISOString().split('T')[0];
          
          // Calculate final interest
          const interestResult = await recurringDepositInterestService.calculateInterest(
            accountId,
            maturedOn,
            lastPostingDate,
            maturedOn
          );
          
          finalInterest = parseFloat(interestResult.interestEarned);
          
          // Post the final interest if it's more than zero
          if (finalInterest > 0) {
            await recurringDepositInterestService.postInterest(
              accountId,
              finalInterest,
              maturedOn,
              lastPostingDate,
              maturedOn,
              userId
            );
            
            // Update interest earned value
            interestEarned += finalInterest;
          }
        }
        
        // Calculate total maturity amount
        const maturityAmount = totalDeposits + interestEarned;
        
        // Use provided closure type or account default
        const closureTypeToUse = closureType || account.on_account_closure_type;
        const transferAccountId = transferToSavingsAccountId || account.transfer_to_savings_account_id;
        
        let transactionId = null;
        
        // Process closure based on closure type
        if (closureTypeToUse === 'transfer_to_savings') {
          // Validate target savings account
          if (!transferAccountId) {
            throw new Error('Savings account ID is required for transfer on closure');
          }
          
          const savingsResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1 AND status = $2',
            [transferAccountId, 'active']
          );
          
          if (savingsResult.rowCount === 0) {
            throw new Error(`Active savings account with ID ${transferAccountId} not found`);
          }
          
          // Transfer to savings account
          const transferTransactionId = uuidv4();
          
          await client.query(
            `INSERT INTO savings_account_transaction (
              id, savings_account_id, transaction_type, transaction_date,
              amount, currency_code, description, is_reversed,
              created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              transferTransactionId,
              transferAccountId,
              'deposit',
              maturityDate,
              maturityAmount,
              account.currency_code,
              'Transfer from matured recurring deposit',
              false,
              userId || null
            ]
          );
          
          transactionId = transferTransactionId;
          
          // Update target account
          await client.query(
            `UPDATE savings_account
             SET last_modified_by = $1,
                 last_modified_date = NOW()
             WHERE id = $2`,
            [userId || null, transferAccountId]
          );
        } else {
          // Withdrawal - create a transaction record
          const withdrawalTransactionId = uuidv4();
          
          await client.query(
            `INSERT INTO savings_account_transaction (
              id, savings_account_id, transaction_type, transaction_date,
              amount, currency_code, description, is_reversed,
              created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              withdrawalTransactionId,
              account.savings_account_id,
              'withdrawal',
              maturityDate,
              maturityAmount,
              account.currency_code,
              'Withdrawal of matured recurring deposit',
              false,
              userId || null
            ]
          );
          
          transactionId = withdrawalTransactionId;
        }
        
        // Update recurring deposit account
        await client.query(
          `UPDATE recurring_deposit_account
           SET maturity_amount = $1,
               maturity_date = $2,
               on_account_closure_type = $3,
               transfer_to_savings_account_id = $4,
               last_modified_by = $5,
               last_modified_date = NOW()
           WHERE id = $6`,
          [
            maturityAmount,
            maturityDate,
            closureTypeToUse,
            closureTypeToUse === 'transfer_to_savings' ? transferAccountId : null,
            userId || null,
            accountId
          ]
        );
        
        // Update savings account status
        await client.query(
          `UPDATE savings_account
           SET status = 'matured',
               closed_on_date = $1,
               closed_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [maturityDate, userId || null, account.savings_account_id]
        );
        
        // Add note
        await client.query(
          `INSERT INTO savings_account_note (
            id, savings_account_id, note, created_by, created_date
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [uuidv4(), account.savings_account_id, 'Account matured and processed', userId || null]
        );
        
        return {
          accountId,
          maturityAmount: maturityAmount.toString(),
          closedOn: maturedOn,
          transactionId
        };
      });
    } catch (error) {
      logger.error('Error processing maturity for recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Renew a recurring deposit account
   * @param accountId Account ID
   * @param renewalDate Renewal date
   * @param userId Current user ID
   * @returns Account renewal result
   */
  async renewAccount(accountId: string, renewalDate: string, userId?: string): Promise<AccountRenewalResult> {
    logger.info('Renewing recurring deposit account', { accountId, renewalDate });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, rdard.recurring_frequency, rdard.recurring_frequency_type,
                  sa.id as savings_account_id, sa.account_no, sa.status, sa.currency_code,
                  sa.client_id, sa.group_id
           FROM recurring_deposit_account rda
           JOIN recurring_deposit_account_recurring_detail rdard ON rda.id = rdard.account_id
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
          throw new Error(`Cannot renew account with status ${account.status}`);
        }
        
        // Check if renewal is allowed
        if (!account.is_renewal_allowed) {
          throw new Error('Renewal is not allowed for this account');
        }
        
        // Calculate maturity amount (will be the new opening balance)
        // Get total deposits
        const totalDeposits = parseFloat(account.total_deposits) || 0;
        
        // Get total interest earned
        let interestEarned = parseFloat(account.interest_earned) || 0;
        
        // Check if we need to calculate and post final interest
        const lastInterestPostedDate = account.last_interest_posted_date 
          ? new Date(account.last_interest_posted_date) 
          : null;
        const renewalDateObj = new Date(renewalDate);
        
        let finalInterest = 0;
        
        if (!lastInterestPostedDate || lastInterestPostedDate < renewalDateObj) {
          // Calculate interest from last posting date to renewal date
          const lastPostingDate = lastInterestPostedDate 
            ? lastInterestPostedDate.toISOString().split('T')[0] 
            : account.activated_on_date.toISOString().split('T')[0];
          
          // Calculate final interest
          const interestResult = await recurringDepositInterestService.calculateInterest(
            accountId,
            renewalDate,
            lastPostingDate,
            renewalDate
          );
          
          finalInterest = parseFloat(interestResult.interestEarned);
          
          // Post the final interest if it's more than zero
          if (finalInterest > 0) {
            await recurringDepositInterestService.postInterest(
              accountId,
              finalInterest,
              renewalDate,
              lastPostingDate,
              renewalDate,
              userId
            );
            
            // Update interest earned value
            interestEarned += finalInterest;
          }
        }
        
        const maturityAmount = totalDeposits + interestEarned;
        
        // Calculate new term based on the original deposit period
        const depositPeriod = account.deposit_period;
        const depositPeriodFrequencyType = account.deposit_period_frequency_type_enum;
        
        // Calculate new maturity date
        const newMaturityDate = calculateFutureDate(
          renewalDateObj,
          depositPeriod,
          depositPeriodFrequencyType
        );
        
        // Reset account statistics for new term
        await client.query(
          `UPDATE recurring_deposit_account
           SET total_deposits = $1, -- Start with maturity amount from previous term
               total_withdrawals = 0,
               interest_earned = 0,
               interest_posted_amount = 0,
               last_interest_posted_date = NULL,
               last_interest_calculation_date = NULL,
               maturity_amount = NULL,
               maturity_date = NULL,
               expected_maturity_date = $2,
               expected_maturity_amount = NULL, -- Will be recalculated later
               activation_date = $3,
               last_modified_by = $4,
               last_modified_date = NOW()
           WHERE id = $5`,
          [
            maturityAmount,
            newMaturityDate,
            renewalDateObj,
            userId || null,
            accountId
          ]
        );
        
        // Reset schedule installments
        await client.query(
          `UPDATE recurring_deposit_schedule_installment
           SET completed = true,
               deposit_amount_completed = deposit_amount,
               obligations_met_on_date = $1,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE account_id = $3 AND completed = false`,
          [renewalDateObj, userId || null, accountId]
        );
        
        // Calculate recurring frequency
        const recurringFrequency = account.recurring_frequency;
        const recurringFrequencyType = account.recurring_frequency_type;
        
        // Calculate new expected number of deposits
        const expectedMaturityDateObj = new Date(newMaturityDate);
        const expectedNumberOfDeposits = Math.ceil(
          (expectedMaturityDateObj.getTime() - renewalDateObj.getTime()) / 
          this.getMillisecondsForFrequency(recurringFrequency, recurringFrequencyType)
        );
        
        // Generate new schedule installments
        let currentDate = new Date(renewalDateObj);
        for (let i = 1; i <= expectedNumberOfDeposits; i++) {
          // Move to next installment date
          currentDate = calculateFutureDate(
            currentDate,
            recurringFrequency,
            recurringFrequencyType
          );
          
          const installmentId = uuidv4();
          
          await client.query(
            `INSERT INTO recurring_deposit_schedule_installment (
              id, account_id, installment_number, due_date, deposit_amount,
              completed, created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              installmentId,
              accountId,
              i,
              currentDate,
              account.deposit_amount,
              false,
              userId || null
            ]
          );
        }
        
        // Update account note about renewal
        await client.query(
          `INSERT INTO savings_account_note (
            id, savings_account_id, note, created_by, created_date
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            uuidv4(), 
            account.savings_account_id, 
            `Account renewed on ${renewalDate} with maturity amount ${maturityAmount} as opening balance`,
            userId || null
          ]
        );
        
        return {
          accountId,
          renewalDate,
          newMaturityDate: newMaturityDate.toISOString().split('T')[0],
          interestPosted: finalInterest > 0 ? finalInterest.toString() : undefined
        };
      });
    } catch (error) {
      logger.error('Error renewing recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Get upcoming maturing accounts
   * @param daysInFuture Number of days to look ahead
   * @param limit Maximum number of accounts to return
   * @returns List of upcoming maturing accounts
   */
  async getUpcomingMaturities(daysInFuture: number = 30, limit: number = 100): Promise<UpcomingMaturity[]> {
    logger.info('Getting upcoming maturing recurring deposit accounts', { daysInFuture, limit });
    
    try {
      // Calculate the date range
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + daysInFuture);
      
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      // Query upcoming maturities
      const result = await query(
        `SELECT rda.id, rda.expected_maturity_date, rda.expected_maturity_amount,
                rda.deposit_amount, rda.is_renewal_allowed, rda.on_account_closure_type,
                rda.total_deposits, rda.interest_earned,
                sa.account_no, sa.currency_code, sa.client_id,
                c.first_name || ' ' || c.last_name as client_name
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN client c ON sa.client_id = c.id
         WHERE sa.status = 'active'
         AND rda.expected_maturity_date >= $1
         AND rda.expected_maturity_date <= $2
         ORDER BY rda.expected_maturity_date ASC
         LIMIT $3`,
        [todayStr, futureDateStr, limit]
      );
      
      return result.rows.map(row => {
        const maturityDate = new Date(row.expected_maturity_date);
        const daysToMaturity = Math.ceil((maturityDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          accountId: row.id,
          accountNo: row.account_no,
          clientId: row.client_id,
          clientName: row.client_name,
          maturityDate: row.expected_maturity_date,
          maturityAmount: row.expected_maturity_amount,
          depositAmount: row.deposit_amount,
          totalDeposits: row.total_deposits,
          interestEarned: row.interest_earned,
          currency: row.currency_code,
          isRenewalAllowed: row.is_renewal_allowed,
          onAccountClosureType: row.on_account_closure_type,
          daysToMaturity
        };
      });
    } catch (error) {
      logger.error('Error getting upcoming maturing recurring deposit accounts', { error });
      throw error;
    }
  }
  
  /**
   * Update maturity options for an account
   * @param accountId Account ID
   * @param options Maturity options to update
   * @param userId Current user ID
   * @returns Updated maturity options
   */
  async updateMaturityOptions(
    accountId: string,
    options: MaturityOptionsUpdate,
    userId?: string
  ): Promise<MaturityOptionsResult> {
    logger.info('Updating maturity options for recurring deposit account', { accountId, options });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.status
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
          throw new Error(`Cannot update maturity options for account with status ${account.status}`);
        }
        
        // Validate savings account if transfer is selected
        if (options.onAccountClosureType === 'transfer_to_savings' && options.transferToSavingsAccountId) {
          const savingsResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1',
            [options.transferToSavingsAccountId]
          );
          
          if (savingsResult.rowCount === 0) {
            throw new Error(`Savings account with ID ${options.transferToSavingsAccountId} not found`);
          }
        }
        
        // Construct update query parts
        const updateParts = [];
        const params = [accountId];
        let paramIndex = 2;
        
        if (options.isRenewalAllowed !== undefined) {
          updateParts.push(`is_renewal_allowed = $${paramIndex++}`);
          params.push(options.isRenewalAllowed);
        }
        
        if (options.onAccountClosureType) {
          updateParts.push(`on_account_closure_type = $${paramIndex++}`);
          params.push(options.onAccountClosureType);
        }
        
        if (options.onAccountClosureType === 'transfer_to_savings' && options.transferToSavingsAccountId) {
          updateParts.push(`transfer_to_savings_account_id = $${paramIndex++}`);
          params.push(options.transferToSavingsAccountId);
        } else if (options.onAccountClosureType === 'withdrawal') {
          updateParts.push(`transfer_to_savings_account_id = NULL`);
        }
        
        // Add last modified info
        updateParts.push(`last_modified_by = $${paramIndex++}`);
        params.push(userId || null);
        
        updateParts.push(`last_modified_date = NOW()`);
        
        // Execute update if there are changes
        if (updateParts.length > 0) {
          await client.query(
            `UPDATE recurring_deposit_account
             SET ${updateParts.join(', ')}
             WHERE id = $1`,
            params
          );
        }
        
        // Get updated account details
        const updatedResult = await client.query(
          `SELECT is_renewal_allowed, on_account_closure_type, transfer_to_savings_account_id
           FROM recurring_deposit_account
           WHERE id = $1`,
          [accountId]
        );
        
        const updatedAccount = updatedResult.rows[0];
        
        return {
          accountId,
          isRenewalAllowed: updatedAccount.is_renewal_allowed,
          onAccountClosureType: updatedAccount.on_account_closure_type,
          transferToSavingsAccountId: updatedAccount.transfer_to_savings_account_id
        };
      });
    } catch (error) {
      logger.error('Error updating maturity options for recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Get milliseconds for a frequency type
   * @param frequency Frequency value
   * @param frequencyType Frequency type
   * @returns Milliseconds
   */
  private getMillisecondsForFrequency(frequency: number, frequencyType: string): number {
    const millisecondsPerDay = 86400000;
    
    switch (frequencyType.toLowerCase()) {
      case 'days':
        return frequency * millisecondsPerDay;
      case 'weeks':
        return frequency * 7 * millisecondsPerDay;
      case 'months':
        // Approximate - assuming 30 days per month
        return frequency * 30 * millisecondsPerDay;
      case 'years':
        // Approximate - assuming 365 days per year
        return frequency * 365 * millisecondsPerDay;
      default:
        return frequency * millisecondsPerDay;
    }
  }
}

// Export a singleton instance
export const recurringDepositMaturityService = new RecurringDepositMaturityService();