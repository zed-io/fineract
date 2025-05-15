"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanInterestRecalculationService = void 0;
const loan_1 = require("../models/loan");
const loanAdvanced_1 = require("../models/loanAdvanced");
const logger_1 = require("../utils/logger");
/**
 * Service for handling loan interest recalculation
 * Supports dynamic interest recalculation based on transactions and configuration
 */
class LoanInterestRecalculationService {
    /**
     * Recalculate loan schedule after a transaction (like a payment or fee)
     *
     * @param loanId The loan ID
     * @param originalSchedule The original loan schedule
     * @param terms The loan application terms
     * @param recalculationConfig The interest recalculation configuration
     * @param transactionDate The date of the transaction
     * @param transactionAmount The transaction amount
     * @param isPayment Whether the transaction is a payment
     * @returns The recalculated loan schedule
     */
    recalculateSchedule(loanId, originalSchedule, terms, recalculationConfig, transactionDate, transactionAmount, isPayment = true) {
        logger_1.logger.info('Recalculating loan schedule', {
            loanId,
            transactionDate,
            transactionAmount,
            isPayment
        });
        try {
            if (!recalculationConfig || recalculationConfig.interestRecalculationCompoundingMethod === loanAdvanced_1.InterestRecalculationCompoundingMethod.NONE) {
                logger_1.logger.debug('Interest recalculation not configured, returning original schedule');
                return originalSchedule;
            }
            // Create a copy of the original schedule to modify
            const newSchedule = {
                ...originalSchedule,
                periods: JSON.parse(JSON.stringify(originalSchedule.periods))
            };
            // Get transaction date as Date object
            const txnDate = new Date(transactionDate);
            // Split periods into past (before transaction) and future (after transaction)
            const pastPeriods = [];
            let futurePeriods = [];
            // First period is always the disbursement, keep it
            pastPeriods.push(newSchedule.periods[0]);
            // Process remaining periods
            for (let i = 1; i < newSchedule.periods.length; i++) {
                const period = newSchedule.periods[i];
                const periodDueDate = new Date(period.dueDate);
                if (periodDueDate <= txnDate) {
                    // Keep past periods unchanged
                    pastPeriods.push(period);
                }
                else {
                    // Collect future periods for recalculation
                    futurePeriods.push(period);
                }
            }
            // Calculate outstanding balance after transaction
            let outstandingPrincipal = this.calculateOutstandingPrincipal(pastPeriods, transactionAmount, isPayment);
            // Recalculate future periods based on strategy
            futurePeriods = this.recalculateFuturePeriods(futurePeriods, outstandingPrincipal, terms, recalculationConfig, transactionDate);
            // Combine past and recalculated future periods
            newSchedule.periods = [...pastPeriods, ...futurePeriods];
            // Recalculate totals for the schedule
            this.recalculateScheduleTotals(newSchedule);
            return newSchedule;
        }
        catch (error) {
            logger_1.logger.error('Error recalculating schedule', { loanId, error });
            throw new Error(`Failed to recalculate loan schedule: ${error.message}`);
        }
    }
    /**
     * Calculate the outstanding principal after a transaction
     *
     * @param pastPeriods The past periods of the loan schedule
     * @param transactionAmount The transaction amount
     * @param isPayment Whether the transaction is a payment
     * @returns The outstanding principal
     */
    calculateOutstandingPrincipal(pastPeriods, transactionAmount, isPayment) {
        // Get the last period to find the current outstanding principal
        const lastPeriod = pastPeriods[pastPeriods.length - 1];
        let outstandingPrincipal = lastPeriod.principalLoanBalanceOutstanding;
        // If it's a payment, reduce outstanding principal
        if (isPayment) {
            // Assume the payment goes to principal first
            outstandingPrincipal = Math.max(0, outstandingPrincipal - transactionAmount);
        }
        return outstandingPrincipal;
    }
    /**
     * Recalculate future periods based on the recalculation strategy
     *
     * @param futurePeriods The future periods to recalculate
     * @param outstandingPrincipal The outstanding principal
     * @param terms The loan application terms
     * @param recalculationConfig The interest recalculation configuration
     * @param transactionDate The transaction date
     * @returns The recalculated future periods
     */
    recalculateFuturePeriods(futurePeriods, outstandingPrincipal, terms, recalculationConfig, transactionDate) {
        // If no future periods, nothing to do
        if (futurePeriods.length === 0) {
            return [];
        }
        const { rescheduleStrategyMethod } = recalculationConfig;
        switch (rescheduleStrategyMethod) {
            case loanAdvanced_1.RescheduleStrategyMethod.REDUCE_NUMBER_OF_INSTALLMENTS:
                return this.recalculateWithReducedInstallments(futurePeriods, outstandingPrincipal, terms);
            case loanAdvanced_1.RescheduleStrategyMethod.REDUCE_EMI_AMOUNT:
                return this.recalculateWithReducedEMI(futurePeriods, outstandingPrincipal, terms);
            case loanAdvanced_1.RescheduleStrategyMethod.RESCHEDULE_NEXT_REPAYMENTS:
                return this.recalculateWithRescheduledRepayments(futurePeriods, outstandingPrincipal, terms, transactionDate);
            default:
                throw new Error(`Unsupported reschedule strategy: ${rescheduleStrategyMethod}`);
        }
    }
    /**
     * Recalculate with reduced number of installments strategy
     * This keeps the same EMI but reduces the number of installments
     *
     * @param futurePeriods The future periods to recalculate
     * @param outstandingPrincipal The outstanding principal
     * @param terms The loan application terms
     * @returns The recalculated future periods
     */
    recalculateWithReducedInstallments(futurePeriods, outstandingPrincipal, terms) {
        const { interestRatePerPeriod, interestMethod } = terms;
        const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
        const recalculatedPeriods = [];
        if (outstandingPrincipal <= 0) {
            // No outstanding principal, no need for future payments
            return [];
        }
        if (futurePeriods.length === 0) {
            return [];
        }
        // Get original EMI from first future period
        const originalPeriod = futurePeriods[0];
        const originalEMI = originalPeriod.principalDue + originalPeriod.interestDue;
        // Calculate how many periods needed with the original EMI
        let remainingPrincipal = outstandingPrincipal;
        let periodsNeeded = 0;
        if (interestMethod === 'flat') {
            // For flat interest, simply divide by principal component of EMI
            const principalPerPeriod = originalPeriod.principalDue;
            periodsNeeded = Math.ceil(remainingPrincipal / principalPerPeriod);
        }
        else {
            // For declining, simulate future periods until principal is paid off
            while (remainingPrincipal > 0 && periodsNeeded < futurePeriods.length) {
                // Calculate interest for this period
                const interestForPeriod = remainingPrincipal * interestRatePerPeriodDecimal;
                // Calculate principal for this period (EMI - interest)
                let principalForPeriod = originalEMI - interestForPeriod;
                // Adjust principal for last payment if needed
                if (principalForPeriod > remainingPrincipal) {
                    principalForPeriod = remainingPrincipal;
                }
                // Update remaining principal
                remainingPrincipal -= principalForPeriod;
                periodsNeeded++;
            }
        }
        // Cap the number of periods to the original number of future periods
        periodsNeeded = Math.min(periodsNeeded, futurePeriods.length);
        // Use only the needed number of periods, keeping their original dates
        let remainingBalance = outstandingPrincipal;
        for (let i = 0; i < periodsNeeded; i++) {
            const originalFuturePeriod = futurePeriods[i];
            // Calculate interest for this period
            const interestAmount = interestMethod === 'flat'
                ? originalFuturePeriod.interestDue
                : remainingBalance * interestRatePerPeriodDecimal;
            // Calculate principal for this period
            let principalAmount = originalEMI - interestAmount;
            // Ensure we don't overpay in the last period
            if (principalAmount > remainingBalance) {
                principalAmount = remainingBalance;
            }
            // Create recalculated period
            const recalculatedPeriod = {
                ...originalFuturePeriod,
                principalLoanBalanceOutstanding: remainingBalance - principalAmount,
                principalOriginalDue: principalAmount,
                principalDue: principalAmount,
                principalOutstanding: principalAmount,
                interestOriginalDue: interestAmount,
                interestDue: interestAmount,
                interestOutstanding: interestAmount,
                totalOriginalDueForPeriod: principalAmount + interestAmount,
                totalDueForPeriod: principalAmount + interestAmount,
                totalOutstandingForPeriod: principalAmount + interestAmount,
                totalInstallmentAmountForPeriod: principalAmount + interestAmount,
                totalActualCostOfLoanForPeriod: interestAmount
            };
            // Update outstanding balance
            remainingBalance -= principalAmount;
            recalculatedPeriods.push(recalculatedPeriod);
        }
        return recalculatedPeriods;
    }
    /**
     * Recalculate with reduced EMI amount strategy
     * This keeps the same number of installments but reduces the EMI amount
     *
     * @param futurePeriods The future periods to recalculate
     * @param outstandingPrincipal The outstanding principal
     * @param terms The loan application terms
     * @returns The recalculated future periods
     */
    recalculateWithReducedEMI(futurePeriods, outstandingPrincipal, terms) {
        const { interestRatePerPeriod, interestMethod } = terms;
        const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
        const recalculatedPeriods = [];
        if (outstandingPrincipal <= 0) {
            // No outstanding principal, no need for future payments
            return [];
        }
        if (futurePeriods.length === 0) {
            return [];
        }
        // Calculate new EMI based on outstanding principal and remaining periods
        let newEMI = 0;
        if (interestMethod === 'flat') {
            // For flat interest, the interest portion remains the same
            const interestPerPeriod = futurePeriods[0].interestDue;
            const principalPerPeriod = outstandingPrincipal / futurePeriods.length;
            newEMI = principalPerPeriod + interestPerPeriod;
        }
        else {
            // For declining balance, use the standard EMI formula
            // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
            // where P is principal, r is rate per period, n is number of periods
            if (interestRatePerPeriodDecimal === 0) {
                // If interest rate is 0, just divide principal by number of periods
                newEMI = outstandingPrincipal / futurePeriods.length;
            }
            else {
                const n = futurePeriods.length;
                const r = interestRatePerPeriodDecimal;
                const rateFactorPow = Math.pow(1 + r, n);
                newEMI = outstandingPrincipal * r * rateFactorPow / (rateFactorPow - 1);
            }
        }
        // Round EMI to 2 decimal places
        newEMI = Math.round(newEMI * 100) / 100;
        // Distribute the new EMI across periods
        let remainingBalance = outstandingPrincipal;
        for (let i = 0; i < futurePeriods.length; i++) {
            const originalFuturePeriod = futurePeriods[i];
            // Calculate interest for this period
            const interestAmount = interestMethod === 'flat'
                ? originalFuturePeriod.interestDue
                : remainingBalance * interestRatePerPeriodDecimal;
            // Calculate principal for this period
            let principalAmount = newEMI - interestAmount;
            // Handle special case for last period
            if (i === futurePeriods.length - 1 || principalAmount > remainingBalance) {
                principalAmount = remainingBalance;
            }
            // Create recalculated period
            const recalculatedPeriod = {
                ...originalFuturePeriod,
                principalLoanBalanceOutstanding: remainingBalance - principalAmount,
                principalOriginalDue: principalAmount,
                principalDue: principalAmount,
                principalOutstanding: principalAmount,
                interestOriginalDue: interestAmount,
                interestDue: interestAmount,
                interestOutstanding: interestAmount,
                totalOriginalDueForPeriod: principalAmount + interestAmount,
                totalDueForPeriod: principalAmount + interestAmount,
                totalOutstandingForPeriod: principalAmount + interestAmount,
                totalInstallmentAmountForPeriod: principalAmount + interestAmount,
                totalActualCostOfLoanForPeriod: interestAmount
            };
            // Update outstanding balance
            remainingBalance -= principalAmount;
            recalculatedPeriods.push(recalculatedPeriod);
        }
        return recalculatedPeriods;
    }
    /**
     * Recalculate with rescheduled repayments strategy
     * This keeps the original payment structure but shifts all future payments
     *
     * @param futurePeriods The future periods to recalculate
     * @param outstandingPrincipal The outstanding principal
     * @param terms The loan application terms
     * @param transactionDate The transaction date
     * @returns The recalculated future periods
     */
    recalculateWithRescheduledRepayments(futurePeriods, outstandingPrincipal, terms, transactionDate) {
        if (outstandingPrincipal <= 0) {
            // No outstanding principal, no need for future payments
            return [];
        }
        if (futurePeriods.length === 0) {
            return [];
        }
        // Start from transaction date + repayment frequency
        const { repaymentEvery, repaymentFrequencyType } = terms;
        let nextRepaymentDate = (0, loan_1.addPeriods)(transactionDate, repaymentEvery, repaymentFrequencyType);
        // Calculate how many periods needed with original structure
        const { interestRatePerPeriod, interestMethod } = terms;
        const interestRatePerPeriodDecimal = interestRatePerPeriod / 100;
        const recalculatedPeriods = [];
        // Get original principal and interest proportions from first future period
        const originalPeriod = futurePeriods[0];
        const originalTotal = originalPeriod.totalDueForPeriod;
        const originalPrincipalProportion = originalPeriod.principalDue / originalTotal;
        const originalInterestProportion = originalPeriod.interestDue / originalTotal;
        // Recalculate periods with new dates and outstanding principal
        let remainingBalance = outstandingPrincipal;
        for (let i = 0; i < futurePeriods.length; i++) {
            // Skip if no principal left
            if (remainingBalance <= 0) {
                break;
            }
            const originalFuturePeriod = futurePeriods[i];
            // Set new from and due dates
            const periodFromDate = i === 0
                ? new Date(transactionDate)
                : new Date(recalculatedPeriods[i - 1].dueDate);
            const periodDueDate = i === 0
                ? nextRepaymentDate
                : (0, loan_1.addPeriods)(recalculatedPeriods[i - 1].dueDate, repaymentEvery, repaymentFrequencyType);
            // Calculate interest for this period
            let interestAmount;
            if (interestMethod === 'flat') {
                // For flat interest, use the original proportion
                interestAmount = originalTotal * originalInterestProportion;
            }
            else {
                // For declining, calculate based on outstanding balance
                const daysInPeriod = (0, loan_1.calculateDaysBetween)(periodFromDate, periodDueDate);
                const daysInYear = (0, loan_1.calculateDaysInYear)(periodDueDate.getFullYear(), terms.daysInYearType || loan_1.DaysInYearType.DAYS_365);
                // Daily interest rate
                const dailyInterestRate = interestRatePerPeriodDecimal / daysInYear;
                interestAmount = remainingBalance * dailyInterestRate * daysInPeriod;
            }
            // Calculate principal for this period
            let principalAmount;
            if (interestMethod === 'flat') {
                // For flat interest, use the original proportion
                principalAmount = originalTotal * originalPrincipalProportion;
                // Ensure we don't exceed the remaining balance
                if (principalAmount > remainingBalance) {
                    principalAmount = remainingBalance;
                }
            }
            else {
                // For declining, use the original installment amount minus interest
                principalAmount = originalTotal - interestAmount;
                // Ensure we don't exceed the remaining balance
                if (principalAmount > remainingBalance) {
                    principalAmount = remainingBalance;
                }
            }
            // Create recalculated period
            const recalculatedPeriod = {
                ...originalFuturePeriod,
                fromDate: periodFromDate.toISOString().split('T')[0],
                dueDate: periodDueDate.toISOString().split('T')[0],
                principalLoanBalanceOutstanding: remainingBalance - principalAmount,
                principalOriginalDue: principalAmount,
                principalDue: principalAmount,
                principalOutstanding: principalAmount,
                interestOriginalDue: interestAmount,
                interestDue: interestAmount,
                interestOutstanding: interestAmount,
                totalOriginalDueForPeriod: principalAmount + interestAmount,
                totalDueForPeriod: principalAmount + interestAmount,
                totalOutstandingForPeriod: principalAmount + interestAmount,
                totalInstallmentAmountForPeriod: principalAmount + interestAmount,
                totalActualCostOfLoanForPeriod: interestAmount
            };
            // Update outstanding balance
            remainingBalance -= principalAmount;
            recalculatedPeriods.push(recalculatedPeriod);
        }
        return recalculatedPeriods;
    }
    /**
     * Recalculate schedule totals
     *
     * @param schedule The loan schedule to recalculate totals for
     */
    recalculateScheduleTotals(schedule) {
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
     * Generate interest recalculation periods
     * Used when compound interest is enabled
     *
     * @param loanId The loan ID
     * @param terms The loan application terms
     * @param recalculationConfig The interest recalculation configuration
     * @param disbursementDate The disbursement date
     * @param endDate The end date for calculations
     * @returns Array of interest recalculation periods
     */
    generateInterestRecalculationPeriods(loanId, terms, recalculationConfig, disbursementDate, endDate) {
        logger_1.logger.info('Generating interest recalculation periods', {
            loanId,
            disbursementDate,
            endDate
        });
        try {
            const periods = [];
            const startDate = new Date(disbursementDate);
            const targetEndDate = new Date(endDate);
            // Return empty array if no recalculation or no compounding
            if (!recalculationConfig ||
                recalculationConfig.interestRecalculationCompoundingMethod === loanAdvanced_1.InterestRecalculationCompoundingMethod.NONE) {
                return periods;
            }
            const { recalculationRestFrequencyType, recalculationRestFrequencyInterval, recalculationCompoundingFrequencyType, recalculationCompoundingFrequencyInterval } = recalculationConfig;
            // If same as repayment period, use the loan terms frequency
            const frequencyType = recalculationCompoundingFrequencyType === loanAdvanced_1.RecalculationCompoundingFrequency.SAME_AS_REPAYMENT_PERIOD
                ? terms.repaymentFrequencyType
                : this.mapRecalculationFrequencyToPeriodFrequencyType(recalculationCompoundingFrequencyType);
            const frequencyInterval = recalculationCompoundingFrequencyInterval ||
                (recalculationCompoundingFrequencyType === loanAdvanced_1.RecalculationCompoundingFrequency.SAME_AS_REPAYMENT_PERIOD
                    ? terms.repaymentEvery
                    : 1);
            // Generate periods
            let currentDate = new Date(startDate);
            while (currentDate <= targetEndDate) {
                // Add period to the list
                periods.push(new Date(currentDate));
                // Move to next period
                currentDate = (0, loan_1.addPeriods)(currentDate, frequencyInterval, frequencyType);
            }
            return periods;
        }
        catch (error) {
            logger_1.logger.error('Error generating interest recalculation periods', { loanId, error });
            throw new Error(`Failed to generate interest recalculation periods: ${error.message}`);
        }
    }
    /**
     * Map recalculation frequency to period frequency type
     *
     * @param recalculationFrequency The recalculation frequency
     * @returns The corresponding period frequency type
     */
    mapRecalculationFrequencyToPeriodFrequencyType(recalculationFrequency) {
        switch (recalculationFrequency) {
            case loanAdvanced_1.RecalculationCompoundingFrequency.DAILY:
            case loanAdvanced_1.RecalculationRestFrequency.DAILY:
                return PeriodFrequencyType.DAYS;
            case loanAdvanced_1.RecalculationCompoundingFrequency.WEEKLY:
            case loanAdvanced_1.RecalculationRestFrequency.WEEKLY:
                return PeriodFrequencyType.WEEKS;
            case loanAdvanced_1.RecalculationCompoundingFrequency.MONTHLY:
            case loanAdvanced_1.RecalculationRestFrequency.MONTHLY:
                return PeriodFrequencyType.MONTHS;
            default:
                return PeriodFrequencyType.MONTHS;
        }
    }
}
exports.LoanInterestRecalculationService = LoanInterestRecalculationService;
