# Recurring Deposit Implementation

This document describes the implementation of the Recurring Deposit domain in the Fineract Hasura architecture.

## Overview

Recurring deposit accounts allow clients to make regular fixed deposits over a specified period, with interest calculated on the cumulative balance. They are specifically designed to encourage regular savings.

## Key Features

- **Recurring Deposit Products**: Define standard recurring deposit offerings with configurable terms
- **Recurring Deposit Accounts**: Client or group-linked accounts with recurring deposit terms
- **Installment Scheduling**: Auto-generated schedule for recurring deposits
- **Deposit Tracking**: Track on-time, late, and missed deposits
- **Interest Calculation**: Compound interest based on configurable terms
- **Premature Closure**: Support for early closure with penalty options
- **Maturity Instructions**: Define what happens when the deposit reaches maturity

## Schema Design

The recurring deposit schema consists of:

1. **recurring_deposit_products**: Defines the template for recurring deposit accounts, including:
   - Deposit frequency and amount requirements
   - Interest rates and compounding methods
   - Premature closure rules
   - Maturity handling options

2. **recurring_deposit_accounts**: Client or group-owned accounts, including:
   - Linkage to client/group
   - Account status and balance tracking
   - Deposit schedules and maturity information
   - Interest calculation parameters

3. **recurring_deposit_installments**: Tracks individual recurring deposit installments
   - Due dates
   - Deposit status (pending, completed, missed)
   - Actual deposit dates and amounts

4. **recurring_deposit_transactions**: Records all financial transactions, including:
   - Regular deposits
   - Interest postings
   - Fees and penalties
   - Withdrawals (when allowed)

5. **recurring_deposit_interest_rate_charts**: Configurable interest rate tiers based on:
   - Deposit amount
   - Deposit term
   - Effective dates

## Business Logic

The core business logic for recurring deposits is implemented in the following components:

1. **recurringDepositService.ts**
   - Product management (create, get, list)
   - Account management (create, approve, close)
   - Transaction processing (deposits, withdrawals)
   - Installment tracking and management
   - Interest calculation and posting

2. **recurringDeposit.ts** handlers
   - API handlers for all recurring deposit operations
   - Request validation and response formatting
   - Authentication and authorization checks

## Recurring Deposit Workflow

### Product Creation
1. Admin creates a recurring deposit product with specific terms
2. Interest rate charts are defined for the product
3. Product is made available to clients

### Account Opening
1. Client applies for a recurring deposit account
2. Staff reviews and approves the application
3. Account is created with a generated installment schedule
4. First deposit is made to activate the account

### Regular Deposits
1. Client makes regular deposits according to the schedule
2. System tracks on-time, late, and missed payments
3. Interest is calculated and posted according to the product terms

### Maturity
1. When all scheduled deposits are completed, the account matures
2. System applies final interest calculation
3. Account is processed according to maturity instructions:
   - Transfer to savings account
   - Automatic renewal
   - Payout to client

### Premature Closure
1. Client requests early closure before maturity
2. System calculates applicable penalties
3. Interest is adjusted according to premature closure rules
4. Remaining balance is processed according to client instructions

## GraphQL API

The recurring deposit functionality is exposed through GraphQL with the following main operations:

### Queries
- `getRecurringDepositProduct`: Get details of a specific product
- `getRecurringDepositProducts`: List all available products
- `getRecurringDepositAccount`: Get details of a specific account
- `getClientRecurringDepositAccounts`: Get all accounts for a client
- `getRecurringDepositTemplate`: Get template data for creating new accounts

### Mutations
- `createRecurringDepositProduct`: Create a new recurring deposit product
- `createRecurringDepositAccount`: Open a new recurring deposit account
- `makeRecurringDeposit`: Make a deposit to an account
- `approveRecurringDepositAccount`: Approve a pending account application
- `prematureCloseRecurringDepositAccount`: Close an account before maturity
- `updateRecurringDepositMaturityInstructions`: Update instructions for maturity handling

## Integration with Other Domains

The recurring deposit domain integrates with:

1. **Client Domain**: Accounts are linked to clients or groups
2. **Savings Domain**: Accounts can transfer to/from savings accounts
3. **Accounting Domain**: All transactions generate appropriate journal entries
4. **Reporting Domain**: Deposit data is included in financial and portfolio reports

## Future Enhancements

Planned enhancements for the recurring deposit implementation:

1. **Automated Reminders**: Send notifications for upcoming deposits
2. **Automated Penalties**: Apply penalties for missed deposits
3. **Bulk Processing**: Support for processing multiple deposits at once
4. **Standing Instructions**: Automatic transfers from linked accounts
5. **Flexible Schedules**: Support for customized deposit schedules