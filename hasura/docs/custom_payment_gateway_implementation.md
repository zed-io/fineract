# Custom Payment Gateway Implementation Guide

This guide provides detailed instructions for implementing a custom payment gateway adapter for the Fineract Payment Gateway Integration module.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Adapter Implementation](#adapter-implementation)
4. [Testing Your Adapter](#testing-your-adapter)
5. [Registering Your Payment Gateway](#registering-your-payment-gateway)
6. [Integration with Client Applications](#integration-with-client-applications)
7. [Webhook Implementation](#webhook-implementation)
8. [Best Practices](#best-practices)
9. [Example Implementation](#example-implementation)

## Introduction

The Fineract Payment Gateway Integration module uses an adapter pattern to support multiple payment gateways. By implementing the `PaymentGatewayAdapter` interface, you can add support for any payment processor that provides a REST API or SDK.

## Prerequisites

Before implementing a custom payment gateway adapter, ensure you have:

1. Access to the payment gateway's API documentation
2. API credentials for the payment gateway (production and sandbox/test)
3. Understanding of the payment gateway's payment flow and webhook system
4. TypeScript development experience
5. Access to the Fineract codebase

## Adapter Implementation

### Step 1: Create a new adapter file

Create a new TypeScript file in the `services/actions/src/services/paymentGateway/adapters` directory:

```
custom_gateway_adapter.ts
```

### Step 2: Implement the PaymentGatewayAdapter interface

Your adapter must implement all methods defined in the `PaymentGatewayAdapter` interface:

```typescript
import { PaymentGatewayAdapter } from './paymentGatewayAdapter';
import { PaymentMethodType, RecurringFrequency } from '../../../models/paymentGateway';
import { logger } from '../../../utils/logger';

/**
 * Validate custom gateway configuration
 */
function validateCustomConfig(config: any): void {
  if (!config.apiKey) {
    throw new Error('API key is required');
  }
  
  if (!config.merchantId) {
    throw new Error('Merchant ID is required');
  }
  
  // Add other validation as needed
}

/**
 * Custom Payment Gateway Adapter
 */
export class CustomGatewayAdapter implements PaymentGatewayAdapter {
  private config: any;
  private client: any;
  private lastRequest: any = null;
  private lastResponse: any = null;
  
  /**
   * Constructor
   */
  constructor(configuration: any) {
    validateCustomConfig(configuration);
    this.config = configuration;
    
    // Initialize SDK client or API wrapper
    // this.client = new CustomGatewayClient(this.config.apiKey, this.config.merchantId);
    
    // For testing, implement simulation methods
    this.client = {
      payments: {
        create: this.simulateCreatePayment.bind(this),
        get: this.simulateGetPayment.bind(this),
        // Add other methods as needed
      },
      // Add other API endpoints as needed
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
      // Implement payment creation logic
      // ...
      
      return {
        externalId: 'payment_123', // ID from payment gateway
        status: 'pending',
        paymentUrl: 'https://checkout.custom-gateway.com/payment_123'
      };
    } catch (error) {
      logger.error('Error creating custom gateway payment', { error, input });
      throw new Error(`Custom gateway payment creation failed: ${error.message}`);
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
    // Implement payment execution logic
    // ...
    
    return {
      success: true,
      status: 'completed',
      paymentDetails: { /* payment details */ }
    };
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
    // Implement payment status check logic
    // ...
    
    return {
      status: 'completed',
      externalId: input.externalId || 'payment_123',
      paymentDetails: { /* payment details */ }
    };
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
    // Implement refund logic
    // ...
    
    return {
      success: true,
      status: 'completed',
      refundId: 'refund_123'
    };
  }
  
  /**
   * Validate payment method token
   */
  async validatePaymentMethodToken(input: {
    token: string;
    paymentMethodType: PaymentMethodType;
  }): Promise<boolean> {
    // Implement token validation logic
    // ...
    
    return true;
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
    // Implement recurring payment creation logic
    // ...
    
    return {
      subscriptionId: 'subscription_123',
      status: 'active'
    };
  }
  
  /**
   * Update recurring payment status
   */
  async updateRecurringPaymentStatus(input: {
    subscriptionId?: string;
    status: string;
  }): Promise<boolean> {
    // Implement recurring payment status update logic
    // ...
    
    return true;
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
    // Implement webhook processing logic
    // ...
    
    return {
      transactionId: 'payment_123',
      status: 'completed',
      message: 'Payment processed successfully'
    };
  }
  
  /**
   * Get last request sent to the gateway
   */
  getLastRequest(): any {
    return this.lastRequest;
  }
  
  /**
   * Get last response received from the gateway
   */
  getLastResponse(): any {
    return this.lastResponse;
  }
  
  // Add simulation methods for testing
  private async simulateCreatePayment(data: any): Promise<any> {
    // Simulation logic
    return {
      id: 'payment_123',
      status: 'pending',
      // Add other relevant fields
    };
  }
  
  private async simulateGetPayment(paymentId: string): Promise<any> {
    // Simulation logic
    return {
      id: paymentId,
      status: 'completed',
      // Add other relevant fields
    };
  }
  
  // Add other simulation methods as needed
}
```

### Step 3: Update the factory

Update the `paymentGatewayAdapterFactory.ts` file to include your custom adapter:

```typescript
import { CustomGatewayAdapter } from './customGatewayAdapter';

export function getPaymentGatewayAdapter(
  providerType: PaymentGatewayType,
  configuration: any
): PaymentGatewayAdapter {
  switch (providerType) {
    // Existing cases
    case 'custom':
      return new CustomGatewayAdapter(configuration);
    default:
      logger.error(`Unsupported payment gateway provider type: ${providerType}`);
      throw new Error(`Unsupported payment gateway provider type: ${providerType}`);
  }
}
```

### Step 4: Update the PaymentGatewayType enum

If necessary, update the `PaymentGatewayType` enum in `models/paymentGateway.ts` to include your custom gateway type:

```typescript
export type PaymentGatewayType = 
  | 'stripe'
  | 'paypal'
  | 'authorize_net'
  | 'mpesa'
  | 'square'
  | 'razorpay'
  | 'custom' // Add your custom type
  | 'adyen'
  | 'worldpay';
```

## Testing Your Adapter

### Unit Testing

Create unit tests for your adapter in the `services/actions/tests` directory:

```typescript
import { CustomGatewayAdapter } from '../src/services/paymentGateway/adapters/customGatewayAdapter';

describe('CustomGatewayAdapter', () => {
  const config = {
    apiKey: 'test_api_key',
    merchantId: 'test_merchant_id',
    // Add other required configuration
  };
  
  let adapter: CustomGatewayAdapter;
  
  beforeEach(() => {
    adapter = new CustomGatewayAdapter(config);
  });
  
  test('createPayment should return valid response', async () => {
    const result = await adapter.createPayment({
      transactionId: 'test_tx_123',
      amount: 100,
      currency: 'USD',
      callbackUrl: 'https://example.com/callback'
    });
    
    expect(result).toHaveProperty('externalId');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('paymentUrl');
  });
  
  // Add tests for other methods
});
```

### Integration Testing

Create integration tests that test the full payment flow:

1. Register your gateway provider
2. Create a payment transaction
3. Execute or check the payment status
4. Process webhook (if applicable)
5. Verify the final status

## Registering Your Payment Gateway

Use the GraphQL API to register your custom payment gateway:

```graphql
mutation RegisterCustomGateway {
  registerPaymentGatewayProvider(
    code: "custom_gateway"
    name: "Custom Payment Gateway"
    description: "Custom payment gateway integration"
    providerType: custom
    configuration: {
      apiKey: "your_api_key"
      merchantId: "your_merchant_id"
      environment: "sandbox"
      // Other required configuration
    }
    webhookUrl: "https://your-app.com/api/webhooks/custom-gateway"
    supportsRefunds: true
    supportsPartialPayments: true
    supportsRecurringPayments: true
  ) {
    id
    code
    name
  }
}
```

## Integration with Client Applications

### Checkout Flow

Document the checkout flow for client applications:

1. Create a payment transaction using the GraphQL API
2. Redirect the user to the `paymentUrl` from the response
3. Handle the callback when the user completes the payment
4. Check the payment status using the GraphQL API

### Direct API Integration

For server-to-server payments:

1. Save a payment method for the client
2. Create a payment transaction
3. Execute the payment using the saved payment method
4. Check the payment status

## Webhook Implementation

### Setting Up Webhooks

1. Configure the webhook URL in your custom gateway provider's dashboard
2. Set up security for your webhook endpoint (signatures, API keys, etc.)
3. Configure error handling and retry logic

### Webhook Processing

Your `processWebhook` method should:

1. Validate the webhook signature or authentication
2. Identify the related transaction
3. Update the transaction status
4. Return the processed result

## Best Practices

1. **Error Handling**: Implement comprehensive error handling and logging
2. **Idempotency**: Ensure operations are idempotent to prevent duplicate transactions
3. **Security**: Protect sensitive data and API keys
4. **Logging**: Log all requests and responses for debugging
5. **Validation**: Validate all input data before sending to the payment gateway
6. **Testing**: Implement thorough testing in sandbox/test environments
7. **Documentation**: Document your custom integration thoroughly

## Example Implementation

For a complete working example, refer to the existing implementations:

- `stripeAdapter.ts` for credit card payments
- `paypalAdapter.ts` for PayPal integration
- `squareAdapter.ts` for Square integration
- `razorpayAdapter.ts` for Razorpay integration

Each implementation demonstrates how to handle different aspects of payment processing, webhook handling, and recurring payments.