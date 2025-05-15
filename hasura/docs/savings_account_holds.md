# Savings Account Holds/Blocks Functionality

This document describes the savings account holds/blocks functionality implemented in Fineract. This feature allows placing holds or blocks on savings accounts, affecting the available balance and transaction capabilities of the account.

## Overview

The savings account holds/blocks functionality provides the ability to:

1. Place full or partial holds on account balances
2. Block specific transaction types (credit/debit) or all transactions
3. Set time-limited or indefinite holds
4. Track holds by type, reason, and enforcing entity
5. Calculate available balances that respect active holds
6. Automatically expire holds based on end date

## Hold Types

The system supports various types of holds/blocks:

- **Legal**: Court-ordered holds due to legal proceedings
- **Administrative**: Internal administrative holds by the institution
- **Customer Requested**: Holds requested by the account owner
- **Fraud Prevention**: Holds placed due to suspected fraud
- **Debt Recovery**: Holds to recover debts owed
- **Tax Lien**: Holds due to tax obligations
- **Loan Collateral**: Holds as collateral for loans
- **Regulatory**: Holds required by regulatory bodies
- **System**: System-initiated holds for operational reasons

## Database Structure

The main database structure consists of:

1. A `savings_account_hold` table that stores all hold information
2. Additional fields in the `savings_account` table to track hold amounts
3. A trigger to update the account sub-status based on active holds
4. Functions to recalculate hold amounts

## API Endpoints

The following GraphQL actions are available:

1. **createSavingsAccountHold**: Place a new hold on an account
2. **releaseSavingsAccountHold**: Release an existing hold
3. **updateSavingsAccountHold**: Modify an existing hold
4. **getSavingsAccountHolds**: Retrieve holds for an account

## Account Sub-Status

When holds are active, the account sub-status is automatically updated:

- `block`: Full account block or both credit and debit blocks active
- `block_credit`: Only credit transactions are blocked
- `block_debit`: Only debit transactions are blocked

## Hold Lifecycle

Holds can have the following statuses:

1. **active**: Currently in effect
2. **expired**: Time-limited hold that has reached its end date
3. **released**: Hold manually released before end date
4. **cancelled**: Hold cancelled (not implemented yet)

## Automatic Hold Expiration

A scheduled job runs daily to check for and expire holds that have reached their end date.

## Usage Examples

### Placing a Legal Hold

```graphql
mutation CreateLegalHold {
  createSavingsAccountHold(
    input: {
      savingsAccountId: "550e8400-e29b-41d4-a716-446655440000",
      amount: 500.00,
      holdType: legal,
      holdReasonCode: "COURT_ORDER",
      holdReasonDescription: "Court order #12345",
      holdStartDate: "2023-05-01T00:00:00Z",
      holdEndDate: null,
      enforcingEntity: "District Court",
      isFullAccountBlock: true
    }
  ) {
    success
    message
    holdId
    accountNo
    accountSubStatus
    availableBalance
  }
}
```

### Releasing a Hold

```graphql
mutation ReleaseHold {
  releaseSavingsAccountHold(
    input: {
      holdId: "550e8400-e29b-41d4-a716-446655440001",
      releaseNotes: "Court order lifted",
      transactionReference: "REL-12345"
    }
  ) {
    success
    message
    releasedAmount
    accountSubStatus
    availableBalance
  }
}
```

### Querying Account Holds

```graphql
query GetAccountHolds {
  getSavingsAccountHolds(
    input: {
      savingsAccountId: "550e8400-e29b-41d4-a716-446655440000",
      status: [active, expired],
      fromDate: "2023-01-01T00:00:00Z"
    }
  ) {
    success
    accountNo
    accountBalance
    availableBalance
    totalHoldAmount
    holds {
      id
      amount
      holdType
      holdReasonCode
      holdStartDate
      holdEndDate
      status
    }
  }
}
```

## Implementation Considerations

1. Account holds affect the available balance but not the account balance
2. Transaction processing should check available balance and account sub-status
3. Client applications should display both total balance and available balance
4. Only authorized personnel should be able to create and release holds

## Security and Access Control

The following permission roles are defined:

1. Admin: Full access to all hold operations
2. User: Can create, release, update and view holds
3. Client Self-Service: Can only view holds on their own accounts

## Integration Points

The holds functionality integrates with:

1. Account balance calculations
2. Transaction processing
3. Account statements
4. Regulatory reporting