import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { SavingsCalculationService } from './savingsCalculationService';
import { 
  SavingsAccount, 
  SavingsAccountStatus,
  SavingsTransactionType,
  InterestPostingInput,
  SavingsAccountApprovalInput,
  SavingsAccountActivationInput,
  DepositTransactionInput,
  WithdrawalTransactionInput,
  InterestCalculationInput,
  SavingsAccountCreationInput,
  InterestCompoundingPeriodType,
  InterestPostingPeriodType,
  InterestCalculationType,
  SavingsAccountSubStatus,
  SavingsCloseInput
} from '../models/savings';

// Initialize the savings calculation service
const savingsCalculationService = new SavingsCalculationService();

/**
 * Create a new savings account
 * @param input The savings account creation input data
 * @param userId The ID of the user creating the account
 * @returns Result of the account creation operation
 */
export async function createSavingsAccount(input: SavingsAccountCreationInput, userId: string) {
  const { 
    clientId, 
    groupId, 
    productId, 
    fieldOfficerId, 
    externalId, 
    submittedOnDate,
    nominalAnnualInterestRate,
    interestCompoundingPeriodType,
    interestPostingPeriodType,
    interestCalculationType,
    interestCalculationDaysInYearType,
    minRequiredOpeningBalance,
    lockinPeriodFrequency,
    lockinPeriodFrequencyType,
    allowOverdraft,
    overdraftLimit,
    enforceMinRequiredBalance,
    minRequiredBalance,
    withdrawalFeeForTransfers,
    note
  } = input;
  
  logger.info('Creating savings account', { 
    clientId, 
    groupId, 
    productId, 
    submittedOnDate, 
    userId 
  });

  // Validate that either client or group is provided but not both
  if ((!clientId && !groupId) || (clientId && groupId)) {
    throw new Error('Either client ID or group ID must be provided, but not both');
  }

  return db.transaction(async (client) => {
    // Get product details
    const productQuery = await client.query(
      'SELECT * FROM fineract_default.savings_product WHERE id = $1',
      [productId]
    );
    
    if (productQuery.rows.length === 0) {
      throw new Error('Savings product not found');
    }
    
    const product = productQuery.rows[0];
    
    // If client is provided, check client exists
    if (clientId) {
      const clientQuery = await client.query(
        'SELECT id FROM fineract_default.client WHERE id = $1',
        [clientId]
      );
      
      if (clientQuery.rows.length === 0) {
        throw new Error('Client not found');
      }
    }
    
    // If group is provided, check group exists
    if (groupId) {
      const groupQuery = await client.query(
        'SELECT id FROM fineract_default.client_group WHERE id = $1',
        [groupId]
      );
      
      if (groupQuery.rows.length === 0) {
        throw new Error('Group not found');
      }
    }
    
    // Check field officer exists if provided
    if (fieldOfficerId) {
      const staffQuery = await client.query(
        'SELECT id FROM fineract_default.staff WHERE id = $1',
        [fieldOfficerId]
      );
      
      if (staffQuery.rows.length === 0) {
        throw new Error('Field officer not found');
      }
    }
    
    // Check for external ID uniqueness if provided
    if (externalId) {
      const externalIdQuery = await client.query(
        'SELECT id FROM fineract_default.savings_account WHERE external_id = $1',
        [externalId]
      );
      
      if (externalIdQuery.rows.length > 0) {
        throw new Error('External ID is already in use');
      }
    }
    
    // Use product default values if not provided in the input
    const finalNominalRate = nominalAnnualInterestRate !== undefined 
      ? nominalAnnualInterestRate 
      : product.nominal_annual_interest_rate;
      
    const finalCompoundingPeriodType = interestCompoundingPeriodType 
      ? interestCompoundingPeriodType 
      : product.interest_compounding_period_type;
      
    const finalPostingPeriodType = interestPostingPeriodType 
      ? interestPostingPeriodType 
      : product.interest_posting_period_type;
      
    const finalCalculationType = interestCalculationType 
      ? interestCalculationType 
      : product.interest_calculation_type;
      
    const finalDaysInYearType = interestCalculationDaysInYearType !== undefined 
      ? interestCalculationDaysInYearType 
      : product.interest_calculation_days_in_year_type;
      
    const finalMinOpeningBalance = minRequiredOpeningBalance !== undefined 
      ? minRequiredOpeningBalance 
      : product.min_required_opening_balance;
      
    const finalAllowOverdraft = allowOverdraft !== undefined 
      ? allowOverdraft 
      : product.allow_overdraft;
      
    const finalOverdraftLimit = overdraftLimit !== undefined 
      ? overdraftLimit 
      : product.overdraft_limit;
      
    const finalEnforceMinBalance = enforceMinRequiredBalance !== undefined 
      ? enforceMinRequiredBalance 
      : product.enforce_min_required_balance;
      
    const finalMinBalance = minRequiredBalance !== undefined 
      ? minRequiredBalance 
      : product.min_required_balance;
      
    const finalWithdrawalFeeForTransfers = withdrawalFeeForTransfers !== undefined 
      ? withdrawalFeeForTransfers 
      : product.withdrawal_fee_for_transfer;
    
    // Generate a new account ID
    const accountId = uuidv4();
    
    // Create the savings account
    const insertQuery = `
      INSERT INTO fineract_default.savings_account(
        id, client_id, group_id, product_id, field_officer_id, external_id,
        status, sub_status, account_type, 
        currency_code, currency_digits, 
        nominal_annual_interest_rate, 
        interest_compounding_period_type, 
        interest_posting_period_type, 
        interest_calculation_type, 
        interest_calculation_days_in_year_type,
        min_required_opening_balance, 
        deposit_fee_for_transfer,
        allow_overdraft, 
        overdraft_limit, 
        enforce_min_required_balance, 
        min_required_balance, 
        withdrawal_fee_amount,
        withdrawal_fee_for_transfer, 
        annual_fee_amount, 
        annual_fee_on_month, 
        annual_fee_on_day,
        lockin_period_frequency, 
        lockin_period_frequency_type,
        is_dormancy_tracking_active, 
        submitted_on_date, 
        submitted_by_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      )
      RETURNING id, account_no`;
      
    const insertValues = [
      accountId,
      clientId || null,
      groupId || null,
      productId,
      fieldOfficerId || null,
      externalId || null,
      SavingsAccountStatus.SUBMITTED_AND_PENDING_APPROVAL,
      SavingsAccountSubStatus.NONE,
      clientId ? 'individual' : 'group',
      product.currency_code,
      product.currency_digits,
      finalNominalRate,
      finalCompoundingPeriodType,
      finalPostingPeriodType,
      finalCalculationType,
      finalDaysInYearType,
      finalMinOpeningBalance || null,
      product.deposit_fee_for_transfer,
      finalAllowOverdraft,
      finalOverdraftLimit || null,
      finalEnforceMinBalance,
      finalMinBalance || null,
      product.withdrawal_fee_amount || null,
      finalWithdrawalFeeForTransfers,
      product.annual_fee_amount || null,
      product.annual_fee_on_month || null,
      product.annual_fee_on_day || null,
      lockinPeriodFrequency || null,
      lockinPeriodFrequencyType || null,
      product.is_dormancy_tracking_active,
      submittedOnDate,
      userId
    ];
    
    const result = await client.query(insertQuery, insertValues);
    
    // Add note if provided (simplified implementation)
    if (note) {
      await client.query(
        `INSERT INTO fineract_default.note (entity_id, entity_type, note, created_by, created_date)
         VALUES ($1, 'savings_account', $2, $3, CURRENT_TIMESTAMP)`,
        [accountId, note, userId]
      );
    }
    
    // Apply charges from the product to the new account if this feature exists
    // This would involve getting charges associated with the product and creating
    // corresponding charges for the account
    
    // Return success response with account details
    return {
      success: true,
      accountId: result.rows[0].id,
      accountNo: result.rows[0].account_no,
      clientId: clientId || null,
      groupId: groupId || null,
      message: 'Savings account created successfully',
      submittedOnDate,
      status: SavingsAccountStatus.SUBMITTED_AND_PENDING_APPROVAL
    };
  });
}

