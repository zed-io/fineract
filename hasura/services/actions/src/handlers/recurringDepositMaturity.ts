import { Request, Response } from 'express';
import { RecurringDepositMaturityService } from '../services/recurringDepositMaturityService';
import { logger } from '../utils/logger';

// Create service instance
const recurringDepositMaturityService = new RecurringDepositMaturityService();

/**
 * Handlers for recurring deposit maturity-related operations
 */
export const recurringDepositMaturityHandlers = {
  /**
   * Process maturity for a recurring deposit account
   * @param req Request
   * @param res Response
   */
  async processMaturity(req: Request, res: Response) {
    try {
      const { accountId, maturedOn, closureType, transferToSavingsAccountId } = req.body.input || {};
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Process maturity
      const result = await recurringDepositMaturityService.processMaturity(
        accountId, 
        maturedOn || new Date().toISOString().split('T')[0],
        closureType,
        transferToSavingsAccountId,
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        maturityAmount: result.maturityAmount,
        transactionId: result.transactionId,
        closedOn: result.closedOn
      });
    } catch (error) {
      logger.error('Error processing maturity for recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Auto-renew a recurring deposit account upon maturity
   * @param req Request
   * @param res Response
   */
  async renewAccount(req: Request, res: Response) {
    try {
      const { accountId, renewalDate } = req.body.input || {};
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Renew account
      const result = await recurringDepositMaturityService.renewAccount(
        accountId, 
        renewalDate || new Date().toISOString().split('T')[0],
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        accountId: result.accountId,
        renewalDate: result.renewalDate,
        newMaturityDate: result.newMaturityDate,
        interestPosted: result.interestPosted
      });
    } catch (error) {
      logger.error('Error renewing recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get upcoming maturing accounts
   * @param req Request
   * @param res Response
   */
  async getUpcomingMaturities(req: Request, res: Response) {
    try {
      const { daysInFuture, limit } = req.body.input || {};
      
      // Get upcoming maturities
      const result = await recurringDepositMaturityService.getUpcomingMaturities(
        daysInFuture || 30,
        limit || 100
      );
      
      // Return success response
      return res.json({
        success: true,
        upcomingMaturities: result
      });
    } catch (error) {
      logger.error('Error getting upcoming maturing recurring deposit accounts', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Update maturity options for an account
   * @param req Request
   * @param res Response
   */
  async updateMaturityOptions(req: Request, res: Response) {
    try {
      const { accountId, isRenewalAllowed, onAccountClosureType, transferToSavingsAccountId } = req.body.input || {};
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Update maturity options
      const result = await recurringDepositMaturityService.updateMaturityOptions(
        accountId,
        {
          isRenewalAllowed,
          onAccountClosureType,
          transferToSavingsAccountId
        },
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        accountId: result.accountId,
        isRenewalAllowed: result.isRenewalAllowed,
        onAccountClosureType: result.onAccountClosureType,
        transferToSavingsAccountId: result.transferToSavingsAccountId
      });
    } catch (error) {
      logger.error('Error updating maturity options for recurring deposit account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};