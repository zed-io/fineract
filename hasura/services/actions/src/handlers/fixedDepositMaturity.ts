import { Request, Response } from 'express';
import { handleError } from '../utils/errorHandler';
import logger from '../utils/logger';
import { authMiddleware } from '../utils/authMiddleware';
import db from '../utils/db';

/**
 * Get maturity details for a fixed deposit account
 */
export const getFixedDepositMaturityDetails = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { accountId } = req.body.input;
      logger.info(`Getting maturity details for fixed deposit account: ${accountId}`);

      // Get fixed deposit account details including maturity information
      const accountQuery = `
        SELECT 
          fda.id, 
          sa.account_no, 
          fda.maturity_date, 
          fda.maturity_amount,
          fda.on_account_closure_type,
          fda.transfer_to_savings_account_id,
          sa_transfer.account_no as transfer_to_savings_account_no,
          fda.deposit_period as renewal_term,
          fda.deposit_period_frequency_type_enum as renewal_term_frequency_type,
          fda.interest_earned as interest_at_maturity,
          fda.deposit_amount as total_principal
        FROM 
          fixed_deposit_account fda
        JOIN 
          savings_account sa ON fda.savings_account_id = sa.id
        LEFT JOIN 
          savings_account sa_transfer ON fda.transfer_to_savings_account_id = sa_transfer.id
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

      // Map closure type enum to required format
      const closureTypeEnum = {
        id: getClosureTypeId(account.on_account_closure_type),
        code: account.on_account_closure_type,
        value: getClosureTypeLabel(account.on_account_closure_type)
      };

      // Map frequency type enum to required format if not null
      let renewalTermFrequencyType = null;
      if (account.renewal_term_frequency_type) {
        renewalTermFrequencyType = {
          id: getFrequencyTypeId(account.renewal_term_frequency_type),
          code: account.renewal_term_frequency_type,
          value: getFrequencyTypeLabel(account.renewal_term_frequency_type)
        };
      }
      
      return res.json({
        accountId: account.id,
        accountNo: account.account_no,
        maturityDate: account.maturity_date,
        maturityAmount: account.maturity_amount,
        currentMaturityInstructions: closureTypeEnum,
        transferToSavingsAccountId: account.transfer_to_savings_account_id,
        transferToSavingsAccountNo: account.transfer_to_savings_account_no,
        renewalTerm: account.renewal_term,
        renewalTermFrequencyType: renewalTermFrequencyType,
        interestAtMaturity: account.interest_at_maturity,
        totalPrincipal: account.total_principal,
        availableSavingsAccounts: availableSavingsAccounts
      });
    } catch (error) {
      handleError(error, res);
    }
  }
];

/**
 * Get maturity history for a fixed deposit account
 */
export const getFixedDepositMaturityHistory = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { accountId } = req.body.input;
      logger.info(`Getting maturity history for fixed deposit account: ${accountId}`);

      // Get account to verify it exists
      const accountQuery = `
        SELECT 
          fda.id 
        FROM 
          fixed_deposit_account fda
        WHERE 
          fda.id = $1
      `;
      
      const accountResult = await db.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        return res.status(404).json({
          message: "Fixed deposit account not found"
        });
      }

      // Get maturity history
      const historyQuery = `
        SELECT 
          fdmp.id,
          fdmp.original_maturity_date,
          fdmp.processed_date,
          fdmp.maturity_amount,
          fdmp.processing_result,
          fdmp.renewed_fixed_deposit_account_id,
          sa_renewed.account_no as renewed_account_no,
          fdmp.transaction_id
        FROM 
          fixed_deposit_maturity_processing fdmp
        LEFT JOIN 
          fixed_deposit_account fda_renewed ON fdmp.renewed_fixed_deposit_account_id = fda_renewed.id
        LEFT JOIN 
          savings_account sa_renewed ON fda_renewed.savings_account_id = sa_renewed.id
        WHERE 
          fdmp.fixed_deposit_account_id = $1
        ORDER BY 
          fdmp.processed_date DESC
      `;
      
      const historyResult = await db.query(historyQuery, [accountId]);
      
      // Map history entries to required format
      const maturityHistory = historyResult.rows.map(entry => ({
        id: entry.id,
        originalMaturityDate: entry.original_maturity_date,
        processedDate: entry.processed_date,
        maturityAmount: entry.maturity_amount,
        processingResult: entry.processing_result,
        renewedAccountId: entry.renewed_fixed_deposit_account_id,
        renewedAccountNo: entry.renewed_account_no,
        transactionId: entry.transaction_id
      }));
      
      return res.json({
        accountId,
        maturityHistory
      });
    } catch (error) {
      handleError(error, res);
    }
  }
];

/**
 * Process maturity for a fixed deposit account
 */
export const processFixedDepositMaturity = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { accountId, processDate } = req.body.input;
      logger.info(`Processing maturity for fixed deposit account: ${accountId} on ${processDate}`);

      // Begin transaction
      await db.query('BEGIN');

      // Get account details
      const accountQuery = `
        SELECT 
          fda.id,
          sa.account_no,
          fda.maturity_date,
          fda.maturity_amount,
          fda.on_account_closure_type,
          fda.transfer_to_savings_account_id,
          fda.deposit_period,
          fda.deposit_period_frequency_type_enum,
          fda.interest_rate,
          fda.product_id,
          sa.client_id,
          sa.status_enum
        FROM 
          fixed_deposit_account fda
        JOIN 
          savings_account sa ON fda.savings_account_id = sa.id
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
          message: "Cannot process maturity for a non-active account"
        });
      }
      
      // Verify that maturity date has arrived
      const maturityDate = new Date(account.maturity_date);
      const processDateObj = new Date(processDate);
      
      if (processDateObj < maturityDate) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Cannot process maturity before the maturity date"
        });
      }
      
      // Process based on maturity instructions
      let processingResult;
      let renewedAccountId = null;
      let renewedAccountNo = null;
      let transactionId = null;
      let message = '';

      switch (account.on_account_closure_type) {
        case 'withdraw_deposit':
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
              'maturity',
              $2,
              0,
              NOW(),
              $3
            )
            RETURNING id
          `;
          
          const withdrawTxnResult = await db.query(withdrawTxnQuery, [
            accountId,
            account.maturity_amount,
            req.user.id
          ]);
          
          transactionId = withdrawTxnResult.rows[0].id;
          processingResult = 'withdrawn';
          message = 'Fixed deposit has matured and funds have been withdrawn';
          break;
          
        case 'transfer_to_savings':
          // Verify transfer account exists
          if (!account.transfer_to_savings_account_id) {
            await db.query('ROLLBACK');
            return res.status(400).json({
              message: "No transfer savings account specified for maturity"
            });
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
              'maturity',
              $2,
              0,
              NOW(),
              $3
            )
            RETURNING id
          `;
          
          const transferTxnResult = await db.query(transferTxnQuery, [
            accountId,
            account.maturity_amount,
            req.user.id
          ]);
          
          transactionId = transferTxnResult.rows[0].id;
          
          // Update savings account balance
          const updateSavingsQuery = `
            UPDATE savings_account
            SET account_balance = account_balance + $1,
                last_modified_date = NOW(),
                last_modified_by = $2
            WHERE id = $3
          `;
          
          await db.query(updateSavingsQuery, [
            account.maturity_amount,
            req.user.id,
            account.transfer_to_savings_account_id
          ]);
          
          processingResult = 'transferred_to_savings';
          message = 'Fixed deposit has matured and funds have been transferred to savings account';
          break;
          
        case 'reinvest':
          // Create a new fixed deposit account
          const newAccountNoQuery = `
            SELECT COALESCE(MAX(CAST(SUBSTRING(account_no FROM '\\d+') AS INTEGER)), 0) + 1 AS next_no
            FROM savings_account
            WHERE account_no LIKE 'FD%'
          `;
          
          const newAccountNoResult = await db.query(newAccountNoQuery);
          const newAccountNo = `FD${newAccountNoResult.rows[0].next_no.toString().padStart(6, '0')}`;
          
          // Create new savings account for the fixed deposit
          const newSavingsQuery = `
            INSERT INTO savings_account (
              account_no,
              client_id,
              product_id,
              field_officer_id,
              status_enum,
              account_type_enum,
              deposit_type_enum,
              submitted_on_date,
              submitted_by_user_id,
              approved_on_date,
              approved_by_user_id,
              activated_on_date,
              activated_by_user_id,
              currency_code,
              currency_digits,
              currency_multiplesof,
              nominal_annual_interest_rate,
              interest_compounding_period_enum,
              interest_posting_period_enum,
              interest_calculation_type_enum,
              interest_calculation_days_in_year_type_enum,
              account_balance,
              min_required_balance,
              enforce_min_required_balance,
              created_date,
              created_by
            )
            SELECT 
              $1 as account_no,
              sa.client_id,
              sa.product_id,
              sa.field_officer_id,
              300 as status_enum, -- Active
              sa.account_type_enum,
              sa.deposit_type_enum,
              $2 as submitted_on_date,
              $3 as submitted_by_user_id,
              $2 as approved_on_date,
              $3 as approved_by_user_id,
              $2 as activated_on_date,
              $3 as activated_by_user_id,
              sa.currency_code,
              sa.currency_digits,
              sa.currency_multiplesof,
              sa.nominal_annual_interest_rate,
              sa.interest_compounding_period_enum,
              sa.interest_posting_period_enum,
              sa.interest_calculation_type_enum,
              sa.interest_calculation_days_in_year_type_enum,
              $4 as account_balance,
              sa.min_required_balance,
              sa.enforce_min_required_balance,
              NOW() as created_date,
              $3 as created_by
            FROM 
              savings_account sa
            WHERE 
              sa.id = (SELECT savings_account_id FROM fixed_deposit_account WHERE id = $5)
            RETURNING id
          `;
          
          const newSavingsResult = await db.query(newSavingsQuery, [
            newAccountNo,
            processDate,
            req.user.id,
            account.maturity_amount,
            accountId
          ]);
          
          const newSavingsAccountId = newSavingsResult.rows[0].id;
          
          // Calculate new maturity date
          const newMaturityDate = calculateNewMaturityDate(
            processDateObj,
            account.deposit_period,
            account.deposit_period_frequency_type_enum
          );
          
          // Create new fixed deposit account
          const newFixedDepositQuery = `
            INSERT INTO fixed_deposit_account (
              savings_account_id,
              product_id,
              deposit_amount,
              maturity_amount,
              maturity_date,
              deposit_period,
              deposit_period_frequency_type_enum,
              interest_rate,
              is_renewal_allowed,
              is_premature_closure_allowed,
              pre_closure_penal_applicable,
              pre_closure_penal_interest,
              pre_closure_penal_interest_on_type_enum,
              on_account_closure_type,
              transfer_to_savings_account_id,
              linked_account_id,
              transfer_interest_to_linked_account,
              created_date,
              created_by
            )
            SELECT 
              $1 as savings_account_id,
              fda.product_id,
              $2 as deposit_amount,
              NULL as maturity_amount, -- Will be calculated later
              $3 as maturity_date,
              fda.deposit_period,
              fda.deposit_period_frequency_type_enum,
              fda.interest_rate,
              fda.is_renewal_allowed,
              fda.is_premature_closure_allowed,
              fda.pre_closure_penal_applicable,
              fda.pre_closure_penal_interest,
              fda.pre_closure_penal_interest_on_type_enum,
              fda.on_account_closure_type,
              fda.transfer_to_savings_account_id,
              fda.linked_account_id,
              fda.transfer_interest_to_linked_account,
              NOW() as created_date,
              $4 as created_by
            FROM 
              fixed_deposit_account fda
            WHERE 
              fda.id = $5
            RETURNING id
          `;
          
          const newFixedDepositResult = await db.query(newFixedDepositQuery, [
            newSavingsAccountId,
            account.maturity_amount,
            newMaturityDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            req.user.id,
            accountId
          ]);
          
          renewedAccountId = newFixedDepositResult.rows[0].id;
          renewedAccountNo = newAccountNo;
          
          // Create maturity transaction
          const maturityTxnQuery = `
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
              'maturity',
              $2,
              0,
              NOW(),
              $3
            )
            RETURNING id
          `;
          
          const maturityTxnResult = await db.query(maturityTxnQuery, [
            accountId,
            account.maturity_amount,
            req.user.id
          ]);
          
          transactionId = maturityTxnResult.rows[0].id;
          processingResult = 'renewed';
          message = 'Fixed deposit has matured and been renewed with a new account';
          break;
          
        default:
          await db.query('ROLLBACK');
          return res.status(400).json({
            message: "Invalid maturity instruction specified"
          });
      }
      
      // Update original account to mark it as matured
      const updateAccountQuery = `
        UPDATE savings_account
        SET status_enum = 800, -- Matured status
            closed_on_date = $1,
            closed_by_user_id = $2,
            last_modified_date = NOW(),
            last_modified_by = $2
        WHERE id = (SELECT savings_account_id FROM fixed_deposit_account WHERE id = $3)
      `;
      
      await db.query(updateAccountQuery, [
        processDate,
        req.user.id,
        accountId
      ]);
      
      // Record maturity processing
      const maturityProcessingQuery = `
        INSERT INTO fixed_deposit_maturity_processing (
          fixed_deposit_account_id,
          original_maturity_date,
          processed_date,
          maturity_amount,
          processing_result,
          renewed_fixed_deposit_account_id,
          transaction_id,
          created_date,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), $8
        )
      `;
      
      await db.query(maturityProcessingQuery, [
        accountId,
        account.maturity_date,
        processDate,
        account.maturity_amount,
        processingResult,
        renewedAccountId,
        transactionId,
        req.user.id
      ]);
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return res.json({
        accountId,
        processedDate: processDate,
        maturityAmount: account.maturity_amount,
        processingResult,
        renewedAccountId,
        renewedAccountNo,
        transactionId,
        message
      });
    } catch (error) {
      await db.query('ROLLBACK');
      handleError(error, res);
    }
  }
];

