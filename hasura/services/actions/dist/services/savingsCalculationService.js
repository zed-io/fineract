"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingsCalculationService = void 0;
const savings_1 = require("../models/savings");
const logger_1 = require("../utils/logger");
/**
 * SavingsCalculationService handles complex savings calculations including:
 * - Interest calculation
 * - Interest posting
 * - Overdraft interest calculation
 * - Handling different interest calculation types and compounding periods
 * - Managing minimum balances and other account criteria
 */
class SavingsCalculationService {
    /**
     * Calculate interest for a savings account
     * @param account The savings account details
     * @param fromDate The start date for calculation (included)
     * @param toDate The end date for calculation (included)
     * @param transactionData Array of account transactions in the period
     * @returns Interest calculation result
     */
    async calculateInterest(account, fromDate, toDate, transactionData) {
        logger_1.logger.info('Calculating interest', {
            accountId: account.id,
            fromDate,
            toDate,
            interestRate: account.nominalAnnualInterestRate
        });
        try {
            // Sort transactions by date
            const sortedTransactions = [...transactionData].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
            // Initialize calculation variables
            const startDate = new Date(fromDate);
            const endDate = new Date(toDate);
            let currentBalance = account.accountBalanceDerived;
            let totalInterestEarned = 0;
            const dailyCalculations = [];
            const currency = account.currencyCode;
            // Determine minimum balance threshold for interest calculation
            const minBalanceForInterest = account.minBalanceForInterestCalculation || 0;
            // Get daily interest rate based on account settings
            const dailyInterestRate = this.getDailyInterestRate(account.nominalAnnualInterestRate, account.interestCalculationDaysInYearType);
            // Iterate through each day in the period
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                // Apply transactions for this day
                const dayTransactions = sortedTransactions.filter(tx => tx.transaction_date === dateString && !tx.is_reversed);
                for (const transaction of dayTransactions) {
                    if (transaction.transaction_type === 'deposit') {
                        currentBalance += transaction.amount;
                    }
                    else if (transaction.transaction_type === 'withdrawal') {
                        currentBalance -= transaction.amount;
                    }
                    // Other transaction types don't affect balance for interest calculation
                }
                // Calculate interest for the day based on the account's calculation type
                let dailyInterest = 0;
                if (currentBalance >= minBalanceForInterest) {
                    if (account.interestCalculationType === savings_1.InterestCalculationType.DAILY_BALANCE) {
                        dailyInterest = this.calculateDailyInterest(currentBalance, dailyInterestRate);
                    }
                    else if (account.interestCalculationType === savings_1.InterestCalculationType.AVERAGE_DAILY_BALANCE) {
                        // For average daily balance, we'll store the balances and calculate at the end
                        // This is simplified here; in a real implementation we would track running average
                        dailyInterest = this.calculateDailyInterest(currentBalance, dailyInterestRate);
                    }
                }
                // Round to account's decimal places
                dailyInterest = this.roundAmount(dailyInterest, account.currencyDigits);
                totalInterestEarned += dailyInterest;
                // Record the daily calculation
                dailyCalculations.push({
                    date: dateString,
                    balance: currentBalance,
                    interestEarned: dailyInterest,
                    cumulativeInterest: totalInterestEarned
                });
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            // Determine next interest posting date
            const nextPostingDate = this.calculateNextInterestPostingDate(new Date(toDate), account.interestPostingPeriodType);
            return {
                savingsAccountId: account.id,
                fromDate,
                toDate,
                interestRate: account.nominalAnnualInterestRate,
                totalInterestEarned: this.roundAmount(totalInterestEarned, account.currencyDigits),
                dailyCalculations,
                accountBalance: currentBalance,
                nextInterestPostingDate: nextPostingDate
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating interest', error);
            throw new Error(`Failed to calculate interest: ${error.message}`);
        }
    }
    /**
     * Apply compounding based on the account's compounding period type
     * @param account The savings account details
     * @param interestToPost Amount of interest to compound
     * @param postingDate Date of the interest posting
     * @returns Compounded interest amount
     */
    applyCompounding(account, interestToPost, postingDate) {
        // If compounding is not enabled or this is not a compounding date, return as is
        if (!this.isCompoundingDate(postingDate, account.interestCompoundingPeriodType)) {
            return interestToPost;
        }
        return interestToPost;
    }
    /**
     * Calculate the next interest posting date based on the current date
     * @param currentDate Current date
     * @param postingPeriodType Interest posting period type
     * @returns Next posting date as ISO string (YYYY-MM-DD)
     */
    calculateNextInterestPostingDate(currentDate, postingPeriodType) {
        const result = new Date(currentDate);
        switch (postingPeriodType) {
            case savings_1.InterestPostingPeriodType.MONTHLY:
                // Move to the end of the current month
                result.setMonth(result.getMonth() + 1);
                result.setDate(0); // Last day of the month
                break;
            case savings_1.InterestPostingPeriodType.QUARTERLY:
                // Calculate quarter end
                const nextQuarterMonth = Math.floor(result.getMonth() / 3) * 3 + 3;
                result.setMonth(nextQuarterMonth);
                result.setDate(0); // Last day of the month
                break;
            case savings_1.InterestPostingPeriodType.BIANNUAL:
                // Calculate next semi-annual date (June 30 or December 31)
                if (result.getMonth() < 6) {
                    result.setMonth(5); // June
                    result.setDate(30);
                }
                else {
                    result.setMonth(11); // December
                    result.setDate(31);
                }
                break;
            case savings_1.InterestPostingPeriodType.ANNUAL:
                // Set to December 31 of current year
                result.setMonth(11); // December
                result.setDate(31);
                break;
            default:
                throw new Error(`Unsupported interest posting period type: ${postingPeriodType}`);
        }
        // If current date is already on or after the calculated date, move to next period
        if (currentDate >= result) {
            switch (postingPeriodType) {
                case savings_1.InterestPostingPeriodType.MONTHLY:
                    result.setMonth(result.getMonth() + 1);
                    break;
                case savings_1.InterestPostingPeriodType.QUARTERLY:
                    result.setMonth(result.getMonth() + 3);
                    break;
                case savings_1.InterestPostingPeriodType.BIANNUAL:
                    result.setMonth(result.getMonth() + 6);
                    break;
                case savings_1.InterestPostingPeriodType.ANNUAL:
                    result.setFullYear(result.getFullYear() + 1);
                    break;
            }
        }
        return result.toISOString().split('T')[0];
    }
    /**
     * Check if the current date is an interest compounding date
     * @param currentDate Current date
     * @param compoundingPeriodType Interest compounding period type
     * @returns Boolean indicating if interest should be compounded
     */
    isCompoundingDate(currentDate, compoundingPeriodType) {
        const date = currentDate.getDate();
        const month = currentDate.getMonth();
        switch (compoundingPeriodType) {
            case savings_1.InterestCompoundingPeriodType.DAILY:
                // Compound every day
                return true;
            case savings_1.InterestCompoundingPeriodType.MONTHLY:
                // Compound on the last day of the month
                const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                return date === lastDay;
            case savings_1.InterestCompoundingPeriodType.QUARTERLY:
                // Compound on the last day of the quarter (March, June, September, December)
                if ((month === 2 || month === 5 || month === 8 || month === 11)) {
                    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                    return date === lastDay;
                }
                return false;
            case savings_1.InterestCompoundingPeriodType.SEMI_ANNUAL:
                // Compound on the last day of the half-year (June, December)
                if (month === 5 || month === 11) {
                    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
                    return date === lastDay;
                }
                return false;
            case savings_1.InterestCompoundingPeriodType.ANNUAL:
                // Compound on the last day of the year (December 31)
                return month === 11 && date === 31;
            default:
                return false;
        }
    }
    /**
     * Calculate daily interest amount
     * @param balance Account balance for the day
     * @param dailyInterestRate Daily interest rate as decimal
     * @returns Interest amount for the day
     */
    calculateDailyInterest(balance, dailyInterestRate) {
        return balance * dailyInterestRate;
    }
    /**
     * Get daily interest rate based on annual rate and days in year setting
     * @param annualInterestRate Annual interest rate (percentage)
     * @param daysInYearType Days in year (360 or 365)
     * @returns Daily interest rate as decimal
     */
    getDailyInterestRate(annualInterestRate, daysInYearType) {
        // Convert annual percentage rate to daily decimal rate
        const annualRateDecimal = annualInterestRate / 100;
        return annualRateDecimal / daysInYearType;
    }
    /**
     * Round amount to specific number of decimal places
     * @param amount Amount to round
     * @param places Number of decimal places
     * @returns Rounded amount
     */
    roundAmount(amount, places) {
        const factor = Math.pow(10, places);
        return Math.round(amount * factor) / factor;
    }
    /**
     * Calculate overdraft interest for a savings account with overdraft facility
     * @param account Savings account details
     * @param fromDate Start date for calculation
     * @param toDate End date for calculation
     * @param transactionData Account transactions in the period
     * @returns Overdraft interest calculation result
     */
    async calculateOverdraftInterest(account, fromDate, toDate, transactionData) {
        // Only apply overdraft interest if overdraft is allowed for the account
        if (!account.allowOverdraft) {
            return 0;
        }
        try {
            // Sort transactions by date
            const sortedTransactions = [...transactionData].sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
            // Initialize calculation variables
            const startDate = new Date(fromDate);
            const endDate = new Date(toDate);
            let currentBalance = account.accountBalanceDerived;
            let totalOverdraftInterest = 0;
            // Get daily overdraft interest rate based on account settings
            const overdraftRate = account.nominalAnnualInterestRateOverdraft || account.nominalAnnualInterestRate;
            const dailyOverdraftRate = this.getDailyInterestRate(overdraftRate, account.interestCalculationDaysInYearType);
            // Minimum overdraft balance that qualifies for interest calculation
            const minOverdraftForInterest = account.minOverdraftForInterestCalculation || 0;
            // Iterate through each day in the period
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                // Apply transactions for this day
                const dayTransactions = sortedTransactions.filter(tx => tx.transaction_date === dateString && !tx.is_reversed);
                for (const transaction of dayTransactions) {
                    if (transaction.transaction_type === 'deposit') {
                        currentBalance += transaction.amount;
                    }
                    else if (transaction.transaction_type === 'withdrawal') {
                        currentBalance -= transaction.amount;
                    }
                    // Other transaction types don't affect balance for interest calculation
                }
                // Calculate overdraft interest if balance is negative and below the minimum threshold
                if (currentBalance < 0 && Math.abs(currentBalance) >= minOverdraftForInterest) {
                    const overdraftAmount = Math.abs(currentBalance);
                    const dailyInterest = this.calculateDailyInterest(overdraftAmount, dailyOverdraftRate);
                    totalOverdraftInterest += this.roundAmount(dailyInterest, account.currencyDigits);
                }
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return this.roundAmount(totalOverdraftInterest, account.currencyDigits);
        }
        catch (error) {
            logger_1.logger.error('Error calculating overdraft interest', error);
            throw new Error(`Failed to calculate overdraft interest: ${error.message}`);
        }
    }
    /**
     * Calculate account summary including interest earned and pending charges
     * @param account Savings account details
     * @param asOfDate Date for the summary calculation
     * @returns Account summary data
     */
    async calculateAccountSummary(account, asOfDate) {
        try {
            // This would typically fetch transaction data and calculate balances
            // For now, we'll return a simplified summary based on account data
            return {
                accountId: account.id,
                accountNo: account.accountNo,
                currencyCode: account.currencyCode,
                accountBalance: account.accountBalanceDerived,
                availableBalance: this.calculateAvailableBalance(account),
                interestEarned: account.totalInterestEarnedDerived,
                interestPosted: account.totalInterestPostedDerived,
                totalDeposits: account.totalDepositsDerived,
                totalWithdrawals: account.totalWithdrawalsDerived,
                totalCharges: account.totalFeeChargeDerived + account.totalPenaltyChargeDerived,
                asOfDate
            };
        }
        catch (error) {
            logger_1.logger.error('Error calculating account summary', error);
            throw new Error(`Failed to calculate account summary: ${error.message}`);
        }
    }
    /**
     * Calculate available balance considering holds, minimum balance requirements, etc.
     * @param account Savings account details
     * @returns Available balance amount
     */
    calculateAvailableBalance(account) {
        let availableBalance = account.accountBalanceDerived;
        // Consider minimum balance requirement if enforced
        if (account.enforceMinRequiredBalance && account.minRequiredBalance) {
            availableBalance -= account.minRequiredBalance;
        }
        // Ensure available balance is not negative unless overdraft is allowed
        if (!account.allowOverdraft && availableBalance < 0) {
            availableBalance = 0;
        }
        return Math.max(0, this.roundAmount(availableBalance, account.currencyDigits));
    }
}
exports.SavingsCalculationService = SavingsCalculationService;
