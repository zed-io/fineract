/**
 * Fixed Deposit API handlers for Fineract Hasura actions
 * Provides endpoints for fixed deposit product and account management
 */

import { Request, Response } from 'express';
import { fixedDepositService } from '../services/fixedDepositService';
import { logger } from '../utils/logger';

/**
 * Fixed Deposit API handlers
 */
export const fixedDepositHandlers = {
  
  /**
   * Create a new fixed deposit product
   */
  async createProduct(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const productId = await fixedDepositService.createProduct(req.body.input, userId);
      res.json({ productId });
    } catch (error: any) {
      logger.error('Error creating fixed deposit product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a fixed deposit product by ID
   */
  async getProduct(req: Request, res: Response) {
    try {
      const { productId } = req.body.input;
      const product = await fixedDepositService.getProduct(productId);
      res.json(product);
    } catch (error: any) {
      logger.error('Error getting fixed deposit product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all fixed deposit products
   */
  async getProducts(req: Request, res: Response) {
    try {
      const products = await fixedDepositService.getProducts();
      res.json({ products });
    } catch (error: any) {
      logger.error('Error getting fixed deposit products', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new fixed deposit account
   */
  async createAccount(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const accountId = await fixedDepositService.createAccount(req.body.input, userId);
      res.json({ accountId });
    } catch (error: any) {
      logger.error('Error creating fixed deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a fixed deposit account by ID
   */
  async getAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      const account = await fixedDepositService.getAccount(accountId);
      res.json(account);
    } catch (error: any) {
      logger.error('Error getting fixed deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Approve a fixed deposit account
   */
  async approveAccount(req: Request, res: Response) {
    try {
      const { accountId, approvedOnDate, note } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await fixedDepositService.approveAccount(
        accountId, 
        { approvedOnDate, note }, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error approving fixed deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Activate a fixed deposit account (deposit the initial amount)
   */
  async activateAccount(req: Request, res: Response) {
    try {
      const { accountId, activatedOnDate, note } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await fixedDepositService.activateAccount(
        accountId, 
        { activatedOnDate, note }, 
        userId
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error activating fixed deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get client fixed deposit accounts
   */
  async getClientAccounts(req: Request, res: Response) {
    try {
      // TODO: Implement this handler to get all fixed deposit accounts for a client
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      logger.error('Error getting client fixed deposit accounts', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get fixed deposit template (for creating new accounts)
   */
  async getTemplate(req: Request, res: Response) {
    try {
      // TODO: Implement this handler to get template data for creating new fixed deposit accounts
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      logger.error('Error getting fixed deposit template', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Prematurely close a fixed deposit account
   */
  async prematureClose(req: Request, res: Response) {
    try {
      // TODO: Implement this handler to prematurely close a fixed deposit account
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      logger.error('Error prematurely closing fixed deposit account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update maturity instructions for a fixed deposit account
   */
  async updateMaturityInstructions(req: Request, res: Response) {
    try {
      // TODO: Implement this handler to update maturity instructions for a fixed deposit account
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      logger.error('Error updating maturity instructions', { error });
      res.status(400).json({ message: error.message });
    }
  }
};