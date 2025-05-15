import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { 
  FinancialStatementResult, 
  FinancialStatementType,
  FinancialStatementSection,
  AccountType,
  AccountBalance
} from '../models/accounting';

/**
 * Generate a balance sheet report
 * @param officeId The ID of the office to generate the report for
 * @param asOnDate The date to generate the report as of
 * @returns Balance sheet report
 */
export async function generateBalanceSheet(officeId: string, asOnDate: string): Promise<FinancialStatementResult> {
  logger.info('Generating balance sheet', { officeId, asOnDate });

  try {
    // Get office name
    const officeQuery = await db.query(
      `SELECT name FROM fineract_default.office WHERE id = $1`,
      [officeId]
    );
    
    if (officeQuery.rows.length === 0) {
      throw new Error(`Office with ID ${officeId} not found`);
    }
    
    const officeName = officeQuery.rows[0].name;
    
    // Fetch GL account balances for balance sheet accounts (assets, liabilities, equity)
    const query = `
      WITH account_balances AS (
        SELECT 
          ga.id as account_id,
          ga.name as account_name,
          ga.gl_code as account_code,
          ga.account_type,
          ga.parent_id,
          COALESCE(SUM(CASE WHEN je.type = 'debit' THEN je.amount ELSE 0 END), 0) as debit_amount,
          COALESCE(SUM(CASE WHEN je.type = 'credit' THEN je.amount ELSE 0 END), 0) as credit_amount,
          CASE 
            WHEN ga.account_type = 'asset' THEN COALESCE(SUM(CASE WHEN je.type = 'debit' THEN je.amount ELSE -je.amount END), 0)
            WHEN ga.account_type IN ('liability', 'equity') THEN COALESCE(SUM(CASE WHEN je.type = 'credit' THEN je.amount ELSE -je.amount END), 0)
            ELSE 0
          END as balance
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
          AND ga.account_type IN ('asset', 'liability', 'equity')
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.account_type, ga.parent_id
      )
      SELECT 
        account_id, 
        account_name, 
        account_code, 
        account_type,
        parent_id,
        balance
      FROM 
        account_balances
      ORDER BY 
        account_code
    `;
    
    const result = await db.query(query, [officeId, asOnDate]);
    
    // Group accounts by type
    const accountsByType: Record<string, AccountBalance[]> = {};
    
    for (const row of result.rows) {
      const accountType = row.account_type;
      if (!accountsByType[accountType]) {
        accountsByType[accountType] = [];
      }
      
      accountsByType[accountType].push({
        id: row.account_id,
        name: row.account_name,
        glCode: row.account_code,
        balance: parseFloat(row.balance)
      });
    }
    
    // Create sections for the balance sheet
    const sections: FinancialStatementSection[] = [];
    
    // Assets section
    const assetAccounts = accountsByType['asset'] || [];
    const totalAssets = assetAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    sections.push({
      name: 'Assets',
      total: totalAssets,
      accounts: assetAccounts
    });
    
    // Liabilities section
    const liabilityAccounts = accountsByType['liability'] || [];
    const totalLiabilities = liabilityAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    sections.push({
      name: 'Liabilities',
      total: totalLiabilities,
      accounts: liabilityAccounts
    });
    
    // Equity section
    const equityAccounts = accountsByType['equity'] || [];
    const totalEquity = equityAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    sections.push({
      name: 'Equity',
      total: totalEquity,
      accounts: equityAccounts
    });
    
    return {
      type: FinancialStatementType.BALANCE_SHEET,
      office: officeName,
      toDate: asOnDate,
      sections,
      totalAssets,
      totalLiabilities,
      totalEquity
    };
  } catch (error) {
    logger.error('Error generating balance sheet', error);
    throw new Error(`Failed to generate balance sheet: ${error.message}`);
  }
}

/**
 * Generate an income statement report
 * @param officeId The ID of the office to generate the report for
 * @param fromDate The start date for the report period
 * @param toDate The end date for the report period
 * @returns Income statement report
 */
