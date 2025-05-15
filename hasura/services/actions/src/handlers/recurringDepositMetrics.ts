import { Request, Response } from 'express';
import { recurringDepositMetricsService } from '../services/recurringDepositMetricsService';
import { logger } from '../utils/logger';

/**
 * Handlers for recurring deposit metrics and dashboard data
 */
export const recurringDepositMetricsHandlers = {
  /**
   * Get all dashboard metrics
   * @param req Request
   * @param res Response
   */
  async getDashboardMetrics(req: Request, res: Response) {
    try {
      // Get all metrics
      const metrics = await recurringDepositMetricsService.getDashboardMetrics();
      
      // Return success response
      return res.json({
        success: true,
        metrics
      });
    } catch (error) {
      logger.error('Error getting recurring deposit dashboard metrics', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get general statistics
   * @param req Request
   * @param res Response
   */
  async getGeneralStats(req: Request, res: Response) {
    try {
      // Get general statistics
      const stats = await recurringDepositMetricsService.getGeneralStats();
      
      // Return success response
      return res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Error getting recurring deposit general statistics', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get recent activity
   * @param req Request
   * @param res Response
   */
  async getRecentActivity(req: Request, res: Response) {
    try {
      const { limit } = req.body.input || {};
      
      // Get recent activity
      const activity = await recurringDepositMetricsService.getRecentActivity(limit || 10);
      
      // Return success response
      return res.json({
        success: true,
        activity
      });
    } catch (error) {
      logger.error('Error getting recurring deposit recent activity', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get product performance
   * @param req Request
   * @param res Response
   */
  async getProductPerformance(req: Request, res: Response) {
    try {
      // Get product performance
      const productPerformance = await recurringDepositMetricsService.getProductPerformance();
      
      // Return success response
      return res.json({
        success: true,
        productPerformance
      });
    } catch (error) {
      logger.error('Error getting recurring deposit product performance', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get deposit trends
   * @param req Request
   * @param res Response
   */
  async getDepositTrends(req: Request, res: Response) {
    try {
      // Get deposit trends
      const trends = await recurringDepositMetricsService.getDepositTrends();
      
      // Return success response
      return res.json({
        success: true,
        trends
      });
    } catch (error) {
      logger.error('Error getting recurring deposit trends', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get maturity forecast
   * @param req Request
   * @param res Response
   */
  async getMaturityForecast(req: Request, res: Response) {
    try {
      // Get maturity forecast
      const forecast = await recurringDepositMetricsService.getMaturityForecast();
      
      // Return success response
      return res.json({
        success: true,
        forecast
      });
    } catch (error) {
      logger.error('Error getting recurring deposit maturity forecast', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get installment compliance
   * @param req Request
   * @param res Response
   */
  async getInstallmentCompliance(req: Request, res: Response) {
    try {
      // Get installment compliance
      const compliance = await recurringDepositMetricsService.getInstallmentCompliance();
      
      // Return success response
      return res.json({
        success: true,
        compliance
      });
    } catch (error) {
      logger.error('Error getting recurring deposit installment compliance', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};