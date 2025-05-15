/**
 * Share Account API handlers for Fineract Hasura actions
 * Provides endpoints for share product and account management
 */

import { Request, Response } from 'express';
import { shareService } from '../services/shareService';
import { logger } from '../utils/logger';

/**
 * Share Account API handlers
 */
export const shareHandlers = {
  
  /**
   * Create a new share product
   */
  async createProduct(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const productId = await shareService.createProduct(req.body.input, userId);
      res.json({ productId });
    } catch (error: any) {
      logger.error('Error creating share product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a share product by ID
   */
  async getProduct(req: Request, res: Response) {
    try {
      const { productId } = req.body.input;
      const product = await shareService.getProduct(productId);
      res.json(product);
    } catch (error: any) {
      logger.error('Error getting share product', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get all share products
   */
  async getProducts(req: Request, res: Response) {
    try {
      const products = await shareService.getProducts();
      res.json(products);
    } catch (error: any) {
      logger.error('Error getting share products', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new share account
   */
  async createAccount(req: Request, res: Response) {
    try {
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const accountId = await shareService.createAccount(req.body.input, userId);
      res.json({ accountId });
    } catch (error: any) {
      logger.error('Error creating share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get a share account by ID
   */
  async getAccount(req: Request, res: Response) {
    try {
      const { accountId } = req.body.input;
      const account = await shareService.getAccount(accountId);
      res.json(account);
    } catch (error: any) {
      logger.error('Error getting share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get client share accounts
   */
  async getClientAccounts(req: Request, res: Response) {
    try {
      const { clientId } = req.body.input;
      const accounts = await shareService.getClientAccounts(clientId);
      res.json(accounts);
    } catch (error: any) {
      logger.error('Error getting client share accounts', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get group share accounts
   */
  async getGroupAccounts(req: Request, res: Response) {
    try {
      const { groupId } = req.body.input;
      const accounts = await shareService.getGroupAccounts(groupId);
      res.json(accounts);
    } catch (error: any) {
      logger.error('Error getting group share accounts', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Approve a share account
   */
  async approveAccount(req: Request, res: Response) {
    try {
      const { accountId, ...approvalData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.approveAccount(accountId, approvalData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error approving share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Reject a share account
   */
  async rejectAccount(req: Request, res: Response) {
    try {
      const { accountId, ...rejectData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.rejectAccount(accountId, rejectData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error rejecting share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Activate a share account
   */
  async activateAccount(req: Request, res: Response) {
    try {
      const { accountId, ...activateData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.activateAccount(accountId, activateData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error activating share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Close a share account
   */
  async closeAccount(req: Request, res: Response) {
    try {
      const { accountId, ...closeData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.closeAccount(accountId, closeData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error closing share account', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Submit a share purchase request
   */
  async submitPurchaseRequest(req: Request, res: Response) {
    try {
      const { accountId, ...purchaseData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.submitPurchaseRequest(accountId, purchaseData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error submitting share purchase request', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Approve a share purchase request
   */
  async approvePurchaseRequest(req: Request, res: Response) {
    try {
      const { accountId, ...approvalData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.approvePurchaseRequest(accountId, approvalData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error approving share purchase request', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Reject a share purchase request
   */
  async rejectPurchaseRequest(req: Request, res: Response) {
    try {
      const { accountId, ...rejectData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.rejectPurchaseRequest(accountId, rejectData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error rejecting share purchase request', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Redeem shares
   */
  async redeemShares(req: Request, res: Response) {
    try {
      const { accountId, ...redeemData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.redeemShares(accountId, redeemData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error redeeming shares', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Declare dividends for a share product
   */
  async declareProductDividend(req: Request, res: Response) {
    try {
      const { productId, ...dividendData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.declareProductDividend(productId, dividendData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error declaring product dividend', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Process dividend payment for a share account
   */
  async processDividend(req: Request, res: Response) {
    try {
      const { accountId, ...processData } = req.body.input;
      const userId = req.body.session_variables?.['x-hasura-user-id'];
      const result = await shareService.processDividend(accountId, processData, userId);
      res.json(result);
    } catch (error: any) {
      logger.error('Error processing dividend', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get template data for creating share accounts
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const { clientId, productId } = req.body.input || {};
      const templateData = await shareService.getTemplate(clientId, productId);
      res.json(templateData);
    } catch (error: any) {
      logger.error('Error getting share template', { error });
      res.status(400).json({ message: error.message });
    }
  }
};

// Export routes
export const shareRoutes = function(router: any) {
  // Share Product routes
  router.post('/product/create', shareHandlers.createProduct);
  router.post('/product/get', shareHandlers.getProduct);
  router.post('/products', shareHandlers.getProducts);
  
  // Share Account routes
  router.post('/account/create', shareHandlers.createAccount);
  router.post('/account/get', shareHandlers.getAccount);
  router.post('/account/approve', shareHandlers.approveAccount);
  router.post('/account/reject', shareHandlers.rejectAccount);
  router.post('/account/activate', shareHandlers.activateAccount);
  router.post('/account/close', shareHandlers.closeAccount);
  
  // Share Purchase routes
  router.post('/purchase/submit', shareHandlers.submitPurchaseRequest);
  router.post('/purchase/approve', shareHandlers.approvePurchaseRequest);
  router.post('/purchase/reject', shareHandlers.rejectPurchaseRequest);
  router.post('/redeem', shareHandlers.redeemShares);
  
  // Dividend routes
  router.post('/dividend/declare', shareHandlers.declareProductDividend);
  router.post('/dividend/process', shareHandlers.processDividend);
  
  // Client/Group share accounts
  router.post('/client/accounts', shareHandlers.getClientAccounts);
  router.post('/group/accounts', shareHandlers.getGroupAccounts);
  
  // Template
  router.post('/template', shareHandlers.getTemplate);
  
  return router;
};