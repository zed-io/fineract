"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePortfolioAtRiskReport = generatePortfolioAtRiskReport;
exports.generateCollectionReport = generateCollectionReport;
exports.generateLoanPortfolioSummary = generateLoanPortfolioSummary;
exports.generateExpectedRepaymentsReport = generateExpectedRepaymentsReport;
const db_1 = require("../../utils/db");
const logger_1 = require("../../utils/logger");
/**
 * Generate a Portfolio at Risk (PAR) report
 * @param asOfDate The date to calculate PAR as of
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @param includeDetails Whether to include detailed breakdowns by loan officer, branch, and product
 * @returns Portfolio at risk report
 */
async function generatePortfolioAtRiskReport(asOfDate, officeId, currencyCode, includeDetails = true) {
    logger_1.logger.info('Generating PAR report', { asOfDate, officeId, currencyCode });
    try {
        // Define PAR brackets
        const parBrackets = [
            { name: 'Current', daysOverdueFrom: 0, daysOverdueTo: 0, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 },
            { name: '1-30 days', daysOverdueFrom: 1, daysOverdueTo: 30, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 },
            { name: '31-60 days', daysOverdueFrom: 31, daysOverdueTo: 60, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 },
            { name: '61-90 days', daysOverdueFrom: 61, daysOverdueTo: 90, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 },
            { name: '91-180 days', daysOverdueFrom: 91, daysOverdueTo: 180, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 },
            { name: '> 180 days', daysOverdueFrom: 181, daysOverdueTo: null, outstandingAmount: 0, numberOfLoans: 0, percentOfPortfolio: 0 }
        ];
        // Build base query params
        const params = [asOfDate];
        let paramIndex = 2;
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
            const currencyQuery = await db_1.db.query(`SELECT default_currency_code FROM fineract_default.organization_currency LIMIT 1`);
            if (currencyQuery.rows.length > 0) {
                currency = currencyQuery.rows[0].default_currency_code;
            }
            else {
                currency = 'USD'; // Default fallback
            }
        }
        // Main query to get loan data with delinquency info
        const loanQuery = await db_1.db.query(`SELECT 
        l.id,
        l.account_no,
        l.loan_status,
        l.principal_outstanding_derived,
        l.total_outstanding_derived,
        l.interest_outstanding_derived,
        l.fee_charges_outstanding_derived,
        l.penalty_charges_outstanding_derived,
        l.principal_disbursed_derived,
        COALESCE(ld.overdue_days, 0) as overdue_days,
        l.loan_officer_id,
        lo.display_name as loan_officer_name,
        l.office_id,
        o.name as office_name,
        l.product_id,
        lp.name as product_name
      FROM 
        fineract_default.loan l
      LEFT JOIN 
        fineract_default.loan_delinquency ld ON l.id = ld.loan_id AND ld.as_of_date = $1
      LEFT JOIN
        fineract_default.m_staff lo ON l.loan_officer_id = lo.id
      LEFT JOIN
        fineract_default.office o ON l.office_id = o.id
      LEFT JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE 
        l.loan_status = 'active'
        ${whereClause}`, params);
        const loans = loanQuery.rows;
        // Return early if no loans found
        if (loans.length === 0) {
            return {
                asOfDate,
                currency,
                totalOutstanding: 0,
                parBrackets,
                parRatio: 0
            };
        }
        // Process loan data
        let totalOutstanding = 0;
        const loanOfficerMap = new Map();
        const branchMap = new Map();
        const productMap = new Map();
        for (const loan of loans) {
            totalOutstanding += parseFloat(loan.total_outstanding_derived);
            // Find the appropriate PAR bracket based on overdue days
            const overdueDays = parseInt(loan.overdue_days);
            const bracket = parBrackets.find(b => overdueDays >= b.daysOverdueFrom &&
                (b.daysOverdueTo === null || overdueDays <= b.daysOverdueTo));
            if (bracket) {
                bracket.outstandingAmount += parseFloat(loan.total_outstanding_derived);
                bracket.numberOfLoans++;
            }
            // Skip detailed breakdowns if not requested
            if (!includeDetails)
                continue;
            // Process by loan officer
            if (loan.loan_officer_id) {
                if (!loanOfficerMap.has(loan.loan_officer_id)) {
                    loanOfficerMap.set(loan.loan_officer_id, {
                        loanOfficerId: loan.loan_officer_id,
                        loanOfficerName: loan.loan_officer_name,
                        totalOutstanding: 0,
                        portfolioAtRisk: 0,
                        parRatio: 0,
                        parBrackets: parBrackets.map(b => ({
                            name: b.name,
                            amount: 0,
                            ratio: 0
                        }))
                    });
                }
                const loData = loanOfficerMap.get(loan.loan_officer_id);
                loData.totalOutstanding += parseFloat(loan.total_outstanding_derived);
                if (overdueDays > 0) {
                    loData.portfolioAtRisk += parseFloat(loan.total_outstanding_derived);
                }
                // Find the bracket index
                const bracketIndex = parBrackets.findIndex(b => overdueDays >= b.daysOverdueFrom &&
                    (b.daysOverdueTo === null || overdueDays <= b.daysOverdueTo));
                if (bracketIndex >= 0) {
                    loData.parBrackets[bracketIndex].amount += parseFloat(loan.total_outstanding_derived);
                }
            }
            // Process by branch
            if (loan.office_id) {
                if (!branchMap.has(loan.office_id)) {
                    branchMap.set(loan.office_id, {
                        branchId: loan.office_id,
                        branchName: loan.office_name,
                        totalOutstanding: 0,
                        portfolioAtRisk: 0,
                        parRatio: 0,
                        parBrackets: parBrackets.map(b => ({
                            name: b.name,
                            amount: 0,
                            ratio: 0
                        }))
                    });
                }
                const branchData = branchMap.get(loan.office_id);
                branchData.totalOutstanding += parseFloat(loan.total_outstanding_derived);
                if (overdueDays > 0) {
                    branchData.portfolioAtRisk += parseFloat(loan.total_outstanding_derived);
                }
                // Find the bracket index
                const bracketIndex = parBrackets.findIndex(b => overdueDays >= b.daysOverdueFrom &&
                    (b.daysOverdueTo === null || overdueDays <= b.daysOverdueTo));
                if (bracketIndex >= 0) {
                    branchData.parBrackets[bracketIndex].amount += parseFloat(loan.total_outstanding_derived);
                }
            }
            // Process by product
            if (loan.product_id) {
                if (!productMap.has(loan.product_id)) {
                    productMap.set(loan.product_id, {
                        productId: loan.product_id,
                        productName: loan.product_name,
                        totalOutstanding: 0,
                        portfolioAtRisk: 0,
                        parRatio: 0,
                        parBrackets: parBrackets.map(b => ({
                            name: b.name,
                            amount: 0,
                            ratio: 0
                        }))
                    });
                }
                const productData = productMap.get(loan.product_id);
                productData.totalOutstanding += parseFloat(loan.total_outstanding_derived);
                if (overdueDays > 0) {
                    productData.portfolioAtRisk += parseFloat(loan.total_outstanding_derived);
                }
                // Find the bracket index
                const bracketIndex = parBrackets.findIndex(b => overdueDays >= b.daysOverdueFrom &&
                    (b.daysOverdueTo === null || overdueDays <= b.daysOverdueTo));
                if (bracketIndex >= 0) {
                    productData.parBrackets[bracketIndex].amount += parseFloat(loan.total_outstanding_derived);
                }
            }
        }
        // Calculate percentages
        for (const bracket of parBrackets) {
            bracket.percentOfPortfolio = totalOutstanding > 0
                ? (bracket.outstandingAmount / totalOutstanding) * 100
                : 0;
        }
        // Calculate total PAR (sum of all non-current brackets)
        const parAmount = parBrackets
            .filter(b => b.daysOverdueFrom > 0)
            .reduce((sum, b) => sum + b.outstandingAmount, 0);
        const parRatio = totalOutstanding > 0 ? (parAmount / totalOutstanding) * 100 : 0;
        // Calculate ratios for detailed breakdowns
        if (includeDetails) {
            // Loan officers
            for (const [_, loData] of loanOfficerMap) {
                loData.parRatio = loData.totalOutstanding > 0
                    ? (loData.portfolioAtRisk / loData.totalOutstanding) * 100
                    : 0;
                for (const bracket of loData.parBrackets) {
                    bracket.ratio = loData.totalOutstanding > 0
                        ? (bracket.amount / loData.totalOutstanding) * 100
                        : 0;
                }
            }
            // Branches
            for (const [_, branchData] of branchMap) {
                branchData.parRatio = branchData.totalOutstanding > 0
                    ? (branchData.portfolioAtRisk / branchData.totalOutstanding) * 100
                    : 0;
                for (const bracket of branchData.parBrackets) {
                    bracket.ratio = branchData.totalOutstanding > 0
                        ? (bracket.amount / branchData.totalOutstanding) * 100
                        : 0;
                }
            }
            // Products
            for (const [_, productData] of productMap) {
                productData.parRatio = productData.totalOutstanding > 0
                    ? (productData.portfolioAtRisk / productData.totalOutstanding) * 100
                    : 0;
                for (const bracket of productData.parBrackets) {
                    bracket.ratio = productData.totalOutstanding > 0
                        ? (bracket.amount / productData.totalOutstanding) * 100
                        : 0;
                }
            }
        }
        // Build result
        const result = {
            asOfDate,
            currency,
            totalOutstanding,
            parBrackets,
            parRatio
        };
        if (includeDetails) {
            result.parByLoanOfficer = Array.from(loanOfficerMap.values());
            result.parByBranch = Array.from(branchMap.values());
            result.parByProduct = Array.from(productMap.values());
        }
        return result;
    }
    catch (error) {
        logger_1.logger.error('Error generating PAR report', { error });
        throw new Error(`Failed to generate PAR report: ${error.message}`);
    }
}
/**
 * Generate a Collection Report showing expected vs actual collections
 * @param fromDate Start date for the collection period
 * @param toDate End date for the collection period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param loanOfficerId Optional loan officer ID to filter by (null for all officers)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Collection report data
 */
