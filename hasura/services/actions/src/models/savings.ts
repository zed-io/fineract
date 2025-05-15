/**
 * Savings account status enums
 */
export enum SavingsAccountStatus {
  SUBMITTED_AND_PENDING_APPROVAL = 'submitted_and_pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  CLOSED = 'closed',
  REJECTED = 'rejected',
  WITHDRAWN_BY_CLIENT = 'withdrawn_by_client',
  DORMANT = 'dormant',
  ESCHEAT = 'escheat'
}

/**
 * Savings account sub-status enums
 */
export enum SavingsAccountSubStatus {
  NONE = 'none',
  INACTIVE = 'inactive',
  DORMANT = 'dormant',
  ESCHEAT = 'escheat',
  BLOCK = 'block',
  BLOCK_CREDIT = 'block_credit',
  BLOCK_DEBIT = 'block_debit'
}

/**
 * Transaction type enums
 */
export enum SavingsTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  INTEREST_POSTING = 'interest_posting',
  FEE_CHARGE = 'fee_charge',
  PENALTY_CHARGE = 'penalty_charge',
  WITHDRAWAL_FEE = 'withdrawal_fee',
  ANNUAL_FEE = 'annual_fee',
  WAIVE_CHARGES = 'waive_charges',
  PAY_CHARGE = 'pay_charge',
  DIVIDEND_PAYOUT = 'dividend_payout'
}

/**
 * Interest compounding period types
 */
export enum InterestCompoundingPeriodType {
  DAILY = 'daily',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual'
}

/**
 * Interest posting period types
 */
export enum InterestPostingPeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  BIANNUAL = 'biannual',
  ANNUAL = 'annual'
}

/**
 * Interest calculation types
 */
export enum InterestCalculationType {
  DAILY_BALANCE = 'daily_balance',
  AVERAGE_DAILY_BALANCE = 'average_daily_balance'
}

/**
 * Savings product interface
 */
export interface SavingsProduct {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits: number;
  nominalAnnualInterestRate: number;
  interestCompoundingPeriodType: InterestCompoundingPeriodType;
  interestPostingPeriodType: InterestPostingPeriodType;
  interestCalculationType: InterestCalculationType;
  interestCalculationDaysInYearType: number;
  minRequiredOpeningBalance?: number;
  depositFeeForTransfer: boolean;
  allowOverdraft: boolean;
  overdraftLimit?: number;
  nominalAnnualInterestRateOverdraft?: number;
  minOverdraftForInterestCalculation?: number;
  enforceMinRequiredBalance: boolean;
  minRequiredBalance?: number;
  minBalanceForInterestCalculation?: number;
  withdrawalFeeTypeEnum?: number;
  withdrawalFeeAmount?: number;
  withdrawalFeeForTransfer: boolean;
  annualFeeAmount?: number;
  annualFeeOnMonth?: number;
  annualFeeOnDay?: number;
  accountingType: string;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  isDormancyTrackingActive: boolean;
  daysToInactive?: number;
  daysToDormancy?: number;
  daysToEscheat?: number;
  active: boolean;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Savings account interface
 */
export interface SavingsAccount {
  id: string;
  accountNo: string;
  externalId?: string;
  clientId?: string;
  groupId?: string;
  productId: string;
  fieldOfficerId?: string;
  status: SavingsAccountStatus;
  subStatus: SavingsAccountSubStatus;
  accountType: string;
  currencyCode: string;
  currencyDigits: number;
  nominalAnnualInterestRate: number;
  interestCompoundingPeriodType: InterestCompoundingPeriodType;
  interestPostingPeriodType: InterestPostingPeriodType;
  interestCalculationType: InterestCalculationType;
  interestCalculationDaysInYearType: number;
  minRequiredOpeningBalance?: number;
  depositFeeForTransfer: boolean;
  allowOverdraft: boolean;
  overdraftLimit?: number;
  nominalAnnualInterestRateOverdraft?: number;
  minOverdraftForInterestCalculation?: number;
  enforceMinRequiredBalance: boolean;
  minRequiredBalance?: number;
  minBalanceForInterestCalculation?: number;
  withdrawalFeeTypeEnum?: number;
  withdrawalFeeAmount?: number;
  withdrawalFeeForTransfer: boolean;
  annualFeeAmount?: number;
  annualFeeOnMonth?: number;
  annualFeeOnDay?: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  isDormancyTrackingActive: boolean;
  daysToInactive?: number;
  daysToDormancy?: number;
  daysToEscheat?: number;
  
  // Account balances
  accountBalanceDerived: number;
  totalDepositsDerived: number;
  totalWithdrawalsDerived: number;
  totalInterestEarnedDerived: number;
  totalInterestPostedDerived: number;
  totalFeeChargeDerived: number;
  totalPenaltyChargeDerived: number;
  totalWithdrawalsFeesDerived: number;
  totalAnnualFeesDerived: number;
  totalOverdraftInterestDerived: number;
  
