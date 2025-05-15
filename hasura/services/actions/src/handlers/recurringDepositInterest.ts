import { Request, Response } from 'express';
import { RecurringDepositService } from '../services/recurringDepositService';
import { recurringDepositInterestService } from '../services/recurringDepositInterestService';
import { logger } from '../utils/logger';

// Create service instance
const recurringDepositService = new RecurringDepositService();

/**
 * Handlers for recurring deposit interest-related operations
 */
export const recurringDepositInterestHandlers = {
  /**
   * Post interest to a recurring deposit account
   * @param req Request
   * @param res Response
   */
  async postInterest(req: Request, res: Response) {
    try {
      const { accountId, interestAmount, calculationDate, fromDate, toDate } = req.body.input || {};
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!interestAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Interest amount is required' 
        });
      }
      
      // Post interest to the account
      const result = await recurringDepositInterestService.postInterest(
        accountId,
        interestAmount,
        calculationDate || new Date().toISOString().split('T')[0],
        fromDate,
        toDate,
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        transaction: result
      });
    } catch (error) {
      logger.error('Error posting interest to recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Calculate interest for a recurring deposit account (without posting)
   * @param req Request
   * @param res Response
   */
  async calculateInterest(req: Request, res: Response) {
    try {
      const { accountId, calculationDate, fromDate, toDate } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Calculate interest for the account
      const result = await recurringDepositInterestService.calculateInterest(
        accountId,
        calculationDate || new Date().toISOString().split('T')[0],
        fromDate,
        toDate
      );
      
      // Return success response
      return res.json({
        success: true,
        calculation: result
      });
    } catch (error) {
      logger.error('Error calculating interest for recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get interest posting history for a recurring deposit account
   * @param req Request
   * @param res Response
   */
  async getInterestPostingHistory(req: Request, res: Response) {
    try {
      const { accountId, limit } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Get interest posting history
      const history = await recurringDepositInterestService.getInterestPostingHistory(
        accountId,
        limit || 10
      );
      
      // Return success response
      return res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error getting interest posting history for recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};