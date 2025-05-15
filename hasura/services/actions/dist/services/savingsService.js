"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveSavingsAccount = approveSavingsAccount;
exports.activateSavingsAccount = activateSavingsAccount;
exports.depositToSavings = depositToSavings;
exports.withdrawFromSavings = withdrawFromSavings;
exports.postInterestToSavings = postInterestToSavings;
exports.calculateSavingsInterest = calculateSavingsInterest;
const uuid_1 = require("uuid");
const decimal_js_1 = __importDefault(require("decimal.js"));
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const savingsCalculationService_1 = require("./savingsCalculationService");
const savings_1 = require("../models/savings");
// Initialize the savings calculation service
const savingsCalculationService = new savingsCalculationService_1.SavingsCalculationService();
/**
 * Approve a savings account
 * @param input The approval input with account ID and approval date
 * @param userId The ID of the user approving the account
 * @returns Result of the approval operation
 */
async function approveSavingsAccount(input, userId) {
    const { accountId, approvedOnDate, note } = input;
    logger_1.logger.info('Approving savings account', { accountId, approvedOnDate, userId });
    return db_1.db.transaction(async (client) => {
        // Get account details
        const account = await getSavingsAccountById(client, accountId);
        if (!account) {
            throw new Error('Savings account not found');
        }
        // Validate account status
        if (account.status !== savings_1.SavingsAccountStatus.SUBMITTED_AND_PENDING_APPROVAL) {
            throw new Error(`Cannot approve savings account with status ${account.status}`);
        }
        // Update account status and approval details
        await updateSavingsAccountStatus(client, accountId, savings_1.SavingsAccountStatus.APPROVED, userId, approvedOnDate, {
            approved_on_date: approvedOnDate,
            approved_by_user_id: userId
        });
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
async function activateSavingsAccount(input, userId) {
    const { accountId, activatedOnDate, note } = input;
    logger_1.logger.info('Activating savings account', { accountId, activatedOnDate, userId });
    return db_1.db.transaction(async (client) => {
        // Get account details
        const account = await getSavingsAccountById(client, accountId);
        if (!account) {
            throw new Error('Savings account not found');
        }
        // Validate account status
        if (account.status !== savings_1.SavingsAccountStatus.APPROVED) {
            throw new Error(`Cannot activate savings account with status ${account.status}`);
        }
        // Update account status and activation details
        await updateSavingsAccountStatus(client, accountId, savings_1.SavingsAccountStatus.ACTIVE, userId, activatedOnDate, {
            activated_on_date: activatedOnDate,
            activated_by_user_id: userId
        });
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
async function depositToSavings(input, userId) {
    const { accountId, transactionDate, transactionAmount, paymentTypeId, note, receiptNumber, checkNumber, routingCode, bankNumber, accountNumber } = input;
    logger_1.logger.info('Processing savings deposit', { accountId, transactionDate, transactionAmount, userId });
    return db_1.db.transaction(async (client) => {
        // Get account details
        const account = await getSavingsAccountById(client, accountId);
        if (!account) {
            throw new Error('Savings account not found');
        }
        // Validate account status
        if (account.status !== savings_1.SavingsAccountStatus.ACTIVE) {
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
            transactionType: savings_1.SavingsTransactionType.DEPOSIT,
            transactionDate,
            amount: transactionAmount,
            submittedOnDate: transactionDate,
            submittedByUserId: userId,
            note
        });
        // Update account balances
        const updatedBalance = new decimal_js_1.default(account.account_balance_derived).plus(transactionAmount).toNumber();
        const totalDeposits = new decimal_js_1.default(account.total_deposits_derived).plus(transactionAmount).toNumber();
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
async function withdrawFromSavings(input, userId) {
    const { accountId, transactionDate, transactionAmount, paymentTypeId, note, receiptNumber, checkNumber, routingCode, bankNumber, accountNumber } = input;
    logger_1.logger.info('Processing savings withdrawal', { accountId, transactionDate, transactionAmount, userId });
    return db_1.db.transaction(async (client) => {
        // Get account details
        const account = await getSavingsAccountById(client, accountId);
        if (!account) {
            throw new Error('Savings account not found');
        }
        // Validate account status
        if (account.status !== savings_1.SavingsAccountStatus.ACTIVE) {
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
            const potentialBalance = new decimal_js_1.default(account.account_balance_derived).minus(transactionAmount).toNumber();
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
            transactionType: savings_1.SavingsTransactionType.WITHDRAWAL,
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
                transactionType: savings_1.SavingsTransactionType.WITHDRAWAL_FEE,
                transactionDate,
                amount: feeAmount,
                submittedOnDate: transactionDate,
                submittedByUserId: userId,
                note: 'Automatic withdrawal fee'
            });
        }
        // Update account balances
        const totalAmount = new decimal_js_1.default(transactionAmount).plus(feeAmount).toNumber();
        const updatedBalance = new decimal_js_1.default(account.account_balance_derived).minus(totalAmount).toNumber();
        const totalWithdrawals = new decimal_js_1.default(account.total_withdrawals_derived).plus(transactionAmount).toNumber();
        const totalWithdrawalFees = new decimal_js_1.default(account.total_withdrawals_fees_derived).plus(feeAmount).toNumber();
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
async function postInterestToSavings(input, userId) {
    const { accountId, postingDate, batchSize = 100, isScheduledPosting = false } = input;
    logger_1.logger.info('Posting interest to savings', { accountId, postingDate, userId });
    return db_1.db.transaction(async (client) => {
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
            const accountsQuery = await client.query(`SELECT id FROM fineract_default.savings_account 
         WHERE status = 'active' 
         AND (last_interest_calculation_date IS NULL 
              OR DATE(last_interest_calculation_date) < $1)
         LIMIT $2`, [postingDate, batchSize]);
            // Process each account
            for (const row of accountsQuery.rows) {
                try {
                    const result = await postInterestForAccount(client, row.id, postingDate, userId);
                    postingResults.push(result);
                    processedCount++;
                }
                catch (error) {
                    errorCount++;
                    logger_1.logger.error('Error posting interest for account', { accountId: row.id, error });
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
        }
        catch (error) {
            logger_1.logger.error('Error in batch interest posting', error);
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
    if (account.status !== savings_1.SavingsAccountStatus.ACTIVE) {
        throw new Error(`Cannot post interest to savings account with status ${account.status}`);
    }
    // Determine calculation period
    const fromDate = account.last_interest_calculation_date || account.activated_on_date;
    // Get transactions for the period
    const transactionsQuery = await client.query(`SELECT * FROM fineract_default.savings_account_transaction 
     WHERE savings_account_id = $1 
     AND transaction_date >= $2 
     AND transaction_date <= $3
     AND is_reversed = false
     ORDER BY transaction_date ASC`, [accountId, fromDate, postingDate]);
    // Calculate interest
    const interestResult = await savingsCalculationService.calculateInterest(account, fromDate, postingDate, transactionsQuery.rows);
    // Only post interest if there's any to post
    if (interestResult.totalInterestEarned > 0) {
        // Create interest posting transaction
        const transactionId = await createSavingsTransaction(client, {
            savingsAccountId: accountId,
            transactionType: savings_1.SavingsTransactionType.INTEREST_POSTING,
            transactionDate: postingDate,
            amount: interestResult.totalInterestEarned,
            submittedOnDate: postingDate,
            submittedByUserId: userId,
            note: 'Interest posting'
        });
        // Update account balances
        const updatedBalance = new decimal_js_1.default(account.account_balance_derived)
            .plus(interestResult.totalInterestEarned).toNumber();
        const totalInterestPosted = new decimal_js_1.default(account.total_interest_posted_derived)
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
    }
    else {
        // Just update the last interest calculation date
        await client.query(`UPDATE fineract_default.savings_account 
       SET last_interest_calculation_date = $1 
       WHERE id = $2`, [postingDate, accountId]);
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
async function calculateSavingsInterest(input) {
    const { accountId, calculationDate = new Date().toISOString().split('T')[0] } = input;
    logger_1.logger.info('Calculating savings interest', { accountId, calculationDate });
    try {
        // Get account details
        const accountQuery = await db_1.db.query(`SELECT * FROM fineract_default.savings_account WHERE id = $1`, [accountId]);
        if (accountQuery.rows.length === 0) {
            throw new Error('Savings account not found');
        }
        const account = accountQuery.rows[0];
        // Validate account status
        if (account.status !== savings_1.SavingsAccountStatus.ACTIVE) {
            throw new Error(`Cannot calculate interest for savings account with status ${account.status}`);
        }
        // Determine calculation period
        const fromDate = account.last_interest_calculation_date || account.activated_on_date;
        // Get transactions for the period
        const transactionsQuery = await db_1.db.query(`SELECT * FROM fineract_default.savings_account_transaction 
       WHERE savings_account_id = $1 
       AND transaction_date >= $2 
       AND transaction_date <= $3
       AND is_reversed = false
       ORDER BY transaction_date ASC`, [accountId, fromDate, calculationDate]);
        // Calculate interest
        const interestResult = await savingsCalculationService.calculateInterest(account, fromDate, calculationDate, transactionsQuery.rows);
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
    }
    catch (error) {
        logger_1.logger.error('Error calculating savings interest', error);
        return {
            success: false,
            message: error.message
        };
    }
}
// Helper functions
/**
 * Get savings account by ID
 */
async function getSavingsAccountById(client, accountId) {
    const query = await client.query('SELECT * FROM fineract_default.savings_account WHERE id = $1', [accountId]);
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
    await client.query(`UPDATE fineract_default.savings_account
     SET ${setClause}
     WHERE id = $1`, updateValues);
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
    await client.query(`UPDATE fineract_default.savings_account
     SET ${setClause}
     WHERE id = $1`, updateValues);
    return true;
}
/**
 * Create a savings account transaction
 */
async function createSavingsTransaction(client, transactionData) {
    const { savingsAccountId, paymentDetailId, transactionType, transactionDate, amount, submittedOnDate, submittedByUserId, note } = transactionData;
    // Generate transaction ID
    const transactionId = (0, uuid_1.v4)();
    // Insert transaction
    await client.query(`INSERT INTO fineract_default.savings_account_transaction(
       id, savings_account_id, payment_detail_id, transaction_type, 
       transaction_date, amount, submitted_on_date, submitted_by_user_id, 
       is_reversed
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)`, [
        transactionId,
        savingsAccountId,
        paymentDetailId,
        transactionType,
        transactionDate,
        amount,
        submittedOnDate,
        submittedByUserId
    ]);
    // If there's a note, store it in the notes table (if implemented)
    // This is a simplified implementation; in a real system, you'd have a notes table
    return transactionId;
}
/**
 * Create payment details record
 */
async function createPaymentDetail(client, paymentData) {
    const { paymentTypeId, accountNumber, checkNumber, routingCode, receiptNumber, bankNumber } = paymentData;
    // Generate payment detail ID
    const paymentDetailId = (0, uuid_1.v4)();
    // Insert payment detail (this assumes a payment_detail table exists)
    // In a real implementation, this would use the actual table structure
    await client.query(`INSERT INTO fineract_default.payment_detail(
       id, payment_type_id, account_number, check_number, 
       routing_code, receipt_number, bank_number
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        paymentDetailId,
        paymentTypeId,
        accountNumber,
        checkNumber,
        routingCode,
        receiptNumber,
        bankNumber
    ]);
    return paymentDetailId;
}
/**
 * Calculate available balance for a savings account
 */
async function getAvailableBalance(client, accountId) {
    const accountQuery = await client.query('SELECT * FROM fineract_default.savings_account WHERE id = $1', [accountId]);
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
