"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanTransactionType = exports.LoanStatus = exports.DaysInYearType = exports.DaysInMonthType = exports.AmortizationMethod = exports.InterestMethod = exports.PeriodFrequencyType = exports.LoanCalculationError = exports.LoanValidationError = exports.LoanError = void 0;
exports.isISODateString = isISODateString;
exports.toISODateString = toISODateString;
exports.validateLoanApplicationTerms = validateLoanApplicationTerms;
exports.calculateDaysBetween = calculateDaysBetween;
exports.calculateDaysInYear = calculateDaysInYear;
exports.isLeapYear = isLeapYear;
exports.addPeriods = addPeriods;
exports.convertTermsToMoney = convertTermsToMoney;
const money_1 = require("./money");
/**
 * Custom error types for loan operations
 */
class LoanError extends Error {
    constructor(message) {
        super(message);
        this.name = 'LoanError';
    }
}
exports.LoanError = LoanError;
class LoanValidationError extends LoanError {
    constructor(message) {
        super(message);
        this.name = 'LoanValidationError';
    }
}
exports.LoanValidationError = LoanValidationError;
class LoanCalculationError extends LoanError {
    constructor(message) {
        super(message);
        this.name = 'LoanCalculationError';
    }
}
exports.LoanCalculationError = LoanCalculationError;
/**
 * Period frequency type
 */
var PeriodFrequencyType;
(function (PeriodFrequencyType) {
    PeriodFrequencyType["DAYS"] = "days";
    PeriodFrequencyType["WEEKS"] = "weeks";
    PeriodFrequencyType["MONTHS"] = "months";
    PeriodFrequencyType["YEARS"] = "years";
})(PeriodFrequencyType || (exports.PeriodFrequencyType = PeriodFrequencyType = {}));
/**
 * Interest calculation method
 */
var InterestMethod;
(function (InterestMethod) {
    InterestMethod["DECLINING_BALANCE"] = "declining_balance";
    InterestMethod["FLAT"] = "flat";
    InterestMethod["COMPOUND"] = "compound";
})(InterestMethod || (exports.InterestMethod = InterestMethod = {}));
/**
 * Amortization method
 */
var AmortizationMethod;
(function (AmortizationMethod) {
    AmortizationMethod["EQUAL_INSTALLMENTS"] = "equal_installments";
    AmortizationMethod["EQUAL_PRINCIPAL"] = "equal_principal";
})(AmortizationMethod || (exports.AmortizationMethod = AmortizationMethod = {}));
/**
 * Days in month type
 */
var DaysInMonthType;
(function (DaysInMonthType) {
    DaysInMonthType["ACTUAL"] = "actual";
    DaysInMonthType["DAYS_30"] = "days_30";
})(DaysInMonthType || (exports.DaysInMonthType = DaysInMonthType = {}));
/**
 * Days in year type
 */
var DaysInYearType;
(function (DaysInYearType) {
    DaysInYearType["ACTUAL"] = "actual";
    DaysInYearType["DAYS_360"] = "days_360";
    DaysInYearType["DAYS_365"] = "days_365";
})(DaysInYearType || (exports.DaysInYearType = DaysInYearType = {}));
/**
 * Loan status
 */
var LoanStatus;
(function (LoanStatus) {
    LoanStatus["SUBMITTED_AND_PENDING_APPROVAL"] = "SUBMITTED_AND_PENDING_APPROVAL";
    LoanStatus["APPROVED"] = "APPROVED";
    LoanStatus["ACTIVE"] = "ACTIVE";
    LoanStatus["WITHDRAWN_BY_CLIENT"] = "WITHDRAWN_BY_CLIENT";
    LoanStatus["REJECTED"] = "REJECTED";
    LoanStatus["CLOSED_OBLIGATIONS_MET"] = "CLOSED_OBLIGATIONS_MET";
    LoanStatus["CLOSED_WRITTEN_OFF"] = "CLOSED_WRITTEN_OFF";
    LoanStatus["CLOSED_RESCHEDULE"] = "CLOSED_RESCHEDULE";
    LoanStatus["OVERPAID"] = "OVERPAID";
})(LoanStatus || (exports.LoanStatus = LoanStatus = {}));
/**
 * Loan transaction type
 */
var LoanTransactionType;
(function (LoanTransactionType) {
    LoanTransactionType["DISBURSEMENT"] = "DISBURSEMENT";
    LoanTransactionType["REPAYMENT"] = "REPAYMENT";
    LoanTransactionType["WAIVE_INTEREST"] = "WAIVE_INTEREST";
    LoanTransactionType["WAIVE_CHARGES"] = "WAIVE_CHARGES";
    LoanTransactionType["ACCRUAL"] = "ACCRUAL";
    LoanTransactionType["WRITEOFF"] = "WRITEOFF";
    LoanTransactionType["RECOVERY_REPAYMENT"] = "RECOVERY_REPAYMENT";
    LoanTransactionType["FEE_CHARGE"] = "FEE_CHARGE";
    LoanTransactionType["PENALTY_CHARGE"] = "PENALTY_CHARGE";
    LoanTransactionType["REFUND"] = "REFUND";
    LoanTransactionType["CHARGE_PAYMENT"] = "CHARGE_PAYMENT";
    LoanTransactionType["REFUND_FOR_ACTIVE_LOAN"] = "REFUND_FOR_ACTIVE_LOAN";
    LoanTransactionType["INCOME_POSTING"] = "INCOME_POSTING";
})(LoanTransactionType || (exports.LoanTransactionType = LoanTransactionType = {}));
/**
 * Type guard for ISO date strings
 */
function isISODateString(value) {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
    return isoDateRegex.test(value);
}
/**
 * Convert a date to an ISO date string
 */
function toISODateString(date) {
    if (typeof date === 'string') {
        if (isISODateString(date)) {
            return date;
        }
        return new Date(date).toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
}
/**
 * Validates loan application terms
 * @param terms Loan application terms to validate
 * @throws {LoanValidationError} If terms are invalid
 */
function validateLoanApplicationTerms(terms) {
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
function calculateDaysBetween(fromDate, toDate) {
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
function calculateDaysInYear(year, daysInYearType) {
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
function isLeapYear(year) {
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
function addPeriods(date, periods, frequencyType, daysInMonthType = DaysInMonthType.ACTUAL) {
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
            }
            else {
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
function convertTermsToMoney(terms) {
    const principalMoney = money_1.Money.of(terms.currency, terms.principalAmount);
    let inArrearsToleranceMoney;
    if (terms.inArrearsTolerance !== undefined && terms.inArrearsTolerance > 0) {
        inArrearsToleranceMoney = money_1.Money.of(terms.currency, terms.inArrearsTolerance);
    }
    return {
        principalMoney,
        inArrearsToleranceMoney
    };
}
