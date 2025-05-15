/**
 * Savings Reporting Service
 * Provides methods for generating various savings reports
 */

import { db } from '../utils/db';
import logger from '../utils/logger';
import { 
  ProductPerformanceReportInput, 
  ProductPerformanceReportResponse,
  DormancyAnalysisReportInput,
  DormancyAnalysisReportResponse,
  InterestDistributionReportInput,
  InterestDistributionReportResponse,
  AccountActivityReportInput,
  AccountActivityReportResponse,
  FinancialProjectionReportInput,
  FinancialProjectionReportResponse,
  SavingsProductPerformance,
  ProductPerformanceTrend,
  ProductComparisonMetric,
  SavingsDormancyAnalysis,
  DormancyRiskBand,
  DormancyTrend,
  SavingsInterestDistribution,
  InterestRateTier,
  BalanceRangeTier,
  SavingsAccountActivityReport,
  SavingsAccountActivity,
  SavingsFinancialProjection,
  ProjectionPeriod,
  ProjectionScenario,
  ProjectionAssumption
} from '../models/savings/reporting';

/**
 * Generates the Savings Product Performance Report
 * This report provides comprehensive metrics on savings product performance
 */
export async function generateProductPerformanceReport(
  input: ProductPerformanceReportInput
): Promise<ProductPerformanceReportResponse> {
  try {
    logger.info('Generating savings product performance report', { input });
    
    // Build the SQL query based on input parameters
    const productsQuery = `
      SELECT 
        p.id, p.name, p.short_name as "shortName", p.description, 
        p.currency_code as "currencyCode", p.nominal_annual_interest_rate as "interestRate"
      FROM 
        fineract_default.savings_product p
      WHERE 
        p.active = true
        ${input.productId ? `AND p.id = $1` : ''}
        ${input.currencyCode ? `AND p.currency_code = ${input.productId ? '$2' : '$1'}` : ''}
      ORDER BY 
        p.name
    `;
    
    // Set query parameters
    const productsParams: any[] = [];
    if (input.productId) productsParams.push(input.productId);
    if (input.currencyCode) productsParams.push(input.currencyCode);
    
    // Execute query to get products
    const productsResult = await db.query(productsQuery, productsParams);
    const products = productsResult.rows;
    
    if (products.length === 0) {
      return {
        success: false,
        generatedDate: new Date().toISOString(),
        dateRange: { fromDate: input.startDate, toDate: input.endDate },
        currencyCode: input.currencyCode || 'USD',
        products: [],
        message: 'No active savings products found matching the criteria'
      };
    }
    
    // Get all product metrics for each product
    const productPerformances: SavingsProductPerformance[] = [];
    
    for (const product of products) {
      // Get current metrics
      const metricsQuery = `
        SELECT * FROM fineract_default.view_savings_product_performance
        WHERE product_id = $1
        AND metric_date BETWEEN $2 AND $3
        ORDER BY metric_date DESC
        LIMIT 1
      `;
      
      const metricsResult = await db.query(metricsQuery, [
        product.id,
        input.startDate,
        input.endDate
      ]);
      
      // Get historical trends if requested
      let historicalTrends: ProductPerformanceTrend[] = [];
      if (input.includeTrends) {
        const trendsQuery = `
          WITH monthly_metrics AS (
            SELECT 
              DATE_TRUNC('month', m.metric_date) as period,
              AVG(m.total_accounts)::INTEGER as total_accounts,
              AVG(m.active_accounts)::INTEGER as active_accounts,
              AVG(m.dormant_accounts)::INTEGER as dormant_accounts,
              AVG(m.total_balance) as total_balance,
              SUM(m.net_deposit_value) as net_flows,
              SUM(m.total_interest_paid) as interest_paid
            FROM 
              fineract_default.savings_product_metrics m
            WHERE 
              m.product_id = $1
              AND m.metric_date BETWEEN $2 AND $3
            GROUP BY 
              DATE_TRUNC('month', m.metric_date)
            ORDER BY 
              period DESC
            LIMIT 12
          )
          SELECT 
            TO_CHAR(period, 'YYYY-MM') as period,
            total_accounts,
            active_accounts,
            dormant_accounts,
            total_balance,
            net_flows,
            interest_paid
          FROM 
            monthly_metrics
          ORDER BY 
            period ASC
        `;
        
        const trendsResult = await db.query(trendsQuery, [
          product.id,
          input.startDate,
          input.endDate
        ]);
        
        historicalTrends = trendsResult.rows.map((row: any) => ({
          period: row.period,
          totalAccounts: row.total_accounts || 0,
          activeAccounts: row.active_accounts || 0,
          dormantAccounts: row.dormant_accounts || 0,
          totalBalance: parseFloat(row.total_balance) || 0,
          netFlows: parseFloat(row.net_flows) || 0,
          interestPaid: parseFloat(row.interest_paid) || 0
        }));
      }
      
      // Get comparison metrics if requested
      let comparisonMetrics: ProductComparisonMetric[] = [];
      if (input.includeComparison) {
        // These would typically come from industry benchmarks or system-wide averages
        // For now, we'll use placeholder values
        comparisonMetrics = [
          {
            metricName: 'Account Growth Rate',
            metricValue: 5.2,
            industryAverage: 4.5,
            percentileRank: 65,
            trend: 'increasing'
          },
          {
            metricName: 'Average Balance',
            metricValue: metricsResult.rows[0]?.average_balance || 0,
            industryAverage: 3500,
            percentileRank: 58,
            trend: 'stable'
          },
          {
            metricName: 'Dormancy Rate',
            metricValue: metricsResult.rows[0]?.dormancy_rate || 0,
            industryAverage: 12.5,
            percentileRank: 72,
            trend: 'decreasing'
          },
          {
            metricName: 'Interest Expense Ratio',
            metricValue: metricsResult.rows[0]?.effective_interest_percentage || 0,
            industryAverage: 3.8,
            percentileRank: 45,
            trend: 'stable'
          }
        ];
      }
      
      // Build the product performance object
      const metrics = metricsResult.rows[0] || {};
      const productPerformance: SavingsProductPerformance = {
        id: product.id,
        name: product.name,
        shortName: product.shortName,
        description: product.description,
        currencyCode: product.currencyCode,
        interestRate: parseFloat(product.interestRate),
        currentMetrics: {
          totalAccounts: metrics.total_accounts || 0,
          activeAccounts: metrics.active_accounts || 0,
          dormantAccounts: metrics.dormant_accounts || 0,
          totalBalance: parseFloat(metrics.total_balance) || 0,
          averageBalance: parseFloat(metrics.average_balance) || 0,
          totalInterestPaid: parseFloat(metrics.total_interest_paid) || 0,
          totalTransactions: metrics.total_transactions || 0,
          totalDepositValue: parseFloat(metrics.total_deposit_value) || 0,
          totalWithdrawalValue: parseFloat(metrics.total_withdrawal_value) || 0,
          netDepositValue: parseFloat(metrics.net_deposit_value) || 0,
          averageLifetimeMonths: parseFloat(metrics.avg_lifetime_months) || 0,
          customerRetentionRate: parseFloat(metrics.customer_retention_rate) || 0,
          dormancyRate: parseFloat(metrics.dormancy_rate) || 0,
          averageTransactionSize: parseFloat(metrics.avg_transaction_size) || 0,
          effectiveInterestPercentage: parseFloat(metrics.effective_interest_percentage) || 0,
          profitMargin: parseFloat(metrics.profit_margin) || 0
        },
        historicalTrends,
        comparisonMetrics
      };
      
      productPerformances.push(productPerformance);
    }
    
    // Build and return the response
    return {
      success: true,
      generatedDate: new Date().toISOString(),
      dateRange: { fromDate: input.startDate, toDate: input.endDate },
      currencyCode: input.currencyCode || (products[0]?.currencyCode || 'USD'),
      products: productPerformances
    };
  } catch (error) {
    logger.error('Error generating savings product performance report', { error, input });
    return {
      success: false,
      generatedDate: new Date().toISOString(),
      dateRange: { fromDate: input.startDate, toDate: input.endDate },
      currencyCode: input.currencyCode || 'USD',
      products: [],
      message: `Error generating report: ${error.message}`
    };
  }
}

