"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loanAdvancedRoutes = void 0;
const express_1 = require("express");
const validator_1 = require("../utils/validator");
const logger_1 = require("../utils/logger");
const loanCalculationService_1 = require("../services/loanCalculationService");
const loanRepaymentStrategyService_1 = require("../services/loanRepaymentStrategyService");
const loanInterestRecalculationService_1 = require("../services/loanInterestRecalculationService");
const loanChargeService_1 = require("../services/loanChargeService");
const loanWriteOffService_1 = require("../services/loanWriteOffService");
const loanDelinquencyService_1 = require("../services/loanDelinquencyService");
const loanRestructureService_1 = require("../services/loanRestructureService");
const loanInterestPauseService_1 = require("../services/loanInterestPauseService");
// Create router instance
exports.loanAdvancedRoutes = (0, express_1.Router)();
// Initialize services
const loanCalculationService = new loanCalculationService_1.LoanCalculationService();
const loanRepaymentStrategyService = new loanRepaymentStrategyService_1.LoanRepaymentStrategyService();
const loanInterestRecalculationService = new loanInterestRecalculationService_1.LoanInterestRecalculationService();
const loanChargeService = new loanChargeService_1.LoanChargeService();
const loanWriteOffService = new loanWriteOffService_1.LoanWriteOffService();
const loanDelinquencyService = new loanDelinquencyService_1.LoanDelinquencyService();
const loanRestructureService = new loanRestructureService_1.LoanRestructureService();
const loanInterestPauseService = new loanInterestPauseService_1.LoanInterestPauseService();
// Get available repayment strategies endpoint
exports.loanAdvancedRoutes.get('/repayment-strategies', async (req, res) => {
    try {
        const strategies = loanRepaymentStrategyService.getAvailableRepaymentStrategies();
        res.json({
            strategies,
            defaultStrategy: loanRepaymentStrategyService.getDefaultRepaymentStrategy()
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting repayment strategies', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get repayment strategies'
        });
    }
});
// Add loan charge endpoint
exports.loanAdvancedRoutes.post('/charges/add', (0, validator_1.validateRequest)(['loanId', 'chargeId', 'amount']), async (req, res) => {
    try {
        const { loanId, chargeId, amount, name, dueDate, currencyCode, chargeTimeType, chargeCalculationType, isPenalty, percentage } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const chargeId = await loanChargeService.addCharge(loanId, {
            chargeId,
            name,
            amount,
            dueDate,
            currencyCode,
            chargeTimeType,
            chargeCalculationType,
            isPenalty,
            percentage
        }, userId);
        res.json({
            success: true,
            message: 'Charge added successfully',
            chargeId
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding charge', { error });
        res.status(500).json({
            success: false,
            message: `Failed to add charge: ${error.message}`
        });
    }
});
// Waive loan charge endpoint
exports.loanAdvancedRoutes.post('/charges/waive', (0, validator_1.validateRequest)(['loanId', 'chargeId']), async (req, res) => {
    try {
        const { loanId, chargeId } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const success = await loanChargeService.waiveCharge(loanId, chargeId, userId);
        res.json({
            success,
            message: success ? 'Charge waived successfully' : 'Charge could not be waived'
        });
    }
    catch (error) {
        logger_1.logger.error('Error waiving charge', { error });
        res.status(500).json({
            success: false,
            message: `Failed to waive charge: ${error.message}`
        });
    }
});
// Write off loan endpoint
exports.loanAdvancedRoutes.post('/write-off', (0, validator_1.validateRequest)(['loanId', 'writeOffDate', 'writeOffStrategy']), async (req, res) => {
    try {
        const { loanId, writeOffDate, writeOffStrategy, writeOffAmount, writeOffReasonId, writeOffReasonComment, reference } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const transactionId = await loanWriteOffService.writeLoanOff(loanId, {
            writeOffDate,
            writeOffStrategy,
            writeOffAmount,
            writeOffReasonId,
            writeOffReasonComment,
            reference
        }, userId);
        res.json({
            success: true,
            message: 'Loan written off successfully',
            transactionId
        });
    }
    catch (error) {
        logger_1.logger.error('Error writing off loan', { error });
        res.status(500).json({
            success: false,
            message: `Failed to write off loan: ${error.message}`
        });
    }
});
// Undo loan write-off endpoint
exports.loanAdvancedRoutes.post('/undo-write-off', (0, validator_1.validateRequest)(['loanId', 'transactionId']), async (req, res) => {
    try {
        const { loanId, transactionId, note } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const success = await loanWriteOffService.undoLoanWriteOff(loanId, transactionId, userId, note);
        res.json({
            success,
            message: success ? 'Write-off reversed successfully' : 'Failed to reverse write-off'
        });
    }
    catch (error) {
        logger_1.logger.error('Error undoing write-off', { error });
        res.status(500).json({
            success: false,
            message: `Failed to undo write-off: ${error.message}`
        });
    }
});
// Get loan write-off history endpoint
exports.loanAdvancedRoutes.post('/write-off-history', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId } = req.body.input;
        const history = await loanWriteOffService.getWriteOffHistory(loanId);
        res.json({
            success: true,
            history
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting write-off history', { error });
        res.status(500).json({
            success: false,
            message: `Failed to get write-off history: ${error.message}`
        });
    }
});
// Process loan delinquency endpoint
exports.loanAdvancedRoutes.post('/process-delinquency', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId, force } = req.body.input;
        const delinquency = await loanDelinquencyService.processDelinquency(loanId, force);
        res.json({
            success: true,
            isDelinquent: !!delinquency,
            delinquency
        });
    }
    catch (error) {
        logger_1.logger.error('Error processing delinquency', { error });
        res.status(500).json({
            success: false,
            message: `Failed to process delinquency: ${error.message}`
        });
    }
});
// Get loan delinquency history endpoint
exports.loanAdvancedRoutes.post('/delinquency-history', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId } = req.body.input;
        const history = await loanDelinquencyService.getDelinquencyHistory(loanId);
        res.json({
            success: true,
            history
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting delinquency history', { error });
        res.status(500).json({
            success: false,
            message: `Failed to get delinquency history: ${error.message}`
        });
    }
});
// Create loan restructure request endpoint
exports.loanAdvancedRoutes.post('/restructure/create', (0, validator_1.validateRequest)(['sourceLoanId', 'restructureType', 'rescheduleFromDate', 'submittedOnDate', 'reasonForReschedule']), async (req, res) => {
    try {
        const restructureData = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const restructureId = await loanRestructureService.createRestructureRequest(restructureData, userId);
        res.json({
            success: true,
            message: 'Restructure request created successfully',
            restructureId
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating restructure request', { error });
        res.status(500).json({
            success: false,
            message: `Failed to create restructure request: ${error.message}`
        });
    }
});
// Approve loan restructure endpoint
exports.loanAdvancedRoutes.post('/restructure/approve', (0, validator_1.validateRequest)(['restructureId', 'approvalDate']), async (req, res) => {
    try {
        const { restructureId, approvalDate } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const success = await loanRestructureService.approveRestructure(restructureId, userId, approvalDate);
        res.json({
            success,
            message: success ? 'Restructure approved successfully' : 'Failed to approve restructure'
        });
    }
    catch (error) {
        logger_1.logger.error('Error approving restructure', { error });
        res.status(500).json({
            success: false,
            message: `Failed to approve restructure: ${error.message}`
        });
    }
});
// Reject loan restructure endpoint
exports.loanAdvancedRoutes.post('/restructure/reject', (0, validator_1.validateRequest)(['restructureId', 'rejectionReason']), async (req, res) => {
    try {
        const { restructureId, rejectionReason } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const success = await loanRestructureService.rejectRestructure(restructureId, userId, rejectionReason);
        res.json({
            success,
            message: success ? 'Restructure rejected successfully' : 'Failed to reject restructure'
        });
    }
    catch (error) {
        logger_1.logger.error('Error rejecting restructure', { error });
        res.status(500).json({
            success: false,
            message: `Failed to reject restructure: ${error.message}`
        });
    }
});
// Get loan restructure history endpoint
exports.loanAdvancedRoutes.post('/restructure/history', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId } = req.body.input;
        const history = await loanRestructureService.getLoanRestructureHistory(loanId);
        res.json({
            success: true,
            history
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting restructure history', { error });
        res.status(500).json({
            success: false,
            message: `Failed to get restructure history: ${error.message}`
        });
    }
});
// Create interest pause endpoint
exports.loanAdvancedRoutes.post('/interest-pause/create', (0, validator_1.validateRequest)(['loanId', 'startDate', 'endDate']), async (req, res) => {
    try {
        const { loanId, startDate, endDate, reasonId, reasonComment } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const pauseId = await loanInterestPauseService.createInterestPause(loanId, startDate, endDate, reasonId, reasonComment, userId);
        res.json({
            success: true,
            message: 'Interest pause created successfully',
            pauseId
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating interest pause', { error });
        res.status(500).json({
            success: false,
            message: `Failed to create interest pause: ${error.message}`
        });
    }
});
// Cancel interest pause endpoint
exports.loanAdvancedRoutes.post('/interest-pause/cancel', (0, validator_1.validateRequest)(['pauseId']), async (req, res) => {
    try {
        const { pauseId, cancellationReason } = req.body.input;
        const userId = req.body.session_variables['x-hasura-user-id'];
        const success = await loanInterestPauseService.cancelInterestPause(pauseId, userId, cancellationReason);
        res.json({
            success,
            message: success ? 'Interest pause cancelled successfully' : 'Failed to cancel interest pause'
        });
    }
    catch (error) {
        logger_1.logger.error('Error cancelling interest pause', { error });
        res.status(500).json({
            success: false,
            message: `Failed to cancel interest pause: ${error.message}`
        });
    }
});
// Get interest pause periods endpoint
exports.loanAdvancedRoutes.post('/interest-pause/list', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId, activeOnly } = req.body.input;
        const periods = await loanInterestPauseService.getInterestPausePeriods(loanId, activeOnly);
        res.json({
            success: true,
            periods
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting interest pause periods', { error });
        res.status(500).json({
            success: false,
            message: `Failed to get interest pause periods: ${error.message}`
        });
    }
});
// Calculate total interest-free days endpoint
exports.loanAdvancedRoutes.post('/interest-pause/total-days', (0, validator_1.validateRequest)(['loanId']), async (req, res) => {
    try {
        const { loanId } = req.body.input;
        const totalDays = await loanInterestPauseService.calculateTotalInterestFreeDays(loanId);
        res.json({
            success: true,
            totalDays
        });
    }
    catch (error) {
        logger_1.logger.error('Error calculating total interest-free days', { error });
        res.status(500).json({
            success: false,
            message: `Failed to calculate total interest-free days: ${error.message}`
        });
    }
});
// Apply payment allocation strategy endpoint
exports.loanAdvancedRoutes.post('/payment-allocation', (0, validator_1.validateRequest)(['loanId', 'paymentAmount', 'repaymentStrategy']), async (req, res) => {
    try {
        const { loanId, paymentAmount, currency, repaymentStrategy } = req.body.input;
        // Get schedule periods for the loan
        const scheduleResult = await db.query(`SELECT s.id, s.loan_id, s.installment_number, s.from_date, s.due_date, 
       s.principal_amount as principal_due, s.principal_completed_derived as principal_paid,
       s.interest_amount as interest_due, s.interest_completed_derived as interest_paid,
       s.fee_charges_amount as fee_charges_due, s.fee_charges_completed_derived as fee_charges_paid,
       s.penalty_charges_amount as penalty_charges_due, s.penalty_charges_completed_derived as penalty_charges_paid,
       s.principal_writtenoff_derived as principal_written_off,
       s.interest_writtenoff_derived as interest_written_off,
       s.fee_charges_writtenoff_derived as fee_charges_written_off,
       s.penalty_charges_writtenoff_derived as penalty_charges_written_off,
       s.completed_derived as complete,
       l.currency_code
       FROM m_loan_repayment_schedule s
       JOIN loan l ON s.loan_id = l.id
       WHERE s.loan_id = $1
       AND s.is_active = true
       AND s.completed_derived = false
       ORDER BY s.installment_number`, [loanId]);
        if (scheduleResult.rowCount === 0) {
            return res.json({
                success: false,
                message: 'No outstanding installments found'
            });
        }
        // Convert to LoanSchedulePeriod format
        const schedulePeriods = scheduleResult.rows.map(row => ({
            periodNumber: row.installment_number,
            periodType: 'repayment',
            fromDate: row.from_date,
            dueDate: row.due_date,
            principalDisbursed: 0,
            principalLoanBalanceOutstanding: 0, // Will be calculated later
            principalOriginalDue: row.principal_due,
            principalDue: row.principal_due,
            principalPaid: row.principal_paid,
            principalWrittenOff: row.principal_written_off,
            principalOutstanding: row.principal_due - row.principal_paid - row.principal_written_off,
            interestOriginalDue: row.interest_due,
            interestDue: row.interest_due,
            interestPaid: row.interest_paid,
            interestWaived: 0,
            interestWrittenOff: row.interest_written_off,
            interestOutstanding: row.interest_due - row.interest_paid - row.interest_written_off,
            feeChargesDue: row.fee_charges_due,
            feeChargesPaid: row.fee_charges_paid,
            feeChargesWaived: 0,
            feeChargesWrittenOff: row.fee_charges_written_off,
            feeChargesOutstanding: row.fee_charges_due - row.fee_charges_paid - row.fee_charges_written_off,
            penaltyChargesDue: row.penalty_charges_due,
            penaltyChargesPaid: row.penalty_charges_paid,
            penaltyChargesWaived: 0,
            penaltyChargesWrittenOff: row.penalty_charges_written_off,
            penaltyChargesOutstanding: row.penalty_charges_due - row.penalty_charges_paid - row.penalty_charges_written_off,
            totalOriginalDueForPeriod: row.principal_due + row.interest_due + row.fee_charges_due + row.penalty_charges_due,
            totalDueForPeriod: row.principal_due + row.interest_due + row.fee_charges_due + row.penalty_charges_due,
            totalPaidForPeriod: row.principal_paid + row.interest_paid + row.fee_charges_paid + row.penalty_charges_paid,
            totalWaivedForPeriod: 0,
            totalWrittenOffForPeriod: row.principal_written_off + row.interest_written_off + row.fee_charges_written_off + row.penalty_charges_written_off,
            totalOutstandingForPeriod: (row.principal_due - row.principal_paid - row.principal_written_off) +
                (row.interest_due - row.interest_paid - row.interest_written_off) +
                (row.fee_charges_due - row.fee_charges_paid - row.fee_charges_written_off) +
                (row.penalty_charges_due - row.penalty_charges_paid - row.penalty_charges_written_off),
            totalActualCostOfLoanForPeriod: row.interest_due,
            totalInstallmentAmountForPeriod: row.principal_due + row.interest_due + row.fee_charges_due + row.penalty_charges_due,
            complete: row.complete,
        }));
        // Apply payment allocation strategy
        const currencyCode = currency || scheduleResult.rows[0].currency_code;
        const allocationResult = loanRepaymentStrategyService.allocatePayment(loanId, paymentAmount, currencyCode, repaymentStrategy, schedulePeriods);
        res.json({
            success: true,
            allocation: allocationResult
        });
    }
    catch (error) {
        logger_1.logger.error('Error applying payment allocation', { error });
        res.status(500).json({
            success: false,
            message: `Failed to apply payment allocation: ${error.message}`
        });
    }
});
exports.default = exports.loanAdvancedRoutes;
