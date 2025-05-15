"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanCalculationService = void 0;
const money_1 = require("../models/money");
const logger_1 = require("../utils/logger");
/**
 * LoanCalculationService handles complex loan calculations including:
 * - Repayment schedule generation
 * - EMI calculations
 * - Interest calculations based on different methods
 * - Early repayment/prepayment calculations
 * - Handling various loan types and scenarios
 */
class LoanCalculationService {
    /**
     * Generates a loan repayment schedule based on the provided terms
     */
    async generateRepaymentSchedule(loanApplicationTerms) {
        logger_1.logger.info('Generating repayment schedule', {
            principalAmount: loanApplicationTerms.principalAmount,
            loanTermFrequency: loanApplicationTerms.loanTermFrequency,
            loanTermFrequencyType: loanApplicationTerms.loanTermFrequencyType
        });
        try {
            // Create basic schedule structure
            const schedule = {
                periods: [],
                currency: loanApplicationTerms.currency,
                loanTermInDays: this.calculateLoanTermInDays(loanApplicationTerms),
                principalDisbursed: loanApplicationTerms.principalAmount,
                totalPrincipal: 0,
                totalInterest: 0,
                totalFeeCharges: 0,
                totalPenaltyCharges: 0,
                totalRepaymentExpected: 0,
                totalOutstanding: 0
            };
            // Add disbursement period
            this.addDisbursementPeriod(schedule, loanApplicationTerms);
            // Calculate repayment dates
            const repaymentDates = this.generateRepaymentDates(loanApplicationTerms);
            // Calculate EMI based on loan terms
            const emi = this.calculateEMI(loanApplicationTerms);
            // Generate repayment periods with principal and interest breakdown
            this.generateRepaymentPeriods(schedule, loanApplicationTerms, repaymentDates, emi);
            // Calculate totals
            this.calculateScheduleTotals(schedule);
            return schedule;
        }
        catch (error) {
            logger_1.logger.error('Error generating repayment schedule', error);
            throw new Error(`Failed to generate loan repayment schedule: ${error.message}`);
        }
    }
    /**
     * Calculates the total term of the loan in days
     */
    calculateLoanTermInDays(loanApplicationTerms) {
        const { loanTermFrequency, loanTermFrequencyType, expectedDisbursementDate, repaymentFrequencyType, repaymentEvery } = loanApplicationTerms;
        let days = 0;
        switch (loanTermFrequencyType) {
            case 'days':
                days = loanTermFrequency;
                break;
            case 'weeks':
                days = loanTermFrequency * 7;
                break;
            case 'months':
                // Approximate month as 30 days for initial calculation
                days = loanTermFrequency * 30;
                break;
            case 'years':
                // Approximate year as 365 days for initial calculation
                days = loanTermFrequency * 365;
                break;
            default:
                throw new Error(`Unsupported loan term frequency type: ${loanTermFrequencyType}`);
        }
        return days;
    }
    /**
     * Adds the initial disbursement period to the schedule
     */
    addDisbursementPeriod(schedule, loanApplicationTerms) {
        const disbursementPeriod = {
            periodNumber: 0,
            periodType: 'disbursement',
            fromDate: loanApplicationTerms.expectedDisbursementDate,
            dueDate: loanApplicationTerms.expectedDisbursementDate,
            principalDisbursed: loanApplicationTerms.principalAmount,
            principalLoanBalanceOutstanding: loanApplicationTerms.principalAmount,
            principalOriginalDue: 0,
            principalDue: 0,
            principalPaid: 0,
            principalWrittenOff: 0,
            principalOutstanding: 0,
            interestOriginalDue: 0,
            interestDue: 0,
            interestPaid: 0,
            interestWaived: 0,
            interestWrittenOff: 0,
            interestOutstanding: 0,
            feeChargesDue: 0,
            feeChargesPaid: 0,
            feeChargesWaived: 0,
            feeChargesWrittenOff: 0,
            feeChargesOutstanding: 0,
            penaltyChargesDue: 0,
            penaltyChargesPaid: 0,
            penaltyChargesWaived: 0,
            penaltyChargesWrittenOff: 0,
            penaltyChargesOutstanding: 0,
            totalOriginalDueForPeriod: 0,
            totalDueForPeriod: 0,
            totalPaidForPeriod: 0,
            totalWaivedForPeriod: 0,
            totalWrittenOffForPeriod: 0,
            totalOutstandingForPeriod: 0,
            totalActualCostOfLoanForPeriod: 0,
            totalInstallmentAmountForPeriod: 0,
        };
        schedule.periods.push(disbursementPeriod);
    }
    /**
     * Generates all repayment dates based on loan terms
     */
    generateRepaymentDates(loanApplicationTerms) {
        const { expectedDisbursementDate, repaymentEvery, repaymentFrequencyType, numberOfRepayments } = loanApplicationTerms;
        const dates = [];
        let currentDate = new Date(expectedDisbursementDate);
        // For the first period, add the specified grace period if any
        if (loanApplicationTerms.graceOnPrincipalPayment > 0) {
            // Add grace period to first payment date based on repayment frequency type
            this.addTimeToDate(currentDate, loanApplicationTerms.graceOnPrincipalPayment, repaymentFrequencyType);
        }
        for (let i = 0; i < numberOfRepayments; i++) {
            // Add repayment frequency to current date
            this.addTimeToDate(currentDate, repaymentEvery, repaymentFrequencyType);
            dates.push(new Date(currentDate));
        }
        return dates;
    }
    /**
     * Helper method to add time to a date based on frequency type
     */
    addTimeToDate(date, amount, frequencyType) {
        switch (frequencyType) {
            case 'days':
                date.setDate(date.getDate() + amount);
                break;
            case 'weeks':
                date.setDate(date.getDate() + (amount * 7));
                break;
            case 'months':
                date.setMonth(date.getMonth() + amount);
                break;
            case 'years':
                date.setFullYear(date.getFullYear() + amount);
                break;
            default:
                throw new Error(`Unsupported frequency type: ${frequencyType}`);
        }
    }
    /**
     * Calculates Equated Monthly Installment (EMI) amount
     */
    calculateEMI(loanApplicationTerms) {
        const { principalAmount, numberOfRepayments, interestRatePerPeriod, interestMethod } = loanApplicationTerms;
        // Convert annual interest rate to period interest rate as a decimal
        const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
        if (interestMethod === 'flat') {
            // For flat interest rate, the calculation is simple
            const totalInterest = principalAmount * interestRatePerPeriodDecimal * numberOfRepayments;
            return (principalAmount + totalInterest) / numberOfRepayments;
        }
        else if (interestMethod === 'declining_balance') {
            // For declining balance method, use the standard EMI formula
            // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
            // where P is principal, r is rate per period, n is number of periods
            if (interestRatePerPeriodDecimal === 0) {
                // If interest rate is 0, just divide principal by number of repayments
                return principalAmount / numberOfRepayments;
            }
            const rateFactorPow = Math.pow(1 + interestRatePerPeriodDecimal, numberOfRepayments);
            const emi = principalAmount * interestRatePerPeriodDecimal * rateFactorPow / (rateFactorPow - 1);
            // Round to 2 decimal places
            return Math.round(emi * 100) / 100;
        }
        else {
            throw new Error(`Unsupported interest method: ${interestMethod}`);
        }
    }
    /**
     * Generates all repayment periods with principal and interest breakdowns
     */
    generateRepaymentPeriods(schedule, loanApplicationTerms, repaymentDates, emi) {
        const { interestMethod, principalAmount, interestRatePerPeriod } = loanApplicationTerms;
        // Convert annual interest rate to period interest rate as a decimal
        const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
        let outstandingBalance = principalAmount;
        let periodFromDate = new Date(loanApplicationTerms.expectedDisbursementDate);
        for (let i = 0; i < repaymentDates.length; i++) {
            const periodDueDate = repaymentDates[i];
            let principalForPeriod, interestForPeriod;
            if (interestMethod === 'flat') {
                // For flat interest, principal is equal in all periods
                principalForPeriod = principalAmount / loanApplicationTerms.numberOfRepayments;
                // Interest is also equal across all periods
                interestForPeriod = principalAmount * interestRatePerPeriodDecimal;
            }
            else if (interestMethod === 'declining_balance') {
                // For declining balance, calculate interest based on outstanding balance
                interestForPeriod = outstandingBalance * interestRatePerPeriodDecimal;
                // Principal for this period is EMI minus interest
                principalForPeriod = emi - interestForPeriod;
                // Ensure we don't overpay in the last period
                if (i === repaymentDates.length - 1 && principalForPeriod > outstandingBalance) {
                    principalForPeriod = outstandingBalance;
                    interestForPeriod = outstandingBalance * interestRatePerPeriodDecimal;
                }
                // Update outstanding balance for next period
                outstandingBalance -= principalForPeriod;
            }
            else {
                throw new Error(`Unsupported interest method: ${interestMethod}`);
            }
            // Round to 2 decimal places
            principalForPeriod = Math.round(principalForPeriod * 100) / 100;
            interestForPeriod = Math.round(interestForPeriod * 100) / 100;
            // Create the repayment period
            const repaymentPeriod = {
                periodNumber: i + 1,
                periodType: 'repayment',
                fromDate: new Date(periodFromDate),
                dueDate: new Date(periodDueDate),
                principalDisbursed: 0,
                principalLoanBalanceOutstanding: outstandingBalance,
                principalOriginalDue: principalForPeriod,
                principalDue: principalForPeriod,
                principalPaid: 0,
                principalWrittenOff: 0,
                principalOutstanding: principalForPeriod,
                interestOriginalDue: interestForPeriod,
                interestDue: interestForPeriod,
                interestPaid: 0,
                interestWaived: 0,
                interestWrittenOff: 0,
                interestOutstanding: interestForPeriod,
                feeChargesDue: 0,
                feeChargesPaid: 0,
                feeChargesWaived: 0,
                feeChargesWrittenOff: 0,
                feeChargesOutstanding: 0,
                penaltyChargesDue: 0,
                penaltyChargesPaid: 0,
                penaltyChargesWaived: 0,
                penaltyChargesWrittenOff: 0,
                penaltyChargesOutstanding: 0,
                totalOriginalDueForPeriod: principalForPeriod + interestForPeriod,
                totalDueForPeriod: principalForPeriod + interestForPeriod,
                totalPaidForPeriod: 0,
                totalWaivedForPeriod: 0,
                totalWrittenOffForPeriod: 0,
                totalOutstandingForPeriod: principalForPeriod + interestForPeriod,
                totalActualCostOfLoanForPeriod: interestForPeriod,
                totalInstallmentAmountForPeriod: principalForPeriod + interestForPeriod,
            };
            schedule.periods.push(repaymentPeriod);
            // Set from date for next period to the current period's due date
            periodFromDate = new Date(periodDueDate);
        }
    }
    /**
     * Calculate schedule totals
     */
    calculateScheduleTotals(schedule) {
        let totalPrincipal = 0;
        let totalInterest = 0;
        let totalFeeCharges = 0;
        let totalPenaltyCharges = 0;
        for (const period of schedule.periods) {
            if (period.periodType === 'repayment') {
                totalPrincipal += period.principalOriginalDue;
                totalInterest += period.interestOriginalDue;
                totalFeeCharges += period.feeChargesDue;
                totalPenaltyCharges += period.penaltyChargesDue;
            }
        }
        schedule.totalPrincipal = totalPrincipal;
        schedule.totalInterest = totalInterest;
        schedule.totalFeeCharges = totalFeeCharges;
        schedule.totalPenaltyCharges = totalPenaltyCharges;
        schedule.totalRepaymentExpected = totalPrincipal + totalInterest + totalFeeCharges + totalPenaltyCharges;
        schedule.totalOutstanding = schedule.totalRepaymentExpected;
    }
    /**
     * Calculate prepayment amount for a loan as of a specific date
     * Handles early repayment calculations including:
     * - Outstanding principal
     * - Accrued interest up to prepayment date
     * - Applicable fees and penalties
     * - Early repayment penalties if configured
     *
     * @param loan The loan details including current balances and transactions
     * @param onDate The date of the proposed prepayment
     * @param paymentAmount Optional proposed payment amount
     * @param includeEarlyPaymentPenalty Whether to include early payment penalties
     * @returns PrepaymentAmount with breakdown of payment portions
     */
    async calculatePrepaymentAmount(loan, onDate, paymentAmount, includeEarlyPaymentPenalty = true) {
        try {
            logger_1.logger.info('Calculating prepayment amount', { loanId: loan.id, onDate });
            // Create date objects for calculations
            const prepaymentDate = new Date(onDate);
            const disbursementDate = new Date(loan.disbursed_on_date);
            // Calculate days since disbursement
            const daysSinceDisbursement = Math.ceil((prepaymentDate.getTime() - disbursementDate.getTime()) / (1000 * 60 * 60 * 24));
            // Create Money objects for calculations
            const currency = loan.currency_code;
            const outstandingPrincipal = money_1.Money.of(currency, loan.principal_outstanding_derived);
            let outstandingInterest = money_1.Money.of(currency, loan.interest_outstanding_derived);
            const outstandingFees = money_1.Money.of(currency, loan.fee_charges_outstanding_derived);
            const outstandingPenalties = money_1.Money.of(currency, loan.penalty_charges_outstanding_derived);
            // If there's unprocessed interest accrual, calculate it up to the prepayment date
            if (loan.interest_calculation_method === 'declining_balance') {
                // For declining balance loans, interest is based on outstanding principal
                const interestRatePerDay = (loan.interest_rate / 100) / 365; // Daily interest rate
                const daysToLastAccrual = loan.days_to_last_accrual || 0;
                const daysForAdditionalInterest = daysSinceDisbursement - daysToLastAccrual;
                if (daysForAdditionalInterest > 0) {
                    // Calculate additional interest for days since last accrual
                    const additionalInterest = outstandingPrincipal.getAmount() * interestRatePerDay * daysForAdditionalInterest;
                    outstandingInterest = outstandingInterest.plus(money_1.Money.of(currency, additionalInterest));
                }
            }
            // Calculate early payment penalty if applicable
            let earlyPaymentPenalty = money_1.Money.zero(currency);
            if (includeEarlyPaymentPenalty && loan.early_repayment_penalty_applicable) {
                const penaltyPercentage = loan.early_repayment_penalty_percentage || 0;
                if (penaltyPercentage > 0) {
                    earlyPaymentPenalty = outstandingPrincipal.multipliedBy(penaltyPercentage / 100);
                }
            }
            // Total prepayment amount
            const totalPrepaymentAmount = outstandingPrincipal
                .plus(outstandingInterest)
                .plus(outstandingFees)
                .plus(outstandingPenalties)
                .plus(earlyPaymentPenalty);
            // Calculate additional principal required if payment amount provided
            let additionalPrincipalRequired = 0;
            if (paymentAmount !== undefined) {
                const proposedPayment = money_1.Money.of(currency, paymentAmount);
                if (proposedPayment.isLessThan(totalPrepaymentAmount)) {
                    additionalPrincipalRequired = totalPrepaymentAmount.minus(proposedPayment).getAmount();
                }
            }
            return {
                principalPortion: outstandingPrincipal.getAmount(),
                interestPortion: outstandingInterest.getAmount(),
                feeChargesPortion: outstandingFees.getAmount(),
                penaltyChargesPortion: outstandingPenalties.getAmount() + earlyPaymentPenalty.getAmount(),
                totalPrepaymentAmount: totalPrepaymentAmount.getAmount(),
                transactionDate: onDate,
                additionalPrincipalRequired
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating prepayment amount', error);
            throw new Error(`Failed to calculate prepayment amount: ${error.message}`);
        }
    }
    /**
     * Calculates potential savings from early repayment
     * This helps borrowers understand the benefits of paying off early
     *
     * @param loan The loan details
     * @param prepaymentDate The date of proposed prepayment
     * @returns Object containing interest savings and other benefits
     */
    async calculateEarlyRepaymentBenefits(loan, prepaymentDate) {
        try {
            // Get original schedule
            const loanApplicationTerms = this.buildLoanApplicationTermsFromLoan(loan);
            const originalSchedule = await this.generateRepaymentSchedule(loanApplicationTerms);
            // Calculate total interest that would be paid with normal schedule
            const totalScheduledInterest = originalSchedule.totalInterest;
            // Calculate interest paid so far (from transactions)
            const interestPaidToDate = loan.interest_paid_derived || 0;
            // Calculate interest in prepayment amount
            const prepayment = await this.calculatePrepaymentAmount(loan, prepaymentDate);
            const remainingInterestToPay = prepayment.interestPortion;
            // Calculate interest savings
            const interestSavings = totalScheduledInterest - interestPaidToDate - remainingInterestToPay;
            // Calculate time savings (days)
            const lastScheduledPaymentDate = new Date(originalSchedule.periods[originalSchedule.periods.length - 1].dueDate);
            const prepaymentDateObj = new Date(prepaymentDate);
            const daysSaved = Math.ceil((lastScheduledPaymentDate.getTime() - prepaymentDateObj.getTime()) / (1000 * 60 * 60 * 24));
            return {
                originalLoanEndDate: lastScheduledPaymentDate.toISOString().split('T')[0],
                proposedPrepaymentDate: prepaymentDate,
                totalScheduledInterest,
                interestPaidToDate,
                remainingInterestToPay,
                interestSavings: Math.max(0, interestSavings),
                daysSaved: Math.max(0, daysSaved),
                paymentsRemaining: originalSchedule.periods
                    .filter(p => p.periodType === 'repayment' && new Date(p.dueDate) > prepaymentDateObj)
                    .length
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating early repayment benefits', error);
            throw new Error(`Failed to calculate early repayment benefits: ${error.message}`);
        }
    }
    /**
     * Builds LoanApplicationTerms from an existing loan record
     * Used for recalculations and prepayment scenarios
     *
     * @param loan The loan details from database
     * @returns LoanApplicationTerms object for schedule generation
     */
    buildLoanApplicationTermsFromLoan(loan) {
        return {
            principalAmount: loan.principal_amount,
            currency: loan.currency_code,
            loanTermFrequency: loan.term_frequency,
            loanTermFrequencyType: loan.term_frequency_type,
            numberOfRepayments: loan.number_of_repayments,
            repaymentEvery: loan.repayment_every,
            repaymentFrequencyType: loan.repayment_frequency_type,
            interestRatePerPeriod: loan.interest_rate,
            interestMethod: loan.interest_method,
            amortizationMethod: loan.amortization_method,
            expectedDisbursementDate: loan.disbursed_on_date,
            submittedOnDate: loan.submitted_on_date,
            graceOnPrincipalPayment: loan.grace_on_principal_payment,
            graceOnInterestPayment: loan.grace_on_interest_payment,
            graceOnInterestCharged: loan.grace_on_interest_charged
        };
    }
}
exports.LoanCalculationService = LoanCalculationService;