async function generateCollectionReport(fromDate, toDate, officeId, loanOfficerId, currencyCode) {
    logger_1.logger.info('Generating collection report', { fromDate, toDate, officeId, loanOfficerId });
    try {
        // Build params array for query
        const params = [fromDate, toDate];
        let paramIndex = 3;
        // Build WHERE clause for optional filters
        let whereClause = '';
        if (officeId) {
            whereClause += ` AND l.office_id = $${paramIndex}`;
            params.push(officeId);
            paramIndex++;
        }
        if (loanOfficerId) {
            whereClause += ` AND l.loan_officer_id = $${paramIndex}`;
            params.push(loanOfficerId);
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
            const currencyQuery = await db_1.db.query(`SELECT default_currency_code FROM fineract_default.organization_currency LIMIT 1`);
            if (currencyQuery.rows.length > 0) {
                currency = currencyQuery.rows[0].default_currency_code;
            }
            else {
                currency = 'USD'; // Default fallback
            }
        }
        // Query for expected collections (from loan repayment schedule)
        const expectedQuery = await db_1.db.query(`SELECT 
        SUM(rs.principal_amount) as principal_expected,
        SUM(rs.interest_amount) as interest_expected,
        SUM(rs.fee_charges_amount) as fee_expected,
        SUM(rs.penalty_charges_amount) as penalty_expected
      FROM 
        fineract_default.loan_repayment_schedule rs
      JOIN
        fineract_default.loan l ON rs.loan_id = l.id
      WHERE 
        rs.due_date BETWEEN $1 AND $2
        AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
        ${whereClause}`, params);
        // Query for actual collections (from loan transactions)
        const actualQuery = await db_1.db.query(`SELECT 
        SUM(lt.principal_portion_derived) as principal_actual,
        SUM(lt.interest_portion_derived) as interest_actual,
        SUM(lt.fee_charges_portion_derived) as fee_actual,
        SUM(lt.penalty_charges_portion_derived) as penalty_actual
      FROM 
        fineract_default.loan_transaction lt
      JOIN
        fineract_default.loan l ON lt.loan_id = l.id
      WHERE 
        lt.transaction_date BETWEEN $1 AND $2
        AND lt.transaction_type_enum IN (2, 6) -- Repayment and Recovery Payment
        AND lt.is_reversed = false
        AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
        ${whereClause}`, params);
        // Query for collections by day
        const dailyCollectionsQuery = await db_1.db.query(`WITH daily_expected AS (
        SELECT 
          rs.due_date as date,
          SUM(rs.principal_amount + rs.interest_amount + rs.fee_charges_amount + rs.penalty_charges_amount) as expected
        FROM 
          fineract_default.loan_repayment_schedule rs
        JOIN
          fineract_default.loan l ON rs.loan_id = l.id
        WHERE 
          rs.due_date BETWEEN $1 AND $2
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          rs.due_date
      ),
      daily_actual AS (
        SELECT 
          lt.transaction_date as date,
          SUM(lt.amount) as actual
        FROM 
          fineract_default.loan_transaction lt
        JOIN
          fineract_default.loan l ON lt.loan_id = l.id
        WHERE 
          lt.transaction_date BETWEEN $1 AND $2
          AND lt.transaction_type_enum IN (2, 6) -- Repayment and Recovery Payment
          AND lt.is_reversed = false
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          lt.transaction_date
      )
      SELECT 
        COALESCE(de.date, da.date) as date,
        COALESCE(de.expected, 0) as expected,
        COALESCE(da.actual, 0) as actual
      FROM 
        daily_expected de
      FULL OUTER JOIN
        daily_actual da ON de.date = da.date
      ORDER BY 
        date`, params);
        // Query for collections by product
        const productCollectionsQuery = await db_1.db.query(`WITH product_expected AS (
        SELECT 
          l.product_id,
          lp.name as product_name,
          SUM(rs.principal_amount + rs.interest_amount + rs.fee_charges_amount + rs.penalty_charges_amount) as expected
        FROM 
          fineract_default.loan_repayment_schedule rs
        JOIN
          fineract_default.loan l ON rs.loan_id = l.id
        JOIN
          fineract_default.loan_product lp ON l.product_id = lp.id
        WHERE 
          rs.due_date BETWEEN $1 AND $2
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          l.product_id, lp.name
      ),
      product_actual AS (
        SELECT 
          l.product_id,
          lp.name as product_name,
          SUM(lt.amount) as actual
        FROM 
          fineract_default.loan_transaction lt
        JOIN
          fineract_default.loan l ON lt.loan_id = l.id
        JOIN
          fineract_default.loan_product lp ON l.product_id = lp.id
        WHERE 
          lt.transaction_date BETWEEN $1 AND $2
          AND lt.transaction_type_enum IN (2, 6) -- Repayment and Recovery Payment
          AND lt.is_reversed = false
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          l.product_id, lp.name
      )
      SELECT 
        COALESCE(pe.product_id, pa.product_id) as product_id,
        COALESCE(pe.product_name, pa.product_name) as product_name,
        COALESCE(pe.expected, 0) as expected,
        COALESCE(pa.actual, 0) as actual
      FROM 
        product_expected pe
      FULL OUTER JOIN
        product_actual pa ON pe.product_id = pa.product_id
      ORDER BY 
        product_name`, params);
        // Query for collections by loan officer
        const loanOfficerCollectionsQuery = await db_1.db.query(`WITH officer_expected AS (
        SELECT 
          l.loan_officer_id,
          s.display_name as loan_officer_name,
          SUM(rs.principal_amount + rs.interest_amount + rs.fee_charges_amount + rs.penalty_charges_amount) as expected
        FROM 
          fineract_default.loan_repayment_schedule rs
        JOIN
          fineract_default.loan l ON rs.loan_id = l.id
        JOIN
          fineract_default.m_staff s ON l.loan_officer_id = s.id
        WHERE 
          rs.due_date BETWEEN $1 AND $2
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          l.loan_officer_id, s.display_name
      ),
      officer_actual AS (
        SELECT 
          l.loan_officer_id,
          s.display_name as loan_officer_name,
          SUM(lt.amount) as actual
        FROM 
          fineract_default.loan_transaction lt
        JOIN
          fineract_default.loan l ON lt.loan_id = l.id
        JOIN
          fineract_default.m_staff s ON l.loan_officer_id = s.id
        WHERE 
          lt.transaction_date BETWEEN $1 AND $2
          AND lt.transaction_type_enum IN (2, 6) -- Repayment and Recovery Payment
          AND lt.is_reversed = false
          AND l.loan_status IN ('active', 'closed_obligations_met', 'overpaid')
          ${whereClause}
        GROUP BY 
          l.loan_officer_id, s.display_name
      )
      SELECT 
        COALESCE(oe.loan_officer_id, oa.loan_officer_id) as loan_officer_id,
        COALESCE(oe.loan_officer_name, oa.loan_officer_name) as loan_officer_name,
        COALESCE(oe.expected, 0) as expected,
        COALESCE(oa.actual, 0) as actual
      FROM 
        officer_expected oe
      FULL OUTER JOIN
        officer_actual oa ON oe.loan_officer_id = oa.loan_officer_id
      ORDER BY 
        loan_officer_name`, params);
        // Parse expected collections
        const expectedRow = expectedQuery.rows[0];
        const expected = {
            principal: parseFloat(expectedRow.principal_expected) || 0,
            interest: parseFloat(expectedRow.interest_expected) || 0,
            fees: parseFloat(expectedRow.fee_expected) || 0,
            penalties: parseFloat(expectedRow.penalty_expected) || 0,
            total: 0
        };
        expected.total = expected.principal + expected.interest + expected.fees + expected.penalties;
        // Parse actual collections
        const actualRow = actualQuery.rows[0];
        const actual = {
            principal: parseFloat(actualRow.principal_actual) || 0,
            interest: parseFloat(actualRow.interest_actual) || 0,
            fees: parseFloat(actualRow.fee_actual) || 0,
            penalties: parseFloat(actualRow.penalty_actual) || 0,
            total: 0
        };
        actual.total = actual.principal + actual.interest + actual.fees + actual.penalties;
        // Calculate variance
        const variance = {
            principal: actual.principal - expected.principal,
            interest: actual.interest - expected.interest,
            fees: actual.fees - expected.fees,
            penalties: actual.penalties - expected.penalties,
            total: actual.total - expected.total
        };
        // Calculate collection ratio
        const collectionRatio = expected.total > 0 ? (actual.total / expected.total) * 100 : 0;
        // Parse collections by day
        const collectionsByDay = dailyCollectionsQuery.rows.map(row => ({
            date: row.date,
            expected: parseFloat(row.expected) || 0,
            actual: parseFloat(row.actual) || 0,
            ratio: parseFloat(row.expected) > 0
                ? (parseFloat(row.actual) / parseFloat(row.expected)) * 100
                : 0
        }));
        // Parse collections by product
        const collectionsByProduct = productCollectionsQuery.rows.map(row => ({
            productId: row.product_id,
            productName: row.product_name,
            expected: parseFloat(row.expected) || 0,
            actual: parseFloat(row.actual) || 0,
            ratio: parseFloat(row.expected) > 0
                ? (parseFloat(row.actual) / parseFloat(row.expected)) * 100
                : 0
        }));
        // Parse collections by loan officer
        const collectionsByLoanOfficer = loanOfficerCollectionsQuery.rows.map(row => ({
            loanOfficerId: row.loan_officer_id,
            loanOfficerName: row.loan_officer_name,
            expected: parseFloat(row.expected) || 0,
            actual: parseFloat(row.actual) || 0,
            ratio: parseFloat(row.expected) > 0
                ? (parseFloat(row.actual) / parseFloat(row.expected)) * 100
                : 0
        }));
        // Build result
        return {
            fromDate,
            toDate,
            currency,
            expected,
            actual,
            variance,
            collectionRatio,
            collectionsByDay,
            collectionsByProduct,
            collectionsByLoanOfficer
        };
    }
    catch (error) {
        logger_1.logger.error('Error generating collection report', { error });
        throw new Error(`Failed to generate collection report: ${error.message}`);
    }
}
/**
 * Generate a Loan Portfolio Summary report
 * @param asOfDate The date to generate the report as of
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Loan portfolio summary report
 */
