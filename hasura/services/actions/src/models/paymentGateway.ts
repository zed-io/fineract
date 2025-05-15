/**
 * Payment Gateway models for Fineract Hasura
 */

// Common types for payment gateways
export type PaymentGatewayType = 
  | 'stripe'
  | 'paypal'
  | 'authorize_net'
  | 'mpesa'
  | 'paytm'
  | 'square'
  | 'razorpay'
  | 'adyen'
  | 'worldpay'
  | 'custom';

export type PaymentTransactionStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'authorized'
  | 'cancelled'
  | 'expired';

export type PaymentTransactionType = 
  | 'payment'
  | 'refund'
  | 'authorization'
  | 'capture'
  | 'void';

export type PaymentMethodType = 
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'bank_account'
  | 'mobile_money'
  | 'wallet'
  | 'cash'
  | 'other';

export type RecurringFrequency = 
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'custom';

export type RecurringPaymentStatus = 
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'completed'
  | 'failed';

export type WebhookEventStatus = 
  | 'received'
  | 'processed'
  | 'failed';

// Provider model
export interface PaymentGatewayProvider {
  id: string;
  code: string;
  name: string;
  description?: string;
  providerType: PaymentGatewayType;
  configuration: any;
  webhookUrl?: string;
  webhookSecret?: string;
  isActive: boolean;
  supportsRefunds: boolean;
  supportsPartialPayments: boolean;
  supportsRecurringPayments: boolean;
  createdBy?: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
}

// Provider updates model
export interface PaymentGatewayProviderUpdates {
  name?: string;
  description?: string;
  configuration?: any;
  webhookUrl?: string;
  webhookSecret?: string;
  isActive?: boolean;
  supportsRefunds?: boolean;
  supportsPartialPayments?: boolean;
  supportsRecurringPayments?: boolean;
}

// Transaction model
export interface PaymentGatewayTransaction {
  id: string;
  providerId: string;
  providerName?: string;
  providerType?: PaymentGatewayType;
  transactionType: PaymentTransactionType;
  externalId?: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  errorMessage?: string;
  paymentMethod?: string;
  paymentDetails?: any;
  referenceNumber?: string;
  clientId?: string;
  clientName?: string;
  loanId?: string;
  savingsAccountId?: string;
  callbackUrl?: string;
  metadata?: any;
  requestPayload?: any;
  responsePayload?: any;
  createdDate: string;
  updatedDate?: string;
}

// Payment method model
export interface PaymentMethod {
  id: string;
  providerId: string;
  providerName?: string;
  clientId: string;
  paymentMethodType: PaymentMethodType;
  token: string;
  isDefault: boolean;
  maskedNumber?: string;
  expiryDate?: string;
  cardType?: string;
  holderName?: string;
  billingAddress?: any;
  metadata?: any;
  isActive: boolean;
  createdDate: string;
  updatedDate?: string;
}

// Recurring payment configuration
export interface RecurringPaymentConfig {
  id: string;
  providerId: string;
  providerName?: string;
  clientId?: string;
  clientName?: string;
  externalSubscriptionId?: string;
  paymentMethodToken: string;
  frequency: RecurringFrequency;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  status: RecurringPaymentStatus;
  description?: string;
  metadata?: any;
  createdBy?: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
}

// Webhook event model
export interface PaymentGatewayWebhookEvent {
  id: string;
  providerId: string;
  eventType: string;
  externalId?: string;
  payload: any;
  status: WebhookEventStatus;
  relatedTransactionId?: string;
  errorMessage?: string;
  processingAttempts: number;
  createdDate: string;
  updatedDate?: string;
}

// Response models
export interface RegisterPaymentGatewayProviderResponse {
  id: string;
  code: string;
  name: string;
  providerType: PaymentGatewayType;
  isActive: boolean;
}

export interface CreatePaymentTransactionResponse {
  transactionId: string;
  providerId: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  createdDate: string;
  paymentUrl?: string;
  externalId?: string;
}

export interface PaymentExecutionResponse {
  success: boolean;
  transactionId: string;
  status: PaymentTransactionStatus;
  externalId?: string;
  errorMessage?: string;
  redirectUrl?: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  externalId?: string;
  errorMessage?: string;
  paymentDetails?: any;
}

export interface RefundResponse {
  success: boolean;
  originalTransactionId: string;
  refundTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  externalId?: string;
}

export interface SavePaymentMethodResponse {
  id: string;
  token: string;
  paymentMethodType: PaymentMethodType;
  maskedNumber?: string;
  isDefault: boolean;
}

export interface CreateRecurringPaymentResponse {
  configId: string;
  externalSubscriptionId?: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  startDate: string;
  status: RecurringPaymentStatus;
}

export interface WebhookProcessingResponse {
  success: boolean;
  eventId: string;
  eventType: string;
  relatedTransactionId?: string;
  status: string;
  message?: string;
}

export interface PaymentGatewayProviderListResponse {
  providers: PaymentGatewayProvider[];
  total: number;
}

export interface PaymentGatewayTransactionListResponse {
  transactions: PaymentGatewayTransaction[];
  total: number;
}

export interface PaymentMethodListResponse {
  paymentMethods: PaymentMethod[];
  total: number;
}

export interface RecurringPaymentConfigListResponse {
  configurations: RecurringPaymentConfig[];
  total: number;
}

export interface DeleteResponse {
  success: boolean;
}

// Input models
export interface CreatePaymentTransactionInput {
  providerId: string;
  amount: number;
  currency: string;
  clientId?: string;
  loanId?: string;
  savingsAccountId?: string;
  paymentMethod?: string;
  paymentDetails?: any;
  referenceNumber?: string;
  callbackUrl?: string;
  metadata?: any;
}

export interface ExecutePaymentInput {
  transactionId: string;
  paymentMethod?: string;
  paymentMethodToken?: string;
  paymentDetails?: any;
}

export interface RefundPaymentInput {
  transactionId: string;
  amount?: number;
  reason?: string;
  metadata?: any;
}

export interface SavePaymentMethodInput {
  providerId: string;
  clientId: string;
  paymentMethodType: PaymentMethodType;
  token: string;
  isDefault?: boolean;
  maskedNumber?: string;
  expiryDate?: string;
  cardType?: string;
  holderName?: string;
  billingAddress?: any;
  metadata?: any;
}

export interface CreateRecurringPaymentInput {
  providerId: string;
  clientId: string;
  paymentMethodToken: string;
  frequency: RecurringFrequency;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  description?: string;
  metadata?: any;
}

export interface ProcessPaymentWebhookInput {
  providerId: string;
  eventType: string;
  payload: any;
}