  // Important dates
  submittedOnDate: string;
  submittedByUserId?: string;
  approvedOnDate?: string;
  approvedByUserId?: string;
  activatedOnDate?: string;
  activatedByUserId?: string;
  closedOnDate?: string;
  closedByUserId?: string;
  lastInterestCalculationDate?: string;
  dormantOnDate?: string;
  escheatOnDate?: string;
  lastActiveTransactionDate?: string;
  
  // Audit fields
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Savings account charge interface
 */
export interface SavingsAccountCharge {
  id: string;
  savingsAccountId: string;
  chargeId: string;
  amount: number;
  amountPaidDerived?: number;
  amountWaivedDerived?: number;
  amountOutstandingDerived?: number;
  calculationPercentage?: number;
  calculationOnAmount?: number;
  chargeTimeEnum: number;
  dueDate?: string;
  feeOnMonth?: number;
  feeOnDay?: number;
  feeInterval?: number;
  isActive: boolean;
  isPenalty: boolean;
  chargeCalculationEnum: number;
  isPaidDerived: boolean;
  waived: boolean;
  createdDate?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Savings account transaction interface
 */
export interface SavingsAccountTransaction {
  id: string;
  savingsAccountId: string;
  paymentDetailId?: string;
  transactionType: SavingsTransactionType;
  transactionDate: string;
  amount: number;
  runningBalanceDerived?: number;
  balanceEndDateDerived?: string;
  balanceNumberOfDaysDerived?: number;
  overdraftAmountDerived?: number;
  createdDate?: string;
  submittedOnDate: string;
  submittedByUserId?: string;
  isReversed: boolean;
  reversedOnDate?: string;
  reversedByUserId?: string;
  createdBy?: string;
  lastModifiedDate?: string;
  lastModifiedBy?: string;
}

/**
 * Daily interest calculation data
 */
export interface DailyInterestCalculation {
  date: string;
  balance: number;
  interestEarned: number;
  cumulativeInterest: number;
}

/**
 * Interest calculation result
 */
export interface InterestCalculationResult {
  savingsAccountId: string;
  fromDate: string;
  toDate: string;
  interestRate: number;
  totalInterestEarned: number;
  dailyCalculations: DailyInterestCalculation[];
  accountBalance: number;
  nextInterestPostingDate?: string;
}

/**
 * Deposit transaction input
 */
export interface DepositTransactionInput {
  accountId: string;
  transactionDate: string;
  transactionAmount: number;
  paymentTypeId?: string;
  note?: string;
  receiptNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  bankNumber?: string;
  accountNumber?: string;
}

/**
 * Withdrawal transaction input
 */
export interface WithdrawalTransactionInput {
  accountId: string;
  transactionDate: string;
  transactionAmount: number;
  paymentTypeId?: string;
  note?: string;
  receiptNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  bankNumber?: string;
  accountNumber?: string;
}

/**
 * Savings account creation input
 */
export interface SavingsAccountCreationInput {
  clientId?: string;
  groupId?: string;
  productId: string;
  fieldOfficerId?: string;
  externalId?: string;
  submittedOnDate: string;
  nominalAnnualInterestRate?: number;
  interestCompoundingPeriodType?: InterestCompoundingPeriodType;
  interestPostingPeriodType?: InterestPostingPeriodType;
  interestCalculationType?: InterestCalculationType;
  interestCalculationDaysInYearType?: number;
  minRequiredOpeningBalance?: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  allowOverdraft?: boolean;
  overdraftLimit?: number;
  enforceMinRequiredBalance?: boolean;
  minRequiredBalance?: number;
  withdrawalFeeForTransfers?: boolean;
  allowInterestChargeForOverdraft?: boolean;
  note?: string;
}

/**
 * Savings account approval input
 */
export interface SavingsAccountApprovalInput {
  accountId: string;
  approvedOnDate: string;
  note?: string;
}

/**
 * Savings account activation input
 */
export interface SavingsAccountActivationInput {
  accountId: string;
  activatedOnDate: string;
  note?: string;
}

/**
 * Interest posting input
 */
export interface InterestPostingInput {
  accountId?: string;
  postingDate: string;
  batchSize?: number;
  isScheduledPosting?: boolean;
}

/**
 * Interest calculation input
 */
export interface InterestCalculationInput {
  accountId: string;
  calculationDate?: string;
}

/**
 * Savings account closure input
 */
export interface SavingsCloseInput {
  accountId: string;
  closedOnDate: string;
  note?: string;
  transferAccountId?: string;
}