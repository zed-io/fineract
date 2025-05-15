import { PeriodFrequencyType } from './loan';

/**
 * Loan repayment strategy determines how payments are allocated
 * to outstanding balances
 */
export enum LoanRepaymentStrategy {
  // Principal, Interest, Penalties, Fees
  PRINCIPAL_INTEREST_PENALTIES_FEES = 'principal_interest_penalties_fees',
  
  // HeavynesS: Principal, Interest, Penalties, Fees
  HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES = 'heaviness_principal_interest_penalties_fees',
  
  // Interest, Principal, Penalties, Fees
  INTEREST_PRINCIPAL_PENALTIES_FEES = 'interest_principal_penalties_fees',
  
  // Principal, Interest, Fees, Penalties
  PRINCIPAL_INTEREST_FEES_PENALTIES = 'principal_interest_fees_penalties',
  
  // Due date: Earliest first
  DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES = 'due_date_principal_interest_penalties_fees',
  
  // Interest, Principal, Fees, Penalties Overdue/Due
  INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE = 'interest_principal_fees_penalties_overdue_due',
  
  // Overdue/Due Interest, Principal, Penalties, Fees
  OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES = 'overdue_due_interest_principal_penalties_fees'
}

/**
 * Loan interest recalculation options
 */
export enum InterestRecalculationCompoundingMethod {
  NONE = 'none',
  INTEREST = 'interest',
  FEE = 'fee',
  INTEREST_AND_FEE = 'interest_and_fee'
}

/**
 * Recalculation compounding frequency
 */
