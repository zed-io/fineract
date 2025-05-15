"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingRoutes = void 0;
const express_1 = require("express");
const journalEntryService_1 = require("../services/journalEntryService");
const productAccountMappingService_1 = require("../services/productAccountMappingService");
const transactionPostingService_1 = require("../services/transactionPostingService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Journal Entry routes
router.post('/journal-entries/create', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Create journal entries request received');
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, journalEntryService_1.createJournalEntries)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error creating journal entries', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/journal-entries/reverse', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Reverse journal entry request received', { transactionId: input.transactionId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, journalEntryService_1.reverseJournalEntries)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error reversing journal entries', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/journal-entries/search', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Search journal entries request received');
        const result = await (0, journalEntryService_1.getJournalEntries)(input);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error searching journal entries', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/trial-balance', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Generate trial balance request received');
        const result = await (0, journalEntryService_1.getTrialBalance)(input);
        res.json({
            success: true,
            trialBalance: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating trial balance', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Product Account Mapping routes
router.post('/product-mapping/get', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Get product account mappings request received', {
            productId: input.productId,
            productType: input.productType
        });
        const result = await (0, productAccountMappingService_1.getProductAccountMappings)(input.productId, input.productType);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error getting product account mappings', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/product-mapping/create', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Create product account mapping request received', {
            productId: input.productId,
            productType: input.productType,
            accountMappingType: input.accountMappingType
        });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, productAccountMappingService_1.createProductAccountMapping)(input, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error creating product account mapping', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/product-mapping/update', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Update product account mapping request received', {
            mappingId: input.mappingId,
            glAccountId: input.glAccountId
        });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, productAccountMappingService_1.updateProductAccountMapping)(input.mappingId, input.glAccountId, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error updating product account mapping', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/product-mapping/delete', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Delete product account mapping request received', { mappingId: input.mappingId });
        const result = await (0, productAccountMappingService_1.deleteProductAccountMapping)(input.mappingId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error deleting product account mapping', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/product-mapping/setup-loan-defaults', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Setup default loan product mappings request received', { productId: input.productId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, productAccountMappingService_1.setupDefaultLoanProductMappings)(input.productId, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error setting up default loan product mappings', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/product-mapping/setup-savings-defaults', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Setup default savings product mappings request received', { productId: input.productId });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, productAccountMappingService_1.setupDefaultSavingsProductMappings)(input.productId, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error setting up default savings product mappings', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Transaction Posting routes
router.post('/post-loan-transaction', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Post loan transaction to accounting request received', {
            loanId: input.loanId,
            transactionId: input.transactionDetails.transactionId
        });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, transactionPostingService_1.postLoanTransactionToAccounting)(input.loanId, input.transactionDetails, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error posting loan transaction to accounting', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/post-savings-transaction', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Post savings transaction to accounting request received', {
            savingsId: input.savingsId,
            transactionId: input.transactionDetails.transactionId
        });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, transactionPostingService_1.postSavingsTransactionToAccounting)(input.savingsId, input.transactionDetails, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error posting savings transaction to accounting', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/process-pending-transactions', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Process pending accounting transactions request received', {
            type: input.type,
            batchSize: input.batchSize
        });
        const userId = session_variables['x-hasura-user-id'];
        const result = await (0, transactionPostingService_1.processPendingAccountingTransactions)(input.type, input.batchSize, userId);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error processing pending accounting transactions', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
exports.accountingRoutes = router;
