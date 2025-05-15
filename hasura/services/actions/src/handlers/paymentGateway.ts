/**
 * Payment Gateway API handlers for Fineract Hasura actions
 * Includes payment gateway provider, transaction, payment method, and recurring payment APIs
 */

import { Request, Response } from 'express';
import { paymentGatewayService } from '../services/paymentGateway/paymentGatewayService';
import { logger } from '../utils/logger';

/**
 * Payment Gateway API handlers
 */
export const paymentGatewayHandlers = {
  
  // Provider handlers
  
  /**
   * Get payment gateway providers
   */
  async getPaymentGatewayProviders(req: Request, res: Response) {
    try {
      const { providerType, isActive, limit, offset } = req.body.input;
      const result = await paymentGatewayService.getProviders(providerType, isActive, limit, offset);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting payment gateway providers', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get payment gateway provider by ID
   */
  async getPaymentGatewayProviderById(req: Request, res: Response) {
    try {
      const { providerId } = req.body.input;
      const result = await paymentGatewayService.getProviderById(providerId);
      
      if (!result) {
        return res.status(404).json({ message: 'Payment gateway provider not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting payment gateway provider', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Register a new payment gateway provider
   */
  async registerPaymentGatewayProvider(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.registerProvider(
        req.body.input,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error registering payment gateway provider', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update payment gateway provider
   */
  async updatePaymentGatewayProvider(req: Request, res: Response) {
    try {
      const { providerId, updates } = req.body.input;
      const result = await paymentGatewayService.updateProvider(
        providerId,
        updates,
        req.body.session_variables?.['x-hasura-user-id']
      );
      
      if (!result) {
        return res.status(404).json({ message: 'Payment gateway provider not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating payment gateway provider', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete payment gateway provider
   */
  async deletePaymentGatewayProvider(req: Request, res: Response) {
    try {
      const { providerId } = req.body.input;
      const result = await paymentGatewayService.deleteProvider(providerId);
      
      if (!result) {
        return res.status(404).json({ message: 'Payment gateway provider not found' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting payment gateway provider', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Transaction handlers
  
  /**
   * Get payment gateway transactions
   */
  async getPaymentGatewayTransactions(req: Request, res: Response) {
    try {
      const { 
        providerId, 
        status, 
        clientId, 
        loanId, 
        savingsAccountId, 
        dateFrom, 
        dateTo, 
        limit, 
        offset 
      } = req.body.input;
      
      const result = await paymentGatewayService.getTransactions(
        providerId,
        status,
        clientId,
        loanId,
        savingsAccountId,
        dateFrom,
        dateTo,
        limit,
        offset
      );
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting payment gateway transactions', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Get payment gateway transaction by ID
   */
  async getPaymentGatewayTransactionById(req: Request, res: Response) {
    try {
      const { transactionId } = req.body.input;
      const result = await paymentGatewayService.getTransactionById(transactionId);
      
      if (!result) {
        return res.status(404).json({ message: 'Payment gateway transaction not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting payment gateway transaction', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a new payment transaction
   */
  async createPaymentTransaction(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.createTransaction(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating payment transaction', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Execute a payment
   */
  async executePayment(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.executePayment(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error executing payment', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Check payment status
   */
  async checkPaymentStatus(req: Request, res: Response) {
    try {
      const { transactionId } = req.body.input;
      const result = await paymentGatewayService.checkPaymentStatus(transactionId);
      
      if (!result) {
        return res.status(404).json({ message: 'Payment transaction not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error checking payment status', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Refund payment
   */
  async refundPayment(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.refundPayment(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error refunding payment', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Payment Method handlers
  
  /**
   * Get client payment methods
   */
  async getClientPaymentMethods(req: Request, res: Response) {
    try {
      const { clientId, providerId, isActive } = req.body.input;
      const result = await paymentGatewayService.getClientPaymentMethods(clientId, providerId, isActive);
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting client payment methods', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Save a payment method
   */
  async savePaymentMethod(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.savePaymentMethod(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error saving payment method', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Delete a payment method
   */
  async deletePaymentMethod(req: Request, res: Response) {
    try {
      const { paymentMethodId } = req.body.input;
      const result = await paymentGatewayService.deletePaymentMethod(paymentMethodId);
      
      if (!result) {
        return res.status(404).json({ message: 'Payment method not found' });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      logger.error('Error deleting payment method', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Recurring Payment handlers
  
  /**
   * Get recurring payment configurations
   */
  async getRecurringPaymentConfigurations(req: Request, res: Response) {
    try {
      const { clientId, providerId, status, limit, offset } = req.body.input;
      const result = await paymentGatewayService.getRecurringPaymentConfigurations(
        clientId,
        providerId,
        status,
        limit,
        offset
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error getting recurring payment configurations', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Create a recurring payment configuration
   */
  async createRecurringPaymentConfiguration(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.createRecurringPayment(
        req.body.input,
        req.body.session_variables?.['x-hasura-user-id']
      );
      res.json(result);
    } catch (error: any) {
      logger.error('Error creating recurring payment configuration', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  /**
   * Update recurring payment status
   */
  async updateRecurringPaymentStatus(req: Request, res: Response) {
    try {
      const { configId, status } = req.body.input;
      const result = await paymentGatewayService.updateRecurringPaymentStatus(
        configId,
        status,
        req.body.session_variables?.['x-hasura-user-id']
      );
      
      if (!result) {
        return res.status(404).json({ message: 'Recurring payment configuration not found' });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error('Error updating recurring payment status', { error });
      res.status(400).json({ message: error.message });
    }
  },
  
  // Webhook handler
  
  /**
   * Process payment webhook event
   */
  async processPaymentWebhook(req: Request, res: Response) {
    try {
      const result = await paymentGatewayService.processWebhook(req.body.input);
      res.json(result);
    } catch (error: any) {
      logger.error('Error processing payment webhook', { error });
      res.status(400).json({ message: error.message });
    }
  }
};