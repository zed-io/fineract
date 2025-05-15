/**
 * PayPal Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for PayPal
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate PayPal configuration
 */
function validatePayPalConfig(config: any): void {
  if (!config.clientId) {
    throw new Error('PayPal client ID is required');
  }
  
  if (!config.clientSecret) {
    throw new Error('PayPal client secret is required');
  }
  
  if (!config.environment || !['sandbox', 'live'].includes(config.environment)) {
    throw new Error('PayPal environment must be either "sandbox" or "live"');
  }
}

/**
 * Map Fineract frequency to PayPal interval
 */
function mapFrequencyToPayPalInterval(frequency: RecurringFrequency): { frequency: string; frequencyInterval?: number } {
  switch (frequency) {
    case 'daily':
      return { frequency: 'DAY' };
    case 'weekly':
      return { frequency: 'WEEK' };
    case 'biweekly':
      return { frequency: 'WEEK', frequencyInterval: 2 };
    case 'monthly':
      return { frequency: 'MONTH' };
    case 'quarterly':
      return { frequency: 'MONTH', frequencyInterval: 3 };
    case 'annual':
      return { frequency: 'YEAR' };
    default:
      return { frequency: 'MONTH' };
  }
}

/**
 * PayPal Payment Gateway Adapter
 */
export class PayPalAdapter implements PaymentGatewayAdapter {
  private config: any;
  private paypal: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validatePayPalConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd import the PayPal SDK
    // const paypal = require('@paypal/checkout-server-sdk');
    // const Environment = this.config.environment === 'live' 
    //   ? paypal.core.LiveEnvironment 
    //   : paypal.core.SandboxEnvironment;
    // const client = new paypal.core.PayPalHttpClient(
    //   new Environment(this.config.clientId, this.config.clientSecret)
    // );
    // this.paypal = { client };
    
