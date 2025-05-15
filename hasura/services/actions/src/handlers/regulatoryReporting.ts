import { Request, Response } from 'express';
import { 
  RegulatoryReportingService, 
  RegReportGenerationRequest,
  ReportStatus
} from '../services/regulatoryReportingService';
import { logger } from '../utils/logger';

// Initialize the regulatory reporting service
const regulatoryReportingService = new RegulatoryReportingService();

/**
 * Handler for regulatory reporting API endpoints
 */
export class RegulatoryReportingHandler {
  /**
   * Get all report definitions
   * @param req HTTP request
   * @param res HTTP response
   */
  async getReportDefinitions(req: Request, res: Response) {
    try {
      const { active } = req.body.input || {};
      
      logger.info('Received request to get report definitions', { active });
      
      const definitions = await regulatoryReportingService.getReportDefinitions(active);
      
      return res.json({
        success: true,
        definitions
      });
    } catch (error) {
      logger.error('Error getting report definitions', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting report definitions'
      });
    }
  }

  /**
   * Get a specific report definition
   * @param req HTTP request
   * @param res HTTP response
   */
  async getReportDefinition(req: Request, res: Response) {
    try {
      const { definitionId } = req.body.input;
      
      logger.info('Received request to get report definition', { definitionId });
      
      const definition = await regulatoryReportingService.getReportDefinition(definitionId);
      
      if (!definition) {
        return res.status(404).json({
          success: false,
          message: `Report definition with ID ${definitionId} not found`
        });
      }
      
      return res.json({
        success: true,
        definition
      });
    } catch (error) {
      logger.error('Error getting report definition', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting the report definition'
      });
    }
  }

  /**
   * Generate a regulatory report
   * @param req HTTP request
   * @param res HTTP response
   */
  async generateReport(req: Request, res: Response) {
    try {
      const request: RegReportGenerationRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to generate a report'
        });
      }
      
      logger.info('Received request to generate report', { 
        reportType: request.reportType, 
        userId 
      });
      
      const result = await regulatoryReportingService.generateReport(request, userId);
      
      return res.json(result);
    } catch (error) {
      logger.error('Error generating report', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while generating the report'
      });
    }
  }

  /**
   * Get report instances
   * @param req HTTP request
   * @param res HTTP response
   */
  async getReportInstances(req: Request, res: Response) {
    try {
      const { status, startDate, endDate, reportType, limit } = req.body.input || {};
      
      logger.info('Received request to get report instances', { 
        status, 
        startDate, 
        endDate, 
        reportType, 
        limit 
      });
      
      const instances = await regulatoryReportingService.getReportInstances(
        status, 
        startDate, 
        endDate, 
        reportType, 
        limit
      );
      
      return res.json({
        success: true,
        instances
      });
    } catch (error) {
      logger.error('Error getting report instances', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting report instances'
      });
    }
  }

  /**
   * Get a specific report instance
   * @param req HTTP request
   * @param res HTTP response
   */
  async getReportInstance(req: Request, res: Response) {
    try {
      const { reportId } = req.body.input;
      
      logger.info('Received request to get report instance', { reportId });
      
      const instance = await regulatoryReportingService.getReportInstance(reportId);
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: `Report instance with ID ${reportId} not found`
        });
      }
      
      return res.json({
        success: true,
        instance
      });
    } catch (error) {
      logger.error('Error getting report instance', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting the report instance'
      });
    }
  }
  
  /**
   * Update the status of a report
   * @param req HTTP request
   * @param res HTTP response
   */
  async updateReportStatus(req: Request, res: Response) {
    try {
      const { reportId, status, notes } = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to update report status'
        });
      }
      
      logger.info('Received request to update report status', { 
        reportId, 
        status, 
        userId 
      });
      
      const instance = await regulatoryReportingService.updateReportStatus(
        reportId, 
        status, 
        userId, 
        notes
      );
      
      if (!instance) {
        return res.status(404).json({
          success: false,
          message: `Report instance with ID ${reportId} not found`
        });
      }
      
      return res.json({
        success: true,
        instance
      });
    } catch (error) {
      logger.error('Error updating report status', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while updating the report status'
      });
    }
  }
  
  /**
   * Get upcoming report deadlines
   * @param req HTTP request
   * @param res HTTP response
   */
  async getUpcomingDeadlines(req: Request, res: Response) {
    try {
      const { daysAhead } = req.body.input || {};
      
      logger.info('Received request to get upcoming deadlines', { daysAhead });
      
      const deadlines = await regulatoryReportingService.getUpcomingDeadlines(daysAhead || 30);
      
      return res.json({
        success: true,
        deadlines
      });
    } catch (error) {
      logger.error('Error getting upcoming deadlines', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting upcoming deadlines'
      });
    }
  }
  
  /**
   * Get report schedules
   * @param req HTTP request
   * @param res HTTP response
   */
  async getReportSchedules(req: Request, res: Response) {
    try {
      const { active } = req.body.input || {};
      
      logger.info('Received request to get report schedules', { active });
      
      const schedules = await regulatoryReportingService.getReportSchedules(active);
      
      return res.json({
        success: true,
        schedules
      });
    } catch (error) {
      logger.error('Error getting report schedules', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while getting report schedules'
      });
    }
  }
  
  /**
   * Create a report schedule
   * @param req HTTP request
   * @param res HTTP response
   */
  async createReportSchedule(req: Request, res: Response) {
    try {
      const { 
        definitionId, 
        frequency, 
        scheduleParams, 
        reportParams 
      } = req.body.input;
      
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to create a report schedule'
        });
      }
      
      logger.info('Received request to create report schedule', { 
        definitionId, 
        frequency, 
        userId 
      });
      
      const schedule = await regulatoryReportingService.createReportSchedule(
        definitionId,
        frequency,
        scheduleParams,
        reportParams,
        userId
      );
      
      return res.json({
        success: true,
        schedule
      });
    } catch (error) {
      logger.error('Error creating report schedule', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while creating the report schedule'
      });
    }
  }
  
  /**
   * Run scheduled reports
   * @param req HTTP request
   * @param res HTTP response
   */
  async runScheduledReports(req: Request, res: Response) {
    try {
      logger.info('Received request to run scheduled reports');
      
      const results = await regulatoryReportingService.runScheduledReports();
      
      return res.json({
        success: true,
        results
      });
    } catch (error) {
      logger.error('Error running scheduled reports', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while running scheduled reports'
      });
    }
  }
}