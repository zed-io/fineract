/**
 * Recurring Deposit Premature Closure API handlers for Fineract Hasura actions
 * Provides endpoints for managing premature closure of recurring deposit accounts
 */

import { Request, Response } from 'express';
import { recurringDepositPrematureClosureService } from '../services/recurringDepositPrematureClosureService';
import { logger } from '../utils/logger';

/**
 * Recurring Deposit Premature Closure API handlers
 */
export const recurringDepositPrematureClosureHandlers = {
  
  /**
   * Calculate premature closure details without actually closing the account
   */
  async calculatePrematureClosure(req: Request, res: Response) {
    try {
      const { accountId, calculationDate } = req.body.input;
      
      const calculationResult = await recurringDepositPrematureClosureService.calculatePrematureClosure({
        accountId,
        calculationDate
      });
      
      res.json(calculationResult);
    } catch (error: any) {
      logger.error('Error calculating premature closure', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Process premature closure of a recurring deposit account
   */
  async processPrematureClosure(req: Request, res: Response) {
    try {
      const { 
        accountId, 
        closureDate, 
        closureReason, 
        transferToAccountId,
        note,
        applyPenalty,
        overridePenaltyRate,
        paymentTypeId,
        receiptNumber,
        checkNumber,
        routingCode,
        bankNumber,
        accountNumber
      } = req.body.input;
      
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      
      const closureResult = await recurringDepositPrematureClosureService.processPrematureClosure(
        accountId,
        {
          closureDate,
          closureReason,
          transferToAccountId,
          note,
          applyPenalty,
          overridePenaltyRate,
          paymentTypeId,
          receiptNumber,
          checkNumber,
          routingCode,
          bankNumber,
          accountNumber
        },
        userId
      );
      
      res.json(closureResult);
    } catch (error: any) {
      logger.error('Error processing premature closure', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get premature closure history for an account
   */
  async getPrematureClosureHistory(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      
      const history = await recurringDepositPrematureClosureService.getPrematureClosureHistory(accountId);
      
      res.json({ history });
    } catch (error: any) {
      logger.error('Error getting premature closure history', { error });
      res.status(400).json({ message: error.message });
    }
  }
};