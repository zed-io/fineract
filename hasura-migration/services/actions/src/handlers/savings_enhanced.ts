import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, BusinessRuleError } from '../utils/errorHandler';
import db from '../utils/db';

const router = Router();

/**
 * Create a new savings account
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { 
      clientId, 
      productId, 
      currencyCode,
      submittedOnDate,
      externalId = null,
      fieldOfficerId = null,
      nominalAnnualInterestRate = null,
      interestCompoundingPeriodType = null,
      interestPostingPeriodType = null,
      interestCalculationType = null,
      interestCalculationDaysInYearType = null,
      minRequiredOpeningBalance = null,
      lockinPeriodFrequency = null,
      lockinPeriodFrequencyType = null,
      withdrawalFeeForTransfers = false,
      allowOverdraft = false,
      overdraftLimit = null,
      minRequiredBalance = null,
      enforceMinRequiredBalance = false,
      // Additional fields for Trinidad Credit Union specific requirements
      accountPurpose = null,
      jointHolders = [],
      beneficiaries = [],
      additionalProperties = {}
    } = input;
    
    logger.info('Creating new savings account', { clientId, productId });

    // Validate essential inputs
    if (!clientId) throw new ValidationError('Client ID is required');
    if (!productId) throw new ValidationError('Product ID is required');
    if (!submittedOnDate) throw new ValidationError('Submitted date is required');

    // 1. Verify client exists
    const clientResult = await client.query(
      'SELECT id, display_name FROM client WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      throw new NotFoundError('Client not found');
    }
    
    const clientName = clientResult.rows[0].display_name;

    // 2. Verify product exists and get product details
    const productResult = await client.query(
      `SELECT 
        id, name, short_name, currency_code, currency_digits, 
        nominal_annual_interest_rate, interest_compounding_period_type,
        interest_posting_period_type, interest_calculation_type,
        interest_calculation_days_in_year_type, min_required_opening_balance,
        allow_overdraft, overdraft_limit, enforce_min_required_balance,
        min_required_balance
       FROM savings_product WHERE id = $1`,
      [productId]
    );
    
    if (productResult.rows.length === 0) {
      throw new NotFoundError('Savings product not found');
    }
    
    const product = productResult.rows[0];
    
    // Check currency matches if provided
    if (currencyCode && currencyCode !== product.currency_code) {
      throw new ValidationError(`Currency mismatch: product is in ${product.currency_code}`);
    }

    // 3. Generate unique account number
    // Format: S-[branch-code]-[year-month]-[sequential-number]
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    // Get a sequence number for the savings account
    const sequenceResult = await client.query('SELECT nextval(\'savings_account_sequence\') as seq_num');
    const sequenceNumber = sequenceResult.rows[0].seq_num.toString().padStart(6, '0');
    
    // Branch code - in a real system, this would come from the user's office/branch
    const branchCode = '001';
    
    const accountNo = `S-${branchCode}-${year}${month}-${sequenceNumber}`;

    // 4. Use product defaults for any missing fields
    const finalInterestRate = nominalAnnualInterestRate ?? product.nominal_annual_interest_rate;
    const finalCompoundingType = interestCompoundingPeriodType ?? product.interest_compounding_period_type;
    const finalPostingType = interestPostingPeriodType ?? product.interest_posting_period_type;
    const finalCalculationType = interestCalculationType ?? product.interest_calculation_type;
    const finalDaysInYear = interestCalculationDaysInYearType ?? product.interest_calculation_days_in_year_type;
    const finalMinOpeningBalance = minRequiredOpeningBalance ?? product.min_required_opening_balance;
    const finalAllowOverdraft = allowOverdraft ?? product.allow_overdraft;
    const finalOverdraftLimit = overdraftLimit ?? product.overdraft_limit;
    const finalEnforceMinBalance = enforceMinRequiredBalance ?? product.enforce_min_required_balance;
    const finalMinBalance = minRequiredBalance ?? product.min_required_balance;

    // 5. Create the savings account
    const savingsId = uuidv4();
    
    await client.query(
      `INSERT INTO savings_account (
        id, account_no, external_id, client_id, group_id, product_id, field_officer_id,
        status, sub_status, account_type, currency_code, currency_digits,
        nominal_annual_interest_rate, interest_compounding_period_type,
        interest_posting_period_type, interest_calculation_type,
        interest_calculation_days_in_year_type, min_required_opening_balance,
        lockin_period_frequency, lockin_period_frequency_type, withdrawal_fee_for_transfers,
        allow_overdraft, overdraft_limit, enforce_min_required_balance,
        min_required_balance, account_purpose, submitted_on_date,
        additional_properties, created_date, created_by
      ) VALUES (
        $1, $2, $3, $4, NULL, $5, $6,
        'submitted_and_pending_approval', 'none', 'individual', $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
        CURRENT_TIMESTAMP, $25
      )`, 
      [
        savingsId, accountNo, externalId, clientId, productId, fieldOfficerId,
        product.currency_code, product.currency_digits,
        finalInterestRate, finalCompoundingType, finalPostingType, finalCalculationType,
        finalDaysInYear, finalMinOpeningBalance, lockinPeriodFrequency, lockinPeriodFrequencyType,
        withdrawalFeeForTransfers, finalAllowOverdraft, finalOverdraftLimit,
        finalEnforceMinBalance, finalMinBalance, accountPurpose, submittedOnDate,
        JSON.stringify(additionalProperties), req.user?.id
      ]
    );

    // 6. Create summary record
    await client.query(
      `INSERT INTO savings_account_summary (
        savings_account_id, currency_code, total_deposits, total_withdrawals,
        total_interest_earned, total_fees_charged, account_balance,
        last_transaction_date, last_interest_calculation_date, created_date
      ) VALUES (
        $1, $2, 0, 0, 0, 0, 0, NULL, NULL, CURRENT_TIMESTAMP
      )`,
      [savingsId, product.currency_code]
    );

    // 7. Process joint holders if provided
    if (jointHolders && jointHolders.length > 0) {
      for (const holder of jointHolders) {
        // Verify each joint holder exists
        const holderResult = await client.query(
          'SELECT id FROM client WHERE id = $1',
          [holder.clientId]
        );
        
        if (holderResult.rows.length === 0) {
          throw new NotFoundError(`Joint holder client ID ${holder.clientId} not found`);
        }
        
        await client.query(
          `INSERT INTO savings_account_joint_holder (
            savings_account_id, client_id, relationship_type, is_authorized_signer,
            created_date, created_by
          ) VALUES (
            $1, $2, $3, $4, CURRENT_TIMESTAMP, $5
          )`,
          [
            savingsId, holder.clientId, holder.relationshipType,
            holder.isAuthorizedSigner || false, req.user?.id
          ]
        );
      }
    }

    // 8. Process beneficiaries if provided
    if (beneficiaries && beneficiaries.length > 0) {
      for (const beneficiary of beneficiaries) {
        await client.query(
          `INSERT INTO savings_account_beneficiary (
            savings_account_id, name, relationship_type, is_active,
            percentage_share, address, contact_number, email,
            created_date, created_by
          ) VALUES (
            $1, $2, $3, true, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8
          )`,
          [
            savingsId, beneficiary.name, beneficiary.relationshipType,
            beneficiary.percentageShare || 100, beneficiary.address || null,
            beneficiary.contactNumber || null, beneficiary.email || null,
            req.user?.id
          ]
        );
      }
    }

    // 9. Create initial transaction record if opening balance is specified
    if (finalMinOpeningBalance && finalMinOpeningBalance > 0) {
      // This would be handled during activation in the real implementation
      // Just making a note of it for now
      logger.info('Opening balance set, will be processed during activation', { 
        finalMinOpeningBalance 
      });
    }

    // 10. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'CREATE', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [savingsId, req.user?.id, 'Savings account created']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      savingsId,
      accountNo,
      clientId,
      clientName,
      productName: product.name,
      message: 'Savings account created successfully',
      status: 'submitted_and_pending_approval'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Approve a savings account
 */
