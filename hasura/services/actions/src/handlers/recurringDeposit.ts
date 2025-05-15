/**
 * Recurring Deposit API handlers for Fineract Hasura actions
 * Provides endpoints for recurring deposit product and account management
 */

import { Request, Response } from 'express';
import { recurringDepositService } from '../services/recurringDepositService';
import { logger } from '../utils/logger';

/**
 * Recurring Deposit API handlers
 */
export const recurringDepositHandlers = {
  
  /**
   * Create a new recurring deposit product
   */
  async createProduct(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const productId = await recurringDepositService.createProduct(req.body.input, userId);
      res.json({ productId });
    } catch (error: any) {
      logger.error('Error creating recurring deposit product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a recurring deposit product by ID
   */
  async getProduct(req: Request, res: Response) {
    try {
      const { productId } = req.body.input;
      const product = await recurringDepositService.getProduct(productId);
      res.json(product);
    } catch (error: any) {
      logger.error('Error getting recurring deposit product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all recurring deposit products
   */
  async getProducts(req: Request, res: Response) {
    try {
      const products = await recurringDepositService.getProducts();
      res.json({ products });
    } catch (error: any) {
      logger.error('Error getting recurring deposit products', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new recurring deposit account
   */
  async createAccount(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const accountId = await recurringDepositService.createAccount(req.body.input, userId);
      res.json({ accountId });
    } catch (error: any) {
      logger.error('Error creating recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a recurring deposit account by ID
   */
  async getAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      const account = await recurringDepositService.getAccount(accountId);
      res.json(account);
    } catch (error: any) {
      logger.error('Error getting recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Make a deposit to a recurring deposit account
   */
  async makeDeposit(req: Request, res: Response) {
    try {
      const { accountId, ...depositData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositService.makeDeposit(accountId, depositData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error making deposit to recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Make a withdrawal from a recurring deposit account (if allowed)
   */
  async makeWithdrawal(req: Request, res: Response) {
    try {
      const { accountId, ...withdrawalData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositService.makeWithdrawal(accountId, withdrawalData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error making withdrawal from recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get client recurring deposit accounts
   */
  async getClientAccounts(req: Request, res: Response) {
    try {
      const { clientId } = req.body.input;
      const accounts = await recurringDepositService.getClientAccounts(clientId);
      res.json({ accounts });
    } catch (error: any) {
      logger.error('Error getting client recurring deposit accounts', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get recurring deposit template (for creating new accounts)
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const { clientId, productId } = req.body.input || {};
      const templateData = await recurringDepositService.getTemplate(clientId, productId);
      res.json(templateData);
    } catch (error: any) {
      logger.error('Error getting recurring deposit template', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Approve a recurring deposit account
   */
  async approveAccount(req: Request, res: Response) {
    try {
      const { accountId, ...approvalData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositService.approveAccount(accountId, approvalData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error approving recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Prematurely close a recurring deposit account
   */
  async prematureClose(req: Request, res: Response) {
    try {
      const { accountId, ...closeData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositService.prematureClose(accountId, closeData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error prematurely closing recurring deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update maturity instructions for a recurring deposit account
   */
  async updateMaturityInstructions(req: Request, res: Response) {
    try {
      const { accountId, ...instructionsData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await recurringDepositService.updateMaturityInstructions(accountId, instructionsData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating maturity instructions', { error });
      res.status(400).json({ message: error.message });
    }
  },

  /**
   * Track installments for recurring deposit accounts
   * Identifies overdue installments and updates account statistics
   */
  async trackInstallments(req: Request, res: Response) {
    try {
      const { asOfDate, applyPenalties } = req.body.input || {};
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      
      // Use the standard tracking functionality
      const result = await recurringDepositService.trackInstallments(asOfDate, applyPenalties, userId);
      
      // If penalties should be applied but using the new penalty service
      if (applyPenalties) {
        try {
          // Import the service here to avoid circular dependencies
          const { recurringDepositPenaltyService } = require('../services/recurringDepositPenaltyService');
          
          // Apply penalties using the new dedicated service
          logger.info('Also applying penalties using dedicated penalty service');
          const penaltyResults = await recurringDepositPenaltyService.applyPenalties(asOfDate, userId);
          
          // Add penalty info to the tracking results
          result.penaltyResults = {
            totalPenaltiesApplied: penaltyResults.totalPenaltiesApplied,
            totalPenaltyAmount: penaltyResults.totalPenaltyAmount,
            accountsWithPenalties: penaltyResults.accountsWithPenalties,
            penalties: penaltyResults.penalties.length > 20 ? 
              `${penaltyResults.penalties.length} penalties applied (first 20 shown)` :
              penaltyResults.penalties
          };
        } catch (penaltyError) {
          logger.error('Error applying penalties using dedicated penalty service', { penaltyError });
          result.penaltyError = penaltyError.message;
        }
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error tracking recurring deposit installments', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Configure penalties for a recurring deposit product
   */
  async configurePenalties(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      
      // Import the service here to avoid circular dependencies
      const { recurringDepositPenaltyService } = require('../services/recurringDepositPenaltyService');
      
      const configId = await recurringDepositPenaltyService.createOrUpdatePenaltyConfig(req.body.input, userId);
      res.json({ configId });
    } catch (error: any) {
      logger.error('Error configuring recurring deposit penalties', { error });
      res.status(400).json({ message: error.message });
    }
  }
};