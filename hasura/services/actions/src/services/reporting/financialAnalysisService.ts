import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  IncomeStatementReport,
  IncomeStatementSection,
  IncomeStatementCategory,
  IncomeStatementAccount,
  BalanceSheetReport,
  BalanceSheetSection,
  BalanceSheetCategory,
  BalanceSheetAccount,
  CashFlowReport,
  CashFlowSection,
  CashFlowItem,
  TrialBalanceReport,
  TrialBalanceAccount,
  GeneralLedgerReport,
  GeneralLedgerAccount,
  GeneralLedgerEntry,
  JournalEntryReport,
  JournalEntry,
  JournalGLEntry,
  InterestIncomeReport,
  FeeIncomeReport,
  FinancialRatiosReport,
  AccountType,
  FinancialStatementType,
  FinancialPeriod
} from '../../models/reporting/financialReports';

/**
 * Generate an Income Statement (Profit & Loss) report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @param includeComparative Whether to include comparative data from previous period
 * @returns Income statement report
 */
export async function generateIncomeStatementReport(
  fromDate: string,
  toDate: string,
  officeId?: string,
  currencyCode?: string,
  includeComparative: boolean = false
): Promise<IncomeStatementReport> {
  logger.info('Generating income statement report', { 
    fromDate, toDate, officeId, currencyCode, includeComparative 
  });

  try {
    // Build params array for query
    const params: any[] = [fromDate, toDate];
    let paramIndex = 3;
    
    // Build WHERE clause for optional filters
    let whereClause = '';
    
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

    // Calculate comparative period dates if needed
    let comparativePeriod: { fromDate: string; toDate: string } | undefined;
    let comparativeWhereClause = '';
    
    if (includeComparative) {
      // Calculate time span of the primary period
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      const diffMs = toDateObj.getTime() - fromDateObj.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      // Create comparative period of same length, ending right before primary period starts
      const compToDate = new Date(fromDateObj);
      compToDate.setDate(compToDate.getDate() - 1); // Day before primary period starts
      
      const compFromDate = new Date(compToDate);
      compFromDate.setDate(compFromDate.getDate() - diffDays); // Same duration as primary period
      
      comparativePeriod = {
        fromDate: compFromDate.toISOString().split('T')[0],
        toDate: compToDate.toISOString().split('T')[0]
      };
      
      // Add parameters for comparative period query
      params.push(comparativePeriod.fromDate, comparativePeriod.toDate);
      comparativeWhereClause = ` AND je.entry_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      paramIndex += 2;
      
      if (officeId) {
        params.push(officeId);
        comparativeWhereClause += ` AND je.office_id = $${paramIndex}`;
        paramIndex++;
      }
    }

    // Query for income accounts
    const incomeQuery = await db.query(
      `WITH income_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.parent_id,
          ga.classification,
          COALESCE(SUM(CASE 
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as amount,
          COALESCE(SUM(CASE 
            WHEN je.entry_date BETWEEN $${includeComparative ? '4' : '0'} AND $${includeComparative ? '5' : '0'} 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date BETWEEN $${includeComparative ? '4' : '0'} AND $${includeComparative ? '5' : '0'} 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as previous_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          AND (
            (je.entry_date BETWEEN $1 AND $2 ${whereClause})
            ${includeComparative ? 'OR (je.entry_date BETWEEN $4 AND $5' + comparativeWhereClause + ')' : ''}
          )
        WHERE 
          ga.account_type = 'income'
          AND ga.disabled = false
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.parent_id, ga.classification
      )
      SELECT * FROM income_accounts
      ORDER BY gl_code`,
      params
    );
    
    // Query for expense accounts
    const expenseQuery = await db.query(
      `WITH expense_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.parent_id,
          ga.classification,
          COALESCE(SUM(CASE 
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'debit' THEN je.amount
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount,
          COALESCE(SUM(CASE 
            WHEN je.entry_date BETWEEN $${includeComparative ? '4' : '0'} AND $${includeComparative ? '5' : '0'} 
            AND je.type = 'debit' THEN je.amount
            WHEN je.entry_date BETWEEN $${includeComparative ? '4' : '0'} AND $${includeComparative ? '5' : '0'} 
            AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as previous_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          AND (
            (je.entry_date BETWEEN $1 AND $2 ${whereClause})
            ${includeComparative ? 'OR (je.entry_date BETWEEN $4 AND $5' + comparativeWhereClause + ')' : ''}
          )
        WHERE 
          ga.account_type = 'expense'
          AND ga.disabled = false
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.parent_id, ga.classification
      )
      SELECT * FROM expense_accounts
      ORDER BY gl_code`,
      params
    );
    
    // Get office name if specified
    let reportName = 'Income Statement';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );
      
      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }
    
    // Group income accounts by classification (category)
    const incomeByCategory = new Map<string, IncomeStatementAccount[]>();
    let totalIncome = 0;
    let previousTotalIncome = 0;
    
    for (const account of incomeQuery.rows) {
      const amount = parseFloat(account.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(account.previous_amount) || 0) : undefined;
      
      totalIncome += amount;
      if (includeComparative) {
        previousTotalIncome += previousAmount;
      }
      
      const classification = account.classification || 'Other Income';
      
      if (!incomeByCategory.has(classification)) {
        incomeByCategory.set(classification, []);
      }
      
      incomeByCategory.get(classification).push({
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Group expense accounts by classification (category)
    const expenseByCategory = new Map<string, IncomeStatementAccount[]>();
    let totalExpenses = 0;
    let previousTotalExpenses = 0;
    
    for (const account of expenseQuery.rows) {
      const amount = parseFloat(account.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(account.previous_amount) || 0) : undefined;
      
      totalExpenses += amount;
      if (includeComparative) {
        previousTotalExpenses += previousAmount;
      }
      
      const classification = account.classification || 'Other Expenses';
      
      if (!expenseByCategory.has(classification)) {
        expenseByCategory.set(classification, []);
      }
      
      expenseByCategory.get(classification).push({
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Create income categories
    const incomeCategories: IncomeStatementCategory[] = [];
    
    for (const [categoryName, accounts] of incomeByCategory.entries()) {
      const categoryAmount = accounts.reduce((sum, account) => sum + account.amount, 0);
      const categoryPreviousAmount = includeComparative 
        ? accounts.reduce((sum, account) => sum + (account.previousAmount || 0), 0) 
        : undefined;
      
      incomeCategories.push({
        id: categoryName.replace(/\s+/g, '_').toLowerCase(),
        name: categoryName,
        amount: categoryAmount,
        previousAmount: categoryPreviousAmount,
        change: includeComparative ? categoryAmount - categoryPreviousAmount : undefined,
        changePercentage: includeComparative && categoryPreviousAmount !== 0 
          ? ((categoryAmount - categoryPreviousAmount) / Math.abs(categoryPreviousAmount)) * 100 
          : undefined,
        accounts
      });
    }
    
    // Create expense categories
    const expenseCategories: IncomeStatementCategory[] = [];
    
    for (const [categoryName, accounts] of expenseByCategory.entries()) {
      const categoryAmount = accounts.reduce((sum, account) => sum + account.amount, 0);
      const categoryPreviousAmount = includeComparative 
        ? accounts.reduce((sum, account) => sum + (account.previousAmount || 0), 0) 
        : undefined;
      
      expenseCategories.push({
        id: categoryName.replace(/\s+/g, '_').toLowerCase(),
        name: categoryName,
        amount: categoryAmount,
        previousAmount: categoryPreviousAmount,
        change: includeComparative ? categoryAmount - categoryPreviousAmount : undefined,
        changePercentage: includeComparative && categoryPreviousAmount !== 0 
          ? ((categoryAmount - categoryPreviousAmount) / Math.abs(categoryPreviousAmount)) * 100 
          : undefined,
        accounts
      });
    }
    
    // Create income and expense sections
    const income: IncomeStatementSection = {
      total: totalIncome,
      previousTotal: includeComparative ? previousTotalIncome : undefined,
      change: includeComparative ? totalIncome - previousTotalIncome : undefined,
      changePercentage: includeComparative && previousTotalIncome !== 0 
        ? ((totalIncome - previousTotalIncome) / Math.abs(previousTotalIncome)) * 100 
        : undefined,
      categories: incomeCategories
    };
    
    const expenses: IncomeStatementSection = {
      total: totalExpenses,
      previousTotal: includeComparative ? previousTotalExpenses : undefined,
      change: includeComparative ? totalExpenses - previousTotalExpenses : undefined,
      changePercentage: includeComparative && previousTotalExpenses !== 0 
        ? ((totalExpenses - previousTotalExpenses) / Math.abs(previousTotalExpenses)) * 100 
        : undefined,
      categories: expenseCategories
    };
    
    // Calculate net income
    const netIncome = totalIncome - totalExpenses;
    const previousNetIncome = includeComparative ? previousTotalIncome - previousTotalExpenses : undefined;
    
    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      comparativePeriod,
      generatedOn: new Date().toISOString(),
      income,
      expenses,
      summary: {
        totalIncome,
        totalExpenses,
        netIncome,
        previousTotalIncome: includeComparative ? previousTotalIncome : undefined,
        previousTotalExpenses: includeComparative ? previousTotalExpenses : undefined,
        previousNetIncome,
        changeInNetIncome: includeComparative ? netIncome - previousNetIncome : undefined,
        changeInNetIncomePercentage: includeComparative && previousNetIncome !== 0 
          ? ((netIncome - previousNetIncome) / Math.abs(previousNetIncome)) * 100 
          : undefined
      }
    };
  } catch (error) {
    logger.error('Error generating income statement report', { error });
    throw new Error(`Failed to generate income statement report: ${error.message}`);
  }
}

/**
 * Generate a Balance Sheet report
 * @param asOfDate The date to generate the balance sheet as of
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @param includeComparative Whether to include comparative data from a year ago
 * @returns Balance sheet report
 */
export async function generateBalanceSheetReport(
  asOfDate: string,
  officeId?: string,
  currencyCode?: string,
  includeComparative: boolean = false
): Promise<BalanceSheetReport> {
  logger.info('Generating balance sheet report', { 
    asOfDate, officeId, currencyCode, includeComparative 
  });

  try {
    // Build params array for query
    const params: any[] = [asOfDate];
    let paramIndex = 2;
    
    // Build WHERE clause for optional filters
    let whereClause = '';
    
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

    // Calculate comparative date if needed (1 year ago)
    let comparativeDate: string | undefined;
    let comparativeWhereClause = '';
    
    if (includeComparative) {
      const asOfDateObj = new Date(asOfDate);
      asOfDateObj.setFullYear(asOfDateObj.getFullYear() - 1);
      comparativeDate = asOfDateObj.toISOString().split('T')[0];
      
      // Add parameters for comparative date query
      params.push(comparativeDate);
      comparativeWhereClause = ` AND je.entry_date <= $${paramIndex}`;
      paramIndex++;
      
      if (officeId) {
        params.push(officeId);
        comparativeWhereClause += ` AND je.office_id = $${paramIndex}`;
        paramIndex++;
      }
    }

    // Query for asset accounts
    const assetQuery = await db.query(
      `WITH asset_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.parent_id,
          ga.classification,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $1 
            AND je.type = 'debit' THEN je.amount
            WHEN je.entry_date <= $1 
            AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'debit' THEN je.amount
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as previous_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          AND (
            (je.entry_date <= $1 ${whereClause})
            ${includeComparative ? 'OR (je.entry_date <= $' + (paramIndex - (officeId ? 2 : 1)) + comparativeWhereClause + ')' : ''}
          )
        WHERE 
          ga.account_type = 'asset'
          AND ga.disabled = false
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.parent_id, ga.classification
      )
      SELECT * FROM asset_accounts
      ORDER BY gl_code`,
      params
    );
    
    // Query for liability accounts
    const liabilityQuery = await db.query(
      `WITH liability_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.parent_id,
          ga.classification,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $1 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date <= $1 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as amount,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as previous_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          AND (
            (je.entry_date <= $1 ${whereClause})
            ${includeComparative ? 'OR (je.entry_date <= $' + (paramIndex - (officeId ? 2 : 1)) + comparativeWhereClause + ')' : ''}
          )
        WHERE 
          ga.account_type = 'liability'
          AND ga.disabled = false
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.parent_id, ga.classification
      )
      SELECT * FROM liability_accounts
      ORDER BY gl_code`,
      params
    );
    
    // Query for equity accounts
    const equityQuery = await db.query(
      `WITH equity_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.parent_id,
          ga.classification,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $1 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date <= $1 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as amount,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'credit' THEN je.amount
            WHEN je.entry_date <= $${includeComparative ? paramIndex - (officeId ? 2 : 1) : '0'} 
            AND je.type = 'debit' THEN -je.amount
            ELSE 0
          END), 0) as previous_amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          AND (
            (je.entry_date <= $1 ${whereClause})
            ${includeComparative ? 'OR (je.entry_date <= $' + (paramIndex - (officeId ? 2 : 1)) + comparativeWhereClause + ')' : ''}
          )
        WHERE 
          ga.account_type = 'equity'
          AND ga.disabled = false
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.parent_id, ga.classification
      )
      SELECT * FROM equity_accounts
      ORDER BY gl_code`,
      params
    );
    
    // Get office name if specified
    let reportName = 'Balance Sheet';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );
      
      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }
    
    // Group asset accounts by classification (category)
    const assetsByCategory = new Map<string, BalanceSheetAccount[]>();
    let totalAssets = 0;
    let previousTotalAssets = 0;
    
    for (const account of assetQuery.rows) {
      const amount = parseFloat(account.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(account.previous_amount) || 0) : undefined;
      
      totalAssets += amount;
      if (includeComparative) {
        previousTotalAssets += previousAmount;
      }
      
      const classification = account.classification || 'Other Assets';
      
      if (!assetsByCategory.has(classification)) {
        assetsByCategory.set(classification, []);
      }
      
      assetsByCategory.get(classification).push({
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Group liability accounts by classification (category)
    const liabilitiesByCategory = new Map<string, BalanceSheetAccount[]>();
    let totalLiabilities = 0;
    let previousTotalLiabilities = 0;
    
    for (const account of liabilityQuery.rows) {
      const amount = parseFloat(account.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(account.previous_amount) || 0) : undefined;
      
      totalLiabilities += amount;
      if (includeComparative) {
        previousTotalLiabilities += previousAmount;
      }
      
      const classification = account.classification || 'Other Liabilities';
      
      if (!liabilitiesByCategory.has(classification)) {
        liabilitiesByCategory.set(classification, []);
      }
      
      liabilitiesByCategory.get(classification).push({
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Group equity accounts by classification (category)
    const equityByCategory = new Map<string, BalanceSheetAccount[]>();
    let totalEquity = 0;
    let previousTotalEquity = 0;
    
    for (const account of equityQuery.rows) {
      const amount = parseFloat(account.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(account.previous_amount) || 0) : undefined;
      
      totalEquity += amount;
      if (includeComparative) {
        previousTotalEquity += previousAmount;
      }
      
      const classification = account.classification || 'Other Equity';
      
      if (!equityByCategory.has(classification)) {
        equityByCategory.set(classification, []);
      }
      
      equityByCategory.get(classification).push({
        id: account.id,
        name: account.name,
        glCode: account.gl_code,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Create asset categories
    const assetCategories: BalanceSheetCategory[] = [];
    
    for (const [categoryName, accounts] of assetsByCategory.entries()) {
      const categoryAmount = accounts.reduce((sum, account) => sum + account.amount, 0);
      const categoryPreviousAmount = includeComparative 
        ? accounts.reduce((sum, account) => sum + (account.previousAmount || 0), 0) 
        : undefined;
      
      assetCategories.push({
        id: categoryName.replace(/\s+/g, '_').toLowerCase(),
        name: categoryName,
        amount: categoryAmount,
        previousAmount: categoryPreviousAmount,
        change: includeComparative ? categoryAmount - categoryPreviousAmount : undefined,
        changePercentage: includeComparative && categoryPreviousAmount !== 0 
          ? ((categoryAmount - categoryPreviousAmount) / Math.abs(categoryPreviousAmount)) * 100 
          : undefined,
        accounts
      });
    }
    
    // Create liability categories
    const liabilityCategories: BalanceSheetCategory[] = [];
    
    for (const [categoryName, accounts] of liabilitiesByCategory.entries()) {
      const categoryAmount = accounts.reduce((sum, account) => sum + account.amount, 0);
      const categoryPreviousAmount = includeComparative 
        ? accounts.reduce((sum, account) => sum + (account.previousAmount || 0), 0) 
        : undefined;
      
      liabilityCategories.push({
        id: categoryName.replace(/\s+/g, '_').toLowerCase(),
        name: categoryName,
        amount: categoryAmount,
        previousAmount: categoryPreviousAmount,
        change: includeComparative ? categoryAmount - categoryPreviousAmount : undefined,
        changePercentage: includeComparative && categoryPreviousAmount !== 0 
          ? ((categoryAmount - categoryPreviousAmount) / Math.abs(categoryPreviousAmount)) * 100 
          : undefined,
        accounts
      });
    }
    
    // Create equity categories
    const equityCategories: BalanceSheetCategory[] = [];
    
    for (const [categoryName, accounts] of equityByCategory.entries()) {
      const categoryAmount = accounts.reduce((sum, account) => sum + account.amount, 0);
      const categoryPreviousAmount = includeComparative 
        ? accounts.reduce((sum, account) => sum + (account.previousAmount || 0), 0) 
        : undefined;
      
      equityCategories.push({
        id: categoryName.replace(/\s+/g, '_').toLowerCase(),
        name: categoryName,
        amount: categoryAmount,
        previousAmount: categoryPreviousAmount,
        change: includeComparative ? categoryAmount - categoryPreviousAmount : undefined,
        changePercentage: includeComparative && categoryPreviousAmount !== 0 
          ? ((categoryAmount - categoryPreviousAmount) / Math.abs(categoryPreviousAmount)) * 100 
          : undefined,
        accounts
      });
    }
    
    // Create sections
    const assets: BalanceSheetSection = {
      total: totalAssets,
      previousTotal: includeComparative ? previousTotalAssets : undefined,
      change: includeComparative ? totalAssets - previousTotalAssets : undefined,
      changePercentage: includeComparative && previousTotalAssets !== 0 
        ? ((totalAssets - previousTotalAssets) / Math.abs(previousTotalAssets)) * 100 
        : undefined,
      categories: assetCategories
    };
    
    const liabilities: BalanceSheetSection = {
      total: totalLiabilities,
      previousTotal: includeComparative ? previousTotalLiabilities : undefined,
      change: includeComparative ? totalLiabilities - previousTotalLiabilities : undefined,
      changePercentage: includeComparative && previousTotalLiabilities !== 0 
        ? ((totalLiabilities - previousTotalLiabilities) / Math.abs(previousTotalLiabilities)) * 100 
        : undefined,
      categories: liabilityCategories
    };
    
    const equity: BalanceSheetSection = {
      total: totalEquity,
      previousTotal: includeComparative ? previousTotalEquity : undefined,
      change: includeComparative ? totalEquity - previousTotalEquity : undefined,
      changePercentage: includeComparative && previousTotalEquity !== 0 
        ? ((totalEquity - previousTotalEquity) / Math.abs(previousTotalEquity)) * 100 
        : undefined,
      categories: equityCategories
    };
    
    // Build the final report
    return {
      reportName,
      currency,
      asOfDate,
      comparativeDate,
      generatedOn: new Date().toISOString(),
      assets,
      liabilities,
      equity,
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        previousTotalAssets: includeComparative ? previousTotalAssets : undefined,
        previousTotalLiabilities: includeComparative ? previousTotalLiabilities : undefined,
        previousTotalEquity: includeComparative ? previousTotalEquity : undefined
      }
    };
  } catch (error) {
    logger.error('Error generating balance sheet report', { error });
    throw new Error(`Failed to generate balance sheet report: ${error.message}`);
  }
}

/**
 * Generate Financial Ratios Report
 * @param asOfDate The date to calculate ratios as of
 * @param officeId Optional office ID to filter by (null for all offices)
 * @returns Financial ratios report
 */
export async function generateFinancialRatiosReport(
  asOfDate: string,
  officeId?: string
): Promise<FinancialRatiosReport> {
  logger.info('Generating financial ratios report', { asOfDate, officeId });

  try {
    // Get the balance sheet data (needed for many ratios)
    const balanceSheet = await generateBalanceSheetReport(asOfDate, officeId);
    
    // Get income statement data for the last 12 months (needed for profitability ratios)
    const oneYearAgo = new Date(asOfDate);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const yearStartDate = oneYearAgo.toISOString().split('T')[0];
    
    const incomeStatement = await generateIncomeStatementReport(
      yearStartDate,
      asOfDate,
      officeId
    );
    
    // Get assets and liabilities
    const totalAssets = balanceSheet.summary.totalAssets;
    const totalLiabilities = balanceSheet.summary.totalLiabilities;
    const totalEquity = balanceSheet.summary.totalEquity;
    
    // Get income components
    const totalRevenue = incomeStatement.summary.totalIncome;
    const totalExpenses = incomeStatement.summary.totalExpenses;
    const netIncome = incomeStatement.summary.netIncome;
    
    // Get more specific account balances needed for ratios
    // Query for portfolio and asset quality metrics
    const loanQuery = await db.query(
      `SELECT 
        SUM(l.principal_outstanding_derived) as gross_loan_portfolio,
        SUM(CASE WHEN COALESCE(ld.overdue_days, 0) > 30 THEN l.principal_outstanding_derived ELSE 0 END) as par_30,
        SUM(CASE WHEN COALESCE(ld.overdue_days, 0) > 90 THEN l.principal_outstanding_derived ELSE 0 END) as par_90,
        SUM(lt.principal_portion_derived) as loans_written_off
      FROM 
        fineract_default.loan l
      LEFT JOIN 
        fineract_default.loan_delinquency ld ON l.id = ld.loan_id AND ld.as_of_date = $1
      LEFT JOIN
        fineract_default.loan_transaction lt ON l.id = lt.loan_id 
        AND lt.transaction_type_enum = 5 -- Write-off
        AND lt.is_reversed = false
        AND lt.transaction_date BETWEEN $2 AND $1
      WHERE 
        l.loan_status = 'active'
        ${officeId ? 'AND l.office_id = $3' : ''}`,
      officeId ? [asOfDate, yearStartDate, officeId] : [asOfDate, yearStartDate]
    );
    
    // Get loan loss reserve and liquidity data
    const accountBalancesQuery = await db.query(
      `WITH account_balances AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.account_type,
          ga.tag_id,
          COALESCE(SUM(CASE 
            WHEN je.entry_date <= $1 AND je.type = 'debit' AND ga.account_type = 'asset' THEN je.amount
            WHEN je.entry_date <= $1 AND je.type = 'credit' AND ga.account_type = 'asset' THEN -je.amount
            WHEN je.entry_date <= $1 AND je.type = 'credit' AND ga.account_type IN ('liability', 'equity') THEN je.amount
            WHEN je.entry_date <= $1 AND je.type = 'debit' AND ga.account_type IN ('liability', 'equity') THEN -je.amount
            ELSE 0
          END), 0) as balance
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          ${officeId ? 'AND je.office_id = $2' : ''}
        GROUP BY 
          ga.id, ga.name, ga.gl_code, ga.account_type, ga.tag_id
      )
      SELECT 
        SUM(CASE WHEN tag_id = 'loan_loss_reserve' THEN balance ELSE 0 END) as loan_loss_reserve,
        SUM(CASE WHEN tag_id = 'cash_and_cash_equivalents' THEN balance ELSE 0 END) as cash_and_equivalents,
        SUM(CASE WHEN tag_id = 'current_assets' THEN balance ELSE 0 END) as current_assets,
        SUM(CASE WHEN tag_id = 'current_liabilities' THEN balance ELSE 0 END) as current_liabilities
      FROM 
        account_balances`,
      officeId ? [asOfDate, officeId] : [asOfDate]
    );
    
    // Get expense breakdown
    const expenseBreakdownQuery = await db.query(
      `WITH expense_breakdown AS (
        SELECT 
          ga.tag_id,
          COALESCE(SUM(CASE 
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'debit' THEN je.amount
            WHEN je.entry_date BETWEEN $1 AND $2 
            AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          fineract_default.gl_account ga
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ga.id = je.account_id
          AND je.reversed = false
          ${officeId ? 'AND je.office_id = $3' : ''}
        WHERE 
          ga.account_type = 'expense'
        GROUP BY 
          ga.tag_id
      )
      SELECT 
        SUM(CASE WHEN tag_id = 'personnel_expense' THEN amount ELSE 0 END) as personnel_expense,
        SUM(CASE WHEN tag_id = 'administrative_expense' THEN amount ELSE 0 END) as administrative_expense
      FROM 
        expense_breakdown`,
      officeId ? [yearStartDate, asOfDate, officeId] : [yearStartDate, asOfDate]
    );
    
    // Get client and staff counts for productivity metrics
    const countQuery = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM fineract_default.client WHERE status_enum = 300 ${officeId ? 'AND office_id = $1' : ''}) as active_clients,
        (SELECT COUNT(*) FROM fineract_default.m_staff WHERE is_active = true AND is_loan_officer = true ${officeId ? 'AND office_id = $1' : ''}) as loan_officers,
        (SELECT COUNT(*) FROM fineract_default.m_staff WHERE is_active = true ${officeId ? 'AND office_id = $1' : ''}) as total_staff
      `,
      officeId ? [officeId] : []
    );
    
    // Get data from previous year for growth ratios
    const oneYearBeforeStart = new Date(yearStartDate);
    oneYearBeforeStart.setDate(oneYearBeforeStart.getDate() - 1);
    const oneYearBeforeStartStr = oneYearBeforeStart.toISOString().split('T')[0];
    
    const previousYearBalanceSheet = await generateBalanceSheetReport(oneYearBeforeStartStr, officeId);
    
    // Extract values from query results
    const loanData = loanQuery.rows[0];
    const accountBalances = accountBalancesQuery.rows[0];
    const expenseBreakdown = expenseBreakdownQuery.rows[0];
    const counts = countQuery.rows[0];
    
    // Calculate the gross loan portfolio
    const grossLoanPortfolio = parseFloat(loanData.gross_loan_portfolio) || 0;
    
    // Calculate portfolio at risk ratios
    const par30 = parseFloat(loanData.par_30) || 0;
    const par90 = parseFloat(loanData.par_90) || 0;
    const par30Ratio = grossLoanPortfolio > 0 ? (par30 / grossLoanPortfolio) * 100 : 0;
    const par90Ratio = grossLoanPortfolio > 0 ? (par90 / grossLoanPortfolio) * 100 : 0;
    
    // Calculate write-off ratio
    const loansWrittenOff = parseFloat(loanData.loans_written_off) || 0;
    const writeOffRatio = grossLoanPortfolio > 0 ? (loansWrittenOff / grossLoanPortfolio) * 100 : 0;
    
    // Calculate loan loss reserves
    const loanLossReserve = parseFloat(accountBalances.loan_loss_reserve) || 0;
    const riskCoverageRatio = par30 > 0 ? (loanLossReserve / par30) * 100 : 0;
    const loanLossReserveRatio = grossLoanPortfolio > 0 ? (loanLossReserve / grossLoanPortfolio) * 100 : 0;
    
    // Calculate profitability ratios
    const returnOnAssets = totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0;
    const returnOnEquity = totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0;
    
    // Calculate financial self-sufficiency
    const operationalSelfSufficiency = totalExpenses > 0 ? (totalRevenue / totalExpenses) * 100 : 0;
    const financialSelfSufficiency = operationalSelfSufficiency; // Simplified - in reality includes additional adjustments
    
    // Calculate profit margin
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;
    
    // Calculate yield on gross portfolio
    const yieldOnGrossPortfolio = grossLoanPortfolio > 0 ? (totalRevenue / grossLoanPortfolio) * 100 : 0;
    
    // Calculate portfolio to assets ratio
    const portfolioToAssets = totalAssets > 0 ? (grossLoanPortfolio / totalAssets) * 100 : 0;
    
    // Calculate debt ratios
    const debtToEquityRatio = totalEquity > 0 ? (totalLiabilities / totalEquity) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    const equityToAssetRatio = totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0;
    
    // Simplified capital adequacy ratio (in reality more complex)
    const capitalAdequacyRatio = equityToAssetRatio;
    
    // Calculate liquidity ratios
    const currentAssets = parseFloat(accountBalances.current_assets) || 0;
    const currentLiabilities = parseFloat(accountBalances.current_liabilities) || 0;
    const cashAndEquivalents = parseFloat(accountBalances.cash_and_equivalents) || 0;
    
    const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities) * 100 : 0;
    const quickRatio = currentLiabilities > 0 ? ((currentAssets - grossLoanPortfolio) / currentLiabilities) * 100 : 0;
    const cashRatio = currentLiabilities > 0 ? (cashAndEquivalents / currentLiabilities) * 100 : 0;
    
    // Calculate efficiency ratios
    const operatingExpenseRatio = grossLoanPortfolio > 0 ? (totalExpenses / grossLoanPortfolio) * 100 : 0;
    const costToIncomeRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    
    const personnelExpense = parseFloat(expenseBreakdown.personnel_expense) || 0;
    const administrativeExpense = parseFloat(expenseBreakdown.administrative_expense) || 0;
    
    const personnelExpenseRatio = totalExpenses > 0 ? (personnelExpense / totalExpenses) * 100 : 0;
    const administrativeExpenseRatio = totalExpenses > 0 ? (administrativeExpense / totalExpenses) * 100 : 0;
    
    // Calculate productivity ratios
    const activeClients = parseInt(counts.active_clients) || 0;
    const loanOfficers = parseInt(counts.loan_officers) || 0;
    const totalStaff = parseInt(counts.total_staff) || 0;
    
    const loanOfficerProductivity = loanOfficers > 0 ? activeClients / loanOfficers : 0;
    const staffProductivity = totalStaff > 0 ? activeClients / totalStaff : 0;
    const costPerClient = activeClients > 0 ? totalExpenses / activeClients : 0;
    
    // Calculate growth ratios
    const previousTotalAssets = previousYearBalanceSheet.summary.totalAssets;
    const assetGrowth = previousTotalAssets > 0 ? ((totalAssets - previousTotalAssets) / previousTotalAssets) * 100 : 0;
    
    // For simplicity, assuming we don't have historical data for other growth metrics
    const loanPortfolioGrowth = 0;
    const clientGrowth = 0;
    const revenueGrowth = 0;
    
    // Build the final report
    return {
      reportName: 'Financial Ratios Report',
      asOfDate,
      generatedOn: new Date().toISOString(),
      profitabilityRatios: {
        returnOnAssets,
        returnOnEquity,
        operationalSelfSufficiency,
        financialSelfSufficiency,
        profitMargin,
        yieldOnGrossPortfolio,
        portfolioToAssets,
        costPerClient
      },
      assetQualityRatios: {
        portfolioAtRisk30: par30Ratio,
        portfolioAtRisk90: par90Ratio,
        writeOffRatio,
        riskCoverageRatio,
        loanLossReserveRatio
      },
      financialStructureRatios: {
        debtToEquityRatio,
        debtToAssetRatio,
        equityToAssetRatio,
        capitalAdequacyRatio
      },
      liquidityRatios: {
        currentRatio,
        quickRatio,
        cashRatio
      },
      efficiencyRatios: {
        operatingExpenseRatio,
        costToIncomeRatio,
        personnelExpenseRatio,
        administrativeExpenseRatio,
        loanOfficerProductivity,
        staffProductivity
      },
      growthRatios: {
        assetGrowth,
        loanPortfolioGrowth,
        clientGrowth,
        revenueGrowth
      }
    };
  } catch (error) {
    logger.error('Error generating financial ratios report', { error });
    throw new Error(`Failed to generate financial ratios report: ${error.message}`);
  }
}

/**
 * Generate an Interest Income Report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Interest income report
 */
export async function generateInterestIncomeReport(
  fromDate: string,
  toDate: string,
  officeId?: string,
  currencyCode?: string
): Promise<InterestIncomeReport> {
  logger.info('Generating interest income report', { fromDate, toDate, officeId, currencyCode });

  try {
    // Build params array for query
    const params: any[] = [fromDate, toDate];
    let paramIndex = 3;
    
    // Build WHERE clause for optional filters
    let whereClause = '';
    
    if (officeId) {
      whereClause += ` AND l.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }
    
    if (currencyCode) {
      whereClause += ` AND l.currency_code = $${paramIndex}`;
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
    let reportName = 'Interest Income Report';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );
      
      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }

    // Query for total interest income (accrued and collected)
    const interestQuery = await db.query(
      `SELECT 
        SUM(CASE WHEN lt.transaction_type_enum = 10 THEN lt.interest_portion_derived ELSE 0 END) as accrued_interest,
        SUM(CASE WHEN lt.transaction_type_enum IN (2, 6) THEN lt.interest_portion_derived ELSE 0 END) as collected_interest
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.is_reversed = false
        ${whereClause}`,
      params
    );
    
    // Query for interest by product
    const productQuery = await db.query(
      `SELECT 
        l.product_id,
        lp.name as product_name,
        SUM(l.principal_outstanding_derived) as outstanding_principal,
        SUM(lt.interest_portion_derived) as interest_income,
        AVG(lp.nominal_interest_rate_per_period) as avg_interest_rate
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY 
        l.product_id, lp.name, lp.nominal_interest_rate_per_period
      ORDER BY 
        interest_income DESC`,
      params
    );
    
    // Query for interest by branch
    const branchQuery = await db.query(
      `SELECT 
        l.office_id as branch_id,
        o.name as branch_name,
        SUM(l.principal_outstanding_derived) as outstanding_principal,
        SUM(lt.interest_portion_derived) as interest_income
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.office o ON l.office_id = o.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY 
        l.office_id, o.name
      ORDER BY 
        interest_income DESC`,
      params
    );
    
    // Query for interest by loan officer
    const loanOfficerQuery = await db.query(
      `SELECT 
        l.loan_officer_id,
        s.display_name as loan_officer_name,
        SUM(l.principal_outstanding_derived) as outstanding_principal,
        SUM(lt.interest_portion_derived) as interest_income
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.m_staff s ON l.loan_officer_id = s.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY 
        l.loan_officer_id, s.display_name
      ORDER BY 
        interest_income DESC`,
      params
    );
    
    // Query for interest trend
    const trendQuery = await db.query(
      `SELECT 
        to_char(lt.transaction_date, 'YYYY-MM') as period,
        SUM(CASE WHEN lt.transaction_type_enum = 10 THEN lt.interest_portion_derived ELSE 0 END) as accrued,
        SUM(CASE WHEN lt.transaction_type_enum IN (2, 6) THEN lt.interest_portion_derived ELSE 0 END) as collected
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY 
        to_char(lt.transaction_date, 'YYYY-MM')
      ORDER BY 
        period`,
      params
    );
    
    // Parse interest data
    const interestRow = interestQuery.rows[0];
    const accruedInterest = parseFloat(interestRow.accrued_interest) || 0;
    const collectedInterest = parseFloat(interestRow.collected_interest) || 0;
    const totalInterestIncome = accruedInterest + collectedInterest;
    
    // Parse interest by product
    const interestByProduct = productQuery.rows.map(row => {
      const outstandingPrincipal = parseFloat(row.outstanding_principal) || 0;
      const interestIncome = parseFloat(row.interest_income) || 0;
      const avgRate = parseFloat(row.avg_interest_rate) || 0;
      const totalOutstanding = productQuery.rows.reduce((sum, r) => sum + (parseFloat(r.outstanding_principal) || 0), 0);
      
      return {
        productId: row.product_id,
        productName: row.product_name,
        interestIncome,
        outstandingPrincipal,
        averageRate: avgRate,
        portfolioPercentage: totalOutstanding > 0 ? (outstandingPrincipal / totalOutstanding) * 100 : 0
      };
    });
    
    // Parse interest by branch
    const interestByBranch = branchQuery.rows.map(row => {
      const outstandingPrincipal = parseFloat(row.outstanding_principal) || 0;
      const interestIncome = parseFloat(row.interest_income) || 0;
      const totalOutstanding = branchQuery.rows.reduce((sum, r) => sum + (parseFloat(r.outstanding_principal) || 0), 0);
      
      return {
        branchId: row.branch_id,
        branchName: row.branch_name,
        interestIncome,
        outstandingPrincipal,
        portfolioPercentage: totalOutstanding > 0 ? (outstandingPrincipal / totalOutstanding) * 100 : 0
      };
    });
    
    // Parse interest by loan officer
    const interestByLoanOfficer = loanOfficerQuery.rows.map(row => {
      const outstandingPrincipal = parseFloat(row.outstanding_principal) || 0;
      const interestIncome = parseFloat(row.interest_income) || 0;
      const totalOutstanding = loanOfficerQuery.rows.reduce((sum, r) => sum + (parseFloat(r.outstanding_principal) || 0), 0);
      
      return {
        loanOfficerId: row.loan_officer_id,
        loanOfficerName: row.loan_officer_name,
        interestIncome,
        outstandingPrincipal,
        portfolioPercentage: totalOutstanding > 0 ? (outstandingPrincipal / totalOutstanding) * 100 : 0
      };
    });
    
    // Parse interest trend
    const interestTrend = trendQuery.rows.map(row => ({
      period: row.period,
      accrued: parseFloat(row.accrued) || 0,
      collected: parseFloat(row.collected) || 0
    }));
    
    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      generatedOn: new Date().toISOString(),
      totalInterestIncome,
      accrualBaseInterest: accruedInterest,
      cashBaseInterest: collectedInterest,
      interestByProduct,
      interestByBranch,
      interestByLoanOfficer,
      interestTrend
    };
  } catch (error) {
    logger.error('Error generating interest income report', { error });
    throw new Error(`Failed to generate interest income report: ${error.message}`);
  }
}

/**
 * Generate a Fee Income Report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Fee income report
 */
export async function generateFeeIncomeReport(
  fromDate: string,
  toDate: string,
  officeId?: string,
  currencyCode?: string
): Promise<FeeIncomeReport> {
  logger.info('Generating fee income report', { fromDate, toDate, officeId, currencyCode });

  try {
    // Build params array for query
    const params: any[] = [fromDate, toDate];
    let paramIndex = 3;

    // Build WHERE clause for optional filters
    let whereClause = '';

    if (officeId) {
      whereClause += ` AND l.office_id = $${paramIndex}`;
      params.push(officeId);
      paramIndex++;
    }

    if (currencyCode) {
      whereClause += ` AND l.currency_code = $${paramIndex}`;
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
    let reportName = 'Fee Income Report';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );

      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }

    // Query for total fee income
    const feeQuery = await db.query(
      `SELECT
        SUM(lt.fee_charges_portion_derived) as total_fee_income
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}`,
      params
    );

    // Query for fees by type
    const feeTypeQuery = await db.query(
      `SELECT
        lc.charge_id as fee_type_id,
        c.name as fee_type_name,
        SUM(lt.fee_charges_portion_derived) as amount
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.loan_charge lc ON l.id = lc.loan_id
      JOIN
        fineract_default.charge c ON lc.charge_id = c.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY
        lc.charge_id, c.name
      ORDER BY
        amount DESC`,
      params
    );

    // Query for fees by product
    const productQuery = await db.query(
      `SELECT
        l.product_id,
        lp.name as product_name,
        SUM(lt.fee_charges_portion_derived) as amount
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY
        l.product_id, lp.name
      ORDER BY
        amount DESC`,
      params
    );

    // Query for fees by branch
    const branchQuery = await db.query(
      `SELECT
        l.office_id as branch_id,
        o.name as branch_name,
        SUM(lt.fee_charges_portion_derived) as amount
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.office o ON l.office_id = o.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY
        l.office_id, o.name
      ORDER BY
        amount DESC`,
      params
    );

    // Query for fees by loan officer
    const loanOfficerQuery = await db.query(
      `SELECT
        l.loan_officer_id,
        s.display_name as loan_officer_name,
        SUM(lt.fee_charges_portion_derived) as amount
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      JOIN
        fineract_default.m_staff s ON l.loan_officer_id = s.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY
        l.loan_officer_id, s.display_name
      ORDER BY
        amount DESC`,
      params
    );

    // Query for fee trend
    const trendQuery = await db.query(
      `SELECT
        to_char(lt.transaction_date, 'YYYY-MM') as period,
        SUM(lt.fee_charges_portion_derived) as amount
      FROM
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      WHERE
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6, 10) -- Repayment, Recovery, Accrual
        AND lt.is_reversed = false
        ${whereClause}
      GROUP BY
        to_char(lt.transaction_date, 'YYYY-MM')
      ORDER BY
        period`,
      params
    );

    // Parse fee data
    const totalFeeIncome = parseFloat(feeQuery.rows[0].total_fee_income) || 0;

    // Parse fees by type
    const feesByType = feeTypeQuery.rows.map(row => {
      const amount = parseFloat(row.amount) || 0;

      return {
        feeTypeId: row.fee_type_id,
        feeTypeName: row.fee_type_name,
        amount,
        percentage: totalFeeIncome > 0 ? (amount / totalFeeIncome) * 100 : 0
      };
    });

    // Parse fees by product
    const feesByProduct = productQuery.rows.map(row => {
      const amount = parseFloat(row.amount) || 0;

      return {
        productId: row.product_id,
        productName: row.product_name,
        amount,
        percentage: totalFeeIncome > 0 ? (amount / totalFeeIncome) * 100 : 0
      };
    });

    // Parse fees by branch
    const feesByBranch = branchQuery.rows.map(row => {
      const amount = parseFloat(row.amount) || 0;

      return {
        branchId: row.branch_id,
        branchName: row.branch_name,
        amount,
        percentage: totalFeeIncome > 0 ? (amount / totalFeeIncome) * 100 : 0
      };
    });

    // Parse fees by loan officer
    const feesByLoanOfficer = loanOfficerQuery.rows.map(row => {
      const amount = parseFloat(row.amount) || 0;

      return {
        loanOfficerId: row.loan_officer_id,
        loanOfficerName: row.loan_officer_name,
        amount,
        percentage: totalFeeIncome > 0 ? (amount / totalFeeIncome) * 100 : 0
      };
    });

    // Parse fee trend
    const feeTrend = trendQuery.rows.map(row => ({
      period: row.period,
      amount: parseFloat(row.amount) || 0
    }));

    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      generatedOn: new Date().toISOString(),
      totalFeeIncome,
      feesByType,
      feesByProduct,
      feesByBranch,
      feesByLoanOfficer,
      feeTrend
    };
  } catch (error) {
    logger.error('Error generating fee income report', { error });
    throw new Error(`Failed to generate fee income report: ${error.message}`);
  }
}

/**
 * Generate a Trial Balance report
 * @param asOfDate The date to generate the trial balance as of
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Trial balance report
 */
export async function generateTrialBalanceReport(
  asOfDate: string,
  officeId?: string,
  currencyCode?: string
): Promise<TrialBalanceReport> {
  logger.info('Generating trial balance report', { asOfDate, officeId, currencyCode });

  try {
    // Build params array for query
    const params: any[] = [asOfDate];
    let paramIndex = 2;

    // Build WHERE clause for optional filters
    let whereClause = '';

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
    let reportName = 'Trial Balance';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );

      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }

    // Add date to report name
    reportName += ` as of ${asOfDate}`;

    // Query for trial balance data
    const accountsQuery = await db.query(
      `WITH account_balances AS (
        SELECT
          ga.id,
          ga.name,
          ga.gl_code,
          ga.account_type,
          -- Calculate debit and credit amounts based on account type and transaction type
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
          ga.disabled = false
        GROUP BY
          ga.id, ga.name, ga.gl_code, ga.account_type
      )
      SELECT
        id,
        name,
        gl_code,
        account_type,
        CASE
          WHEN account_type IN ('asset', 'expense') THEN normal_balance - opposite_balance
          ELSE 0
        END as debit_balance,
        CASE
          WHEN account_type IN ('liability', 'equity', 'income') THEN normal_balance - opposite_balance
          ELSE 0
        END as credit_balance
      FROM
        account_balances
      WHERE
        normal_balance <> 0 OR opposite_balance <> 0
      ORDER BY
        account_type, gl_code`,
      params
    );

    // Process accounts for the trial balance
    const accounts: TrialBalanceAccount[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accountsQuery.rows) {
      const debit = parseFloat(account.debit_balance) || 0;
      const credit = parseFloat(account.credit_balance) || 0;

      totalDebits += debit;
      totalCredits += credit;

      if (debit > 0 || credit > 0) {
        accounts.push({
          id: account.id,
          name: account.name,
          glCode: account.gl_code,
          type: account.account_type as AccountType,
          debit,
          credit
        });
      }
    }

    // Build the final report
    return {
      reportName,
      currency,
      asOfDate,
      generatedOn: new Date().toISOString(),
      accounts,
      summary: {
        totalDebits,
        totalCredits
      }
    };
  } catch (error) {
    logger.error('Error generating trial balance report', { error });
    throw new Error(`Failed to generate trial balance report: ${error.message}`);
  }
}