async function generateLoanPortfolioSummary(asOfDate, officeId, currencyCode) {
    logger_1.logger.info('Generating loan portfolio summary', { asOfDate, officeId, currencyCode });
    try {
        // Build params array for query
        const params = [asOfDate];
        let paramIndex = 2;
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
            const currencyQuery = await db_1.db.query(`SELECT default_currency_code FROM fineract_default.organization_currency LIMIT 1`);
            if (currencyQuery.rows.length > 0) {
                currency = currencyQuery.rows[0].default_currency_code;
            }
            else {
                currency = 'USD'; // Default fallback
            }
        }
        // Query for overall portfolio summary
        const summaryQuery = await db_1.db.query(`SELECT 
        COUNT(*) as active_loan_count,
        SUM(l.principal_disbursed_derived) as total_disbursed,
        SUM(l.principal_outstanding_derived) as principal_outstanding,
        SUM(l.interest_outstanding_derived) as interest_outstanding,
        SUM(l.fee_charges_outstanding_derived) as fee_outstanding,
        SUM(l.penalty_charges_outstanding_derived) as penalty_outstanding,
        SUM(l.total_outstanding_derived) as total_outstanding,
        COUNT(CASE WHEN COALESCE(ld.overdue_days, 0) > 0 THEN 1 END) as overdue_loan_count,
        SUM(CASE WHEN COALESCE(ld.overdue_days, 0) > 0 THEN l.total_outstanding_derived ELSE 0 END) as overdue_amount
      FROM 
        fineract_default.loan l
      LEFT JOIN 
        fineract_default.loan_delinquency ld ON l.id = ld.loan_id AND ld.as_of_date = $1
      WHERE 
        l.loan_status = 'active'
        ${whereClause}`, params);
        // Query for portfolio by status
        const statusQuery = await db_1.db.query(`SELECT 
        l.loan_status as status,
        COUNT(*) as count,
        SUM(l.total_outstanding_derived) as outstanding
      FROM 
        fineract_default.loan l
      WHERE 
        l.loan_status IN ('active', 'approved', 'submitted_and_pending_approval', 
                        'closed_obligations_met', 'closed_written_off', 'closed_rescheduled', 
                        'overpaid')
        ${whereClause}
      GROUP BY 
        l.loan_status`, params);
        // Query for portfolio by product
        const productQuery = await db_1.db.query(`SELECT 
        l.product_id,
        lp.name as product_name,
        COUNT(*) as count,
        SUM(l.total_outstanding_derived) as outstanding
      FROM 
        fineract_default.loan l
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE 
        l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        l.product_id, lp.name`, params);
        // Query for portfolio by branch
        const branchQuery = await db_1.db.query(`SELECT 
        l.office_id as branch_id,
        o.name as branch_name,
        COUNT(*) as count,
        SUM(l.total_outstanding_derived) as outstanding
      FROM 
        fineract_default.loan l
      JOIN
        fineract_default.office o ON l.office_id = o.id
      WHERE 
        l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        l.office_id, o.name`, params);
        // Query for disbursement trends (last 6 months)
        const disbursementQuery = await db_1.db.query(`SELECT 
        to_char(l.disbursed_on_date, 'YYYY-MM') as period,
        COUNT(*) as count,
        SUM(l.principal_disbursed_derived) as amount
      FROM 
        fineract_default.loan l
      WHERE 
        l.disbursed_on_date IS NOT NULL
        AND l.disbursed_on_date >= $1::date - interval '6 months'
        AND l.disbursed_on_date <= $1::date
        ${whereClause}
      GROUP BY 
        to_char(l.disbursed_on_date, 'YYYY-MM')
      ORDER BY 
        period`, params);
        // Query for repayment trends (last 6 months)
        const repaymentQuery = await db_1.db.query(`WITH monthly_expected AS (
        SELECT 
          to_char(rs.due_date, 'YYYY-MM') as period,
          SUM(rs.principal_amount + rs.interest_amount + rs.fee_charges_amount + rs.penalty_charges_amount) as expected
        FROM 
          fineract_default.loan_repayment_schedule rs
        JOIN
          fineract_default.loan l ON rs.loan_id = l.id
        WHERE 
          rs.due_date >= $1::date - interval '6 months'
          AND rs.due_date <= $1::date
          ${whereClause}
        GROUP BY 
          to_char(rs.due_date, 'YYYY-MM')
      ),
      monthly_actual AS (
        SELECT 
          to_char(lt.transaction_date, 'YYYY-MM') as period,
          SUM(lt.amount) as actual
        FROM 
          fineract_default.loan_transaction lt
        JOIN
          fineract_default.loan l ON lt.loan_id = l.id
        WHERE 
          lt.transaction_date >= $1::date - interval '6 months'
          AND lt.transaction_date <= $1::date
          AND lt.transaction_type_enum IN (2, 6) -- Repayment and Recovery Payment
          AND lt.is_reversed = false
          ${whereClause}
        GROUP BY 
          to_char(lt.transaction_date, 'YYYY-MM')
      )
      SELECT 
        COALESCE(me.period, ma.period) as period,
        COALESCE(me.expected, 0) as expected,
        COALESCE(ma.actual, 0) as actual
      FROM 
        monthly_expected me
      FULL OUTER JOIN
        monthly_actual ma ON me.period = ma.period
      ORDER BY 
        period`, params);
        // Parse summary data
        const summaryRow = summaryQuery.rows[0];
        // Parse portfolio by status
        const totalLoanCount = statusQuery.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
        const portfolioByStatus = statusQuery.rows.map(row => ({
            status: row.status,
            count: parseInt(row.count),
            outstanding: parseFloat(row.outstanding) || 0,
            percentByCount: totalLoanCount > 0 ? (parseInt(row.count) / totalLoanCount) * 100 : 0,
            percentByAmount: summaryRow.total_outstanding > 0
                ? (parseFloat(row.outstanding) / parseFloat(summaryRow.total_outstanding)) * 100
                : 0
        }));
        // Parse portfolio by product
        const portfolioByProduct = productQuery.rows.map(row => ({
            productId: row.product_id,
            productName: row.product_name,
            count: parseInt(row.count),
            outstanding: parseFloat(row.outstanding) || 0,
            percentByCount: parseInt(summaryRow.active_loan_count) > 0
                ? (parseInt(row.count) / parseInt(summaryRow.active_loan_count)) * 100
                : 0,
            percentByAmount: parseFloat(summaryRow.total_outstanding) > 0
                ? (parseFloat(row.outstanding) / parseFloat(summaryRow.total_outstanding)) * 100
                : 0
        }));
        // Parse portfolio by branch
        const portfolioByBranch = branchQuery.rows.map(row => ({
            branchId: row.branch_id,
            branchName: row.branch_name,
            count: parseInt(row.count),
            outstanding: parseFloat(row.outstanding) || 0,
            percentByCount: parseInt(summaryRow.active_loan_count) > 0
                ? (parseInt(row.count) / parseInt(summaryRow.active_loan_count)) * 100
                : 0,
            percentByAmount: parseFloat(summaryRow.total_outstanding) > 0
                ? (parseFloat(row.outstanding) / parseFloat(summaryRow.total_outstanding)) * 100
                : 0
        }));
        // Parse disbursement trends
        const disbursementTrends = disbursementQuery.rows.map(row => ({
            period: row.period,
            count: parseInt(row.count),
            amount: parseFloat(row.amount) || 0
        }));
        // Parse repayment trends
        const repaymentTrends = repaymentQuery.rows.map(row => ({
            period: row.period,
            expected: parseFloat(row.expected) || 0,
            actual: parseFloat(row.actual) || 0,
            ratio: parseFloat(row.expected) > 0
                ? (parseFloat(row.actual) / parseFloat(row.expected)) * 100
                : 0
        }));
        // Build result
        return {
            asOfDate,
            currency,
            activeLoanCount: parseInt(summaryRow.active_loan_count),
            totalDisbursed: parseFloat(summaryRow.total_disbursed) || 0,
            totalOutstanding: parseFloat(summaryRow.total_outstanding) || 0,
            totalPrincipalOutstanding: parseFloat(summaryRow.principal_outstanding) || 0,
            totalInterestOutstanding: parseFloat(summaryRow.interest_outstanding) || 0,
            totalFeesOutstanding: parseFloat(summaryRow.fee_outstanding) || 0,
            totalPenaltiesOutstanding: parseFloat(summaryRow.penalty_outstanding) || 0,
            overdueLoanCount: parseInt(summaryRow.overdue_loan_count),
            overdueAmount: parseFloat(summaryRow.overdue_amount) || 0,
            overdueRatio: parseFloat(summaryRow.total_outstanding) > 0
                ? (parseFloat(summaryRow.overdue_amount) / parseFloat(summaryRow.total_outstanding)) * 100
                : 0,
            portfolioByStatus,
            portfolioByProduct,
            portfolioByBranch,
            disbursementTrends,
            repaymentTrends
        };
    }
    catch (error) {
        logger_1.logger.error('Error generating loan portfolio summary', { error });
        throw new Error(`Failed to generate loan portfolio summary: ${error.message}`);
    }
}
/**
 * Generate an Expected Repayments Report
 * @param fromDate Start date for the repayments period
 * @param toDate End date for the repayments period
 * @param officeId Optional office ID to filter by (null for all offices)
 * @param loanOfficerId Optional loan officer ID to filter by (null for all officers)
 * @param currencyCode Optional currency to filter by (null for all currencies)
 * @returns Expected repayments report data
 */
