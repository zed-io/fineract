/**
 * Authorize.Net Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for Authorize.Net
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate Authorize.Net configuration
 */
function validateAuthorizeNetConfig(config: any): void {
  if (!config.apiLoginId) {
    throw new Error('Authorize.Net API Login ID is required');
  }
  
  if (!config.transactionKey) {
    throw new Error('Authorize.Net Transaction Key is required');
  }
  
  if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
    throw new Error('Authorize.Net environment must be either "sandbox" or "production"');
  }
}

/**
 * Authorize.Net Payment Gateway Adapter
 */
export class AuthorizeNetAdapter implements PaymentGatewayAdapter {
  private config: any;
  private authorizeNet: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateAuthorizeNetConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd configure the Authorize.Net SDK
    // However, for this example, we'll just create placeholders for the methods we need
    
    this.authorizeNet = {
      createTransaction: this.simulateCreateTransaction.bind(this),
      getTransactionDetails: this.simulateGetTransactionDetails.bind(this),
      refundTransaction: this.simulateRefundTransaction.bind(this),
      createSubscription: this.simulateCreateSubscription.bind(this),
      updateSubscription: this.simulateUpdateSubscription.bind(this),
      cancelSubscription: this.simulateCancelSubscription.bind(this),
      validatePaymentMethod: this.simulateValidatePaymentMethod.bind(this)
    };
  }
  
  /**
   * Create a payment
   */
  async createPayment(input: {
    transactionId: string;
    amount: number;
    currency: string;
    callbackUrl?: string;
    metadata?: any;
  }): Promise<{
    externalId?: string;
    status: string;
    paymentUrl?: string;
  }> {
    try {
      // Prepare request
      const requestData = {
        amount: input.amount,
        currency: input.currency,
        transactionType: 'authCaptureTransaction',
        metadata: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        }
      };
      
      this.lastRequest = requestData;
      
      // Create transaction
      const response = await this.authorizeNet.createTransaction(requestData);
      
      this.lastResponse = response;
      
      return {
        externalId: response.transactionId,
        status: response.transactionStatus === 'approved' ? 'completed' : 'pending',
        paymentUrl: this.config.hostedPaymentPageUrl ? `${this.config.hostedPaymentPageUrl}?ref=${input.transactionId}` : undefined
      };
    } catch (error) {
      logger.error('Error creating Authorize.Net payment', { error, input });
      throw new Error(`Authorize.Net payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Execute a payment
   */
  async executePayment(input: {
    transactionId: string;
    externalId?: string;
    paymentMethod?: string;
    paymentMethodToken?: string;
    paymentDetails?: any;
  }): Promise<{
    success: boolean;
    status: string;
    errorMessage?: string;
    redirectUrl?: string;
    paymentDetails?: any;
  }> {
    // In Authorize.Net, payment execution happens at creation time for direct integrations
    // For hosted payment pages, this would handle form submission
    
    try {
      if (!input.externalId) {
        throw new Error('External ID (Authorize.Net Transaction ID) is required');
      }
      
      // Get transaction details to check status
      const response = await this.authorizeNet.getTransactionDetails(input.externalId);
      
      this.lastResponse = response;
      
      return {
        success: response.transactionStatus === 'approved',
        status: response.transactionStatus === 'approved' ? 'completed' : 'pending',
        errorMessage: response.transactionStatus === 'approved' ? undefined : 'Payment is not yet approved',
        paymentDetails: {
          transactionId: response.transactionId,
          authCode: response.authCode
        }
      };
    } catch (error) {
      logger.error('Error executing Authorize.Net payment', { error, input });
      throw new Error(`Authorize.Net payment execution failed: ${error.message}`);
    }
  }
  
  /**
   * Check payment status
   */
  async checkPaymentStatus(input: {
    transactionId: string;
    externalId?: string;
  }): Promise<{
    status: string;
    externalId?: string;
    errorMessage?: string;
    paymentDetails?: any;
  }> {
    try {
      if (!input.externalId) {
        throw new Error('External ID (Authorize.Net Transaction ID) is required');
      }
      
      this.lastRequest = { transactionId: input.externalId };
      
      // Get transaction details
      const response = await this.authorizeNet.getTransactionDetails(input.externalId);
      
      this.lastResponse = response;
      
      // Map status
      let status;
      switch (response.transactionStatus) {
        case 'approved':
          status = 'completed';
          break;
        case 'declined':
          status = 'failed';
          break;
        case 'voided':
          status = 'cancelled';
          break;
        case 'refundPending':
        case 'refundSettled':
          status = 'refunded';
          break;
        default:
          status = 'pending';
      }
      
      return {
        status,
        externalId: input.externalId,
        errorMessage: response.transactionStatus === 'declined' ? response.responseMessage : undefined,
        paymentDetails: {
          authCode: response.authCode,
          responseCode: response.responseCode,
          responseMessage: response.responseMessage
        }
      };
    } catch (error) {
      logger.error('Error checking Authorize.Net payment status', { error, input });
      throw new Error(`Authorize.Net payment status check failed: ${error.message}`);
    }
  }
  
  /**
   * Refund a payment
   */
  async refundPayment(input: {
    transactionId: string;
    externalId?: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<{
    success: boolean;
    status: string;
    refundId: string;
    errorMessage?: string;
  }> {
    try {
      if (!input.externalId) {
        throw new Error('External ID (Authorize.Net Transaction ID) is required');
      }
      
      // Prepare refund request
      const requestData = {
        refTransId: input.externalId,
        amount: input.amount,
        description: input.reason || 'Refund',
        metadata: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        }
      };
      
      this.lastRequest = requestData;
      
      // Process refund
      const response = await this.authorizeNet.refundTransaction(requestData);
      
      this.lastResponse = response;
      
      return {
        success: response.transactionStatus === 'approved',
        status: response.transactionStatus === 'approved' ? 'completed' : 'pending',
        refundId: response.transactionId,
        errorMessage: response.transactionStatus !== 'approved' ? response.responseMessage : undefined
      };
    } catch (error) {
      logger.error('Error refunding Authorize.Net payment', { error, input });
      throw new Error(`Authorize.Net refund failed: ${error.message}`);
    }
  }
  
  /**
   * Validate payment method token
   */
  async validatePaymentMethodToken(input: {
    token: string;
    paymentMethodType: PaymentMethodType;
  }): Promise<boolean> {
    try {
      this.lastRequest = { payment_method_token: input.token };
      
      // Validate payment method
      const response = await this.authorizeNet.validatePaymentMethod(input.token);
      
      this.lastResponse = response;
      
      return response.valid;
    } catch (error) {
      logger.error('Error validating Authorize.Net payment method token', { error, input });
      return false;
    }
  }
  
  /**
   * Create a recurring payment
   */
  async createRecurringPayment(input: {
    paymentMethodToken: string;
    frequency: RecurringFrequency;
    amount: number;
    currency: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    metadata?: any;
  }): Promise<{
    subscriptionId?: string;
    status: string;
  }> {
    try {
      // Map frequency to Authorize.Net format
      let interval;
      let intervalLength;
      
      switch (input.frequency) {
        case 'daily':
          interval = 'days';
          intervalLength = 1;
          break;
        case 'weekly':
          interval = 'days';
          intervalLength = 7;
          break;
        case 'biweekly':
          interval = 'days';
          intervalLength = 14;
          break;
        case 'monthly':
          interval = 'months';
          intervalLength = 1;
          break;
        case 'quarterly':
          interval = 'months';
          intervalLength = 3;
          break;
        case 'annual':
          interval = 'months';
          intervalLength = 12;
          break;
        default:
          interval = 'months';
          intervalLength = 1;
      }
      
      // Prepare request
      const requestData = {
        paymentMethodToken: input.paymentMethodToken,
        name: input.description || 'Recurring Payment',
        interval: interval,
        intervalLength: intervalLength,
        amount: input.amount,
        startDate: input.startDate.toISOString().split('T')[0],
        totalOccurrences: input.endDate ? this.calculateTotalOccurrences(input.startDate, input.endDate, input.frequency) : 9999,
        metadata: input.metadata
      };
      
      this.lastRequest = requestData;
      
      // Create subscription
      const response = await this.authorizeNet.createSubscription(requestData);
      
      this.lastResponse = response;
      
      return {
        subscriptionId: response.subscriptionId,
        status: response.status === 'active' ? 'active' : 'pending'
      };
    } catch (error) {
      logger.error('Error creating Authorize.Net recurring payment', { error, input });
      throw new Error(`Authorize.Net recurring payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Update recurring payment status
   */
  async updateRecurringPaymentStatus(input: {
    subscriptionId?: string;
    status: string;
  }): Promise<boolean> {
    try {
      if (!input.subscriptionId) {
        throw new Error('Subscription ID is required');
      }
      
      let actionType;
      
      switch (input.status) {
        case 'active':
          actionType = 'reactivate';
          break;
        case 'paused':
          actionType = 'suspend';
          break;
        case 'cancelled':
          actionType = 'cancel';
          // Use dedicated cancel method for cancellations
          const cancelResponse = await this.authorizeNet.cancelSubscription(input.subscriptionId);
          this.lastResponse = cancelResponse;
          return cancelResponse.success;
        default:
          throw new Error(`Unsupported subscription status: ${input.status}`);
      }
      
      const requestData = {
        subscriptionId: input.subscriptionId,
        action: actionType
      };
      
      this.lastRequest = requestData;
      
      // Only call update if not cancelling
      if (input.status !== 'cancelled') {
        const response = await this.authorizeNet.updateSubscription(requestData);
        this.lastResponse = response;
        return response.success;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating Authorize.Net recurring payment status', { error, input });
      throw new Error(`Authorize.Net recurring payment status update failed: ${error.message}`);
    }
  }
  
  /**
   * Process webhook
   */
  async processWebhook(input: {
    eventType: string;
    payload: any;
  }): Promise<{
    transactionId?: string;
    status?: string;
    errorMessage?: string;
    paymentDetails?: any;
    message?: string;
    shouldCreateTransaction?: boolean;
    transactionData?: {
      type?: string;
      amount: number;
      currency: string;
      paymentMethod?: string;
      paymentDetails?: any;
      referenceNumber?: string;
      clientId?: string;
      metadata?: any;
    };
  }> {
    try {
      this.lastRequest = input;
      
      // In a real implementation, we would authenticate the webhook
      
      // Process based on event type
      const event = input.payload;
      this.lastResponse = event;
      
      switch (input.eventType) {
        case 'net.authorize.payment.authcapture.created':
          // Handle successful payment
          return {
            transactionId: event.payload.id,
            status: 'completed',
            paymentDetails: {
              authCode: event.payload.authCode
            },
            message: 'Payment authorized and captured'
          };
          
        case 'net.authorize.payment.refund.created':
          // Handle refund
          return {
            transactionId: event.payload.refTransId,
            status: 'refunded',
            paymentDetails: {
              refundId: event.payload.id,
              refundAmount: event.payload.amount
            },
            message: 'Payment refunded'
          };
          
        case 'net.authorize.payment.void.created':
          // Handle void
          return {
            transactionId: event.payload.refTransId,
            status: 'cancelled',
            message: 'Payment voided'
          };
          
        case 'net.authorize.customer.subscription.created':
          // Handle subscription created
          return {
            message: 'Subscription created',
            status: 'active'
          };
          
        case 'net.authorize.customer.subscription.updated':
          // Handle subscription status change
          let status;
          switch (event.payload.status) {
            case 'active':
              status = 'active';
              break;
            case 'suspended':
              status = 'paused';
              break;
            case 'terminated':
              status = 'cancelled';
              break;
            default:
              status = 'pending';
          }
          
          return {
            message: `Subscription ${status}`,
            status
          };
          
        case 'net.authorize.customer.subscription.terminated':
          // Handle subscription cancelled
          return {
            message: 'Subscription cancelled',
            status: 'cancelled'
          };
          
        case 'net.authorize.payment.priorAuthCapture.created':
          // Handle subscription payment
          return {
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: event.payload.amount,
              currency: 'USD', // Authorize.Net typically uses USD
              paymentMethod: 'card',
              paymentDetails: {
                transactionId: event.payload.id,
                authCode: event.payload.authCode
              },
              referenceNumber: `SUB-${event.payload.subscription.id}`,
              clientId: event.payload.customer?.id,
              metadata: {
                subscriptionId: event.payload.subscription?.id
              }
            },
            message: 'Subscription payment processed'
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled event type: ${input.eventType}`
          };
      }
    } catch (error) {
      logger.error('Error processing Authorize.Net webhook', { error, input });
      throw new Error(`Authorize.Net webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to Authorize.Net
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from Authorize.Net
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  /**
   * Calculate total occurrences for subscription
   */
  private calculateTotalOccurrences(startDate: Date, endDate: Date, frequency: RecurringFrequency): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (frequency) {
      case 'daily':
        return diffDays;
      case 'weekly':
        return Math.ceil(diffDays / 7);
      case 'biweekly':
        return Math.ceil(diffDays / 14);
      case 'monthly':
        // Approximate - there's a more complex way to calculate this precisely
        return Math.ceil(diffDays / 30);
      case 'quarterly':
        return Math.ceil(diffDays / 90);
      case 'annual':
        return Math.ceil(diffDays / 365);
      default:
        return Math.ceil(diffDays / 30); // Default to monthly
    }
  }
  
  // Simulation methods for demonstration
  
  private simulateCreateTransaction(data: any): Promise<any> {
    return Promise.resolve({
      transactionId: `ANET_${Math.random().toString(36).substring(2, 15)}`,
      transactionStatus: 'approved',
      authCode: `AUTH_${Math.floor(Math.random() * 1000000)}`,
      responseCode: 1,
      responseMessage: 'This transaction has been approved.',
      avsResultCode: 'Y',
      cvvResultCode: 'P'
    });
  }
  
  private simulateGetTransactionDetails(transactionId: string): Promise<any> {
    return Promise.resolve({
      transactionId,
      transactionStatus: 'approved',
      authCode: `AUTH_${Math.floor(Math.random() * 1000000)}`,
      responseCode: 1,
      responseMessage: 'This transaction has been approved.',
      transactionType: 'authCaptureTransaction',
      amount: 100.00,
      submitTimeLocal: new Date().toISOString(),
      avsResultCode: 'Y',
      cvvResultCode: 'P'
    });
  }
  
  private simulateRefundTransaction(data: any): Promise<any> {
    return Promise.resolve({
      transactionId: `RFND_${Math.random().toString(36).substring(2, 15)}`,
      transactionStatus: 'approved',
      responseCode: 1,
      responseMessage: 'This transaction has been approved.',
      refTransId: data.refTransId
    });
  }
  
  private simulateCreateSubscription(data: any): Promise<any> {
    return Promise.resolve({
      subscriptionId: `SUB_${Math.random().toString(36).substring(2, 15)}`,
      status: 'active',
      paymentMethodToken: data.paymentMethodToken,
      startDate: data.startDate,
      totalOccurrences: data.totalOccurrences
    });
  }
  
  private simulateUpdateSubscription(data: any): Promise<any> {
    let status;
    
    switch (data.action) {
      case 'reactivate':
        status = 'active';
        break;
      case 'suspend':
        status = 'suspended';
        break;
      default:
        status = 'active';
    }
    
    return Promise.resolve({
      subscriptionId: data.subscriptionId,
      status,
      success: true
    });
  }
  
  private simulateCancelSubscription(subscriptionId: string): Promise<any> {
    return Promise.resolve({
      subscriptionId,
      status: 'terminated',
      success: true
    });
  }
  
  private simulateValidatePaymentMethod(token: string): Promise<any> {
    return Promise.resolve({
      valid: true,
      paymentMethodToken: token,
      type: 'creditCard',
      lastFour: '1234',
      expirationDate: '12/2025'
    });
  }
}