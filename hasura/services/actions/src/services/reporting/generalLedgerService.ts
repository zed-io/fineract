/**
 * General Ledger Service
 * Provides functions for generating general ledger reports
 */

import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  GeneralLedgerReport,
  GeneralLedgerAccount,
  GeneralLedgerEntry,
  AccountType
} from '../../models/reporting/financialReports';

/**
 * Generate a General Ledger report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param accountId Optional GL account ID to filter by (null for all accounts)
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns General ledger report
 */
export async function generateGeneralLedgerReport(
  fromDate: string,
  toDate: string,
  accountId?: string,
  officeId?: string,
  currencyCode?: string
): Promise<GeneralLedgerReport> {
  logger.info('Generating general ledger report', { fromDate, toDate, accountId, officeId, currencyCode });

  try {
    // Build params array for query
    const params: any[] = [fromDate, toDate];
    let paramIndex = 3;
    
    // Build WHERE clause for optional filters
    let whereClause = '';
    let accountFilter = '';
    
    if (accountId) {
      accountFilter = ` AND ga.id = $${paramIndex}`;
      params.push(accountId);
      paramIndex++;
    }
    
    if (officeId) {
      whereClause += ` AND je.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }
    
    if (currencyCode) {
      whereClause += ` AND ga.currency_code = $${paramIndex}`;
      params.push(currencyCode);
      paramIndex++;
    }
    
    // Get default currency if not specified
    let currency = currencyCode;
    if (!currencyCode) {
      const currencyQuery = await db.query(
        `SELECT default_currency_code FROM fineract_default.organization_currency LIMIT 1`
      );
      
      if (currencyQuery.rows.length > 0) {
        currency = currencyQuery.rows[0].default_currency_code;
      } else {
        currency = 'USD'; // Default fallback
      }
    }

    // Get office name if specified
    let reportName = 'General Ledger';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );
      
      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }
    
    // Get account name if specified
    if (accountId) {
      const accountQuery = await db.query(
        `SELECT name FROM fineract_default.gl_account WHERE id = $1`,
        [accountId]
      );
      
      if (accountQuery.rows.length > 0) {
        reportName += ` - ${accountQuery.rows[0].name}`;
      }
    }
    
    // Add date to report name
    reportName += ` from ${fromDate} to ${toDate}`;

    // Query to get accounts to include in the report
    const accountsQuery = await db.query(
      `SELECT 
        id,
        name,
        gl_code,
        account_type
      FROM 
        fineract_default.gl_account
      WHERE
        disabled = false
        ${accountFilter}
      ORDER BY
        account_type, gl_code`,
      accountId ? [accountId] : []
    );
    
    // For each account, calculate opening balance, closing balance, and get entries
    const accountsPromises = accountsQuery.rows.map(async (account) => {
      // Get opening balance for the account as of fromDate
      const openingBalanceQuery = await db.query(
        `WITH opening_balance AS (
          SELECT 
            COALESCE(SUM(CASE 
              WHEN (ga.account_type = 'asset' OR ga.account_type = 'expense') AND je.type = 'debit' THEN je.amount
              WHEN (ga.account_type = 'liability' OR ga.account_type = 'equity' OR ga.account_type = 'income') AND je.type = 'credit' THEN je.amount
              ELSE 0
            END), 0) as normal_balance,
            COALESCE(SUM(CASE 
              WHEN (ga.account_type = 'asset' OR ga.account_type = 'expense') AND je.type = 'credit' THEN je.amount
              WHEN (ga.account_type = 'liability' OR ga.account_type = 'equity' OR ga.account_type = 'income') AND je.type = 'debit' THEN je.amount
              ELSE 0
            END), 0) as opposite_balance
          FROM 
            fineract_default.gl_account ga
          LEFT JOIN 
            fineract_default.gl_journal_entry je ON ga.id = je.account_id
            AND je.entry_date < $1
            AND je.reversed = false
            ${whereClause}
          WHERE 
            ga.id = $2
        )
        SELECT 
          (normal_balance - opposite_balance) as opening_balance
        FROM 
          opening_balance`,
        [fromDate, account.id, ...(officeId ? [officeId] : []), ...(currencyCode ? [currencyCode] : [])]
      );
      
      // Get entries for the account within the date range
      const entriesQuery = await db.query(
        `SELECT 
          je.id,
          je.entry_date,
          je.transaction_id,
          je.description,
          je.type,
          je.amount,
          je.office_id,
          o.name as office_name,
          je.created_by_user_id,
          u.username as created_by_username,
          jt.transaction_type
        FROM 
          fineract_default.gl_journal_entry je
        JOIN
          fineract_default.office o ON je.office_id = o.id
        LEFT JOIN
          fineract_default.m_appuser u ON je.created_by_user_id = u.id
        LEFT JOIN
          fineract_default.acc_journal_transaction jt ON je.transaction_id = jt.id
        WHERE 
          je.account_id = $1
          AND je.entry_date BETWEEN $2 AND $3
          AND je.reversed = false
          ${officeId ? ` AND je.office_id = $4` : ''}
        ORDER BY 
          je.entry_date, je.id`,
        [account.id, fromDate, toDate, ...(officeId ? [officeId] : [])]
      );
      
      // Get closing balance for the account as of toDate
      const closingBalanceQuery = await db.query(
        `WITH closing_balance AS (
          SELECT 
            COALESCE(SUM(CASE 
              WHEN (ga.account_type = 'asset' OR ga.account_type = 'expense') AND je.type = 'debit' THEN je.amount
              WHEN (ga.account_type = 'liability' OR ga.account_type = 'equity' OR ga.account_type = 'income') AND je.type = 'credit' THEN je.amount
              ELSE 0
            END), 0) as normal_balance,
            COALESCE(SUM(CASE 
              WHEN (ga.account_type = 'asset' OR ga.account_type = 'expense') AND je.type = 'credit' THEN je.amount
              WHEN (ga.account_type = 'liability' OR ga.account_type = 'equity' OR ga.account_type = 'income') AND je.type = 'debit' THEN je.amount
              ELSE 0
            END), 0) as opposite_balance
          FROM 
            fineract_default.gl_account ga
          LEFT JOIN 
            fineract_default.gl_journal_entry je ON ga.id = je.account_id
            AND je.entry_date <= $1
            AND je.reversed = false
            ${whereClause}
          WHERE 
            ga.id = $2
        )
        SELECT 
          (normal_balance - opposite_balance) as closing_balance
        FROM 
          closing_balance`,
        [toDate, account.id, ...(officeId ? [officeId] : []), ...(currencyCode ? [currencyCode] : [])]
      );
      
      // Calculate opening and closing balances
      const openingBalance = parseFloat(openingBalanceQuery.rows[0].opening_balance) || 0;
      const closingBalance = parseFloat(closingBalanceQuery.rows[0].closing_balance) || 0;
      
      // Process entries and calculate running balance
      const entries: GeneralLedgerEntry[] = [];
      let runningBalance = openingBalance;
      
      for (const entry of entriesQuery.rows) {
        const amount = parseFloat(entry.amount) || 0;
        const isDebit = entry.type === 'debit';
        const isNormalBalance = (account.account_type === 'asset' || account.account_type === 'expense') ? isDebit : !isDebit;
        
        // Update running balance
        if (isNormalBalance) {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }
        
        entries.push({
          id: entry.id,
          date: entry.entry_date,
          description: entry.description || 'No description',
          debit: isDebit ? amount : 0,
          credit: !isDebit ? amount : 0,
          balance: runningBalance,
          transactionId: entry.transaction_id,
          transactionType: entry.transaction_type || 'Unknown',
          officeId: entry.office_id,
          officeName: entry.office_name
        });
      }
      
      return {
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        type: account.account_type as AccountType,
        openingBalance,
        closingBalance,
        entries
      };
    });
    
    // Wait for all account queries to complete
    const accounts = await Promise.all(accountsPromises);
    
    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      generatedOn: new Date().toISOString(),
      accounts
    };
  } catch (error) {
    logger.error('Error generating general ledger report', { error });
    throw new Error(`Failed to generate general ledger report: ${error.message}`);
  }
}