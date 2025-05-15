/**
 * Recurring Deposit Premature Closure Service for Fineract
 * Provides functionality for managing premature closures of recurring deposit accounts
 */

import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import { recurringDepositInterestService } from './recurringDepositInterestService';

/**
 * Interface for premature closure options
 */
export interface PrematureClosureOptions {
  closureDate: string;
  closureReason: 'withdrawal' | 'transfer' | 'refund' | 'other';
  transferToAccountId?: string;
  note?: string;
  applyPenalty?: boolean;
  overridePenaltyRate?: number;
  paymentTypeId?: string;
  receiptNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  bankNumber?: string;
  accountNumber?: string;
}

/**
 * Interface for premature closure calculation request
 */
export interface PrematureCalculationRequest {
  accountId: string;
  calculationDate: string;
}

/**
 * Interface for premature closure calculation response
 */
export interface PrematureCalculationResponse {
  accountId: string;
  depositAmount: string;
  interestEarned: string;
  penaltyAmount: string;
  penaltyRate: number;
  penaltyApplicable: boolean;
  penaltyType: string;
  totalPayoutAmount: string;
  daysCompleted: number;
  percentageComplete: string;
  originalMaturityDate: string;
  currency: string;
}

/**
 * Interface for premature closure result
 */
export interface PrematureClosureResult {
  accountId: string;
  closureId: string;
  closureDate: string;
  depositAmount: string;
  interestAmount: string;
  penaltyAmount: string;
  totalAmount: string;
  transactionId: string;
  transferAccountId?: string;
}

export class RecurringDepositPrematureClosureService {

