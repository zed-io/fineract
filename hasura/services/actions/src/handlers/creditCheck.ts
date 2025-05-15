import { Request, Response } from 'express';
import { CreditCheckService, CreditCheckRequest } from '../services/creditCheckService';
import { logger } from '../utils/logger';

// Initialize the credit check service
const creditCheckService = new CreditCheckService();

/**
 * Handler for credit check API endpoints
 */
export class CreditCheckHandler {
  /**
   * Perform a credit check for a client
   * @param req HTTP request
   * @param res HTTP response
   */
  async performCreditCheck(req: Request, res: Response) {
    try {
      const request: CreditCheckRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      logger.info('Received request to perform credit check', { 
        clientId: request.clientId, 
        userId 
      });
      
      const result = await creditCheckService.performCreditCheck(request);
      
      return res.json({
        success: true,
        creditCheck: result
      });
    } catch (error) {
      logger.error('Error performing credit check', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while performing the credit check'
      });
    }
  }

  /**
   * Get credit check history for a client
   * @param req HTTP request
   * @param res HTTP response
   */
  async getCreditCheckHistory(req: Request, res: Response) {
    try {
      const { clientId, limit } = req.body.input;
      
      logger.info('Received request to get credit check history', { 
        clientId, 
        limit 
      });
      
      const history = await creditCheckService.getCreditCheckHistory(clientId, limit);
      
      return res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error getting credit check history', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving credit check history'
      });
    }
  }

  /**
   * Get a specific credit check by ID
   * @param req HTTP request
   * @param res HTTP response
   */
  async getCreditCheckById(req: Request, res: Response) {
    try {
      const { checkId } = req.body.input;
      
      logger.info('Received request to get credit check by ID', { 
        checkId 
      });
      
      const creditCheck = await creditCheckService.getCreditCheckById(checkId);
      
      if (!creditCheck) {
        return res.status(404).json({
          success: false,
          message: `Credit check with ID ${checkId} not found`
        });
      }
      
      return res.json({
        success: true,
        creditCheck
      });
    } catch (error) {
      logger.error('Error getting credit check by ID', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving the credit check'
      });
    }
  }
}