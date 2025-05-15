# Payment Gateway Adapter Development Guide

This guide provides technical details for developers who want to implement a new payment gateway adapter for the Fineract Payment Gateway Integration module.

## Table of Contents

1. [Adapter Architecture](#adapter-architecture)
2. [Implementation Requirements](#implementation-requirements)
3. [Method by Method Guide](#method-by-method-guide)
4. [Testing Strategy](#testing-strategy)
5. [Error Handling](#error-handling)
6. [Webhook Processing](#webhook-processing)
7. [Security Considerations](#security-considerations)
8. [CI/CD Integration](#cicd-integration)
9. [Troubleshooting](#troubleshooting)

## Adapter Architecture

The payment gateway integration is based on an adapter pattern:

```
┌─────────────────────────────────┐
│ Payment Gateway Service Layer   │
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│ Payment Gateway Adapter Factory │
└────────────────┬────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
┌────▼─────┐ ┌───────────┐ ┌─▼────────┐
│ Stripe   │ │ PayPal    │ │ Your     │
│ Adapter  │ │ Adapter   │ │ Adapter  │
└──────────┘ └───────────┘ └──────────┘
```

Each adapter implements the `PaymentGatewayAdapter` interface, which defines all the methods needed to interact with a payment gateway.

## Implementation Requirements

### Prerequisites

1. Node.js and TypeScript knowledge
2. Understanding of the payment gateway's API
3. Experience with RESTful APIs and async programming

### Required Files

To implement a new adapter, you'll need to create:

1. **Adapter Implementation**: `yourGatewayAdapter.ts`
2. **Unit Tests**: Tests for your adapter
3. **Documentation**: Configuration and usage docs

### Dependencies

Add any necessary SDK or API client dependencies to `package.json`:

```json
{
  "dependencies": {
    "your-gateway-sdk": "^1.0.0"
  }
}
```

## Method by Method Guide

### 1. Constructor

The constructor should:
- Validate the configuration
- Initialize the payment gateway client
- Set up any necessary credentials or state

```typescript
constructor(configuration: any) {
  validateConfig(configuration);
  this.config = configuration;
  
  // Initialize SDK client
  this.client = new YourGatewayClient(
    this.config.apiKey,
    this.config.environment === 'production'
      ? 'production'
      : 'sandbox'
  );
}
```

### 2. createPayment

This method initializes a payment transaction and returns a payment URL or token.

**Input**:
- `transactionId`: Fineract transaction ID
- `amount`: Payment amount
- `currency`: Currency code
- `callbackUrl`: URL to redirect after payment
- `metadata`: Additional data

**Output**:
- `externalId`: ID in the payment gateway
- `status`: Initial status (usually "pending")
- `paymentUrl`: URL for checkout (if applicable)

```typescript
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
    this.lastRequest = {
      amount: input.amount,
      currency: input.currency,
      metadata: {
        fineract_transaction_id: input.transactionId,
        ...input.metadata
      },
      redirect_url: input.callbackUrl
    };
    
    // Call the payment gateway API
    const response = await this.client.createPayment({
      amount: input.amount,
      currency: input.currency,
      metadata: {
        fineract_transaction_id: input.transactionId,
        ...input.metadata
      },
      redirect_url: input.callbackUrl
    });
    
    this.lastResponse = response;
    
    return {
      externalId: response.id,
      status: this.mapGatewayStatusToFineract(response.status),
      paymentUrl: response.checkout_url
    };
  } catch (error) {
    logger.error('Error creating payment', { error, input });
    throw new Error(`Payment creation failed: ${error.message}`);
  }
}
```

### 3. executePayment

This method executes a payment using a saved payment method or token.

**Input**:
- `transactionId`: Fineract transaction ID
- `externalId`: ID in the payment gateway
- `paymentMethod`: Type of payment method
- `paymentMethodToken`: Token for saved payment method
- `paymentDetails`: Additional payment details

**Output**:
- `success`: Whether the payment was successful
- `status`: Payment status
- `errorMessage`: Error message if failed
- `redirectUrl`: URL to redirect for 3DS authentication
- `paymentDetails`: Additional payment details

```typescript
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
    // Implement payment execution
    // ...
    
    return {
      success: true,
      status: 'completed',
      paymentDetails: {
        // Payment details
      }
    };
  } catch (error) {
    logger.error('Error executing payment', { error, input });
    throw new Error(`Payment execution failed: ${error.message}`);
  }
}
```

### 4. checkPaymentStatus

This method checks the status of an existing payment.

**Input**:
- `transactionId`: Fineract transaction ID
- `externalId`: ID in the payment gateway

**Output**:
- `status`: Payment status
- `externalId`: ID in the payment gateway
- `errorMessage`: Error message if any
- `paymentDetails`: Additional payment details

```typescript
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
    // Implement status check
    // ...
    
    return {
      status: 'completed',
      externalId: input.externalId,
      paymentDetails: {
        // Payment details
      }
    };
  } catch (error) {
    logger.error('Error checking payment status', { error, input });
    throw new Error(`Payment status check failed: ${error.message}`);
  }
}
```

### 5. refundPayment

This method processes a refund for a completed payment.

**Input**:
- `transactionId`: Fineract transaction ID
- `externalId`: ID in the payment gateway
- `amount`: Refund amount
- `reason`: Refund reason
- `metadata`: Additional data

**Output**:
- `success`: Whether the refund was successful
- `status`: Refund status
- `refundId`: ID of the refund
- `errorMessage`: Error message if failed

```typescript
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
    // Implement refund processing
    // ...
    
    return {
      success: true,
      status: 'completed',
      refundId: 'refund_123'
    };
  } catch (error) {
    logger.error('Error refunding payment', { error, input });
    throw new Error(`Refund failed: ${error.message}`);
  }
}
```

### 6. createRecurringPayment

This method sets up a recurring payment or subscription.

**Input**:
- `paymentMethodToken`: Token for saved payment method
- `frequency`: Payment frequency
- `amount`: Payment amount
- `currency`: Currency code
- `startDate`: Start date
- `endDate`: End date (optional)
- `description`: Description
- `metadata`: Additional data

**Output**:
- `subscriptionId`: ID of the subscription
- `status`: Subscription status

```typescript
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
    // Implement recurring payment setup
    // ...
    
    return {
      subscriptionId: 'subscription_123',
      status: 'active'
    };
  } catch (error) {
    logger.error('Error creating recurring payment', { error, input });
    throw new Error(`Recurring payment creation failed: ${error.message}`);
  }
}
```

### 7. updateRecurringPaymentStatus

This method updates the status of a recurring payment.

**Input**:
- `subscriptionId`: ID of the subscription
- `status`: New status

**Output**:
- `boolean`: Whether the update was successful

```typescript
async updateRecurringPaymentStatus(input: {
  subscriptionId?: string;
  status: string;
}): Promise<boolean> {
  try {
    // Implement status update
    // ...
    
    return true;
  } catch (error) {
    logger.error('Error updating recurring payment status', { error, input });
    throw new Error(`Recurring payment status update failed: ${error.message}`);
  }
}
```

### 8. processWebhook

This method processes webhooks from the payment gateway.

**Input**:
- `eventType`: Type of event
- `payload`: Webhook payload

**Output**:
- `transactionId`: ID in the payment gateway
- `status`: Payment status
- `errorMessage`: Error message if any
- `paymentDetails`: Additional payment details
- `message`: Processing message
- `shouldCreateTransaction`: Whether to create a new transaction
- `transactionData`: Data for new transaction

```typescript
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
    // Implement webhook processing
    // ...
    
    return {
      transactionId: 'payment_123',
      status: 'completed',
      message: 'Payment processed successfully'
    };
  } catch (error) {
    logger.error('Error processing webhook', { error, input });
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
}
```

### 9. Helper Methods

Implement helper methods for status mapping, validation, etc.

```typescript
/**
 * Map gateway status to Fineract status
 */
private mapGatewayStatusToFineract(gatewayStatus: string): string {
  switch (gatewayStatus) {
    case 'succeeded':
    case 'success':
      return 'completed';
    case 'pending':
    case 'processing':
      return 'pending';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}
```

## Testing Strategy

### Unit Tests

Create unit tests for each method in your adapter:

```typescript
import { YourGatewayAdapter } from '../src/services/paymentGateway/adapters/yourGatewayAdapter';

describe('YourGatewayAdapter', () => {
  let adapter: YourGatewayAdapter;
  
  beforeEach(() => {
    adapter = new YourGatewayAdapter({
      apiKey: 'test_api_key',
      environment: 'sandbox'
    });
    
    // Mock the gateway client
    jest.spyOn(adapter['client'], 'createPayment').mockResolvedValue({
      id: 'payment_123',
      status: 'pending',
      checkout_url: 'https://checkout.example.com/payment_123'
    });
    
    // Add more mocks as needed
  });
  
  test('createPayment should return valid response', async () => {
    const result = await adapter.createPayment({
      transactionId: 'tx_123',
      amount: 100,
      currency: 'USD'
    });
    
    expect(result.externalId).toBe('payment_123');
    expect(result.status).toBe('pending');
    expect(result.paymentUrl).toBe('https://checkout.example.com/payment_123');
  });
  
  // Add more tests for other methods
});
```

### Integration Tests

Create integration tests that test the full payment flow with the actual gateway API:

```typescript
describe('YourGatewayAdapter Integration', () => {
  let adapter: YourGatewayAdapter;
  
  beforeEach(() => {
    adapter = new YourGatewayAdapter({
      apiKey: process.env.GATEWAY_TEST_API_KEY,
      environment: 'sandbox'
    });
  });
  
  test('should process a full payment flow', async () => {
    // Create payment
    const createResult = await adapter.createPayment({
      transactionId: `test_${Date.now()}`,
      amount: 100,
      currency: 'USD'
    });
    
    expect(createResult.externalId).toBeDefined();
    expect(createResult.status).toBe('pending');
    
    // Check status
    const statusResult = await adapter.checkPaymentStatus({
      transactionId: createResult.transactionId,
      externalId: createResult.externalId
    });
    
    expect(statusResult.status).toBeDefined();
    
    // Further test steps...
  });
});
```

## Error Handling

Implement comprehensive error handling:

```typescript
try {
  // API call
} catch (error) {
  // Log the error with context
  logger.error('Operation failed', {
    operation: 'createPayment',
    input: input,
    error: {
      message: error.message,
      code: error.code,
      response: error.response?.data
    }
  });
  
  // Translate gateway-specific errors to general errors
  if (error.code === 'authentication_failed') {
    throw new Error('Invalid API credentials');
  } else if (error.code === 'insufficient_funds') {
    throw new Error('Payment failed: Insufficient funds');
  } else {
    throw new Error(`Operation failed: ${error.message}`);
  }
}
```

## Webhook Processing

Implement secure webhook processing:

1. **Validate Signatures**: Verify webhook authenticity
2. **Idempotency**: Process webhooks idempotently
3. **Error Handling**: Handle errors gracefully
4. **Transaction Mapping**: Map webhooks to transactions

```typescript
async processWebhook(input: {
  eventType: string;
  payload: any;
}): Promise<WebhookProcessingResponse> {
  try {
    // Validate webhook signature
    this.validateWebhookSignature(input.payload, headers);
    
    // Process based on event type
    switch (input.eventType) {
      case 'payment.succeeded':
        // Handle payment success
        break;
      case 'payment.failed':
        // Handle payment failure
        break;
      // Other cases
    }
    
    // Return processing result
  } catch (error) {
    logger.error('Webhook processing failed', { error, input });
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
}

private validateWebhookSignature(payload: any, headers: any): void {
  // Implement signature validation
}
```

## Security Considerations

1. **API Keys**: Securely handle API keys
2. **Webhook Signatures**: Validate webhook signatures
3. **PCI Compliance**: Never store raw card data
4. **SSL/TLS**: Use secure connections
5. **Input Validation**: Validate all inputs
6. **Error Handling**: Don't expose sensitive info in errors

## CI/CD Integration

1. **Unit Tests**: Run unit tests in CI
2. **Integration Tests**: Run integration tests in a sandbox environment
3. **Code Coverage**: Ensure good test coverage
4. **Code Quality**: Use linting and code quality tools
5. **Documentation**: Keep documentation up-to-date

## Troubleshooting

Common issues and their solutions:

1. **API Authentication Errors**
   - Check API keys and credentials
   - Verify environment settings (sandbox vs production)

2. **Webhook Processing Failures**
   - Check signature validation
   - Verify webhook URL is accessible
   - Check event type handling

3. **Transaction Status Issues**
   - Verify status mapping is correct
   - Check for missing webhook events
   - Verify transaction IDs match between systems

4. **Recurring Payment Problems**
   - Check frequency mapping
   - Verify payment method is valid
   - Check for billing agreement setup

For more specific troubleshooting, refer to the payment gateway's documentation and support resources.