router.post('/approve', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { accountId, approvedOnDate, note } = input;
    
    logger.info('Processing savings approval request', { accountId, approvedOnDate });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!approvedOnDate) throw new ValidationError('Approval date is required');

    // 2. Check if account exists and can be approved
    const accountResult = await client.query(
      `SELECT 
        id, account_no, client_id, product_id, status, sub_status, 
        submitted_on_date, currency_code
       FROM savings_account WHERE id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'submitted_and_pending_approval') {
      throw new BusinessRuleError(`Cannot approve account in ${account.status} status`);
    }
    
    // 4. Validate approval date is not before submission date
    const submittedDate = new Date(account.submitted_on_date);
    const approvalDate = new Date(approvedOnDate);
    
    if (approvalDate < submittedDate) {
      throw new ValidationError('Approval date cannot be before submission date');
    }

    // 5. Update account status
    await client.query(
      `UPDATE savings_account SET 
        status = 'approved', 
        approved_on_date = $1,
        approved_by = $2,
        last_modified_date = CURRENT_TIMESTAMP,
        last_modified_by = $3
       WHERE id = $4`,
      [approvedOnDate, req.user?.id, req.user?.id, accountId]
    );

    // 6. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'APPROVE', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [accountId, req.user?.id, note || 'Savings account approved']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      accountId,
      message: 'Savings account approved successfully',
      approvedOnDate
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Activate a savings account
 */
router.post('/activate', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { accountId, activatedOnDate, note } = input;
    
    logger.info('Processing savings activation request', { accountId, activatedOnDate });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!activatedOnDate) throw new ValidationError('Activation date is required');

    // 2. Check if account exists and can be activated
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.product_id, sa.status, 
        sa.sub_status, sa.approved_on_date, sa.currency_code, 
        sa.min_required_opening_balance, c.display_name as client_name,
        p.name as product_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       JOIN savings_product p ON sa.product_id = p.id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'approved') {
      throw new BusinessRuleError(`Cannot activate account in ${account.status} status`);
    }
    
    // 4. Validate activation date is not before approval date
    const approvedDate = new Date(account.approved_on_date);
    const activationDate = new Date(activatedOnDate);
    
    if (activationDate < approvedDate) {
      throw new ValidationError('Activation date cannot be before approval date');
    }

    // 5. Check if opening balance is required and handle it
    const openingBalance = parseFloat(account.min_required_opening_balance || '0');
    let openingBalanceTransactionId = null;
    
    if (openingBalance > 0) {
      // Create deposit transaction for opening balance
      openingBalanceTransactionId = uuidv4();
      
      await client.query(
        `INSERT INTO savings_transaction (
          id, savings_account_id, transaction_type, amount, 
          transaction_date, running_balance, is_reversed, 
          created_date, created_by, description
        ) VALUES (
          $1, $2, 'deposit', $3, $4, $3, false, 
          CURRENT_TIMESTAMP, $5, 'Initial deposit - opening balance'
        )`,
        [
          openingBalanceTransactionId, accountId, openingBalance, 
          activatedOnDate, req.user?.id
        ]
      );
      
      // Update account summary
      await client.query(
        `UPDATE savings_account_summary SET 
          total_deposits = $1,
          account_balance = $2,
          last_transaction_date = $3
         WHERE savings_account_id = $4`,
        [openingBalance, openingBalance, activatedOnDate, accountId]
      );
    }

    // 6. Update account status
    await client.query(
      `UPDATE savings_account SET 
        status = 'active', 
        activated_on_date = $1,
        activated_by = $2,
        last_modified_date = CURRENT_TIMESTAMP,
        last_modified_by = $3
       WHERE id = $4`,
      [activatedOnDate, req.user?.id, req.user?.id, accountId]
    );

    // 7. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'ACTIVATE', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [accountId, req.user?.id, note || 'Savings account activated']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      accountId,
      accountNo: account.account_no,
      clientName: account.client_name,
      productName: account.product_name,
      message: 'Savings account activated successfully',
      activatedOnDate,
      openingBalance,
      openingBalanceTransactionId
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Process a deposit to a savings account
 */
router.post('/deposit', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { 
      accountId, 
      transactionDate, 
      transactionAmount,
      paymentTypeId,
      note,
      receiptNumber,
      checkNumber,
      routingCode,
      bankNumber,
      accountNumber
    } = input;
    
    logger.info('Processing savings deposit request', { 
      accountId, transactionAmount, transactionDate 
    });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!transactionDate) throw new ValidationError('Transaction date is required');
    if (!transactionAmount) throw new ValidationError('Transaction amount is required');
    if (parseFloat(transactionAmount) <= 0) {
      throw new ValidationError('Transaction amount must be positive');
    }

    // 2. Check if account exists and is active
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status, sa.sub_status,
        sa.currency_code, sas.account_balance, 
        c.display_name as client_name,
        p.name as product_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       JOIN savings_product p ON sa.product_id = p.id
       JOIN savings_account_summary sas ON sa.id = sas.savings_account_id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'active') {
      throw new BusinessRuleError(`Cannot deposit to account in ${account.status} status`);
    }
    
    // Check if account is blocked for credit
    if (account.sub_status === 'block' || account.sub_status === 'block_credit') {
      throw new BusinessRuleError('Account is blocked for deposits');
    }

    // 4. Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = uuidv4();
      await client.query(
        `INSERT INTO payment_detail (
          id, payment_type_id, account_number, check_number, 
          receipt_number, bank_number, routing_code, 
          created_date, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8
        )`,
        [
          paymentDetailId, paymentTypeId, accountNumber || null,
          checkNumber || null, receiptNumber || null,
          bankNumber || null, routingCode || null, req.user?.id
        ]
      );
    }

    // 5. Calculate new balance
    const currentBalance = parseFloat(account.account_balance);
    const amount = parseFloat(transactionAmount);
    const newBalance = currentBalance + amount;

    // 6. Create deposit transaction
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO savings_transaction (
        id, savings_account_id, payment_detail_id, transaction_type, 
        amount, transaction_date, running_balance, is_reversed, 
        created_date, created_by, description
      ) VALUES (
        $1, $2, $3, 'deposit', $4, $5, $6, false, 
        CURRENT_TIMESTAMP, $7, $8
      )`,
      [
        transactionId, accountId, paymentDetailId, amount, 
        transactionDate, newBalance, req.user?.id, 
        note || 'Deposit transaction'
      ]
    );
    
    // 7. Update account summary
    await client.query(
      `UPDATE savings_account_summary SET 
        total_deposits = total_deposits + $1,
        account_balance = $2,
        last_transaction_date = $3
       WHERE savings_account_id = $4`,
      [amount, newBalance, transactionDate, accountId]
    );

    // 8. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes, amount
      ) VALUES (
        $1, 'DEPOSIT', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3, $4
      )`,
      [accountId, req.user?.id, note || 'Deposit transaction', amount]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      accountId,
      accountNo: account.account_no,
      clientName: account.client_name,
      message: 'Deposit processed successfully',
      transactionId,
      transactionDate,
      amount,
      runningBalance: newBalance,
      previousBalance: currentBalance,
      currencyCode: account.currency_code,
      transactionType: 'deposit',
      receiptNumber: receiptNumber || null
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Process a withdrawal from a savings account
 */
router.post('/withdraw', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { 
      accountId, 
      transactionDate, 
      transactionAmount,
      paymentTypeId,
      note,
      receiptNumber,
      checkNumber,
      routingCode,
      bankNumber,
      accountNumber
    } = input;
    
    logger.info('Processing savings withdrawal request', { 
      accountId, transactionAmount, transactionDate 
    });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!transactionDate) throw new ValidationError('Transaction date is required');
    if (!transactionAmount) throw new ValidationError('Transaction amount is required');
    if (parseFloat(transactionAmount) <= 0) {
      throw new ValidationError('Transaction amount must be positive');
    }

    // 2. Check if account exists and is active
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status, sa.sub_status,
        sa.currency_code, sa.allow_overdraft, sa.overdraft_limit,
        sa.enforce_min_required_balance, sa.min_required_balance,
        sas.account_balance, 
        c.display_name as client_name,
        p.name as product_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       JOIN savings_product p ON sa.product_id = p.id
       JOIN savings_account_summary sas ON sa.id = sas.savings_account_id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'active') {
      throw new BusinessRuleError(`Cannot withdraw from account in ${account.status} status`);
    }
    
    // Check if account is blocked for debit
    if (account.sub_status === 'block' || account.sub_status === 'block_debit') {
      throw new BusinessRuleError('Account is blocked for withdrawals');
    }

    // 4. Validate sufficient balance
    const currentBalance = parseFloat(account.account_balance);
    const amount = parseFloat(transactionAmount);
    const newBalance = currentBalance - amount;
    
    const minRequiredBalance = parseFloat(account.min_required_balance || '0');
    const enforceMinBalance = account.enforce_min_required_balance;
    
    const allowOverdraft = account.allow_overdraft;
    const overdraftLimit = parseFloat(account.overdraft_limit || '0');
    
    // Check if withdrawal would violate minimum balance requirement
    if (enforceMinBalance && newBalance < minRequiredBalance) {
      throw new BusinessRuleError(
        `Withdrawal would violate minimum balance requirement of ${minRequiredBalance}`
      );
    }
    
    // Check if withdrawal would exceed overdraft limit
    if (newBalance < 0) {
      if (!allowOverdraft) {
        throw new BusinessRuleError('Insufficient funds and overdraft not allowed');
      }
      
      if (Math.abs(newBalance) > overdraftLimit) {
        throw new BusinessRuleError(
          `Withdrawal would exceed overdraft limit of ${overdraftLimit}`
        );
      }
    }

    // 5. Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = uuidv4();
      await client.query(
        `INSERT INTO payment_detail (
          id, payment_type_id, account_number, check_number, 
          receipt_number, bank_number, routing_code, 
          created_date, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8
        )`,
        [
          paymentDetailId, paymentTypeId, accountNumber || null,
          checkNumber || null, receiptNumber || null,
          bankNumber || null, routingCode || null, req.user?.id
        ]
      );
    }

    // 6. Create withdrawal transaction
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO savings_transaction (
        id, savings_account_id, payment_detail_id, transaction_type, 
        amount, transaction_date, running_balance, is_reversed, 
        created_date, created_by, description
      ) VALUES (
        $1, $2, $3, 'withdrawal', $4, $5, $6, false, 
        CURRENT_TIMESTAMP, $7, $8
      )`,
      [
        transactionId, accountId, paymentDetailId, amount, 
        transactionDate, newBalance, req.user?.id, 
        note || 'Withdrawal transaction'
      ]
    );
    
    // 7. Update account summary
    await client.query(
      `UPDATE savings_account_summary SET 
        total_withdrawals = total_withdrawals + $1,
        account_balance = $2,
        last_transaction_date = $3
       WHERE savings_account_id = $4`,
      [amount, newBalance, transactionDate, accountId]
    );

    // 8. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes, amount
      ) VALUES (
        $1, 'WITHDRAWAL', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3, $4
      )`,
      [accountId, req.user?.id, note || 'Withdrawal transaction', amount]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      accountId,
      accountNo: account.account_no,
      clientName: account.client_name,
      message: 'Withdrawal processed successfully',
      transactionId,
      transactionDate,
      amount,
      runningBalance: newBalance,
      previousBalance: currentBalance,
      currencyCode: account.currency_code,
      transactionType: 'withdrawal',
      receiptNumber: receiptNumber || null
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Calculate interest for a savings account
 */
router.post('/calculate-interest', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { accountId, calculateAsOf } = input;
    
    logger.info('Calculating interest for savings account', { accountId, calculateAsOf });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    
    // Use current date if not specified
    const calculationDate = calculateAsOf ? new Date(calculateAsOf) : new Date();
    
    // 2. Check if account exists and is active
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status, sa.currency_code,
        sa.nominal_annual_interest_rate, sa.interest_compounding_period_type,
        sa.interest_calculation_type, sa.interest_calculation_days_in_year_type,
        sa.min_balance_for_interest_calculation,
        sas.account_balance, sas.last_interest_calculation_date
       FROM savings_account sa
       JOIN savings_account_summary sas ON sa.id = sas.savings_account_id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'active') {
      throw new BusinessRuleError(`Cannot calculate interest for account in ${account.status} status`);
    }

    // 4. Determine the period to calculate interest for
    const lastCalcDate = account.last_interest_calculation_date 
      ? new Date(account.last_interest_calculation_date)
      : new Date(new Date().setDate(1)); // First day of current month if never calculated
    
    // Format dates for output and calculations
    const fromDate = lastCalcDate.toISOString().split('T')[0];
    const toDate = calculationDate.toISOString().split('T')[0];
    
    // Calculate number of days in period
    const daysDiff = Math.floor(
      (calculationDate.getTime() - lastCalcDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff <= 0) {
      // No days to calculate interest for
      return res.json({
        interestCalculatedFrom: fromDate,
        interestCalculatedTo: toDate,
        interestAmount: 0,
        daysInPeriod: 0,
        message: 'No days to calculate interest for'
      });
    }

    // 5. Get account balance history for the period
    const balanceHistoryResult = await client.query(
      `SELECT 
        transaction_date, running_balance
       FROM savings_transaction
       WHERE savings_account_id = $1
         AND transaction_date >= $2
         AND transaction_date <= $3
         AND is_reversed = false
       ORDER BY transaction_date ASC`,
      [accountId, fromDate, toDate]
    );
    
    // 6. Calculate interest based on the calculation method
    let interestAmount = 0;
    let averageBalance = null;
    
    // Interest rate (convert from annual to daily)
    const annualRate = parseFloat(account.nominal_annual_interest_rate);
    const daysInYear = account.interest_calculation_days_in_year_type || 365;
    const dailyRate = annualRate / daysInYear / 100; // Convert percentage to decimal
    
    // Minimum balance for interest calculation
    const minBalanceForInterest = parseFloat(account.min_balance_for_interest_calculation || '0');
    
    if (account.interest_calculation_type === 'daily_balance') {
      // Daily balance method
      // Get balances for each day in the period and calculate interest
      
      // If no transactions in the period, use the current balance for all days
      if (balanceHistoryResult.rows.length === 0) {
        const balance = parseFloat(account.account_balance);
        
        // Only calculate interest if balance meets minimum requirement
        if (balance >= minBalanceForInterest) {
          interestAmount = balance * dailyRate * daysDiff;
        }
      } else {
        // Initialize with the last known balance before the period
        let runningBalance = parseFloat(account.account_balance);
        let currentDate = new Date(fromDate);
        let transactionIndex = 0;
        let totalDailyInterest = 0;
        
        // Calculate interest day by day
        while (currentDate <= calculationDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          // Check if there's a transaction on this day
          while (transactionIndex < balanceHistoryResult.rows.length && 
                 balanceHistoryResult.rows[transactionIndex].transaction_date === dateString) {
            // Update running balance to the last transaction of the day
            runningBalance = parseFloat(
              balanceHistoryResult.rows[transactionIndex].running_balance
            );
            transactionIndex++;
          }
          
          // Calculate interest for this day if balance meets minimum
          if (runningBalance >= minBalanceForInterest) {
            totalDailyInterest += runningBalance * dailyRate;
          }
          
          // Move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        interestAmount = totalDailyInterest;
      }
    } else if (account.interest_calculation_type === 'average_daily_balance') {
      // Average daily balance method
      
      // If no transactions in the period, use the current balance as average
      if (balanceHistoryResult.rows.length === 0) {
        averageBalance = parseFloat(account.account_balance);
      } else {
        // Calculate weighted average based on days with each balance
        let totalBalanceProduct = 0;
        let previousDate = new Date(fromDate);
        let previousBalance = parseFloat(account.account_balance);
        
        for (const transaction of balanceHistoryResult.rows) {
          const transactionDate = new Date(transaction.transaction_date);
          const daysBetween = Math.floor(
            (transactionDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          totalBalanceProduct += previousBalance * daysBetween;
          
          previousDate = transactionDate;
          previousBalance = parseFloat(transaction.running_balance);
        }
        
        // Add remaining days
        const remainingDays = Math.floor(
          (calculationDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalBalanceProduct += previousBalance * remainingDays;
        
        averageBalance = totalBalanceProduct / daysDiff;
      }
      
      // Calculate interest if average balance meets minimum
      if (averageBalance >= minBalanceForInterest) {
        interestAmount = averageBalance * dailyRate * daysDiff;
      }
    }
    
    // Round to 2 decimal places
    interestAmount = Math.round(interestAmount * 100) / 100;

    await client.query('COMMIT');

    res.json({
      interestCalculatedFrom: fromDate,
      interestCalculatedTo: toDate,
      interestAmount,
      averageBalance,
      daysInPeriod: daysDiff,
      annualInterestRate: annualRate,
      calculationMethod: account.interest_calculation_type
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Post interest to savings accounts
 */
router.post('/post-interest', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { postingDate, accountIds } = input;
    
    logger.info('Posting interest to savings accounts', { 
      postingDate, accountCount: accountIds?.length 
    });

    // 1. Validate input
    if (!postingDate) throw new ValidationError('Posting date is required');
    
    const interestPostingDate = new Date(postingDate);
    let accountsToProcess = [];
    
    // 2. Determine which accounts to process
    if (accountIds && accountIds.length > 0) {
      // Process specific accounts
      const accountsResult = await client.query(
        `SELECT 
          sa.id, sa.account_no, sa.status, sa.interest_posting_period_type,
          sa.nominal_annual_interest_rate
         FROM savings_account sa
         WHERE sa.id = ANY($1) AND sa.status = 'active'`,
        [accountIds]
      );
      
      accountsToProcess = accountsResult.rows;
      
      if (accountsToProcess.length !== accountIds.length) {
        logger.warn('Some accounts were not found or not active', {
          requested: accountIds.length,
          found: accountsToProcess.length
        });
      }
    } else {
      // Process all accounts eligible for interest posting
      // In a real system, this would be based on a schedule (monthly, quarterly, etc.)
      
      const currentMonth = interestPostingDate.getMonth() + 1;
      const currentDay = interestPostingDate.getDate();
      
      // Get accounts eligible for interest posting based on their posting period
      const accountsResult = await client.query(
        `SELECT 
          sa.id, sa.account_no, sa.status, sa.interest_posting_period_type,
          sa.nominal_annual_interest_rate
         FROM savings_account sa
         WHERE sa.status = 'active'
           AND (
             (sa.interest_posting_period_type = 'monthly' AND $1 = 1) OR
             (sa.interest_posting_period_type = 'quarterly' AND $1 = 1 AND $2 IN (1, 4, 7, 10)) OR
             (sa.interest_posting_period_type = 'biannual' AND $1 = 1 AND $2 IN (1, 7)) OR
             (sa.interest_posting_period_type = 'annual' AND $1 = 1 AND $2 = 1)
           )`,
        [currentDay, currentMonth]
      );
      
      accountsToProcess = accountsResult.rows;
    }
    
    if (accountsToProcess.length === 0) {
      return res.json({
        success: true,
        message: 'No accounts eligible for interest posting',
        accountsProcessed: 0,
        failedAccounts: 0,
        totalInterestPosted: 0,
        postingDate
      });
    }

    // 3. Process each account
    let accountsProcessed = 0;
    let failedAccounts = 0;
    let totalInterestPosted = 0;
    
    for (const account of accountsToProcess) {
      try {
        // 3.1 Calculate interest for the account
        // This would call the interest calculation logic (similar to calculate-interest endpoint)
        // For simplicity, using a fixed interest calculation here
        
        // Get account balance and last interest calculation date
        const accountDetailsResult = await client.query(
          `SELECT 
            sa.nominal_annual_interest_rate, sas.account_balance,
            sas.last_interest_calculation_date
           FROM savings_account sa
           JOIN savings_account_summary sas ON sa.id = sas.savings_account_id
           WHERE sa.id = $1`,
          [account.id]
        );
        
        if (accountDetailsResult.rows.length === 0) {
          logger.error('Account not found in summary table', { accountId: account.id });
          failedAccounts++;
          continue;
        }
        
        const accountDetails = accountDetailsResult.rows[0];
        const lastCalcDate = accountDetails.last_interest_calculation_date
          ? new Date(accountDetails.last_interest_calculation_date)
          : new Date(new Date(postingDate).setDate(1)); // First day of month
        
        // Calculate days since last interest calculation
        const daysDiff = Math.floor(
          (interestPostingDate.getTime() - lastCalcDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysDiff <= 0) {
          logger.info('No days to calculate interest for', { accountId: account.id });
          continue;
        }
        
        const balance = parseFloat(accountDetails.account_balance);
        const annualRate = parseFloat(accountDetails.nominal_annual_interest_rate);
        const daysInYear = 365;
        const dailyRate = annualRate / daysInYear / 100;
        
        // Simplified interest calculation (in a real system, this would be more complex)
        const interestAmount = balance * dailyRate * daysDiff;
        const roundedInterest = Math.round(interestAmount * 100) / 100;
        
        if (roundedInterest <= 0) {
          logger.info('Zero interest amount calculated', { 
            accountId: account.id, 
            balance, 
            annualRate 
          });
          continue;
        }
        
        // 3.2 Post interest transaction
        const transactionId = uuidv4();
        const newBalance = balance + roundedInterest;
        
        await client.query(
          `INSERT INTO savings_transaction (
            id, savings_account_id, transaction_type, amount, 
            transaction_date, running_balance, is_reversed, 
            created_date, created_by, description
          ) VALUES (
            $1, $2, 'interest_posting', $3, $4, $5, false, 
            CURRENT_TIMESTAMP, $6, $7
          )`,
          [
            transactionId, account.id, roundedInterest, postingDate, 
            newBalance, req.user?.id, 'Interest posting'
          ]
        );
        
        // 3.3 Update account summary
        await client.query(
          `UPDATE savings_account_summary SET 
            total_interest_earned = total_interest_earned + $1,
            account_balance = $2,
            last_transaction_date = $3,
            last_interest_calculation_date = $3
           WHERE savings_account_id = $4`,
          [roundedInterest, newBalance, postingDate, account.id]
        );
        
        // 3.4 Add audit entry
        await client.query(
          `INSERT INTO savings_account_transaction_history (
            savings_account_id, transaction_type, action_date, created_by,
            created_date, notes, amount
          ) VALUES (
            $1, 'INTEREST_POSTING', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3, $4
          )`,
          [account.id, req.user?.id, 'Interest posting', roundedInterest]
        );
        
        totalInterestPosted += roundedInterest;
        accountsProcessed++;
        
      } catch (error) {
        logger.error('Failed to post interest for account', {
          accountId: account.id,
          error: error.message
        });
        failedAccounts++;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Interest posting completed',
      accountsProcessed,
      failedAccounts,
      totalInterestPosted,
      postingDate
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Close a savings account
 */
router.post('/close', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { input } = req.body;
    const { accountId, closedOnDate, note, transferAccountId } = input;
    
    logger.info('Processing savings account closure', { accountId, closedOnDate });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!closedOnDate) throw new ValidationError('Closure date is required');

    // 2. Check if account exists and is active
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status, sa.currency_code,
        sas.account_balance, c.display_name as client_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       JOIN savings_account_summary sas ON sa.id = sas.savings_account_id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];
    
    // 3. Validate account status
    if (account.status !== 'active') {
      throw new BusinessRuleError(`Cannot close account in ${account.status} status`);
    }

    // 4. Check account balance
    const currentBalance = parseFloat(account.account_balance);
    
    if (currentBalance > 0) {
      // Account has money - need to handle transfer or withdrawal
      if (!transferAccountId) {
        throw new ValidationError('Transfer account ID is required when closing account with balance');
      }
      
      // Verify transfer account exists and is active
      const transferAccountResult = await client.query(
        `SELECT 
          sa.id, sa.account_no, sa.status, sa.currency_code
         FROM savings_account sa
         WHERE sa.id = $1 AND sa.status = 'active'`,
        [transferAccountId]
      );
      
      if (transferAccountResult.rows.length === 0) {
        throw new NotFoundError('Transfer account not found or not active');
      }
      
      const transferAccount = transferAccountResult.rows[0];
      
      // Verify currencies match
      if (account.currency_code !== transferAccount.currency_code) {
        throw new BusinessRuleError('Transfer account currency does not match source account');
      }
      
      // Process transfer of remaining balance
      const sourceTransactionId = uuidv4();
      const destTransactionId = uuidv4();
      
      // Record withdrawal from source account
      await client.query(
        `INSERT INTO savings_transaction (
          id, savings_account_id, transaction_type, amount, 
          transaction_date, running_balance, is_reversed, 
          created_date, created_by, description
        ) VALUES (
          $1, $2, 'withdrawal', $3, $4, 0, false, 
          CURRENT_TIMESTAMP, $5, $6
        )`,
        [
          sourceTransactionId, accountId, currentBalance, closedOnDate, 
          req.user?.id, 'Withdrawal on account closure'
        ]
      );
      
      // Get destination account balance
      const destBalanceResult = await client.query(
        `SELECT account_balance FROM savings_account_summary WHERE savings_account_id = $1`,
        [transferAccountId]
      );
      
      const destBalance = parseFloat(destBalanceResult.rows[0].account_balance);
      const newDestBalance = destBalance + currentBalance;
      
      // Record deposit to destination account
      await client.query(
        `INSERT INTO savings_transaction (
          id, savings_account_id, transaction_type, amount, 
          transaction_date, running_balance, is_reversed, 
          created_date, created_by, description
        ) VALUES (
          $1, $2, 'deposit', $3, $4, $5, false, 
          CURRENT_TIMESTAMP, $6, $7
        )`,
        [
          destTransactionId, transferAccountId, currentBalance, closedOnDate, 
          newDestBalance, req.user?.id, 
          `Deposit from account closure (${account.account_no})`
        ]
      );
      
      // Update source account summary
      await client.query(
        `UPDATE savings_account_summary SET 
          total_withdrawals = total_withdrawals + $1,
          account_balance = 0,
          last_transaction_date = $2
         WHERE savings_account_id = $3`,
        [currentBalance, closedOnDate, accountId]
      );
      
      // Update destination account summary
      await client.query(
        `UPDATE savings_account_summary SET 
          total_deposits = total_deposits + $1,
          account_balance = $2,
          last_transaction_date = $3
         WHERE savings_account_id = $4`,
        [currentBalance, newDestBalance, closedOnDate, transferAccountId]
      );
    }

    // 5. Update account status
    await client.query(
      `UPDATE savings_account SET 
        status = 'closed', 
        closed_on_date = $1,
        closed_by = $2,
        last_modified_date = CURRENT_TIMESTAMP,
        last_modified_by = $3
       WHERE id = $4`,
      [closedOnDate, req.user?.id, req.user?.id, accountId]
    );

    // 6. Add audit entry
    await client.query(
      `INSERT INTO savings_account_transaction_history (
        savings_account_id, transaction_type, action_date, created_by,
        created_date, notes
      ) VALUES (
        $1, 'CLOSE', CURRENT_TIMESTAMP, $2, CURRENT_TIMESTAMP, $3
      )`,
      [accountId, req.user?.id, note || 'Account closed']
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      accountId,
      accountNo: account.account_no,
      clientName: account.client_name,
      message: 'Savings account closed successfully',
      closedOnDate,
      balanceTransferred: currentBalance > 0,
      transferAmount: currentBalance > 0 ? currentBalance : 0,
      transferAccountId: transferAccountId || null
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Generate account statement for a savings account
 */
router.post('/statement', async (req: Request, res: Response, next: NextFunction) => {
  const client = await db.getClient();
  
  try {
    const { input } = req.body;
    const { accountId, fromDate, toDate, includeDetails = true } = input;
    
    logger.info('Generating savings account statement', { accountId, fromDate, toDate });

    // 1. Validate input
    if (!accountId) throw new ValidationError('Account ID is required');
    if (!fromDate) throw new ValidationError('From date is required');
    if (!toDate) throw new ValidationError('To date is required');

    // 2. Check if account exists
    const accountResult = await client.query(
      `SELECT 
        sa.id, sa.account_no, sa.client_id, sa.status, sa.currency_code,
        c.display_name as client_name, p.name as product_name
       FROM savings_account sa
       JOIN client c ON sa.client_id = c.id
       JOIN savings_product p ON sa.product_id = p.id
       WHERE sa.id = $1`,
      [accountId]
    );
    
    if (accountResult.rows.length === 0) {
      throw new NotFoundError('Savings account not found');
    }
    
    const account = accountResult.rows[0];

    // 3. Get opening balance (balance before the start date)
    const openingBalanceResult = await client.query(
      `SELECT running_balance 
       FROM savings_transaction
       WHERE savings_account_id = $1
         AND transaction_date < $2
         AND is_reversed = false
       ORDER BY transaction_date DESC, created_date DESC
       LIMIT 1`,
      [accountId, fromDate]
    );
    
    // If no transactions before start date, opening balance is 0
    const openingBalance = openingBalanceResult.rows.length > 0
      ? parseFloat(openingBalanceResult.rows[0].running_balance)
      : 0;

    // 4. Get transactions for the period
    const transactionsResult = await client.query(
      `SELECT 
        id, transaction_type, amount, transaction_date, 
        running_balance, description, is_reversed,
        created_date
       FROM savings_transaction
       WHERE savings_account_id = $1
         AND transaction_date >= $2
         AND transaction_date <= $3
         AND is_reversed = false
       ORDER BY transaction_date ASC, created_date ASC`,
      [accountId, fromDate, toDate]
    );
    
    // 5. Calculate statement summary
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalInterest = 0;
    let totalFees = 0;
    
    const transactions = transactionsResult.rows.map(tx => {
      const amount = parseFloat(tx.amount);
      
      // Update summary totals
      if (tx.transaction_type === 'deposit') {
        totalDeposits += amount;
      } else if (tx.transaction_type === 'withdrawal') {
        totalWithdrawals += amount;
      } else if (tx.transaction_type === 'interest_posting') {
        totalInterest += amount;
      } else if (tx.transaction_type === 'fee_charge' || 
                 tx.transaction_type === 'withdrawal_fee' ||
                 tx.transaction_type === 'annual_fee') {
        totalFees += amount;
      }
      
      // Format transaction for response
      return {
        transactionId: tx.id,
        transactionDate: tx.transaction_date,
        valueDate: tx.transaction_date, // Same as transaction date for simplicity
        transactionType: tx.transaction_type,
        description: tx.description,
        debitAmount: ['withdrawal', 'fee_charge', 'withdrawal_fee', 'annual_fee']
                     .includes(tx.transaction_type) ? amount : null,
        creditAmount: ['deposit', 'interest_posting', 'dividend_payout']
                      .includes(tx.transaction_type) ? amount : null,
        runningBalance: parseFloat(tx.running_balance)
      };
    });
    
    // Closing balance is the last transaction's running balance, or opening balance if no transactions
    const closingBalance = transactions.length > 0
      ? transactions[transactions.length - 1].runningBalance
      : openingBalance;

    // 6. Create statement record
    const statementId = uuidv4();
    await client.query(
      `INSERT INTO account_statement (
        id, tenant_id, client_id, account_id, account_type,
        statement_date, period_start_date, period_end_date,
        opening_balance, closing_balance, total_deposits,
        total_withdrawals, total_fees, total_interest,
        created_date, created_by
      ) VALUES (
        $1, $2, $3, $4, 'savings',
        CURRENT_DATE, $5, $6,
        $7, $8, $9, $10, $11, $12,
        CURRENT_TIMESTAMP, $13
      )`,
      [
        statementId, req.headers['x-hasura-tenant-id'], account.client_id,
        accountId, fromDate, toDate,
        openingBalance, closingBalance, totalDeposits,
        totalWithdrawals, totalFees, totalInterest,
        req.user?.id
      ]
    );

    // 7. Prepare response
    const statementData = {
      statementId,
      accountId,
      accountNo: account.account_no,
      accountType: 'Savings',
      clientId: account.client_id,
      clientName: account.client_name,
      productName: account.product_name,
      currencyCode: account.currency_code,
      statementDate: new Date().toISOString().split('T')[0],
      periodStartDate: fromDate,
      periodEndDate: toDate,
      openingBalance,
      closingBalance,
      totalDeposits,
      totalWithdrawals,
      totalInterest,
      totalFees,
      transactions: includeDetails ? transactions : null
    };
    
    res.json(statementData);
    
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export const savingsEnhancedRoutes = router;