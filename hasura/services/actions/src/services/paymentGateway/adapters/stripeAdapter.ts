/**
 * Stripe Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for Stripe
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate Stripe configuration
 */
function validateStripeConfig(config: any): void {
  if (!config.apiKey) {
    throw new Error('Stripe API key is required');
  }
  
  if (!config.webhookSecret && config.useWebhooks) {
    throw new Error('Stripe webhook secret is required when webhooks are enabled');
  }
}

/**
 * Map Fineract frequency to Stripe interval
 */
function mapFrequencyToStripeInterval(frequency: RecurringFrequency): { interval: string; intervalCount: number } {
  switch (frequency) {
    case 'daily':
      return { interval: 'day', intervalCount: 1 };
    case 'weekly':
      return { interval: 'week', intervalCount: 1 };
    case 'biweekly':
      return { interval: 'week', intervalCount: 2 };
    case 'monthly':
      return { interval: 'month', intervalCount: 1 };
    case 'quarterly':
      return { interval: 'month', intervalCount: 3 };
    case 'annual':
      return { interval: 'year', intervalCount: 1 };
    default:
      return { interval: 'month', intervalCount: 1 };
  }
}

/**
 * Stripe Payment Gateway Adapter
 */
export class StripeAdapter implements PaymentGatewayAdapter {
  private config: any;
  private stripe: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateStripeConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd import the Stripe library
    // const stripe = require('stripe');
    // this.stripe = stripe(this.config.apiKey);
    
    // For this demonstration, we'll simulate Stripe functionality
    this.stripe = {
      paymentIntents: {
        create: this.simulatePaymentIntentCreate.bind(this),
        confirm: this.simulatePaymentIntentConfirm.bind(this),
        retrieve: this.simulatePaymentIntentRetrieve.bind(this)
      },
      refunds: {
        create: this.simulateRefundCreate.bind(this)
      },
      customers: {
        create: this.simulateCustomerCreate.bind(this),
        retrieve: this.simulateCustomerRetrieve.bind(this)
      },
      paymentMethods: {
        retrieve: this.simulatePaymentMethodRetrieve.bind(this)
      },
      subscriptions: {
        create: this.simulateSubscriptionCreate.bind(this),
        update: this.simulateSubscriptionUpdate.bind(this),
        cancel: this.simulateSubscriptionCancel.bind(this)
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
      const amountInCents = Math.round(input.amount * 100); // Stripe uses cents
      
      const requestData = {
        amount: amountInCents,
        currency: input.currency.toLowerCase(),
        payment_method_types: ['card'],
        metadata: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        },
        return_url: input.callbackUrl,
        confirm: false
      };
      
      this.lastRequest = requestData;
      
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create(requestData);
      this.lastResponse = paymentIntent;
      
      // Determine status
      const status = this.mapStripeStatusToFineract(paymentIntent.status);
      
      // Construct payment URL (in real implementation this would use Stripe.js)
      const paymentUrl = this.config.redirectUrl
        ? `${this.config.redirectUrl}?payment_intent=${paymentIntent.id}&client_secret=${paymentIntent.client_secret}`
        : undefined;
      
      return {
        externalId: paymentIntent.id,
        status,
        paymentUrl
      };
    } catch (error) {
      logger.error('Error creating Stripe payment', { error, input });
      throw new Error(`Stripe payment creation failed: ${error.message}`);
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
    try {
      if (!input.externalId) {
        throw new Error('External ID (Stripe Payment Intent ID) is required');
      }
      
      // Prepare request
      const requestData: any = {
        payment_method: input.paymentMethodToken
      };
      
      if (input.paymentDetails?.returnUrl) {
        requestData.return_url = input.paymentDetails.returnUrl;
      }
      
      this.lastRequest = requestData;
      
      // Confirm payment intent
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        input.externalId,
        requestData
      );
      
      this.lastResponse = paymentIntent;
      
      // Check if requires action or is successful
      if (paymentIntent.status === 'requires_action' && paymentIntent.next_action?.redirect_to_url?.url) {
        return {
          success: false,
          status: 'pending',
          redirectUrl: paymentIntent.next_action.redirect_to_url.url,
          paymentDetails: {
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            requires3DS: true
          }
        };
      }
      
      // Map status
      const status = this.mapStripeStatusToFineract(paymentIntent.status);
      
      return {
        success: status === 'completed',
        status,
        errorMessage: paymentIntent.last_payment_error?.message,
        paymentDetails: {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method,
          chargeId: paymentIntent.latest_charge
        }
      };
    } catch (error) {
      logger.error('Error executing Stripe payment', { error, input });
      throw new Error(`Stripe payment execution failed: ${error.message}`);
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
        throw new Error('External ID (Stripe Payment Intent ID) is required');
      }
      
