/**
 * Payment Gateway service for Fineract Hasura
 * Provides operations for managing payment gateway providers, transactions, payment methods, and recurring payments
 */

import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { 
  PaymentGatewayProvider,
  PaymentGatewayProviderUpdates,
  PaymentGatewayTransaction,
  PaymentMethod,
  RecurringPaymentConfig,
  PaymentTransactionStatus,
  RecurringPaymentStatus,
  RegisterPaymentGatewayProviderResponse,
  CreatePaymentTransactionResponse,
  PaymentExecutionResponse,
  PaymentStatusResponse,
  RefundResponse,
  SavePaymentMethodResponse,
  CreateRecurringPaymentResponse,
  WebhookProcessingResponse,
  PaymentGatewayProviderListResponse,
  PaymentGatewayTransactionListResponse,
  PaymentMethodListResponse,
  RecurringPaymentConfigListResponse,
  CreatePaymentTransactionInput,
  ExecutePaymentInput,
  RefundPaymentInput,
  SavePaymentMethodInput,
  CreateRecurringPaymentInput,
  ProcessPaymentWebhookInput
} from '../../models/paymentGateway';
import { getPaymentGatewayAdapter } from './adapters/paymentGatewayAdapterFactory';
import { PaymentGatewayAdapter } from './adapters/paymentGatewayAdapter';

/**
 * Payment Gateway Service
 */
class PaymentGatewayService {
  
  /**
   * Get payment gateway providers
   */
  async getProviders(
    providerType?: string,
    isActive?: boolean,
    limit: number = 10,
    offset: number = 0
  ): Promise<PaymentGatewayProviderListResponse> {
    try {
      // Build query
      let query = db('payment_gateway_provider')
        .select('*');
      
      // Apply filters
      if (providerType) {
        query = query.where('provider_type', providerType);
      }
      
      if (isActive !== undefined) {
        query = query.where('is_active', isActive);
      }
      
      // Apply pagination
      const countQuery = query.clone().count('id as count').first();
      query = query.orderBy('name', 'asc').limit(limit).offset(offset);
      
      // Execute queries
      const [providers, countResult] = await Promise.all([
        query,
        countQuery
      ]);
      
      // Map results to model
      const mappedProviders: PaymentGatewayProvider[] = providers.map(provider => ({
        id: provider.id,
        code: provider.code,
        name: provider.name,
        description: provider.description,
        providerType: provider.provider_type,
        configuration: provider.configuration,
        webhookUrl: provider.webhook_url,
        isActive: provider.is_active,
        supportsRefunds: provider.supports_refunds,
        supportsPartialPayments: provider.supports_partial_payments,
        supportsRecurringPayments: provider.supports_recurring_payments,
        createdBy: provider.created_by,
        createdDate: provider.created_date,
        updatedBy: provider.updated_by,
        updatedDate: provider.updated_date
      }));
      
      return {
        providers: mappedProviders,
        total: parseInt(countResult?.count || '0')
      };
    } catch (error) {
      logger.error('Error getting payment gateway providers', { error });
      throw error;
    }
  }
  
  /**
   * Get payment gateway provider by ID
   */
  async getProviderById(providerId: string): Promise<PaymentGatewayProvider | null> {
    try {
      const provider = await db('payment_gateway_provider')
        .where('id', providerId)
        .first();
      
      if (!provider) {
        return null;
      }
      
      return {
        id: provider.id,
        code: provider.code,
        name: provider.name,
        description: provider.description,
        providerType: provider.provider_type,
        configuration: provider.configuration,
        webhookUrl: provider.webhook_url,
        isActive: provider.is_active,
        supportsRefunds: provider.supports_refunds,
        supportsPartialPayments: provider.supports_partial_payments,
        supportsRecurringPayments: provider.supports_recurring_payments,
        createdBy: provider.created_by,
        createdDate: provider.created_date,
        updatedBy: provider.updated_by,
        updatedDate: provider.updated_date
      };
    } catch (error) {
      logger.error('Error getting payment gateway provider by ID', { error, providerId });
      throw error;
    }
  }
  
