import { 
  ReportCategory,
  ReportType,
  ParameterType,
  AggregationMethod,
  SortDirection 
} from './report';

/**
 * Portfolio at Risk (PAR) Report model
 * Shows outstanding loan amounts at different levels of risk
 */
export interface PortfolioAtRiskReport {
  asOfDate: string;
  currency: string;
  totalOutstanding: number;
  parBrackets: ParBracket[];
  parByLoanOfficer?: ParByLoanOfficer[];
  parByBranch?: ParByBranch[];
  parByProduct?: ParByProduct[];
  parRatio: number; // Overall PAR ratio
}

/**
 * PAR bracket showing aging of overdue loans
 */
export interface ParBracket {
  name: string; // e.g., "1-30 days", "31-60 days"
  daysOverdueFrom: number;
  daysOverdueTo: number | null; // null means infinity (> X days)
  outstandingAmount: number;
  numberOfLoans: number;
  percentOfPortfolio: number;
}

/**
 * PAR breakdown by loan officer
 */
export interface ParByLoanOfficer {
  loanOfficerId: string;
  loanOfficerName: string;
  totalOutstanding: number;
  portfolioAtRisk: number;
  parRatio: number;
  parBrackets: {
    name: string;
    amount: number;
    ratio: number;
  }[];
}

/**
 * PAR breakdown by branch
 */
export interface ParByBranch {
  branchId: string;
  branchName: string;
  totalOutstanding: number;
  portfolioAtRisk: number;
  parRatio: number;
  parBrackets: {
    name: string;
    amount: number;
    ratio: number;
  }[];
}

/**
 * PAR breakdown by loan product
 */
export interface ParByProduct {
  productId: string;
  productName: string;
  totalOutstanding: number;
  portfolioAtRisk: number;
  parRatio: number;
  parBrackets: {
    name: string;
    amount: number;
    ratio: number;
  }[];
}

/**
 * Aging of outstanding loans report
 */
export interface AgeOutstandingReport {
  asOfDate: string;
  currency: string;
  totalOutstanding: number;
  totalPrincipalOutstanding: number;
  totalInterestOutstanding: number;
  totalFeesOutstanding: number;
  totalPenaltiesOutstanding: number;
  agingBrackets: AgingBracket[];
}

/**
 * Aging bracket for outstanding loans
 */
export interface AgingBracket {
  name: string; // e.g., "Current", "1-30 days", "31-60 days"
  daysOverdueFrom: number;
  daysOverdueTo: number | null;
  outstandingAmount: number;
  principalOutstanding: number;
  interestOutstanding: number;
  feesOutstanding: number;
  penaltiesOutstanding: number;
  numberOfLoans: number;
  percentOfPortfolio: number;
}

/**
 * Collection report showing expected vs actual
 */
export interface CollectionReport {
  fromDate: string;
  toDate: string;
  currency: string;
  expected: {
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
  };
  actual: {
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
  };
  variance: {
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
  };
  collectionRatio: number; // Actual/Expected
  collectionsByDay?: {
    date: string;
    expected: number;
    actual: number;
    ratio: number;
  }[];
  collectionsByProduct?: {
    productId: string;
    productName: string;
    expected: number;
    actual: number;
    ratio: number;
  }[];
  collectionsByLoanOfficer?: {
    loanOfficerId: string;
    loanOfficerName: string;
    expected: number;
    actual: number;
    ratio: number;
  }[];
}

/**
 * Loan portfolio summary
 */
export interface LoanPortfolioSummary {
  asOfDate: string;
  currency: string;
  activeLoanCount: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalPrincipalOutstanding: number;
  totalInterestOutstanding: number;
  totalFeesOutstanding: number;
  totalPenaltiesOutstanding: number;
  overdueLoanCount: number;
  overdueAmount: number;
  overdueRatio: number;
  portfolioByStatus: {
    status: string;
    count: number;
    outstanding: number;
    percentByCount: number;
    percentByAmount: number;
  }[];
  portfolioByProduct: {
    productId: string;
    productName: string;
    count: number;
    outstanding: number;
    percentByCount: number;
    percentByAmount: number;
  }[];
  portfolioByBranch: {
    branchId: string;
    branchName: string;
    count: number;
    outstanding: number;
    percentByCount: number;
    percentByAmount: number;
  }[];
  disbursementTrends: {
    period: string;
    count: number;
    amount: number;
  }[];
  repaymentTrends: {
    period: string;
    expected: number;
    actual: number;
    ratio: number;
  }[];
}

