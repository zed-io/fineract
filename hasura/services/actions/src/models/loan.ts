import { Money } from './money';

/**
 * Custom error types for loan operations
 */
export class LoanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoanError';
  }
}

export class LoanValidationError extends LoanError {
  constructor(message: string) {
    super(message);
    this.name = 'LoanValidationError';
  }
}

export class LoanCalculationError extends LoanError {
  constructor(message: string) {
    super(message);
    this.name = 'LoanCalculationError';
  }
}

/**
 * Period frequency type
 */
export enum PeriodFrequencyType {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Interest calculation method
 */
export enum InterestMethod {
  DECLINING_BALANCE = 'declining_balance',
  FLAT = 'flat',
  COMPOUND = 'compound'
}

/**
 * Amortization method
 */
export enum AmortizationMethod {
  EQUAL_INSTALLMENTS = 'equal_installments',
  EQUAL_PRINCIPAL = 'equal_principal'
}

/**
 * Days in month type
 */
export enum DaysInMonthType {
  ACTUAL = 'actual',
  DAYS_30 = 'days_30'
}

/**
 * Days in year type
 */
export enum DaysInYearType {
  ACTUAL = 'actual',
  DAYS_360 = 'days_360',
  DAYS_365 = 'days_365'
}

/**
 * Frequency types for interest recalculation
 */
export enum RecalculationFrequencyType {
  INVALID = 0,
  SAME_AS_REPAYMENT_PERIOD = 1,
  DAILY = 2,
  WEEKLY = 3,
  MONTHLY = 4
}

/**
 * Methods for compounding interest during recalculation
 */
export enum InterestRecalculationCompoundingMethod {
  NONE = 0,
  INTEREST = 1,
  FEE = 2,
  INTEREST_AND_FEE = 3
}

/**
 * Strategies for rescheduling loans after interest recalculation
 */
export enum LoanRescheduleStrategyMethod {
  INVALID = 0,
  RESCHEDULE_NEXT_REPAYMENTS = 1,
  REDUCE_NUMBER_OF_INSTALLMENTS = 2,
  REDUCE_EMI_AMOUNT = 3,
  ADJUST_LAST_UNPAID_PERIOD = 4
}

/**
 * Loan status
 */
export enum LoanStatus {
  SUBMITTED_AND_PENDING_APPROVAL = 'SUBMITTED_AND_PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  WITHDRAWN_BY_CLIENT = 'WITHDRAWN_BY_CLIENT',
  REJECTED = 'REJECTED',
  CLOSED_OBLIGATIONS_MET = 'CLOSED_OBLIGATIONS_MET',
  CLOSED_WRITTEN_OFF = 'CLOSED_WRITTEN_OFF',
  CLOSED_RESCHEDULE = 'CLOSED_RESCHEDULE',
  OVERPAID = 'OVERPAID'
}

/**
 * Loan transaction type
 */
export enum LoanTransactionType {
  DISBURSEMENT = 'DISBURSEMENT',
  REPAYMENT = 'REPAYMENT',
  DOWN_PAYMENT = 'DOWN_PAYMENT',
  WAIVE_INTEREST = 'WAIVE_INTEREST',
  WAIVE_CHARGES = 'WAIVE_CHARGES',
  ACCRUAL = 'ACCRUAL',
  WRITEOFF = 'WRITEOFF',
  RECOVERY_REPAYMENT = 'RECOVERY_REPAYMENT',
  FEE_CHARGE = 'FEE_CHARGE',
  PENALTY_CHARGE = 'PENALTY_CHARGE',
  REFUND = 'REFUND',
  CHARGE_PAYMENT = 'CHARGE_PAYMENT',
  REFUND_FOR_ACTIVE_LOAN = 'REFUND_FOR_ACTIVE_LOAN',
  INCOME_POSTING = 'INCOME_POSTING'
}

/**
 * Date type - ensures proper ISO format
 */
export type ISODateString = string;

/**
 * Type guard for ISO date strings
 */
export function isISODateString(value: string): value is ISODateString {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoDateRegex.test(value);
}

/**
 * Convert a date to an ISO date string
 */
export function toISODateString(date: Date | string): ISODateString {
  if (typeof date === 'string') {
    if (isISODateString(date)) {
      return date;
    }
    return new Date(date).toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

/**
 * Down payment type enum
 */
export enum DownPaymentType {
  FIXED_AMOUNT = 'fixed_amount',
  PERCENTAGE = 'percentage'
}

/**
 * Represents loan application terms used to generate a repayment schedule
 */
export interface LoanApplicationTerms {
  principalAmount: number;
  currency: string;
  loanTermFrequency: number;
  loanTermFrequencyType: PeriodFrequencyType;
  numberOfRepayments: number;
  repaymentEvery: number;
  repaymentFrequencyType: PeriodFrequencyType;
  interestRatePerPeriod: number;
  interestMethod: InterestMethod;
  amortizationMethod: AmortizationMethod;
  expectedDisbursementDate: ISODateString;
  submittedOnDate: ISODateString;
  repaymentsStartingFromDate?: ISODateString;
  graceOnPrincipalPayment?: number;
  graceOnInterestPayment?: number;
  graceOnInterestCharged?: number;
  interestChargedFromDate?: ISODateString;
  allowPartialPeriodInterestCalculation?: boolean;
  inArrearsTolerance?: number;
  daysInMonthType?: DaysInMonthType;
  daysInYearType?: DaysInYearType;
  interestRecalculationEnabled?: boolean;
  fixedPrincipalPercentagePerInstallment?: number;
  // Down payment configuration
  enableDownPayment?: boolean;
  downPaymentType?: DownPaymentType;
  downPaymentAmount?: number;
  downPaymentPercentage?: number;
  // Interest recalculation settings
  interestRecalculationCompoundingMethod?: InterestRecalculationCompoundingMethod;
  rescheduleStrategyMethod?: LoanRescheduleStrategyMethod;
  restFrequencyType?: RecalculationFrequencyType;
  restInterval?: number;
  restFrequencyNthDay?: number;
  restFrequencyWeekday?: number;
  restFrequencyOnDay?: number;
  compoundingFrequencyType?: RecalculationFrequencyType;
  compoundingInterval?: number;
  compoundingFrequencyNthDay?: number;
  compoundingFrequencyWeekday?: number;
  compoundingFrequencyOnDay?: number;
  isCompoundingToBePostedAsTransaction?: boolean;
  allowCompoundingOnEod?: boolean;
  disallowInterestCalculationOnPastDue?: boolean;
  // Variable installment configuration
  allowVariableInstallments?: boolean;
  minimumGap?: number;
  minimumGapFrequencyType?: PeriodFrequencyType;
  maximumGap?: number;
  maximumGapFrequencyType?: PeriodFrequencyType;
  minimumInstallmentAmount?: number;
  // Variable installment dates and amounts (if using variable installments)
  installments?: {
    installmentNumber: number;
    dueDate: ISODateString;
    installmentAmount?: number;
    principal?: number;
    interest?: number;
  }[];
}

/**
 * A period in the loan schedule (either disbursement or repayment)
 */
export interface LoanSchedulePeriod {
  periodNumber: number;
  periodType: 'disbursement' | 'repayment' | 'downpayment';
  fromDate: ISODateString;
  dueDate: ISODateString;
  principalDisbursed: number;
  principalLoanBalanceOutstanding: number;
  principalOriginalDue: number;
  principalDue: number;
  principalPaid: number;
  principalWrittenOff: number;
  principalOutstanding: number;
  interestOriginalDue: number;
  interestDue: number;
  interestPaid: number;
  interestWaived: number;
  interestWrittenOff: number;
  interestOutstanding: number;
  feeChargesDue: number;
  feeChargesPaid: number;
  feeChargesWaived: number;
  feeChargesWrittenOff: number;
  feeChargesOutstanding: number;
  penaltyChargesDue: number;
  penaltyChargesPaid: number;
  penaltyChargesWaived: number;
  penaltyChargesWrittenOff: number;
  penaltyChargesOutstanding: number;
  totalOriginalDueForPeriod: number;
  totalDueForPeriod: number;
  totalPaidForPeriod: number;
  totalWaivedForPeriod: number;
  totalWrittenOffForPeriod: number;
  totalOutstandingForPeriod: number;
  totalActualCostOfLoanForPeriod: number;
  totalInstallmentAmountForPeriod: number;
  chargesWaived?: number;
  complete?: boolean;
  daysInPeriod?: number; // Number of days in this period (used primarily for variable installments)
}

/**
 * The complete loan repayment schedule
 */
export interface LoanSchedule {
  currency: string;
  loanTermInDays: number;
  principalDisbursed: number;
  totalPrincipal: number;
  totalInterest: number;
  totalFeeCharges: number;
  totalPenaltyCharges: number;
  totalRepaymentExpected: number;
  totalOutstanding: number;
  downPaymentAmount?: number;
  periods: LoanSchedulePeriod[];
}

/**
 * Represents a repayment period with calculated interest and principal
 */
export interface RepaymentPeriod {
  fromDate: ISODateString;
  dueDate: ISODateString;
  installmentNumber: number;
  principal: number;
  interest: number;
  feeCharges: number;
  penaltyCharges: number;
  totalDue: number;
  outstandingLoanBalance: number;
  rateFactor: number;
  rateFactorPlus1: number;
  interestPeriods?: InterestPeriod[];
  complete?: boolean;
  daysInPeriod?: number;
}

/**
 * Represents an interest period, which may be different from a repayment period
 */
export interface InterestPeriod {
  fromDate: ISODateString;
  dueDate: ISODateString;
  interestRate: number;
  interestAmount: number;
  rateFactor: number;
  outstandingBalance: number;
  disbursementAmount?: number;
  chargebackPrincipal?: number;
  chargebackInterest?: number;
  daysInPeriod?: number;
}

/**
 * Response from a prepayment calculation
 */
export interface PrepaymentAmount {
  principalPortion: number;
  interestPortion: number;
  feeChargesPortion: number;
  penaltyChargesPortion: number;
  totalPrepaymentAmount: number;
  transactionDate: ISODateString;
  additionalPrincipalRequired: number;
}

/**
 * Details of a down payment calculation
 */
export interface DownPaymentDetails {
  downPaymentAmount: number;
  downPaymentType: DownPaymentType;
  effectivePrincipalAmount: number;
  downPaymentPercentage?: number;
  totalLoanAmount: number;
  transactionDate: ISODateString;
}

/**
 * Validates loan application terms
 * @param terms Loan application terms to validate
 * @throws {LoanValidationError} If terms are invalid
 */
export function validateLoanApplicationTerms(terms: LoanApplicationTerms): void {
  // Validate required numeric fields
  if (terms.principalAmount <= 0) {
    throw new LoanValidationError('Principal amount must be greater than zero');
  }
  
  if (terms.loanTermFrequency <= 0) {
    throw new LoanValidationError('Loan term frequency must be greater than zero');
  }
  
  if (terms.numberOfRepayments <= 0) {
    throw new LoanValidationError('Number of repayments must be greater than zero');
  }
  
  if (terms.repaymentEvery <= 0) {
    throw new LoanValidationError('Repayment every must be greater than zero');
  }
  
  if (terms.interestRatePerPeriod < 0) {
    throw new LoanValidationError('Interest rate cannot be negative');
  }
  
  // Validate enum values
  if (!Object.values(PeriodFrequencyType).includes(terms.loanTermFrequencyType)) {
    throw new LoanValidationError(`Invalid loan term frequency type: ${terms.loanTermFrequencyType}`);
  }
  
  if (!Object.values(PeriodFrequencyType).includes(terms.repaymentFrequencyType)) {
    throw new LoanValidationError(`Invalid repayment frequency type: ${terms.repaymentFrequencyType}`);
  }
  
  if (!Object.values(InterestMethod).includes(terms.interestMethod)) {
    throw new LoanValidationError(`Invalid interest method: ${terms.interestMethod}`);
  }
  
  if (!Object.values(AmortizationMethod).includes(terms.amortizationMethod)) {
    throw new LoanValidationError(`Invalid amortization method: ${terms.amortizationMethod}`);
  }
  
  // Validate dates
  if (!isISODateString(terms.expectedDisbursementDate)) {
    throw new LoanValidationError('Expected disbursement date must be a valid ISO date string');
  }
  
  if (!isISODateString(terms.submittedOnDate)) {
    throw new LoanValidationError('Submitted on date must be a valid ISO date string');
  }
  
  if (terms.repaymentsStartingFromDate && !isISODateString(terms.repaymentsStartingFromDate)) {
    throw new LoanValidationError('Repayments starting from date must be a valid ISO date string');
  }
  
  if (terms.interestChargedFromDate && !isISODateString(terms.interestChargedFromDate)) {
    throw new LoanValidationError('Interest charged from date must be a valid ISO date string');
  }
  
  // Validate optional enum values
  if (terms.daysInMonthType && !Object.values(DaysInMonthType).includes(terms.daysInMonthType)) {
    throw new LoanValidationError(`Invalid days in month type: ${terms.daysInMonthType}`);
  }
  
  if (terms.daysInYearType && !Object.values(DaysInYearType).includes(terms.daysInYearType)) {
    throw new LoanValidationError(`Invalid days in year type: ${terms.daysInYearType}`);
  }
  
  // Validate down payment configuration
  if (terms.enableDownPayment) {
    if (!terms.downPaymentType) {
      throw new LoanValidationError('Down payment type must be specified when down payment is enabled');
    }
    
    if (!Object.values(DownPaymentType).includes(terms.downPaymentType)) {
      throw new LoanValidationError(`Invalid down payment type: ${terms.downPaymentType}`);
    }
    
    if (terms.downPaymentType === DownPaymentType.FIXED_AMOUNT) {
      if (terms.downPaymentAmount === undefined || terms.downPaymentAmount <= 0) {
        throw new LoanValidationError('Down payment amount must be greater than zero');
      }
      
      if (terms.downPaymentAmount >= terms.principalAmount) {
        throw new LoanValidationError('Down payment amount cannot be greater than or equal to principal amount');
      }
    } else if (terms.downPaymentType === DownPaymentType.PERCENTAGE) {
      if (terms.downPaymentPercentage === undefined || terms.downPaymentPercentage <= 0 || terms.downPaymentPercentage >= 100) {
        throw new LoanValidationError('Down payment percentage must be greater than zero and less than 100');
      }
    }
  }
  
  // Validate optional numeric fields
  if (terms.graceOnPrincipalPayment !== undefined && terms.graceOnPrincipalPayment < 0) {
    throw new LoanValidationError('Grace on principal payment cannot be negative');
  }
  
  if (terms.graceOnInterestPayment !== undefined && terms.graceOnInterestPayment < 0) {
    throw new LoanValidationError('Grace on interest payment cannot be negative');
  }
  
  if (terms.graceOnInterestCharged !== undefined && terms.graceOnInterestCharged < 0) {
    throw new LoanValidationError('Grace on interest charged cannot be negative');
  }
  
  if (terms.inArrearsTolerance !== undefined && terms.inArrearsTolerance < 0) {
    throw new LoanValidationError('In arrears tolerance cannot be negative');
  }
  
  if (terms.fixedPrincipalPercentagePerInstallment !== undefined && 
     (terms.fixedPrincipalPercentagePerInstallment <= 0 || terms.fixedPrincipalPercentagePerInstallment > 100)) {
    throw new LoanValidationError('Fixed principal percentage per installment must be between 0 and 100');
  }
}

/**
 * Calculates the number of days between two dates
 * @param fromDate Start date
 * @param toDate End date
 * @returns Number of days
 */
export function calculateDaysBetween(fromDate: Date | ISODateString, toDate: Date | ISODateString): number {
  const from = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
  const to = typeof toDate === 'string' ? new Date(toDate) : toDate;
  
  // Reset hours to normalize the calculation
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  
  const differenceInTime = to.getTime() - from.getTime();
  return Math.round(differenceInTime / (1000 * 3600 * 24));
}

/**
 * Calculates the days in a year based on the days in year type
 * @param year The year to calculate days for
 * @param daysInYearType The days in year type
 * @returns Number of days in the year
 */
export function calculateDaysInYear(year: number, daysInYearType: DaysInYearType): number {
  switch (daysInYearType) {
    case DaysInYearType.DAYS_360:
      return 360;
    case DaysInYearType.DAYS_365:
      return 365;
    case DaysInYearType.ACTUAL:
      return isLeapYear(year) ? 366 : 365;
    default:
      return 365;
  }
}

/**
 * Determines if a year is a leap year
 * @param year The year to check
 * @returns True if the year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}

/**
 * Adds a specified number of periods to a date
 * @param date The starting date
 * @param periods Number of periods to add
 * @param frequencyType The frequency type for periods
 * @param daysInMonthType The days in month type
 * @returns New date after adding periods
 */
export function addPeriods(
  date: Date | ISODateString, 
  periods: number, 
  frequencyType: PeriodFrequencyType,
  daysInMonthType: DaysInMonthType = DaysInMonthType.ACTUAL
): Date {
  const startDate = typeof date === 'string' ? new Date(date) : new Date(date);
  const result = new Date(startDate);
  
  switch (frequencyType) {
    case PeriodFrequencyType.DAYS:
      result.setDate(result.getDate() + periods);
      break;
    
    case PeriodFrequencyType.WEEKS:
      result.setDate(result.getDate() + (periods * 7));
      break;
    
    case PeriodFrequencyType.MONTHS:
      if (daysInMonthType === DaysInMonthType.DAYS_30) {
        // Use 30-day months
        result.setDate(result.getDate() + (periods * 30));
      } else {
        // Use actual month lengths
        const currentDate = startDate.getDate();
        result.setMonth(result.getMonth() + periods);
        
        // Handle month-end cases
        const newMonth = result.getMonth();
        const expectedMonth = (startDate.getMonth() + periods) % 12;
        
        if (newMonth !== expectedMonth) {
          // Set to last day of previous month
          result.setDate(0);
        }
      }
      break;
    
    case PeriodFrequencyType.YEARS:
      result.setFullYear(result.getFullYear() + periods);
      break;
  }
  
  return result;
}

/**
 * Converts loan application terms to Money objects
 * @param terms Loan application terms
 * @returns Terms with Money objects
 */
export function convertTermsToMoney(terms: LoanApplicationTerms): {
  principalMoney: Money;
  inArrearsToleranceMoney?: Money;
} {
  const principalMoney = Money.of(terms.currency, terms.principalAmount);
  let inArrearsToleranceMoney: Money | undefined;
  
  if (terms.inArrearsTolerance !== undefined && terms.inArrearsTolerance > 0) {
    inArrearsToleranceMoney = Money.of(terms.currency, terms.inArrearsTolerance);
  }
  
  return {
    principalMoney,
    inArrearsToleranceMoney
  };
}