/**
 * Approve a savings account
 * @param input The approval input with account ID and approval date
 * @param userId The ID of the user approving the account
 * @returns Result of the approval operation
 */
export async function approveSavingsAccount(input: SavingsAccountApprovalInput, userId: string) {
  const { accountId, approvedOnDate, note } = input;
  logger.info('Approving savings account', { accountId, approvedOnDate, userId });

  return db.transaction(async (client) => {
    // Get account details
    const account = await getSavingsAccountById(client, accountId);
    if (!account) {
      throw new Error('Savings account not found');
    }

    // Validate account status
    if (account.status !== SavingsAccountStatus.SUBMITTED_AND_PENDING_APPROVAL) {
      throw new Error(`Cannot approve savings account with status ${account.status}`);
    }

    // Update account status and approval details
    await updateSavingsAccountStatus(
      client, 
      accountId, 
      SavingsAccountStatus.APPROVED, 
      userId, 
      approvedOnDate,
      {
        approved_on_date: approvedOnDate,
        approved_by_user_id: userId
      }
    );

    // Return success response
    return {
      success: true,
      accountId,
      message: 'Savings account approved successfully',
      approvedOnDate
    };
  });
}

/**
 * Activate a savings account
 * @param input The activation input with account ID and activation date
 * @param userId The ID of the user activating the account
 * @returns Result of the activation operation
 */
export async function activateSavingsAccount(input: SavingsAccountActivationInput, userId: string) {
  const { accountId, activatedOnDate, note } = input;
  logger.info('Activating savings account', { accountId, activatedOnDate, userId });

  return db.transaction(async (client) => {
    // Get account details
    const account = await getSavingsAccountById(client, accountId);
    if (!account) {
      throw new Error('Savings account not found');
    }

    // Validate account status
    if (account.status !== SavingsAccountStatus.APPROVED) {
      throw new Error(`Cannot activate savings account with status ${account.status}`);
    }

    // Update account status and activation details
    await updateSavingsAccountStatus(
      client, 
      accountId, 
      SavingsAccountStatus.ACTIVE, 
      userId, 
      activatedOnDate,
      {
        activated_on_date: activatedOnDate,
        activated_by_user_id: userId
      }
    );

    // Return success response
    return {
      success: true,
      accountId,
      message: 'Savings account activated successfully',
      activatedOnDate
    };
  });
}

