/**
 * Handler for consolidated reporting actions
 */

import { Request, Response } from 'express';
import { 
  ConsolidatedReportRequest, 
  ConsolidatedReportResponse,
  CrossModuleDashboardRequest,
  CrossModuleDashboardResponse,
  DataSourceSyncRequest,
  DataSourceSyncResponse,
  AnalyticsInsightsRequest,
  AnalyticsInsightsResponse
} from '../models/reporting/consolidatedReporting';
import { ConsolidatedReportingService } from '../services/reporting/consolidatedReportingService';
import { logger } from '../utils/logger';

/**
 * Handler for consolidated reporting endpoints
 */
export class ConsolidatedReportingHandler {
  private service: ConsolidatedReportingService;
  
  constructor() {
    this.service = new ConsolidatedReportingService();
  }
  
  /**
   * Generate consolidated report endpoint
   *
   * @param req Express request
   * @param res Express response
   */
  async generateConsolidatedReport(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body.input as ConsolidatedReportRequest;
      
      // Add user ID if available
      if (req.user?.userId) {
        input.userId = req.user.userId;
      }
      
      logger.info('Handling generateConsolidatedReport request', { 
        reportType: input.reportType,
        modules: input.modules
      });
      
      const result = await this.service.generateConsolidatedReport(input);
      
      res.json(result);
    } catch (error) {
      logger.error('Error in generateConsolidatedReport handler', { error });
      
      res.status(500).json({
        success: false,
        message: `Server error: ${error.message}`
      });
    }
  }
  
  /**
   * Get cross-module dashboard endpoint
   *
   * @param req Express request
   * @param res Express response
   */
  async getCrossModuleDashboard(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body.input as CrossModuleDashboardRequest;
      
      // Add user ID if available
      if (req.user?.userId) {
        input.userId = req.user.userId;
      }
      
      logger.info('Handling getCrossModuleDashboard request', {
        name: input.name,
        modules: input.modules,
        metrics: input.metrics
      });
      
      const result = await this.service.getCrossModuleDashboard(input);
      
      res.json(result);
    } catch (error) {
      logger.error('Error in getCrossModuleDashboard handler', { error });
      
      res.status(500).json({
        success: false,
        message: `Server error: ${error.message}`
      });
    }
  }
  
  /**
   * Sync data sources endpoint
   *
   * @param req Express request
   * @param res Express response
   */
  async syncDataSources(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body.input as DataSourceSyncRequest;
      
      // Add user ID if available
      if (req.user?.userId) {
        input.userId = req.user.userId;
      }
      
      logger.info('Handling syncDataSources request', {
        moduleTypes: input.moduleTypes,
        fullSync: input.fullSync
      });
      
      const result = await this.service.syncDataSources(input);
      
      res.json(result);
    } catch (error) {
      logger.error('Error in syncDataSources handler', { error });
      
      res.status(500).json({
        success: false,
        message: `Server error: ${error.message}`
      });
    }
  }
  
  /**
   * Get analytics insights endpoint
   *
   * @param req Express request
   * @param res Express response
   */
  async getAnalyticsInsights(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body.input as AnalyticsInsightsRequest;
      
      // Add user ID if available
      if (req.user?.userId) {
        input.userId = req.user.userId;
      }
      
      logger.info('Handling getAnalyticsInsights request', {
        modules: input.modules,
        insightTypes: input.insightTypes,
        limit: input.limit
      });
      
      const result = await this.service.getAnalyticsInsights(input);
      
      res.json(result);
    } catch (error) {
      logger.error('Error in getAnalyticsInsights handler', { error });
      
      res.status(500).json({
        success: false,
        message: `Server error: ${error.message}`
      });
    }
  }
}