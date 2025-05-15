# Mobile API Optimizations for Savings Module

This document outlines the optimizations implemented in the Savings module to support efficient mobile applications.

## Overview

The mobile-optimized APIs have been designed with the following principles:
- Minimize data transfer to reduce bandwidth usage
- Support offline operations with synchronization
- Optimize for performance on limited mobile networks
- Enable efficient caching and state management

## Key Features

### 1. Lightweight Response Payloads

The mobile APIs return only essential fields needed for mobile UIs:
- `mobileSavingsAccountSummary`: Provides a lightweight summary with just the essential account details
- `mobileSavingsTransactionHistory`: Returns optimized transaction data with minimal fields

### 2. Response Compression

All mobile API responses are compressed using gzip compression to reduce bandwidth usage:
- Global compression at level 4 for all endpoints
- Mobile-specific endpoints use higher compression (level 6)
- Headers allow clients to opt-out with the `x-no-compression` header

### 3. Cursor-Based Pagination

Transaction history is implemented with cursor-based pagination:
- More efficient than offset/limit-based pagination
- Maintains consistent performance regardless of dataset size
- Uses transaction dates and IDs as cursors for reliable navigation

### 4. Offline Transaction Support

Mobile APIs support offline operations:
- Each transaction includes an optional `offlineId` generated on the client
- Transactions are tracked in a dedicated `savings_offline_transactions` table
- The API handles duplicate submissions from intermittent connectivity

### 5. Client-Side Caching Support

APIs provide cache metadata to optimize client-side caching:
- ETags for client-side cache validation
- Cache-Control headers for TTL-based caching
- Timestamps for when data was last updated
- `304 Not Modified` responses to save bandwidth

### 6. Batch Operations

The `mobileSavingsBatchOperations` endpoint enables multiple operations in a single request:
- Reduces network overhead for multiple related operations
- Allows combining queries and transactions in a single request
- Returns consolidated results

### 7. Sync Endpoint for Offline Queues

The `mobileSavingsSyncOfflineTransactions` endpoint allows syncing multiple offline transactions:
- Batch processing of transactions created while offline
- Idempotent operation to prevent duplicates
- Detailed success/failure information for each transaction

## Implementation Details

### Database Changes

A new table `savings_offline_transactions` has been added to track offline operations:
```sql
CREATE TABLE savings_offline_transactions (
    id UUID PRIMARY KEY,
    offline_id VARCHAR(50) NOT NULL,
    account_id UUID NOT NULL,
    transaction_id UUID,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    transaction_date DATE NOT NULL,
    created_by UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    offline_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Views for Efficient Queries

Two specialized views have been created:
- `mobile_savings_account_summary`: Provides optimized account summary data
- `mobile_savings_transactions`: Provides optimized transaction history

### GraphQL Schema Extensions

New GraphQL types have been added:
- `MobileSavingsAccountSummary`: Lightweight account summary
- `MobileSavingsTransaction`: Optimized transaction object
- `MobileSavingsTransactionResponse`: Response for transaction operations
- Specialized input types for mobile operations

## Usage Examples

### Fetching Account Summary

```graphql
query GetMobileSavingsSummary {
  mobileSavingsAccountSummary(
    input: { 
      accountId: "123e4567-e89b-12d3-a456-426614174000"
    }
  ) {
    id
    accountNo
    clientName
    balance
    availableBalance
    currency
    status
    lastTransactionDate
  }
}
```

### Fetching Transaction History with Pagination

```graphql
query GetMobileSavingsTransactions {
  mobileSavingsTransactionHistory(
    input: {
      accountId: "123e4567-e89b-12d3-a456-426614174000",
      limit: 20,
      cursor: "2023-05-01_abc123"
    }
  ) {
    transactions {
      id
      date
      type
      amount
      description
      status
    }
    hasMore
    nextCursor
  }
}
```

### Creating an Offline Transaction

```graphql
mutation CreateOfflineDeposit {
  mobileSavingsDepositWithQueue(
    input: {
      accountId: "123e4567-e89b-12d3-a456-426614174000",
      transactionDate: "2023-06-01",
      transactionAmount: 100.00,
      paymentTypeId: "123e4567-e89b-12d3-a456-426614174111",
      note: "Deposit made offline",
      offlineId: "offline-transaction-123",
      deviceId: "device-id-abc-123"
    }
  ) {
    success
    transactionId
    offlineId
    status
    processingStatus
    pendingSync
  }
}
```

### Syncing Multiple Offline Transactions

```graphql
mutation SyncOfflineTransactions {
  mobileSavingsSyncOfflineTransactions(
    input: {
      transactions: [
        {
          offlineId: "offline-transaction-123",
          accountId: "123e4567-e89b-12d3-a456-426614174000",
          transactionType: "DEPOSIT",
          transactionDate: "2023-06-01",
          amount: 100.00,
          paymentTypeId: "123e4567-e89b-12d3-a456-426614174111",
          note: "Offline deposit 1",
          deviceId: "device-id-abc-123"
        },
        {
          offlineId: "offline-transaction-124",
          accountId: "123e4567-e89b-12d3-a456-426614174000",
          transactionType: "WITHDRAWAL",
          transactionDate: "2023-06-02",
          amount: 50.00,
          paymentTypeId: "123e4567-e89b-12d3-a456-426614174111",
          note: "Offline withdrawal 1",
          deviceId: "device-id-abc-123"
        }
      ]
    }
  ) {
    success
    message
    totalProcessed
    successCount
    failedCount
    results {
      success
      offlineId
      status
      processingStatus
      message
    }
  }
}
```

### Using Batch Operations

```graphql
mutation BatchOperations {
  mobileSavingsBatchOperations(
    input: {
      operations: [
        {
          type: "GET_ACCOUNT_SUMMARY",
          payload: {
            accountId: "123e4567-e89b-12d3-a456-426614174000"
          }
        },
        {
          type: "GET_TRANSACTIONS",
          payload: {
            accountId: "123e4567-e89b-12d3-a456-426614174000",
            limit: 5
          }
        },
        {
          type: "DEPOSIT",
          payload: {
            accountId: "123e4567-e89b-12d3-a456-426614174000",
            transactionDate: "2023-06-03",
            transactionAmount: 75.00,
            paymentTypeId: "123e4567-e89b-12d3-a456-426614174111",
            note: "Batch deposit"
          }
        }
      ]
    }
  ) {
    success
    results {
      operationType
      success
      data
      error
    }
  }
}
```

## Client Implementation Recommendations

### Caching Strategy
- Use ETags for validation caching
- Implement TTL-based caching based on Cache-Control headers
- Maintain a local database for offline operation

### Network Handling
- Implement automatic retry with exponential backoff
- Queue transactions when offline
- Use the sync endpoint to batch process transactions when coming online

### Optimistic UI Updates
- Update UI immediately with optimistic results
- Store the offline transaction ID
- Reconcile once the transaction is synced

### Batch Operation Patterns
- Group related operations in a single batch request
- Prioritize critical operations when bandwidth is limited
- Use batch operations for initial app loading to reduce round-trips