/**
 * Process a deposit transaction to a savings account
 * @param input The deposit transaction input
 * @param userId The ID of the user making the deposit
 * @returns Result of the deposit operation
 */
export async function depositToSavings(input: DepositTransactionInput, userId: string) {
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
  logger.info('Processing savings deposit', { accountId, transactionDate, transactionAmount, userId });

  return db.transaction(async (client) => {
    // Get account details
    const account = await getSavingsAccountById(client, accountId);
    if (!account) {
      throw new Error('Savings account not found');
    }

    // Validate account status
    if (account.status !== SavingsAccountStatus.ACTIVE) {
      throw new Error(`Cannot make deposit to savings account with status ${account.status}`);
    }

    // Check if account is blocked for credits
    if (account.sub_status === 'block' || account.sub_status === 'block_credit') {
      throw new Error('This account is blocked for credits');
    }

    // Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = await createPaymentDetail(client, {
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      });
    }

    // Create deposit transaction
    const transactionId = await createSavingsTransaction(client, {
      savingsAccountId: accountId,
      paymentDetailId,
      transactionType: SavingsTransactionType.DEPOSIT,
      transactionDate,
      amount: transactionAmount,
      submittedOnDate: transactionDate,
      submittedByUserId: userId,
      note
    });

    // Update account balances
    const updatedBalance = new Decimal(account.account_balance_derived).plus(transactionAmount).toNumber();
    const totalDeposits = new Decimal(account.total_deposits_derived).plus(transactionAmount).toNumber();
    
    await updateSavingsAccountBalances(client, accountId, {
      accountBalance: updatedBalance,
      totalDeposits: totalDeposits
    });

    // Return success response
    return {
      success: true,
      accountId,
      message: 'Deposit processed successfully',
      transactionId,
      transactionDate,
      amount: transactionAmount,
      accountBalance: updatedBalance
    };
  });
}

/**
 * Process a withdrawal transaction from a savings account
 * @param input The withdrawal transaction input
 * @param userId The ID of the user making the withdrawal
 * @returns Result of the withdrawal operation
 */
export async function withdrawFromSavings(input: WithdrawalTransactionInput, userId: string) {
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
  logger.info('Processing savings withdrawal', { accountId, transactionDate, transactionAmount, userId });

  return db.transaction(async (client) => {
    // Get account details
    const account = await getSavingsAccountById(client, accountId);
    if (!account) {
      throw new Error('Savings account not found');
    }

    // Validate account status
    if (account.status !== SavingsAccountStatus.ACTIVE) {
      throw new Error(`Cannot make withdrawal from savings account with status ${account.status}`);
    }

    // Check if account is blocked for debits
    if (account.sub_status === 'block' || account.sub_status === 'block_debit') {
      throw new Error('This account is blocked for debits');
    }

    // Check if funds are available
    const availableBalance = await getAvailableBalance(client, accountId);
    if (availableBalance < transactionAmount && !account.allow_overdraft) {
      throw new Error('Insufficient funds for withdrawal');
    }

    // Check if the account allows overdraft but exceeds the limit
    if (account.allow_overdraft && account.overdraft_limit) {
      const potentialBalance = new Decimal(account.account_balance_derived).minus(transactionAmount).toNumber();
      const overdraftAmount = Math.abs(Math.min(0, potentialBalance));
      
      if (overdraftAmount > account.overdraft_limit) {
        throw new Error(`Withdrawal would exceed overdraft limit of ${account.overdraft_limit}`);
      }
    }

    // Create payment details if provided
    let paymentDetailId = null;
    if (paymentTypeId) {
      paymentDetailId = await createPaymentDetail(client, {
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
      });
    }

    // Create withdrawal transaction
    const transactionId = await createSavingsTransaction(client, {
      savingsAccountId: accountId,
      paymentDetailId,
      transactionType: SavingsTransactionType.WITHDRAWAL,
      transactionDate,
      amount: transactionAmount,
      submittedOnDate: transactionDate,
      submittedByUserId: userId,
      note
    });

    // Apply withdrawal fee if applicable
    let feeAmount = 0;
    if (account.withdrawal_fee_amount && account.withdrawal_fee_amount > 0) {
      feeAmount = account.withdrawal_fee_amount;
      
      await createSavingsTransaction(client, {
        savingsAccountId: accountId,
        transactionType: SavingsTransactionType.WITHDRAWAL_FEE,
        transactionDate,
        amount: feeAmount,
        submittedOnDate: transactionDate,
        submittedByUserId: userId,
        note: 'Automatic withdrawal fee'
      });
    }

    // Update account balances
    const totalAmount = new Decimal(transactionAmount).plus(feeAmount).toNumber();
    const updatedBalance = new Decimal(account.account_balance_derived).minus(totalAmount).toNumber();
    const totalWithdrawals = new Decimal(account.total_withdrawals_derived).plus(transactionAmount).toNumber();
    const totalWithdrawalFees = new Decimal(account.total_withdrawals_fees_derived).plus(feeAmount).toNumber();
    
    await updateSavingsAccountBalances(client, accountId, {
      accountBalance: updatedBalance,
      totalWithdrawals: totalWithdrawals,
      totalWithdrawalsFees: totalWithdrawalFees
    });

    // Return success response
    return {
      success: true,
      accountId,
      message: 'Withdrawal processed successfully',
      transactionId,
      transactionDate,
      amount: transactionAmount,
      feeAmount,
      totalAmount,
      accountBalance: updatedBalance
    };
  });
}

