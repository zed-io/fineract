"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postLoanTransactionToAccounting = postLoanTransactionToAccounting;
exports.postSavingsTransactionToAccounting = postSavingsTransactionToAccounting;
exports.processPendingAccountingTransactions = processPendingAccountingTransactions;
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const journalEntryService_1 = require("./journalEntryService");
const productAccountMappingService_1 = require("./productAccountMappingService");
const accounting_1 = require("../models/accounting");
/**
 * Post loan transaction to accounting
 * @param loanId The ID of the loan
 * @param transactionDetails Details of the loan transaction
 * @param userId The ID of the user posting the transaction
 * @returns Result of the posting operation
 */
async function postLoanTransactionToAccounting(loanId, transactionDetails, userId) {
    const { transactionId, transactionDate, amount, transactionType, paymentTypeId, currencyCode, notes } = transactionDetails;
    logger_1.logger.info('Posting loan transaction to accounting', { loanId, transactionId, transactionType });
    return db_1.db.transaction(async (client) => {
        try {
            // Get loan and product details
            const loanQuery = await client.query(`SELECT l.id, l.product_id, l.office_id, lp.accounting_type 
         FROM fineract_default.loan l
         JOIN fineract_default.loan_product lp ON l.product_id = lp.id
         WHERE l.id = $1`, [loanId]);
            if (loanQuery.rows.length === 0) {
                throw new Error(`Loan with ID ${loanId} not found`);
            }
            const loan = loanQuery.rows[0];
            // Skip if cash-based accounting is not enabled for the loan product
            if (loan.accounting_type === 'none') {
                logger_1.logger.info('Skipping accounting entries - product has accounting_type: none', { loanId, productId: loan.product_id });
                return {
                    success: true,
                    message: 'No accounting entries posted - accounting is not enabled for this loan product',
                    loanId,
                    transactionId
                };
            }
            // Define the mapping between transaction types and GL accounts
            const transactionMappings = {
                'disbursement': {
                    debit: [accounting_1.LoanAccountMappingType.LOAN_PORTFOLIO],
                    credit: [accounting_1.LoanAccountMappingType.FUND_SOURCE]
                },
                'repayment': {
                    debit: [accounting_1.LoanAccountMappingType.FUND_SOURCE],
                    credit: [accounting_1.LoanAccountMappingType.LOAN_PORTFOLIO]
                },
                'interest_posting': {
                    debit: [accounting_1.LoanAccountMappingType.INTEREST_RECEIVABLE],
                    credit: [accounting_1.LoanAccountMappingType.INTEREST_INCOME]
                },
                'fee_charge': {
                    debit: [accounting_1.LoanAccountMappingType.FUND_SOURCE],
                    credit: [accounting_1.LoanAccountMappingType.FEE_INCOME]
                },
                'penalty_charge': {
                    debit: [accounting_1.LoanAccountMappingType.FUND_SOURCE],
                    credit: [accounting_1.LoanAccountMappingType.PENALTY_INCOME]
                },
                'waive_interest': {
                    debit: [accounting_1.LoanAccountMappingType.INTEREST_INCOME],
                    credit: [accounting_1.LoanAccountMappingType.INTEREST_RECEIVABLE]
                },
                'writeoff': {
                    debit: [accounting_1.LoanAccountMappingType.LOSSES_WRITTEN_OFF],
                    credit: [accounting_1.LoanAccountMappingType.LOAN_PORTFOLIO]
                }
            };
            // Check if this transaction type is supported
            if (!transactionMappings[transactionType]) {
                throw new Error(`Unsupported transaction type for accounting: ${transactionType}`);
            }
            // Get the mapping for this transaction type
            const mapping = transactionMappings[transactionType];
            // Prepare for journal entries
            const officeId = loan.office_id;
            const productId = loan.product_id;
            const credits = [];
            const debits = [];
            // Process debit entries
            if (mapping.debit) {
                for (const mappingType of mapping.debit) {
                    const glAccountId = await (0, productAccountMappingService_1.getGLAccountIdForProductAndMappingType)(client, productId, accounting_1.ProductType.LOAN, mappingType);
                    if (!glAccountId) {
                        throw new Error(`GL account mapping not found for loan product ${productId} and mapping type ${mappingType}`);
                    }
                    debits.push({
                        glAccountId,
                        amount,
                        type: accounting_1.JournalEntryType.DEBIT,
                        comments: `Loan transaction: ${transactionType} - Loan: ${loanId}`
                    });
                }
            }
            // Process credit entries
            if (mapping.credit) {
                for (const mappingType of mapping.credit) {
                    const glAccountId = await (0, productAccountMappingService_1.getGLAccountIdForProductAndMappingType)(client, productId, accounting_1.ProductType.LOAN, mappingType);
                    if (!glAccountId) {
                        throw new Error(`GL account mapping not found for loan product ${productId} and mapping type ${mappingType}`);
                    }
                    credits.push({
                        glAccountId,
                        amount,
                        type: accounting_1.JournalEntryType.CREDIT,
                        comments: `Loan transaction: ${transactionType} - Loan: ${loanId}`
                    });
                }
            }
            // Create journal entries
            const journalEntryInput = {
                officeId,
                transactionDate,
                currencyCode,
                comments: notes || `Loan transaction: ${transactionType} - Loan: ${loanId}`,
                referenceNumber: transactionId,
                credits,
                debits,
                paymentTypeId
            };
            const result = await (0, journalEntryService_1.createJournalEntries)(journalEntryInput, userId);
            // Update loan transaction to mark it as posted to accounting
            await client.query(`UPDATE fineract_default.loan_transaction 
         SET is_accounted = true,
             last_modified_date = CURRENT_TIMESTAMP,
             last_modified_by = $1
         WHERE id = $2`, [userId, transactionId]);
            return {
                success: true,
                message: 'Loan transaction posted to accounting successfully',
                loanId,
                transactionId,
                journalEntryResult: result
            };
        }
        catch (error) {
            logger_1.logger.error('Error posting loan transaction to accounting', error);
            throw new Error(`Failed to post loan transaction to accounting: ${error.message}`);
        }
    });
}
/**
 * Post savings transaction to accounting
 * @param savingsId The ID of the savings account
 * @param transactionDetails Details of the savings transaction
 * @param userId The ID of the user posting the transaction
 * @returns Result of the posting operation
 */
