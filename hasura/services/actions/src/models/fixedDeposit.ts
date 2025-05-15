/**
 * Fixed Deposit models for Fineract
 */

/**
 * Deposit term frequency type
 */
export enum DepositTermFrequencyType {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Deposit period frequency type
 */
export enum DepositPeriodFrequencyType {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Pre-closure interest type
 */
export enum DepositPreclosureInterestType {
  WHOLE_TERM = 'whole_term',
  TILL_PRECLOSURE_DATE = 'till_preclosure_date'
}

/**
 * Account on closure type
 */
export enum DepositAccountOnClosureType {
  WITHDRAW_DEPOSIT = 'withdraw_deposit',
  TRANSFER_TO_SAVINGS = 'transfer_to_savings',
  REINVEST = 'reinvest',
  TRANSFER_TO_LINKED_ACCOUNT = 'transfer_to_linked_account'
}

/**
 * Fixed Deposit Product
 */
export interface FixedDepositProduct {
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
  depositAmount?: number;
  maxDepositAmount?: number;
  interestRate?: number;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Fixed Deposit Interest Rate Chart
 */
export interface FixedDepositInterestRateChart {
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
 * Fixed Deposit Interest Rate Slab
 */
export interface FixedDepositInterestRateSlab {
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
 * Fixed Deposit Account
 */
export interface FixedDepositAccount {
  id?: string;
  savingsAccountId: string;
  productId: string;
  clientId?: string;
  groupId?: string;
  accountNo?: string;
  externalId?: string;
  status?: string;
  depositAmount: number;
  maturityAmount?: number;
  maturityDate?: Date;
  depositPeriod: number;
  depositPeriodFrequencyType: DepositPeriodFrequencyType;
  interestRate: number;
  isRenewalAllowed: boolean;
  isPrematureClosureAllowed: boolean;
  preClosurePenalApplicable: boolean;
  preClosurePenalInterest?: number;
  preClosurePenalInterestOnType?: DepositPreclosureInterestType;
  interestEarned?: number;
  totalWithdrawals?: number;
  totalWithholdTax?: number;
  nextMaturityDate?: Date;
  onAccountClosureType: DepositAccountOnClosureType;
  transferToSavingsAccountId?: string;
  linkedAccountId?: string;
  transferInterestToLinkedAccount: boolean;
  expectedFirstdepositOnDate?: Date;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Fixed Deposit Transaction
 */
export interface FixedDepositTransaction {
  id?: string;
  savingsAccountTransactionId: string;
  fixedDepositAccountId: string;
  transactionType: string;
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
 * Fixed Deposit Account Charge
 */
export interface FixedDepositAccountCharge {
  id?: string;
  savingsAccountChargeId: string;
  fixedDepositAccountId: string;
  createdDate?: Date;
  createdBy?: string;
  lastModifiedDate?: Date;
  lastModifiedBy?: string;
}

/**
 * Fixed Deposit Product Creation Request
 */
export interface FixedDepositProductCreateRequest {
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
  depositAmount?: number;
  maxDepositAmount?: number;
  interestRate: number;
  interestCompoundingPeriodType: string;
  interestPostingPeriodType: string;
  interestCalculationType: string;
  interestCalculationDaysInYearType: number;
  lockinPeriodFrequency?: number;
  lockinPeriodFrequencyType?: string;
  accountingRule: string;
  charges?: string[];
  charts?: FixedDepositInterestRateChartCreateRequest[];
}

/**
 * Fixed Deposit Interest Rate Chart Create Request
 */
export interface FixedDepositInterestRateChartCreateRequest {
  name: string;
  description?: string;
  fromDate: string;
  endDate?: string;
  isPrimaryGroupingByAmount: boolean;
  chartSlabs: FixedDepositInterestRateSlabCreateRequest[];
}

/**
 * Fixed Deposit Interest Rate Slab Create Request
 */
export interface FixedDepositInterestRateSlabCreateRequest {
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
 * Fixed Deposit Account Create Request
 */
export interface FixedDepositAccountCreateRequest {
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
  interestRate?: number;
  isRenewalAllowed?: boolean;
  isPrematureClosureAllowed?: boolean;
  linkedAccountId?: string;
  transferInterestToLinkedAccount?: boolean;
  locale?: string;
  charges?: FixedDepositAccountChargeCreateRequest[];
}

/**
 * Fixed Deposit Account Charge Create Request
 */
export interface FixedDepositAccountChargeCreateRequest {
  chargeId: string;
  amount: number;
  dueDate?: string;
  feeOnMonthDay?: string;
  feeInterval?: number;
}

/**
 * Fixed Deposit Account Approval Request
 */
export interface FixedDepositAccountApprovalRequest {
  approvedOnDate: string;
  note?: string;
  locale?: string;
}

/**
 * Fixed Deposit Account Activate Request
 */
export interface FixedDepositAccountActivateRequest {
  activatedOnDate: string;
  note?: string;
  locale?: string;
}

/**
 * Fixed Deposit Account Deposit Request
 */
export interface FixedDepositAccountDepositRequest {
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
 * Fixed Deposit Account Premature Close Request
 */
export interface FixedDepositAccountPrematureCloseRequest {
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
 * Fixed Deposit Account Maturity Instructions Update Request
 */
export interface FixedDepositAccountMaturityInstructionsUpdateRequest {
  onAccountClosureType: string;
  transferToSavingsAccountId?: string;
  transferDescription?: string;
  locale?: string;
}

/**
 * Fixed Deposit Product Response
 */
export interface FixedDepositProductResponse {
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
  depositAmount?: number;
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
  charts: FixedDepositInterestRateChartResponse[];
}

/**
 * Fixed Deposit Interest Rate Chart Response
 */
export interface FixedDepositInterestRateChartResponse {
  id: string;
  name: string;
  description?: string;
  fromDate: string;
  endDate?: string;
  isPrimaryGroupingByAmount: boolean;
  chartSlabs: FixedDepositInterestRateSlabResponse[];
}

/**
 * Fixed Deposit Interest Rate Slab Response
 */
export interface FixedDepositInterestRateSlabResponse {
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
 * Fixed Deposit Account Response
 */
export interface FixedDepositAccountResponse {
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
  interestRate: number;
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
  charges: FixedDepositAccountChargeResponse[];
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
  transactions?: FixedDepositTransactionResponse[];
}

/**
 * Fixed Deposit Account Charge Response
 */
export interface FixedDepositAccountChargeResponse {
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
 * Fixed Deposit Transaction Response
 */
export interface FixedDepositTransactionResponse {
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