async function generateExpectedRepaymentsReport(fromDate, toDate, officeId, loanOfficerId, currencyCode) {
    logger_1.logger.info('Generating expected repayments report', {
        fromDate, toDate, officeId, loanOfficerId, currencyCode
    });
    try {
        // Build params array for query
        const params = [fromDate, toDate];
        let paramIndex = 3;
        // Build WHERE clause for optional filters
        let whereClause = '';
        if (officeId) {
            whereClause += ` AND l.office_id = $${paramIndex}`;
            params.push(officeId);
            paramIndex++;
        }
        if (loanOfficerId) {
            whereClause += ` AND l.loan_officer_id = $${paramIndex}`;
            params.push(loanOfficerId);
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
            const currencyQuery = await db_1.db.query(`SELECT default_currency_code FROM fineract_default.organization_currency LIMIT 1`);
            if (currencyQuery.rows.length > 0) {
                currency = currencyQuery.rows[0].default_currency_code;
            }
            else {
                currency = 'USD'; // Default fallback
            }
        }
        // Query for daily repayment schedule
        const dailyScheduleQuery = await db_1.db.query(`SELECT 
        rs.due_date as date,
        SUM(rs.principal_amount) as principal,
        SUM(rs.interest_amount) as interest,
        SUM(rs.fee_charges_amount) as fees,
        SUM(rs.penalty_charges_amount) as penalties,
        COUNT(DISTINCT rs.loan_id) as loan_count
      FROM 
        fineract_default.loan_repayment_schedule rs
      JOIN
        fineract_default.loan l ON rs.loan_id = l.id
      WHERE 
        rs.due_date BETWEEN $1 AND $2
        AND l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        rs.due_date
      ORDER BY 
        rs.due_date`, params);
        // Query for repayments by loan officer
        const loanOfficerQuery = await db_1.db.query(`SELECT 
        l.loan_officer_id,
        s.display_name as loan_officer_name,
        SUM(rs.principal_amount) as principal,
        SUM(rs.interest_amount) as interest,
        SUM(rs.fee_charges_amount) as fees,
        SUM(rs.penalty_charges_amount) as penalties,
        COUNT(DISTINCT rs.loan_id) as loan_count
      FROM 
        fineract_default.loan_repayment_schedule rs
      JOIN
        fineract_default.loan l ON rs.loan_id = l.id
      JOIN
        fineract_default.m_staff s ON l.loan_officer_id = s.id
      WHERE 
        rs.due_date BETWEEN $1 AND $2
        AND l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        l.loan_officer_id, s.display_name
      ORDER BY 
        s.display_name`, params);
        // Query for repayments by branch
        const branchQuery = await db_1.db.query(`SELECT 
        l.office_id as branch_id,
        o.name as branch_name,
        SUM(rs.principal_amount) as principal,
        SUM(rs.interest_amount) as interest,
        SUM(rs.fee_charges_amount) as fees,
        SUM(rs.penalty_charges_amount) as penalties,
        COUNT(DISTINCT rs.loan_id) as loan_count
      FROM 
        fineract_default.loan_repayment_schedule rs
      JOIN
        fineract_default.loan l ON rs.loan_id = l.id
      JOIN
        fineract_default.office o ON l.office_id = o.id
      WHERE 
        rs.due_date BETWEEN $1 AND $2
        AND l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        l.office_id, o.name
      ORDER BY 
        o.name`, params);
        // Query for repayments by product
        const productQuery = await db_1.db.query(`SELECT 
        l.product_id,
        lp.name as product_name,
        SUM(rs.principal_amount) as principal,
        SUM(rs.interest_amount) as interest,
        SUM(rs.fee_charges_amount) as fees,
        SUM(rs.penalty_charges_amount) as penalties,
        COUNT(DISTINCT rs.loan_id) as loan_count
      FROM 
        fineract_default.loan_repayment_schedule rs
      JOIN
        fineract_default.loan l ON rs.loan_id = l.id
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE 
        rs.due_date BETWEEN $1 AND $2
        AND l.loan_status = 'active'
        ${whereClause}
      GROUP BY 
        l.product_id, lp.name
      ORDER BY 
        lp.name`, params);
        // Calculate total expected amount
        let totalExpected = 0;
        let runningTotal = 0;
        // Parse daily repayment schedule
        const repaymentSchedule = dailyScheduleQuery.rows.map(row => {
            const principal = parseFloat(row.principal) || 0;
            const interest = parseFloat(row.interest) || 0;
            const fees = parseFloat(row.fees) || 0;
            const penalties = parseFloat(row.penalties) || 0;
            const total = principal + interest + fees + penalties;
            runningTotal += total;
            return {
                date: row.date,
                principal,
                interest,
                fees,
                penalties,
                total,
                runningTotal,
                loanCount: parseInt(row.loan_count)
            };
        });
        totalExpected = runningTotal;
        // Parse repayments by loan officer
        const repaymentsByLoanOfficer = loanOfficerQuery.rows.map(row => ({
            loanOfficerId: row.loan_officer_id,
            loanOfficerName: row.loan_officer_name,
            principal: parseFloat(row.principal) || 0,
            interest: parseFloat(row.interest) || 0,
            fees: parseFloat(row.fees) || 0,
            penalties: parseFloat(row.penalties) || 0,
            total: (parseFloat(row.principal) || 0) +
                (parseFloat(row.interest) || 0) +
                (parseFloat(row.fees) || 0) +
                (parseFloat(row.penalties) || 0),
            loanCount: parseInt(row.loan_count)
        }));
        // Parse repayments by branch
        const repaymentsByBranch = branchQuery.rows.map(row => ({
            branchId: row.branch_id,
            branchName: row.branch_name,
            principal: parseFloat(row.principal) || 0,
            interest: parseFloat(row.interest) || 0,
            fees: parseFloat(row.fees) || 0,
            penalties: parseFloat(row.penalties) || 0,
            total: (parseFloat(row.principal) || 0) +
                (parseFloat(row.interest) || 0) +
                (parseFloat(row.fees) || 0) +
                (parseFloat(row.penalties) || 0),
            loanCount: parseInt(row.loan_count)
        }));
        // Parse repayments by product
        const repaymentsByProduct = productQuery.rows.map(row => ({
            productId: row.product_id,
            productName: row.product_name,
            principal: parseFloat(row.principal) || 0,
            interest: parseFloat(row.interest) || 0,
            fees: parseFloat(row.fees) || 0,
            penalties: parseFloat(row.penalties) || 0,
            total: (parseFloat(row.principal) || 0) +
                (parseFloat(row.interest) || 0) +
                (parseFloat(row.fees) || 0) +
                (parseFloat(row.penalties) || 0),
            loanCount: parseInt(row.loan_count)
        }));
        // Build result
        return {
            fromDate,
            toDate,
            currency,
            totalExpected,
            repaymentSchedule,
            repaymentsByLoanOfficer,
            repaymentsByBranch,
            repaymentsByProduct
        };
    }
    catch (error) {
        logger_1.logger.error('Error generating expected repayments report', { error });
        throw new Error(`Failed to generate expected repayments report: ${error.message}`);
    }
}
