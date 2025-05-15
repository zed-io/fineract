/**
 * Payment Gateway Adapter Interface
 * Defines the common interface for all payment gateway adapters
 */

import {
  PaymentTransactionStatus,
  RecurringPaymentStatus,
  PaymentMethodType,
  RecurringFrequency
} from '../../../models/paymentGateway';

/**
 * Payment creation response
 */
export interface PaymentCreationResponse {
  externalId?: string;
  status: string;
  paymentUrl?: string;
}

/**
 * Payment execution response
 */
export interface PaymentExecutionResponse {
  success: boolean;
  status: string;
  errorMessage?: string;
  redirectUrl?: string;
  paymentDetails?: any;
}

/**
 * Payment status response
 */
export interface PaymentStatusResponse {
  status: string;
  externalId?: string;
  errorMessage?: string;
  paymentDetails?: any;
}

/**
 * Refund response
 */
export interface RefundResponse {
  success: boolean;
  status: string;
  refundId: string;
  errorMessage?: string;
}

/**
 * Recurring payment response
 */
export interface RecurringPaymentResponse {
  subscriptionId?: string;
  status: string;
}

/**
 * Webhook processing response
 */
export interface WebhookProcessingResponse {
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
}

/**
 * Payment Gateway Adapter Interface
 */
export interface PaymentGatewayAdapter {
  /**
   * Create a payment
   */
  createPayment(input: {
    transactionId: string;
    amount: number;
    currency: string;
    callbackUrl?: string;
    metadata?: any;
  }): Promise<PaymentCreationResponse>;
  
  /**
   * Execute a payment
   */
  executePayment(input: {
    transactionId: string;
    externalId?: string;
    paymentMethod?: string;
    paymentMethodToken?: string;
    paymentDetails?: any;
  }): Promise<PaymentExecutionResponse>;
  
  /**
   * Check payment status
   */
  checkPaymentStatus(input: {
    transactionId: string;
    externalId?: string;
  }): Promise<PaymentStatusResponse>;
  
  /**
   * Refund a payment
   */
  refundPayment(input: {
    transactionId: string;
    externalId?: string;
    amount: number;
    reason?: string;
    metadata?: any;
  }): Promise<RefundResponse>;
  
  /**
   * Validate payment method token (optional)
   */
  validatePaymentMethodToken?(input: {
    token: string;
    paymentMethodType: PaymentMethodType;
  }): Promise<boolean>;
  
  /**
   * Create a recurring payment
   */
  createRecurringPayment(input: {
    paymentMethodToken: string;
    frequency: RecurringFrequency;
    amount: number;
    currency: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    metadata?: any;
  }): Promise<RecurringPaymentResponse>;
  
  /**
   * Update recurring payment status
   */
  updateRecurringPaymentStatus(input: {
    subscriptionId?: string;
    status: RecurringPaymentStatus;
  }): Promise<boolean>;
  
  /**
   * Process webhook
   */
  processWebhook(input: {
    eventType: string;
    payload: any;
  }): Promise<WebhookProcessingResponse>;
  
  /**
   * Get last request sent to the gateway
   */
  getLastRequest(): any;
  
  /**
   * Get last response received from the gateway
   */
  getLastResponse(): any;
}