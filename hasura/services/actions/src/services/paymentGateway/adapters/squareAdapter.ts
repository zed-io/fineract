/**
 * Square Payment Gateway Adapter
 * Implements the PaymentGatewayAdapter interface for Square
 */

import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate Square configuration
 */
function validateSquareConfig(config: any): void {
  if (!config.accessToken) {
    throw new Error('Square access token is required');
  }
  
  if (!config.applicationId) {
    throw new Error('Square application ID is required');
  }
  
  if (!config.locationId) {
    throw new Error('Square location ID is required');
  }
  
  if (!config.environment || !['sandbox', 'production'].includes(config.environment)) {
    throw new Error('Square environment must be either "sandbox" or "production"');
  }
}

/**
 * Map Fineract frequency to Square interval
 */
function mapFrequencyToSquareInterval(frequency: RecurringFrequency): { intervalUnit: string; intervalCount: number } {
  switch (frequency) {
    case 'daily':
      return { intervalUnit: 'DAY', intervalCount: 1 };
    case 'weekly':
      return { intervalUnit: 'WEEK', intervalCount: 1 };
    case 'biweekly':
      return { intervalUnit: 'WEEK', intervalCount: 2 };
    case 'monthly':
      return { intervalUnit: 'MONTH', intervalCount: 1 };
    case 'quarterly':
      return { intervalUnit: 'MONTH', intervalCount: 3 };
    case 'annual':
      return { intervalUnit: 'YEAR', intervalCount: 1 };
    default:
      return { intervalUnit: 'MONTH', intervalCount: 1 };
  }
}

/**
 * Square Payment Gateway Adapter
 */
export class SquareAdapter implements PaymentGatewayAdapter {
  private config: any;
  private client: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateSquareConfig(configuration);
    this.config = configuration;
    
    // In a real implementation, we'd import the Square SDK
    // const { Client, Environment } = require('square');
    // this.client = new Client({
    //   accessToken: this.config.accessToken,
    //   environment: this.config.environment === 'production' ? Environment.Production : Environment.Sandbox
    // });
    
    // For this demonstration, we'll simulate Square functionality
    this.client = {
      paymentsApi: {
        createPayment: this.simulateCreatePayment.bind(this),
        getPayment: this.simulateGetPayment.bind(this),
        cancelPayment: this.simulateCancelPayment.bind(this)
      },
      refundsApi: {
        refundPayment: this.simulateRefundPayment.bind(this)
      },
      cardsApi: {
        retrieveCard: this.simulateRetrieveCard.bind(this),
        disableCard: this.simulateDisableCard.bind(this)
      },
      customersApi: {
        retrieveCustomer: this.simulateRetrieveCustomer.bind(this),
        createCustomer: this.simulateCreateCustomer.bind(this)
      },
      subscriptionsApi: {
        createSubscription: this.simulateCreateSubscription.bind(this),
        updateSubscription: this.simulateUpdateSubscription.bind(this),
        cancelSubscription: this.simulateCancelSubscription.bind(this)
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
      const amountInCents = Math.round(input.amount * 100); // Square uses cents
      
      const requestData = {
        sourceId: 'EXTERNAL_SOURCE', // This would come from the Square Web Payments SDK
        idempotencyKey: input.transactionId,
        amountMoney: {
          amount: amountInCents,
          currency: input.currency
        },
        locationId: this.config.locationId,
        reference_id: input.transactionId,
        note: 'Fineract payment',
        metadata: {
          fineract_transaction_id: input.transactionId,
          ...input.metadata
        }
      };
      
      this.lastRequest = requestData;
      
      // In a real implementation, we would not create the payment here
      // but only prepare a checkout page or payment token for the customer
      
      // Instead, we would return a payment URL to the Square Checkout page
      const paymentUrl = `${this.config.checkoutBaseUrl}?location=${this.config.locationId}&reference_id=${input.transactionId}`;
      
      this.lastResponse = {
        paymentUrl,
        status: 'pending'
      };
      
      return {
        status: 'pending',
        paymentUrl
      };
    } catch (error) {
      logger.error('Error creating Square payment', { error, input });
      throw new Error(`Square payment creation failed: ${error.message}`);
    }
  }
  