  /**
   * Register a new payment gateway provider
   */
  async registerProvider(
    input: {
      code: string;
      name: string;
      description?: string;
      providerType: string;
      configuration: any;
      webhookUrl?: string;
      webhookSecret?: string;
      isActive?: boolean;
      supportsRefunds?: boolean;
      supportsPartialPayments?: boolean;
      supportsRecurringPayments?: boolean;
    },
    userId?: string
  ): Promise<RegisterPaymentGatewayProviderResponse> {
    try {
      // Check if code already exists
      const existingProvider = await db('payment_gateway_provider')
        .where('code', input.code)
        .first();
      
      if (existingProvider) {
        throw new Error(`Payment gateway provider with code '${input.code}' already exists`);
      }
      
      // Create new provider
      const [providerId] = await db('payment_gateway_provider')
        .insert({
          code: input.code,
          name: input.name,
          description: input.description,
          provider_type: input.providerType,
          configuration: JSON.stringify(input.configuration),
          webhook_url: input.webhookUrl,
          webhook_secret: input.webhookSecret,
          is_active: input.isActive !== undefined ? input.isActive : true,
          supports_refunds: input.supportsRefunds !== undefined ? input.supportsRefunds : true,
          supports_partial_payments: input.supportsPartialPayments !== undefined ? input.supportsPartialPayments : true,
          supports_recurring_payments: input.supportsRecurringPayments !== undefined ? input.supportsRecurringPayments : false,
          created_by: userId,
          created_date: new Date()
        })
        .returning('id');
      
      // Validate adapter can be created
      try {
        getPaymentGatewayAdapter(input.providerType as any, input.configuration);
      } catch (adapterError) {
        // If adapter creation fails, delete the provider and throw error
        await db('payment_gateway_provider')
          .where('id', providerId)
          .delete();
        
        throw new Error(`Invalid payment gateway configuration: ${adapterError.message}`);
      }
      
      return {
        id: providerId,
        code: input.code,
        name: input.name,
        providerType: input.providerType as any,
        isActive: input.isActive !== undefined ? input.isActive : true
      };
    } catch (error) {
      logger.error('Error registering payment gateway provider', { error, input });
      throw error;
    }
  }
  
  /**
   * Update payment gateway provider
   */
  async updateProvider(
    providerId: string,
    updates: PaymentGatewayProviderUpdates,
    userId?: string
  ): Promise<PaymentGatewayProvider | null> {
    try {
      // Check if provider exists
      const provider = await this.getProviderById(providerId);
      
      if (!provider) {
        return null;
      }
      
      // Prepare update data
      const updateData: any = {
        updated_by: userId,
        updated_date: new Date()
      };
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.configuration !== undefined) updateData.configuration = JSON.stringify(updates.configuration);
      if (updates.webhookUrl !== undefined) updateData.webhook_url = updates.webhookUrl;
      if (updates.webhookSecret !== undefined) updateData.webhook_secret = updates.webhookSecret;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.supportsRefunds !== undefined) updateData.supports_refunds = updates.supportsRefunds;
      if (updates.supportsPartialPayments !== undefined) updateData.supports_partial_payments = updates.supportsPartialPayments;
      if (updates.supportsRecurringPayments !== undefined) updateData.supports_recurring_payments = updates.supportsRecurringPayments;
      
      // If configuration is updated, validate adapter can be created
      if (updates.configuration !== undefined) {
        try {
          const providerType = provider.providerType;
          getPaymentGatewayAdapter(providerType, updates.configuration);
        } catch (adapterError) {
          throw new Error(`Invalid payment gateway configuration: ${adapterError.message}`);
        }
      }
      
      // Update provider
      await db('payment_gateway_provider')
        .where('id', providerId)
        .update(updateData);
      
