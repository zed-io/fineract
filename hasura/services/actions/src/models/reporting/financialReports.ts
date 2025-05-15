/**
 * Financial Reports Models
 */

/**
 * Financial statement type
 */
export enum FinancialStatementType {
  INCOME_STATEMENT = 'income_statement',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
  TRIAL_BALANCE = 'trial_balance'
}

/**
 * Financial statement time period
 */
export enum FinancialPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

/**
 * Account type
 */
export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  INCOME = 'income',
  EXPENSE = 'expense'
}

/**
 * Financial statement account
 */
export interface FinancialAccount {
  id: string;
  name: string;
  glCode: string;
  type: AccountType;
  parentId?: string;
  level: number;
  isHeader: boolean;
}

/**
 * Income statement report
 */
export interface IncomeStatementReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  comparativePeriod?: {
    fromDate: string;
    toDate: string;
  };
  generatedOn: string;
  income: IncomeStatementSection;
  expenses: IncomeStatementSection;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    previousTotalIncome?: number;
    previousTotalExpenses?: number;
    previousNetIncome?: number;
    changeInNetIncome?: number;
    changeInNetIncomePercentage?: number;
  };
}

/**
 * Income statement section (income or expenses)
 */
export interface IncomeStatementSection {
  total: number;
  previousTotal?: number;
  change?: number;
  changePercentage?: number;
  categories: IncomeStatementCategory[];
}

/**
 * Income statement category
 */
export interface IncomeStatementCategory {
  id: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
  accounts: IncomeStatementAccount[];
}

/**
 * Income statement account
 */
export interface IncomeStatementAccount {
  id: string;
  name: string;
  glCode: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Balance sheet report
 */
export interface BalanceSheetReport {
  reportName: string;
  currency: string;
  asOfDate: string;
  comparativeDate?: string;
  generatedOn: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    previousTotalAssets?: number;
    previousTotalLiabilities?: number;
    previousTotalEquity?: number;
  };
}

/**
 * Balance sheet section (assets, liabilities, equity)
 */
export interface BalanceSheetSection {
  total: number;
  previousTotal?: number;
  change?: number;
  changePercentage?: number;
  categories: BalanceSheetCategory[];
}

/**
 * Balance sheet category
 */
export interface BalanceSheetCategory {
  id: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
  accounts: BalanceSheetAccount[];
}

/**
 * Balance sheet account
 */
export interface BalanceSheetAccount {
  id: string;
  name: string;
  glCode: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Cash flow statement report
 */
export interface CashFlowReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  comparativePeriod?: {
    fromDate: string;
    toDate: string;
  };
  generatedOn: string;
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  summary: {
    netCashFromOperating: number;
    netCashFromInvesting: number;
    netCashFromFinancing: number;
    netIncreaseInCash: number;
    beginningCashBalance: number;
    endingCashBalance: number;
    previousNetIncreaseInCash?: number;
  };
}

/**
 * Cash flow section
 */
export interface CashFlowSection {
  total: number;
  previousTotal?: number;
  change?: number;
  changePercentage?: number;
  items: CashFlowItem[];
}

/**
 * Cash flow item
 */
export interface CashFlowItem {
  id: string;
  name: string;
  amount: number;
  previousAmount?: number;
  change?: number;
  changePercentage?: number;
}

/**
 * Trial balance report
 */
export interface TrialBalanceReport {
  reportName: string;
  currency: string;
  asOfDate: string;
  generatedOn: string;
  accounts: TrialBalanceAccount[];
  summary: {
    totalDebits: number;
    totalCredits: number;
  };
}

/**
 * Trial balance account
 */
export interface TrialBalanceAccount {
  id: string;
  name: string;
  glCode: string;
  type: AccountType;
  debit: number;
  credit: number;
}

/**
 * General ledger report
 */
export interface GeneralLedgerReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  generatedOn: string;
  accounts: GeneralLedgerAccount[];
}

/**
 * General ledger account
 */
export interface GeneralLedgerAccount {
  id: string;
  name: string;
  glCode: string;
  type: AccountType;
  openingBalance: number;
  closingBalance: number;
  entries: GeneralLedgerEntry[];
}

/**
 * General ledger entry
 */
export interface GeneralLedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  transactionId: string;
  transactionType: string;
  officeId: string;
  officeName: string;
}

/**
 * Journal entry report
 */
export interface JournalEntryReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  generatedOn: string;
  entries: JournalEntry[];
}

/**
 * Journal entry
 */
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  createdByUserId: string;
  createdByUsername: string;
  transactionId: string;
  transactionType: string;
  officeId: string;
  officeName: string;
  glEntries: JournalGLEntry[];
}

/**
 * Journal GL entry
 */
export interface JournalGLEntry {
  accountId: string;
  accountName: string;
  glCode: string;
  debit: number;
  credit: number;
}

/**
 * Interest income report
 */
export interface InterestIncomeReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  generatedOn: string;
  totalInterestIncome: number;
  accrualBaseInterest: number;
  cashBaseInterest: number;
  interestByProduct: {
    productId: string;
    productName: string;
    interestIncome: number;
    outstandingPrincipal: number;
    averageRate: number;
    portfolioPercentage: number;
  }[];
  interestByBranch: {
    branchId: string;
    branchName: string;
    interestIncome: number;
    outstandingPrincipal: number;
    portfolioPercentage: number;
  }[];
  interestByLoanOfficer: {
    loanOfficerId: string;
    loanOfficerName: string;
    interestIncome: number;
    outstandingPrincipal: number;
    portfolioPercentage: number;
  }[];
  interestTrend: {
    period: string;
    accrued: number;
    collected: number;
  }[];
}

/**
 * Fee income report
 */
export interface FeeIncomeReport {
  reportName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  generatedOn: string;
  totalFeeIncome: number;
  feesByType: {
    feeTypeId: string;
    feeTypeName: string;
    amount: number;
    percentage: number;
  }[];
  feesByProduct: {
    productId: string;
    productName: string;
    amount: number;
    percentage: number;
  }[];
  feesByBranch: {
    branchId: string;
    branchName: string;
    amount: number;
    percentage: number;
  }[];
  feesByLoanOfficer: {
    loanOfficerId: string;
    loanOfficerName: string;
    amount: number;
    percentage: number;
  }[];
  feeTrend: {
    period: string;
    amount: number;
  }[];
}

/**
 * Financial indicator ratios
 */
export interface FinancialRatiosReport {
  reportName: string;
  asOfDate: string;
  generatedOn: string;
  profitabilityRatios: {
    returnOnAssets: number;
    returnOnEquity: number;
    operationalSelfSufficiency: number;
    financialSelfSufficiency: number;
    profitMargin: number;
    yieldOnGrossPortfolio: number;
    portfolioToAssets: number;
    costPerClient: number;
  };
  assetQualityRatios: {
    portfolioAtRisk30: number;
    portfolioAtRisk90: number;
    writeOffRatio: number;
    riskCoverageRatio: number;
    loanLossReserveRatio: number;
  };
  financialStructureRatios: {
    debtToEquityRatio: number;
    debtToAssetRatio: number;
    equityToAssetRatio: number;
    capitalAdequacyRatio: number;
  };
  liquidityRatios: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  efficiencyRatios: {
    operatingExpenseRatio: number;
    costToIncomeRatio: number;
    personnelExpenseRatio: number;
    administrativeExpenseRatio: number;
    loanOfficerProductivity: number;
    staffProductivity: number;
  };
  growthRatios: {
    assetGrowth: number;
    loanPortfolioGrowth: number;
    clientGrowth: number;
    revenueGrowth: number;
  };
}