/**
 * Loan status distribution
 */
export interface LoanStatusDistribution {
  statusCode: string;
  statusName: string;
  count: number;
  amount: number;
  percentage: number;
}

/**
 * Product performance report
 */
export interface ProductPerformanceReport {
  asOfDate: string;
  currency: string;
  products: ProductPerformance[];
}

/**
 * Individual product performance
 */
export interface ProductPerformance {
  productId: string;
  productName: string;
  activeLoanCount: number;
  totalDisbursed: number;
  totalOutstanding: number;
  avgLoanSize: number;
  interestIncome: number;
  feeIncome: number;
  penaltyIncome: number;
  totalIncome: number;
  interestRate: number;
  parRatio: number;
  writeOffRatio: number;
  yieldOnPortfolio: number;
}

/**
 * Expected repayments report
 */
export interface ExpectedRepaymentsReport {
  fromDate: string;
  toDate: string;
  currency: string;
  totalExpected: number;
  repaymentSchedule: {
    date: string;
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
    runningTotal: number;
    loanCount: number;
  }[];
  repaymentsByLoanOfficer: {
    loanOfficerId: string;
    loanOfficerName: string;
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
    loanCount: number;
  }[];
  repaymentsByBranch: {
    branchId: string;
    branchName: string;
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
    loanCount: number;
  }[];
  repaymentsByProduct: {
    productId: string;
    productName: string;
    principal: number;
    interest: number;
    fees: number;
    penalties: number;
    total: number;
    loanCount: number;
  }[];
}

/**
 * Loan closing report
 */
export interface LoanClosingReport {
  fromDate: string;
  toDate: string;
  currency: string;
  totalLoansCompleted: number;
  totalLoansWrittenOff: number;
  totalLoansRescheduled: number;
  totalLoansRefinanced: number;
  closingDetails: {
    loanId: string;
    accountNumber: string;
    clientId: string;
    clientName: string;
    loanOfficerId: string;
    loanOfficerName: string;
    productId: string;
    productName: string;
    disbursedAmount: number;
    disbursedDate: string;
    closedDate: string;
    closureType: 'completed' | 'written_off' | 'rescheduled' | 'refinanced';
    daysToClose: number;
    interestIncome: number;
    feeIncome: number;
    penaltyIncome: number;
    totalIncome: number;
    writeOffAmount?: number;
  }[];
}

/**
 * Portfolio quality indicators
 */
export interface PortfolioQualityReport {
  asOfDate: string;
  currency: string;
  parRatio: number;
  writeOffRatio: number;
  restructuredRatio: number;
  nonPerformingLoanRatio: number;
  riskCoverage: number;
  provisioning: {
    riskCategory: string;
    daysOverdueFrom: number;
    daysOverdueTo: number | null;
    outstandingAmount: number;
    provisioningRate: number;
    provisioningAmount: number;
  }[];
  qualityTrends: {
    period: string;
    parRatio: number;
    writeOffRatio: number;
    restructuredRatio: number;
    nonPerformingLoanRatio: number;
  }[];
}

/**
 * Rejected loans report
 */
export interface RejectedLoansReport {
  fromDate: string;
  toDate: string;
  totalRejected: number;
  rejectedByReason: {
    reasonId: string;
    reasonName: string;
    count: number;
    percentage: number;
  }[];
  rejectedByLoanOfficer: {
    loanOfficerId: string;
    loanOfficerName: string;
    count: number;
    percentage: number;
  }[];
  rejectedByProduct: {
    productId: string;
    productName: string;
    count: number;
    percentage: number;
  }[];
  rejectedDetails: {
    loanId: string;
    clientId: string;
    clientName: string;
    productId: string;
    productName: string;
    appliedAmount: number;
    appliedDate: string;
    rejectedDate: string;
    rejectedById: string;
    rejectedByName: string;
    rejectionReason: string;
  }[];
}