  /**
   * Calculate premature closure details without actually closing the account
   * Provides information on potential penalty and payout amount
   * @param request Calculation request
   * @returns Premature closure calculation
   */
  async calculatePrematureClosure(request: PrematureCalculationRequest): Promise<PrematureCalculationResponse> {
    logger.info('Calculating premature closure for recurring deposit account', { 
      accountId: request.accountId, 
      calculationDate: request.calculationDate 
    });

    try {
      // Get account details
      const accountResult = await query(
        `SELECT rda.*, sa.id as savings_account_id, sa.status, sa.currency_code, sa.approved_on_date,
                sa.activated_on_date, rdp.pre_closure_penal_applicable, rdp.pre_closure_penal_interest,
                rdp.pre_closure_penal_interest_on_type_enum
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN recurring_deposit_product rdp ON rda.product_id = rdp.id
         WHERE rda.id = $1`,
        [request.accountId]
      );

      if (accountResult.rowCount === 0) {
        throw new Error(`Recurring deposit account with ID ${request.accountId} not found`);
      }

      const account = accountResult.rows[0];
      
      // Validate account status
      if (account.status !== 'active') {
        throw new Error(`Cannot calculate premature closure for account with status ${account.status}`);
      }

      // Validate account allows premature closure
      if (!account.is_premature_closure_allowed) {
        throw new Error('Premature closure is not allowed for this account');
      }

      // Calculate existing deposit amount
      const depositAmount = parseFloat(account.total_deposits) || 0;

      // Get activation date
      const activationDate = account.activated_on_date || account.approved_on_date;
      if (!activationDate) {
        throw new Error('Account activation date is not available');
      }

      // Get original maturity date
      const maturityDate = account.expected_maturity_date;
      if (!maturityDate) {
        throw new Error('Expected maturity date is not available');
      }

      // Calculate days completed
      const closureDate = new Date(request.calculationDate);
      const startDate = new Date(activationDate);
      const endDate = new Date(maturityDate);

      const daysCompleted = Math.floor((closureDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const percentageComplete = totalDays > 0 ? ((daysCompleted / totalDays) * 100).toFixed(2) : "0.00";

      // Calculate earned interest up to the closure date
      let interestEarned = 0;

      // Check if we need to calculate additional interest
      const lastInterestPostedDate = account.last_interest_posted_date 
        ? new Date(account.last_interest_posted_date) 
        : null;

      if (!lastInterestPostedDate || lastInterestPostedDate < closureDate) {
        // Calculate interest from last posting date to closure date
        const lastPostingDate = lastInterestPostedDate 
          ? lastInterestPostedDate.toISOString().split('T')[0] 
          : activationDate.toISOString().split('T')[0];
        
        // Calculate final interest
        const interestResult = await recurringDepositInterestService.calculateInterest(
          request.accountId,
          request.calculationDate,
          lastPostingDate,
          request.calculationDate
        );
        
        interestEarned = parseFloat(interestResult.interestEarned);
      }

      // Add existing interest earned
      interestEarned += parseFloat(account.interest_earned) || 0;

      // Apply penalty if applicable
      let penaltyAmount = 0;
      const penaltyApplicable = account.pre_closure_penal_applicable;
      let penaltyRate = parseFloat(account.pre_closure_penal_interest) || 0;
      let penaltyType = account.pre_closure_penal_interest_on_type_enum || 'interest';

      if (penaltyApplicable && penaltyRate > 0) {
        // Calculate penalty based on the type
        if (penaltyType === 'principal') {
          penaltyAmount = (depositAmount * penaltyRate) / 100;
        } else if (penaltyType === 'interest') {
          penaltyAmount = (interestEarned * penaltyRate) / 100;
        } else if (penaltyType === 'total') {
          penaltyAmount = ((depositAmount + interestEarned) * penaltyRate) / 100;
        }
      }

      // Calculate total payout amount
      const totalPayoutAmount = depositAmount + interestEarned - penaltyAmount;

      return {
        accountId: request.accountId,
        depositAmount: depositAmount.toFixed(2),
        interestEarned: interestEarned.toFixed(2),
        penaltyAmount: penaltyAmount.toFixed(2),
        penaltyRate,
        penaltyApplicable,
        penaltyType,
        totalPayoutAmount: totalPayoutAmount.toFixed(2),
        daysCompleted,
        percentageComplete,
        originalMaturityDate: maturityDate.toISOString().split('T')[0],
        currency: account.currency_code
      };
    } catch (error) {
      logger.error('Error calculating premature closure for recurring deposit account', { 
        error, 
        accountId: request.accountId 
      });
      throw error;
    }
  }

  /**
   * Process premature closure of a recurring deposit account
   * @param accountId Account ID
   * @param options Premature closure options
   * @param userId Current user ID
   * @returns Premature closure result
   */
  async processPrematureClosure(
    accountId: string,
    options: PrematureClosureOptions,
    userId?: string
  ): Promise<PrematureClosureResult> {
    logger.info('Processing premature closure for recurring deposit account', { 
      accountId, 
      closureDate: options.closureDate
    });

    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.id as savings_account_id, sa.status, sa.currency_code, sa.approved_on_date,
                  sa.activated_on_date, sa.client_id, sa.group_id, rdp.pre_closure_penal_applicable, 
                  rdp.pre_closure_penal_interest, rdp.pre_closure_penal_interest_on_type_enum
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           JOIN recurring_deposit_product rdp ON rda.product_id = rdp.id
           WHERE rda.id = $1`,
          [accountId]
        );

        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }

        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'active') {
          throw new Error(`Cannot prematurely close account with status ${account.status}`);
        }

        // Validate account allows premature closure
        if (!account.is_premature_closure_allowed) {
          throw new Error('Premature closure is not allowed for this account');
        }

        // Calculate existing deposit amount
        const depositAmount = parseFloat(account.total_deposits) || 0;

        // Get activation date
        const activationDate = account.activated_on_date || account.approved_on_date;
        if (!activationDate) {
          throw new Error('Account activation date is not available');
        }

        // Get original maturity date
        const maturityDate = account.expected_maturity_date;
        if (!maturityDate) {
          throw new Error('Expected maturity date is not available');
        }

        // Calculate days completed
        const closureDate = new Date(options.closureDate);
        const startDate = new Date(activationDate);
        const endDate = new Date(maturityDate);

        const daysCompleted = Math.floor((closureDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const percentageComplete = totalDays > 0 ? (daysCompleted / totalDays) * 100 : 0;

        // Calculate earned interest up to the closure date
        let interestEarned = 0;

        // Check if we need to calculate additional interest
        const lastInterestPostedDate = account.last_interest_posted_date 
          ? new Date(account.last_interest_posted_date) 
          : null;

        if (!lastInterestPostedDate || lastInterestPostedDate < closureDate) {
          // Calculate interest from last posting date to closure date
          const lastPostingDate = lastInterestPostedDate 
            ? lastInterestPostedDate.toISOString().split('T')[0] 
            : activationDate.toISOString().split('T')[0];
          
          // Calculate final interest
          const interestResult = await recurringDepositInterestService.calculateInterest(
            accountId,
            options.closureDate,
            lastPostingDate,
            options.closureDate
          );
          
          // Post the final interest if it's more than zero
          if (parseFloat(interestResult.interestEarned) > 0) {
            await recurringDepositInterestService.postInterest(
              accountId,
              interestResult.interestEarned,
              options.closureDate,
              lastPostingDate,
              options.closureDate,
              userId
            );
          }
          
          interestEarned = parseFloat(interestResult.interestEarned);
        }

        // Add existing interest earned
        interestEarned += parseFloat(account.interest_earned) || 0;

        // Apply penalty if applicable
        let penaltyAmount = 0;
        const penaltyApplicable = options.applyPenalty !== false && account.pre_closure_penal_applicable;
        let penaltyRate = options.overridePenaltyRate || parseFloat(account.pre_closure_penal_interest) || 0;
        let penaltyType = account.pre_closure_penal_interest_on_type_enum || 'interest';

        if (penaltyApplicable && penaltyRate > 0) {
          // Calculate penalty based on the type
          if (penaltyType === 'principal') {
            penaltyAmount = (depositAmount * penaltyRate) / 100;
          } else if (penaltyType === 'interest') {
            penaltyAmount = (interestEarned * penaltyRate) / 100;
          } else if (penaltyType === 'total') {
            penaltyAmount = ((depositAmount + interestEarned) * penaltyRate) / 100;
          }
        }

        // Calculate total payout amount
        const totalPayoutAmount = depositAmount + interestEarned - penaltyAmount;

        // Create payment details if provided
        let paymentDetailId = null;
        if (options.paymentTypeId && options.closureReason === 'withdrawal') {
          paymentDetailId = uuidv4();
          
          await client.query(
            `INSERT INTO payment_detail (
              id, payment_type_id, account_number, check_number,
              routing_code, receipt_number, bank_number, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              paymentDetailId,
              options.paymentTypeId,
              options.accountNumber || null,
              options.checkNumber || null,
              options.routingCode || null,
              options.receiptNumber || null,
              options.bankNumber || null
            ]
          );
        }

        // Process closure based on closure type
        let transactionId = null;
        let transferAccountId = null;

        if (options.closureReason === 'transfer') {
          // Validate target savings account
          if (!options.transferToAccountId) {
            throw new Error('Savings account ID is required for transfer');
          }
          
          const savingsResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1 AND status = $2',
            [options.transferToAccountId, 'active']
          );
          
          if (savingsResult.rowCount === 0) {
            throw new Error(`Active savings account with ID ${options.transferToAccountId} not found`);
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
              options.transferToAccountId,
              'deposit',
              closureDate,
              totalPayoutAmount,
              account.currency_code,
              `Transfer from prematurely closed recurring deposit #${accountId}`,
              false,
              userId || null
            ]
          );
          
