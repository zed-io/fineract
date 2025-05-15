import { Request, Response } from 'express';
import { 
  FraudDetectionService, 
  FraudDetectionRequest 
} from '../services/fraudDetectionService';
import { logger } from '../utils/logger';

// Initialize the fraud detection service
const fraudDetectionService = new FraudDetectionService();

/**
 * Handler for fraud detection API endpoints
 */
export class FraudDetectionHandler {
  /**
   * Perform fraud detection checks for a client
   * @param req HTTP request
   * @param res HTTP response
   */
  async performFraudDetection(req: Request, res: Response) {
    try {
      const request: FraudDetectionRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      logger.info('Received request to perform fraud detection', { 
        clientId: request.clientId, 
        userId 
      });
      
      const result = await fraudDetectionService.performFraudDetection(request);
      
      return res.json({
        success: true,
        fraudDetection: result
      });
    } catch (error) {
      logger.error('Error performing fraud detection', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while performing fraud detection'
      });
    }
  }

  /**
   * Get fraud detection history for a client
   * @param req HTTP request
   * @param res HTTP response
   */
  async getFraudDetectionHistory(req: Request, res: Response) {
    try {
      const { clientId, limit } = req.body.input;
      
      logger.info('Received request to get fraud detection history', { 
        clientId, 
        limit 
      });
      
      const history = await fraudDetectionService.getFraudDetectionHistory(clientId, limit);
      
      return res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error getting fraud detection history', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving fraud detection history'
      });
    }
  }

  /**
   * Get a specific fraud detection result by ID
   * @param req HTTP request
   * @param res HTTP response
   */
  async getFraudDetectionById(req: Request, res: Response) {
    try {
      const { checkId } = req.body.input;
      
      logger.info('Received request to get fraud detection by ID', { 
        checkId 
      });
      
      const fraudDetection = await fraudDetectionService.getFraudDetectionById(checkId);
      
      if (!fraudDetection) {
        return res.status(404).json({
          success: false,
          message: `Fraud detection with ID ${checkId} not found`
        });
      }
      
      return res.json({
        success: true,
        fraudDetection
      });
    } catch (error) {
      logger.error('Error getting fraud detection by ID', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving the fraud detection'
      });
    }
  }
  
  /**
   * Resolve a manual review
   * @param req HTTP request
   * @param res HTTP response
   */
  async resolveManualReview(req: Request, res: Response) {
    try {
      const { checkId, approved, notes } = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to resolve a manual review'
        });
      }
      
      logger.info('Received request to resolve manual review', { 
        checkId, 
        approved,
        userId 
      });
      
      const result = await fraudDetectionService.resolveManualReview(
        checkId, 
        approved, 
        notes, 
        userId
      );
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: `Fraud detection with ID ${checkId} not found`
        });
      }
      
      return res.json({
        success: true,
        fraudDetection: result
      });
    } catch (error) {
      logger.error('Error resolving manual review', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while resolving the manual review'
      });
    }
  }
  
  /**
   * Get pending manual reviews
   * @param req HTTP request
   * @param res HTTP response
   */
  async getPendingManualReviews(req: Request, res: Response) {
    try {
      const { limit, offset } = req.body.input;
      
      logger.info('Received request to get pending manual reviews', { 
        limit, 
        offset 
      });
      
      const reviews = await fraudDetectionService.getPendingManualReviews(limit, offset);
      
      return res.json({
        success: true,
        reviews,
        count: reviews.length
      });
    } catch (error) {
      logger.error('Error getting pending manual reviews', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving pending manual reviews'
      });
    }
  }
}