  /**
   * Execute a payment
   * This is called after the customer completes the Square checkout flow
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
      // In a real implementation, Square would handle the payment execution during checkout
      // This method would be called when the user returns from the Square checkout
      
      // Verify that the payment was successful by checking the status
      let paymentId;
      
      if (input.externalId) {
        paymentId = input.externalId;
      } else if (input.paymentDetails?.paymentId) {
        paymentId = input.paymentDetails.paymentId;
      } else {
        // In a real implementation, we would look up the payment by reference ID (transactionId)
        paymentId = `PAY_${Math.random().toString(36).substring(2, 15)}`;
      }
      
      this.lastRequest = {
        payment_id: paymentId
      };
      
      // Get payment status
      const payment = await this.client.paymentsApi.getPayment(paymentId);
      
      this.lastResponse = payment;
      
      // Map status
      const status = this.mapSquareStatusToFineract(payment.status);
      
      return {
        success: status === 'completed',
        status,
        errorMessage: payment.errors?.[0]?.detail,
        paymentDetails: {
          paymentId: payment.id,
          receiptUrl: payment.receiptUrl,
          cardDetails: payment.cardDetails
        }
      };
    } catch (error) {
      logger.error('Error executing Square payment', { error, input });
      throw new Error(`Square payment execution failed: ${error.message}`);
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
        // In a real implementation, we would look up the payment by reference ID (transactionId)
        // For this demo, we'll simulate a successful payment
        const simulatedPaymentId = `PAY_${Math.random().toString(36).substring(2, 15)}`;
        
        this.lastRequest = {
          payment_id: simulatedPaymentId
        };
        
        this.lastResponse = {
          id: simulatedPaymentId,
          status: 'COMPLETED',
          receiptUrl: `https://squareupsandbox.com/receipt/${simulatedPaymentId}`,
          cardDetails: {
            card: {
              last4: '1111',
              cardBrand: 'VISA',
              expirationMonth: 12,
              expirationYear: 2024
            }
          }
        };
        
        return {
          status: 'completed',
          externalId: simulatedPaymentId,
          paymentDetails: {
            receiptUrl: this.lastResponse.receiptUrl,
            cardDetails: this.lastResponse.cardDetails
          }
        };
      }
      
      this.lastRequest = {
        payment_id: input.externalId
      };
      
      // Get payment status
      const payment = await this.client.paymentsApi.getPayment(input.externalId);
      
      this.lastResponse = payment;
      
      // Map status
      const status = this.mapSquareStatusToFineract(payment.status);
      
      return {
        status,
        externalId: payment.id,
        errorMessage: payment.errors?.[0]?.detail,
        paymentDetails: {
          receiptUrl: payment.receiptUrl,
          cardDetails: payment.cardDetails
        }
      };
    } catch (error) {
      logger.error('Error checking Square payment status', { error, input });
      throw new Error(`Square payment status check failed: ${error.message}`);
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
        throw new Error('External ID (Square Payment ID) is required');
      }
      
      // Prepare refund request
      const amountInCents = Math.round(input.amount * 100); // Square uses cents
      
      const requestData = {
        idempotencyKey: `refund-${input.transactionId}`,
        paymentId: input.externalId,
        amountMoney: {
          amount: amountInCents,
          currency: 'USD' // In a real implementation, this would be dynamically determined
        },
        reason: input.reason || 'Requested by customer'
      };
      
      this.lastRequest = requestData;
      
      // Create refund
      const refund = await this.client.refundsApi.refundPayment(requestData);
      
      this.lastResponse = refund;
      
      // Return result
      return {
        success: refund.status === 'COMPLETED',
        status: refund.status === 'COMPLETED' ? 'completed' : 'pending',
        refundId: refund.id,
        errorMessage: refund.errors?.[0]?.detail
      };
    } catch (error) {
      logger.error('Error refunding Square payment', { error, input });
      throw new Error(`Square refund failed: ${error.message}`);
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
      // In Square, we would validate a card ID
      this.lastRequest = { card_id: input.token };
      
      // Retrieve card to validate it exists
      const card = await this.client.cardsApi.retrieveCard(input.token);
      
      this.lastResponse = card;
      
      // Check if card is active
      return !card.card.disabledAt;
    } catch (error) {
      logger.error('Error validating Square payment method token', { error, input });
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
      const amountInCents = Math.round(input.amount * 100); // Square uses cents
      const { intervalUnit, intervalCount } = mapFrequencyToSquareInterval(input.frequency);
      
      // First, get or create a customer
      let customerId;
      
      if (input.metadata?.customerId) {
        // Use existing customer
        try {
          const customer = await this.client.customersApi.retrieveCustomer(input.metadata.customerId);
          customerId = customer.customer.id;
        } catch (error) {
          // Customer not found, create new one
          const newCustomer = await this.client.customersApi.createCustomer({
            referenceId: input.metadata?.clientId,
            note: 'Fineract customer'
          });
          customerId = newCustomer.customer.id;
        }
      } else {
        // Create new customer
        const customer = await this.client.customersApi.createCustomer({
          referenceId: input.metadata?.clientId,
          note: 'Fineract customer'
        });
        customerId = customer.customer.id;
      }
      
      // Calculate subscription start date
      const startDate = input.startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Calculate subscription end date if provided
      const cancelDate = input.endDate ? input.endDate.toISOString().split('T')[0] : undefined;
      
      // Create subscription
      const requestData = {
        idempotencyKey: `sub-${Math.random().toString(36).substring(2, 15)}`,
        locationId: this.config.locationId,
        customerId,
        planId: '', // Square requires a catalog plan ID
        cardId: input.paymentMethodToken,
        startDate,
        cancelDate,
        source: {
          name: 'Fineract'
        },
        priceMoney: {
          amount: amountInCents,
          currency: input.currency
        }
      };
      
      this.lastRequest = requestData;
      
      const subscription = await this.client.subscriptionsApi.createSubscription(requestData);
      
      this.lastResponse = subscription;
      
      // Map status
      const status = this.mapSquareSubscriptionStatusToFineract(subscription.subscription.status);
      
      return {
        subscriptionId: subscription.subscription.id,
        status
      };
    } catch (error) {
      logger.error('Error creating Square recurring payment', { error, input });
      throw new Error(`Square recurring payment creation failed: ${error.message}`);
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
          // Square doesn't support reactivating a paused subscription
          // We would need to create a new one
          return false;
          
        case 'paused':
          // Square doesn't support pausing, need to cancel and create a new one
          // For this demo, we'll just update with a pause_effective_date
          this.lastRequest = {
            subscription_id: input.subscriptionId,
            pause_effective_date: new Date().toISOString().split('T')[0]
          };
          
          await this.client.subscriptionsApi.updateSubscription(
            input.subscriptionId,
            {
              pauseEffectiveDate: new Date().toISOString().split('T')[0]
            }
          );
          break;
          
        case 'cancelled':
          this.lastRequest = { subscription_id: input.subscriptionId };
          await this.client.subscriptionsApi.cancelSubscription(input.subscriptionId);
          break;
          
        default:
          throw new Error(`Unsupported subscription status: ${input.status}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating Square recurring payment status', { error, input });
      throw new Error(`Square recurring payment status update failed: ${error.message}`);
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
      // const squareSignature = request.headers['x-square-signature'];
      // // Verify webhook signature
      
      // For this demo, assume payload is the event
      const event = input.payload;
      
      this.lastResponse = event;
      
      // Process based on event type
      switch (input.eventType) {
        case 'payment.created':
        case 'payment.updated':
          // Handle payment update
          const payment = event.data.object;
          
          // Check reference ID to link back to our transaction
          const referenceId = payment.reference_id;
          
          // Map status
          const status = this.mapSquareStatusToFineract(payment.status);
          
          return {
            transactionId: payment.id,
            status,
            paymentDetails: {
              receiptUrl: payment.receipt_url,
              cardBrand: payment.card_details?.card?.card_brand,
              last4: payment.card_details?.card?.last_4,
              referenceId
            },
            message: `Payment ${status}`
          };
          
        case 'refund.created':
        case 'refund.updated':
          // Handle refund update
          const refund = event.data.object;
          
          // Get the original payment ID
          const paymentId = refund.payment_id;
          
          return {
            transactionId: paymentId,
            status: refund.status === 'COMPLETED' ? 'refunded' : 'partially_refunded',
            paymentDetails: {
              refundId: refund.id,
              refundStatus: refund.status,
              refundAmount: refund.amount_money.amount / 100 // Convert cents to dollars
            },
            message: refund.status === 'COMPLETED' ? 'Refund completed' : 'Refund pending'
          };
          
        case 'subscription.created':
        case 'subscription.updated':
          // Handle subscription update
          const subscription = event.data.object;
          
          return {
            message: `Subscription ${subscription.status}`,
            status: this.mapSquareSubscriptionStatusToFineract(subscription.status)
          };
          
        case 'invoice.payment_made':
          // Handle subscription payment
          const invoice = event.data.object;
          
          // Create a transaction for this subscription payment
          return {
            status: 'completed',
            shouldCreateTransaction: true,
            transactionData: {
              type: 'payment',
              amount: invoice.payment_requests[0].computed_amount_money.amount / 100, // Convert cents to dollars
              currency: invoice.payment_requests[0].computed_amount_money.currency,
              paymentMethod: 'card',
              paymentDetails: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription_id
              },
              referenceNumber: `SQUARE-SUB-${invoice.subscription_id}-${invoice.id}`,
              clientId: invoice.primary_recipient?.customer_id,
              metadata: {
                subscriptionId: invoice.subscription_id,
                invoiceId: invoice.id
              }
            },
            message: 'Subscription payment received'
          };
          
        default:
          // Unhandled event type
          return {
            message: `Unhandled event type: ${input.eventType}`
          };
      }
    } catch (error) {
      logger.error('Error processing Square webhook', { error, input });
      throw new Error(`Square webhook processing failed: ${error.message}`);
    }
  }
  
  /**
   * Get last request sent to Square
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from Square
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  /**
   * Map Square payment status to Fineract status
   */
  private mapSquareStatusToFineract(squareStatus: string): string {
    switch (squareStatus) {
      case 'COMPLETED':
        return 'completed';
      case 'PENDING':
      case 'APPROVED':
        return 'pending';
      case 'FAILED':
        return 'failed';
      case 'CANCELED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
  
  /**
   * Map Square subscription status to Fineract status
   */
  private mapSquareSubscriptionStatusToFineract(squareStatus: string): string {
    switch (squareStatus) {
      case 'ACTIVE':
        return 'active';
      case 'PENDING':
        return 'pending';
      case 'CANCELED':
        return 'cancelled';
      default:
        return 'pending';
    }
  }
  
  // Simulation methods for demonstration
  
  private async simulateCreatePayment(data: any): Promise<any> {
    return {
      id: `pay_${Math.random().toString(36).substring(2, 15)}`,
      status: 'COMPLETED',
      amount_money: {
        amount: data.amountMoney.amount,
        currency: data.amountMoney.currency
      },
      receipt_url: `https://squareupsandbox.com/receipt/${Math.random().toString(36).substring(2, 15)}`,
      created_at: new Date().toISOString(),
      reference_id: data.reference_id
    };
  }
  
  private async simulateGetPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      status: 'COMPLETED',
      receiptUrl: `https://squareupsandbox.com/receipt/${paymentId}`,
      cardDetails: {
        card: {
          last4: '1111',
          cardBrand: 'VISA',
          expirationMonth: 12,
          expirationYear: 2024
        }
      }
    };
  }
  
