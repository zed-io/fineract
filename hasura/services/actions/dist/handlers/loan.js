"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loanRoutes = void 0;
const express_1 = require("express");
const loanService_1 = require("../services/loanService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post('/approve', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Approve loan request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.approveLoan)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error approving loan', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/disburse', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Disburse loan request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.disburseLoan)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error disbursing loan', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/repayment', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Loan repayment request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.makeLoanRepayment)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error processing loan repayment', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/writeoff', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Write off loan request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.writeOffLoan)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error writing off loan', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/calculate-schedule', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Calculate loan schedule request received');
        const result = await (0, loanService_1.calculateLoanSchedule)(input);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error calculating loan schedule', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/calculate-prepayment', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Calculate loan prepayment request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.calculatePrepayment)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error calculating loan prepayment', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/calculate-prepayment-benefits', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Calculate loan prepayment benefits request received', { loanId: input.loanId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, loanService_1.calculatePrepaymentBenefits)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error calculating loan prepayment benefits', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
exports.loanRoutes = router;
