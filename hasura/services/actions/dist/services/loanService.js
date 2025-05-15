"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveLoan = approveLoan;
exports.disburseLoan = disburseLoan;
exports.makeLoanRepayment = makeLoanRepayment;
exports.writeOffLoan = writeOffLoan;
exports.calculateLoanSchedule = calculateLoanSchedule;
exports.calculatePrepayment = calculatePrepayment;
exports.calculatePrepaymentBenefits = calculatePrepaymentBenefits;
const decimal_js_1 = __importDefault(require("decimal.js"));
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const loanRepository_1 = require("../repositories/loanRepository");
const loanCalculationService_1 = require("./loanCalculationService");
// Initialize the loan calculation service
const loanCalculationService = new loanCalculationService_1.LoanCalculationService();
async function approveLoan(input, userId) {
    const { loanId, approvedOnDate, approvedAmount, note } = input;
    logger_1.logger.info('Approving loan', { loanId, approvedOnDate, userId });
    return db_1.db.transaction(async (client) => {
        // Get loan details
        const loan = await (0, loanRepository_1.getLoanById)(client, loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }
        // Validate loan status
        if (loan.loan_status !== 'submitted_and_pending_approval') {
            throw new Error(`Cannot approve loan with status ${loan.loan_status}`);
        }
        // Update loan status and approval details
        const finalApprovedAmount = approvedAmount || loan.principal_amount;
        await (0, loanRepository_1.updateLoanStatus)(client, loanId, 'approved', userId, approvedOnDate, {
            approved_principal: finalApprovedAmount,
            approved_on_date: approvedOnDate,
            approved_by_user_id: userId
        });
        // Return success response
        return {
            success: true,
            loanId,
            message: 'Loan approved successfully',
            approvedOnDate,
            approvedAmount: finalApprovedAmount
        };
    });
}
async function disburseLoan(input, userId) {
    const { loanId, disbursementDate, paymentTypeId, transactionAmount, note, receiptNumber, checkNumber, routingCode, bankNumber, accountNumber } = input;
    logger_1.logger.info('Disbursing loan', { loanId, disbursementDate, userId });
    return db_1.db.transaction(async (client) => {
        // Get loan details
        const loan = await (0, loanRepository_1.getLoanById)(client, loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }
        // Validate loan status
        if (loan.loan_status !== 'approved') {
            throw new Error(`Cannot disburse loan with status ${loan.loan_status}`);
        }
        // Create payment details if provided
        let paymentDetailId = null;
        if (paymentTypeId) {
            paymentDetailId = await (0, loanRepository_1.createPaymentDetail)(client, {
                paymentTypeId,
                accountNumber,
                checkNumber,
                routingCode,
                receiptNumber,
                bankNumber
            });
        }
        // Create disbursement transaction
        const finalAmount = transactionAmount || loan.approved_principal;
        const transactionId = await (0, loanRepository_1.createLoanTransaction)(client, {
            loanId,
            paymentDetailId,
            transactionType: 'disbursement',
            transactionDate: disbursementDate,
            amount: finalAmount,
            submittedOnDate: disbursementDate,
            submittedByUserId: userId,
            note
        });
        // Update loan status and disbursement details
        const expectedMaturityDate = calculateMaturityDate(disbursementDate, loan.term_frequency, loan.term_frequency_type);
        await (0, loanRepository_1.updateLoanStatus)(client, loanId, 'active', userId, disbursementDate, {
            disbursed_on_date: disbursementDate,
            disbursed_by_user_id: userId,
            expected_maturity_date: expectedMaturityDate,
            principal_disbursed_derived: finalAmount,
            principal_outstanding_derived: finalAmount
        });
        // Return success response
        return {
            success: true,
            loanId,
            message: 'Loan disbursed successfully',
            transactionId,
            disbursementDate,
            disbursedAmount: finalAmount
        };
    });
}
async function makeLoanRepayment(input, userId) {
    const { loanId, transactionDate, transactionAmount, paymentTypeId, note, receiptNumber, checkNumber, routingCode, bankNumber, accountNumber } = input;
    logger_1.logger.info('Processing loan repayment', { loanId, transactionDate, transactionAmount, userId });
    return db_1.db.transaction(async (client) => {
        // Get loan details
        const loan = await (0, loanRepository_1.getLoanById)(client, loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }
        // Validate loan status
        if (loan.loan_status !== 'active') {
            throw new Error(`Cannot make repayment for loan with status ${loan.loan_status}`);
        }
        // Create payment details if provided
        let paymentDetailId = null;
        if (paymentTypeId) {
            paymentDetailId = await (0, loanRepository_1.createPaymentDetail)(client, {
                paymentTypeId,
                accountNumber,
                checkNumber,
                routingCode,
                receiptNumber,
                bankNumber
            });
        }
        // Calculate allocation of payment
        const { principalPortion, interestPortion, feePortion, penaltyPortion, overpaymentPortion } = calculatePaymentAllocation(loan, transactionAmount);
        // Create repayment transaction
        const transactionId = await (0, loanRepository_1.createLoanTransaction)(client, {
            loanId,
            paymentDetailId,
            transactionType: 'repayment',
            transactionDate,
            amount: transactionAmount,
            principalPortion,
            interestPortion,
            feeChargesPortion: feePortion,
            penaltyChargesPortion: penaltyPortion,
            overpaymentPortion,
            submittedOnDate: transactionDate,
            submittedByUserId: userId,
            note
        });
        // Update loan balances
        const outstandingBalance = calculateOutstandingBalance(loan, principalPortion, interestPortion, feePortion, penaltyPortion);
        await (0, loanRepository_1.updateLoanBalances)(client, loanId, {
            principalPaid: principalPortion,
            interestPaid: interestPortion,
            feesPaid: feePortion,
            penaltiesPaid: penaltyPortion,
            outstandingBalance
        });
        // Check if loan is fully paid
        if (outstandingBalance <= 0) {
            await (0, loanRepository_1.updateLoanStatus)(client, loanId, 'closed_obligations_met', userId, transactionDate, {
                closed_on_date: transactionDate,
                closed_by_user_id: userId
            });
        }
        // Return success response
        return {
            success: true,
            loanId,
            message: 'Loan repayment processed successfully',
            transactionId,
            transactionDate,
            amount: transactionAmount,
            principalPortion,
            interestPortion,
            feesPortion: feePortion,
            penaltyPortion,
            outstandingBalance
        };
    });
}
async function writeOffLoan(input, userId) {
    const { loanId, transactionDate, note } = input;
    logger_1.logger.info('Writing off loan', { loanId, transactionDate, userId });
    return db_1.db.transaction(async (client) => {
        // Get loan details
        const loan = await (0, loanRepository_1.getLoanById)(client, loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }
        // Validate loan status
        if (loan.loan_status !== 'active') {
            throw new Error(`Cannot write off loan with status ${loan.loan_status}`);
        }
        // Calculate write-off amount (remaining balance)
        const writeOffAmount = new decimal_js_1.default(loan.total_outstanding_derived).toNumber();
        // Create write-off transaction
        const transactionId = await (0, loanRepository_1.createLoanTransaction)(client, {
            loanId,
            transactionType: 'writeoff',
            transactionDate,
            amount: writeOffAmount,
            submittedOnDate: transactionDate,
            submittedByUserId: userId,
            note
        });
        // Update loan status
        await (0, loanRepository_1.updateLoanStatus)(client, loanId, 'closed_written_off', userId, transactionDate, {
            written_off_on_date: transactionDate,
            written_off_by_user_id: userId,
            principal_writtenoff_derived: loan.principal_outstanding_derived,
            interest_writtenoff_derived: loan.interest_outstanding_derived,
            fee_charges_writtenoff_derived: loan.fee_charges_outstanding_derived,
            penalty_charges_writtenoff_derived: loan.penalty_charges_outstanding_derived,
            total_writtenoff_derived: writeOffAmount,
            total_outstanding_derived: 0
        });
        // Return success response
        return {
            success: true,
            loanId,
            message: 'Loan written off successfully',
            transactionId,
            writeOffDate: transactionDate,
            writeOffAmount
        };
    });
}
async function calculateLoanSchedule(input) {
    const { productId, principalAmount, numberOfRepayments, interestRatePerPeriod, disbursementDate, repaymentEvery, repaymentFrequencyType, interestType, amortizationType, termFrequency, termFrequencyType, graceOnPrincipal, graceOnInterest, graceOnInterestCharged, submittedOnDate } = input;
    logger_1.logger.info('Calculating loan schedule', {
        productId,
        principalAmount,
        numberOfRepayments
    });
    try {
        // Get product details for currency
        const productQuery = await db_1.db.query('SELECT currency_code FROM fineract_default.loan_product WHERE id = $1', [productId]);
        if (productQuery.rows.length === 0) {
            throw new Error('Loan product not found');
        }
        const currency = productQuery.rows[0].currency_code;
        // Create loan application terms
        const loanApplicationTerms = {
            principalAmount: principalAmount,
            currency: currency,
            loanTermFrequency: termFrequency,
            loanTermFrequencyType: termFrequencyType,
            numberOfRepayments: numberOfRepayments,
            repaymentEvery: repaymentEvery,
            repaymentFrequencyType: repaymentFrequencyType,
            interestRatePerPeriod: interestRatePerPeriod,
            interestMethod: interestType,
            amortizationMethod: amortizationType,
            expectedDisbursementDate: disbursementDate,
            submittedOnDate: submittedOnDate || new Date().toISOString().split('T')[0],
            graceOnPrincipalPayment: graceOnPrincipal || 0,
            graceOnInterestPayment: graceOnInterest || 0,
            graceOnInterestCharged: graceOnInterestCharged || 0
        };
        // Generate schedule using the calculation service
        const schedule = await loanCalculationService.generateRepaymentSchedule(loanApplicationTerms);
        // Format for compatibility with existing callers
        const periods = schedule.periods
            .filter(period => period.periodType === 'repayment')
            .map(period => ({
            periodNumber: period.periodNumber,
            fromDate: period.fromDate,
            dueDate: period.dueDate,
            principalAmount: period.principalOriginalDue,
            interestAmount: period.interestOriginalDue,
            feeAmount: period.feeChargesDue,
            penaltyAmount: period.penaltyChargesDue,
            totalDue: period.totalOriginalDueForPeriod,
            outstandingBalance: period.principalLoanBalanceOutstanding
        }));
        return {
            success: true,
            currency,
            loanTermInDays: schedule.loanTermInDays,
            periods,
            totalPrincipal: schedule.totalPrincipal,
            totalInterest: schedule.totalInterest,
            totalFees: schedule.totalFeeCharges,
            totalPenalties: schedule.totalPenaltyCharges,
            totalRepayment: schedule.totalRepaymentExpected
        };
    }
    catch (error) {
        logger_1.logger.error('Error calculating loan schedule', { error });
        return {
            success: false,
            message: error.message
        };
    }
}
// Helper functions
function calculateMaturityDate(disbursementDate, termFrequency, termFrequencyType) {
    const date = new Date(disbursementDate);
    switch (termFrequencyType) {
        case 'days':
            date.setDate(date.getDate() + termFrequency);
            break;
        case 'weeks':
            date.setDate(date.getDate() + (termFrequency * 7));
            break;
        case 'months':
            date.setMonth(date.getMonth() + termFrequency);
            break;
        default:
            throw new Error(`Unsupported term frequency type: ${termFrequencyType}`);
    }
    return date.toISOString().split('T')[0];
}
function calculatePaymentAllocation(loan, paymentAmount) {
    // This is a simplified allocation algorithm
    // In a real implementation, you would use the loan's repayment strategy
    let remainingAmount = new decimal_js_1.default(paymentAmount);
    const principalOutstanding = new decimal_js_1.default(loan.principal_outstanding_derived);
    const interestOutstanding = new decimal_js_1.default(loan.interest_outstanding_derived);
    const feesOutstanding = new decimal_js_1.default(loan.fee_charges_outstanding_derived);
    const penaltiesOutstanding = new decimal_js_1.default(loan.penalty_charges_outstanding_derived);
    // First to penalties
    const penaltyPortion = decimal_js_1.default.min(remainingAmount, penaltiesOutstanding);
    remainingAmount = remainingAmount.minus(penaltyPortion);
    // Then to fees
    const feePortion = decimal_js_1.default.min(remainingAmount, feesOutstanding);
    remainingAmount = remainingAmount.minus(feePortion);
    // Then to interest
    const interestPortion = decimal_js_1.default.min(remainingAmount, interestOutstanding);
    remainingAmount = remainingAmount.minus(interestPortion);
    // Then to principal
    const principalPortion = decimal_js_1.default.min(remainingAmount, principalOutstanding);
    remainingAmount = remainingAmount.minus(principalPortion);
    // Anything left is overpayment
    const overpaymentPortion = remainingAmount;
    return {
        principalPortion: principalPortion.toNumber(),
        interestPortion: interestPortion.toNumber(),
        feePortion: feePortion.toNumber(),
        penaltyPortion: penaltyPortion.toNumber(),
        overpaymentPortion: overpaymentPortion.toNumber()
    };
}
function calculateOutstandingBalance(loan, principalPaid, interestPaid, feesPaid, penaltiesPaid) {
    const principalOutstanding = new decimal_js_1.default(loan.principal_outstanding_derived).minus(principalPaid);
    const interestOutstanding = new decimal_js_1.default(loan.interest_outstanding_derived).minus(interestPaid);
    const feesOutstanding = new decimal_js_1.default(loan.fee_charges_outstanding_derived).minus(feesPaid);
    const penaltiesOutstanding = new decimal_js_1.default(loan.penalty_charges_outstanding_derived).minus(penaltiesPaid);
    return principalOutstanding
        .plus(interestOutstanding)
        .plus(feesOutstanding)
        .plus(penaltiesOutstanding)
        .toNumber();
}
/**
 * Calculate prepayment amount for a loan
 * Uses the loan calculation service to determine the full prepayment amount
 *
 * @param input The input containing loanId and prepayment date
 * @param userId The ID of the user making the request
 * @returns Prepayment details including breakdown of payment portions
 */