/**
 * Post interest to savings accounts
 * @param input Input for interest posting
 * @param userId The ID of the user posting interest
 * @returns Result of the interest posting operation
 */
export async function postInterestToSavings(input: InterestPostingInput, userId: string) {
  const { accountId, postingDate, batchSize = 100, isScheduledPosting = false } = input;
  logger.info('Posting interest to savings', { accountId, postingDate, userId });

  return db.transaction(async (client) => {
    try {
      // If specific account provided, post interest for just that account
      if (accountId) {
        return await postInterestForAccount(client, accountId, postingDate, userId);
      }
      
      // Otherwise, post interest for all eligible accounts
      const postingResults = [];
      let processedCount = 0;
      let errorCount = 0;
      
      // Fetch eligible accounts - active accounts with current interest posting date on or before postingDate
      const accountsQuery = await client.query(
        `SELECT id FROM fineract_default.savings_account 
         WHERE status = 'active' 
         AND (last_interest_calculation_date IS NULL 
              OR DATE(last_interest_calculation_date) < $1)
         LIMIT $2`,
        [postingDate, batchSize]
      );
      
      // Process each account
      for (const row of accountsQuery.rows) {
        try {
          const result = await postInterestForAccount(client, row.id, postingDate, userId);
          postingResults.push(result);
          processedCount++;
        } catch (error) {
          errorCount++;
          logger.error('Error posting interest for account', { accountId: row.id, error });
        }
      }
      
      return {
        success: true,
        message: 'Interest posting completed',
        postingDate,
        totalProcessed: processedCount,
        errorCount,
        results: postingResults
      };
    } catch (error) {
      logger.error('Error in batch interest posting', error);
      throw new Error(`Failed to post interest: ${error.message}`);
    }
  });
}

/**
 * Helper function to post interest for a single account
 */
async function postInterestForAccount(client, accountId, postingDate, userId) {
  // Get account details
  const account = await getSavingsAccountById(client, accountId);
  if (!account) {
    throw new Error('Savings account not found');
  }

  // Validate account status
  if (account.status !== SavingsAccountStatus.ACTIVE) {
    throw new Error(`Cannot post interest to savings account with status ${account.status}`);
  }
  
  // Determine calculation period
  const fromDate = account.last_interest_calculation_date || account.activated_on_date;
  
  // Get transactions for the period
  const transactionsQuery = await client.query(
    `SELECT * FROM fineract_default.savings_account_transaction 
     WHERE savings_account_id = $1 
     AND transaction_date >= $2 
     AND transaction_date <= $3
     AND is_reversed = false
     ORDER BY transaction_date ASC`,
    [accountId, fromDate, postingDate]
  );
  
  // Calculate interest
  const interestResult = await savingsCalculationService.calculateInterest(
    account,
    fromDate,
    postingDate,
    transactionsQuery.rows
  );
  
  // Only post interest if there's any to post
  if (interestResult.totalInterestEarned > 0) {
    // Create interest posting transaction
    const transactionId = await createSavingsTransaction(client, {
      savingsAccountId: accountId,
      transactionType: SavingsTransactionType.INTEREST_POSTING,
      transactionDate: postingDate,
      amount: interestResult.totalInterestEarned,
      submittedOnDate: postingDate,
      submittedByUserId: userId,
      note: 'Interest posting'
    });
    
    // Update account balances
    const updatedBalance = new Decimal(account.account_balance_derived)
      .plus(interestResult.totalInterestEarned).toNumber();
    
    const totalInterestPosted = new Decimal(account.total_interest_posted_derived)
      .plus(interestResult.totalInterestEarned).toNumber();
    
    await updateSavingsAccountBalances(client, accountId, {
      accountBalance: updatedBalance,
      totalInterestPosted: totalInterestPosted,
      lastInterestCalculationDate: postingDate
    });
    
    return {
      success: true,
      accountId,
      interestPosted: interestResult.totalInterestEarned,
      fromDate,
      toDate: postingDate,
      transactionId,
      accountBalance: updatedBalance
    };
  } else {
    // Just update the last interest calculation date
    await client.query(
      `UPDATE fineract_default.savings_account 
       SET last_interest_calculation_date = $1 
       WHERE id = $2`,
      [postingDate, accountId]
    );
    
    return {
      success: true,
      accountId,
      interestPosted: 0,
      fromDate,
      toDate: postingDate,
      message: 'No interest to post for this period'
    };
  }
}

/**
 * Calculate interest for a savings account
 * @param input The calculation input with account ID and calculation date
 * @returns Calculated interest details
 */