  private async simulateCancelPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      status: 'CANCELED'
    };
  }
  
  private async simulateRefundPayment(data: any): Promise<any> {
    return {
      id: `ref_${Math.random().toString(36).substring(2, 15)}`,
      payment_id: data.paymentId,
      status: 'COMPLETED',
      amount_money: data.amountMoney,
      created_at: new Date().toISOString()
    };
  }
  
  private async simulateRetrieveCard(cardId: string): Promise<any> {
    return {
      card: {
        id: cardId,
        cardBrand: 'VISA',
        last4: '1111',
        expirationMonth: 12,
        expirationYear: 2024,
        cardholderName: 'Test Customer',
        billingAddress: {
          addressLine1: '123 Main St',
          locality: 'San Francisco',
          administrativeDistrictLevel1: 'CA',
          postalCode: '94105'
        },
        disabledAt: null
      }
    };
  }
  
  private async simulateDisableCard(cardId: string): Promise<any> {
    return {
      card: {
        id: cardId,
        disabledAt: new Date().toISOString()
      }
    };
  }
  
  private async simulateRetrieveCustomer(customerId: string): Promise<any> {
    return {
      customer: {
        id: customerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        referenceId: `client_${Math.random().toString(36).substring(2, 15)}`
      }
    };
  }
  
  private async simulateCreateCustomer(data: any): Promise<any> {
    return {
      customer: {
        id: `cust_${Math.random().toString(36).substring(2, 15)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        referenceId: data.referenceId
      }
    };
  }
  
  private async simulateCreateSubscription(data: any): Promise<any> {
    return {
      subscription: {
        id: `sub_${Math.random().toString(36).substring(2, 15)}`,
        locationId: data.locationId,
        customerId: data.customerId,
        startDate: data.startDate,
        status: 'ACTIVE',
        taxPercentage: '0',
        invoiceIds: [],
        createdAt: new Date().toISOString(),
        cardId: data.cardId
      }
    };
  }
  
  private async simulateUpdateSubscription(subscriptionId: string, data: any): Promise<any> {
    return {
      subscription: {
        id: subscriptionId,
        pauseEffectiveDate: data.pauseEffectiveDate,
        status: 'ACTIVE'
      }
    };
  }
  
  private async simulateCancelSubscription(subscriptionId: string): Promise<any> {
    return {
      subscription: {
        id: subscriptionId,
        status: 'CANCELED',
        canceledDate: new Date().toISOString()
      }
    };
  }
}