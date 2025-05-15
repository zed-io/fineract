import { Router } from 'express';
import { logger } from '../utils/logger';
import { ReportService } from '../services/reporting/reportService';
import { exportService } from '../services/reporting/exportService';
import {
  generatePortfolioAtRiskReport,
  generateCollectionReport,
  generateLoanPortfolioSummary,
  generateExpectedRepaymentsReport
} from '../services/reporting/portfolioReportService';
import {
  generateIncomeStatementReport,
  generateBalanceSheetReport,
  generateFinancialRatiosReport,
  generateInterestIncomeReport,
  generateFeeIncomeReport,
  generateTrialBalanceReport
} from '../services/reporting/financialAnalysisService';
import { generateGeneralLedgerReport } from '../services/reporting/generalLedgerService';
import { generateJournalEntryReport } from '../services/reporting/journalEntryService';
import { generateCashFlowReport } from '../services/reporting/cashFlowService';
import { ReportFormat } from '../models/reporting/report';
import fs from 'fs';

const router = Router();
const reportService = new ReportService();

// Standard report execution 
router.post('/execute', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Report execution request received', { reportId: input.reportId });
    
    const userId = session_variables['x-hasura-user-id'];
    input.userId = userId;
    
    const result = await reportService.executeReport(input);
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error executing report', { error });
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
    logger.info('Report export request received', { reportId: input.reportId, format: input.format });
    
    const userId = session_variables['x-hasura-user-id'];
    input.userId = userId;
    
    // First execute the report
    const result = await reportService.executeReport(input);
    
    // Then export to requested format
    const format = input.format || ReportFormat.PDF;
    const exportResult = await exportService.exportReport(result, format);
    
    // Stream the file back to the client
    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${exportResult.fileName}`);
    
    const fileStream = fs.createReadStream(exportResult.filePath);
    fileStream.pipe(res);
    
    // Clean up the file after sending
    fileStream.on('end', () => {
      fs.unlinkSync(exportResult.filePath);
    });
  } catch (error) {
    logger.error('Error exporting report', { error });
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
    logger.info('Portfolio at Risk report request received', input);
    
    const result = await generatePortfolioAtRiskReport(
      input.asOfDate,
      input.officeId,
      input.currencyCode,
      input.includeDetails !== false
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Portfolio at Risk report', { error });
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
    logger.info('Collection report request received', input);
    
    const result = await generateCollectionReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.loanOfficerId,
      input.currencyCode
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Collection report', { error });
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
    logger.info('Loan Portfolio Summary report request received', input);
    
    const result = await generateLoanPortfolioSummary(
      input.asOfDate,
      input.officeId,
      input.currencyCode
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Loan Portfolio Summary report', { error });
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
    logger.info('Expected Repayments report request received', input);
    
    const result = await generateExpectedRepaymentsReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.loanOfficerId,
      input.currencyCode
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Expected Repayments report', { error });
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
    logger.info('Income Statement report request received', input);
    
    const result = await generateIncomeStatementReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.currencyCode,
      input.includeComparative
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Income Statement report', { error });
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
    logger.info('Balance Sheet report request received', input);
    
    const result = await generateBalanceSheetReport(
      input.asOfDate,
      input.officeId,
      input.currencyCode,
      input.includeComparative
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Balance Sheet report', { error });
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
    logger.info('Financial Ratios report request received', input);
    
    const result = await generateFinancialRatiosReport(
      input.asOfDate,
      input.officeId
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Financial Ratios report', { error });
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
    logger.info('Interest Income report request received', input);
    
    const result = await generateInterestIncomeReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.currencyCode
    );
    
    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Interest Income report', { error });
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
    logger.info('Fee Income report request received', input);

    const result = await generateFeeIncomeReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.currencyCode
    );

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Fee Income report', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Trial Balance Report
router.post('/trial-balance', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Trial Balance report request received', input);

    const result = await generateTrialBalanceReport(
      input.asOfDate,
      input.officeId,
      input.currencyCode
    );

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Trial Balance report', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// General Ledger Report
router.post('/general-ledger', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('General Ledger report request received', input);

    const result = await generateGeneralLedgerReport(
      input.fromDate,
      input.toDate,
      input.accountId,
      input.officeId,
      input.currencyCode
    );

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating General Ledger report', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Journal Entry Report
router.post('/journal-entries', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Journal Entry report request received', input);

    const result = await generateJournalEntryReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.glAccountId,
      input.currencyCode
    );

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Journal Entry report', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Cash Flow Statement Report
router.post('/cash-flow', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Cash Flow Statement report request received', input);

    const result = await generateCashFlowReport(
      input.fromDate,
      input.toDate,
      input.officeId,
      input.currencyCode,
      input.includeComparative
    );

    res.json({
      success: true,
      report: result
    });
  } catch (error) {
    logger.error('Error generating Cash Flow Statement report', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export const reportingRoutes = router;