          transactionId = transferTransactionId;
          transferAccountId = options.transferToAccountId;
          
          // Update target account
          await client.query(
            `UPDATE savings_account
             SET last_modified_by = $1,
                 last_modified_date = NOW()
             WHERE id = $2`,
            [userId || null, options.transferToAccountId]
          );
        } else {
          // Withdrawal or other reasons
          const withdrawalTransactionId = uuidv4();
          
          await client.query(
            `INSERT INTO savings_account_transaction (
              id, savings_account_id, payment_detail_id, transaction_type, transaction_date,
              amount, currency_code, description, is_reversed,
              created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              withdrawalTransactionId,
              account.savings_account_id,
              paymentDetailId,
              'withdrawal',
              closureDate,
              totalPayoutAmount,
              account.currency_code,
              `Premature closure of recurring deposit #${accountId}`,
              false,
              userId || null
            ]
          );
          
          transactionId = withdrawalTransactionId;
        }

        // Create recurring deposit transaction record
        const rdTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_transaction (
            id, savings_account_transaction_id, recurring_deposit_account_id,
            transaction_type, amount, balance_after_transaction,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            rdTransactionId,
            transactionId,
            accountId,
            'premature_closure',
            totalPayoutAmount,
            0, // Balance is zero after closure
            userId || null
          ]
        );

        // Create premature closure history record
        const closureId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_premature_closure_history (
            id, account_id, closure_date, maturity_date, closure_principal_amount,
            interest_amount, penalty_amount, total_amount, penalty_interest_rate,
            closure_reason, closure_transaction_id, transfer_to_account_id,
            closure_note, days_completed, percentage_period_complete,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
          [
            closureId,
            accountId,
            closureDate,
            maturityDate,
            depositAmount,
            interestEarned,
            penaltyAmount,
            totalPayoutAmount,
            penaltyRate,
            options.closureReason,
            transactionId,
            transferAccountId,
            options.note || null,
            daysCompleted,
            percentageComplete,
            userId || null
          ]
        );

        // Update recurring deposit account
        await client.query(
          `UPDATE recurring_deposit_account
           SET maturity_amount = $1,
               maturity_date = $2,
               interest_earned = $3,
               last_modified_by = $4,
               last_modified_date = NOW()
           WHERE id = $5`,
          [
            totalPayoutAmount,
            closureDate,
            interestEarned,
            userId || null,
            accountId
          ]
        );

        // Update savings account status
        await client.query(
          `UPDATE savings_account
           SET status = 'premature_closed',
               closed_on_date = $1,
               closed_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [closureDate, userId || null, account.savings_account_id]
        );

        // Add record to maturity history for completeness
        await client.query(
          `INSERT INTO recurring_deposit_maturity_history (
            id, account_id, maturity_type, processed_date, maturity_amount,
            action_taken, transfer_transaction_id, transferred_to_account_id,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [
            uuidv4(),
            accountId,
            'prematurely_closed',
            closureDate,
            totalPayoutAmount,
            options.closureReason === 'transfer' ? 'transfer_to_savings' : 'withdrawal',
            transactionId,
            transferAccountId,
            userId || null
          ]
        );

        // Add note
        await client.query(
          `INSERT INTO savings_account_note (
            id, savings_account_id, note, created_by, created_date
          ) VALUES ($1, $2, $3, $4, NOW())`,
          [
            uuidv4(), 
            account.savings_account_id, 
            options.note || 'Account prematurely closed', 
            userId || null
          ]
        );

        return {
          accountId,
          closureId,
          closureDate: options.closureDate,
          depositAmount: depositAmount.toString(),
          interestAmount: interestEarned.toString(),
          penaltyAmount: penaltyAmount.toString(),
          totalAmount: totalPayoutAmount.toString(),
          transactionId,
          transferAccountId: transferAccountId || undefined
        };
      });
    } catch (error) {
      logger.error('Error processing premature closure for recurring deposit account', { 
        error, 
        accountId, 
        closureDate: options.closureDate 
      });
      throw error;
    }
  }

  /**
   * Get premature closure history for an account
   * @param accountId Account ID
   * @returns Premature closure history
   */
  async getPrematureClosureHistory(accountId: string): Promise<any> {
    logger.info('Getting premature closure history for recurring deposit account', { accountId });

    try {
      const result = await query(
        `SELECT rdpc.*, 
                sa.account_no,
                transfer_sa.account_no as transfer_account_no,
                c.first_name || ' ' || c.last_name as client_name,
                c.id as client_id
         FROM recurring_deposit_premature_closure_history rdpc
         JOIN recurring_deposit_account rda ON rdpc.account_id = rda.id
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         LEFT JOIN savings_account transfer_sa ON rdpc.transfer_to_account_id = transfer_sa.id
         LEFT JOIN client c ON sa.client_id = c.id
         WHERE rdpc.account_id = $1
         ORDER BY rdpc.closure_date DESC`,
        [accountId]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting premature closure history for recurring deposit account', { error, accountId });
      throw error;
    }
  }
}

// Export a singleton instance
export const recurringDepositPrematureClosureService = new RecurringDepositPrematureClosureService();