/**
 * Generates the Savings Dormancy Analysis Report
 * This report provides analysis of dormancy patterns and at-risk accounts
 */
export async function generateDormancyAnalysisReport(
  input: DormancyAnalysisReportInput
): Promise<DormancyAnalysisReportResponse> {
  try {
    logger.info('Generating savings dormancy analysis report', { input });
    
    // Get basic dormancy data
    const dormancyQuery = `
      SELECT * FROM fineract_default.view_savings_dormancy_analysis
      WHERE 1=1
      ${input.productId ? 'AND product_id = $1' : ''}
      AND metric_date <= $${input.productId ? '2' : '1'}
      AND dormancy_risk_threshold_days = $${input.productId ? '3' : '2'}
      ORDER BY metric_date DESC
      LIMIT 1
    `;
    
    const dormancyParams = [];
    if (input.productId) dormancyParams.push(input.productId);
    dormancyParams.push(input.asOfDate);
    dormancyParams.push(input.riskThresholdDays || 60);
    
    const dormancyResult = await db.query(dormancyQuery, dormancyParams);
    
    if (dormancyResult.rows.length === 0) {
      return {
        success: false,
        message: 'No dormancy data found for the specified criteria'
      };
    }
    
    const dormancyData = dormancyResult.rows[0];
    
    // Get risk bands data
    const riskBandsQuery = `
      WITH risk_data AS (
        SELECT 
          sa.id as account_id,
          sa.account_balance_derived as balance,
          EXTRACT(DAY FROM (DATE($1) - COALESCE(
            (SELECT MAX(transaction_date) FROM fineract_default.savings_account_transaction 
             WHERE savings_account_id = sa.id AND is_reversed = FALSE), 
            sa.activated_on_date
          ))) as days_inactive
        FROM 
          fineract_default.savings_account sa
        WHERE 
          sa.status = 'active'
          ${input.productId ? 'AND sa.product_id = $2' : ''}
      ),
      risk_bands AS (
        SELECT 
          CASE 
            WHEN days_inactive BETWEEN 30 AND 60 THEN '30-60'
            WHEN days_inactive BETWEEN 61 AND 90 THEN '61-90'
            WHEN days_inactive > 90 THEN '90+'
            ELSE 'active'
          END as days_inactive_band,
          COUNT(*) as account_count,
          SUM(balance) as total_balance
        FROM 
          risk_data
        WHERE 
          days_inactive >= 30
        GROUP BY 
          days_inactive_band
      ),
      total_metrics AS (
        SELECT 
          SUM(account_count) as total_accounts,
          SUM(total_balance) as total_balance
        FROM 
          risk_bands
      )
      SELECT 
        rb.days_inactive_band,
        rb.account_count,
        rb.total_balance,
        CASE 
          WHEN tm.total_accounts > 0 THEN (rb.account_count * 100.0 / tm.total_accounts)
          ELSE 0
        END as percentage_of_accounts,
        CASE 
          WHEN tm.total_balance > 0 THEN (rb.total_balance * 100.0 / tm.total_balance)
          ELSE 0
        END as percentage_of_portfolio
      FROM 
        risk_bands rb, total_metrics tm
      ORDER BY 
        CASE 
          WHEN rb.days_inactive_band = '30-60' THEN 1
          WHEN rb.days_inactive_band = '61-90' THEN 2
          WHEN rb.days_inactive_band = '90+' THEN 3
          ELSE 4
        END
    `;
    
    const riskBandsParams = [input.asOfDate];
    if (input.productId) riskBandsParams.push(input.productId);
    
    const riskBandsResult = await db.query(riskBandsQuery, riskBandsParams);
    
    // Get dormancy trends
    const trendsQuery = `
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', d.metric_date) as period,
          AVG(d.dormant_accounts)::INTEGER as dormant_accounts,
          AVG(d.dormancy_rate) as dormancy_rate,
          AVG(d.reactivation_rate) as reactivation_rate,
          SUM(CASE WHEN d.dormant_accounts > LAG(d.dormant_accounts) OVER (ORDER BY d.metric_date)
              THEN d.dormant_accounts - LAG(d.dormant_accounts) OVER (ORDER BY d.metric_date)
              ELSE 0 END) as new_dormant_accounts
        FROM 
          fineract_default.savings_dormancy_analytics d
        JOIN
          fineract_default.savings_product p ON d.product_id = p.id
        WHERE 
          d.metric_date BETWEEN DATE($1) - INTERVAL '12 months' AND DATE($1)
          ${input.productId ? 'AND d.product_id = $2' : ''}
          AND d.dormancy_risk_threshold_days = $${input.productId ? '3' : '2'}
        GROUP BY 
          DATE_TRUNC('month', d.metric_date)
        ORDER BY 
          period
      )
      SELECT 
        TO_CHAR(period, 'YYYY-MM') as period,
        dormant_accounts,
        dormancy_rate,
        COALESCE(reactivation_rate, 0) as reactivation_rate,
        COALESCE(new_dormant_accounts, 0) as new_dormant_accounts
      FROM 
        monthly_data
      ORDER BY 
        period
    `;
    
    const trendsParams = [input.asOfDate];
    if (input.productId) trendsParams.push(input.productId);
    trendsParams.push(input.riskThresholdDays || 60);
    
    const trendsResult = await db.query(trendsQuery, trendsParams);
    
    // Format the risk bands data
    const atRiskAccounts: DormancyRiskBand[] = riskBandsResult.rows.map((row: any) => ({
      daysInactive: row.days_inactive_band,
      accountCount: parseInt(row.account_count) || 0,
      totalBalance: parseFloat(row.total_balance) || 0,
      percentageOfAccounts: parseFloat(row.percentage_of_accounts) || 0,
      percentageOfPortfolio: parseFloat(row.percentage_of_portfolio) || 0
    }));
    
    // Format the trends data
    const dormancyTrends: DormancyTrend[] = trendsResult.rows.map((row: any) => ({
      period: row.period,
      dormantAccounts: parseInt(row.dormant_accounts) || 0,
      dormancyRate: parseFloat(row.dormancy_rate) || 0,
      reactivatedAccounts: parseInt(row.reactivation_rate * row.dormant_accounts / 100) || 0,
      newDormantAccounts: parseInt(row.new_dormant_accounts) || 0
    }));
    
    // Use optional demographic data if requested
    let demographicAnalysis = undefined;
    let geographicalAnalysis = undefined;
    let seasonalPatterns = undefined;
    
    if (input.includeDemographic) {
      // For demo purposes, generate sample demographic data
      demographicAnalysis = [
        {
          demographicType: 'age',
          segment: '18-25',
          accountCount: 245,
          dormancyRate: 18.5,
          averageDaysToDormancy: 120
        },
        {
          demographicType: 'age',
          segment: '26-40',
          accountCount: 583,
          dormancyRate: 12.2,
          averageDaysToDormancy: 150
        },
        {
          demographicType: 'age',
          segment: '41-60',
          accountCount: 421,
          dormancyRate: 8.4,
          averageDaysToDormancy: 180
        },
        {
          demographicType: 'age',
          segment: '61+',
          accountCount: 187,
          dormancyRate: 15.3,
          averageDaysToDormancy: 140
        },
        {
          demographicType: 'gender',
          segment: 'male',
          accountCount: 715,
          dormancyRate: 12.8,
          averageDaysToDormancy: 155
        },
        {
          demographicType: 'gender',
          segment: 'female',
          accountCount: 721,
          dormancyRate: 13.2,
          averageDaysToDormancy: 148
        }
      ];
    }
    
    if (input.includeGeographical) {
      // For demo purposes, generate sample geographical data
      geographicalAnalysis = [
        {
          region: 'North',
          accountCount: 320,
          dormantAccounts: 42,
          dormancyRate: 13.1,
          riskScore: 0.65
        },
        {
          region: 'South',
          accountCount: 412,
          dormantAccounts: 58,
          dormancyRate: 14.1,
          riskScore: 0.71
        },
        {
          region: 'East',
          accountCount: 285,
          dormantAccounts: 34,
          dormancyRate: 11.9,
          riskScore: 0.58
        },
        {
          region: 'West',
          accountCount: 419,
          dormantAccounts: 45,
          dormancyRate: 10.7,
          riskScore: 0.52
        }
      ];
    }
    
    if (input.includeSeasonalAnalysis) {
      // For demo purposes, generate sample seasonal data
      seasonalPatterns = [
        {
          period: 'Jan',
          dormantAccounts: 120,
          dormancyRate: 13.5,
          reactivatedAccounts: 18,
          newDormantAccounts: 22
        },
        {
          period: 'Feb',
          dormantAccounts: 124,
          dormancyRate: 13.8,
          reactivatedAccounts: 15,
          newDormantAccounts: 19
        },
        {
          period: 'Mar',
          dormantAccounts: 128,
          dormancyRate: 14.1,
          reactivatedAccounts: 14,
          newDormantAccounts: 18
        },
        {
          period: 'Apr',
          dormantAccounts: 132,
          dormancyRate: 14.4,
          reactivatedAccounts: 12,
          newDormantAccounts: 16
        },
        {
          period: 'May',
          dormantAccounts: 122,
          dormancyRate: 13.2,
          reactivatedAccounts: 22,
          newDormantAccounts: 12
        },
        {
          period: 'Jun',
          dormantAccounts: 118,
          dormancyRate: 12.8,
          reactivatedAccounts: 16,
          newDormantAccounts: 12
        },
        {
          period: 'Jul',
          dormantAccounts: 114,
          dormancyRate: 12.4,
          reactivatedAccounts: 14,
          newDormantAccounts: 10
        },
        {
          period: 'Aug',
          dormantAccounts: 110,
          dormancyRate: 12.0,
          reactivatedAccounts: 12,
          newDormantAccounts: 8
        },
        {
          period: 'Sep',
          dormantAccounts: 114,
          dormancyRate: 12.4,
          reactivatedAccounts: 8,
          newDormantAccounts: 12
        },
        {
          period: 'Oct',
          dormantAccounts: 120,
          dormancyRate: 13.0,
          reactivatedAccounts: 6,
          newDormantAccounts: 16
        },
        {
          period: 'Nov',
          dormantAccounts: 126,
          dormancyRate: 13.6,
          reactivatedAccounts: 8,
          newDormantAccounts: 14
        },
        {
          period: 'Dec',
          dormantAccounts: 118,
          dormancyRate: 12.8,
          reactivatedAccounts: 16,
          newDormantAccounts: 8
        }
      ];
    }
    
    // Make projection if requested
    let predictedDormancyRate = undefined;
    if (input.projectionMonths && input.projectionMonths > 0) {
      // Simple linear projection based on trend
      const trendPoints = dormancyTrends.map(t => parseFloat(t.dormancyRate.toString()));
      if (trendPoints.length >= 3) {
        // Calculate slope of last 3 months
        const n = 3;
        const lastPoints = trendPoints.slice(-n);
        const avg = lastPoints.reduce((a, b) => a + b, 0) / n;
        const slope = (lastPoints[n-1] - lastPoints[0]) / (n-1);
        predictedDormancyRate = avg + (slope * input.projectionMonths);
        predictedDormancyRate = Math.max(0, Math.min(100, predictedDormancyRate)); // Keep in valid range
      }
    }
    
    // Generate recommended actions
    const recommendedActions = [
      'Implement targeted reactivation campaigns for accounts dormant 61-90 days',
      'Review and optimize account onboarding process to increase early account usage',
      'Consider implementing seasonal promotions during periods of high dormancy risk',
      'Review interest rates for competitive positioning'
    ];
    
    // Build the report object
    const report: SavingsDormancyAnalysis = {
      asOfDate: input.asOfDate,
      productId: dormancyData.product_id,
      productName: dormancyData.product_name,
      currencyCode: dormancyData.currency_code || 'USD',
      totalAccounts: parseInt(dormancyData.total_accounts) || 0,
      dormantAccounts: parseInt(dormancyData.dormant_accounts) || 0,
      dormancyRate: parseFloat(dormancyData.dormancy_rate) || 0,
      averageDaysToDormancy: parseInt(dormancyData.avg_days_to_dormancy) || 0,
      reactivationRate: parseFloat(dormancyData.reactivation_rate) || 0,
      atRiskAccounts,
      dormancyTrends,
      demographicAnalysis,
      geographicalAnalysis,
      seasonalPatterns,
      predictedDormancyRate,
      recommendedActions
    };
    
    return {
      success: true,
      report
    };
  } catch (error) {
    logger.error('Error generating savings dormancy analysis report', { error, input });
    return {
      success: false,
      message: `Error generating report: ${error.message}`
    };
  }
}

