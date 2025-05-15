# Fineract Payment Gateway Integration Guide

This guide provides detailed information on integrating external payment gateways with Fineract using the Payment Gateway module.

## Table of Contents

1. [Overview](#overview)
2. [Supported Payment Gateways](#supported-payment-gateways)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Integration Process](#integration-process)
6. [Configuration Guide](#configuration-guide)
7. [Payment Workflows](#payment-workflows)
8. [Webhook Handling](#webhook-handling)
9. [Recurring Payments](#recurring-payments)
10. [Testing](#testing)
11. [Security Considerations](#security-considerations)
12. [Troubleshooting](#troubleshooting)
13. [Adding New Payment Gateways](#adding-new-payment-gateways)

## Overview

The Payment Gateway Integration module provides a flexible framework for integrating with various external payment processors. It allows Fineract to process payments, save payment methods, handle recurring payments, and process refunds through multiple payment providers.

The module is designed with an adapter pattern, which makes it easy to add support for new payment gateways without modifying the core payment processing logic.

## Supported Payment Gateways

The system currently supports the following payment gateways:

1. **Stripe** - For credit card and ACH payments
2. **PayPal** - For PayPal account and credit card payments
3. **Authorize.Net** - For credit card and electronic check payments
4. **M-Pesa** - For mobile money payments in Africa
5. **Square** - For in-person and online payments
6. **Razorpay** - For online payments (popular in India)

Additional payment gateways can be added by implementing the `PaymentGatewayAdapter` interface.

## Architecture

The payment gateway module is built on an adapter pattern with the following key components:

1. **Database Layer** - Tables for storing provider configurations, transactions, payment methods, and webhook events
2. **Service Layer** - Core business logic for payment processing
3. **Adapter Layer** - Provider-specific implementations for each payment gateway
4. **GraphQL API Layer** - Exposing functionality through GraphQL operations

```
┌─────────────────┐
│  GraphQL API    │
└────────┬────────┘
         │
┌────────▼────────┐
│  Service Layer   │
└────────┬────────┘
         │
┌────────▼────────┐   ┌─────────────────┐
│  Adapter Layer   ├───┤ Payment Gateway │
└────────┬────────┘   │     Adapter     │
         │            └─────────────────┘
┌────────▼────────┐
│  Database Layer  │
└─────────────────┘
```

## Database Schema

The payment gateway module uses the following database tables:

1. `payment_gateway_provider` - Stores configuration for payment gateway providers
2. `payment_gateway_transaction` - Records all payment transactions
3. `payment_gateway_webhook_event` - Tracks webhook events from payment providers
4. `payment_gateway_recurring_config` - Stores recurring payment configurations
5. `payment_gateway_payment_method` - Stores tokenized payment methods for clients

### Schema Details

#### payment_gateway_provider
```sql
CREATE TABLE payment_gateway_provider (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  provider_type VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', etc.
  configuration JSONB NOT NULL,
  webhook_url VARCHAR(500),
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_partial_payments BOOLEAN NOT NULL DEFAULT TRUE,
  supports_recurring_payments BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES m_appuser(id),
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES m_appuser(id),
  updated_date TIMESTAMP
);
```

#### payment_gateway_transaction
```sql
CREATE TABLE payment_gateway_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES payment_gateway_provider(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'refund', etc.
  external_id VARCHAR(255), -- ID in the external payment system
  amount DECIMAL(19, 6) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', etc.
  error_message TEXT,
  payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', etc.
  payment_details JSONB,
  reference_number VARCHAR(100),
  client_id UUID REFERENCES m_client(id),
  loan_id UUID REFERENCES m_loan(id),
  savings_account_id UUID REFERENCES m_savings_account(id),
  callback_url VARCHAR(500),
  metadata JSONB,
  request_payload JSONB,
  response_payload JSONB,
  created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP
);
```

For complete schema details, refer to the database migration file: `001020_payment_gateway_schema.up.sql`.

## Integration Process

To integrate a payment gateway with Fineract, follow these steps:

1. **Register the Provider**: Add the payment gateway configuration to the system
2. **Configure Webhooks**: Set up webhook endpoints for asynchronous notifications
3. **Test Connectivity**: Verify the connection with the payment gateway
4. **Configure Client UI**: Update client applications to use the payment gateway

### Provider Registration

Use the `registerPaymentGatewayProvider` mutation to register a payment gateway:

```graphql
mutation RegisterPaymentProvider {
  registerPaymentGatewayProvider(
    code: "stripe_main"
    name: "Stripe Payment Gateway"
    description: "Primary Stripe payment processor for credit cards"
    providerType: stripe
    configuration: {
      apiKey: "sk_test_..."
      webhookSecret: "whsec_..."
      redirectUrl: "https://your-app.com/payments/complete"
      brandName: "Your Organization"
    }
    webhookUrl: "https://your-app.com/api/webhooks/stripe"
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

## Configuration Guide

### Stripe Configuration
```json
{
  "apiKey": "sk_test_...",
  "webhookSecret": "whsec_...",
  "redirectUrl": "https://your-app.com/payments/complete",
  "brandName": "Your Organization"
}
```

### PayPal Configuration
```json
{
  "clientId": "client_id_from_paypal",
  "clientSecret": "client_secret_from_paypal",
  "mode": "sandbox",
  "returnUrl": "https://your-app.com/payments/complete",
  "cancelUrl": "https://your-app.com/payments/cancel"
}
```

### Square Configuration
```json
{
  "accessToken": "sq_access_token",
  "applicationId": "sq_application_id",
  "locationId": "sq_location_id",
  "environment": "sandbox",
  "checkoutBaseUrl": "https://square-checkout-url"
}
```

### Razorpay Configuration
```json
{
  "keyId": "rzp_key_id",
  "keySecret": "rzp_key_secret",
  "webhookSecret": "rzp_webhook_secret",
  "checkoutBaseUrl": "https://checkout-url"
}
```

## Payment Workflows

### Standard Payment Flow

1. **Create Transaction**: Initialize a payment transaction with amount, currency, and other details
2. **Generate Payment URL**: Create a checkout session or payment form URL
3. **Redirect Customer**: Send the customer to the payment URL
4. **Process Payment**: Customer completes the payment on the gateway's interface
5. **Handle Callback**: Process the callback or webhook when payment completes
6. **Update Status**: Update the transaction status in Fineract

#### Creating a Payment Transaction

```graphql
mutation CreatePayment {
  createPaymentTransaction(
    providerId: "abc123"
    amount: 100.50
    currency: "USD"
    clientId: "client123"
    loanId: "loan456"
    callbackUrl: "https://your-app.com/payments/callback"
  ) {
    transactionId
    status
    paymentUrl
  }
}
```

#### Checking Payment Status

```graphql
query CheckPaymentStatus {
  checkPaymentStatus(
    transactionId: "tx123"
  ) {
    status
    paymentDetails
  }
}
```

### Server-Side Payment Flow

For server-to-server payment processing:

1. **Create Transaction**: Initialize a payment transaction
2. **Execute Payment**: Process the payment using saved payment method
3. **Check Status**: Verify the payment status

```graphql
mutation ExecutePayment {
  executePayment(
    transactionId: "tx123"
    paymentMethodToken: "pm_123456"
  ) {
    success
    status
    redirectUrl
  }
}
```

## Webhook Handling

Payment gateways use webhooks to provide asynchronous updates about payment statuses. The module includes webhook handlers for each supported gateway.

### Webhook Configuration

1. Register the webhook URL with the payment gateway provider
2. Configure the webhook secret for secure verification
3. Set up proper error handling and retries

### Processing Webhooks

When a webhook is received, the system:
1. Validates the webhook signature
2. Identifies the related transaction
3. Updates the transaction status
4. Creates a webhook event record
5. Triggers any necessary follow-up actions

For detailed webhook documentation, refer to each provider's specific documentation.

## Recurring Payments

The system supports recurring payments with different frequencies:

- Daily
- Weekly
- Biweekly
- Monthly
- Quarterly
- Annual

### Creating a Recurring Payment

```graphql
mutation CreateRecurringPayment {
  createRecurringPaymentConfiguration(
    providerId: "abc123"
    clientId: "client456"
    paymentMethodToken: "pm_789012"
    frequency: monthly
    amount: 49.99
    currency: "USD"
    startDate: "2023-06-01"
    description: "Monthly subscription"
  ) {
    configId
    status
    startDate
  }
}
```

### Managing Recurring Payments

```graphql
mutation UpdateRecurringPayment {
  updateRecurringPaymentStatus(
    configId: "config123"
    status: paused
  ) {
    id
    status
  }
}
```

## Testing

Each payment gateway adapter includes simulation methods for testing integration without actual API calls. For production use, replace these with actual API calls to the payment provider.

## Security Considerations

1. **API Keys**: Never expose provider API keys in client-side code
2. **Webhook Signatures**: Always validate webhook signatures
3. **PCI Compliance**: Never store raw card data, only tokenized information
4. **Encryption**: Ensure all communication is encrypted via HTTPS
5. **Audit Logging**: Maintain detailed logs of all payment operations

## Troubleshooting

Common issues and their solutions:

1. **Webhook Not Received**
   - Check webhook URL is accessible from the internet
   - Verify webhook is properly registered with the provider
   - Check firewall/security rules

2. **Payment Status Not Updated**
   - Verify webhook processing is working
   - Check transaction IDs match between systems
   - Look for errors in webhook processing logs

3. **Invalid Configuration**
   - Ensure API keys are valid and have the correct permissions
   - Check environment settings (sandbox vs production)

## Adding New Payment Gateways

To add a new payment gateway:

1. Implement the `PaymentGatewayAdapter` interface
2. Add the adapter to the `paymentGatewayAdapterFactory.ts` file
3. Update the `PaymentGatewayType` enum in the model
4. Add configuration documentation

### Implementing a New Adapter

Create a new file (e.g., `newGatewayAdapter.ts`) that implements the `PaymentGatewayAdapter` interface:

```typescript
export class NewGatewayAdapter implements PaymentGatewayAdapter {
  // Implement all required methods
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
    // Implementation for creating a payment
  }
  
  // Implement all other required methods
}
```

Add your adapter to the factory:

```typescript
export function getPaymentGatewayAdapter(
  providerType: PaymentGatewayType,
  configuration: any
): PaymentGatewayAdapter {
  switch (providerType) {
    // Existing cases
    case 'new_gateway':
      return new NewGatewayAdapter(configuration);
    default:
      logger.error(`Unsupported payment gateway provider type: ${providerType}`);
      throw new Error(`Unsupported payment gateway provider type: ${providerType}`);
  }
}
```

For detailed implementation guidelines, refer to the existing adapter implementations in the codebase.