async function postSavingsTransactionToAccounting(savingsId, transactionDetails, userId) {
    const { transactionId, transactionDate, amount, transactionType, paymentTypeId, currencyCode, notes } = transactionDetails;
    logger_1.logger.info('Posting savings transaction to accounting', { savingsId, transactionId, transactionType });
    return db_1.db.transaction(async (client) => {
        try {
            // Get savings account and product details
            const savingsQuery = await client.query(`SELECT s.id, s.product_id, s.office_id, sp.accounting_type 
         FROM fineract_default.savings_account s
         JOIN fineract_default.savings_product sp ON s.product_id = sp.id
         WHERE s.id = $1`, [savingsId]);
            if (savingsQuery.rows.length === 0) {
                throw new Error(`Savings account with ID ${savingsId} not found`);
            }
            const savings = savingsQuery.rows[0];
            // Skip if cash-based accounting is not enabled for the savings product
            if (savings.accounting_type === 'none') {
                logger_1.logger.info('Skipping accounting entries - product has accounting_type: none', { savingsId, productId: savings.product_id });
                return {
                    success: true,
                    message: 'No accounting entries posted - accounting is not enabled for this savings product',
                    savingsId,
                    transactionId
                };
            }
            // Define the mapping between transaction types and GL accounts
            const transactionMappings = {
                'deposit': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL],
                    credit: [accounting_1.SavingsAccountMappingType.SAVINGS_REFERENCE]
                },
                'withdrawal': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_REFERENCE],
                    credit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL]
                },
                'interest_posting': {
                    debit: [accounting_1.SavingsAccountMappingType.INTEREST_ON_SAVINGS],
                    credit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL]
                },
                'fee_charge': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL],
                    credit: [accounting_1.SavingsAccountMappingType.INCOME_FROM_FEES]
                },
                'penalty_charge': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL],
                    credit: [accounting_1.SavingsAccountMappingType.PENALTY_INCOME]
                },
                'withdrawal_fee': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL],
                    credit: [accounting_1.SavingsAccountMappingType.INCOME_FROM_FEES]
                },
                'annual_fee': {
                    debit: [accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL],
                    credit: [accounting_1.SavingsAccountMappingType.INCOME_FROM_FEES]
                }
            };
            // Check if this transaction type is supported
            if (!transactionMappings[transactionType]) {
                throw new Error(`Unsupported transaction type for accounting: ${transactionType}`);
            }
            // Get the mapping for this transaction type
            const mapping = transactionMappings[transactionType];
            // Prepare for journal entries
            const officeId = savings.office_id;
            const productId = savings.product_id;
            const credits = [];
            const debits = [];
            // Process debit entries
            if (mapping.debit) {
                for (const mappingType of mapping.debit) {
                    const glAccountId = await (0, productAccountMappingService_1.getGLAccountIdForProductAndMappingType)(client, productId, accounting_1.ProductType.SAVINGS, mappingType);
                    if (!glAccountId) {
                        throw new Error(`GL account mapping not found for savings product ${productId} and mapping type ${mappingType}`);
                    }
                    debits.push({
                        glAccountId,
                        amount,
                        type: accounting_1.JournalEntryType.DEBIT,
                        comments: `Savings transaction: ${transactionType} - Savings: ${savingsId}`
                    });
                }
            }
            // Process credit entries
            if (mapping.credit) {
                for (const mappingType of mapping.credit) {
                    const glAccountId = await (0, productAccountMappingService_1.getGLAccountIdForProductAndMappingType)(client, productId, accounting_1.ProductType.SAVINGS, mappingType);
                    if (!glAccountId) {
                        throw new Error(`GL account mapping not found for savings product ${productId} and mapping type ${mappingType}`);
                    }
                    credits.push({
                        glAccountId,
                        amount,
                        type: accounting_1.JournalEntryType.CREDIT,
                        comments: `Savings transaction: ${transactionType} - Savings: ${savingsId}`
                    });
                }
            }
            // Create journal entries
            const journalEntryInput = {
                officeId,
                transactionDate,
                currencyCode,
                comments: notes || `Savings transaction: ${transactionType} - Savings: ${savingsId}`,
                referenceNumber: transactionId,
                credits,
                debits,
                paymentTypeId
            };
            const result = await (0, journalEntryService_1.createJournalEntries)(journalEntryInput, userId);
            // Update savings transaction to mark it as posted to accounting
            await client.query(`UPDATE fineract_default.savings_account_transaction 
         SET is_accounted = true,
             last_modified_date = CURRENT_TIMESTAMP,
             last_modified_by = $1
         WHERE id = $2`, [userId, transactionId]);
            return {
                success: true,
                message: 'Savings transaction posted to accounting successfully',
                savingsId,
                transactionId,
                journalEntryResult: result
            };
        }
        catch (error) {
            logger_1.logger.error('Error posting savings transaction to accounting', error);
            throw new Error(`Failed to post savings transaction to accounting: ${error.message}`);
        }
    });
}
/**
 * Process pending accounting transactions
 * @param type The type of transaction to process ('loan' or 'savings')
 * @param batchSize The number of transactions to process in a batch
 * @param userId The ID of the user processing the transactions
 * @returns Result of the batch processing
 */
