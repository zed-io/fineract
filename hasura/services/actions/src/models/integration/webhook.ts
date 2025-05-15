/**
 * Webhook integration models for Fineract
 */

/**
 * HTTP method for webhook requests
 */
export enum WebhookHttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

/**
 * Content type for webhook payload
 */
export enum WebhookContentType {
  JSON = 'application/json',
  XML = 'application/xml',
  FORM = 'application/x-www-form-urlencoded',
  TEXT = 'text/plain'
}

/**
 * Status of webhook execution
 */
export enum WebhookStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
  RETRYING = 'retrying'
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  id?: string;
  name: string;
  description?: string;
  eventType: string;
  url: string;
  httpMethod: WebhookHttpMethod;
  contentType: WebhookContentType;
  headers?: Record<string, string>;
  payloadTemplate?: string;
  isActive: boolean;
  retryCount: number;
  retryInterval: number;  // in seconds
  timeout: number;  // in seconds
  secretKey?: string;
  createdBy?: string;
  createdDate?: Date;
  updatedBy?: string;
  updatedDate?: Date;
}

/**
 * Webhook execution history
 */
export interface WebhookHistory {
  id?: string;
  webhookId: string;
  eventType: string;
  eventData: any;
  payload: any;
  responseStatus?: number;
  responseBody?: string;
  executionTimeMs?: number;
  status: WebhookStatus;
  errorMessage?: string;
  retryCount: number;
  nextRetryTime?: Date;
  createdDate?: Date;
  updatedDate?: Date;
}

/**
 * Supported event types for webhooks
 */
export enum WebhookEventType {
  // Client events
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  CLIENT_ACTIVATED = 'client.activated',
  CLIENT_REJECTED = 'client.rejected',
  
  // Loan events
  LOAN_CREATED = 'loan.created',
  LOAN_UPDATED = 'loan.updated',
  LOAN_SUBMITTED = 'loan.submitted',
  LOAN_APPROVED = 'loan.approved',
  LOAN_REJECTED = 'loan.rejected',
  LOAN_DISBURSED = 'loan.disbursed',
  LOAN_REPAYMENT = 'loan.repayment',
  LOAN_CLOSED = 'loan.closed',
  LOAN_WRITTEN_OFF = 'loan.writtenoff',
  LOAN_RESCHEDULED = 'loan.rescheduled',
  
  // Savings events
  SAVINGS_CREATED = 'savings.created',
  SAVINGS_APPROVED = 'savings.approved',
  SAVINGS_ACTIVATED = 'savings.activated',
  SAVINGS_DEPOSIT = 'savings.deposit',
  SAVINGS_WITHDRAWAL = 'savings.withdrawal',
  SAVINGS_CLOSED = 'savings.closed',
  
  // Transaction events
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_REVERSED = 'transaction.reversed',
  
  // System events
  BUSINESS_DATE_CHANGED = 'system.businessDateChanged',
  COB_COMPLETED = 'system.cobCompleted'
}

/**
 * Webhook event with type and data
 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType | string;
  timestamp: Date;
  data: any;
  tenant?: string;
}

/**
 * Webhook registration request
 */
export interface WebhookRegisterRequest {
  name: string;
  description?: string;
  eventType: WebhookEventType | string;
  url: string;
  httpMethod?: WebhookHttpMethod;
  contentType?: WebhookContentType;
  headers?: Record<string, string>;
  payloadTemplate?: string;
  isActive?: boolean;
  retryCount?: number;
  retryInterval?: number;
  timeout?: number;
  secretKey?: string;
}

/**
 * Webhook test request
 */
export interface WebhookTestRequest {
  webhookId: string;
  eventData: any;
}

/**
 * Webhook execution request for handler
 */
export interface WebhookExecutionRequest {
  webhook: WebhookConfig;
  event: WebhookEvent;
}

/**
 * Webhook execution result
 */
export interface WebhookExecutionResult {
  success: boolean;
  webhookId: string;
  eventType: string;
  responseStatus?: number;
  responseBody?: string;
  executionTimeMs: number;
  errorMessage?: string;
}

/**
 * Webhook list response
 */
export interface WebhookListResponse {
  webhooks: WebhookConfig[];
  total: number;
}

/**
 * Webhook history list response
 */
export interface WebhookHistoryListResponse {
  history: WebhookHistory[];
  total: number;
}