"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportingRoutes = void 0;
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const reportService_1 = require("../services/reporting/reportService");
const exportService_1 = require("../services/reporting/exportService");
const portfolioReportService_1 = require("../services/reporting/portfolioReportService");
const financialAnalysisService_1 = require("../services/reporting/financialAnalysisService");
const report_1 = require("../models/reporting/report");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const reportService = new reportService_1.ReportService();
// Standard report execution 
router.post('/execute', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Report execution request received', { reportId: input.reportId });
        const userId = session_variables['x-hasura-user-id'];
        input.userId = userId;
        const result = await reportService.executeReport(input);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error executing report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Report export functionality
router.post('/export', async (req, res) => {
    try {
        const { input, session_variables } = req.body;
        logger_1.logger.info('Report export request received', { reportId: input.reportId, format: input.format });
        const userId = session_variables['x-hasura-user-id'];
        input.userId = userId;
        // First execute the report
        const result = await reportService.executeReport(input);
        // Then export to requested format
        const format = input.format || report_1.ReportFormat.PDF;
        const exportResult = await exportService_1.exportService.exportReport(result, format);
        // Stream the file back to the client
        res.setHeader('Content-Type', exportResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${exportResult.fileName}`);
        const fileStream = fs_1.default.createReadStream(exportResult.filePath);
        fileStream.pipe(res);
        // Clean up the file after sending
        fileStream.on('end', () => {
            fs_1.default.unlinkSync(exportResult.filePath);
        });
    }
    catch (error) {
        logger_1.logger.error('Error exporting report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Portfolio at Risk Report
router.post('/portfolio-at-risk', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Portfolio at Risk report request received', input);
        const result = await (0, portfolioReportService_1.generatePortfolioAtRiskReport)(input.asOfDate, input.officeId, input.currencyCode, input.includeDetails !== false);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Portfolio at Risk report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Collection Report
router.post('/collection-report', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Collection report request received', input);
        const result = await (0, portfolioReportService_1.generateCollectionReport)(input.fromDate, input.toDate, input.officeId, input.loanOfficerId, input.currencyCode);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Collection report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Loan Portfolio Summary
router.post('/loan-portfolio-summary', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Loan Portfolio Summary report request received', input);
        const result = await (0, portfolioReportService_1.generateLoanPortfolioSummary)(input.asOfDate, input.officeId, input.currencyCode);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Loan Portfolio Summary report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Expected Repayments Report
router.post('/expected-repayments', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Expected Repayments report request received', input);
        const result = await (0, portfolioReportService_1.generateExpectedRepaymentsReport)(input.fromDate, input.toDate, input.officeId, input.loanOfficerId, input.currencyCode);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Expected Repayments report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Income Statement Report
router.post('/income-statement', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Income Statement report request received', input);
        const result = await (0, financialAnalysisService_1.generateIncomeStatementReport)(input.fromDate, input.toDate, input.officeId, input.currencyCode, input.includeComparative);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Income Statement report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Balance Sheet Report
router.post('/balance-sheet', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Balance Sheet report request received', input);
        const result = await (0, financialAnalysisService_1.generateBalanceSheetReport)(input.asOfDate, input.officeId, input.currencyCode, input.includeComparative);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Balance Sheet report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Financial Ratios Report
router.post('/financial-ratios', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Financial Ratios report request received', input);
        const result = await (0, financialAnalysisService_1.generateFinancialRatiosReport)(input.asOfDate, input.officeId);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Financial Ratios report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Interest Income Report
router.post('/interest-income', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Interest Income report request received', input);
        const result = await (0, financialAnalysisService_1.generateInterestIncomeReport)(input.fromDate, input.toDate, input.officeId, input.currencyCode);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Interest Income report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
// Fee Income Report
router.post('/fee-income', async (req, res) => {
    try {
        const { input } = req.body;
        logger_1.logger.info('Fee Income report request received', input);
        const result = await (0, financialAnalysisService_1.generateFeeIncomeReport)(input.fromDate, input.toDate, input.officeId, input.currencyCode);
        res.json({
            success: true,
            report: result
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating Fee Income report', { error });
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
exports.reportingRoutes = router;