export enum RecalculationCompoundingFrequency {
  SAME_AS_REPAYMENT_PERIOD = 'same_as_repayment_period',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Reschedule strategy options
 */
export enum RescheduleStrategyMethod {
  REDUCE_NUMBER_OF_INSTALLMENTS = 'reduce_number_of_installments',
  REDUCE_EMI_AMOUNT = 'reduce_emi_amount',
  RESCHEDULE_NEXT_REPAYMENTS = 'reschedule_next_repayments'
}

/**
 * Interest recalculation frequency
 */
export enum RecalculationRestFrequency {
  SAME_AS_REPAYMENT_PERIOD = 'same_as_repayment_period',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Loan charge calculation type
 */
export enum LoanChargeCalculationType {
  FLAT = 'flat',
  PERCENT_OF_AMOUNT = 'percent_of_amount',
  PERCENT_OF_AMOUNT_AND_INTEREST = 'percent_of_amount_and_interest',
  PERCENT_OF_INTEREST = 'percent_of_interest',
  PERCENT_OF_DISBURSEMENT_AMOUNT = 'percent_of_disbursement_amount',
  PERCENT_OF_TOTAL_OUTSTANDING = 'percent_of_total_outstanding'
}

/**
 * Loan charge payment mode
 */
export enum LoanChargePaymentMode {
  REGULAR = 'regular',
  ACCOUNT_TRANSFER = 'account_transfer'
}

/**
 * Loan charge time type
 */
export enum LoanChargeTimeType {
  DISBURSEMENT = 'disbursement',
  SPECIFIED_DUE_DATE = 'specified_due_date',
  INSTALLMENT_FEE = 'installment_fee',
  OVERDUE_INSTALLMENT = 'overdue_installment',
  OVERDUE_MATURITY = 'overdue_maturity',
  OVERDUE_ON_LOAN_MATURITY = 'overdue_on_loan_maturity',
  TRANCHE_DISBURSEMENT = 'tranche_disbursement'
}

/**
 * Delinquency classification
 */
export enum DelinquencyClassification {
  NO_DELINQUENCY = 'no_delinquency',
  DELINQUENT_30 = 'delinquent_30',
  DELINQUENT_60 = 'delinquent_60',
  DELINQUENT_90 = 'delinquent_90',
  DELINQUENT_120 = 'delinquent_120',
  DELINQUENT_150 = 'delinquent_150',
  DELINQUENT_180 = 'delinquent_180'
}

/**
 * Write-off strategy
 */
export enum WriteOffStrategy {
  FULL_OUTSTANDING = 'full_outstanding',
  PRINCIPAL_ONLY = 'principal_only',
  PARTIAL_AMOUNT = 'partial_amount'
}

/**
 * Loan interest recalculation configuration
 */
export interface InterestRecalculationConfiguration {
  id?: string;
  loanId?: string;
  interestRecalculationCompoundingMethod: InterestRecalculationCompoundingMethod;
  rescheduleStrategyMethod: RescheduleStrategyMethod;
  recalculationRestFrequencyType: RecalculationRestFrequency;
  recalculationRestFrequencyInterval: number;
  recalculationRestFrequencyDayOfWeek?: number;
  recalculationCompoundingFrequencyType?: RecalculationCompoundingFrequency;
  recalculationCompoundingFrequencyInterval?: number;
  allowCompoundingOnEod?: boolean;
}

/**
 * Interface for loan charge configuration
 */
export interface LoanCharge {
  id?: string;
  loanId?: string;
  chargeId: string;
  name: string;
  amount: number;
  currencyCode: string;
  chargeTimeType: LoanChargeTimeType;
  chargeCalculationType: LoanChargeCalculationType;
  percentage?: number;
  amountPercentageAppliedTo?: number;
  amountWaived?: number;
  amountWrittenOff?: number;
  amountOutstanding?: number;
  amountPaid?: number;
  dueDate?: string;
  isPaid?: boolean;
  isWaived?: boolean;
  isActive?: boolean;
}

/**
 * Restructured loan configuration
 */
export interface LoanRestructureConfiguration {
  id?: string;
  sourceLoanId: string;
  restructureType: 'reschedule' | 'refinance' | 'restructure';
  rescheduleFromDate: string;
  submittedOnDate: string;
  adjustedDueDate?: string;
  graceOnPrincipal?: number;
  graceOnInterest?: number;
  extraTerms?: number;
  newInterestRate?: number;
  interestRateFrequencyType?: PeriodFrequencyType;
  changedEMI?: number;
  reasonForReschedule: string;
  rescheduleReasonComment?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvalDate?: string;
  approvedByUserId?: string;
  interestAccruedTillRescheduledDate?: number;
}

/**
 * Interface for delinquency details
 */
export interface DelinquencyDetails {
  id?: string;
  loanId: string;
  classification: DelinquencyClassification;
  delinquentDays: number;
  delinquentAmount: number;
  delinquentDate: string;
  lastDelinquentDate?: string;
  oldestUnpaidInstallmentDate?: string;
  isActive: boolean;
  previousClassification?: DelinquencyClassification;
  classificationChangedDate?: string;
}

/**
 * Interface for loan write-off details
 */
export interface WriteOffDetails {
  id?: string;
  loanId: string;
  writeOffDate: string;
  writeOffStrategy: WriteOffStrategy;
  writeOffAmount: number;
  writeOffReasonId?: string;
  writeOffReasonComment?: string;
  submittedByUserId: string;
  transactionId?: string;
  outstandingPrincipal: number;
  outstandingInterest: number;
  outstandingFees: number;
  outstandingPenalties: number;
  reference?: string;
}

/**
 * Payment allocation order for a specific component
 */
export interface PaymentAllocationOrder {
  componentType: 'principal' | 'interest' | 'fees' | 'penalties';
  order: number;
}

/**
 * Payment allocation rules based on repayment strategy
 */
export interface PaymentAllocationRules {
  strategy: LoanRepaymentStrategy;
  allocationOrder: PaymentAllocationOrder[];
  dueDateOrderingFlag: boolean;
  isDefault: boolean;
}

/**
 * Interface for loan interest pause period
 */
export interface InterestPausePeriod {
  id?: string;
  loanId: string;
  startDate: string;
  endDate: string;
  reasonId?: string;
  reasonComment?: string;
  isActive: boolean;
  isPeriodActive?: boolean;
  createdByUserId: string;
  createdDate: string;
}

/**
 * Default payment allocation rules for each repayment strategy
 */
export const DEFAULT_PAYMENT_ALLOCATION_RULES: Record<LoanRepaymentStrategy, PaymentAllocationRules> = {
  [LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES]: {
    strategy: LoanRepaymentStrategy.PRINCIPAL_INTEREST_PENALTIES_FEES,
    allocationOrder: [
      { componentType: 'principal', order: 1 },
      { componentType: 'interest', order: 2 },
      { componentType: 'penalties', order: 3 },
      { componentType: 'fees', order: 4 },
    ],
    dueDateOrderingFlag: false,
    isDefault: true
  },
  [LoanRepaymentStrategy.HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES]: {
    strategy: LoanRepaymentStrategy.HEAVINESS_PRINCIPAL_INTEREST_PENALTIES_FEES,
    allocationOrder: [
      { componentType: 'principal', order: 1 },
      { componentType: 'interest', order: 2 },
      { componentType: 'penalties', order: 3 },
      { componentType: 'fees', order: 4 },
    ],
    dueDateOrderingFlag: false,
    isDefault: false
  },
  [LoanRepaymentStrategy.INTEREST_PRINCIPAL_PENALTIES_FEES]: {
    strategy: LoanRepaymentStrategy.INTEREST_PRINCIPAL_PENALTIES_FEES,
    allocationOrder: [
      { componentType: 'interest', order: 1 },
      { componentType: 'principal', order: 2 },
      { componentType: 'penalties', order: 3 },
      { componentType: 'fees', order: 4 },
    ],
    dueDateOrderingFlag: false,
    isDefault: false
  },
  [LoanRepaymentStrategy.PRINCIPAL_INTEREST_FEES_PENALTIES]: {
    strategy: LoanRepaymentStrategy.PRINCIPAL_INTEREST_FEES_PENALTIES,
    allocationOrder: [
      { componentType: 'principal', order: 1 },
      { componentType: 'interest', order: 2 },
      { componentType: 'fees', order: 3 },
      { componentType: 'penalties', order: 4 },
    ],
    dueDateOrderingFlag: false,
    isDefault: false
  },
  [LoanRepaymentStrategy.DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES]: {
    strategy: LoanRepaymentStrategy.DUE_DATE_PRINCIPAL_INTEREST_PENALTIES_FEES,
    allocationOrder: [
      { componentType: 'principal', order: 1 },
      { componentType: 'interest', order: 2 },
      { componentType: 'penalties', order: 3 },
      { componentType: 'fees', order: 4 },
    ],
    dueDateOrderingFlag: true,
    isDefault: false
  },
  [LoanRepaymentStrategy.INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE]: {
    strategy: LoanRepaymentStrategy.INTEREST_PRINCIPAL_FEES_PENALTIES_OVERDUE_DUE,
    allocationOrder: [
      { componentType: 'interest', order: 1 },
      { componentType: 'principal', order: 2 },
      { componentType: 'fees', order: 3 },
      { componentType: 'penalties', order: 4 },
    ],
    dueDateOrderingFlag: true,
    isDefault: false
  },
  [LoanRepaymentStrategy.OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES]: {
    strategy: LoanRepaymentStrategy.OVERDUE_DUE_INTEREST_PRINCIPAL_PENALTIES_FEES,
    allocationOrder: [
      { componentType: 'interest', order: 1 },
      { componentType: 'principal', order: 2 },
      { componentType: 'penalties', order: 3 },
      { componentType: 'fees', order: 4 },
    ],
    dueDateOrderingFlag: true,
    isDefault: false
  }
};