      this.lastRequest = { payment_intent_id: input.externalId };
      
      // Retrieve payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(input.externalId);
      
      this.lastResponse = paymentIntent;
      
      // Map status
      const status = this.mapStripeStatusToFineract(paymentIntent.status);
      
      return {
        status,
        externalId: paymentIntent.id,
        errorMessage: paymentIntent.last_payment_error?.message,
        paymentDetails: {
          paymentMethodId: paymentIntent.payment_method,
          chargeId: paymentIntent.latest_charge
        }
      };
    } catch (error) {
      logger.error('Error checking Stripe payment status', { error, input });
      throw new Error(`Stripe payment status check failed: ${error.message}`);
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
        throw new Error('External ID (Stripe Payment Intent ID) is required');
      }
      
      // Retrieve payment intent to get charge ID
      const paymentIntent = await this.stripe.paymentIntents.retrieve(input.externalId);
      
      if (!paymentIntent.latest_charge) {
        throw new Error('No charge found for this payment intent');
      }
      
      // Prepare refund request
      const amountInCents = Math.round(input.amount * 100); // Stripe uses cents
      
      const requestData = {
        charge: paymentIntent.latest_charge,
        amount: amountInCents,
        reason: input.reason || 'requested_by_customer',
        metadata: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        }
      };
      
      this.lastRequest = requestData;
      
      // Create refund
      const refund = await this.stripe.refunds.create(requestData);
      
      this.lastResponse = refund;
      
      // Return result
      return {
        success: refund.status === 'succeeded',
        status: refund.status === 'succeeded' ? 'completed' : 'pending',
        refundId: refund.id,
        errorMessage: refund.failure_reason
      };
    } catch (error) {
      logger.error('Error refunding Stripe payment', { error, input });
      throw new Error(`Stripe refund failed: ${error.message}`);
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
      this.lastRequest = { payment_method_id: input.token };
      
      // Retrieve payment method to validate it exists
      const paymentMethod = await this.stripe.paymentMethods.retrieve(input.token);
      
      this.lastResponse = paymentMethod;
      
      // Check if payment method type matches
      const stripeType = this.mapPaymentMethodTypeToStripe(input.paymentMethodType);
      
      return paymentMethod.type === stripeType;
    } catch (error) {
      logger.error('Error validating Stripe payment method token', { error, input });
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
      const amountInCents = Math.round(input.amount * 100); // Stripe uses cents
      const { interval, intervalCount } = mapFrequencyToStripeInterval(input.frequency);
      
      // First, get or create a customer
      let customerId;
      
      if (input.metadata?.customer_id) {
        // Use existing customer
        try {
          const customer = await this.stripe.customers.retrieve(input.metadata.customer_id);
          customerId = customer.id;
        } catch (error) {
          // Customer not found, create new one
          const newCustomer = await this.stripe.customers.create({
            payment_method: input.paymentMethodToken,
            metadata: {
              fineract_client_id: input.metadata?.clientId
            }
          });
          customerId = newCustomer.id;
        }
      } else {
        // Create new customer
        const customer = await this.stripe.customers.create({
          payment_method: input.paymentMethodToken,
          metadata: {
            fineract_client_id: input.metadata?.clientId
          }
        });
        customerId = customer.id;
      }
      
      // Calculate trial end date if start date is in the future
      const now = new Date();
      const trialEnd = input.startDate > now ? Math.floor(input.startDate.getTime() / 1000) : undefined;
      
      // Calculate subscription end date if provided
      const cancelAt = input.endDate ? Math.floor(input.endDate.getTime() / 1000) : undefined;
      
      // Create price record (in a real implementation, we might want to reuse price records)
      const priceData = {
        currency: input.currency.toLowerCase(),
        unit_amount: amountInCents,
        recurring: {
          interval,
          interval_count: intervalCount
        },
        product_data: {
          name: input.description || 'Fineract Recurring Payment',
          metadata: {
            fineract_subscription: 'true'
          }
        }
      };
      
      // Create subscription
      const requestData = {
        customer: customerId,
        items: [{
          price_data: priceData
        }],
        default_payment_method: input.paymentMethodToken,
        metadata: {
          ...input.metadata,
          fineract_subscription: 'true'
        },
        trial_end: trialEnd,
        cancel_at: cancelAt,
        description: input.description
      };
      
      this.lastRequest = requestData;
      
      const subscription = await this.stripe.subscriptions.create(requestData);
      
      this.lastResponse = subscription;
      
      // Map status
      const status = this.mapStripeSubscriptionStatusToFineract(subscription.status);
      
      return {
        subscriptionId: subscription.id,
        status
      };
    } catch (error) {
      logger.error('Error creating Stripe recurring payment', { error, input });
      throw new Error(`Stripe recurring payment creation failed: ${error.message}`);
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
      
      let requestData;
      
      switch (input.status) {
        case 'active':
          requestData = { pause_collection: null };
          break;
        case 'paused':
          requestData = {
            pause_collection: {
              behavior: 'keep_as_draft'
            }
          };
          break;
        case 'cancelled':
          // For cancellations, use the cancel endpoint
          this.lastRequest = { subscription_id: input.subscriptionId };
          await this.stripe.subscriptions.cancel(input.subscriptionId);
          this.lastResponse = { status: 'canceled' };
          return true;
        default:
          throw new Error(`Unsupported subscription status: ${input.status}`);
      }
      
      this.lastRequest = requestData;
      
      if (input.status !== 'cancelled') {
        const subscription = await this.stripe.subscriptions.update(
          input.subscriptionId,
          requestData
        );
        
        this.lastResponse = subscription;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating Stripe recurring payment status', { error, input });
      throw new Error(`Stripe recurring payment status update failed: ${error.message}`);
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
      // const sig = request.headers['stripe-signature'];
      // const event = this.stripe.webhooks.constructEvent(request.body, sig, this.config.webhookSecret);
      
      // For this demo, assume payload is the event
      const event = input.payload;
      
      this.lastResponse = event;
      
      // Process based on event type
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Handle successful payment
          const paymentIntent = event.data.object;
          return {
            transactionId: paymentIntent.id,
            status: 'completed',
            paymentDetails: {
              chargeId: paymentIntent.latest_charge,
              paymentMethodId: paymentIntent.payment_method
            },
            message: 'Payment succeeded'
          };
          
        case 'payment_intent.payment_failed':
          // Handle failed payment
          const failedPaymentIntent = event.data.object;
          return {
            transactionId: failedPaymentIntent.id,
            status: 'failed',
            errorMessage: failedPaymentIntent.last_payment_error?.message || 'Payment failed',
            message: 'Payment failed'
          };
          
        case 'charge.refunded':
          // Handle refund
          const charge = event.data.object;
          return {
            transactionId: charge.payment_intent,
            status: charge.refunded ? 'refunded' : 'partially_refunded',
            paymentDetails: {
              chargeId: charge.id,
              refundId: charge.refunds.data[0]?.id,
              refundAmount: charge.refunds.data[0]?.amount / 100  // Convert cents to dollars
            },
            message: charge.refunded ? 'Payment fully refunded' : 'Payment partially refunded'
          };
          
        case 'invoice.payment_succeeded':
          // Handle subscription payment
          const invoice = event.data.object;
          
          // Create a new transaction for this subscription payment
          return {
            transactionId: invoice.payment_intent,
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: invoice.amount_paid / 100,  // Convert cents to dollars
              currency: invoice.currency,
              paymentMethod: 'card',
              paymentDetails: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription
              },
              referenceNumber: `SUB-${invoice.subscription}-${invoice.number}`,
              clientId: invoice.customer_metadata?.fineract_client_id,
              metadata: {
                subscriptionId: invoice.subscription,
                invoiceId: invoice.id,
                periodStart: new Date(invoice.period_start * 1000).toISOString(),
                periodEnd: new Date(invoice.period_end * 1000).toISOString()
              }
            },
            message: 'Subscription payment succeeded'
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled event type: ${event.type}`
          };
      }
    } catch (error) {
      logger.error('Error processing Stripe webhook', { error, input });
      throw new Error(`Stripe webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to Stripe
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from Stripe
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  /**
   * Map Stripe payment intent status to Fineract status
   */
  private mapStripeStatusToFineract(stripeStatus: string): string {
    switch (stripeStatus) {
      case 'succeeded':
        return 'completed';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
      case 'processing':
        return 'pending';
      case 'canceled':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
  
  /**
   * Map Stripe subscription status to Fineract status
   */
  private mapStripeSubscriptionStatusToFineract(stripeStatus: string): string {
    switch (stripeStatus) {
      case 'active':
      case 'trialing':
        return 'active';
      case 'incomplete':
      case 'past_due':
        return 'failed';
      case 'canceled':
        return 'cancelled';
      case 'unpaid':
        return 'failed';
      default:
        return 'pending';
    }
  }
  
  /**
   * Map Fineract payment method type to Stripe payment method type
   */
  private mapPaymentMethodTypeToStripe(paymentMethodType: PaymentMethodType): string {
    switch (paymentMethodType) {
      case 'credit_card':
      case 'debit_card':
        return 'card';
      case 'bank_account':
      case 'bank_transfer':
        return 'us_bank_account';
      default:
        return 'card';
    }
  }
  
  // Simulation methods for demonstration
  
  private async simulatePaymentIntentCreate(data: any): Promise<any> {
    return {
      id: `pi_${Math.random().toString(36).substring(2, 15)}`,
      object: 'payment_intent',
      amount: data.amount,
      currency: data.currency,
      status: 'requires_payment_method',
      client_secret: `seti_${Math.random().toString(36).substring(2, 15)}`,
      metadata: data.metadata,
      created: Math.floor(Date.now() / 1000),
      payment_method_types: data.payment_method_types
    };
  }
  
  private async simulatePaymentIntentConfirm(id: string, data: any): Promise<any> {
    return {
      id,
      object: 'payment_intent',
      status: data.payment_method ? 'succeeded' : 'requires_action',
      client_secret: `seti_${Math.random().toString(36).substring(2, 15)}`,
      payment_method: data.payment_method,
      latest_charge: `ch_${Math.random().toString(36).substring(2, 15)}`,
      next_action: data.payment_method ? null : {
        redirect_to_url: {
          url: 'https://example.com/3ds-auth'
        }
      }
    };
  }
  
  private async simulatePaymentIntentRetrieve(id: string): Promise<any> {
    return {
      id,
      object: 'payment_intent',
      status: 'succeeded',
      client_secret: `seti_${Math.random().toString(36).substring(2, 15)}`,
      payment_method: `pm_${Math.random().toString(36).substring(2, 15)}`,
      latest_charge: `ch_${Math.random().toString(36).substring(2, 15)}`
    };
  }
  
  private async simulateRefundCreate(data: any): Promise<any> {
    return {
      id: `re_${Math.random().toString(36).substring(2, 15)}`,
      object: 'refund',
      amount: data.amount,
      charge: data.charge,
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateCustomerCreate(data: any): Promise<any> {
    return {
      id: `cus_${Math.random().toString(36).substring(2, 15)}`,
      object: 'customer',
      created: Math.floor(Date.now() / 1000),
      metadata: data.metadata
    };
  }
  
  private async simulateCustomerRetrieve(id: string): Promise<any> {
    return {
      id,
      object: 'customer',
      created: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulatePaymentMethodRetrieve(id: string): Promise<any> {
    return {
      id,
      object: 'payment_method',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2024
      },
      created: Math.floor(Date.now() / 1000)
    };
  }
  
  private async simulateSubscriptionCreate(data: any): Promise<any> {
    return {
      id: `sub_${Math.random().toString(36).substring(2, 15)}`,
      object: 'subscription',
      status: 'active',
      customer: data.customer,
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      metadata: data.metadata
    };
  }
  
  private async simulateSubscriptionUpdate(id: string, data: any): Promise<any> {
    return {
      id,
      object: 'subscription',
      status: data.pause_collection ? 'paused' : 'active',
      pause_collection: data.pause_collection
    };
  }
  
  private async simulateSubscriptionCancel(id: string): Promise<any> {
    return {
      id,
      object: 'subscription',
      status: 'canceled'
    };
  }
}