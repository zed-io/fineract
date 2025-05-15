/**
 * Journal Entry Service
 * Provides functions for generating journal entry reports
 */

import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  JournalEntryReport,
  JournalEntry,
  JournalGLEntry
} from '../../models/reporting/financialReports';

/**
 * Generate a Journal Entry report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param glAccountId Optional GL account ID to filter by (null for all accounts)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Journal entry report
 */
export async function generateJournalEntryReport(
  fromDate: string,
  toDate: string,
  officeId?: string,
  glAccountId?: string,
  currencyCode?: string
): Promise<JournalEntryReport> {
  logger.info('Generating journal entry report', { fromDate, toDate, officeId, glAccountId, currencyCode });

  try {
    // Build params array for query
    const params: any[] = [fromDate, toDate];
    let paramIndex = 3;
    
    // Build WHERE clause for optional filters
    let whereClause = '';
    let havingClause = '';
    
    if (officeId) {
      whereClause += ` AND je.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }
    
    if (glAccountId) {
      havingClause += ` HAVING EXISTS (SELECT 1 FROM fineract_default.gl_journal_entry je2 
                         WHERE je2.transaction_id = jt.id AND je2.account_id = $${paramIndex})`;
      params.push(glAccountId);
      paramIndex++;
    }
    
    if (currencyCode) {
      whereClause += ` AND je.currency_code = $${paramIndex}`;
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
    let reportName = 'Journal Entries';
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
    if (glAccountId) {
      const accountQuery = await db.query(
        `SELECT name FROM fineract_default.gl_account WHERE id = $1`,
        [glAccountId]
      );
      
      if (accountQuery.rows.length > 0) {
        reportName += ` - ${accountQuery.rows[0].name}`;
      }
    }
    
    // Add date to report name
    reportName += ` from ${fromDate} to ${toDate}`;

    // Query to get journal transactions
    const journalQuery = await db.query(
      `SELECT 
        jt.id AS transaction_id,
        MIN(je.entry_date) AS entry_date,
        jt.transaction_type,
        jt.description,
        jt.reference_number,
        MIN(je.created_by_user_id) AS created_by_user_id,
        MIN(u.username) AS created_by_username,
        MIN(je.office_id) AS office_id,
        MIN(o.name) AS office_name
      FROM 
        fineract_default.acc_journal_transaction jt
      JOIN
        fineract_default.gl_journal_entry je ON jt.id = je.transaction_id
      JOIN
        fineract_default.office o ON je.office_id = o.id
      LEFT JOIN
        fineract_default.m_appuser u ON je.created_by_user_id = u.id
      WHERE 
        je.entry_date BETWEEN $1 AND $2
        AND je.reversed = false
        ${whereClause}
      GROUP BY
        jt.id, jt.transaction_type, jt.description, jt.reference_number
      ${havingClause}
      ORDER BY 
        entry_date DESC, transaction_id`,
      params
    );
    
    // For each journal transaction, get the GL entries
    const entriesPromises = journalQuery.rows.map(async (journal) => {
      // Get entries for this transaction
      const glEntriesQuery = await db.query(
        `SELECT 
          je.id,
          je.account_id,
          ga.name AS account_name,
          ga.gl_code,
          je.type,
          je.amount
        FROM 
          fineract_default.gl_journal_entry je
        JOIN
          fineract_default.gl_account ga ON je.account_id = ga.id
        WHERE 
          je.transaction_id = $1
          AND je.reversed = false
        ORDER BY 
          CASE WHEN je.type = 'debit' THEN 0 ELSE 1 END, 
          ga.gl_code`,
        [journal.transaction_id]
      );
      
      // Process GL entries
      const glEntries: JournalGLEntry[] = [];
      let totalDebits = 0;
      let totalCredits = 0;
      
      for (const entry of glEntriesQuery.rows) {
        const amount = parseFloat(entry.amount) || 0;
        
        if (entry.type === 'debit') {
          totalDebits += amount;
          glEntries.push({
            accountId: entry.account_id,
            accountName: entry.account_name,
            glCode: entry.gl_code,
            debit: amount,
            credit: 0
          });
        } else {
          totalCredits += amount;
          glEntries.push({
            accountId: entry.account_id,
            accountName: entry.account_name,
            glCode: entry.gl_code,
            debit: 0,
            credit: amount
          });
        }
      }
      
      // Create the journal entry
      return {
        id: journal.transaction_id,
        date: journal.entry_date,
        description: journal.description || 'No description',
        reference: journal.reference_number || '',
        createdByUserId: journal.created_by_user_id,
        createdByUsername: journal.created_by_username || 'System',
        transactionId: journal.transaction_id,
        transactionType: journal.transaction_type || 'Manual',
        officeId: journal.office_id,
        officeName: journal.office_name,
        glEntries
      };
    });
    
    // Wait for all entries queries to complete
    const entries = await Promise.all(entriesPromises);
    
    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      generatedOn: new Date().toISOString(),
      entries
    };
  } catch (error) {
    logger.error('Error generating journal entry report', { error });
    throw new Error(`Failed to generate journal entry report: ${error.message}`);
  }
}