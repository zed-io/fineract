"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJournalEntries = createJournalEntries;
exports.reverseJournalEntries = reverseJournalEntries;
exports.getJournalEntries = getJournalEntries;
exports.getTrialBalance = getTrialBalance;
const uuid_1 = require("uuid");
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const accounting_1 = require("../models/accounting");
/**
 * Create journal entries
 * @param input The journal entry creation input
 * @param userId The ID of the user creating the entry
 * @returns Result of the journal entry creation
 */
async function createJournalEntries(input, userId) {
    const { officeId, transactionDate, currencyCode, comments, referenceNumber, accountingRule, credits, debits, paymentTypeId, accountNumber, checkNumber, routingCode, receiptNumber, bankNumber } = input;
    logger_1.logger.info('Creating journal entries', { officeId, transactionDate, userId });
    return db_1.db.transaction(async (client) => {
        try {
            // Validate total debits = total credits (accounting equation must balance)
            const totalDebits = debits.reduce((sum, entry) => sum + entry.amount, 0);
            const totalCredits = credits.reduce((sum, entry) => sum + entry.amount, 0);
            if (totalDebits !== totalCredits) {
                throw new Error(`Journal entry must balance. Total debits (${totalDebits}) must equal total credits (${totalCredits})`);
            }
            // Check if accounts exist and are enabled
            await validateAccounts(client, [...debits.map(d => d.glAccountId), ...credits.map(c => c.glAccountId)]);
            // Check if the office exists
            await validateOffice(client, officeId);
            // Check if accounting period is open for this date
            await validateAccountingPeriodOpen(client, officeId, transactionDate);
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
            // Generate unique transaction ID
            const transactionId = referenceNumber || `JE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            // Create journal entries for debits
            const debitEntryIds = await Promise.all(debits.map(debit => createSingleJournalEntry(client, debit.glAccountId, officeId, transactionId, transactionDate, accounting_1.JournalEntryType.DEBIT, debit.amount, debit.comments || comments, currencyCode, paymentDetailId, userId)));
            // Create journal entries for credits
            const creditEntryIds = await Promise.all(credits.map(credit => createSingleJournalEntry(client, credit.glAccountId, officeId, transactionId, transactionDate, accounting_1.JournalEntryType.CREDIT, credit.amount, credit.comments || comments, currencyCode, paymentDetailId, userId)));
            // Return success response
            return {
                success: true,
                transactionId,
                officeId,
                transactionDate,
                amount: totalCredits, // or totalDebits, they should be equal
                entryIds: [...debitEntryIds, ...creditEntryIds],
                message: 'Journal entries created successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating journal entries', error);
            throw new Error(`Failed to create journal entries: ${error.message}`);
        }
    });
}
/**
 * Reverse a journal entry transaction
 * @param input The journal entry reversal input
 * @param userId The ID of the user reversing the entry
 * @returns Result of the journal entry reversal
 */
async function reverseJournalEntries(input, userId) {
    const { transactionId, comments } = input;
    logger_1.logger.info('Reversing journal entries', { transactionId, userId });
    return db_1.db.transaction(async (client) => {
        try {
            // Find all journal entries with the transaction ID
            const entriesQuery = await client.query(`SELECT * FROM fineract_default.gl_journal_entry 
         WHERE transaction_id = $1 AND reversed = false`, [transactionId]);
            if (entriesQuery.rows.length === 0) {
                throw new Error(`No journal entries found with transaction ID ${transactionId} or entries are already reversed`);
            }
            const entries = entriesQuery.rows;
            const entryDate = new Date().toISOString().split('T')[0];
            const reversalTransactionId = `REVERSAL-${transactionId}`;
            const firstEntry = entries[0];
            // Create reversal entries
            const reversalIds = await Promise.all(entries.map(entry => {
                // Create a reversal entry with opposite type
                const reversalType = entry.type === accounting_1.JournalEntryType.DEBIT ?
                    accounting_1.JournalEntryType.CREDIT : accounting_1.JournalEntryType.DEBIT;
                return createSingleJournalEntry(client, entry.account_id, entry.office_id, reversalTransactionId, entryDate, reversalType, entry.amount, comments || `Reversal of transaction ${transactionId}`, entry.currency_code, entry.payment_details_id, userId);
            }));
            // Update original entries to mark as reversed
            await client.query(`UPDATE fineract_default.gl_journal_entry 
         SET reversed = true, 
             reversal_id = $1,
             last_modified_date = CURRENT_TIMESTAMP
         WHERE transaction_id = $2`, [reversalTransactionId, transactionId]);
            // Return success response
            return {
                success: true,
                transactionId: reversalTransactionId,
                originalTransactionId: transactionId,
                entryIds: reversalIds,
                reversedOn: entryDate,
                message: 'Journal entries reversed successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error reversing journal entries', error);
            throw new Error(`Failed to reverse journal entries: ${error.message}`);
        }
    });
}
/**
 * Get journal entries with optional filtering
 * @param filters Various filters for journal entries
 * @returns List of journal entries matching the filters
 */
async function getJournalEntries(filters = {}) {
    const { officeId, glAccountId, manualEntriesOnly, fromDate, toDate, transactionId, entityType, entityId, limit = 100, offset = 0 } = filters;
    logger_1.logger.info('Fetching journal entries', { filters });
    try {
        // Build WHERE clause based on filters
        const whereConditions = [];
        const queryParams = [];
        let paramCount = 1;
        if (officeId) {
            whereConditions.push(`je.office_id = $${paramCount++}`);
            queryParams.push(officeId);
        }
        if (glAccountId) {
            whereConditions.push(`je.account_id = $${paramCount++}`);
            queryParams.push(glAccountId);
        }
        if (manualEntriesOnly) {
            whereConditions.push(`je.manual_entry = true`);
        }
        if (fromDate) {
            whereConditions.push(`je.entry_date >= $${paramCount++}`);
            queryParams.push(fromDate);
        }
        if (toDate) {
            whereConditions.push(`je.entry_date <= $${paramCount++}`);
            queryParams.push(toDate);
        }
        if (transactionId) {
            whereConditions.push(`je.transaction_id = $${paramCount++}`);
            queryParams.push(transactionId);
        }
        if (entityType) {
            whereConditions.push(`je.entity_type = $${paramCount++}`);
            queryParams.push(entityType);
        }
        if (entityId) {
            whereConditions.push(`je.entity_id = $${paramCount++}`);
            queryParams.push(entityId);
        }
        const whereClause = whereConditions.length > 0 ?
            'WHERE ' + whereConditions.join(' AND ') : '';
        // Add pagination parameters
        queryParams.push(limit);
        queryParams.push(offset);
        // Execute query
        const query = `
      SELECT 
        je.id, 
        je.account_id as "accountId",
        gl.name as "accountName",
        gl.gl_code as "glCode",
        je.office_id as "officeId",
        o.name as "officeName",
        je.transaction_id as "transactionId",
        je.reversed,
        je.manual_entry as "manualEntry",
        je.entry_date as "entryDate",
        je.type,
        je.amount,
        je.description,
        je.entity_type as "entityType",
        je.entity_id as "entityId",
        je.currency_code as "currencyCode",
        je.submitted_on_date as "submittedOnDate"
      FROM fineract_default.gl_journal_entry je
      JOIN fineract_default.gl_account gl ON je.account_id = gl.id
      JOIN fineract_default.office o ON je.office_id = o.id
      ${whereClause}
      ORDER BY je.entry_date DESC, je.id
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;
        const journalEntries = await db_1.db.query(query, queryParams);
        // Count total entries
        const countQuery = `
      SELECT COUNT(*) as total
      FROM fineract_default.gl_journal_entry je
      ${whereClause}
    `;
        const countResult = await db_1.db.query(countQuery, queryParams.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total);
        return {
            success: true,
            totalFilteredRecords: totalCount,
            pageItems: journalEntries.rows,
            limit,
            offset
        };
    }
    catch (error) {
        logger_1.logger.error('Error fetching journal entries', error);
        return {
            success: false,
            message: error.message
        };
    }
}
/**
 * Get trial balance report
 * @param criteria Search criteria for the trial balance
 * @returns Trial balance report
 */
async function getTrialBalance(criteria) {
    const { officeId, runningBalanceOnly, closingBalanceOnly, asOnDate, includeAccumulated } = criteria;
    logger_1.logger.info('Generating trial balance', { criteria });
    try {
        // Get office name
        const officeQuery = await db_1.db.query(`SELECT name FROM fineract_default.office WHERE id = $1`, [officeId]);
        if (officeQuery.rows.length === 0) {
            throw new Error(`Office with ID ${officeId} not found`);
        }
        const officeName = officeQuery.rows[0].name;
        // Calculate date ranges
        const endDate = asOnDate || new Date().toISOString().split('T')[0];
        // Fetch GL accounts and account balances
        const query = `
      WITH account_balances AS (
        SELECT 
          ga.id as account_id,
          ga.name as account_name,
          ga.gl_code as account_code,
          ga.account_type,
          COALESCE(SUM(CASE WHEN je.type = 'debit' THEN je.amount ELSE 0 END), 0) as debit_amount,
          COALESCE(SUM(CASE WHEN je.type = 'credit' THEN je.amount ELSE 0 END), 0) as credit_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je 
        ON 
          ga.id = je.account_id
          AND je.office_id = $1
          AND je.entry_date <= $2
          AND je.reversed = false
        WHERE 
          ga.disabled = false
          AND ga.account_usage = 'detail'
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.account_type
      )
      SELECT 
        account_id, 
        account_name, 
        account_code, 
        account_type,
        debit_amount,
        credit_amount,
        CASE 
          WHEN account_type IN ('asset', 'expense') THEN debit_amount - credit_amount
          WHEN account_type IN ('liability', 'equity', 'income') THEN credit_amount - debit_amount
          ELSE 0
        END as balance
      FROM 
        account_balances
      ORDER BY 
        account_code
    `;
        const result = await db_1.db.query(query, [officeId, endDate]);
        // Transform results
        const entries = result.rows.map(row => ({
            accountId: row.account_id,
            accountName: row.account_name,
            accountCode: row.account_code,
            accountType: row.account_type,
            debitAmount: parseFloat(row.debit_amount),
            creditAmount: parseFloat(row.credit_amount),
            balance: parseFloat(row.balance)
        }));
        // Calculate totals
        const totalDebit = entries.reduce((sum, entry) => sum + entry.debitAmount, 0);
        const totalCredit = entries.reduce((sum, entry) => sum + entry.creditAmount, 0);
        const totalBalance = entries.reduce((sum, entry) => sum + entry.balance, 0);
        return {
            office: officeName,
            asOnDate: endDate,
            entries,
            totalDebit,
            totalCredit,
            totalBalance
        };
    }
    catch (error) {
        logger_1.logger.error('Error generating trial balance', error);
        throw new Error(`Failed to generate trial balance: ${error.message}`);
    }
}
/**
 * Create a single journal entry
 */
async function createSingleJournalEntry(client, accountId, officeId, transactionId, entryDate, type, amount, description, currencyCode, paymentDetailsId, submittedByUserId, entityType, entityId, manualEntry = false) {
    // Generate entry ID
    const entryId = (0, uuid_1.v4)();
    // Insert journal entry
    await client.query(`INSERT INTO fineract_default.gl_journal_entry(
       id, account_id, office_id, transaction_id, reversed, 
       manual_entry, entry_date, type, amount, description,
       entity_type, entity_id, currency_code, payment_details_id,
       submitted_on_date, submitted_by_user_id
     )
     VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`, [
        entryId,
        accountId,
        officeId,
        transactionId,
        manualEntry,
        entryDate,
        type,
        amount,
        description,
        entityType,
        entityId,
        currencyCode,
        paymentDetailsId,
        entryDate, // submitted date is same as entry date
        submittedByUserId
    ]);
    return entryId;
}
/**
 * Validate that the accounts exist and are enabled
 */
async function validateAccounts(client, accountIds) {
    const uniqueAccountIds = [...new Set(accountIds)];
    // Check if all accounts exist and are enabled
    const accountsQuery = await client.query(`SELECT id, name, disabled, manual_entries_allowed 
     FROM fineract_default.gl_account 
     WHERE id = ANY($1)`, [uniqueAccountIds]);
    // Check if all accounts were found
    if (accountsQuery.rows.length !== uniqueAccountIds.length) {
        const foundAccountIds = accountsQuery.rows.map(row => row.id);
        const missingAccountIds = uniqueAccountIds.filter(id => !foundAccountIds.includes(id));
        throw new Error(`GL accounts not found: ${missingAccountIds.join(', ')}`);
    }
    // Check if any account is disabled
    const disabledAccounts = accountsQuery.rows.filter(row => row.disabled);
    if (disabledAccounts.length > 0) {
        throw new Error(`The following GL accounts are disabled: ${disabledAccounts.map(a => a.name).join(', ')}`);
    }
    // Check if manual entries are allowed for all accounts
    const manualEntriesDisallowedAccounts = accountsQuery.rows.filter(row => !row.manual_entries_allowed);
    if (manualEntriesDisallowedAccounts.length > 0) {
        throw new Error(`The following GL accounts do not allow manual entries: ${manualEntriesDisallowedAccounts.map(a => a.name).join(', ')}`);
    }
}
/**
 * Validate that the office exists
 */
async function validateOffice(client, officeId) {
    const officeQuery = await client.query(`SELECT id FROM fineract_default.office WHERE id = $1`, [officeId]);
    if (officeQuery.rows.length === 0) {
        throw new Error(`Office with ID ${officeId} not found`);
    }
}
/**
 * Validate that the accounting period is open for the given date
 */
async function validateAccountingPeriodOpen(client, officeId, transactionDate) {
    // Check if there's a GL closure for this office with a date >= the transaction date
    const closureQuery = await client.query(`SELECT closing_date FROM fineract_default.gl_closure 
     WHERE office_id = $1 
     AND closing_date >= $2 
     AND is_deleted = false 
     ORDER BY closing_date ASC 
     LIMIT 1`, [officeId, transactionDate]);
    if (closureQuery.rows.length > 0) {
        throw new Error(`The accounting period for this transaction date (${transactionDate}) is closed. The closing date is ${closureQuery.rows[0].closing_date}`);
    }
}
/**
 * Create payment details record
 */
async function createPaymentDetail(client, paymentData) {
    const { paymentTypeId, accountNumber, checkNumber, routingCode, receiptNumber, bankNumber } = paymentData;
    // Generate payment detail ID
    const paymentDetailId = (0, uuid_1.v4)();
    // Insert payment detail
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
