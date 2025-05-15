/**
 * Recurring Deposit Penalty API handlers for Fineract Hasura actions
 * Provides endpoints for managing penalties for missed recurring deposit installments
 */

import { Request, Response } from 'express';
import { recurringDepositPenaltyService } from '../services/recurringDepositPenaltyService';
import { logger } from '../utils/logger';

/**
 * Recurring Deposit Penalty API handlers
 */
export const recurringDepositPenaltyHandlers = {
  
  /**
   * Get penalty configuration for a recurring deposit product
   */
  async getPenaltyConfig(req: Request, res: Response) {
    try {
      const { productId } = req.body.input;
      const config = await recurringDepositPenaltyService.getPenaltyConfig(productId);
      res.json(config);
    } catch (error: any) {
      logger.error('Error getting penalty configuration', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create or update penalty configuration for a recurring deposit product
   */
  async createOrUpdatePenaltyConfig(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const configId = await recurringDepositPenaltyService.createOrUpdatePenaltyConfig(req.body.input, userId);
      res.json({ configId });
    } catch (error: any) {
      logger.error('Error creating/updating penalty configuration', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete penalty configuration for a recurring deposit product
   */
  async deletePenaltyConfig(req: Request, res: Response) {
    try {
      const { configId } = req.body.input;
      const success = await recurringDepositPenaltyService.deletePenaltyConfig(configId);
      res.json({ success });
    } catch (error: any) {
      logger.error('Error deleting penalty configuration', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Apply penalties for missed recurring deposit installments
   */
  async applyPenalties(req: Request, res: Response) {
    try {
      const { asOfDate } = req.body.input || {};
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositPenaltyService.applyPenalties(asOfDate, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error applying penalties', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get penalty history for an account
   */
  async getPenaltyHistory(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      const history = await recurringDepositPenaltyService.getPenaltyHistory(accountId);
      res.json({ history });
    } catch (error: any) {
      logger.error('Error getting penalty history', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Search penalty history with criteria
   */
  async searchPenaltyHistory(req: Request, res: Response) {
    try {
      const history = await recurringDepositPenaltyService.searchPenaltyHistory(req.body.input);
      res.json({ history });
    } catch (error: any) {
      logger.error('Error searching penalty history', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Waive a penalty
   */
  async waivePenalty(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const success = await recurringDepositPenaltyService.waivePenalty(req.body.input, userId);
      res.json({ success });
    } catch (error: any) {
      logger.error('Error waiving penalty', { error });
      res.status(400).json({ message: error.message });
    }
  }
};