      // Return updated provider
      return this.getProviderById(providerId);
    } catch (error) {
      logger.error('Error updating payment gateway provider', { error, providerId, updates });
      throw error;
    }
  }
  
  /**
   * Delete payment gateway provider
   */
  async deleteProvider(providerId: string): Promise<boolean> {
    try {
      // Check for existing transactions
      const transactionCount = await db('payment_gateway_transaction')
        .where('provider_id', providerId)
        .count('id as count')
        .first();
      
      if (parseInt(transactionCount?.count || '0') > 0) {
        throw new Error('Cannot delete provider with existing transactions');
      }
      
      // Delete provider
      const deleted = await db('payment_gateway_provider')
        .where('id', providerId)
        .delete();
      
      return deleted > 0;
    } catch (error) {
      logger.error('Error deleting payment gateway provider', { error, providerId });
      throw error;
    }
  }
  
  /**
   * Get payment gateway transactions
   */
  async getTransactions(
    providerId?: string,
    status?: string,
    clientId?: string,
    loanId?: string,
    savingsAccountId?: string,
    dateFrom?: string,
    dateTo?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaymentGatewayTransactionListResponse> {
    try {
      // Base query join with provider to get provider name
      let query = db('payment_gateway_transaction as t')
        .leftJoin('payment_gateway_provider as p', 't.provider_id', 'p.id')
        .leftJoin('m_client as c', 't.client_id', 'c.id')
        .select(
          't.*',
          'p.name as provider_name',
          'p.provider_type',
          'c.display_name as client_name'
        );
      
      // Apply filters
      if (providerId) {
        query = query.where('t.provider_id', providerId);
      }
      
      if (status) {
        query = query.where('t.status', status);
      }
      
      if (clientId) {
        query = query.where('t.client_id', clientId);
      }
      
      if (loanId) {
        query = query.where('t.loan_id', loanId);
      }
      
      if (savingsAccountId) {
        query = query.where('t.savings_account_id', savingsAccountId);
      }
      
      if (dateFrom) {
        query = query.where('t.created_date', '>=', dateFrom);
      }
      
      if (dateTo) {
        query = query.where('t.created_date', '<=', dateTo);
      }
      
      // Apply pagination
      const countQuery = db('payment_gateway_transaction as t')
        .count('t.id as count')
        .modify(qb => {
          if (providerId) qb.where('t.provider_id', providerId);
          if (status) qb.where('t.status', status);
          if (clientId) qb.where('t.client_id', clientId);
          if (loanId) qb.where('t.loan_id', loanId);
          if (savingsAccountId) qb.where('t.savings_account_id', savingsAccountId);
          if (dateFrom) qb.where('t.created_date', '>=', dateFrom);
          if (dateTo) qb.where('t.created_date', '<=', dateTo);
        })
        .first();
      
      query = query.orderBy('t.created_date', 'desc').limit(limit).offset(offset);
      
      // Execute queries
      const [transactions, countResult] = await Promise.all([
        query,
        countQuery
      ]);
      
      // Map results to model
      const mappedTransactions: PaymentGatewayTransaction[] = transactions.map(tx => ({
        id: tx.id,
        providerId: tx.provider_id,
        providerName: tx.provider_name,
        providerType: tx.provider_type,
        transactionType: tx.transaction_type,
        externalId: tx.external_id,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        errorMessage: tx.error_message,
        paymentMethod: tx.payment_method,
        paymentDetails: tx.payment_details,
        referenceNumber: tx.reference_number,
        clientId: tx.client_id,
        clientName: tx.client_name,
        loanId: tx.loan_id,
        savingsAccountId: tx.savings_account_id,
        metadata: tx.metadata,
        createdDate: tx.created_date,
        updatedDate: tx.updated_date
      }));
      
      return {
        transactions: mappedTransactions,
        total: parseInt(countResult?.count || '0')
      };
    } catch (error) {
      logger.error('Error getting payment gateway transactions', { error });
      throw error;
    }
  }
  
  /**
   * Get payment gateway transaction by ID
   */
  async getTransactionById(transactionId: string): Promise<PaymentGatewayTransaction | null> {
    try {
      const transaction = await db('payment_gateway_transaction as t')
        .leftJoin('payment_gateway_provider as p', 't.provider_id', 'p.id')
        .leftJoin('m_client as c', 't.client_id', 'c.id')
        .select(
          't.*',
          'p.name as provider_name',
          'p.provider_type',
          'c.display_name as client_name'
        )
        .where('t.id', transactionId)
        .first();
      
      if (!transaction) {
        return null;
      }
      
      return {
        id: transaction.id,
        providerId: transaction.provider_id,
        providerName: transaction.provider_name,
        providerType: transaction.provider_type,
        transactionType: transaction.transaction_type,
        externalId: transaction.external_id,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        status: transaction.status,
        errorMessage: transaction.error_message,
        paymentMethod: transaction.payment_method,
        paymentDetails: transaction.payment_details,
        referenceNumber: transaction.reference_number,
        clientId: transaction.client_id,
        clientName: transaction.client_name,
        loanId: transaction.loan_id,
        savingsAccountId: transaction.savings_account_id,
        metadata: transaction.metadata,
        createdDate: transaction.created_date,
        updatedDate: transaction.updated_date
      };
    } catch (error) {
      logger.error('Error getting payment gateway transaction by ID', { error, transactionId });
      throw error;
    }
  }
  
  /**
   * Create a new payment transaction
   */
  async createTransaction(input: CreatePaymentTransactionInput): Promise<CreatePaymentTransactionResponse> {
    const trx = await db.transaction();
    
    try {
      // Get provider
      const provider = await trx('payment_gateway_provider')
        .where('id', input.providerId)
        .first();
      
      if (!provider) {
        throw new Error('Payment gateway provider not found');
      }
      
      if (!provider.is_active) {
        throw new Error('Payment gateway provider is not active');
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(provider.provider_type, provider.configuration);
      
      // Create transaction in database first with pending status
      const [txId] = await trx('payment_gateway_transaction')
        .insert({
          provider_id: input.providerId,
          transaction_type: 'payment',
          amount: input.amount,
          currency: input.currency,
          status: 'pending',
          payment_method: input.paymentMethod,
          payment_details: input.paymentDetails ? JSON.stringify(input.paymentDetails) : null,
          reference_number: input.referenceNumber,
          client_id: input.clientId,
          loan_id: input.loanId,
          savings_account_id: input.savingsAccountId,
          callback_url: input.callbackUrl,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          created_date: new Date()
        })
        .returning('id');
      
      // Initialize payment with provider
      const paymentResponse = await adapter.createPayment({
        transactionId: txId,
        amount: input.amount,
        currency: input.currency,
        callbackUrl: input.callbackUrl,
        metadata: {
          ...input.metadata,
          clientId: input.clientId,
          loanId: input.loanId,
          savingsAccountId: input.savingsAccountId,
          transactionId: txId
        }
      });
      
      // Update transaction with response from provider
      await trx('payment_gateway_transaction')
        .where('id', txId)
        .update({
          external_id: paymentResponse.externalId,
          status: paymentResponse.status,
          request_payload: JSON.stringify(adapter.getLastRequest()),
          response_payload: JSON.stringify(adapter.getLastResponse()),
          updated_date: new Date()
        });
      
      await trx.commit();
      
      // Return response
      return {
        transactionId: txId,
        providerId: input.providerId,
        amount: input.amount,
        currency: input.currency,
        status: paymentResponse.status as PaymentTransactionStatus,
        createdDate: new Date().toISOString(),
        paymentUrl: paymentResponse.paymentUrl,
        externalId: paymentResponse.externalId
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating payment transaction', { error, input });
      throw error;
    }
  }
  
  /**
   * Execute a payment
   */
  async executePayment(input: ExecutePaymentInput): Promise<PaymentExecutionResponse> {
    const trx = await db.transaction();
    
    try {
      // Get transaction
      const transaction = await trx('payment_gateway_transaction as t')
        .join('payment_gateway_provider as p', 't.provider_id', 'p.id')
        .select('t.*', 'p.provider_type', 'p.configuration')
        .where('t.id', input.transactionId)
        .first();
      
      if (!transaction) {
        throw new Error('Payment transaction not found');
      }
      
      if (transaction.status !== 'pending') {
        throw new Error(`Payment transaction is already in ${transaction.status} status`);
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(transaction.provider_type, transaction.configuration);
      
      // Execute payment
      const executionResponse = await adapter.executePayment({
        transactionId: transaction.id,
        externalId: transaction.external_id,
        paymentMethod: input.paymentMethod,
        paymentMethodToken: input.paymentMethodToken,
        paymentDetails: input.paymentDetails
      });
      
      // Update transaction with response from provider
      await trx('payment_gateway_transaction')
        .where('id', transaction.id)
        .update({
          status: executionResponse.status,
          error_message: executionResponse.errorMessage,
          request_payload: JSON.stringify(adapter.getLastRequest()),
          response_payload: JSON.stringify(adapter.getLastResponse()),
          payment_details: executionResponse.paymentDetails ? JSON.stringify(executionResponse.paymentDetails) : transaction.payment_details,
          updated_date: new Date()
        });
      
      await trx.commit();
      
      // Return response
      return {
        success: executionResponse.success,
        transactionId: transaction.id,
        status: executionResponse.status as PaymentTransactionStatus,
        externalId: transaction.external_id,
        errorMessage: executionResponse.errorMessage,
        redirectUrl: executionResponse.redirectUrl
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error executing payment', { error, input });
      throw error;
    }
  }
  
  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse | null> {
    const trx = await db.transaction();
    
    try {
      // Get transaction
      const transaction = await trx('payment_gateway_transaction as t')
        .join('payment_gateway_provider as p', 't.provider_id', 'p.id')
        .select('t.*', 'p.provider_type', 'p.configuration')
        .where('t.id', transactionId)
        .first();
      
      if (!transaction) {
        await trx.commit();
        return null;
      }
      
      // For completed, failed, or refunded transactions, return current status without checking
      if (['completed', 'failed', 'refunded', 'partially_refunded'].includes(transaction.status)) {
        await trx.commit();
        return {
          transactionId: transaction.id,
          status: transaction.status as PaymentTransactionStatus,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency,
          externalId: transaction.external_id,
          errorMessage: transaction.error_message,
          paymentDetails: transaction.payment_details
        };
      }
      
      // For pending, authorized or other statuses, check with the provider
      const adapter = getPaymentGatewayAdapter(transaction.provider_type, transaction.configuration);
      
      // Check status
      const statusResponse = await adapter.checkPaymentStatus({
        transactionId: transaction.id,
        externalId: transaction.external_id
      });
      
      // If status has changed, update transaction
      if (statusResponse.status !== transaction.status) {
        await trx('payment_gateway_transaction')
          .where('id', transaction.id)
          .update({
            status: statusResponse.status,
            error_message: statusResponse.errorMessage,
            external_id: statusResponse.externalId || transaction.external_id,
            request_payload: JSON.stringify(adapter.getLastRequest()),
            response_payload: JSON.stringify(adapter.getLastResponse()),
            payment_details: statusResponse.paymentDetails ? JSON.stringify(statusResponse.paymentDetails) : transaction.payment_details,
            updated_date: new Date()
          });
      }
      
      await trx.commit();
      
      // Return response
      return {
        transactionId: transaction.id,
        status: statusResponse.status as PaymentTransactionStatus,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency,
        externalId: statusResponse.externalId || transaction.external_id,
        errorMessage: statusResponse.errorMessage,
        paymentDetails: statusResponse.paymentDetails || transaction.payment_details
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error checking payment status', { error, transactionId });
      throw error;
    }
  }
  
  /**
   * Refund payment
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundResponse> {
    const trx = await db.transaction();
    
    try {
      // Get transaction
      const transaction = await trx('payment_gateway_transaction as t')
        .join('payment_gateway_provider as p', 't.provider_id', 'p.id')
        .select('t.*', 'p.provider_type', 'p.configuration', 'p.supports_refunds')
        .where('t.id', input.transactionId)
        .first();
      
      if (!transaction) {
        throw new Error('Payment transaction not found');
      }
      
      if (transaction.status !== 'completed') {
        throw new Error('Only completed transactions can be refunded');
      }
      
      if (!transaction.supports_refunds) {
        throw new Error('This payment gateway provider does not support refunds');
      }
      
      // Determine refund amount
      const totalAmount = parseFloat(transaction.amount);
      const refundAmount = input.amount || totalAmount;
      
      // Validate refund amount
      if (refundAmount <= 0 || refundAmount > totalAmount) {
        throw new Error('Invalid refund amount');
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(transaction.provider_type, transaction.configuration);
      
      // Process refund
      const refundResponse = await adapter.refundPayment({
        transactionId: transaction.id,
        externalId: transaction.external_id,
        amount: refundAmount,
        reason: input.reason,
        metadata: input.metadata
      });
      
      // Create refund transaction
      const [refundTxId] = await trx('payment_gateway_transaction')
        .insert({
          provider_id: transaction.provider_id,
          transaction_type: 'refund',
          external_id: refundResponse.refundId,
          amount: refundAmount,
          currency: transaction.currency,
          status: refundResponse.status,
          error_message: refundResponse.errorMessage,
          payment_method: transaction.payment_method,
          payment_details: transaction.payment_details,
          reference_number: `REFUND-${transaction.reference_number || transaction.id}`,
          client_id: transaction.client_id,
          loan_id: transaction.loan_id,
          savings_account_id: transaction.savings_account_id,
          metadata: JSON.stringify({
            originalTransactionId: transaction.id,
            reason: input.reason,
            ...input.metadata
          }),
          request_payload: JSON.stringify(adapter.getLastRequest()),
          response_payload: JSON.stringify(adapter.getLastResponse()),
          created_date: new Date()
        })
        .returning('id');
      
      // Update original transaction status if full refund
      if (refundAmount === totalAmount) {
        await trx('payment_gateway_transaction')
          .where('id', transaction.id)
          .update({
            status: 'refunded',
            updated_date: new Date()
          });
      } else {
        await trx('payment_gateway_transaction')
          .where('id', transaction.id)
          .update({
            status: 'partially_refunded',
            updated_date: new Date()
          });
      }
      
      await trx.commit();
      
      // Return response
      return {
        success: refundResponse.success,
        originalTransactionId: transaction.id,
        refundTransactionId: refundTxId,
        amount: refundAmount,
        currency: transaction.currency,
        status: refundResponse.status as PaymentTransactionStatus,
        externalId: refundResponse.refundId
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error refunding payment', { error, input });
      throw error;
    }
  }
  
  /**
   * Get client payment methods
   */
  async getClientPaymentMethods(
    clientId: string,
    providerId?: string,
    isActive?: boolean
  ): Promise<PaymentMethodListResponse> {
    try {
      // Build query
      let query = db('payment_gateway_payment_method as pm')
        .leftJoin('payment_gateway_provider as p', 'pm.provider_id', 'p.id')
        .select(
          'pm.*',
          'p.name as provider_name'
        )
        .where('pm.client_id', clientId);
      
      // Apply filters
      if (providerId) {
        query = query.where('pm.provider_id', providerId);
      }
      
      if (isActive !== undefined) {
        query = query.where('pm.is_active', isActive);
      }
      
      // Apply ordering
      query = query.orderBy([
        { column: 'pm.is_default', order: 'desc' },
        { column: 'pm.created_date', order: 'desc' }
      ]);
      
      // Get count
      const countQuery = db('payment_gateway_payment_method')
        .count('id as count')
        .where('client_id', clientId)
        .modify(qb => {
          if (providerId) qb.where('provider_id', providerId);
          if (isActive !== undefined) qb.where('is_active', isActive);
        })
        .first();
      
      // Execute queries
      const [paymentMethods, countResult] = await Promise.all([
        query,
        countQuery
      ]);
      
      // Map results to model
      const mappedPaymentMethods: PaymentMethod[] = paymentMethods.map(pm => ({
        id: pm.id,
        providerId: pm.provider_id,
        providerName: pm.provider_name,
        clientId: pm.client_id,
        paymentMethodType: pm.payment_method_type,
        token: pm.token,
        isDefault: pm.is_default,
        maskedNumber: pm.masked_number,
        expiryDate: pm.expiry_date,
        cardType: pm.card_type,
        holderName: pm.holder_name,
        billingAddress: pm.billing_address,
        metadata: pm.metadata,
        isActive: pm.is_active,
        createdDate: pm.created_date,
        updatedDate: pm.updated_date
      }));
      
      return {
        paymentMethods: mappedPaymentMethods,
        total: parseInt(countResult?.count || '0')
      };
    } catch (error) {
      logger.error('Error getting client payment methods', { error, clientId });
      throw error;
    }
  }
  
  /**
   * Save a payment method
   */
  async savePaymentMethod(input: SavePaymentMethodInput): Promise<SavePaymentMethodResponse> {
    const trx = await db.transaction();
    
    try {
      // Check if provider exists and is active
      const provider = await trx('payment_gateway_provider')
        .where('id', input.providerId)
        .first();
      
      if (!provider) {
        throw new Error('Payment gateway provider not found');
      }
      
      if (!provider.is_active) {
        throw new Error('Payment gateway provider is not active');
      }
      
      // Check if client exists
      const client = await trx('m_client')
        .where('id', input.clientId)
        .first();
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      // Create adapter to validate token
      const adapter = getPaymentGatewayAdapter(provider.provider_type, provider.configuration);
      
      // Validate payment method token if adapter supports it
      if (adapter.validatePaymentMethodToken) {
        await adapter.validatePaymentMethodToken({
          token: input.token,
          paymentMethodType: input.paymentMethodType
        });
      }
      
      // If this is set as default, unset any existing default
      if (input.isDefault) {
        await trx('payment_gateway_payment_method')
          .where({
            provider_id: input.providerId,
            client_id: input.clientId,
            is_default: true
          })
          .update({ is_default: false });
      }
      
      // Check if method with same token already exists and update it if so
      const existingMethod = await trx('payment_gateway_payment_method')
        .where({
          provider_id: input.providerId,
          client_id: input.clientId,
          token: input.token
        })
        .first();
      
      let paymentMethodId: string;
      
      if (existingMethod) {
        // Update existing payment method
        await trx('payment_gateway_payment_method')
          .where('id', existingMethod.id)
          .update({
            payment_method_type: input.paymentMethodType,
            is_default: input.isDefault !== undefined ? input.isDefault : existingMethod.is_default,
            masked_number: input.maskedNumber || existingMethod.masked_number,
            expiry_date: input.expiryDate || existingMethod.expiry_date,
            card_type: input.cardType || existingMethod.card_type,
            holder_name: input.holderName || existingMethod.holder_name,
            billing_address: input.billingAddress ? JSON.stringify(input.billingAddress) : existingMethod.billing_address,
            metadata: input.metadata ? JSON.stringify(input.metadata) : existingMethod.metadata,
            is_active: true,
            updated_date: new Date()
          });
        
        paymentMethodId = existingMethod.id;
      } else {
        // Create new payment method
        const [id] = await trx('payment_gateway_payment_method')
          .insert({
            provider_id: input.providerId,
            client_id: input.clientId,
            payment_method_type: input.paymentMethodType,
            token: input.token,
            is_default: input.isDefault !== undefined ? input.isDefault : false,
            masked_number: input.maskedNumber,
            expiry_date: input.expiryDate,
            card_type: input.cardType,
            holder_name: input.holderName,
            billing_address: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
            metadata: input.metadata ? JSON.stringify(input.metadata) : null,
            is_active: true,
            created_date: new Date()
          })
          .returning('id');
        
        paymentMethodId = id;
      }
      
      await trx.commit();
      
      // Return response
      return {
        id: paymentMethodId,
        token: input.token,
        paymentMethodType: input.paymentMethodType,
        maskedNumber: input.maskedNumber,
        isDefault: input.isDefault !== undefined ? input.isDefault : false
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error saving payment method', { error, input });
      throw error;
    }
  }
  
  /**
   * Delete (deactivate) a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const updated = await db('payment_gateway_payment_method')
        .where('id', paymentMethodId)
        .update({
          is_active: false,
          updated_date: new Date()
        });
      
      return updated > 0;
    } catch (error) {
      logger.error('Error deleting payment method', { error, paymentMethodId });
      throw error;
    }
  }
  
  /**
   * Get recurring payment configurations
   */
  async getRecurringPaymentConfigurations(
    clientId?: string,
    providerId?: string,
    status?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<RecurringPaymentConfigListResponse> {
    try {
      // Build query
      let query = db('payment_gateway_recurring_config as rc')
        .leftJoin('payment_gateway_provider as p', 'rc.provider_id', 'p.id')
        .leftJoin('m_client as c', 'rc.client_id', 'c.id')
        .select(
          'rc.*',
          'p.name as provider_name',
          'c.display_name as client_name'
        );
      
      // Apply filters
      if (clientId) {
        query = query.where('rc.client_id', clientId);
      }
      
      if (providerId) {
        query = query.where('rc.provider_id', providerId);
      }
      
      if (status) {
        query = query.where('rc.status', status);
      }
      
      // Apply pagination
      const countQuery = db('payment_gateway_recurring_config')
        .count('id as count')
        .modify(qb => {
          if (clientId) qb.where('client_id', clientId);
          if (providerId) qb.where('provider_id', providerId);
          if (status) qb.where('status', status);
        })
        .first();
      
      query = query.orderBy('rc.created_date', 'desc').limit(limit).offset(offset);
      
      // Execute queries
      const [configs, countResult] = await Promise.all([
        query,
        countQuery
      ]);
      
      // Map results to model
      const mappedConfigs: RecurringPaymentConfig[] = configs.map(config => ({
        id: config.id,
        providerId: config.provider_id,
        providerName: config.provider_name,
        clientId: config.client_id,
        clientName: config.client_name,
        externalSubscriptionId: config.external_subscription_id,
        paymentMethodToken: config.payment_method_token,
        frequency: config.frequency,
        amount: parseFloat(config.amount),
        currency: config.currency,
        startDate: config.start_date,
        endDate: config.end_date,
        status: config.status,
        description: config.description,
        metadata: config.metadata,
        createdBy: config.created_by,
        createdDate: config.created_date,
        updatedBy: config.updated_by,
        updatedDate: config.updated_date
      }));
      
      return {
        configurations: mappedConfigs,
        total: parseInt(countResult?.count || '0')
      };
    } catch (error) {
      logger.error('Error getting recurring payment configurations', { error });
      throw error;
    }
  }
  
  /**
   * Create a recurring payment configuration
   */
  async createRecurringPayment(
    input: CreateRecurringPaymentInput,
    userId?: string
  ): Promise<CreateRecurringPaymentResponse> {
    const trx = await db.transaction();
    
    try {
      // Check if provider exists, is active and supports recurring payments
      const provider = await trx('payment_gateway_provider')
        .where('id', input.providerId)
        .first();
      
      if (!provider) {
        throw new Error('Payment gateway provider not found');
      }
      
      if (!provider.is_active) {
        throw new Error('Payment gateway provider is not active');
      }
      
      if (!provider.supports_recurring_payments) {
        throw new Error('This payment gateway provider does not support recurring payments');
      }
      
      // Check if client exists
      const client = await trx('m_client')
        .where('id', input.clientId)
        .first();
      
      if (!client) {
        throw new Error('Client not found');
      }
      
      // Verify payment method exists and is active
      const paymentMethod = await trx('payment_gateway_payment_method')
        .where({
          provider_id: input.providerId,
          client_id: input.clientId,
          token: input.paymentMethodToken,
          is_active: true
        })
        .first();
      
      if (!paymentMethod) {
        throw new Error('Payment method not found or inactive');
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(provider.provider_type, provider.configuration);
      
      // Create recurring payment configuration
      const recurringPaymentResponse = await adapter.createRecurringPayment({
        paymentMethodToken: input.paymentMethodToken,
        frequency: input.frequency,
        amount: input.amount,
        currency: input.currency,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        description: input.description,
        metadata: {
          ...input.metadata,
          clientId: input.clientId
        }
      });
      
      // Save configuration
      const [configId] = await trx('payment_gateway_recurring_config')
        .insert({
          provider_id: input.providerId,
          client_id: input.clientId,
          external_subscription_id: recurringPaymentResponse.subscriptionId,
          payment_method_token: input.paymentMethodToken,
          frequency: input.frequency,
          amount: input.amount,
          currency: input.currency,
          start_date: input.startDate,
          end_date: input.endDate,
          status: recurringPaymentResponse.status,
          description: input.description,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          created_by: userId,
          created_date: new Date()
        })
        .returning('id');
      
      await trx.commit();
      
      // Return response
      return {
        configId,
        externalSubscriptionId: recurringPaymentResponse.subscriptionId,
        amount: input.amount,
        currency: input.currency,
        frequency: input.frequency,
        startDate: input.startDate,
        status: recurringPaymentResponse.status as RecurringPaymentStatus
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error creating recurring payment configuration', { error, input });
      throw error;
    }
  }
  
  /**
   * Update recurring payment status
   */
  async updateRecurringPaymentStatus(
    configId: string,
    status: RecurringPaymentStatus,
    userId?: string
  ): Promise<RecurringPaymentConfig | null> {
    const trx = await db.transaction();
    
    try {
      // Get configuration
      const config = await trx('payment_gateway_recurring_config as rc')
        .join('payment_gateway_provider as p', 'rc.provider_id', 'p.id')
        .select('rc.*', 'p.provider_type', 'p.configuration')
        .where('rc.id', configId)
        .first();
      
      if (!config) {
        await trx.commit();
        return null;
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(config.provider_type, config.configuration);
      
      // Update recurring payment status with provider
      await adapter.updateRecurringPaymentStatus({
        subscriptionId: config.external_subscription_id,
        status
      });
      
      // Update status in database
      await trx('payment_gateway_recurring_config')
        .where('id', configId)
        .update({
          status,
          updated_by: userId,
          updated_date: new Date()
        });
      
      await trx.commit();
      
      // Get and return updated config
      return this.getRecurringPaymentConfigById(configId);
    } catch (error) {
      await trx.rollback();
      logger.error('Error updating recurring payment status', { error, configId, status });
      throw error;
    }
  }
  
  /**
   * Get recurring payment configuration by ID
   */
  private async getRecurringPaymentConfigById(configId: string): Promise<RecurringPaymentConfig | null> {
    try {
      const config = await db('payment_gateway_recurring_config as rc')
        .leftJoin('payment_gateway_provider as p', 'rc.provider_id', 'p.id')
        .leftJoin('m_client as c', 'rc.client_id', 'c.id')
        .select(
          'rc.*',
          'p.name as provider_name',
          'c.display_name as client_name'
        )
        .where('rc.id', configId)
        .first();
      
      if (!config) {
        return null;
      }
      
      return {
        id: config.id,
        providerId: config.provider_id,
        providerName: config.provider_name,
        clientId: config.client_id,
        clientName: config.client_name,
        externalSubscriptionId: config.external_subscription_id,
        paymentMethodToken: config.payment_method_token,
        frequency: config.frequency,
        amount: parseFloat(config.amount),
        currency: config.currency,
        startDate: config.start_date,
        endDate: config.end_date,
        status: config.status,
        description: config.description,
        metadata: config.metadata,
        createdBy: config.created_by,
        createdDate: config.created_date,
        updatedBy: config.updated_by,
        updatedDate: config.updated_date
      };
    } catch (error) {
      logger.error('Error getting recurring payment configuration by ID', { error, configId });
      throw error;
    }
  }
  
  /**
   * Process payment webhook
   */
  async processWebhook(input: ProcessPaymentWebhookInput): Promise<WebhookProcessingResponse> {
    const trx = await db.transaction();
    
    try {
      // Get provider
      const provider = await trx('payment_gateway_provider')
        .where('id', input.providerId)
        .first();
      
      if (!provider) {
        throw new Error('Payment gateway provider not found');
      }
      
      // Create adapter
      const adapter = getPaymentGatewayAdapter(provider.provider_type, provider.configuration);
      
      // Save webhook event
      const [eventId] = await trx('payment_gateway_webhook_event')
        .insert({
          provider_id: input.providerId,
          event_type: input.eventType,
          payload: JSON.stringify(input.payload),
          status: 'received',
          processing_attempts: 0,
          created_date: new Date()
        })
        .returning('id');
      
      // Process webhook with adapter
      let result;
      let relatedTransactionId = null;
      
      try {
        result = await adapter.processWebhook({
          eventType: input.eventType,
          payload: input.payload
        });
        
        // If webhook processing returns a transaction ID, update transaction status
        if (result.transactionId && result.status) {
          const transaction = await trx('payment_gateway_transaction')
            .where({
              provider_id: input.providerId,
              external_id: result.transactionId
            })
            .first();
          
          if (transaction) {
            relatedTransactionId = transaction.id;
            
            // Update transaction status
            await trx('payment_gateway_transaction')
              .where('id', transaction.id)
              .update({
                status: result.status,
                external_id: result.transactionId,
                error_message: result.errorMessage,
                payment_details: result.paymentDetails ? JSON.stringify(result.paymentDetails) : transaction.payment_details,
                updated_date: new Date()
              });
            
            // Update webhook event with related transaction
            await trx('payment_gateway_webhook_event')
              .where('id', eventId)
              .update({
                related_transaction_id: transaction.id,
                status: 'processed',
                updated_date: new Date()
              });
          } else {
            // Transaction not found, might be a new transaction that needs to be created
            // For example, a subscription payment or an externally created payment
            
            if (result.shouldCreateTransaction && result.transactionData) {
              // Create new transaction from webhook data
              const [newTxId] = await trx('payment_gateway_transaction')
                .insert({
                  provider_id: input.providerId,
                  transaction_type: result.transactionData.type || 'payment',
                  external_id: result.transactionId,
                  amount: result.transactionData.amount,
                  currency: result.transactionData.currency,
                  status: result.status,
                  error_message: result.errorMessage,
                  payment_method: result.transactionData.paymentMethod,
                  payment_details: result.transactionData.paymentDetails ? JSON.stringify(result.transactionData.paymentDetails) : null,
                  reference_number: result.transactionData.referenceNumber,
                  client_id: result.transactionData.clientId,
                  metadata: result.transactionData.metadata ? JSON.stringify(result.transactionData.metadata) : null,
                  request_payload: null,
                  response_payload: JSON.stringify(input.payload),
                  created_date: new Date()
                })
                .returning('id');
              
              relatedTransactionId = newTxId;
              
              // Update webhook event with related transaction
              await trx('payment_gateway_webhook_event')
                .where('id', eventId)
                .update({
                  related_transaction_id: newTxId,
                  status: 'processed',
                  updated_date: new Date()
                });
            } else {
              // No transaction to update or create
              await trx('payment_gateway_webhook_event')
                .where('id', eventId)
                .update({
                  status: 'processed',
                  updated_date: new Date()
                });
            }
          }
        } else {
          // No transaction info in result, just mark webhook as processed
          await trx('payment_gateway_webhook_event')
            .where('id', eventId)
            .update({
              status: 'processed',
              updated_date: new Date()
            });
        }
      } catch (error) {
        // Log webhook processing error
        logger.error('Error processing webhook', { error, eventId, providerId: input.providerId, eventType: input.eventType });
        
        // Update webhook event with error
        await trx('payment_gateway_webhook_event')
          .where('id', eventId)
          .update({
            status: 'failed',
            error_message: error.message,
            processing_attempts: 1,
            updated_date: new Date()
          });
        
        // Re-throw error
        throw error;
      }
      
      await trx.commit();
      
      // Return response
      return {
        success: true,
        eventId,
        eventType: input.eventType,
        relatedTransactionId,
        status: 'processed',
        message: result?.message || 'Webhook processed successfully'
      };
    } catch (error) {
      await trx.rollback();
      logger.error('Error processing webhook', { error, input });
      throw error;
    }
  }
}

// Export service instance
export const paymentGatewayService = new PaymentGatewayService();