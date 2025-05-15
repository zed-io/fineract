"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingsRoutes = void 0;
const express_1 = require("express");
const savingsService_1 = require("../services/savingsService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post('/approve', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Approve savings account request received', { accountId: input.accountId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, savingsService_1.approveSavingsAccount)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error approving savings account', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/activate', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Activate savings account request received', { accountId: input.accountId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, savingsService_1.activateSavingsAccount)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error activating savings account', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/deposit', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Savings deposit request received', { accountId: input.accountId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, savingsService_1.depositToSavings)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error processing savings deposit', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/withdraw', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Savings withdrawal request received', { accountId: input.accountId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, savingsService_1.withdrawFromSavings)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error processing savings withdrawal', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/post-interest', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Post interest request received');
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, savingsService_1.postInterestToSavings)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error posting interest', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/calculate-interest', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Calculate interest request received', { accountId: input.accountId });
        const result = await (0, savingsService_1.calculateSavingsInterest)(input);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error calculating interest', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
exports.savingsRoutes = router;
