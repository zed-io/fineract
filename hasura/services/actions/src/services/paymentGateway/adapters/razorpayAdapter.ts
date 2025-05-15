/**
 * Razorpay Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for Razorpay (popular in India)
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate Razorpay configuration
 */
function validateRazorpayConfig(config: any): void {
  if (!config.keyId) {
    throw new Error('Razorpay key ID is required');
  }
  
  if (!config.keySecret) {
    throw new Error('Razorpay key secret is required');
  }
  
  if (!config.webhookSecret && config.useWebhooks) {
    throw new Error('Razorpay webhook secret is required when webhooks are enabled');
  }
}

/**
 * Map Fineract frequency to Razorpay interval
 */
function mapFrequencyToRazorpayInterval(frequency: RecurringFrequency): { period: string; interval: number } {
  switch (frequency) {
    case 'daily':
      return { period: 'daily', interval: 1 };
    case 'weekly':
      return { period: 'weekly', interval: 1 };
    case 'biweekly':
      return { period: 'weekly', interval: 2 };
    case 'monthly':
      return { period: 'monthly', interval: 1 };
    case 'quarterly':
      return { period: 'monthly', interval: 3 };
    case 'annual':
      return { period: 'yearly', interval: 1 };
    default:
      return { period: 'monthly', interval: 1 };
  }
}

/**
 * Razorpay Payment Gateway Adapter
 */
export class RazorpayAdapter implements PaymentGatewayAdapter {
  private config: any;
  private razorpay: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateRazorpayConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd import the Razorpay SDK
    // const Razorpay = require('razorpay');
    // this.razorpay = new Razorpay({
    //   key_id: this.config.keyId,
    //   key_secret: this.config.keySecret
    // });
    
    // For this demonstration, we'll simulate Razorpay functionality
    this.razorpay = {
      orders: {
        create: this.simulateOrderCreate.bind(this),
        fetchPayments: this.simulateFetchOrderPayments.bind(this)
      },
      payments: {
        fetch: this.simulateFetchPayment.bind(this),
        capture: this.simulateCapturePayment.bind(this)
      },
      refunds: {
        create: this.simulateCreateRefund.bind(this),
        fetch: this.simulateFetchRefund.bind(this)
      },
      customers: {
        create: this.simulateCreateCustomer.bind(this),
        fetch: this.simulateFetchCustomer.bind(this)
      },
      tokens: {
        fetch: this.simulateFetchToken.bind(this),
        delete: this.simulateDeleteToken.bind(this)
      },
      subscriptions: {
        create: this.simulateCreateSubscription.bind(this),
        pause: this.simulatePauseSubscription.bind(this),
        resume: this.simulateResumeSubscription.bind(this),
        cancel: this.simulateCancelSubscription.bind(this)
      },
      plans: {
        create: this.simulateCreatePlan.bind(this)
      }
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
      const amountInSmallestUnit = Math.round(input.amount * 100); // Razorpay uses paisa (100 paisa = 1 INR)
      
      // Validate currency is supported by Razorpay
      if (input.currency.toUpperCase() !== 'INR') {
        throw new Error('Razorpay only supports INR currency');
      }
      
      const requestData = {
        amount: amountInSmallestUnit,
        currency: 'INR',
        receipt: input.transactionId,
        notes: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        },
        partial_payment: false
      };
      
      this.lastRequest = requestData;
      
      // Create order
      const order = await this.razorpay.orders.create(requestData);
      
      this.lastResponse = order;
      
      // For Razorpay, we need to create an order and return a checkout URL
      const checkoutUrl = input.callbackUrl 
        ? `${this.config.checkoutBaseUrl}?order_id=${order.id}&callback_url=${encodeURIComponent(input.callbackUrl)}`
        : `${this.config.checkoutBaseUrl}?order_id=${order.id}`;
      
