import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import logger from '../utils/logger';
import { authMiddleware } from '../utils/authMiddleware';
import db from '../utils/db';

/**
 * Get premature closure details for a fixed deposit account
 */
export const getFixedDepositPrematureClosureDetails = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { accountId, closureDate } = req.body.input;
      logger.info(`Getting premature closure details for fixed deposit account: ${accountId}, closure date: ${closureDate}`);

      // Get fixed deposit account details
      const accountQuery = `
        SELECT 
          fda.id, 
          sa.account_no,
          sa.activated_on_date as deposit_start_date,
          fda.maturity_date as original_maturity_date,
          fda.deposit_amount,
          fda.interest_earned,
          fda.is_premature_closure_allowed,
          fda.pre_closure_penal_applicable,
          fda.pre_closure_penal_interest,
          fda.pre_closure_penal_interest_on_type_enum,
          fdp.pre_closure_penal_calculation_method
        FROM 
          fixed_deposit_account fda
        JOIN 
          savings_account sa ON fda.savings_account_id = sa.id
        JOIN
          fixed_deposit_product fdp ON fda.product_id = fdp.id
        WHERE 
          fda.id = $1
      `;
      
      const accountResult = await db.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        return res.status(404).json({
          message: "Fixed deposit account not found"
        });
      }

      const account = accountResult.rows[0];
      
      // Check if premature closure is allowed
      if (!account.is_premature_closure_allowed) {
        return res.status(400).json({
          message: "Premature closure is not allowed for this account"
        });
      }

      // Get transactions to calculate interest posted
      const transactionsQuery = `
        SELECT 
          SUM(CASE WHEN transaction_type = 'interest_posting' THEN amount ELSE 0 END) as interest_posted
        FROM 
          fixed_deposit_transaction
        WHERE 
          fixed_deposit_account_id = $1
          AND is_reversed = FALSE
      `;
      
      const transactionsResult = await db.query(transactionsQuery, [accountId]);
      const interestPosted = transactionsResult.rows[0].interest_posted || 0;

      // Calculate the deposit period in days
      const depositStartDate = new Date(account.deposit_start_date);
      const originalMaturityDate = new Date(account.original_maturity_date);
      const closureDateObj = new Date(closureDate);
      
      const depositPeriodInDays = Math.floor((originalMaturityDate.getTime() - depositStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const completedPeriodInDays = Math.floor((closureDateObj.getTime() - depositStartDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate penalty amount
      let penaltyAmount = 0;
      let penaltyCalculationMethod = 'No penalty applicable';
      
      if (account.pre_closure_penal_applicable) {
        penaltyCalculationMethod = getPenaltyCalculationMethodLabel(account.pre_closure_penal_calculation_method);
        
        if (account.pre_closure_penal_calculation_method === 'flat_amount') {
          penaltyAmount = account.pre_closure_penal_interest || 0;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_interest') {
          // Apply penalty as a percentage of interest
          const interestToConsider = account.pre_closure_penal_interest_on_type_enum === 'whole_term'
            ? account.interest_earned
            : interestPosted;
          
          penaltyAmount = (interestToConsider * (account.pre_closure_penal_interest || 0)) / 100;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_principal') {
          // Apply penalty as a percentage of principal
          penaltyAmount = (account.deposit_amount * (account.pre_closure_penal_interest || 0)) / 100;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_total_amount') {
          // Apply penalty as a percentage of total amount (principal + interest)
          penaltyAmount = ((account.deposit_amount + interestPosted) * (account.pre_closure_penal_interest || 0)) / 100;
        }
      }

      // Calculate total payout amount
      const totalPayoutAmount = account.deposit_amount + interestPosted - penaltyAmount;
      
      // Get available savings accounts for transfer
      const savingsQuery = `
        SELECT 
          sa.id, 
          sa.account_no, 
          sp.name as product_name,
          sa.status_enum as status
        FROM 
          savings_account sa
        JOIN 
          savings_product sp ON sa.product_id = sp.id
        JOIN 
          fixed_deposit_account fda ON fda.id = $1
        WHERE 
          sa.client_id = (SELECT client_id FROM savings_account WHERE id = fda.savings_account_id)
          AND sa.status_enum = 300 -- Active accounts only
          AND sa.id != fda.savings_account_id
        ORDER BY 
          sa.account_no
      `;
      
      const savingsResult = await db.query(savingsQuery, [accountId]);
      
      // Map savings accounts to required format
      const availableSavingsAccounts = savingsResult.rows.map(acc => ({
        id: acc.id,
        accountNo: acc.account_no,
        productName: acc.product_name,
        status: getStatusLabel(acc.status)
      }));
      
      return res.json({
        accountId: account.id,
        accountNo: account.account_no,
        closureDate: closureDate,
        depositStartDate: account.deposit_start_date,
        originalMaturityDate: account.original_maturity_date,
        depositPeriodInDays,
        completedPeriodInDays,
        depositAmount: account.deposit_amount,
        interestAccrued: account.interest_earned || 0,
        interestPosted: interestPosted,
        penaltyAmount,
        penaltyCalculationMethod,
        totalPayoutAmount,
        availableSavingsAccounts
      });
    } catch (error) {
      handleError(error, res);
    }
  }
];

/**
 * Process premature closure for a fixed deposit account
 */
export const prematureCloseFixedDepositAccount = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { 
        accountId, 
        closedOnDate, 
        note, 
        onAccountClosureType,
        toSavingsAccountId,
        transferDescription,
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      } = req.body.input;
      
      logger.info(`Processing premature closure for fixed deposit account: ${accountId} on ${closedOnDate}`);

      // Begin transaction
      await db.query('BEGIN');

      // Get account details
      const accountQuery = `
        SELECT 
          fda.id,
          sa.account_no,
          sa.status_enum,
          fda.deposit_amount,
          fda.is_premature_closure_allowed,
          fda.pre_closure_penal_applicable,
          fda.pre_closure_penal_interest,
          fda.pre_closure_penal_interest_on_type_enum,
          fdp.pre_closure_penal_calculation_method
        FROM 
          fixed_deposit_account fda
        JOIN 
          savings_account sa ON fda.savings_account_id = sa.id
        JOIN
          fixed_deposit_product fdp ON fda.product_id = fdp.id
        WHERE 
          fda.id = $1
      `;
      
      const accountResult = await db.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          message: "Fixed deposit account not found"
        });
      }

      const account = accountResult.rows[0];
      
      // Verify that account is active
      if (account.status_enum !== 300) { // Active status
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Cannot process premature closure for a non-active account"
        });
      }
      
      // Check if premature closure is allowed
      if (!account.is_premature_closure_allowed) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Premature closure is not allowed for this account"
        });
      }

      // Get transactions to calculate interest posted
      const transactionsQuery = `
        SELECT 
          SUM(CASE WHEN transaction_type = 'interest_posting' THEN amount ELSE 0 END) as interest_posted
        FROM 
          fixed_deposit_transaction
        WHERE 
          fixed_deposit_account_id = $1
          AND is_reversed = FALSE
      `;
      
      const transactionsResult = await db.query(transactionsQuery, [accountId]);
      const interestPosted = transactionsResult.rows[0].interest_posted || 0;

      // Calculate penalty amount
      let penaltyAmount = 0;
      
      if (account.pre_closure_penal_applicable) {
        if (account.pre_closure_penal_calculation_method === 'flat_amount') {
          penaltyAmount = account.pre_closure_penal_interest || 0;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_interest') {
          // Apply penalty as a percentage of interest
          const interestToConsider = account.pre_closure_penal_interest_on_type_enum === 'whole_term'
            ? interestPosted // Use accrued interest for whole term
            : interestPosted;
          
          penaltyAmount = (interestToConsider * (account.pre_closure_penal_interest || 0)) / 100;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_principal') {
          // Apply penalty as a percentage of principal
          penaltyAmount = (account.deposit_amount * (account.pre_closure_penal_interest || 0)) / 100;
        } else if (account.pre_closure_penal_calculation_method === 'percentage_of_total_amount') {
          // Apply penalty as a percentage of total amount (principal + interest)
          penaltyAmount = ((account.deposit_amount + interestPosted) * (account.pre_closure_penal_interest || 0)) / 100;
        }
      }

      // Calculate total payout amount
      const totalPayoutAmount = account.deposit_amount + interestPosted - penaltyAmount;
      
      // Process based on closure type
      let transactionId = null;
      let transferAccountId = null;
      
      switch (onAccountClosureType) {
        case 'withdraw_deposit':
          // Create penalty transaction if applicable
          if (penaltyAmount > 0) {
            const penaltyTxnQuery = `
              INSERT INTO fixed_deposit_transaction (
                savings_account_transaction_id,
                fixed_deposit_account_id,
                transaction_type,
                amount,
                penalty_charges_portion,
                balance_after_transaction,
                created_date,
                created_by
              ) VALUES (
                uuid_generate_v4(),
                $1,
                'penalty_charge',
                $2,
                $2,
                0,
                NOW(),
                $3
              )
            `;
            
            await db.query(penaltyTxnQuery, [
              accountId,
              penaltyAmount,
              req.user.id
            ]);
          }
          
          // Create withdrawal transaction
          const withdrawTxnQuery = `
            INSERT INTO fixed_deposit_transaction (
              savings_account_transaction_id,
              fixed_deposit_account_id,
              transaction_type,
              amount,
              balance_after_transaction,
              created_date,
              created_by
            ) VALUES (
              uuid_generate_v4(),
              $1,
              'premature_closure',
              $2,
              0,
              NOW(),
              $3
            )
            RETURNING id
          `;
          
          const withdrawTxnResult = await db.query(withdrawTxnQuery, [
            accountId,
            totalPayoutAmount,
            req.user.id
          ]);
          
          transactionId = withdrawTxnResult.rows[0].id;
          break;
          
        case 'transfer_to_savings':
          // Verify transfer account exists
          if (!toSavingsAccountId) {
            await db.query('ROLLBACK');
            return res.status(400).json({
              message: "No transfer savings account specified for closure"
            });
          }
          
          // Create penalty transaction if applicable
          if (penaltyAmount > 0) {
            const penaltyTxnQuery = `
              INSERT INTO fixed_deposit_transaction (
                savings_account_transaction_id,
                fixed_deposit_account_id,
                transaction_type,
                amount,
                penalty_charges_portion,
                balance_after_transaction,
                created_date,
                created_by
              ) VALUES (
                uuid_generate_v4(),
                $1,
                'penalty_charge',
                $2,
                $2,
                0,
                NOW(),
                $3
              )
            `;
            
            await db.query(penaltyTxnQuery, [
              accountId,
              penaltyAmount,
              req.user.id
            ]);
          }
          
          // Create transfer transaction
          const transferTxnQuery = `
            INSERT INTO fixed_deposit_transaction (
              savings_account_transaction_id,
              fixed_deposit_account_id,
              transaction_type,
              amount,
              balance_after_transaction,
              created_date,
              created_by
            ) VALUES (
              uuid_generate_v4(),
              $1,
              'premature_closure',
              $2,
              0,
              NOW(),
              $3
            )
            RETURNING id
          `;
          
          const transferTxnResult = await db.query(transferTxnQuery, [
            accountId,
            totalPayoutAmount,
            req.user.id
          ]);
          
          transactionId = transferTxnResult.rows[0].id;
          transferAccountId = toSavingsAccountId;
          
          // Update savings account balance
          const updateSavingsQuery = `
            UPDATE savings_account
            SET account_balance = account_balance + $1,
                last_modified_date = NOW(),
                last_modified_by = $2
            WHERE id = $3
          `;
          
          await db.query(updateSavingsQuery, [
            totalPayoutAmount,
            req.user.id,
            toSavingsAccountId
          ]);
          
          break;
          
        default:
          await db.query('ROLLBACK');
          return res.status(400).json({
            message: "Invalid closure instruction specified"
          });
      }
      
      // Update original account to mark it as prematurely closed
      const updateAccountQuery = `
        UPDATE savings_account
        SET status_enum = 700, -- Premature closed status
            closed_on_date = $1,
            closed_by_user_id = $2,
            last_modified_date = NOW(),
            last_modified_by = $2
        WHERE id = (SELECT savings_account_id FROM fixed_deposit_account WHERE id = $3)
      `;
      
      await db.query(updateAccountQuery, [
        closedOnDate,
        req.user.id,
        accountId
      ]);
      
      // Record premature closure details
      const prematureClosureQuery = `
        INSERT INTO fixed_deposit_premature_closure (
          fixed_deposit_account_id,
          closure_date,
          closure_amount,
          penalty_amount,
          interest_adjusted,
          total_amount_paid,
          closed_by_user_id,
          transfer_to_account_id,
          transfer_transaction_id,
          reason,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $7
        )
      `;
      
      await db.query(prematureClosureQuery, [
        accountId,
        closedOnDate,
        account.deposit_amount,
        penaltyAmount,
        interestPosted,
        totalPayoutAmount,
        req.user.id,
        transferAccountId,
        transactionId,
        note
      ]);
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return res.json({
        accountId,
        savingsAccountId: transferAccountId || null,
        closedOnDate,
        totalAmount: totalPayoutAmount,
        penaltyAmount,
        transactionId,
        message: transferAccountId 
          ? `Fixed deposit has been prematurely closed and funds have been transferred to savings account`
          : `Fixed deposit has been prematurely closed and funds have been withdrawn`
      });
    } catch (error) {
      await db.query('ROLLBACK');
      handleError(error, res);
    }
  }
];

// Helper functions
function getStatusLabel(statusEnum: number): string {
  const statusMap: { [key: number]: string } = {
    100: 'Submitted and pending approval',
    200: 'Approved',
    300: 'Active',
    400: 'Withdrawn by applicant',
    500: 'Rejected',
    600: 'Closed',
    700: 'Premature closed',
    800: 'Matured'
  };
  
  return statusMap[statusEnum] || 'Unknown';
}

function getPenaltyCalculationMethodLabel(calculationMethod: string): string {
  const methodLabels: { [key: string]: string } = {
    'flat_amount': 'Flat Amount',
    'percentage_of_interest': 'Percentage of Interest',
    'percentage_of_principal': 'Percentage of Principal',
    'percentage_of_total_amount': 'Percentage of Total Amount (Principal + Interest)'
  };
  
  return methodLabels[calculationMethod] || 'Unknown';
}