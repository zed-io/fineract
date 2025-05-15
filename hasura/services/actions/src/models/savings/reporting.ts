/**
 * Models for Savings Reporting Module
 * Contains type definitions for all savings report models
 */

export interface ReportDateRange {
  fromDate: string;
  toDate: string;
}

export interface ReportPagination {
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
  totalPages: number;
}

// Product Performance Report
export interface ProductPerformanceMetrics {
  totalAccounts: number;
  activeAccounts: number;
  dormantAccounts: number;
  totalBalance: number;
  averageBalance: number;
  totalInterestPaid: number;
  totalTransactions: number;
  totalDepositValue: number;
  totalWithdrawalValue: number;
  netDepositValue: number;
  averageLifetimeMonths?: number;
  customerRetentionRate?: number;
  dormancyRate: number;
  averageTransactionSize: number;
  effectiveInterestPercentage: number;
  profitMargin?: number;
}

export interface ProductPerformanceTrend {
  period: string;
  totalAccounts: number;
  activeAccounts: number;
  dormantAccounts: number;
  totalBalance: number;
  netFlows: number;
  interestPaid: number;
}

export interface ProductComparisonMetric {
  metricName: string;
  metricValue: number;
  industryAverage?: number;
  percentileRank?: number;
  trend: string; // "increasing", "decreasing", "stable"
}

export interface SavingsProductPerformance {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  interestRate: number;
  currentMetrics: ProductPerformanceMetrics;
  historicalTrends: ProductPerformanceTrend[];
  comparisonMetrics: ProductComparisonMetric[];
}

export interface ProductPerformanceReportInput {
  startDate: string;
  endDate: string;
  productId?: string;
  currencyCode?: string;
  includeTrends?: boolean;
  includeComparison?: boolean;
}

export interface ProductPerformanceReportResponse {
  success: boolean;
  generatedDate: string;
  dateRange: ReportDateRange;
  currencyCode: string;
  products: SavingsProductPerformance[];
  message?: string;
}

// Dormancy Analysis Report
export interface DormancyRiskBand {
  daysInactive: string; // "30-60", "61-90", "90+"
  accountCount: number;
  totalBalance: number;
  percentageOfAccounts: number;
  percentageOfPortfolio: number;
}

export interface DormancyTrend {
  period: string;
  dormantAccounts: number;
  dormancyRate: number;
  reactivatedAccounts: number;
  newDormantAccounts: number;
}

export interface DormancyDemographic {
  demographicType: string; // "age", "gender", "income_level", "occupation"
  segment: string;
  accountCount: number;
  dormancyRate: number;
  averageDaysToDormancy: number;
}

export interface GeographicalDormancyPattern {
  region: string;
  accountCount: number;
  dormantAccounts: number;
  dormancyRate: number;
  riskScore: number;
}

export interface SavingsDormancyAnalysis {
  asOfDate: string;
  productId?: string;
  productName?: string;
  currencyCode: string;
  totalAccounts: number;
  dormantAccounts: number;
  dormancyRate: number;
  averageDaysToDormancy: number;
  reactivationRate: number;
  atRiskAccounts: DormancyRiskBand[];
  dormancyTrends: DormancyTrend[];
  demographicAnalysis?: DormancyDemographic[];
  geographicalAnalysis?: GeographicalDormancyPattern[];
  seasonalPatterns?: DormancyTrend[];
  predictedDormancyRate?: number;
  recommendedActions?: string[];
}

export interface DormancyAnalysisReportInput {
  asOfDate: string;
  productId?: string;
  riskThresholdDays: number;
  includeGeographical?: boolean;
  includeDemographic?: boolean;
  includeSeasonalAnalysis?: boolean;
  projectionMonths?: number;
}

export interface DormancyAnalysisReportResponse {
  success: boolean;
  report?: SavingsDormancyAnalysis;
  message?: string;
}

// Interest Distribution Report
export interface InterestRateTier {
  tierRate: number;
  accountCount: number;
  totalBalance: number;
  totalInterestPaid: number;
  averageInterestPaid: number;
  portfolioPercentage: number;
  costPercentage: number;
}

export interface BalanceRangeTier {
  range: string; // "0-1000", "1001-5000", etc.
  accountCount: number;
  totalBalance: number;
  totalInterestPaid: number;
  averageBalance: number;
  averageInterestRate: number;
}

export interface InterestDistributionByOffice {
  officeId: string;
  officeName: string;
  accountCount: number;
  totalBalance: number;
  totalInterestPaid: number;
  averageInterestRate: number;
  costOfFundsRatio: number;
}

export interface InterestPaymentTrend {
  period: string;
  totalInterestPaid: number;
  effectiveRate: number;
  costOfFunds: number;
  interestMargin: number;
}