      return {
        externalId: order.id,
        status: 'pending',
        paymentUrl: checkoutUrl
      };
    } catch (error) {
      logger.error('Error creating Razorpay payment', { error, input });
      throw new Error(`Razorpay payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Execute a payment
   * With Razorpay, this would typically happen on the frontend, but we support server-side verification here
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
    try {
      // With Razorpay, payment execution happens on the frontend
      // Here we would typically verify a payment that was already made
      
      if (!input.externalId) {
        throw new Error('Order ID is required');
      }
      
      // If payment ID is provided, we can verify and capture it
      let paymentId = input.paymentDetails?.razorpay_payment_id;
      
      if (!paymentId) {
        // Check if the order has any payments
        const payments = await this.razorpay.orders.fetchPayments(input.externalId);
        
        if (payments.items && payments.items.length > 0) {
          paymentId = payments.items[0].id;
        } else {
          // No payment found for this order
          return {
            success: false,
            status: 'pending',
            errorMessage: 'No payment found for this order'
          };
        }
      }
      
      // Now we have a payment ID, let's verify its status
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      this.lastRequest = { payment_id: paymentId };
      this.lastResponse = payment;
      
      // If payment is authorized but not captured, capture it
      if (payment.status === 'authorized') {
        const captureRequest = {
          amount: payment.amount,
          currency: payment.currency
        };
        
        this.lastRequest = captureRequest;
        
        const capturedPayment = await this.razorpay.payments.capture(paymentId, payment.amount);
        
        this.lastResponse = capturedPayment;
        
        // Map status
        const status = this.mapRazorpayStatusToFineract(capturedPayment.status);
        
        return {
          success: status === 'completed',
          status,
          paymentDetails: {
            paymentId: capturedPayment.id,
            orderId: capturedPayment.order_id,
            method: capturedPayment.method,
            cardId: capturedPayment.card ? capturedPayment.card.id : null,
            email: capturedPayment.email,
            contact: capturedPayment.contact
          }
        };
      } else {
        // Payment is already in a final state (captured, failed, or refunded)
        const status = this.mapRazorpayStatusToFineract(payment.status);
        
        return {
          success: status === 'completed',
          status,
          errorMessage: payment.error_code ? `${payment.error_code}: ${payment.error_description}` : undefined,
          paymentDetails: {
            paymentId: payment.id,
            orderId: payment.order_id,
            method: payment.method,
            cardId: payment.card ? payment.card.id : null,
            email: payment.email,
            contact: payment.contact
          }
        };
      }
    } catch (error) {
      logger.error('Error executing Razorpay payment', { error, input });
      throw new Error(`Razorpay payment execution failed: ${error.message}`);
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
        throw new Error('Order ID is required');
      }
      
      // Check if the order has any payments
      const payments = await this.razorpay.orders.fetchPayments(input.externalId);
      
      this.lastRequest = { order_id: input.externalId };
      this.lastResponse = payments;
      
      if (!payments.items || payments.items.length === 0) {
        // No payment found for this order
        return {
          status: 'pending',
          externalId: input.externalId,
          paymentDetails: {
            orderId: input.externalId
          }
        };
      }
      
      // Get the latest payment
      const payment = payments.items[0];
      
      // Map status
      const status = this.mapRazorpayStatusToFineract(payment.status);
      
      return {
        status,
        externalId: payment.id,
        errorMessage: payment.error_code ? `${payment.error_code}: ${payment.error_description}` : undefined,
        paymentDetails: {
          orderId: payment.order_id,
          method: payment.method,
          cardId: payment.card ? payment.card.id : null,
          email: payment.email,
          contact: payment.contact
        }
      };
    } catch (error) {
      logger.error('Error checking Razorpay payment status', { error, input });
      throw new Error(`Razorpay payment status check failed: ${error.message}`);
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
      let paymentId = input.externalId;
      
      // If payment ID is not provided but order ID is, get the payment ID
      if (!paymentId && input.metadata?.orderId) {
        const payments = await this.razorpay.orders.fetchPayments(input.metadata.orderId);
        
        if (payments.items && payments.items.length > 0) {
          paymentId = payments.items[0].id;
        } else {
          throw new Error('No payment found for the provided order ID');
        }
      }
      
      if (!paymentId) {
        throw new Error('Payment ID is required for refund');
      }
      
      // Prepare refund request
      const amountInSmallestUnit = Math.round(input.amount * 100); // Razorpay uses paisa
      
      const requestData: any = {
        payment_id: paymentId,
        amount: amountInSmallestUnit,
        notes: {
          fineract_transaction_id: input.transactionId,
          reason: input.reason,
          ...input.metadata
        }
      };
      
      // For partial refunds, provide an amount
      if (input.metadata?.originalAmount && 
          input.amount < input.metadata.originalAmount) {
        requestData.amount = amountInSmallestUnit;
      }
      
      this.lastRequest = requestData;
      
      // Create refund
      const refund = await this.razorpay.refunds.create(requestData);
      
      this.lastResponse = refund;
      
      // Return result
      return {
        success: refund.status === 'processed',
        status: refund.status === 'processed' ? 'completed' : 'pending',
        refundId: refund.id,
        errorMessage: refund.error_code ? `${refund.error_code}: ${refund.error_description}` : undefined
      };
    } catch (error) {
      logger.error('Error refunding Razorpay payment', { error, input });
      throw new Error(`Razorpay refund failed: ${error.message}`);
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
      // In Razorpay, we validate a saved card token
      this.lastRequest = { token_id: input.token };
      
      // Fetch token to validate it exists
      const token = await this.razorpay.tokens.fetch(input.token);
      
      this.lastResponse = token;
      
      // Check if token is valid
      return !!token.id;
    } catch (error) {
      logger.error('Error validating Razorpay payment method token', { error, input });
      throw new Error(`Invalid payment method token: ${error.message}`);
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
      const amountInSmallestUnit = Math.round(input.amount * 100); // Razorpay uses paisa
      const { period, interval } = mapFrequencyToRazorpayInterval(input.frequency);
      
      // Validate currency is supported by Razorpay
      if (input.currency.toUpperCase() !== 'INR') {
        throw new Error('Razorpay only supports INR currency');
      }
      
      // First, create a plan
      const planRequestData = {
        period,
        interval,
        item: {
          name: input.description || 'Fineract Subscription',
          amount: amountInSmallestUnit,
          currency: 'INR'
        },
        notes: {
          description: input.description,
          ...input.metadata
        }
      };
      
      this.lastRequest = planRequestData;
      
      const plan = await this.razorpay.plans.create(planRequestData);
      
      // Get or create customer
      let customerId;
      
      if (input.metadata?.customerId) {
        // Use existing customer
        try {
          const customer = await this.razorpay.customers.fetch(input.metadata.customerId);
          customerId = customer.id;
        } catch (error) {
          // Customer not found, create new one
          const customerData = {
            name: input.metadata?.customerName || 'Fineract Customer',
            email: input.metadata?.email || 'customer@example.com',
            contact: input.metadata?.phone || '9999999999',
            notes: {
              fineract_client_id: input.metadata?.clientId
            }
          };
          
          const newCustomer = await this.razorpay.customers.create(customerData);
          customerId = newCustomer.id;
        }
      } else {
        // Create new customer
        const customerData = {
          name: input.metadata?.customerName || 'Fineract Customer',
          email: input.metadata?.email || 'customer@example.com',
          contact: input.metadata?.phone || '9999999999',
          notes: {
            fineract_client_id: input.metadata?.clientId
          }
        };
        
        const customer = await this.razorpay.customers.create(customerData);
        customerId = customer.id;
      }
      
      // Create subscription
      const startDate = input.startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const subscriptionRequestData = {
        plan_id: plan.id,
        customer_id: customerId,
        token: input.paymentMethodToken,
        start_at: Math.floor(input.startDate.getTime() / 1000),
        total_count: input.endDate 
          ? Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)) // Approximate months
          : null,
        notes: {
          fineract_client_id: input.metadata?.clientId,
          ...input.metadata
        }
      };
      
      this.lastRequest = subscriptionRequestData;
      
      const subscription = await this.razorpay.subscriptions.create(subscriptionRequestData);
      
      this.lastResponse = subscription;
      
      // Map status
      const status = this.mapRazorpaySubscriptionStatusToFineract(subscription.status);
      
      return {
        subscriptionId: subscription.id,
        status
      };
    } catch (error) {
      logger.error('Error creating Razorpay recurring payment', { error, input });
      throw new Error(`Razorpay recurring payment creation failed: ${error.message}`);
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
      
      switch (input.status) {
        case 'active':
          // Resume subscription
          this.lastRequest = { subscription_id: input.subscriptionId };
          await this.razorpay.subscriptions.resume(input.subscriptionId);
          break;
          
        case 'paused':
          // Pause subscription
          this.lastRequest = { subscription_id: input.subscriptionId };
          await this.razorpay.subscriptions.pause(input.subscriptionId);
          break;
          
        case 'cancelled':
          // Cancel subscription
          this.lastRequest = { subscription_id: input.subscriptionId };
          await this.razorpay.subscriptions.cancel(input.subscriptionId);
          break;
          
        default:
          throw new Error(`Unsupported subscription status: ${input.status}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating Razorpay recurring payment status', { error, input });
      throw new Error(`Razorpay recurring payment status update failed: ${error.message}`);
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
      
      // In a real implementation, we would validate the webhook signature
      // const secret = this.config.webhookSecret;
      // const shasum = crypto.createHmac('sha256', secret);
      // shasum.update(JSON.stringify(input.payload));
      // const digest = shasum.digest('hex');
      
      // if (digest !== input.signature) {
      //   throw new Error('Invalid webhook signature');
      // }
      
      // For this demo, assume payload is the event
      const event = input.payload;
      
      this.lastResponse = event;
      
      // Process based on event type
      switch (input.eventType) {
        case 'payment.authorized':
        case 'payment.captured':
          // Handle payment success
          const payment = event.payload.payment.entity;
          
          // Map status
          const status = this.mapRazorpayStatusToFineract(payment.status);
          
          return {
            transactionId: payment.id,
            status,
            paymentDetails: {
              orderId: payment.order_id,
              method: payment.method,
              email: payment.email,
              contact: payment.contact,
              amount: payment.amount / 100 // Convert paisa to rupees
            },
            message: `Payment ${status}`
          };
          
        case 'payment.failed':
          // Handle payment failure
          const failedPayment = event.payload.payment.entity;
          
          return {
            transactionId: failedPayment.id,
            status: 'failed',
            errorMessage: failedPayment.error_code ? `${failedPayment.error_code}: ${failedPayment.error_description}` : 'Payment failed',
            message: 'Payment failed'
          };
          
        case 'refund.created':
        case 'refund.processed':
          // Handle refund
          const refund = event.payload.refund.entity;
          const refundedPayment = event.payload.payment.entity;
          
          // Check if full or partial refund
          const isFullRefund = refund.amount === refundedPayment.amount;
          
          return {
            transactionId: refundedPayment.id,
            status: isFullRefund ? 'refunded' : 'partially_refunded',
            paymentDetails: {
              refundId: refund.id,
              refundAmount: refund.amount / 100, // Convert paisa to rupees
              refundStatus: refund.status
            },
            message: isFullRefund ? 'Payment fully refunded' : 'Payment partially refunded'
          };
          
        case 'subscription.charged':
          // Handle subscription payment
          const invoice = event.payload.subscription.entity;
          const subscriptionPayment = event.payload.payment.entity;
          
          // Create a transaction for this subscription payment
          return {
            transactionId: subscriptionPayment.id,
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: subscriptionPayment.amount / 100, // Convert paisa to rupees
              currency: 'INR',
              paymentMethod: subscriptionPayment.method || 'card',
              paymentDetails: {
                subscriptionId: invoice.id,
                paymentId: subscriptionPayment.id,
                planId: invoice.plan_id
              },
              referenceNumber: `RAZORPAY-SUB-${invoice.id}`,
              clientId: invoice.notes?.fineract_client_id,
              metadata: {
                subscriptionId: invoice.id,
                customerId: invoice.customer_id,
                planId: invoice.plan_id
              }
            },
            message: 'Subscription payment received'
          };
          
        case 'subscription.cancelled':
        case 'subscription.paused':
        case 'subscription.resumed':
          // Handle subscription status change
          const subscription = event.payload.subscription.entity;
          
          return {
            message: `Subscription ${subscription.status}`,
            status: this.mapRazorpaySubscriptionStatusToFineract(subscription.status)
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled event type: ${input.eventType}`
          };
      }
    } catch (error) {
      logger.error('Error processing Razorpay webhook', { error, input });
      throw new Error(`Razorpay webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to Razorpay
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from Razorpay
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  /**
   * Map Razorpay payment status to Fineract status
   */
  private mapRazorpayStatusToFineract(razorpayStatus: string): string {
    switch (razorpayStatus) {
      case 'captured':
        return 'completed';
      case 'authorized':
      case 'created':
        return 'pending';
      case 'failed':
        return 'failed';
      case 'refunded':
        return 'refunded';
      case 'partially_refunded':
        return 'partially_refunded';
      default:
        return 'pending';
    }
  }
  
  /**
   * Map Razorpay subscription status to Fineract status
   */
  private mapRazorpaySubscriptionStatusToFineract(razorpayStatus: string): string {
    switch (razorpayStatus) {
      case 'active':
        return 'active';
      case 'created':
      case 'authenticated':
        return 'pending';
      case 'paused':
        return 'paused';
      case 'cancelled':
      case 'completed':
        return 'cancelled';
      case 'halted':
        return 'failed';
      default:
        return 'pending';
    }
  }
  
  // Simulation methods for demonstration
  
  private async simulateOrderCreate(data: any): Promise<any> {
    return {
      id: `order_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'order',
      amount: data.amount,
      amount_paid: 0,
      amount_due: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: 'created',
      attempts: 0,
      notes: data.notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateFetchOrderPayments(orderId: string): Promise<any> {
    return {
      entity: 'collection',
      count: 1,
      items: [
        {
          id: `pay_${Math.random().toString(36).substring(2, 15)}`,
          entity: 'payment',
          amount: 10000,
          currency: 'INR',
          status: 'captured',
          order_id: orderId,
          method: 'card',
          card: {
            id: `card_${Math.random().toString(36).substring(2, 15)}`,
            last4: '1111',
            network: 'Visa'
          },
          email: 'customer@example.com',
          contact: '+919999999999',
          created_at: Math.floor(Date.now() / 1000)
        }
      ]
    };
  }
  
  private async simulateFetchPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      entity: 'payment',
      amount: 10000,
      currency: 'INR',
      status: 'captured',
      order_id: `order_${Math.random().toString(36).substring(2, 15)}`,
      method: 'card',
      card: {
        id: `card_${Math.random().toString(36).substring(2, 15)}`,
        last4: '1111',
        network: 'Visa'
      },
      email: 'customer@example.com',
      contact: '+919999999999',
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCapturePayment(paymentId: string, amount: number): Promise<any> {
    return {
      id: paymentId,
      entity: 'payment',
      amount: amount,
      currency: 'INR',
      status: 'captured',
      order_id: `order_${Math.random().toString(36).substring(2, 15)}`,
      method: 'card',
      card: {
        id: `card_${Math.random().toString(36).substring(2, 15)}`,
        last4: '1111',
        network: 'Visa'
      },
      email: 'customer@example.com',
      contact: '+919999999999',
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCreateRefund(data: any): Promise<any> {
    return {
      id: `rfnd_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'refund',
      amount: data.amount,
      currency: 'INR',
      payment_id: data.payment_id,
      notes: data.notes,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateFetchRefund(refundId: string): Promise<any> {
    return {
      id: refundId,
      entity: 'refund',
      amount: 10000,
      currency: 'INR',
      payment_id: `pay_${Math.random().toString(36).substring(2, 15)}`,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCreateCustomer(data: any): Promise<any> {
    return {
      id: `cust_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'customer',
      name: data.name,
      email: data.email,
      contact: data.contact,
      notes: data.notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateFetchCustomer(customerId: string): Promise<any> {
    return {
      id: customerId,
      entity: 'customer',
      name: 'Test Customer',
      email: 'customer@example.com',
      contact: '+919999999999',
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateFetchToken(tokenId: string): Promise<any> {
    return {
      id: tokenId,
      entity: 'token',
      card: {
        last4: '1111',
        network: 'Visa'
      },
      customer_id: `cust_${Math.random().toString(36).substring(2, 15)}`,
      expired: false
    };
  }
  
  private async simulateDeleteToken(tokenId: string): Promise<any> {
    return {
      deleted: true
    };
  }
  
  private async simulateCreatePlan(data: any): Promise<any> {
    return {
      id: `plan_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'plan',
      interval: data.interval,
      period: data.period,
      item: {
        id: `item_${Math.random().toString(36).substring(2, 15)}`,
        name: data.item.name,
        amount: data.item.amount,
        currency: data.item.currency
      },
      notes: data.notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCreateSubscription(data: any): Promise<any> {
    return {
      id: `sub_${Math.random().toString(36).substring(2, 15)}`,
      entity: 'subscription',
      plan_id: data.plan_id,
      customer_id: data.customer_id,
      status: 'active',
      start_at: data.start_at,
      total_count: data.total_count,
      paid_count: 0,
      remaining_count: data.total_count,
      notes: data.notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulatePauseSubscription(subscriptionId: string): Promise<any> {
    return {
      id: subscriptionId,
      entity: 'subscription',
      status: 'paused',
      paused_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateResumeSubscription(subscriptionId: string): Promise<any> {
    return {
      id: subscriptionId,
      entity: 'subscription',
      status: 'active',
      resumed_at: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCancelSubscription(subscriptionId: string): Promise<any> {
    return {
      id: subscriptionId,
      entity: 'subscription',
      status: 'cancelled',
      cancelled_at: Math.floor(Date.now() / 1000)
    };
  }
}