export async function calculateSavingsInterest(input: InterestCalculationInput) {
  const { accountId, calculationDate = new Date().toISOString().split('T')[0] } = input;
  logger.info('Calculating savings interest', { accountId, calculationDate });

  try {
    // Get account details
    const accountQuery = await db.query(
      `SELECT * FROM fineract_default.savings_account WHERE id = $1`,
      [accountId]
    );
    
    if (accountQuery.rows.length === 0) {
      throw new Error('Savings account not found');
    }
    
    const account = accountQuery.rows[0];
    
    // Validate account status
    if (account.status !== SavingsAccountStatus.ACTIVE) {
      throw new Error(`Cannot calculate interest for savings account with status ${account.status}`);
    }
    
    // Determine calculation period
    const fromDate = account.last_interest_calculation_date || account.activated_on_date;
    
    // Get transactions for the period
    const transactionsQuery = await db.query(
      `SELECT * FROM fineract_default.savings_account_transaction 
       WHERE savings_account_id = $1 
       AND transaction_date >= $2 
       AND transaction_date <= $3
       AND is_reversed = false
       ORDER BY transaction_date ASC`,
      [accountId, fromDate, calculationDate]
    );
    
    // Calculate interest
    const interestResult = await savingsCalculationService.calculateInterest(
      account,
      fromDate,
      calculationDate,
      transactionsQuery.rows
    );
    
    // Return calculation result
    return {
      success: true,
      accountId,
      fromDate,
      toDate: calculationDate,
      interestCalculated: interestResult.totalInterestEarned,
      nominalAnnualInterestRate: account.nominal_annual_interest_rate,
      nextPostingDate: interestResult.nextInterestPostingDate,
      dailyCalculations: interestResult.dailyCalculations
    };
  } catch (error) {
    logger.error('Error calculating savings interest', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Close a savings account
 * @param input The closure input with account ID, closure date, and optional transfer account
 * @param userId The ID of the user closing the account
 * @returns Result of the closure operation
 */
export async function closeSavingsAccount(input: SavingsCloseInput, userId: string) {
  const { accountId, closedOnDate, note, transferAccountId } = input;
  logger.info('Closing savings account', { accountId, closedOnDate, transferAccountId, userId });

  return db.transaction(async (client) => {
    try {
      // Get account details
      const account = await getSavingsAccountById(client, accountId);
      if (!account) {
        throw new Error('Savings account not found');
      }

      // Validate account status
      if (account.status !== SavingsAccountStatus.ACTIVE) {
        throw new Error(`Cannot close savings account with status ${account.status}`);
      }

      // Get account details for display
      const accountDetailsQuery = await client.query(`
        SELECT 
          sa.account_no, 
          CASE 
            WHEN sa.client_id IS NOT NULL THEN c.display_name 
            WHEN sa.group_id IS NOT NULL THEN g.display_name 
          END AS client_name,
          sp.name AS product_name,
          sa.currency_code,
          sa.account_balance_derived
        FROM fineract_default.savings_account sa
        LEFT JOIN fineract_default.client c ON sa.client_id = c.id
        LEFT JOIN fineract_default.client_group g ON sa.group_id = g.id
        JOIN fineract_default.savings_product sp ON sa.product_id = sp.id
        WHERE sa.id = $1
      `, [accountId]);
      
      const accountDetails = accountDetailsQuery.rows[0];
      const accountBalance = account.account_balance_derived;
      
      // Check if account has balance
      if (accountBalance > 0) {
        // If balance exists, require transfer account or handle withdrawal
        if (!transferAccountId) {
          throw new Error('Account has remaining balance. Please provide a transfer account or withdraw the funds before closing.');
        }
        
        // Verify transfer account exists and is active
        const transferAccountQuery = await client.query(`
          SELECT * FROM fineract_default.savings_account 
          WHERE id = $1 AND status = 'active'
        `, [transferAccountId]);
        
        if (transferAccountQuery.rows.length === 0) {
          throw new Error('Transfer account not found or is not active');
        }
        
        const transferAccount = transferAccountQuery.rows[0];
        
        // Verify currencies match
        if (account.currency_code !== transferAccount.currency_code) {
          throw new Error('Transfer account currency must match the account being closed');
        }
        
        // Create transfer transaction from source account
        const sourceTransactionId = await createSavingsTransaction(client, {
          savingsAccountId: accountId,
          transactionType: SavingsTransactionType.WITHDRAWAL,
          transactionDate: closedOnDate,
          amount: accountBalance,
          submittedOnDate: closedOnDate,
          submittedByUserId: userId,
          note: 'Account closure transfer'
        });
        
        // Create transfer transaction to destination account
        const destinationTransactionId = await createSavingsTransaction(client, {
          savingsAccountId: transferAccountId,
          transactionType: SavingsTransactionType.DEPOSIT,
          transactionDate: closedOnDate,
          amount: accountBalance,
          submittedOnDate: closedOnDate,
          submittedByUserId: userId,
          note: 'Transfer from closed account ' + accountDetails.account_no
        });
        
        // Update destination account balance
        const updatedTransferBalance = new Decimal(transferAccount.account_balance_derived)
          .plus(accountBalance).toNumber();
        
        const totalDeposits = new Decimal(transferAccount.total_deposits_derived)
          .plus(accountBalance).toNumber();
        
        await updateSavingsAccountBalances(client, transferAccountId, {
          accountBalance: updatedTransferBalance,
          totalDeposits: totalDeposits
        });
      }
      
      // Update account status to closed
      await updateSavingsAccountStatus(
        client,
        accountId,
        SavingsAccountStatus.CLOSED,
        userId,
        closedOnDate,
        {
          closed_on_date: closedOnDate,
          closed_by_user_id: userId,
          account_balance_derived: 0, // Zero out the balance
          total_withdrawals_derived: account.total_withdrawals_derived + (accountBalance > 0 ? accountBalance : 0)
        }
      );
      
      // Add note if provided
      if (note) {
        await client.query(
          `INSERT INTO fineract_default.note (entity_id, entity_type, note, created_by, created_date)
           VALUES ($1, 'savings_account', $2, $3, CURRENT_TIMESTAMP)`,
          [accountId, note, userId]
        );
      }
      
      // Return success response
      return {
        success: true,
        accountId,
        accountNo: accountDetails.account_no,
        clientName: accountDetails.client_name,
        message: 'Savings account closed successfully',
        closedOnDate,
        balanceTransferred: accountBalance > 0 && transferAccountId ? true : false,
        transferAmount: accountBalance,
        transferAccountId: transferAccountId || null
      };
      
    } catch (error) {
      logger.error('Error closing savings account', { accountId, error });
      throw error;
    }
  });
}

// Helper functions

/**
 * Get savings account by ID
 */
async function getSavingsAccountById(client, accountId) {
  const query = await client.query(
    'SELECT * FROM fineract_default.savings_account WHERE id = $1',
    [accountId]
  );
  
  return query.rows[0];
}

/**
 * Update savings account status
 */
async function updateSavingsAccountStatus(client, accountId, newStatus, userId, date, additionalFields = {}) {
  const updateFields = {
    status: newStatus,
    ...additionalFields
  };
  
  // Build the SET clause dynamically
  const setClause = Object.keys(updateFields)
    .map((key, index) => `${key} = $${index + 3}`)
    .join(', ');
  
  const updateValues = [accountId, userId, ...Object.values(updateFields)];
  
  await client.query(
    `UPDATE fineract_default.savings_account
     SET ${setClause}
     WHERE id = $1`,
    updateValues
  );
  
  return true;
}

/**
 * Update savings account balances
 */
async function updateSavingsAccountBalances(client, accountId, balanceUpdates) {
  // Build the SET clause dynamically from the balance updates
  const fieldMapping = {
    accountBalance: 'account_balance_derived',
    totalDeposits: 'total_deposits_derived',
    totalWithdrawals: 'total_withdrawals_derived',
    totalInterestEarned: 'total_interest_earned_derived',
    totalInterestPosted: 'total_interest_posted_derived',
    totalFeeCharge: 'total_fee_charge_derived',
    totalPenaltyCharge: 'total_penalty_charge_derived',
    totalWithdrawalsFees: 'total_withdrawals_fees_derived',
    totalAnnualFees: 'total_annual_fees_derived',
    totalOverdraftInterest: 'total_overdraft_interest_derived',
    lastInterestCalculationDate: 'last_interest_calculation_date',
    lastActiveTransactionDate: 'last_active_transaction_date'
  };
  
  const updateFields = {};
  
  // Convert camelCase keys to snake_case database fields
  Object.entries(balanceUpdates).forEach(([key, value]) => {
    if (fieldMapping[key]) {
      updateFields[fieldMapping[key]] = value;
    }
  });
  
  // Build the SET clause dynamically
  const setClause = Object.keys(updateFields)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');
  
  const updateValues = [accountId, ...Object.values(updateFields)];
  
  await client.query(
    `UPDATE fineract_default.savings_account
     SET ${setClause}
     WHERE id = $1`,
    updateValues
  );
  
  return true;
}

/**
 * Create a savings account transaction
 */
async function createSavingsTransaction(client, transactionData) {
  const {
    savingsAccountId,
    paymentDetailId,
    transactionType,
    transactionDate,
    amount,
    submittedOnDate,
    submittedByUserId,
    note
  } = transactionData;
  
  // Generate transaction ID
  const transactionId = uuidv4();
  
  // Insert transaction
  await client.query(
    `INSERT INTO fineract_default.savings_account_transaction(
       id, savings_account_id, payment_detail_id, transaction_type, 
       transaction_date, amount, submitted_on_date, submitted_by_user_id, 
       is_reversed
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`,
    [
      transactionId, 
      savingsAccountId, 
      paymentDetailId, 
      transactionType,
      transactionDate,
      amount,
      submittedOnDate,
      submittedByUserId
    ]
  );
  
  // If there's a note, store it in the notes table (if implemented)
  // This is a simplified implementation; in a real system, you'd have a notes table
  
  return transactionId;
}

/**
 * Create payment details record
 */
async function createPaymentDetail(client, paymentData) {
  const {
    paymentTypeId,
    accountNumber,
    checkNumber,
    routingCode,
    receiptNumber,
    bankNumber
  } = paymentData;
  
  // Generate payment detail ID
  const paymentDetailId = uuidv4();
  
  // Insert payment detail (this assumes a payment_detail table exists)
  // In a real implementation, this would use the actual table structure
  await client.query(
    `INSERT INTO fineract_default.payment_detail(
       id, payment_type_id, account_number, check_number, 
       routing_code, receipt_number, bank_number
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      paymentDetailId, 
      paymentTypeId, 
      accountNumber, 
      checkNumber,
      routingCode,
      receiptNumber,
      bankNumber
    ]
  );
  
  return paymentDetailId;
}

/**
 * Calculate available balance for a savings account
 */
async function getAvailableBalance(client, accountId) {
  const accountQuery = await client.query(
    'SELECT * FROM fineract_default.savings_account WHERE id = $1',
    [accountId]
  );
  
  if (accountQuery.rows.length === 0) {
    throw new Error('Savings account not found');
  }
  
  const account = accountQuery.rows[0];
  let availableBalance = account.account_balance_derived;
  
  // Consider minimum balance requirement if enforced
  if (account.enforce_min_required_balance && account.min_required_balance) {
    availableBalance -= account.min_required_balance;
  }
  
  // Ensure available balance is not negative unless overdraft is allowed
  if (!account.allow_overdraft && availableBalance < 0) {
    availableBalance = 0;
  }
  
  return Math.max(0, availableBalance);
}

/**
 * Search for savings accounts with various criteria
 * @param searchParams The search parameters
 * @returns Search results with pagination
 */
export async function searchSavingsAccounts(searchParams: any) {
  const {
    accountNumber,
    externalId,
    clientId,
    groupId,
    productId,
    status,
    officeId,
    staffId,
    clientName,
    balanceFrom,
    balanceTo,
    minInterestRate,
    maxInterestRate,
    fromDate,
    toDate,
    page = 1,
    pageSize = 10,
    sortBy = 'account_no',
    sortOrder = 'asc'
  } = searchParams;

  logger.info('Searching savings accounts', { searchParams });

  // Validate pagination params
  const validatedPage = Math.max(1, page);
  const validatedPageSize = Math.min(100, Math.max(1, pageSize));
  const offset = (validatedPage - 1) * validatedPageSize;

  // Build the base query
  let queryParams: any[] = [];
  let conditions: string[] = [];

  // Add search conditions
  if (accountNumber) {
    conditions.push(`sa.account_no ILIKE $${queryParams.length + 1}`);
    queryParams.push(`%${accountNumber}%`);
  }

  if (externalId) {
    conditions.push(`sa.external_id ILIKE $${queryParams.length + 1}`);
    queryParams.push(`%${externalId}%`);
  }

  if (clientId) {
    conditions.push(`sa.client_id = $${queryParams.length + 1}`);
    queryParams.push(clientId);
  }

  if (groupId) {
    conditions.push(`sa.group_id = $${queryParams.length + 1}`);
    queryParams.push(groupId);
  }

  if (productId) {
    conditions.push(`sa.product_id = $${queryParams.length + 1}`);
    queryParams.push(productId);
  }

  if (status && Array.isArray(status) && status.length > 0) {
    // Note: Status in GraphQL might come as an array of strings but we need to translate
    // to the PostgreSQL enum we're using in the database
    conditions.push(`sa.status = ANY($${queryParams.length + 1})`);
    queryParams.push(status);
  }

  if (officeId) {
    if (conditions.some(c => c.includes('client_id') || c.includes('group_id'))) {
      conditions.push(`(
        (sa.client_id IS NOT NULL AND c.office_id = $${queryParams.length + 1}) OR
        (sa.group_id IS NOT NULL AND g.office_id = $${queryParams.length + 1})
      )`);
      queryParams.push(officeId);
      queryParams.push(officeId);
    } else {
      conditions.push(`(
        (sa.client_id IS NOT NULL AND c.office_id = $${queryParams.length + 1}) OR
        (sa.group_id IS NOT NULL AND g.office_id = $${queryParams.length + 1})
      )`);
      queryParams.push(officeId);
      queryParams.push(officeId);
    }
  }

  if (staffId) {
    conditions.push(`sa.field_officer_id = $${queryParams.length + 1}`);
    queryParams.push(staffId);
  }

  if (clientName) {
    conditions.push(`(
      (sa.client_id IS NOT NULL AND c.display_name ILIKE $${queryParams.length + 1}) OR
      (sa.group_id IS NOT NULL AND g.group_name ILIKE $${queryParams.length + 1})
    )`);
    queryParams.push(`%${clientName}%`);
    queryParams.push(`%${clientName}%`);
  }

  if (balanceFrom !== undefined) {
    conditions.push(`sa.account_balance_derived >= $${queryParams.length + 1}`);
    queryParams.push(balanceFrom);
  }

  if (balanceTo !== undefined) {
    conditions.push(`sa.account_balance_derived <= $${queryParams.length + 1}`);
    queryParams.push(balanceTo);
  }

  if (minInterestRate !== undefined) {
    conditions.push(`sa.nominal_annual_interest_rate >= $${queryParams.length + 1}`);
    queryParams.push(minInterestRate);
  }

  if (maxInterestRate !== undefined) {
    conditions.push(`sa.nominal_annual_interest_rate <= $${queryParams.length + 1}`);
    queryParams.push(maxInterestRate);
  }

  if (fromDate) {
    conditions.push(`sa.submitted_on_date >= $${queryParams.length + 1}`);
    queryParams.push(fromDate);
  }

  if (toDate) {
    conditions.push(`sa.submitted_on_date <= $${queryParams.length + 1}`);
    queryParams.push(toDate);
  }

  // Build the WHERE clause
  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Ensure sort column is valid to prevent SQL injection
  const validSortColumns = [
    'account_no', 'external_id', 'status', 'client_name', 'group_name', 'product_name',
    'account_balance_derived', 'nominal_annual_interest_rate', 'submitted_on_date',
    'activated_on_date'
  ];
  
  const sanitizedSortBy = validSortColumns.includes(sortBy) 
    ? sortBy 
    : 'account_no';
  
  // Ensure sort order is valid
  const sanitizedSortOrder = sortOrder && 
    sortOrder.toLowerCase() === 'desc' 
    ? 'DESC' 
    : 'ASC';

  // Create a SQL-safe sort column reference
  let sortByColumn = sanitizedSortBy;
  // Special handling for client/group name which might be in different tables
  if (sanitizedSortBy === 'client_name') {
    sortByColumn = `COALESCE(c.display_name, g.group_name)`;
  } else if (sanitizedSortBy === 'group_name') {
    sortByColumn = 'g.group_name';
  } else if (sanitizedSortBy === 'product_name') {
    sortByColumn = 'sp.name';
  } else {
    sortByColumn = `sa.${sanitizedSortBy}`;
  }

  try {
    // First, get the total count of results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM fineract_default.savings_account sa
      LEFT JOIN fineract_default.client c ON sa.client_id = c.id
      LEFT JOIN fineract_default.client_group g ON sa.group_id = g.id
      LEFT JOIN fineract_default.savings_product sp ON sa.product_id = sp.id
      LEFT JOIN fineract_default.staff staff ON sa.field_officer_id = staff.id
      ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / validatedPageSize);

    // If no results, return empty array
    if (totalCount === 0) {
      return {
        success: true,
        totalCount: 0,
        page: validatedPage,
        pageSize: validatedPageSize,
        totalPages: 0,
        results: []
      };
    }

    // Build the main query with pagination
    const query = `
      SELECT 
        sa.id,
        sa.account_no,
        sa.external_id,
        sa.client_id,
        CASE WHEN sa.client_id IS NOT NULL THEN c.display_name ELSE NULL END as client_name,
        sa.group_id,
        CASE WHEN sa.group_id IS NOT NULL THEN g.group_name ELSE NULL END as group_name,
        sa.product_id,
        sp.name as product_name,
        sa.field_officer_id,
        CASE WHEN sa.field_officer_id IS NOT NULL THEN staff.display_name ELSE NULL END as field_officer_name,
        sa.status,
        sa.sub_status,
        sa.account_type,
        sa.currency_code,
        sa.account_balance_derived,
        sa.nominal_annual_interest_rate,
        sa.min_required_balance,
        sa.min_required_opening_balance,
        sa.allow_overdraft,
        sa.overdraft_limit,
        sa.submitted_on_date,
        sa.approved_on_date,
        sa.activated_on_date,
        sa.closed_on_date,
        sa.last_active_transaction_date
      FROM fineract_default.savings_account sa
      LEFT JOIN fineract_default.client c ON sa.client_id = c.id
      LEFT JOIN fineract_default.client_group g ON sa.group_id = g.id
      LEFT JOIN fineract_default.savings_product sp ON sa.product_id = sp.id
      LEFT JOIN fineract_default.staff staff ON sa.field_officer_id = staff.id
      ${whereClause}
      ORDER BY ${sortByColumn} ${sanitizedSortOrder}
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    // Add pagination parameters
    queryParams.push(validatedPageSize);
    queryParams.push(offset);
    
    const result = await db.query(query, queryParams);
    
    // Map the results and calculate available balance for each account
    const accounts = await Promise.all(result.rows.map(async (row) => {
      // Calculate available balance based on overdraft settings and min required balance
      let availableBalance = row.account_balance_derived;
      
      if (row.enforce_min_required_balance && row.min_required_balance) {
        availableBalance -= row.min_required_balance;
      }
      
      if (!row.allow_overdraft && availableBalance < 0) {
        availableBalance = 0;
      }
      
      return {
        id: row.id,
        accountNo: row.account_no,
        externalId: row.external_id,
        clientId: row.client_id,
        clientName: row.client_name,
        groupId: row.group_id,
        groupName: row.group_name,
        productId: row.product_id,
        productName: row.product_name,
        fieldOfficerId: row.field_officer_id,
        fieldOfficerName: row.field_officer_name,
        status: row.status,
        subStatus: row.sub_status,
        accountType: row.account_type,
        currencyCode: row.currency_code,
        accountBalance: row.account_balance_derived,
        availableBalance: Math.max(0, availableBalance),
        nominalAnnualInterestRate: row.nominal_annual_interest_rate,
        minRequiredBalance: row.min_required_balance,
        minRequiredOpeningBalance: row.min_required_opening_balance,
        allowOverdraft: row.allow_overdraft,
        overdraftLimit: row.overdraft_limit,
        submittedOnDate: row.submitted_on_date,
        approvedOnDate: row.approved_on_date,
        activatedOnDate: row.activated_on_date,
        closedOnDate: row.closed_on_date,
        lastActiveTransactionDate: row.last_active_transaction_date
      };
    }));

    return {
      success: true,
      totalCount,
      page: validatedPage,
      pageSize: validatedPageSize,
      totalPages,
      results: accounts
    };
  } catch (error) {
    logger.error('Error searching savings accounts', error);
    throw new Error(`Failed to search savings accounts: ${error.message}`);
  }
}