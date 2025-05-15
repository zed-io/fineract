# Fineract Hasura Integration Capabilities

This document describes the integration capabilities available in the Fineract Hasura system, which allow external applications to interact with the platform in various ways.

## Table of Contents

1. [Overview](#overview)
2. [Webhook Integration](#webhook-integration)
3. [API Client Authentication](#api-client-authentication)
4. [Data Exchange](#data-exchange)
5. [Event Streaming](#event-streaming)
6. [GraphQL API Reference](#graphql-api-reference)

## Overview

The Fineract Hasura system provides several methods for integrating with external applications:

1. **Webhooks**: Push notifications to external systems when events occur
2. **API Client Authentication**: OAuth2-based authentication for secure API access
3. **Data Exchange**: Import and export data in standard formats
4. **Event Streaming**: Real-time data synchronization using message queues

These capabilities enable building comprehensive financial services ecosystems that interact with the core Fineract platform.

## Webhook Integration

Webhooks allow external applications to receive notifications when specific events occur in the Fineract system. These events include client creation, loan approval, deposit transactions, and more.

### Key Features

- Configure webhooks for specific event types
- Customize payload templates using Handlebars
- Set HTTP headers and authentication
- Automatic retry with configurable parameters
- Comprehensive execution history and monitoring

### Event Types

The system supports a wide range of events including:

- Client events: creation, update, activation
- Loan events: application, approval, disbursement, repayment
- Savings events: deposit, withdrawal, interest posting
- Transaction events: creation, reversal
- System events: business date changes, COB completion

### Example Webhook Registration

```graphql
mutation RegisterWebhook {
  registerWebhook(
    name: "Loan Approval Notification"
    description: "Notify external system when loans are approved"
    eventType: "loan.approved"
    url: "https://example.com/webhooks/loan-approved"
    httpMethod: POST
    contentType: application_json
    headers: {
      "Authorization": "Bearer your-token",
      "X-Custom-Header": "custom-value"
    }
    payloadTemplate: """
    {
      "event": "{{type}}",
      "loanId": "{{data.id}}",
      "clientId": "{{data.clientId}}",
      "approvedAmount": "{{data.approvedPrincipal}}",
      "timestamp": "{{timestamp}}"
    }
    """
    retryCount: 3
    retryInterval: 60
  ) {
    id
  }
}
```

## API Client Authentication

The API Client Authentication system provides OAuth2-compliant authentication for secure API access. It supports various grant types including client credentials, password, and refresh token.

### Key Features

- Register client applications with customizable parameters
- Multiple grant types support
- Scope-based authorization
- Token generation and validation
- Configurable token expiration

### Example Client Registration

```graphql
mutation RegisterClient {
  registerApiClient(
    name: "Mobile Banking App"
    description: "Mobile application for customers"
    redirectUris: ["https://app.example.com/callback"]
    grantTypes: ["password", "refresh_token"]
    scope: ["read:loans", "read:savings", "write:transfers"]
    tokenValidity: 3600
    refreshTokenValidity: 2592000
  ) {
    clientId
    clientSecret
    name
    grantTypes
    scope
  }
}
```

### Example Token Generation

```graphql
mutation GenerateToken {
  generateToken(
    clientId: "your-client-id"
    clientSecret: "your-client-secret"
    grantType: "password"
    username: "user@example.com"
    password: "user-password"
    scope: ["read:loans", "read:savings"]
  ) {
    accessToken
    tokenType
    expiresIn
    refreshToken
    scope
  }
}
```

## Data Exchange

The Data Exchange module enables importing and exporting data in standard formats (CSV, JSON, Excel) to facilitate data migration, reporting, and integration with other systems.

### Key Features

- Export data with customizable field mapping
- Import data with validation rules
- Multiple format support (CSV, JSON, Excel)
- Configurable error handling
- Historical tracking of import/export operations

### Example Data Export

```graphql
mutation ExportClientData {
  executeExport(
    entityType: "client"
    format: "csv"
    filters: {
      activationDate: { $gte: "2023-01-01" }
      status: "active"
    }
  ) {
    success
    fileUrl
    recordCount
    format
    message
  }
}
```

### Example Data Import

```graphql
mutation ImportClients {
  processImport(
    entityType: "client"
    format: "csv"
    data: "base64-encoded-csv-content"
    fileType: "text/csv"
  ) {
    success
    totalRecords
    successCount
    errorCount
    errors {
      row
      field
      message
    }
    message
  }
}
```

## Event Streaming

The Event Streaming module provides real-time data synchronization capabilities using various message queue technologies (Kafka, RabbitMQ, AWS SQS, etc.) to enable building distributed systems.

### Key Features

- Support for multiple streaming platforms
- Event filtering based on criteria
- Producer and consumer registration
- Comprehensive monitoring and history
- Configurable connection parameters

### Supported Stream Types

- **Kafka**: For high-throughput event streaming
- **RabbitMQ**: For reliable message delivery
- **AWS SQS**: For cloud-native applications on AWS
- **Azure Service Bus**: For cloud-native applications on Azure
- **Google Pub/Sub**: For cloud-native applications on Google Cloud
- **Webhook**: For simpler HTTP-based integrations
- **Custom**: For implementing custom streaming logic

### Example Producer Registration

```graphql
mutation RegisterKafkaProducer {
  registerEventProducer(
    name: "Loan Events Producer"
    description: "Produces loan-related events to Kafka"
    eventTypes: ["loan.created", "loan.approved", "loan.disbursed", "loan.repayment"]
    streamType: kafka
    config: {
      bootstrapServers: ["kafka-broker1:9092", "kafka-broker2:9092"]
      topic: "fineract-loan-events"
      clientId: "fineract-hasura"
      securityProtocol: "SASL_SSL"
      saslMechanism: "PLAIN"
      saslUsername: "kafka-user"
      saslPassword: "kafka-password"
    }
    filterCriteria: {
      "data.loanType": "individual"
    }
  ) {
    id
    name
    eventTypes
    streamType
    isActive
    createdDate
  }
}
```

### Example Event Publishing

```graphql
mutation PublishEvent {
  publishEvent(
    eventType: "loan.created"
    eventData: {
      id: "123456",
      clientId: "789012",
      amount: 10000,
      term: 12,
      interestRate: 10.5,
      status: "pending"
    }
  ) {
    success
    eventId
    publishedStreams
    failedStreams
    message
  }
}
```

## GraphQL API Reference

The integration capabilities are exposed through GraphQL APIs. Here's a summary of the available operations:

### Webhook Operations

- `registerWebhook`: Register a new webhook
- `getWebhooks`: List configured webhooks
- `testWebhook`: Test a webhook with sample data

### API Client Operations

- `registerApiClient`: Register a new API client
- `generateToken`: Generate an OAuth token
- `validateToken`: Validate an existing token

### Data Exchange Operations

- `executeExport`: Execute a data export
- `processImport`: Process a data import

### Event Streaming Operations

- `registerEventProducer`: Register a new event producer
- `registerEventConsumer`: Register a new event consumer
- `updateEventStream`: Update an existing event stream
- `getEventStreams`: List configured event streams
- `getEventStreamById`: Get a specific event stream
- `deleteEventStream`: Delete an event stream
- `publishEvent`: Publish an event to registered streams

For detailed information on each operation's parameters and response types, refer to the GraphQL schema in the `metadata/actions/integration_types.graphql` file.