export async function generateIncomeStatement(
  officeId: string, 
  fromDate: string, 
  toDate: string
): Promise<FinancialStatementResult> {
  logger.info('Generating income statement', { officeId, fromDate, toDate });

  try {
    // Get office name
    const officeQuery = await db.query(
      `SELECT name FROM fineract_default.office WHERE id = $1`,
      [officeId]
    );
    
    if (officeQuery.rows.length === 0) {
      throw new Error(`Office with ID ${officeId} not found`);
    }
    
    const officeName = officeQuery.rows[0].name;
    
    // Fetch GL account balances for income statement accounts (income, expense)
    const query = `
      WITH account_balances AS (
        SELECT 
          ga.id as account_id,
          ga.name as account_name,
          ga.gl_code as account_code,
          ga.account_type,
          ga.parent_id,
          COALESCE(SUM(CASE WHEN je.type = 'debit' THEN je.amount ELSE 0 END), 0) as debit_amount,
          COALESCE(SUM(CASE WHEN je.type = 'credit' THEN je.amount ELSE 0 END), 0) as credit_amount,
          CASE 
            WHEN ga.account_type = 'income' THEN COALESCE(SUM(CASE WHEN je.type = 'credit' THEN je.amount ELSE -je.amount END), 0)
            WHEN ga.account_type = 'expense' THEN COALESCE(SUM(CASE WHEN je.type = 'debit' THEN je.amount ELSE -je.amount END), 0)
            ELSE 0
          END as balance
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je 
        ON 
          ga.id = je.account_id
          AND je.office_id = $1
          AND je.entry_date BETWEEN $2 AND $3
          AND je.reversed = false
        WHERE 
          ga.disabled = false
          AND ga.account_type IN ('income', 'expense')
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.account_type, ga.parent_id
      )
      SELECT 
        account_id, 
        account_name, 
        account_code, 
        account_type,
        parent_id,
        balance
      FROM 
        account_balances
      ORDER BY 
        account_code
    `;
    
    const result = await db.query(query, [officeId, fromDate, toDate]);
    
    // Group accounts by type
    const accountsByType: Record<string, AccountBalance[]> = {};
    
    for (const row of result.rows) {
      const accountType = row.account_type;
      if (!accountsByType[accountType]) {
        accountsByType[accountType] = [];
      }
      
      accountsByType[accountType].push({
        id: row.account_id,
        name: row.account_name,
        glCode: row.account_code,
        balance: parseFloat(row.balance)
      });
    }
    
    // Create sections for the income statement
    const sections: FinancialStatementSection[] = [];
    
    // Income section
    const incomeAccounts = accountsByType['income'] || [];
    const totalIncome = incomeAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    sections.push({
      name: 'Income',
      total: totalIncome,
      accounts: incomeAccounts
    });
    
    // Expense section
    const expenseAccounts = accountsByType['expense'] || [];
    const totalExpenses = expenseAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    sections.push({
      name: 'Expenses',
      total: totalExpenses,
      accounts: expenseAccounts
    });
    
    // Calculate net income
    const netIncome = totalIncome - totalExpenses;
    
    sections.push({
      name: 'Net Income',
      total: netIncome,
      accounts: []
    });
    
    return {
      type: FinancialStatementType.INCOME_STATEMENT,
      office: officeName,
      fromDate,
      toDate,
      sections,
      totalRevenueAndExpense: netIncome
    };
  } catch (error) {
    logger.error('Error generating income statement', error);
    throw new Error(`Failed to generate income statement: ${error.message}`);
  }
}

/**
 * Generate a GL account details report showing all transactions for the account
 * @param accountId The ID of the GL account
 * @param officeId The ID of the office
 * @param fromDate The start date for the report period
 * @param toDate The end date for the report period
 * @returns Account details report
 */
export async function generateAccountDetailsReport(
  accountId: string,
  officeId: string,
  fromDate: string,
  toDate: string
) {
  logger.info('Generating account details report', { accountId, officeId, fromDate, toDate });

  try {
    // Get account details
    const accountQuery = await db.query(
      `SELECT id, name, gl_code, account_type
       FROM fineract_default.gl_account
       WHERE id = $1`,
      [accountId]
    );
    
    if (accountQuery.rows.length === 0) {
      throw new Error(`GL account with ID ${accountId} not found`);
    }
    
    const account = accountQuery.rows[0];
    
    // Get opening balance as of fromDate
    const openingBalanceQuery = await db.query(
      `WITH account_transactions AS (
        SELECT
          CASE WHEN je.type = 'debit' THEN je.amount ELSE 0 END as debit_amount,
          CASE WHEN je.type = 'credit' THEN je.amount ELSE 0 END as credit_amount
        FROM
          fineract_default.gl_journal_entry je
        WHERE
          je.account_id = $1
          AND je.office_id = $2
          AND je.entry_date < $3
          AND je.reversed = false
      )
      SELECT
        CASE 
          WHEN $4 IN ('asset', 'expense') THEN 
            COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0)
          ELSE 
            COALESCE(SUM(credit_amount), 0) - COALESCE(SUM(debit_amount), 0)
        END as opening_balance
      FROM
        account_transactions`,
      [accountId, officeId, fromDate, account.account_type]
    );
    
    const openingBalance = parseFloat(openingBalanceQuery.rows[0].opening_balance) || 0;
    
    // Get transactions for the period
    const transactionsQuery = await db.query(
      `SELECT
        je.id,
        je.transaction_id,
        je.entry_date,
        je.type,
        je.amount,
        je.description,
        o.name as office_name,
        CASE 
          WHEN je.type = 'debit' AND $1 IN ('asset', 'expense') THEN je.amount
          WHEN je.type = 'credit' AND $1 IN ('liability', 'equity', 'income') THEN je.amount
          ELSE -je.amount
        END as balance_change
      FROM
        fineract_default.gl_journal_entry je
      JOIN
        fineract_default.office o ON je.office_id = o.id
      WHERE
        je.account_id = $2
        AND je.office_id = $3
        AND je.entry_date BETWEEN $4 AND $5
        AND je.reversed = false
      ORDER BY
        je.entry_date, je.id`,
      [account.account_type, accountId, officeId, fromDate, toDate]
    );
    
    // Calculate running balance for each transaction
    let runningBalance = openingBalance;
    const transactions = transactionsQuery.rows.map(row => {
      runningBalance += parseFloat(row.balance_change);
      
      return {
        id: row.id,
        transactionId: row.transaction_id,
        entryDate: row.entry_date,
        type: row.type,
        amount: parseFloat(row.amount),
        description: row.description,
        officeName: row.office_name,
        runningBalance
      };
    });
    
    // Return report
    return {
      success: true,
      accountId,
      accountName: account.name,
      glCode: account.gl_code,
      accountType: account.account_type,
      fromDate,
      toDate,
      openingBalance,
      closingBalance: runningBalance,
      transactions
    };
  } catch (error) {
    logger.error('Error generating account details report', error);
    return {
      success: false,
      message: error.message
    };
  }
}