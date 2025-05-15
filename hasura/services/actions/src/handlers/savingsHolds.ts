import { Request, Response } from 'express';
import logger from '../utils/logger';
import { SavingsAccountHoldService } from '../services/savingsAccountHoldService';
import { authMiddleware } from '../utils/authMiddleware';

const holdService = new SavingsAccountHoldService();

/**
 * Create a new hold on a savings account
 */
export const createSavingsAccountHold = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      const userId = req.user?.id;
      
      logger.info(`Creating savings account hold: ${JSON.stringify(input)}`);
      const result = await holdService.createHold(input, userId);
      
      res.json({
        success: true,
        message: 'Savings account hold created successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error creating savings account hold:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create savings account hold'
      });
    }
  }
];

/**
 * Release a hold on a savings account
 */
export const releaseSavingsAccountHold = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      const userId = req.user?.id;
      
      logger.info(`Releasing savings account hold: ${input.holdId}`);
      const result = await holdService.releaseHold(input, userId);
      
      res.json({
        success: true,
        message: 'Savings account hold released successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error releasing savings account hold:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to release savings account hold'
      });
    }
  }
];

/**
 * Update an existing hold on a savings account
 */
export const updateSavingsAccountHold = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      const userId = req.user?.id;
      
      logger.info(`Updating savings account hold: ${input.holdId}`);
      const result = await holdService.updateHold(input, userId);
      
      res.json({
        success: true,
        message: 'Savings account hold updated successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error updating savings account hold:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update savings account hold'
      });
    }
  }
];

/**
 * Get all holds for a savings account
 */
export const getSavingsAccountHolds = [
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { input } = req.body;
      
      logger.info(`Getting savings account holds for account: ${input.savingsAccountId}`);
      const result = await holdService.getAccountHolds(input);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Error getting savings account holds:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get savings account holds'
      });
    }
  }
];