async function calculatePrepayment(input, userId) {
    const { loanId, transactionDate, paymentAmount, includeEarlyPaymentPenalty = true } = input;
    logger_1.logger.info('Calculating prepayment amount', { loanId, transactionDate, userId });
    try {
        // Fetch loan details
        const loanQuery = await db_1.db.query(`SELECT
        l.*,
        lp.early_repayment_penalty_applicable,
        lp.early_repayment_penalty_percentage
      FROM
        fineract_default.loan l
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE
        l.id = $1`, [loanId]);
        if (loanQuery.rows.length === 0) {
            throw new Error('Loan not found');
        }
        const loan = loanQuery.rows[0];
        // Validate loan status
        if (loan.loan_status !== 'active') {
            throw new Error(`Cannot calculate prepayment for loan with status ${loan.loan_status}`);
        }
        // Calculate prepayment using the loan calculation service
        const prepayment = await loanCalculationService.calculatePrepaymentAmount(loan, transactionDate, paymentAmount, includeEarlyPaymentPenalty);
        return {
            success: true,
            loanId,
            prepaymentBreakdown: {
                principalPortion: prepayment.principalPortion,
                interestPortion: prepayment.interestPortion,
                feeChargesPortion: prepayment.feeChargesPortion,
                penaltyChargesPortion: prepayment.penaltyChargesPortion,
                totalPrepaymentAmount: prepayment.totalPrepaymentAmount,
                transactionDate: prepayment.transactionDate,
                additionalPrincipalRequired: prepayment.additionalPrincipalRequired || 0
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Error calculating prepayment amount', { error, loanId });
        return {
            success: false,
            message: error.message
        };
    }
}
/**
 * Calculate the benefits of early repayment
 * Helps borrowers understand potential interest savings
 *
 * @param input The input containing loanId and prepayment date
 * @param userId The ID of the user making the request
 * @returns Details of potential interest savings and time savings
 */
async function calculatePrepaymentBenefits(input, userId) {
    const { loanId, transactionDate } = input;
    logger_1.logger.info('Calculating prepayment benefits', { loanId, transactionDate, userId });
    try {
        // Fetch loan details
        const loanQuery = await db_1.db.query(`SELECT
        l.*,
        lp.early_repayment_penalty_applicable,
        lp.early_repayment_penalty_percentage
      FROM
        fineract_default.loan l
      JOIN
        fineract_default.loan_product lp ON l.product_id = lp.id
      WHERE
        l.id = $1`, [loanId]);
        if (loanQuery.rows.length === 0) {
            throw new Error('Loan not found');
        }
        const loan = loanQuery.rows[0];
        // Validate loan status
        if (loan.loan_status !== 'active') {
            throw new Error(`Cannot calculate prepayment benefits for loan with status ${loan.loan_status}`);
        }
        // Calculate benefits using the loan calculation service
        const benefits = await loanCalculationService.calculateEarlyRepaymentBenefits(loan, transactionDate);
        return {
            success: true,
            loanId,
            benefits: {
                originalLoanEndDate: benefits.originalLoanEndDate,
                proposedPrepaymentDate: benefits.proposedPrepaymentDate,
                totalScheduledInterest: benefits.totalScheduledInterest,
                interestPaidToDate: benefits.interestPaidToDate,
                remainingInterestToPay: benefits.remainingInterestToPay,
                interestSavings: benefits.interestSavings,
                daysSaved: benefits.daysSaved,
                paymentsRemaining: benefits.paymentsRemaining
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Error calculating prepayment benefits', { error, loanId });
        return {
            success: false,
            message: error.message
        };
    }
}
function generateLoanSchedule(principalAmount, numberOfRepayments, interestRatePerPeriod, disbursementDate, repaymentEvery, repaymentFrequencyType, interestType, amortizationType, graceOnPrincipal = 0, graceOnInterest = 0) {
    // This is a simplified schedule generation
    // In a real implementation, you would need to handle more complex scenarios
    const principal = new decimal_js_1.default(principalAmount);
    const rate = new decimal_js_1.default(interestRatePerPeriod).dividedBy(100);
    const periods = [];
    let outstandingBalance = principal;
    let date = new Date(disbursementDate);
    // Calculate equal installment amount for equal installment loans
    let installmentAmount;
    if (amortizationType === 'equal_installments') {
        // PMT formula
        const effectiveRepayments = numberOfRepayments - graceOnPrincipal;
        installmentAmount = calculatePmt(rate, effectiveRepayments, principal.negated(), 0, 0);
    }
    for (let i = 1; i <= numberOfRepayments; i++) {
        // Calculate due date
        date = advanceDate(date, repaymentEvery, repaymentFrequencyType);
        const dueDate = date.toISOString().split('T')[0];
        // Calculate interest
        let interestAmount;
        if (interestType === 'declining_balance') {
            interestAmount = outstandingBalance.times(rate);
        }
        else if (interestType === 'flat') {
            interestAmount = principal.times(rate).dividedBy(numberOfRepayments);
        }
        else {
            interestAmount = new decimal_js_1.default(0);
        }
        // Apply grace on interest
        if (i <= graceOnInterest) {
            interestAmount = new decimal_js_1.default(0);
        }
        // Calculate principal portion
        let principalAmount;
        if (amortizationType === 'equal_installments') {
            if (i <= graceOnPrincipal) {
                principalAmount = new decimal_js_1.default(0);
            }
            else {
                principalAmount = installmentAmount.minus(interestAmount);
            }
        }
        else if (amortizationType === 'equal_principal') {
            if (i <= graceOnPrincipal) {
                principalAmount = new decimal_js_1.default(0);
            }
            else {
                principalAmount = principal.dividedBy(numberOfRepayments - graceOnPrincipal);
            }
        }
        else {
            principalAmount = new decimal_js_1.default(0);
        }
        // Ensure we don't overpay
        if (principalAmount.greaterThan(outstandingBalance)) {
            principalAmount = outstandingBalance;
        }
        // Update outstanding balance
        outstandingBalance = outstandingBalance.minus(principalAmount);
        // Add period to schedule
        periods.push({
            periodNumber: i,
            fromDate: i === 1 ? disbursementDate : periods[i - 2].dueDate,
            dueDate,
            principalAmount: principalAmount.toNumber(),
            interestAmount: interestAmount.toNumber(),
            feeAmount: 0,
            penaltyAmount: 0,
            totalDue: principalAmount.plus(interestAmount).toNumber(),
            outstandingBalance: outstandingBalance.toNumber()
        });
    }
    return periods;
}
function advanceDate(date, units, frequencyType) {
    const newDate = new Date(date);
    switch (frequencyType) {
        case 'days':
            newDate.setDate(newDate.getDate() + units);
            break;
        case 'weeks':
            newDate.setDate(newDate.getDate() + (units * 7));
            break;
        case 'months':
            newDate.setMonth(newDate.getMonth() + units);
            break;
        default:
            throw new Error(`Unsupported frequency type: ${frequencyType}`);
    }
    return newDate;
}
function calculatePmt(rate, nper, pv, fv = 0, type = 0) {
    // PMT formula: PMT = (PV * r * (1+r)^n) / ((1+r)^n - 1)
    const rateDecimal = rate;
    if (rateDecimal.equals(0)) {
        return pv.negated().dividedBy(nper);
    }
    const pvif = new decimal_js_1.default(1).plus(rateDecimal).pow(nper);
    let pmt = rateDecimal.times(pv.times(pvif).minus(fv)).dividedBy(pvif.minus(1));
    if (type === 1) {
        pmt = pmt.dividedBy(new decimal_js_1.default(1).plus(rateDecimal));
    }
    return pmt;
}