export interface SavingsInterestDistribution {
  asOfDate: string;
  productId?: string;
  productName?: string;
  currencyCode: string;
  totalAccounts: number;
  totalBalance: number;
  totalInterestPaid: number;
  averageInterestRate: number;
  effectivePortfolioYield: number;
  totalCostOfFunds: number;
  interestMargin: number;
  interestByRateTier: InterestRateTier[];
  interestByBalanceTier: BalanceRangeTier[];
  interestByOffice?: InterestDistributionByOffice[];
  interestTrends?: InterestPaymentTrend[];
}

export interface InterestDistributionReportInput {
  asOfDate: string;
  productId?: string;
  includeOfficeBreakdown?: boolean;
  includeTrends?: boolean;
  monthsForTrend?: number;
}

export interface InterestDistributionReportResponse {
  success: boolean;
  report?: SavingsInterestDistribution;
  message?: string;
}

// Account Activity Report
export interface TransactionPattern {
  transactionType: string;
  frequency: number; // average transactions per month
  averageAmount: number;
  largestAmount: number;
  smallestAmount: number;
  mostCommonDayOfMonth?: number;
  mostCommonDayOfWeek?: string;
}

export interface AccountActivityMetrics {
  currentBalance: number;
  averageDailyBalance: number;
  minimumBalance: number;
  maximumBalance: number;
  daysActiveInPeriod: number;
  daysInactive: number;
  depositCount: number;
  withdrawalCount: number;
  depositAmount: number;
  withdrawalAmount: number;
  netTransactionAmount: number;
  interestEarned: number;
  feesCharged: number;
  balanceVolatility: number;
  minimumBalanceBreach: boolean;
  dormancyRisk: number; // 0 to 1 scale
}

export interface AccountActivityTrend {
  period: string;
  endingBalance: number;
  depositFrequency: number;
  withdrawalFrequency: number;
  averageTransactionSize: number;
  netFlow: number;
}

export interface SavingsAccountActivity {
  accountId: string;
  accountNumber: string;
  accountName: string;
  clientId?: string;
  clientName?: string;
  groupId?: string;
  groupName?: string;
  productId: string;
  productName: string;
  currencyCode: string;
  status: string;
  subStatus: string;
  dateRange: ReportDateRange;
  activityMetrics: AccountActivityMetrics;
  transactionPatterns: TransactionPattern[];
  activityTrends: AccountActivityTrend[];
  isActive: boolean;
  lastActiveDate?: string;
  daysSinceLastActivity?: number;
}

export interface SavingsAccountActivityReport {
  reportName: string;
  generatedDate: string;
  dateRange: ReportDateRange;
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  totalBalance: number;
  averageBalance: number;
  accounts: SavingsAccountActivity[];
  pagination?: ReportPagination;
}

export interface AccountActivityReportInput {
  startDate: string;
  endDate: string;
  productId?: string;
  clientId?: string;
  groupId?: string;
  officeId?: string;
  status?: string;
  subStatus?: string;
  minBalance?: number;
  maxBalance?: number;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface AccountActivityReportResponse {
  success: boolean;
  report?: SavingsAccountActivityReport;
  message?: string;
}

// Financial Projection Report
export interface ProjectionScenario {
  scenarioType: string; // "baseline", "optimistic", "pessimistic"
  accountGrowth: number;
  balanceGrowth: number;
  interestExpense: number;
  feeIncome: number;
  netIncome: number;
  projectedDormancyRate: number;
  projectedAttritionRate: number;
  growthRate: number;
  confidenceLevel: number;
}

export interface ProjectionPeriod {
  period: string; // "1M", "3M", "6M", "1Y", "3Y", "5Y"
  baseline: ProjectionScenario;
  optimistic?: ProjectionScenario;
  pessimistic?: ProjectionScenario;
}

export interface ProjectionAssumption {
  name: string;
  value: string;
  description?: string;
  impact?: string; // "high", "medium", "low"
}

export interface SavingsFinancialProjection {
  productId: string;
  productName: string;
  currencyCode: string;
  asOfDate: string;
  projectedPeriodsAhead: ProjectionPeriod[];
  currentMetrics: ProductPerformanceMetrics;
  assumptions: ProjectionAssumption[];
  sensitivityAnalysis?: any;
  recommendedActions?: string[];
}

export interface FinancialProjectionReportInput {
  asOfDate: string;
  productId: string;
  includeOptimistic?: boolean;
  includePessimistic?: boolean;
  customAssumptions?: any;
  projectionPeriods?: string[];
}

export interface FinancialProjectionReportResponse {
  success: boolean;
  report?: SavingsFinancialProjection;
  message?: string;
}