/**
 * Cash Flow Service
 * Provides functions for generating cash flow statements
 */

import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  CashFlowReport,
  CashFlowSection,
  CashFlowItem
} from '../../models/reporting/financialReports';

/**
 * Generate a Cash Flow Statement report
 * @param fromDate Start date for the report period
 * @param toDate End date for the report period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @param includeComparative Whether to include comparative data from previous period
 * @returns Cash flow statement report
 */
export async function generateCashFlowReport(
  fromDate: string,
  toDate: string,
  officeId?: string,
  currencyCode?: string,
  includeComparative: boolean = false
): Promise<CashFlowReport> {
  logger.info('Generating cash flow statement', { fromDate, toDate, officeId, currencyCode, includeComparative });

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

    // Get office name if specified
    let reportName = 'Cash Flow Statement';
    if (officeId) {
      const officeQuery = await db.query(
        `SELECT name FROM fineract_default.office WHERE id = $1`,
        [officeId]
      );
      
      if (officeQuery.rows.length > 0) {
        reportName += ` - ${officeQuery.rows[0].name}`;
      }
    }
    
    // Calculate comparative period dates if requested
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
      
      if (currencyCode) {
        params.push(currencyCode);
        comparativeWhereClause += ` AND ga.currency_code = $${paramIndex}`;
        paramIndex++;
      }
    }
    
    // Add date to report name
    reportName += ` from ${fromDate} to ${toDate}`;

    // Get beginning cash balance
    const beginningCashQuery = await db.query(
      `WITH cash_accounts AS (
        SELECT 
          ga.id
        FROM 
          fineract_default.gl_account ga
        WHERE 
          ga.account_type = 'asset'
          AND ga.tag_id = 'cash_and_cash_equivalents'
          AND ga.disabled = false
      ),
      cash_balance AS (
        SELECT 
          COALESCE(SUM(CASE 
            WHEN je.type = 'debit' THEN je.amount
            WHEN je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as balance
        FROM 
          fineract_default.gl_journal_entry je
        JOIN
          cash_accounts ca ON je.account_id = ca.id
        WHERE 
          je.entry_date < $1
          AND je.reversed = false
          ${officeId ? ` AND je.office_id = $2` : ''}
      )
      SELECT 
        balance as beginning_cash_balance
      FROM 
        cash_balance`,
      officeId ? [fromDate, officeId] : [fromDate]
    );
    
    // Get ending cash balance
    const endingCashQuery = await db.query(
      `WITH cash_accounts AS (
        SELECT 
          ga.id
        FROM 
          fineract_default.gl_account ga
        WHERE 
          ga.account_type = 'asset'
          AND ga.tag_id = 'cash_and_cash_equivalents'
          AND ga.disabled = false
      ),
      cash_balance AS (
        SELECT 
          COALESCE(SUM(CASE 
            WHEN je.type = 'debit' THEN je.amount
            WHEN je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as balance
        FROM 
          fineract_default.gl_journal_entry je
        JOIN
          cash_accounts ca ON je.account_id = ca.id
        WHERE 
          je.entry_date <= $1
          AND je.reversed = false
          ${officeId ? ` AND je.office_id = $2` : ''}
      )
      SELECT 
        balance as ending_cash_balance
      FROM 
        cash_balance`,
      officeId ? [toDate, officeId] : [toDate]
    );
    
    // Calculate beginning and ending cash balances
    const beginningCashBalance = parseFloat(beginningCashQuery.rows[0].beginning_cash_balance) || 0;
    const endingCashBalance = parseFloat(endingCashQuery.rows[0].ending_cash_balance) || 0;
    
    // Get comparable balances for comparative period if requested
    let previousBeginningCashBalance = 0;
    let previousEndingCashBalance = 0;
    
    if (includeComparative && comparativePeriod) {
      const previousBeginningCashQuery = await db.query(
        `WITH cash_accounts AS (
          SELECT 
            ga.id
          FROM 
            fineract_default.gl_account ga
          WHERE 
            ga.account_type = 'asset'
            AND ga.tag_id = 'cash_and_cash_equivalents'
            AND ga.disabled = false
        ),
        cash_balance AS (
          SELECT 
            COALESCE(SUM(CASE 
              WHEN je.type = 'debit' THEN je.amount
              WHEN je.type = 'credit' THEN -je.amount
              ELSE 0
            END), 0) as balance
          FROM 
            fineract_default.gl_journal_entry je
          JOIN
            cash_accounts ca ON je.account_id = ca.id
          WHERE 
            je.entry_date < $1
            AND je.reversed = false
            ${officeId ? ` AND je.office_id = $2` : ''}
        )
        SELECT 
          balance as beginning_cash_balance
        FROM 
          cash_balance`,
        officeId ? [comparativePeriod.fromDate, officeId] : [comparativePeriod.fromDate]
      );
      
      const previousEndingCashQuery = await db.query(
        `WITH cash_accounts AS (
          SELECT 
            ga.id
          FROM 
            fineract_default.gl_account ga
          WHERE 
            ga.account_type = 'asset'
            AND ga.tag_id = 'cash_and_cash_equivalents'
            AND ga.disabled = false
        ),
        cash_balance AS (
          SELECT 
            COALESCE(SUM(CASE 
              WHEN je.type = 'debit' THEN je.amount
              WHEN je.type = 'credit' THEN -je.amount
              ELSE 0
            END), 0) as balance
          FROM 
            fineract_default.gl_journal_entry je
          JOIN
            cash_accounts ca ON je.account_id = ca.id
          WHERE 
            je.entry_date <= $1
            AND je.reversed = false
            ${officeId ? ` AND je.office_id = $2` : ''}
        )
        SELECT 
          balance as ending_cash_balance
        FROM 
          cash_balance`,
        officeId ? [comparativePeriod.toDate, officeId] : [comparativePeriod.toDate]
      );
      
      previousBeginningCashBalance = parseFloat(previousBeginningCashQuery.rows[0].beginning_cash_balance) || 0;
      previousEndingCashBalance = parseFloat(previousEndingCashQuery.rows[0].ending_cash_balance) || 0;
    }
    
    // Calculate cash flow from operating activities
    const operatingCashFlowQuery = await db.query(
      `WITH operating_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.classification,
          ga.account_type
        FROM 
          fineract_default.gl_account ga
        WHERE 
          (ga.account_type = 'income' OR ga.account_type = 'expense')
          OR (ga.account_type IN ('asset', 'liability') AND ga.tag_id = 'operating_activity')
          AND ga.disabled = false
      ),
      operating_activity_current AS (
        SELECT 
          oa.id,
          oa.name,
          oa.gl_code,
          oa.classification,
          oa.account_type,
          COALESCE(SUM(CASE 
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN je.amount
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN -je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          operating_accounts oa
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON oa.id = je.account_id
          AND je.entry_date BETWEEN $1 AND $2
          AND je.reversed = false
          ${whereClause}
        LEFT JOIN
          fineract_default.gl_account ga ON je.account_id = ga.id
        GROUP BY 
          oa.id, oa.name, oa.gl_code, oa.classification, oa.account_type
        HAVING 
          COALESCE(SUM(CASE 
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN je.amount
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN -je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) <> 0
      ),
      operating_activity_previous AS (
        SELECT 
          oa.id,
          COALESCE(SUM(CASE 
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN je.amount
            WHEN (oa.account_type = 'income' OR (oa.account_type = 'liability' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN -je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'debit' THEN je.amount
            WHEN (oa.account_type = 'expense' OR (oa.account_type = 'asset' AND ga.tag_id = 'operating_activity')) AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          operating_accounts oa
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON oa.id = je.account_id
          AND je.entry_date BETWEEN $${includeComparative ? '3' : '0'} AND $${includeComparative ? '4' : '0'}
          AND je.reversed = false
          ${comparativeWhereClause}
        LEFT JOIN
          fineract_default.gl_account ga ON je.account_id = ga.id
        GROUP BY 
          oa.id
      )
      SELECT 
        oac.id,
        oac.name,
        oac.gl_code,
        oac.classification,
        oac.amount,
        COALESCE(oap.amount, 0) as previous_amount
      FROM 
        operating_activity_current oac
      LEFT JOIN
        operating_activity_previous oap ON oac.id = oap.id
      ORDER BY 
        oac.account_type, oac.classification, oac.gl_code`,
      params
    );
    
    // Calculate cash flow from investing activities
    const investingCashFlowQuery = await db.query(
      `WITH investing_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.classification,
          ga.account_type
        FROM 
          fineract_default.gl_account ga
        WHERE 
          ga.tag_id = 'investing_activity'
          AND ga.disabled = false
      ),
      investing_activity_current AS (
        SELECT 
          ia.id,
          ia.name,
          ia.gl_code,
          ia.classification,
          ia.account_type,
          COALESCE(SUM(CASE 
            WHEN (ia.account_type = 'asset') AND je.type = 'credit' THEN je.amount
            WHEN (ia.account_type = 'asset') AND je.type = 'debit' THEN -je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'debit' THEN je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          investing_accounts ia
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ia.id = je.account_id
          AND je.entry_date BETWEEN $1 AND $2
          AND je.reversed = false
          ${whereClause}
        GROUP BY 
          ia.id, ia.name, ia.gl_code, ia.classification, ia.account_type
        HAVING 
          COALESCE(SUM(CASE 
            WHEN (ia.account_type = 'asset') AND je.type = 'credit' THEN je.amount
            WHEN (ia.account_type = 'asset') AND je.type = 'debit' THEN -je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'debit' THEN je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) <> 0
      ),
      investing_activity_previous AS (
        SELECT 
          ia.id,
          COALESCE(SUM(CASE 
            WHEN (ia.account_type = 'asset') AND je.type = 'credit' THEN je.amount
            WHEN (ia.account_type = 'asset') AND je.type = 'debit' THEN -je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'debit' THEN je.amount
            WHEN (ia.account_type = 'liability') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          investing_accounts ia
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON ia.id = je.account_id
          AND je.entry_date BETWEEN $${includeComparative ? '3' : '0'} AND $${includeComparative ? '4' : '0'}
          AND je.reversed = false
          ${comparativeWhereClause}
        GROUP BY 
          ia.id
      )
      SELECT 
        iac.id,
        iac.name,
        iac.gl_code,
        iac.classification,
        iac.amount,
        COALESCE(iap.amount, 0) as previous_amount
      FROM 
        investing_activity_current iac
      LEFT JOIN
        investing_activity_previous iap ON iac.id = iap.id
      ORDER BY 
        iac.account_type, iac.classification, iac.gl_code`,
      params
    );
    
    // Calculate cash flow from financing activities
    const financingCashFlowQuery = await db.query(
      `WITH financing_accounts AS (
        SELECT 
          ga.id,
          ga.name,
          ga.gl_code,
          ga.classification,
          ga.account_type
        FROM 
          fineract_default.gl_account ga
        WHERE 
          (ga.tag_id = 'financing_activity' OR ga.account_type = 'equity')
          AND ga.disabled = false
      ),
      financing_activity_current AS (
        SELECT 
          fa.id,
          fa.name,
          fa.gl_code,
          fa.classification,
          fa.account_type,
          COALESCE(SUM(CASE 
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'credit' THEN je.amount
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'debit' THEN -je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'debit' THEN je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          financing_accounts fa
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON fa.id = je.account_id
          AND je.entry_date BETWEEN $1 AND $2
          AND je.reversed = false
          ${whereClause}
        GROUP BY 
          fa.id, fa.name, fa.gl_code, fa.classification, fa.account_type
        HAVING 
          COALESCE(SUM(CASE 
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'credit' THEN je.amount
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'debit' THEN -je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'debit' THEN je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) <> 0
      ),
      financing_activity_previous AS (
        SELECT 
          fa.id,
          COALESCE(SUM(CASE 
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'credit' THEN je.amount
            WHEN (fa.account_type = 'liability' OR fa.account_type = 'equity') AND je.type = 'debit' THEN -je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'debit' THEN je.amount
            WHEN (fa.account_type = 'asset') AND je.type = 'credit' THEN -je.amount
            ELSE 0
          END), 0) as amount
        FROM 
          financing_accounts fa
        LEFT JOIN 
          fineract_default.gl_journal_entry je ON fa.id = je.account_id
          AND je.entry_date BETWEEN $${includeComparative ? '3' : '0'} AND $${includeComparative ? '4' : '0'}
          AND je.reversed = false
          ${comparativeWhereClause}
        GROUP BY 
          fa.id
      )
      SELECT 
        fac.id,
        fac.name,
        fac.gl_code,
        fac.classification,
        fac.amount,
        COALESCE(fap.amount, 0) as previous_amount
      FROM 
        financing_activity_current fac
      LEFT JOIN
        financing_activity_previous fap ON fac.id = fap.id
      ORDER BY 
        fac.account_type, fac.classification, fac.gl_code`,
      params
    );
    
    // Process operating activities
    const operatingItems: CashFlowItem[] = [];
    let totalOperatingCashFlow = 0;
    let previousTotalOperatingCashFlow = 0;
    
    for (const item of operatingCashFlowQuery.rows) {
      const amount = parseFloat(item.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(item.previous_amount) || 0) : undefined;
      
      totalOperatingCashFlow += amount;
      if (includeComparative) {
        previousTotalOperatingCashFlow += previousAmount;
      }
      
      operatingItems.push({
        id: item.id,
        name: item.name,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Process investing activities
    const investingItems: CashFlowItem[] = [];
    let totalInvestingCashFlow = 0;
    let previousTotalInvestingCashFlow = 0;
    
    for (const item of investingCashFlowQuery.rows) {
      const amount = parseFloat(item.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(item.previous_amount) || 0) : undefined;
      
      totalInvestingCashFlow += amount;
      if (includeComparative) {
        previousTotalInvestingCashFlow += previousAmount;
      }
      
      investingItems.push({
        id: item.id,
        name: item.name,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Process financing activities
    const financingItems: CashFlowItem[] = [];
    let totalFinancingCashFlow = 0;
    let previousTotalFinancingCashFlow = 0;
    
    for (const item of financingCashFlowQuery.rows) {
      const amount = parseFloat(item.amount) || 0;
      const previousAmount = includeComparative ? (parseFloat(item.previous_amount) || 0) : undefined;
      
      totalFinancingCashFlow += amount;
      if (includeComparative) {
        previousTotalFinancingCashFlow += previousAmount;
      }
      
      financingItems.push({
        id: item.id,
        name: item.name,
        amount,
        previousAmount,
        change: includeComparative ? amount - previousAmount : undefined,
        changePercentage: includeComparative && previousAmount !== 0 
          ? ((amount - previousAmount) / Math.abs(previousAmount)) * 100 
          : undefined
      });
    }
    
    // Create cash flow sections
    const operatingActivities: CashFlowSection = {
      total: totalOperatingCashFlow,
      previousTotal: includeComparative ? previousTotalOperatingCashFlow : undefined,
      change: includeComparative ? totalOperatingCashFlow - previousTotalOperatingCashFlow : undefined,
      changePercentage: includeComparative && previousTotalOperatingCashFlow !== 0 
        ? ((totalOperatingCashFlow - previousTotalOperatingCashFlow) / Math.abs(previousTotalOperatingCashFlow)) * 100 
        : undefined,
      items: operatingItems
    };
    
    const investingActivities: CashFlowSection = {
      total: totalInvestingCashFlow,
      previousTotal: includeComparative ? previousTotalInvestingCashFlow : undefined,
      change: includeComparative ? totalInvestingCashFlow - previousTotalInvestingCashFlow : undefined,
      changePercentage: includeComparative && previousTotalInvestingCashFlow !== 0 
        ? ((totalInvestingCashFlow - previousTotalInvestingCashFlow) / Math.abs(previousTotalInvestingCashFlow)) * 100 
        : undefined,
      items: investingItems
    };
    
    const financingActivities: CashFlowSection = {
      total: totalFinancingCashFlow,
      previousTotal: includeComparative ? previousTotalFinancingCashFlow : undefined,
      change: includeComparative ? totalFinancingCashFlow - previousTotalFinancingCashFlow : undefined,
      changePercentage: includeComparative && previousTotalFinancingCashFlow !== 0 
        ? ((totalFinancingCashFlow - previousTotalFinancingCashFlow) / Math.abs(previousTotalFinancingCashFlow)) * 100 
        : undefined,
      items: financingItems
    };
    
    // Calculate total net increase/decrease in cash
    const netCashIncrease = totalOperatingCashFlow + totalInvestingCashFlow + totalFinancingCashFlow;
    const previousNetCashIncrease = includeComparative 
      ? previousTotalOperatingCashFlow + previousTotalInvestingCashFlow + previousTotalFinancingCashFlow 
      : undefined;
    
    // Verify ending cash balance calculation
    const calculatedEndingCashBalance = beginningCashBalance + netCashIncrease;
    
    // If there is a difference between calculated and queried ending balance, adjust for reconciliation
    const reconciliationAdjustment = endingCashBalance - calculatedEndingCashBalance;
    
    // Build the final report
    return {
      reportName,
      currency,
      fromDate,
      toDate,
      comparativePeriod,
      generatedOn: new Date().toISOString(),
      operatingActivities,
      investingActivities,
      financingActivities,
      summary: {
        netCashFromOperating: totalOperatingCashFlow,
        netCashFromInvesting: totalInvestingCashFlow,
        netCashFromFinancing: totalFinancingCashFlow,
        netIncreaseInCash: netCashIncrease,
        beginningCashBalance,
        endingCashBalance,
        previousNetIncreaseInCash: previousNetCashIncrease,
        reconciliationAdjustment: reconciliationAdjustment !== 0 ? reconciliationAdjustment : undefined
      }
    };
  } catch (error) {
    logger.error('Error generating cash flow statement', { error });
    throw new Error(`Failed to generate cash flow statement: ${error.message}`);
  }
}