async function processPendingAccountingTransactions(type, batchSize = 50, userId) {
    logger_1.logger.info('Processing pending accounting transactions', { type, batchSize });
    try {
        let processedCount = 0;
        let errorCount = 0;
        const results = [];
        if (type === 'loan') {
            // Get pending loan transactions
            const pendingTransactionsQuery = await db_1.db.query(`SELECT lt.id, lt.loan_id, lt.transaction_date, lt.transaction_type, lt.amount, l.currency_code
         FROM fineract_default.loan_transaction lt
         JOIN fineract_default.loan l ON lt.loan_id = l.id
         JOIN fineract_default.loan_product lp ON l.product_id = lp.id
         WHERE lt.is_accounted = false
         AND lp.accounting_type != 'none'
         ORDER BY lt.transaction_date
         LIMIT $1`, [batchSize]);
            // Process each transaction
            for (const transaction of pendingTransactionsQuery.rows) {
                try {
                    const result = await postLoanTransactionToAccounting(transaction.loan_id, {
                        transactionId: transaction.id,
                        transactionDate: transaction.transaction_date,
                        amount: transaction.amount,
                        transactionType: transaction.transaction_type,
                        currencyCode: transaction.currency_code
                    }, userId);
                    results.push({
                        transactionId: transaction.id,
                        loanId: transaction.loan_id,
                        status: 'success'
                    });
                    processedCount++;
                }
                catch (error) {
                    results.push({
                        transactionId: transaction.id,
                        loanId: transaction.loan_id,
                        status: 'error',
                        error: error.message
                    });
                    errorCount++;
                    logger_1.logger.error('Error processing loan transaction', {
                        transactionId: transaction.id,
                        loanId: transaction.loan_id,
                        error
                    });
                }
            }
        }
        else if (type === 'savings') {
            // Get pending savings transactions
            const pendingTransactionsQuery = await db_1.db.query(`SELECT st.id, st.savings_account_id, st.transaction_date, st.transaction_type, st.amount, s.currency_code
         FROM fineract_default.savings_account_transaction st
         JOIN fineract_default.savings_account s ON st.savings_account_id = s.id
         JOIN fineract_default.savings_product sp ON s.product_id = sp.id
         WHERE st.is_accounted = false
         AND sp.accounting_type != 'none'
         ORDER BY st.transaction_date
         LIMIT $1`, [batchSize]);
            // Process each transaction
            for (const transaction of pendingTransactionsQuery.rows) {
                try {
                    const result = await postSavingsTransactionToAccounting(transaction.savings_account_id, {
                        transactionId: transaction.id,
                        transactionDate: transaction.transaction_date,
                        amount: transaction.amount,
                        transactionType: transaction.transaction_type,
                        currencyCode: transaction.currency_code
                    }, userId);
                    results.push({
                        transactionId: transaction.id,
                        savingsId: transaction.savings_account_id,
                        status: 'success'
                    });
                    processedCount++;
                }
                catch (error) {
                    results.push({
                        transactionId: transaction.id,
                        savingsId: transaction.savings_account_id,
                        status: 'error',
                        error: error.message
                    });
                    errorCount++;
                    logger_1.logger.error('Error processing savings transaction', {
                        transactionId: transaction.id,
                        savingsId: transaction.savings_account_id,
                        error
                    });
                }
            }
        }
        else {
            throw new Error(`Invalid transaction type: ${type}`);
        }
        return {
            success: true,
            type,
            totalProcessed: processedCount,
            successCount: processedCount - errorCount,
            errorCount,
            results
        };
    }
    catch (error) {
        logger_1.logger.error('Error processing pending accounting transactions', error);
        return {
            success: false,
            message: error.message
        };
    }
}