/**
 * Update maturity instructions for a fixed deposit account
 */
export const updateFixedDepositMaturityInstructions = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { 
        accountId, 
        onAccountClosureType, 
        transferToSavingsAccountId, 
        transferDescription,
        renewalPeriod,
        renewalPeriodFrequencyType
      } = req.body.input;
      
      logger.info(`Updating maturity instructions for fixed deposit account: ${accountId}`);

      // Begin transaction
      await db.query('BEGIN');

      // Get account details
      const accountQuery = `
        SELECT 
          fda.id,
          sa.account_no,
          sa.status_enum
        FROM 
          fixed_deposit_account fda
        JOIN 
          savings_account sa ON fda.savings_account_id = sa.id
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
      
      // Verify that account is active or submitted and pending approval
      if (account.status_enum !== 300 && account.status_enum !== 100) { // Active or submitted
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Cannot update maturity instructions for a matured or closed account"
        });
      }

      // Validate the input values
      if (!isValidClosureType(onAccountClosureType)) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Invalid account closure type"
        });
      }

      // Validate transfer account if closure type is transfer_to_savings
      if (onAccountClosureType === 'transfer_to_savings' && !transferToSavingsAccountId) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          message: "Transfer savings account must be specified for transfer to savings maturity option"
        });
      }

      // Validate renewal details if closure type is reinvest
      if (onAccountClosureType === 'reinvest') {
        if (renewalPeriod && (!renewalPeriodFrequencyType || !isValidFrequencyType(renewalPeriodFrequencyType))) {
          await db.query('ROLLBACK');
          return res.status(400).json({
            message: "Valid renewal period frequency type must be specified for renewal period"
          });
        }
      }

      // Update maturity instructions
      let updateQuery = `
        UPDATE fixed_deposit_account
        SET on_account_closure_type = $1,
            transfer_to_savings_account_id = $2,
            last_modified_date = NOW(),
            last_modified_by = $3
      `;
      
      const queryParams = [
        onAccountClosureType,
        onAccountClosureType === 'transfer_to_savings' ? transferToSavingsAccountId : null,
        req.user.id
      ];
      
      // Add renewal period details if provided
      if (onAccountClosureType === 'reinvest' && renewalPeriod && renewalPeriodFrequencyType) {
        updateQuery += `, deposit_period = $4, deposit_period_frequency_type_enum = $5`;
        queryParams.push(renewalPeriod, renewalPeriodFrequencyType);
      }
      
      updateQuery += ` WHERE id = $${queryParams.length + 1}`;
      queryParams.push(accountId);
      
      await db.query(updateQuery, queryParams);
      
      // Commit the transaction
      await db.query('COMMIT');
      
      return res.json({
        accountId,
        onAccountClosureType,
        transferToSavingsAccountId: onAccountClosureType === 'transfer_to_savings' ? transferToSavingsAccountId : null
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

function getClosureTypeId(closureType: string): number {
  const closureTypeMap: { [key: string]: number } = {
    'withdraw_deposit': 100,
    'transfer_to_savings': 200,
    'reinvest': 300,
    'transfer_to_linked_account': 400
  };
  
  return closureTypeMap[closureType] || 0;
}

function getClosureTypeLabel(closureType: string): string {
  const closureTypeMap: { [key: string]: string } = {
    'withdraw_deposit': 'Withdraw deposit',
    'transfer_to_savings': 'Transfer to savings',
    'reinvest': 'Reinvest',
    'transfer_to_linked_account': 'Transfer to linked account'
  };
  
  return closureTypeMap[closureType] || 'Unknown';
}

function isValidClosureType(closureType: string): boolean {
  return ['withdraw_deposit', 'transfer_to_savings', 'reinvest', 'transfer_to_linked_account'].includes(closureType);
}

function getFrequencyTypeId(frequencyType: string): number {
  const frequencyTypeMap: { [key: string]: number } = {
    'days': 0,
    'weeks': 1,
    'months': 2,
    'years': 3
  };
  
  return frequencyTypeMap[frequencyType] || 0;
}

function getFrequencyTypeLabel(frequencyType: string): string {
  const frequencyTypeMap: { [key: string]: string } = {
    'days': 'Days',
    'weeks': 'Weeks',
    'months': 'Months',
    'years': 'Years'
  };
  
  return frequencyTypeMap[frequencyType] || 'Unknown';
}

function isValidFrequencyType(frequencyType: string): boolean {
  return ['days', 'weeks', 'months', 'years'].includes(frequencyType);
}

function calculateNewMaturityDate(
  startDate: Date,
  period: number,
  frequencyType: string
): Date {
  const result = new Date(startDate);
  
  switch (frequencyType) {
    case 'days':
      result.setDate(result.getDate() + period);
      break;
    case 'weeks':
      result.setDate(result.getDate() + (period * 7));
      break;
    case 'months':
      result.setMonth(result.getMonth() + period);
      break;
    case 'years':
      result.setFullYear(result.getFullYear() + period);
      break;
    default:
      break;
  }
  
  return result;
}