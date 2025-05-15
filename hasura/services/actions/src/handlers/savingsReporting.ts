/**
 * Savings Reporting Handlers
 * Handlers for savings reporting actions
 */

import { Request, Response } from 'express';
import * as savingsReportingService from '../services/savingsReportingService';
import logger from '../utils/logger';
import { 
  ProductPerformanceReportInput,
  DormancyAnalysisReportInput,
  InterestDistributionReportInput,
  AccountActivityReportInput,
  FinancialProjectionReportInput
} from '../models/savings/reporting';

/**
 * Handler for generating savings product performance report
 */
export async function handleProductPerformanceReport(req: Request, res: Response): Promise<void> {
  try {
    const input: ProductPerformanceReportInput = req.body.input;
    logger.info('Received savings product performance report request', { input });
    
    const result = await savingsReportingService.generateProductPerformanceReport(input);
    res.json(result);
  } catch (error) {
    logger.error('Error handling savings product performance report request', { error });
    res.status(500).json({
      success: false,
      message: `Error generating report: ${error.message}`
    });
  }
}

/**
 * Handler for generating savings dormancy analysis report
 */
export async function handleDormancyAnalysisReport(req: Request, res: Response): Promise<void> {
  try {
    const input: DormancyAnalysisReportInput = req.body.input;
    logger.info('Received savings dormancy analysis report request', { input });
    
    const result = await savingsReportingService.generateDormancyAnalysisReport(input);
    res.json(result);
  } catch (error) {
    logger.error('Error handling savings dormancy analysis report request', { error });
    res.status(500).json({
      success: false,
      message: `Error generating report: ${error.message}`
    });
  }
}

/**
 * Handler for generating savings interest distribution report
 */
export async function handleInterestDistributionReport(req: Request, res: Response): Promise<void> {
  try {
    const input: InterestDistributionReportInput = req.body.input;
    logger.info('Received savings interest distribution report request', { input });
    
    const result = await savingsReportingService.generateInterestDistributionReport(input);
    res.json(result);
  } catch (error) {
    logger.error('Error handling savings interest distribution report request', { error });
    res.status(500).json({
      success: false,
      message: `Error generating report: ${error.message}`
    });
  }
}

/**
 * Handler for generating savings account activity report
 */
export async function handleAccountActivityReport(req: Request, res: Response): Promise<void> {
  try {
    const input: AccountActivityReportInput = req.body.input;
    logger.info('Received savings account activity report request', { input });
    
    const result = await savingsReportingService.generateAccountActivityReport(input);
    res.json(result);
  } catch (error) {
    logger.error('Error handling savings account activity report request', { error });
    res.status(500).json({
      success: false,
      message: `Error generating report: ${error.message}`
    });
  }
}

/**
 * Handler for generating savings financial projection report
 */
export async function handleFinancialProjectionReport(req: Request, res: Response): Promise<void> {
  try {
    const input: FinancialProjectionReportInput = req.body.input;
    logger.info('Received savings financial projection report request', { input });
    
    const result = await savingsReportingService.generateFinancialProjectionReport(input);
    res.json(result);
  } catch (error) {
    logger.error('Error handling savings financial projection report request', { error });
    res.status(500).json({
      success: false,
      message: `Error generating report: ${error.message}`
    });
  }
}