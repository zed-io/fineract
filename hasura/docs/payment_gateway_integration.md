# Fineract Payment Gateway Integration

This document describes the Payment Gateway integration capabilities available in the Fineract Hasura system, which allow for processing payments through various external payment processors.

## Table of Contents

1. [Overview](#overview)
2. [Supported Payment Gateways](#supported-payment-gateways)
3. [Key Features](#key-features)
4. [Database Schema](#database-schema)
5. [Configuration](#configuration)
6. [Payment Flow](#payment-flow)
7. [Webhooks](#webhooks)
8. [Recurring Payments](#recurring-payments)
9. [Refunds](#refunds)
10. [Payment Methods](#payment-methods)
11. [GraphQL API Reference](#graphql-api-reference)

## Overview

The Payment Gateway Integration module provides a flexible framework for integrating with various external payment processors. It allows Fineract to process payments, save payment methods, handle recurring payments, and process refunds through multiple payment providers.

The module uses an adapter pattern, which makes it easy to add support for new payment gateways without modifying the core payment processing logic.

## Supported Payment Gateways

The system currently supports the following payment gateways:

1. **Stripe** - For credit card and ACH payments
2. **PayPal** - For PayPal account and credit card payments
3. **Authorize.Net** - For credit card and electronic check payments
4. **M-Pesa** - For mobile money payments in Africa

Additional payment gateways can be added by implementing the `PaymentGatewayAdapter` interface.

## Key Features

- **Multi-Gateway Support**: Configure and use multiple payment gateways simultaneously
- **Transaction Management**: Create, execute, and track payments
- **Payment Method Storage**: Securely store tokenized payment methods for future use
- **Recurring Payments**: Schedule regular payments with configurable frequencies
- **Refund Processing**: Process full or partial refunds for completed payments
- **Webhook Handling**: Process asynchronous notifications from payment providers
- **Comprehensive Reporting**: Track payment transactions and their statuses
- **Client Integration**: Allow clients to make payments through various methods

## Database Schema

The payment gateway module uses the following database tables:

1. `payment_gateway_provider` - Stores configuration for payment gateway providers
2. `payment_gateway_transaction` - Records all payment transactions
3. `payment_gateway_webhook_event` - Tracks webhook events from payment providers
4. `payment_gateway_recurring_config` - Stores recurring payment configurations
5. `payment_gateway_payment_method` - Stores tokenized payment methods for clients

## Configuration

To add a new payment gateway provider, the following configuration steps are required:

1. Register the provider with the required configuration parameters
2. Set up webhooks endpoints if the gateway supports asynchronous notifications
3. Configure security settings (API keys, secrets, etc.)

Example of registering a Stripe provider:

```graphql
mutation RegisterStripeProvider {
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

## Payment Flow

The typical payment flow consists of the following steps:

1. **Create Payment**: Initialize a payment transaction with amount, currency, and other details
2. **Execute Payment**: Process the payment using client-provided payment details
3. **Check Status**: Verify payment status (completed, pending, failed)
4. **Handle Callback/Webhook**: Process asynchronous payment status updates from the provider

Example of creating and executing a payment:

```graphql
# Step 1: Create payment transaction
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

# Step 2: Execute payment (if not using redirect)
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

# Step 3: Check payment status
query CheckPaymentStatus {
  checkPaymentStatus(
    transactionId: "tx123"
  ) {
    status
    paymentDetails
  }
}
```

## Webhooks

Payment gateways often use webhooks to provide asynchronous updates about payment statuses. The module includes a webhook handler that can:

1. Receive webhook events from payment providers
2. Validate webhook signatures for security
3. Process the webhook payload and update transaction status
4. Create new transactions for events like subscription payments

Webhook endpoints are configured per provider and do not require authentication, as they use cryptographic signatures for verification.

## Recurring Payments

The system supports recurring payments with different frequencies:

- Daily
- Weekly
- Biweekly
- Monthly
- Quarterly
- Annual

Example of creating a recurring payment:

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

## Refunds

The system supports full or partial refunds for completed payments:

```graphql
mutation RefundPayment {
  refundPayment(
    transactionId: "tx123"
    amount: 50.25
    reason: "Customer request"
  ) {
    success
    refundTransactionId
    status
  }
}
```

## Payment Methods

Clients can save payment methods for future use. The system stores tokenized payment information (never raw card data):

```graphql
mutation SavePaymentMethod {
  savePaymentMethod(
    providerId: "abc123"
    clientId: "client456"
    paymentMethodType: credit_card
    token: "pm_789012"
    maskedNumber: "•••• 4242"
    expiryDate: "12/2025"
    cardType: "visa"
    isDefault: true
  ) {
    id
    token
    isDefault
  }
}

query GetClientPaymentMethods {
  getClientPaymentMethods(
    clientId: "client456"
  ) {
    paymentMethods {
      id
      paymentMethodType
      maskedNumber
      expiryDate
      isDefault
    }
    total
  }
}
```

## GraphQL API Reference

The payment gateway integration exposes the following GraphQL operations:

### Provider Operations
- `getPaymentGatewayProviders`: List configured payment gateway providers
- `getPaymentGatewayProviderById`: Get details of a specific provider
- `registerPaymentGatewayProvider`: Register a new payment gateway provider
- `updatePaymentGatewayProvider`: Update an existing provider configuration
- `deletePaymentGatewayProvider`: Delete a provider configuration

### Transaction Operations
- `getPaymentGatewayTransactions`: List payment transactions with filtering options
- `getPaymentGatewayTransactionById`: Get details of a specific transaction
- `createPaymentTransaction`: Create a new payment transaction
- `executePayment`: Execute a payment transaction
- `checkPaymentStatus`: Check the status of a payment transaction
- `refundPayment`: Process a refund for a completed payment

### Payment Method Operations
- `getClientPaymentMethods`: List payment methods saved for a client
- `savePaymentMethod`: Save a new payment method for a client
- `deletePaymentMethod`: Delete a saved payment method

### Recurring Payment Operations
- `getRecurringPaymentConfigurations`: List recurring payment configurations
- `createRecurringPaymentConfiguration`: Create a new recurring payment configuration
- `updateRecurringPaymentStatus`: Update the status of a recurring payment (activate, pause, cancel)

### Webhook Operations
- `processPaymentWebhook`: Process a webhook notification from a payment provider

For detailed information on each operation's parameters and response types, refer to the GraphQL schema in the `metadata/actions/payment_gateway_types.graphql` file.