    // For this demonstration, we'll simulate PayPal functionality
    this.paypal = {
      orders: {
        create: this.simulateOrderCreate.bind(this),
        capture: this.simulateOrderCapture.bind(this),
        get: this.simulateOrderGet.bind(this)
      },
      refunds: {
        create: this.simulateRefundCreate.bind(this),
        get: this.simulateRefundGet.bind(this)
      },
      subscriptions: {
        create: this.simulateSubscriptionCreate.bind(this),
        update: this.simulateSubscriptionUpdate.bind(this),
        cancel: this.simulateSubscriptionCancel.bind(this),
        get: this.simulateSubscriptionGet.bind(this)
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
      const requestData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: input.currency.toUpperCase(),
            value: input.amount.toFixed(2)
          },
          reference_id: input.transactionId,
          custom_id: input.transactionId,
          description: input.metadata?.description || 'Fineract payment'
        }],
        application_context: {
          return_url: input.callbackUrl,
          cancel_url: input.callbackUrl ? `${input.callbackUrl}?cancelled=true` : undefined,
          brand_name: this.config.brandName || 'Fineract',
          user_action: 'PAY_NOW'
        }
      };
      
      this.lastRequest = requestData;
      
      // Create order
      const order = await this.paypal.orders.create(requestData);
      
      this.lastResponse = order;
      
      // Find approval URL
      const approvalLink = order.links.find((link: any) => link.rel === 'approve');
      const paymentUrl = approvalLink ? approvalLink.href : undefined;
      
      // Determine status
      const status = this.mapPayPalStatusToFineract(order.status);
      
      return {
        externalId: order.id,
        status,
        paymentUrl
      };
    } catch (error) {
      logger.error('Error creating PayPal payment', { error, input });
      throw new Error(`PayPal payment creation failed: ${error.message}`);
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
        throw new Error('External ID (PayPal Order ID) is required');
      }
      
      // Prepare request
      const requestData = {};
      
      this.lastRequest = requestData;
      
      // Capture order
      const order = await this.paypal.orders.capture(input.externalId, requestData);
      
      this.lastResponse = order;
      
      // Map status
      const status = this.mapPayPalStatusToFineract(order.status);
      
      return {
        success: status === 'completed',
        status,
        paymentDetails: {
          orderId: order.id,
          payerId: order.payer?.payer_id,
          captureId: order.purchase_units[0]?.payments?.captures[0]?.id
        }
      };
    } catch (error) {
      logger.error('Error executing PayPal payment', { error, input });
      throw new Error(`PayPal payment execution failed: ${error.message}`);
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
        throw new Error('External ID (PayPal Order ID) is required');
      }
      
      this.lastRequest = { order_id: input.externalId };
      
      // Get order
      const order = await this.paypal.orders.get(input.externalId);
      
      this.lastResponse = order;
      
      // Map status
      const status = this.mapPayPalStatusToFineract(order.status);
      
      return {
        status,
        externalId: order.id,
        paymentDetails: {
          orderId: order.id,
          payerId: order.payer?.payer_id,
          captureId: order.purchase_units[0]?.payments?.captures?.[0]?.id
        }
      };
    } catch (error) {
      logger.error('Error checking PayPal payment status', { error, input });
      throw new Error(`PayPal payment status check failed: ${error.message}`);
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
        throw new Error('External ID (PayPal Order ID) is required');
      }
      
      // Get order to find the capture ID
      const order = await this.paypal.orders.get(input.externalId);
      
      const captureId = order.purchase_units[0]?.payments?.captures?.[0]?.id;
      
      if (!captureId) {
        throw new Error('No capture found for this order');
      }
      
      // Prepare refund request
      const requestData: any = {
        capture_id: captureId,
        note_to_payer: input.reason || 'Refund requested',
        invoice_id: input.transactionId
      };
      
      // Add amount if partial refund
      if (input.amount < parseFloat(order.purchase_units[0].amount.value)) {
        requestData.amount = {
          currency_code: order.purchase_units[0].amount.currency_code,
          value: input.amount.toFixed(2)
        };
      }
      
      this.lastRequest = requestData;
      
      // Create refund
      const refund = await this.paypal.refunds.create(requestData);
      
      this.lastResponse = refund;
      
      // Return result
      return {
        success: refund.status === 'COMPLETED',
        status: refund.status === 'COMPLETED' ? 'completed' : 'pending',
        refundId: refund.id
      };
    } catch (error) {
      logger.error('Error refunding PayPal payment', { error, input });
      throw new Error(`PayPal refund failed: ${error.message}`);
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
      const { frequency, frequencyInterval } = mapFrequencyToPayPalInterval(input.frequency);
      
      // Format dates for PayPal API
      const startDate = input.startDate.toISOString().split('T')[0];
      const endDate = input.endDate ? input.endDate.toISOString().split('T')[0] : undefined;
      
      // Prepare request
      const requestData = {
        plan_id: this.config.planId, // In real implementation, we'd create a plan dynamically
        start_time: startDate,
        shipping_amount: {
          currency_code: input.currency.toUpperCase(),
          value: '0'
        },
        subscriber: {
          payment_source: {
            token: {
              id: input.paymentMethodToken,
              type: 'PAYMENT_METHOD_TOKEN'
            }
          }
        },
        application_context: {
          brand_name: this.config.brandName || 'Fineract',
          user_action: 'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected: 'PAYPAL',
            payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
          }
        },
        custom_id: input.metadata?.clientId || 'client-subscription'
      };
      
      this.lastRequest = requestData;
      
      // Create subscription
      const subscription = await this.paypal.subscriptions.create(requestData);
      
      this.lastResponse = subscription;
      
      // Map status
      const status = this.mapPayPalSubscriptionStatusToFineract(subscription.status);
      
      return {
        subscriptionId: subscription.id,
        status
      };
    } catch (error) {
      logger.error('Error creating PayPal recurring payment', { error, input });
      throw new Error(`PayPal recurring payment creation failed: ${error.message}`);
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
          requestData = {
            reason: 'Reactivating subscription'
          };
          await this.paypal.subscriptions.update(input.subscriptionId, 'activate', requestData);
          break;
          
        case 'paused':
          requestData = {
            reason: 'Pausing subscription'
          };
          await this.paypal.subscriptions.update(input.subscriptionId, 'suspend', requestData);
          break;
          
        case 'cancelled':
          requestData = {
            reason: 'Cancelling subscription'
          };
          await this.paypal.subscriptions.cancel(input.subscriptionId, requestData);
          break;
          
        default:
          throw new Error(`Unsupported subscription status: ${input.status}`);
      }
      
      this.lastRequest = requestData;
      this.lastResponse = { status: input.status };
      
      return true;
    } catch (error) {
      logger.error('Error updating PayPal recurring payment status', { error, input });
      throw new Error(`PayPal recurring payment status update failed: ${error.message}`);
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
      // const webhookId = this.config.webhookId;
      // const signature = request.headers['paypal-transmission-sig'];
      // const verifyResult = await this.paypal.verifyWebhookSignature({ webhookId, signature, ... });
      
      // For this demo, assume payload is the event
      const event = input.payload;
      
      this.lastResponse = event;
      
      // Process based on event type
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          // Handle successful payment
          const resource = event.resource;
          const orderId = resource.supplementary_data?.related_ids?.order_id;
          
          return {
            transactionId: orderId,
            status: 'completed',
            paymentDetails: {
              captureId: resource.id,
              payerId: resource.payer?.payer_id
            },
            message: 'Payment capture completed'
          };
          
        case 'PAYMENT.CAPTURE.DENIED':
          // Handle failed payment
          return {
            transactionId: event.resource.supplementary_data?.related_ids?.order_id,
            status: 'failed',
            errorMessage: 'Payment capture denied',
            message: 'Payment capture denied'
          };
          
        case 'PAYMENT.CAPTURE.REFUNDED':
          // Handle refund
          return {
            transactionId: event.resource.supplementary_data?.related_ids?.order_id,
            status: 'refunded',
            paymentDetails: {
              captureId: event.resource.id,
              refundId: event.resource.id
            },
            message: 'Payment refunded'
          };
          
        case 'BILLING.SUBSCRIPTION.CREATED':
          // Handle subscription created
          return {
            message: 'Subscription created',
            status: 'active'
          };
          
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          // Handle subscription activated
          return {
            message: 'Subscription activated',
            status: 'active'
          };
          
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          // Handle subscription cancelled
          return {
            message: 'Subscription cancelled',
            status: 'cancelled'
          };
          
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          // Handle subscription payment failed
          return {
            message: 'Subscription payment failed',
            status: 'failed'
          };
          
        case 'PAYMENT.SALE.COMPLETED':
          // Handle subscription payment completed
          const saleResource = event.resource;
          
          // Create a new transaction for this subscription payment
          return {
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: parseFloat(saleResource.amount.total),
              currency: saleResource.amount.currency,
              paymentMethod: 'paypal',
              paymentDetails: {
                saleId: saleResource.id,
                subscriptionId: saleResource.billing_agreement_id
              },
              referenceNumber: `SUB-${saleResource.billing_agreement_id}-${saleResource.id}`,
              clientId: saleResource.custom, // Assuming custom field contains client ID
              metadata: {
                subscriptionId: saleResource.billing_agreement_id,
                saleId: saleResource.id,
                paymentDate: saleResource.create_time
              }
            },
            message: 'Subscription payment completed'
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled event type: ${event.event_type}`
          };
      }
    } catch (error) {
      logger.error('Error processing PayPal webhook', { error, input });
      throw new Error(`PayPal webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to PayPal
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from PayPal
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  /**
   * Map PayPal order status to Fineract status
   */
  private mapPayPalStatusToFineract(paypalStatus: string): string {
    switch (paypalStatus) {
      case 'COMPLETED':
        return 'completed';
      case 'SAVED':
      case 'APPROVED':
      case 'PAYER_ACTION_REQUIRED':
      case 'CREATED':
        return 'pending';
      case 'VOIDED':
      case 'CANCELLED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
  
  /**
   * Map PayPal subscription status to Fineract status
   */
  private mapPayPalSubscriptionStatusToFineract(paypalStatus: string): string {
    switch (paypalStatus) {
      case 'ACTIVE':
      case 'APPROVAL_PENDING':
        return 'active';
      case 'SUSPENDED':
        return 'paused';
      case 'CANCELLED':
        return 'cancelled';
      case 'EXPIRED':
        return 'completed';
      default:
        return 'pending';
    }
  }
  
  // Simulation methods for demonstration
  
  private async simulateOrderCreate(data: any): Promise<any> {
    return {
      id: `O-${Math.random().toString(36).substring(2, 15)}`,
      status: 'CREATED',
      purchase_units: data.purchase_units,
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=${Math.random().toString(36).substring(2, 15)}`,
          rel: 'approve',
          method: 'GET'
        }
      ]
    };
  }
  
  private async simulateOrderCapture(id: string, data: any): Promise<any> {
    return {
      id,
      status: 'COMPLETED',
      purchase_units: [
        {
          reference_id: data.reference_id || 'default',
          amount: {
            currency_code: 'USD',
            value: '100.00'
          },
          payments: {
            captures: [
              {
                id: `CAP-${Math.random().toString(36).substring(2, 15)}`,
                status: 'COMPLETED',
                amount: {
                  currency_code: 'USD',
                  value: '100.00'
                }
              }
            ]
          }
        }
      ],
      payer: {
        payer_id: `PAYERID${Math.floor(Math.random() * 1000000)}`
      }
    };
  }
  
  private async simulateOrderGet(id: string): Promise<any> {
    return {
      id,
      status: 'COMPLETED',
      purchase_units: [
        {
          reference_id: 'default',
          amount: {
            currency_code: 'USD',
            value: '100.00'
          },
          payments: {
            captures: [
              {
                id: `CAP-${Math.random().toString(36).substring(2, 15)}`,
                status: 'COMPLETED',
                amount: {
                  currency_code: 'USD',
                  value: '100.00'
                }
              }
            ]
          }
        }
      ],
      payer: {
        payer_id: `PAYERID${Math.floor(Math.random() * 1000000)}`
      }
    };
  }
  
  private async simulateRefundCreate(data: any): Promise<any> {
    return {
      id: `REF-${Math.random().toString(36).substring(2, 15)}`,
      status: 'COMPLETED',
      capture_id: data.capture_id,
      amount: data.amount || {
        currency_code: 'USD',
        value: '100.00'
      },
      create_time: new Date().toISOString()
    };
  }
  
  private async simulateRefundGet(id: string): Promise<any> {
    return {
      id,
      status: 'COMPLETED',
      capture_id: `CAP-${Math.random().toString(36).substring(2, 15)}`,
      amount: {
        currency_code: 'USD',
        value: '100.00'
      },
      create_time: new Date().toISOString()
    };
  }
  
  private async simulateSubscriptionCreate(data: any): Promise<any> {
    return {
      id: `I-${Math.random().toString(36).substring(2, 15)}`,
      status: 'ACTIVE',
      plan_id: data.plan_id,
      start_time: data.start_time,
      create_time: new Date().toISOString()
    };
  }
  
  private async simulateSubscriptionUpdate(id: string, action: string, data: any): Promise<any> {
    let status;
    switch (action) {
      case 'activate':
        status = 'ACTIVE';
        break;
      case 'suspend':
        status = 'SUSPENDED';
        break;
      default:
        status = 'ACTIVE';
    }
    
    return {
      id,
      status
    };
  }
  
  private async simulateSubscriptionCancel(id: string, data: any): Promise<any> {
    return {
      id,
      status: 'CANCELLED'
    };
  }
  
  private async simulateSubscriptionGet(id: string): Promise<any> {
    return {
      id,
      status: 'ACTIVE',
      plan_id: 'P-12345',
      start_time: new Date().toISOString(),
      create_time: new Date().toISOString()
    };
  }
}