/**
 * Generates the Savings Interest Distribution Report
 * This report analyzes the distribution of interest across accounts
 */
export async function generateInterestDistributionReport(
  input: InterestDistributionReportInput
): Promise<InterestDistributionReportResponse> {
  try {
    logger.info('Generating savings interest distribution report', { input });
    
    // Get interest distribution data
    const interestQuery = `
      SELECT * FROM fineract_default.view_savings_interest_distribution
      WHERE 1=1
      ${input.productId ? 'AND product_id = $1' : ''}
      AND metric_date <= $${input.productId ? '2' : '1'}
      ORDER BY 
        metric_date DESC, 
        interest_rate_tier ASC
    `;
    
    const interestParams = [];
    if (input.productId) interestParams.push(input.productId);
    interestParams.push(input.asOfDate);
    
    const interestResult = await db.query(interestQuery, interestParams);
    
    if (interestResult.rows.length === 0) {
      return {
        success: false,
        message: 'No interest distribution data found for the specified criteria'
      };
    }
    
    // Get product info
    const productId = input.productId || interestResult.rows[0].product_id;
    const productQuery = `
      SELECT 
        p.id, p.name, p.short_name as "shortName", 
        p.currency_code as "currencyCode",
        (
          SELECT count(*) FROM fineract_default.savings_account 
          WHERE product_id = p.id AND status = 'active'
        ) as total_accounts,
        (
          SELECT sum(account_balance_derived) FROM fineract_default.savings_account 
          WHERE product_id = p.id AND status = 'active'
        ) as total_balance,
        (
          SELECT sum(total_interest_posted_derived) FROM fineract_default.savings_account 
          WHERE product_id = p.id AND status = 'active'
        ) as total_interest_paid
      FROM 
        fineract_default.savings_product p
      WHERE 
        p.id = $1
    `;
    
    const productResult = await db.query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      return {
        success: false,
        message: 'Product information not found'
      };
    }
    
    const productInfo = productResult.rows[0];
    
    // Format interest by rate tier data
    const interestByRateTier: InterestRateTier[] = interestResult.rows.map((row: any) => ({
      tierRate: parseFloat(row.interest_rate_tier) || 0,
      accountCount: parseInt(row.account_count) || 0,
      totalBalance: parseFloat(row.total_balance) || 0,
      totalInterestPaid: parseFloat(row.total_interest_paid) || 0,
      averageInterestPaid: parseFloat(row.average_interest_paid) || 0,
      portfolioPercentage: parseFloat(row.tier_balance_percentage) || 0,
      costPercentage: parseFloat(row.interest_expense_ratio) || 0
    }));
    
    // Get balance tier data
    const balanceTiersQuery = `
      WITH balance_tiers AS (
        SELECT 
          CASE 
            WHEN sa.account_balance_derived BETWEEN 0 AND 1000 THEN '0-1000'
            WHEN sa.account_balance_derived BETWEEN 1001 AND 5000 THEN '1001-5000'
            WHEN sa.account_balance_derived BETWEEN 5001 AND 10000 THEN '5001-10000'
            WHEN sa.account_balance_derived > 10000 THEN '10001+'
            ELSE 'Unknown'
          END as balance_range,
          COUNT(*) as account_count,
          SUM(sa.account_balance_derived) as total_balance,
          SUM(sa.total_interest_posted_derived) as total_interest_paid,
          AVG(sa.account_balance_derived) as average_balance,
          AVG(sa.nominal_annual_interest_rate) as average_interest_rate
        FROM 
          fineract_default.savings_account sa
        WHERE 
          sa.status = 'active'
          ${input.productId ? 'AND sa.product_id = $1' : ''}
        GROUP BY 
          balance_range
        ORDER BY 
          CASE 
            WHEN balance_range = '0-1000' THEN 1
            WHEN balance_range = '1001-5000' THEN 2
            WHEN balance_range = '5001-10000' THEN 3
            WHEN balance_range = '10001+' THEN 4
            ELSE 5
          END
      )
      SELECT * FROM balance_tiers
    `;
    
    const balanceTiersParams = [];
    if (input.productId) balanceTiersParams.push(input.productId);
    
    const balanceTiersResult = await db.query(balanceTiersQuery, balanceTiersParams);
    
    // Format balance tier data
    const interestByBalanceTier: BalanceRangeTier[] = balanceTiersResult.rows.map((row: any) => ({
      range: row.balance_range,
      accountCount: parseInt(row.account_count) || 0,
      totalBalance: parseFloat(row.total_balance) || 0,
      totalInterestPaid: parseFloat(row.total_interest_paid) || 0,
      averageBalance: parseFloat(row.average_balance) || 0,
      averageInterestRate: parseFloat(row.average_interest_rate) || 0
    }));
    
    // Office breakdown if requested
    let interestByOffice = undefined;
    if (input.includeOfficeBreakdown) {
      // This would typically query office breakdowns
      // For demo, we'll use placeholder data
      interestByOffice = [
        {
          officeId: '1',
          officeName: 'Head Office',
          accountCount: 320,
          totalBalance: 1250000,
          totalInterestPaid: 42500,
          averageInterestRate: 3.4,
          costOfFundsRatio: 0.72
        },
        {
          officeId: '2',
          officeName: 'Branch Office 1',
          accountCount: 215,
          totalBalance: 720000,
          totalInterestPaid: 25200,
          averageInterestRate: 3.5,
          costOfFundsRatio: 0.75
        },
        {
          officeId: '3',
          officeName: 'Branch Office 2',
          accountCount: 185,
          totalBalance: 650000,
          totalInterestPaid: 22100,
          averageInterestRate: 3.4,
          costOfFundsRatio: 0.71
        }
      ];
    }
    
    // Interest trends if requested
    let interestTrends = undefined;
    if (input.includeTrends) {
      // In a real implementation, this would query historical data
      // For demo purposes, we'll use placeholder trend data
      interestTrends = [
        {
          period: '2023-01',
          totalInterestPaid: 7520,
          effectiveRate: 3.4,
          costOfFunds: 2.2,
          interestMargin: 1.2
        },
        {
          period: '2023-02',
          totalInterestPaid: 7580,
          effectiveRate: 3.4,
          costOfFunds: 2.2,
          interestMargin: 1.2
        },
        {
          period: '2023-03',
          totalInterestPaid: 7650,
          effectiveRate: 3.4,
          costOfFunds: 2.3,
          interestMargin: 1.1
        },
        {
          period: '2023-04',
          totalInterestPaid: 7830,
          effectiveRate: 3.5,
          costOfFunds: 2.3,
          interestMargin: 1.2
        },
        {
          period: '2023-05',
          totalInterestPaid: 7920,
          effectiveRate: 3.5,
          costOfFunds: 2.3,
          interestMargin: 1.2
        },
        {
          period: '2023-06',
          totalInterestPaid: 8120,
          effectiveRate: 3.6,
          costOfFunds: 2.4,
          interestMargin: 1.2
        }
      ];
    }
    
    // Calculate overall metrics
    const totalAccounts = parseInt(productInfo.total_accounts) || 0;
    const totalBalance = parseFloat(productInfo.total_balance) || 0;
    const totalInterestPaid = parseFloat(productInfo.total_interest_paid) || 0;
    
    // Assume cost of funds is typically 65-75% of interest paid
    const totalCostOfFunds = totalInterestPaid * 0.7;
    const interestMargin = totalInterestPaid - totalCostOfFunds;
    
    // Calculate effective portfolio yield
    const effectivePortfolioYield = totalBalance > 0 ? (totalInterestPaid / totalBalance) * 100 : 0;
    
    // Calculate average interest rate
    const weightedInterestRate = interestByRateTier.reduce(
      (sum, tier) => sum + (tier.tierRate * tier.portfolioPercentage / 100),
      0
    );
    
    // Build the report
    const report: SavingsInterestDistribution = {
      asOfDate: input.asOfDate,
      productId: productInfo.id,
      productName: productInfo.name,
      currencyCode: productInfo.currencyCode,
      totalAccounts,
      totalBalance,
      totalInterestPaid,
      averageInterestRate: weightedInterestRate,
      effectivePortfolioYield,
      totalCostOfFunds,
      interestMargin,
      interestByRateTier,
      interestByBalanceTier,
      interestByOffice,
      interestTrends
    };
    
    return {
      success: true,
      report
    };
  } catch (error) {
    logger.error('Error generating savings interest distribution report', { error, input });
    return {
      success: false,
      message: `Error generating report: ${error.message}`
    };
  }
}

