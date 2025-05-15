/**
 * Recurring Deposit models for Fineract
 */

import { 
  DepositTermFrequencyType, 
  DepositPeriodFrequencyType, 
  DepositPreclosureInterestType,
  DepositAccountOnClosureType
} from './fixedDeposit';

/**
 * Recurring frequency type
 */
export enum RecurringFrequencyType {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Recurring type
 */
export enum RecurringType {
  MANDATORY = 'mandatory',
  RECOMMENDED = 'recommended',
  CUSTOM = 'custom'
}

/**
 * Recurring deposit status type
 */
export enum RecurringDepositStatusType {
  SUBMITTED_AND_PENDING_APPROVAL = 'submitted_and_pending_approval',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  PREMATURE_CLOSED = 'premature_closed',
  MATURED = 'matured'
}

/**
 * Recurring Deposit Product
 */
export interface RecurringDepositProduct {
  id?: string;
  savingsProductId: string;
  name?: string;
  shortName?: string;
  description?: string;
  currencyCode?: string;
  minDepositTerm: number;
  maxDepositTerm?: number;
  minDepositTermType: DepositTermFrequencyType;
  maxDepositTermType?: DepositTermFrequencyType;
  inMultiplesOfTerm?: number;
  inMultiplesOfTermType?: DepositTermFrequencyType;
  isPrematureClosureAllowed: boolean;
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: DepositPreclosureInterestType;
  minDepositAmount?: number;
  maxDepositAmount?: number;
  recurringFrequency: number;
  recurringFrequencyType: RecurringFrequencyType;
  isMandatory: boolean;
  allowWithdrawal: boolean;
  adjustAdvanceTowardsFuturePayments: boolean;
  isCalendarInherited: boolean;
  interestRate?: number;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Interest Rate Chart
 */
export interface RecurringDepositInterestRateChart {
  id?: string;
  productId: string;
  name: string;
  description?: string;
  fromDate: Date;
  endDate?: Date;
  isPrimaryGroupingByAmount: boolean;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Interest Rate Slab
 */
export interface RecurringDepositInterestRateSlab {
  id?: string;
  interestRateChartId: string;
  description?: string;
  periodType: DepositPeriodFrequencyType;
  fromPeriod: number;
  toPeriod?: number;
  amountRangeFrom?: number;
  amountRangeTo?: number;
  annualInterestRate: number;
  currencyCode: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Account
 */
export interface RecurringDepositAccount {
  id?: string;
  savingsAccountId: string;
  productId: string;
  clientId?: string;
  groupId?: string;
  accountNo?: string;
  externalId?: string;
  status?: RecurringDepositStatusType;
  depositAmount: number;
  maturityAmount?: number;
  maturityDate?: Date;
  depositPeriod: number;
  depositPeriodFrequencyType: DepositPeriodFrequencyType;
  expectedMaturityAmount?: number;
  expectedMaturityDate?: Date;
  interestRate: number;
  isRenewalAllowed: boolean;
  isPrematureClosureAllowed: boolean;
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: DepositPreclosureInterestType;
  totalDeposits?: number;
  interestEarned?: number;
  totalWithdrawals?: number;
  totalWithholdTax?: number;
  onAccountClosureType: DepositAccountOnClosureType;
  transferToSavingsAccountId?: string;
  linkedAccountId?: string;
  transferInterestToLinkedAccount: boolean;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Account Recurring Detail
 */
export interface RecurringDepositAccountRecurringDetail {
  id?: string;
  accountId: string;
  mandatoryRecommendedDepositAmount: number;
  recurringFrequency: number;
  recurringFrequencyType: RecurringFrequencyType;
  isMandatory: boolean;
  allowWithdrawal: boolean;
  adjustAdvanceTowardsFuturePayments: boolean;
  isCalendarInherited: boolean;
  totalOverdueAmount?: number;
  noOfOverdueInstallments?: number;
  expectedFirstDepositOnDate?: Date;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Schedule Installment
 */
export interface RecurringDepositScheduleInstallment {
  id?: string;
  accountId: string;
  installmentNumber: number;
  dueDate: Date;
  depositAmount: number;
  depositAmountCompleted?: number;
  totalPaidInAdvance?: number;
  totalPaidLate?: number;
  completed: boolean;
  obligationsMetOnDate?: Date;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Transaction
 */
export interface RecurringDepositTransaction {
  id?: string;
  savingsAccountTransactionId: string;
  recurringDepositAccountId: string;
  transactionType: string;
  installmentNumber?: number;
  amount: number;
  interestPortion?: number;
  feeChargesPortion?: number;
  penaltyChargesPortion?: number;
  overpaymentPortion?: number;
  balanceAfterTransaction?: number;
  isReversed: boolean;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Account Charge
 */
export interface RecurringDepositAccountCharge {
  id?: string;
  savingsAccountChargeId: string;
  recurringDepositAccountId: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Recurring Deposit Product Creation Request
 */
export interface RecurringDepositProductCreateRequest {
  name: string;
  shortName: string;
  description?: string;
  currencyCode: string;
  currencyDigits?: number;
  minDepositTerm: number;
  maxDepositTerm?: number;
  minDepositTermType: string;
  maxDepositTermType?: string;
  inMultiplesOfTerm?: number;
  inMultiplesOfTermType?: string;
  isPrematureClosureAllowed: boolean;
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: string;
  minDepositAmount?: number;
  maxDepositAmount?: number;
  interestRate: number;
  recurringFrequency: number;
  recurringFrequencyType: string;
  isMandatory: boolean;
  allowWithdrawal: boolean;
  adjustAdvanceTowardsFuturePayments: boolean;
  interestCompoundingPeriodType: string;
  interestPostingPeriodType: string;
  interestCalculationType: string;
  interestCalculationDaysInYearType: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  accountingRule: string;
  charges?: string[];
  charts?: RecurringDepositInterestRateChartCreateRequest[];
}

/**
 * Recurring Deposit Interest Rate Chart Create Request
 */
export interface RecurringDepositInterestRateChartCreateRequest {
  name: string;
  description?: string;
  fromDate: string;
  endDate?: string;
  isPrimaryGroupingByAmount: boolean;
  chartSlabs: RecurringDepositInterestRateSlabCreateRequest[];
}

/**
 * Recurring Deposit Interest Rate Slab Create Request
 */
export interface RecurringDepositInterestRateSlabCreateRequest {
  description?: string;
  periodType: string;
  fromPeriod: number;
  toPeriod?: number;
  amountRangeFrom?: number;
  amountRangeTo?: number;
  annualInterestRate: number;
  currencyCode: string;
}

/**
 * Recurring Deposit Account Create Request
 */
export interface RecurringDepositAccountCreateRequest {
  clientId?: string;
  groupId?: string;
  productId: string;
  submittedOnDate: string;
  fieldOfficerId?: string;
  externalId?: string;
  depositAmount: number;
  depositPeriod: number;
  depositPeriodFrequencyType: string;
  expectedFirstDepositOnDate?: string;
  recurringFrequency?: number;
  recurringFrequencyType?: string;
  isMandatory?: boolean;
  allowWithdrawal?: boolean;
  adjustAdvanceTowardsFuturePayments?: boolean;
  interestRate?: number;
  isRenewalAllowed?: boolean;
  isPrematureClosureAllowed?: boolean;
  linkedAccountId?: string;
  transferInterestToLinkedAccount?: boolean;
  locale?: string;
  charges?: RecurringDepositAccountChargeCreateRequest[];
}

/**
 * Recurring Deposit Account Charge Create Request
 */
export interface RecurringDepositAccountChargeCreateRequest {
  chargeId: string;
  amount: number;
  dueDate?: string;
  feeOnMonthDay?: string;
  feeInterval?: number;
}

/**
 * Recurring Deposit Account Approval Request
 */
export interface RecurringDepositAccountApprovalRequest {
  approvedOnDate: string;
  note?: string;
  locale?: string;
}

/**
 * Recurring Deposit Account Activate Request
 */
export interface RecurringDepositAccountActivateRequest {
  activatedOnDate: string;
  note?: string;
  locale?: string;
}

/**
 * Recurring Deposit Account Deposit Request
 */
export interface RecurringDepositAccountDepositRequest {
  transactionDate: string;
  transactionAmount: number;
  installmentNumber?: number;
  note?: string;
  locale?: string;
  paymentTypeId?: string;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
}

/**
 * Recurring Deposit Account Withdrawal Request
 */
export interface RecurringDepositAccountWithdrawalRequest {
  transactionDate: string;
  transactionAmount: number;
  note?: string;
  locale?: string;
  paymentTypeId?: string;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
}

/**
 * Recurring Deposit Account Premature Close Request
 */
export interface RecurringDepositAccountPrematureCloseRequest {
  closedOnDate: string;
  note?: string;
  locale?: string;
  onAccountClosureType: string;
  toSavingsAccountId?: string;
  transferDescription?: string;
  paymentTypeId?: string;
  accountNumber?: string;
  checkNumber?: string;
  routingCode?: string;
  receiptNumber?: string;
  bankNumber?: string;
}

/**
 * Recurring Deposit Account Maturity Instructions Update Request
 */
export interface RecurringDepositAccountMaturityInstructionsUpdateRequest {
  onAccountClosureType: string;
  transferToSavingsAccountId?: string;
  transferDescription?: string;
  locale?: string;
}

/**
 * Recurring Deposit Product Response
 */
export interface RecurringDepositProductResponse {
  id: string;
  name: string;
  shortName: string;
  description?: string;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
    inMultiplesOf: number;
    displaySymbol: string;
    nameCode: string;
    displayLabel: string;
  };
  recurringFrequency: number;
  recurringFrequencyType: {
    id: number;
    code: string;
    value: string;
  };
  isMandatory: boolean;
  allowWithdrawal: boolean;
  adjustAdvanceTowardsFuturePayments: boolean;
  minDepositTerm: number;
  maxDepositTerm?: number;
  minDepositTermType: {
    id: number;
    code: string;
    value: string;
  };
  maxDepositTermType?: {
    id: number;
    code: string;
    value: string;
  };
  inMultiplesOfTerm?: number;
  inMultiplesOfTermType?: {
    id: number;
    code: string;
    value: string;
  };
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: {
    id: number;
    code: string;
    value: string;
  };
  minDepositAmount?: number;
  maxDepositAmount?: number;
  interestCompoundingPeriodType: {
    id: number;
    code: string;
    value: string;
  };
  interestPostingPeriodType: {
    id: number;
    code: string;
    value: string;
  };
  interestCalculationType: {
    id: number;
    code: string;
    value: string;
  };
  interestCalculationDaysInYearType: {
    id: number;
    code: string;
    value: string;
  };
  accountingRule: {
    id: number;
    code: string;
    value: string;
  };
  charts: RecurringDepositInterestRateChartResponse[];
}

/**
 * Recurring Deposit Interest Rate Chart Response
 */
export interface RecurringDepositInterestRateChartResponse {
  id: string;
  name: string;
  description?: string;
  fromDate: string;
  endDate?: string;
  isPrimaryGroupingByAmount: boolean;
  chartSlabs: RecurringDepositInterestRateSlabResponse[];
}

/**
 * Recurring Deposit Interest Rate Slab Response
 */
export interface RecurringDepositInterestRateSlabResponse {
  id: string;
  description?: string;
  periodType: {
    id: number;
    code: string;
    value: string;
  };
  fromPeriod: number;
  toPeriod?: number;
  amountRangeFrom?: number;
  amountRangeTo?: number;
  annualInterestRate: number;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
    inMultiplesOf: number;
    displaySymbol: string;
    nameCode: string;
    displayLabel: string;
  };
}

/**
 * Recurring Deposit Account Response
 */
export interface RecurringDepositAccountResponse {
  id: string;
  accountNo: string;
  externalId?: string;
  clientId?: string;
  clientName?: string;
  groupId?: string;
  groupName?: string;
  productId: string;
  productName: string;
  fieldOfficerId?: string;
  fieldOfficerName?: string;
  status: {
    id: number;
    code: string;
    value: string;
    submittedAndPendingApproval: boolean;
    approved: boolean;
    rejected: boolean;
    withdrawnByApplicant: boolean;
    active: boolean;
    closed: boolean;
    prematureClosed: boolean;
    transferInProgress: boolean;
    transferOnHold: boolean;
    matured: boolean;
  };
  timeline: {
    submittedOnDate: string;
    submittedByUsername: string;
    submittedByFirstname: string;
    submittedByLastname: string;
    approvedOnDate?: string;
    approvedByUsername?: string;
    approvedByFirstname?: string;
    approvedByLastname?: string;
    activatedOnDate?: string;
    activatedByUsername?: string;
    activatedByFirstname?: string;
    activatedByLastname?: string;
    closedOnDate?: string;
    closedByUsername?: string;
    closedByFirstname?: string;
    closedByLastname?: string;
  };
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
    inMultiplesOf: number;
    displaySymbol: string;
    nameCode: string;
    displayLabel: string;
  };
  interestCompoundingPeriodType: {
    id: number;
    code: string;
    value: string;
  };
  interestPostingPeriodType: {
    id: number;
    code: string;
    value: string;
  };
  interestCalculationType: {
    id: number;
    code: string;
    value: string;
  };
  interestCalculationDaysInYearType: {
    id: number;
    code: string;
    value: string;
  };
  depositAmount: number;
  maturityAmount?: number;
  maturityDate?: string;
  depositPeriod: number;
  depositPeriodFrequencyType: {
    id: number;
    code: string;
    value: string;
  };
  expectedMaturityAmount?: number;
  expectedMaturityDate?: string;
  interestRate: number;
  recurringFrequency: number;
  recurringFrequencyType: {
    id: number;
    code: string;
    value: string;
  };
  isMandatory: boolean;
  allowWithdrawal: boolean;
  adjustAdvanceTowardsFuturePayments: boolean;
  interestEarned?: number;
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: {
    id: number;
    code: string;
    value: string;
  };
  summary: {
    totalDeposits: number;
    totalInterestEarned: number;
    totalWithdrawals: number;
    totalWithholdTax?: number;
    accountBalance: number;
  };
  charges: RecurringDepositAccountChargeResponse[];
  linkedAccount?: {
    id: string;
    accountNo: string;
  };
  transferInterestToLinkedAccount: boolean;
  maturityInstructions: {
    id: number;
    code: string;
    value: string;
  };
  nextDepositDueDate?: string;
  overdueInstallments?: number;
  installments: RecurringDepositScheduleInstallmentResponse[];
  transactions?: RecurringDepositTransactionResponse[];
}

/**
 * Recurring Deposit Account Charge Response
 */
export interface RecurringDepositAccountChargeResponse {
  id: string;
  chargeId: string;
  name: string;
  chargeTimeType: {
    id: number;
    code: string;
    value: string;
  };
  chargeCalculationType: {
    id: number;
    code: string;
    value: string;
  };
  percentage?: number;
  amountPercentageAppliedTo?: number;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
    inMultiplesOf: number;
    displaySymbol: string;
    nameCode: string;
    displayLabel: string;
  };
  amount: number;
  amountPaid?: number;
  amountWaived?: number;
  amountWrittenOff?: number;
  amountOutstanding?: number;
  amountOrPercentage: number;
  penalty: boolean;
  dueDate?: string;
}

/**
 * Recurring Deposit Schedule Installment Response
 */
export interface RecurringDepositScheduleInstallmentResponse {
  id: string;
  installmentNumber: number;
  dueDate: string;
  depositAmount: number;
  depositAmountCompleted?: number;
  totalPaidInAdvance?: number;
  totalPaidLate?: number;
  completed: boolean;
  obligationsMetOnDate?: string;
  daysLate?: number;
  isPaid: boolean;
  isOverdue: boolean;
}

/**
 * Recurring Deposit Transaction Response
 */
export interface RecurringDepositTransactionResponse {
  id: string;
  transactionType: {
    id: number;
    code: string;
    value: string;
    deposit: boolean;
    withdrawal: boolean;
    interestPosting: boolean;
    feeDeduction: boolean;
    initiateTransfer: boolean;
    approveTransfer: boolean;
    withdrawTransfer: boolean;
    rejectTransfer: boolean;
    overdraftInterest: boolean;
    writtenoff: boolean;
    overdraftFee: boolean;
    withholdTax: boolean;
  };
  accountId: string;
  accountNo: string;
  date: string;
  amount: number;
  installmentNumber?: number;
  currency: {
    code: string;
    name: string;
    decimalPlaces: number;
    inMultiplesOf: number;
    displaySymbol: string;
    nameCode: string;
    displayLabel: string;
  };
  paymentDetailData?: {
    id: string;
    paymentType: {
      id: string;
      name: string;
    };
    accountNumber?: string;
    checkNumber?: string;
    routingCode?: string;
    receiptNumber?: string;
    bankNumber?: string;
  };
  runningBalance?: number;
  reversed: boolean;
  submittedOnDate: string;
}

/**
 * Recurring Deposit Product Create Response
 */
export interface RecurringDepositProductCreateResponse {
  productId: string;
}

/**
 * Recurring Deposit Account Create Response
 */
export interface RecurringDepositAccountCreateResponse {
  accountId: string;
}

/**
 * Recurring Deposit Account Approval Response
 */
export interface RecurringDepositAccountApprovalResponse {
  accountId: string;
  savingsAccountId: string;
  approvedOnDate: string;
  expectedMaturityDate: string;
  expectedMaturityAmount: number;
}

/**
 * Recurring Deposit Account Activate Response
 */
export interface RecurringDepositAccountActivateResponse {
  accountId: string;
  savingsAccountId: string;
  activatedOnDate: string;
  nextDepositDueDate: string;
}

/**
 * Recurring Deposit Account Deposit Response
 */
export interface RecurringDepositAccountDepositResponse {
  accountId: string;
  transactionId: string;
  installmentNumber?: number;
  amount: number;
  runningBalance: number;
}

/**
 * Recurring Deposit Account Withdrawal Response
 */
export interface RecurringDepositAccountWithdrawalResponse {
  accountId: string;
  transactionId: string;
  amount: number;
  runningBalance: number;
}

/**
 * Recurring Deposit Account Premature Close Response
 */
export interface RecurringDepositAccountPrematureCloseResponse {
  accountId: string;
  savingsAccountId: string;
  closedOnDate: string;
  totalAmount: number;
  transactionId: string;
}