/**
 * Generates the Savings Account Activity Report
 * This report provides detailed transaction patterns and activity metrics
 */
export async function generateAccountActivityReport(
  input: AccountActivityReportInput
): Promise<AccountActivityReportResponse> {
  try {
    logger.info('Generating savings account activity report', { input });
    
    // Build query conditions
    const conditions = [];
    const queryParams = [input.startDate, input.endDate];
    let paramCounter = 3;
    
    if (input.productId) {
      conditions.push(`sa.product_id = $${paramCounter++}`);
      queryParams.push(input.productId);
    }
    
    if (input.clientId) {
      conditions.push(`sa.client_id = $${paramCounter++}`);
      queryParams.push(input.clientId);
    }
    
    if (input.groupId) {
      conditions.push(`sa.group_id = $${paramCounter++}`);
      queryParams.push(input.groupId);
    }
    
    if (input.officeId) {
      conditions.push(`o.id = $${paramCounter++}`);
      queryParams.push(input.officeId);
    }
    
    if (input.status) {
      conditions.push(`sa.status = $${paramCounter++}`);
      queryParams.push(input.status);
    }
    
    if (input.subStatus) {
      conditions.push(`sa.sub_status = $${paramCounter++}`);
      queryParams.push(input.subStatus);
    }
    
    if (input.minBalance !== undefined) {
      conditions.push(`sa.account_balance_derived >= $${paramCounter++}`);
      queryParams.push(input.minBalance);
    }
    
    if (input.maxBalance !== undefined) {
      conditions.push(`sa.account_balance_derived <= $${paramCounter++}`);
      queryParams.push(input.maxBalance);
    }
    
    const whereClause = conditions.length > 0 
      ? `AND ${conditions.join(' AND ')}` 
      : '';
    
    // Build pagination
    const pageSize = input.pageSize || 10;
    const page = input.page || 1;
    const offset = (page - 1) * pageSize;
    
    // Build sorting
    const sortBy = input.sortBy || 'account_no';
    const sortOrder = input.sortOrder || 'ASC';
    
    // Get count of total accounts matching criteria
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM fineract_default.savings_account sa
      LEFT JOIN fineract_default.client c ON sa.client_id = c.id
      LEFT JOIN fineract_default.client_group g ON sa.group_id = g.id
      LEFT JOIN fineract_default.savings_product p ON sa.product_id = p.id
      LEFT JOIN fineract_default.staff st ON sa.field_officer_id = st.id
      LEFT JOIN fineract_default.office o ON st.office_id = o.id
      WHERE 
        sa.status = 'active'
        ${whereClause}
    `;
    
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total_count);
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Get accounts
    const accountsQuery = `
      SELECT 
        sa.id,
        sa.account_no,
        sa.external_id,
        CASE
          WHEN sa.client_id IS NOT NULL THEN c.display_name
          WHEN sa.group_id IS NOT NULL THEN g.name
        END AS account_owner_name,
        sa.client_id,
        sa.group_id,
        sa.product_id,
        p.name AS product_name,
        sa.status,
        sa.sub_status,
        sa.currency_code,
        sa.account_balance_derived,
        sa.field_officer_id,
        st.display_name AS staff_name,
        o.name AS office_name,
        sa.activated_on_date,
        sa.last_active_transaction_date,
        EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(sa.last_active_transaction_date, sa.activated_on_date))) as days_since_activity
      FROM 
        fineract_default.savings_account sa
      LEFT JOIN 
        fineract_default.client c ON sa.client_id = c.id
      LEFT JOIN 
        fineract_default.client_group g ON sa.group_id = g.id
      LEFT JOIN 
        fineract_default.savings_product p ON sa.product_id = p.id
      LEFT JOIN 
        fineract_default.staff st ON sa.field_officer_id = st.id
      LEFT JOIN 
        fineract_default.office o ON st.office_id = o.id
      WHERE 
        sa.status = 'active'
        ${whereClause}
      ORDER BY 
        ${sortBy} ${sortOrder}
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    
    const accountsResult = await db.query(accountsQuery, queryParams);
    
    // Get aggregated metrics
    const aggregatesQuery = `
      SELECT 
        SUM(sa.account_balance_derived) as total_balance,
        AVG(sa.account_balance_derived) as avg_balance,
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN 
          EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(sa.last_active_transaction_date, sa.activated_on_date))) <= 30
          THEN 1 END) as active_accounts,
        COUNT(CASE WHEN 
          EXTRACT(DAY FROM (CURRENT_DATE - COALESCE(sa.last_active_transaction_date, sa.activated_on_date))) > 30
          THEN 1 END) as inactive_accounts
      FROM 
        fineract_default.savings_account sa
      LEFT JOIN 
        fineract_default.client c ON sa.client_id = c.id
      LEFT JOIN 
        fineract_default.client_group g ON sa.group_id = g.id
      LEFT JOIN 
        fineract_default.savings_product p ON sa.product_id = p.id
      LEFT JOIN 
        fineract_default.staff st ON sa.field_officer_id = st.id
      LEFT JOIN 
        fineract_default.office o ON st.office_id = o.id
      WHERE 
        sa.status = 'active'
        ${whereClause}
    `;
    
    const aggregatesResult = await db.query(aggregatesQuery, queryParams);
    const aggregates = aggregatesResult.rows[0];
    
    // Process each account to get detailed activity data
    const accountsWithDetails: SavingsAccountActivity[] = [];
    
    for (const account of accountsResult.rows) {
      // Get detailed activity metrics for this account
      const accountMetricsQuery = `
        WITH transactions AS (
          SELECT 
            transaction_type,
            transaction_date,
            amount,
            running_balance_derived,
            CASE 
              WHEN transaction_type = 'deposit' THEN amount 
              ELSE 0 
            END as deposit_amount,
            CASE 
              WHEN transaction_type = 'withdrawal' THEN amount 
              ELSE 0 
            END as withdrawal_amount,
            CASE 
              WHEN transaction_type = 'interest_posting' THEN amount 
              ELSE 0 
            END as interest_amount,
            CASE 
              WHEN transaction_type IN ('fee_charge', 'penalty_charge', 'withdrawal_fee', 'annual_fee') 
              THEN amount 
              ELSE 0 
            END as fee_amount
          FROM 
            fineract_default.savings_account_transaction
          WHERE 
            savings_account_id = $1
            AND transaction_date BETWEEN $2 AND $3
            AND is_reversed = FALSE
        ),
        daily_balances AS (
          SELECT 
            transaction_date,
            MAX(running_balance_derived) as daily_balance
          FROM 
            transactions
          GROUP BY 
            transaction_date
        )
        SELECT 
          COUNT(*) as transaction_count,
          COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) as deposit_count,
          COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
          SUM(deposit_amount) as total_deposit_amount,
          SUM(withdrawal_amount) as total_withdrawal_amount,
          SUM(interest_amount) as total_interest_earned,
          SUM(fee_amount) as total_fees_charged,
          MAX(running_balance_derived) as max_balance,
          MIN(running_balance_derived) as min_balance,
          AVG(running_balance_derived) as avg_balance,
          STDDEV(running_balance_derived) as balance_volatility,
          COUNT(DISTINCT transaction_date) as active_days,
          EXTRACT(DAY FROM ($3::date - $2::date + 1)) - COUNT(DISTINCT transaction_date) as inactive_days
        FROM 
          transactions
      `;
      
      const accountMetricsResult = await db.query(accountMetricsQuery, [
        account.id, 
        input.startDate, 
        input.endDate
      ]);
      const metrics = accountMetricsResult.rows[0];
      
      // Get transaction patterns
      const transactionPatternsQuery = `
        WITH deposit_stats AS (
          SELECT 
            COUNT(*) as count,
            AVG(amount) as avg_amount,
            MAX(amount) as max_amount,
            MIN(amount) as min_amount,
            MODE() WITHIN GROUP (ORDER BY EXTRACT(DAY FROM transaction_date)) as common_day_of_month,
            MODE() WITHIN GROUP (ORDER BY TO_CHAR(transaction_date, 'Day')) as common_day_of_week
          FROM 
            fineract_default.savings_account_transaction
          WHERE 
            savings_account_id = $1
            AND transaction_type = 'deposit'
            AND transaction_date BETWEEN $2 AND $3
            AND is_reversed = FALSE
        ),
        withdrawal_stats AS (
          SELECT 
            COUNT(*) as count,
            AVG(amount) as avg_amount,
            MAX(amount) as max_amount,
            MIN(amount) as min_amount,
            MODE() WITHIN GROUP (ORDER BY EXTRACT(DAY FROM transaction_date)) as common_day_of_month,
            MODE() WITHIN GROUP (ORDER BY TO_CHAR(transaction_date, 'Day')) as common_day_of_week
          FROM 
            fineract_default.savings_account_transaction
          WHERE 
            savings_account_id = $1
            AND transaction_type = 'withdrawal'
            AND transaction_date BETWEEN $2 AND $3
            AND is_reversed = FALSE
        )
        SELECT 
          d.count as deposit_count,
          d.avg_amount as deposit_avg,
          d.max_amount as deposit_max,
          d.min_amount as deposit_min,
          d.common_day_of_month as deposit_day,
          d.common_day_of_week as deposit_weekday,
          w.count as withdrawal_count,
          w.avg_amount as withdrawal_avg,
          w.max_amount as withdrawal_max,
          w.min_amount as withdrawal_min,
          w.common_day_of_month as withdrawal_day,
          w.common_day_of_week as withdrawal_weekday
        FROM 
          deposit_stats d, withdrawal_stats w
      `;
      
      const patternsResult = await db.query(transactionPatternsQuery, [
        account.id, 
        input.startDate, 
        input.endDate
      ]);
      const patterns = patternsResult.rows[0] || {};
      
      // Get activity trends
      const trendsQuery = `
        WITH monthly_data AS (
          SELECT 
            TO_CHAR(transaction_date, 'YYYY-MM') as month,
            MAX(running_balance_derived) as ending_balance,
            COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) as deposit_count,
            COUNT(CASE WHEN transaction_type = 'withdrawal' THEN 1 END) as withdrawal_count,
            AVG(amount) as avg_amount,
            SUM(CASE 
              WHEN transaction_type = 'deposit' THEN amount 
              WHEN transaction_type = 'withdrawal' THEN -amount
              ELSE 0 
            END) as net_flow
          FROM 
            fineract_default.savings_account_transaction
          WHERE 
            savings_account_id = $1
            AND transaction_date BETWEEN $2 AND $3
            AND is_reversed = FALSE
          GROUP BY 
            TO_CHAR(transaction_date, 'YYYY-MM')
          ORDER BY 
            month
        )
        SELECT * FROM monthly_data
      `;
      
      const trendsResult = await db.query(trendsQuery, [
        account.id, 
        input.startDate, 
        input.endDate
      ]);
      
      // Create transaction patterns
      const transactionPatterns = [
        {
          transactionType: 'deposit',
          frequency: parseFloat(metrics.deposit_count) / 30 || 0, // per month
          averageAmount: parseFloat(patterns.deposit_avg) || 0,
          largestAmount: parseFloat(patterns.deposit_max) || 0,
          smallestAmount: parseFloat(patterns.deposit_min) || 0,
          mostCommonDayOfMonth: parseInt(patterns.deposit_day) || undefined,
          mostCommonDayOfWeek: patterns.deposit_weekday?.trim() || undefined
        },
        {
          transactionType: 'withdrawal',
          frequency: parseFloat(metrics.withdrawal_count) / 30 || 0, // per month
          averageAmount: parseFloat(patterns.withdrawal_avg) || 0,
          largestAmount: parseFloat(patterns.withdrawal_max) || 0,
          smallestAmount: parseFloat(patterns.withdrawal_min) || 0,
          mostCommonDayOfMonth: parseInt(patterns.withdrawal_day) || undefined,
          mostCommonDayOfWeek: patterns.withdrawal_weekday?.trim() || undefined
        }
      ];
      
      // Create activity trends
      const activityTrends = trendsResult.rows.map((row: any) => ({
        period: row.month,
        endingBalance: parseFloat(row.ending_balance) || 0,
        depositFrequency: parseInt(row.deposit_count) || 0,
        withdrawalFrequency: parseInt(row.withdrawal_count) || 0,
        averageTransactionSize: parseFloat(row.avg_amount) || 0,
        netFlow: parseFloat(row.net_flow) || 0
      }));
      
      // Calculate dormancy risk (0-1 scale)
      const daysSinceActivity = parseInt(account.days_since_activity) || 0;
      const dormancyDays = account.days_to_dormancy || 90; // Default to 90 if not set
      const dormancyRisk = Math.min(1, Math.max(0, daysSinceActivity / dormancyDays));
      
      // Create activity metrics
      const activityMetrics = {
        currentBalance: parseFloat(account.account_balance_derived) || 0,
        averageDailyBalance: parseFloat(metrics.avg_balance) || 0,
        minimumBalance: parseFloat(metrics.min_balance) || 0,
        maximumBalance: parseFloat(metrics.max_balance) || 0,
        daysActiveInPeriod: parseInt(metrics.active_days) || 0,
        daysInactive: parseInt(metrics.inactive_days) || 0,
        depositCount: parseInt(metrics.deposit_count) || 0,
        withdrawalCount: parseInt(metrics.withdrawal_count) || 0,
        depositAmount: parseFloat(metrics.total_deposit_amount) || 0,
        withdrawalAmount: parseFloat(metrics.total_withdrawal_amount) || 0,
        netTransactionAmount: parseFloat(metrics.total_deposit_amount || 0) - parseFloat(metrics.total_withdrawal_amount || 0),
        interestEarned: parseFloat(metrics.total_interest_earned) || 0,
        feesCharged: parseFloat(metrics.total_fees_charged) || 0,
        balanceVolatility: parseFloat(metrics.balance_volatility) || 0,
        minimumBalanceBreach: account.enforce_min_required_balance && 
                             (parseFloat(metrics.min_balance) < parseFloat(account.min_required_balance || 0)),
        dormancyRisk
      };
      
      // Create the account activity object
      const accountActivity: SavingsAccountActivity = {
        accountId: account.id,
        accountNumber: account.account_no,
        accountName: account.account_owner_name || '',
        clientId: account.client_id,
        clientName: account.client_id ? account.account_owner_name : undefined,
        groupId: account.group_id,
        groupName: account.group_id ? account.account_owner_name : undefined,
        productId: account.product_id,
        productName: account.product_name,
        currencyCode: account.currency_code,
        status: account.status,
        subStatus: account.sub_status,
        dateRange: {
          fromDate: input.startDate,
          toDate: input.endDate
        },
        activityMetrics,
        transactionPatterns,
        activityTrends,
        isActive: daysSinceActivity <= 30,
        lastActiveDate: account.last_active_transaction_date,
        daysSinceLastActivity: daysSinceActivity
      };
      
      accountsWithDetails.push(accountActivity);
    }
    
    // Create the report
    const report: SavingsAccountActivityReport = {
      reportName: 'Savings Account Activity Report',
      generatedDate: new Date().toISOString(),
      dateRange: {
        fromDate: input.startDate,
        toDate: input.endDate
      },
      totalAccounts: parseInt(aggregates.total_accounts) || 0,
      activeAccounts: parseInt(aggregates.active_accounts) || 0,
      inactiveAccounts: parseInt(aggregates.inactive_accounts) || 0,
      totalBalance: parseFloat(aggregates.total_balance) || 0,
      averageBalance: parseFloat(aggregates.avg_balance) || 0,
      accounts: accountsWithDetails,
      pagination: {
        pageSize,
        pageNumber: page,
        totalRecords: totalCount,
        totalPages
      }
    };
    
    return {
      success: true,
      report
    };
  } catch (error) {
    logger.error('Error generating savings account activity report', { error, input });
    return {
      success: false,
      message: `Error generating report: ${error.message}`
    };
  }
}

/**
 * Generates the Financial Projection Report
 * This report provides projections of future growth and metrics
 */
export async function generateFinancialProjectionReport(
  input: FinancialProjectionReportInput
): Promise<FinancialProjectionReportResponse> {
  try {
    logger.info('Generating savings financial projection report', { input });
    
    // Get product information
    const productQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.short_name as "shortName", 
        p.currency_code
      FROM 
        fineract_default.savings_product p
      WHERE 
        p.id = $1
        AND p.active = true
    `;
    
    const productResult = await db.query(productQuery, [input.productId]);
    
    if (productResult.rows.length === 0) {
      return {
        success: false,
        message: 'Product not found or inactive'
      };
    }
    
    const product = productResult.rows[0];
    
    // Get current metrics for the product
    const metricsQuery = `
      SELECT * FROM fineract_default.view_savings_product_performance
      WHERE product_id = $1
      AND metric_date <= $2
      ORDER BY metric_date DESC
      LIMIT 1
    `;
    
    const metricsResult = await db.query(metricsQuery, [
      input.productId,
      input.asOfDate
    ]);
    
    if (metricsResult.rows.length === 0) {
      return {
        success: false,
        message: 'No metrics found for this product'
      };
    }
    
    const metrics = metricsResult.rows[0];
    
    // Get projection periods - default to standard periods if not provided
    const periods = input.projectionPeriods || ['1M', '3M', '6M', '1Y', '3Y', '5Y'];
    
    // Get financial projections from the database
    const projectionsQuery = `
      SELECT * FROM fineract_default.view_savings_financial_projections
      WHERE product_id = $1
      AND projection_date <= $2
      AND projection_period = ANY($3)
      ORDER BY 
        projection_date DESC,
        CASE 
          WHEN projection_period = '1M' THEN 1
          WHEN projection_period = '3M' THEN 2
          WHEN projection_period = '6M' THEN 3
          WHEN projection_period = '1Y' THEN 4
          WHEN projection_period = '3Y' THEN 5
          WHEN projection_period = '5Y' THEN 6
          ELSE 7
        END ASC
    `;
    
    const projectionsResult = await db.query(projectionsQuery, [
      input.productId,
      input.asOfDate,
      periods
    ]);
    
    // If no projections exist, call the function to generate them
    if (projectionsResult.rows.length === 0) {
      // Generate baseline projections
      await db.query(`
        SELECT fineract_default.generate_savings_financial_projections($1, $2, 'base')
      `, [input.asOfDate, input.productId]);
      
      // Generate optimistic projections if requested
      if (input.includeOptimistic) {
        await db.query(`
          SELECT fineract_default.generate_savings_financial_projections($1, $2, 'optimistic')
        `, [input.asOfDate, input.productId]);
      }
      
      // Generate pessimistic projections if requested
      if (input.includePessimistic) {
        await db.query(`
          SELECT fineract_default.generate_savings_financial_projections($1, $2, 'pessimistic')
        `, [input.asOfDate, input.productId]);
      }
      
      // Query the freshly generated projections
      const freshProjectionsResult = await db.query(projectionsQuery, [
        input.productId,
        input.asOfDate,
        periods
      ]);
      
      projectionsResult.rows = freshProjectionsResult.rows;
    }
    
    // Format the projection periods
    const projectionPeriods: ProjectionPeriod[] = [];
    
    // Group by period
    const projectionsByPeriod: { [key: string]: any[] } = {};
    projectionsResult.rows.forEach((row: any) => {
      const period = row.projection_period;
      if (!projectionsByPeriod[period]) {
        projectionsByPeriod[period] = [];
      }
      projectionsByPeriod[period].push(row);
    });
    
    // Create projection periods
    for (const period in projectionsByPeriod) {
      const baselineProjection = projectionsByPeriod[period].find(
        (p: any) => p.scenario_type === 'base'
      );
      
      const optimisticProjection = projectionsByPeriod[period].find(
        (p: any) => p.scenario_type === 'optimistic'
      );
      
      const pessimisticProjection = projectionsByPeriod[period].find(
        (p: any) => p.scenario_type === 'pessimistic'
      );
      
      // Skip if no baseline projection
      if (!baselineProjection) continue;
      
      // Create projection period
      const projectionPeriod: ProjectionPeriod = {
        period,
        baseline: createScenario(baselineProjection, 'baseline'),
        ...(optimisticProjection && { optimistic: createScenario(optimisticProjection, 'optimistic') }),
        ...(pessimisticProjection && { pessimistic: createScenario(pessimisticProjection, 'pessimistic') })
      };
      
      projectionPeriods.push(projectionPeriod);
    }
    
    // Sort periods in the correct order
    projectionPeriods.sort((a, b) => {
      const order: { [key: string]: number } = {
        '1M': 1, '3M': 2, '6M': 3, '1Y': 4, '3Y': 5, '5Y': 6
      };
      return order[a.period] - order[b.period];
    });
    
    // Create assumptions for the report
    const assumptions: ProjectionAssumption[] = [
      {
        name: 'Interest Rate Trend',
        value: 'stable',
        description: 'Interest rates are expected to remain stable over the projection period',
        impact: 'medium'
      },
      {
        name: 'Market Growth',
        value: '3-5%',
        description: 'The overall market for savings is projected to grow at 3-5% annually',
        impact: 'high'
      },
      {
        name: 'Customer Retention',
        value: `${metrics.customer_retention_rate?.toFixed(1) || '85'}%`,
        description: 'Current retention rate of savings customers',
        impact: 'high'
      },
      {
        name: 'Dormancy Rate',
        value: `${metrics.dormancy_rate?.toFixed(1) || '12'}%`,
        description: 'Percentage of accounts expected to become dormant',
        impact: 'medium'
      },
      {
        name: 'Average Balance Growth',
        value: '4%',
        description: 'Expected annual growth in average balance per account',
        impact: 'high'
      },
      {
        name: 'Competitive Pressure',
        value: 'moderate',
        description: 'Expected level of competition in the savings market',
        impact: 'medium'
      }
    ];
    
    // Apply custom assumptions if provided
    if (input.customAssumptions) {
      // This would override or add custom assumptions
      // For simple demo, we'll skip this
    }
    
    // Create current metrics
    const currentMetrics = {
      totalAccounts: parseInt(metrics.total_accounts) || 0,
      activeAccounts: parseInt(metrics.active_accounts) || 0,
      dormantAccounts: parseInt(metrics.dormant_accounts) || 0,
      totalBalance: parseFloat(metrics.total_balance) || 0,
      averageBalance: parseFloat(metrics.average_balance) || 0,
      totalInterestPaid: parseFloat(metrics.total_interest_paid) || 0,
      totalTransactions: parseInt(metrics.total_transactions) || 0,
      totalDepositValue: parseFloat(metrics.total_deposit_value) || 0,
      totalWithdrawalValue: parseFloat(metrics.total_withdrawal_value) || 0,
      netDepositValue: parseFloat(metrics.net_deposit_value) || 0,
      dormancyRate: parseFloat(metrics.dormancy_rate) || 0,
      averageTransactionSize: parseFloat(metrics.avg_transaction_size) || 0,
      effectiveInterestPercentage: parseFloat(metrics.effective_interest_percentage) || 0
    };
    
    // Generate recommended actions
    const recommendedActions = [
      'Implement targeted marketing to increase average deposit size',
      'Consider promotional rates for high-balance accounts to improve portfolio yield',
      'Develop a dormancy prevention program targeting at-risk accounts',
      'Optimize interest expenses through improved liquidity management',
      'Review fee structure to improve non-interest income'
    ];
    
    // Create financial projection report
    const report: SavingsFinancialProjection = {
      productId: product.id,
      productName: product.name,
      currencyCode: product.currency_code,
      asOfDate: input.asOfDate,
      projectedPeriodsAhead: projectionPeriods,
      currentMetrics,
      assumptions,
      sensitivityAnalysis: {
        interestRateImpact: {
          low: { accountGrowth: '+5%', balanceGrowth: '+7%' },
          medium: { accountGrowth: '+3%', balanceGrowth: '+4%' },
          high: { accountGrowth: '+1%', balanceGrowth: '+2%' }
        },
        marketConditions: {
          improving: { accountGrowth: '+6%', balanceGrowth: '+8%' },
          stable: { accountGrowth: '+3%', balanceGrowth: '+4%' },
          declining: { accountGrowth: '-1%', balanceGrowth: '+1%' }
        }
      },
      recommendedActions
    };
    
    return {
      success: true,
      report
    };
  } catch (error) {
    logger.error('Error generating savings financial projection report', { error, input });
    return {
      success: false,
      message: `Error generating report: ${error.message}`
    };
  }
}

// Helper function to create a scenario from database row
function createScenario(row: any, scenarioType: string): ProjectionScenario {
  return {
    scenarioType,
    accountGrowth: parseInt(row.projected_account_growth) || 0,
    balanceGrowth: parseFloat(row.projected_balance_growth) || 0,
    interestExpense: parseFloat(row.projected_interest_expense) || 0,
    feeIncome: parseFloat(row.projected_fee_income) || 0,
    netIncome: parseFloat(row.projected_fee_income || 0) - parseFloat(row.projected_interest_expense || 0),
    projectedDormancyRate: parseFloat(row.projected_dormancy_rate) || 0,
    projectedAttritionRate: parseFloat(row.projected_attrition_rate) || 0,
    growthRate: parseFloat(row.projected_growth_rate || 0) * 100 || 0,
    confidenceLevel: parseFloat(row.confidence_level) || 0.75
  };
}