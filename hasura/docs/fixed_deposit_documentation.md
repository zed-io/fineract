# Fixed Deposit Module - Documentation

This document provides comprehensive documentation for the Fixed Deposit module in the Fineract Hasura system. It covers user guides, API documentation, technical implementation details, and operational guides for administrators.

## Table of Contents

1. [User Guide](#user-guide)
   - [Fixed Deposit Concepts](#fixed-deposit-concepts)
   - [Product Management](#product-management)
   - [Account Management](#account-management)
   - [Interest Calculation](#interest-calculation)
   - [Maturity Processing](#maturity-processing)
   - [Premature Closure](#premature-closure)

2. [API Documentation](#api-documentation)
   - [GraphQL Schema Overview](#graphql-schema-overview)
   - [Queries](#queries)
   - [Mutations](#mutations)
   - [Types Reference](#types-reference)
   - [Request/Response Examples](#requestresponse-examples)

3. [Technical Documentation](#technical-documentation)
   - [Database Schema](#database-schema)
   - [Implementation Architecture](#implementation-architecture)
   - [Integration with Other Modules](#integration-with-other-modules)
   - [Batch Processes](#batch-processes)

4. [Operational Guide](#operational-guide)
   - [Configuration Options](#configuration-options)
   - [Scheduled Jobs](#scheduled-jobs)
   - [Monitoring](#monitoring)
   - [Troubleshooting](#troubleshooting)

## User Guide

### Fixed Deposit Concepts

Fixed Deposits (also known as Term Deposits or Time Deposits) are financial products where clients deposit a fixed amount of money for a predetermined period at a fixed interest rate. Key characteristics include:

- **Fixed Term**: Funds are locked for a specific duration (e.g., 3 months, 6 months, 1 year)
- **Fixed Interest Rate**: Higher interest rate compared to regular savings accounts
- **Limited Access**: Funds cannot be withdrawn before maturity without penalties
- **Maturity Options**: Options for handling funds at maturity (withdrawal, transfer, reinvestment)

**Benefits for Clients**:
- Higher returns than regular savings accounts
- Predictable interest income
- Forced savings discipline
- Safety and security

**Benefits for Financial Institutions**:
- Stable funding source
- Predictable cash flow
- Higher retention of customer deposits
- Cross-selling opportunities

### Product Management

#### Creating Fixed Deposit Products

Financial institutions can create various fixed deposit products with different terms to suit diverse client needs. Key product parameters include:

1. **Basic Information**:
   - Name and short name
   - Description and details
   - Currency

2. **Term Settings**:
   - Minimum and maximum deposit terms
   - Term frequency type (days, weeks, months, years)
   - Term multiples (if applicable)

3. **Amount Restrictions**:
   - Minimum deposit amount
   - Maximum deposit amount
   - Default deposit amount (optional)

4. **Interest Settings**:
   - Default interest rate
   - Interest rate charts (tiered by amount and/or term)
   - Interest compounding period (daily, monthly, quarterly, etc.)
   - Interest posting period (monthly, quarterly, annually, etc.)
   - Interest calculation method (daily balance, average daily balance)
   - Year length for calculations (360 or 365 days)

5. **Premature Closure Rules**:
   - Whether early withdrawal is allowed
   - Penalty interest rate if applicable
   - Penalty calculation method (whole term or till preclosure date)

6. **Accounting Rules**:
   - Accounting treatment of deposits and interest
   - Associated GL accounts

#### Interest Rate Charts

Interest rate charts allow for complex interest structures based on:
- Deposit amount tiers
- Deposit term tiers
- Combinations of both

For example, a product might offer:
- 4.5% for deposits between $1,000-$10,000 for 3-6 months
- 5.0% for deposits between $10,001-$50,000 for 3-6 months
- 5.5% for deposits above $50,000 for 3-6 months
- Higher rates for longer terms within each amount tier

### Account Management

#### Account Lifecycle

Fixed deposit accounts follow this standard lifecycle:

1. **Submitted and Pending Approval**:
   - Account is created with client information, product, amount, and term
   - System calculates projected maturity date and amount
   - Account awaits approval

2. **Approved**:
   - Account is approved by an authorized staff member
   - Still inactive until deposit is received
   - Maturity calculations are finalized

3. **Active**:
   - Initial deposit is received and confirmed
   - Interest accrual begins
   - Term countdown starts

4. **Matured**:
   - Term has ended
   - Account is ready for maturity processing
   - Interest accrual stops (unless automatic renewal)

5. **Closed/Prematurely Closed**:
   - Account is closed after maturity or prematurely
   - Funds are disbursed according to closure instructions

#### Opening a Fixed Deposit Account

To open a fixed deposit account:

1. Select a client or group
2. Choose an appropriate fixed deposit product
3. Specify the deposit amount and term
4. Set submission date and expected deposit date
5. Optionally link a savings account for:
   - Funding the deposit
   - Receiving interest payments
   - Receiving maturity proceeds

6. Add any applicable charges
7. Review and submit the application

#### Account Management Operations

Available management operations include:

- **Approval**: Review and approve pending accounts
- **Rejection**: Reject accounts that don't meet criteria
- **Activation**: Record initial deposit and activate account
- **View Details**: Monitor account status, balances, and projected maturity
- **Update Maturity Instructions**: Modify handling of funds at maturity
- **Premature Closure**: Process early withdrawal requests
- **View Transactions**: Review all account transactions and interest postings

### Interest Calculation

Interest on fixed deposits is calculated based on:

1. **Principal Amount**: The deposit amount
2. **Interest Rate**: Annual interest rate (determined by product and/or interest chart)
3. **Term**: Duration of the deposit
4. **Compounding Frequency**: How often interest is compounded (daily, monthly, quarterly, etc.)
5. **Year Basis**: Whether calculations use 360 or 365 days per year

The general formula is:

```
Interest = Principal * (1 + Rate/Compounding Periods per Year)^(Compounding Periods * Term in Years) - Principal
```

For example, for a $10,000 deposit at 5% annual interest for 1 year with quarterly compounding:
```
Interest = $10,000 * (1 + 0.05/4)^(4*1) - $10,000 = $509.45
```

Interest is typically:
- **Accrued**: Calculated and recorded daily
- **Posted**: Added to the account at specified intervals (but usually not withdrawable)
- **Paid**: Disbursed at maturity or according to specified instructions

### Maturity Processing

When a fixed deposit reaches maturity, clients have several options:

1. **Withdraw Principal and Interest**:
   - Full amount (principal + interest) is paid out
   - Payment can be made in cash, check, or transfer to another account

2. **Transfer to Savings Account**:
   - Amount is transferred to a specified savings account
   - Provides immediate liquidity and accessibility

3. **Automatic Renewal/Rollover**:
   - Principal (with or without interest) is automatically reinvested
   - New term begins immediately after maturity
   - Interest rate may update to current product rates

4. **Transfer to Linked Account**:
   - Amount is transferred to a pre-linked savings account
   - Useful for automated financial planning

Maturity instructions can be set at account opening or updated before maturity.

### Premature Closure

Premature closure (early withdrawal) allows clients to access funds before the maturity date, usually with penalties:

1. **Penalty Calculation Methods**:
   - **Whole Term**: Penalty applied to the interest calculated for the entire original term
   - **Till Preclosure Date**: Penalty applied only to interest earned up to withdrawal date

2. **Penalty Types**:
   - **Interest Rate Reduction**: Interest calculated at a reduced rate
   - **Flat Fee**: Fixed amount charged regardless of amount or time
   - **Percentage of Interest**: Portion of earned interest is forfeited

3. **Closure Process**:
   - Client requests premature closure
   - System calculates applicable penalties
   - Client confirms acceptance of reduced returns
   - Account is closed and remaining funds disbursed

Example:
- $10,000 deposit for 12 months at 5%
- Withdrawal after 6 months
- Penalty: 2% reduction on the whole term
- Interest recalculated at 3% instead of 5%
- Client receives principal + reduced interest

## API Documentation

### GraphQL Schema Overview

The Fixed Deposit module provides a comprehensive GraphQL API with:
- Queries to retrieve products and accounts information
- Mutations to create and manage products and accounts
- Complex types to represent all required entities

The API is organized into logical categories:
- Product management
- Account management
- Interest and maturity operations
- Reporting and analytics

### Queries

The following GraphQL queries are available:

| Query | Description | Parameters | Returns |
|-------|-------------|------------|---------|
| `getFixedDepositProduct` | Retrieves a specific fixed deposit product | `productId: String!` | `FixedDepositProductResponse` |
| `getFixedDepositProducts` | Retrieves all fixed deposit products | None | `FixedDepositProductsResponse` |
| `getFixedDepositAccount` | Retrieves a specific fixed deposit account | `accountId: String!` | `FixedDepositAccountResponse` |
| `getClientFixedDepositAccounts` | Retrieves all fixed deposit accounts for a client | `clientId: String!` | `ClientFixedDepositAccountsResponse` |
| `getFixedDepositTemplate` | Retrieves template data for creating accounts | `clientId: String`, `productId: String` | `FixedDepositTemplateResponse` |

### Mutations

The following GraphQL mutations are available:

| Mutation | Description | Key Parameters | Returns |
|----------|-------------|----------------|---------|
| `createFixedDepositProduct` | Creates a new fixed deposit product | `name`, `currencyCode`, `interestRate`, etc. | `CreateFixedDepositProductResponse` |
| `createFixedDepositAccount` | Creates a new fixed deposit account | `clientId`, `productId`, `depositAmount`, `depositPeriod` | `CreateFixedDepositAccountResponse` |
| `approveFixedDepositAccount` | Approves a fixed deposit account | `accountId`, `approvedOnDate` | `ApproveFixedDepositAccountResponse` |
| `activateFixedDepositAccount` | Activates a fixed deposit account | `accountId`, `activatedOnDate` | `ActivateFixedDepositAccountResponse` |
| `prematureCloseFixedDepositAccount` | Prematurely closes a fixed deposit account | `accountId`, `closedOnDate`, `onAccountClosureType` | `PrematureCloseFixedDepositAccountResponse` |
| `updateFixedDepositMaturityInstructions` | Updates maturity instructions | `accountId`, `onAccountClosureType` | `UpdateFixedDepositMaturityInstructionsResponse` |

### Types Reference

#### Key Object Types

| Type | Description | Notable Fields |
|------|-------------|----------------|
| `FixedDepositProductResponse` | Represents a fixed deposit product | `id`, `name`, `currency`, `minDepositTerm`, `interestRate`, `charts` |
| `FixedDepositAccountResponse` | Represents a fixed deposit account | `id`, `clientName`, `status`, `depositAmount`, `maturityDate`, `interestRate` |
| `FixedDepositInterestRateChart` | Represents an interest rate chart | `name`, `fromDate`, `chartSlabs` |
| `FixedDepositInterestRateSlab` | Represents a slab in an interest rate chart | `periodType`, `fromPeriod`, `toPeriod`, `amountRangeFrom`, `amountRangeTo`, `annualInterestRate` |
| `FixedDepositSummary` | Summary information for a fixed deposit account | `totalDeposits`, `totalInterestEarned`, `accountBalance` |
| `FixedDepositTransaction` | Represents a transaction on a fixed deposit account | `transactionType`, `date`, `amount`, `runningBalance` |

#### Enum Types

| Type | Values |
|------|--------|
| `deposit_term_frequency_type` | `days`, `weeks`, `months`, `years` |
| `deposit_period_frequency_type` | `days`, `weeks`, `months`, `years` |
| `deposit_preclosure_interest_type` | `whole_term`, `till_preclosure_date` |
| `deposit_account_on_closure_type` | `withdraw_deposit`, `transfer_to_savings`, `reinvest`, `transfer_to_linked_account` |

### Request/Response Examples

#### Creating a Fixed Deposit Product

**Request:**
```graphql
mutation CreateFixedDepositProduct {
  createFixedDepositProduct(
    name: "Premium Fixed Deposit"
    shortName: "PFD"
    description: "High-yield fixed deposit for long-term savers"
    currencyCode: "USD"
    minDepositTerm: 3
    maxDepositTerm: 60
    minDepositTermType: "months"
    maxDepositTermType: "months"
    isPrematureClosureAllowed: true
    preClosurePenalApplicable: true
    preClosurePenalInterest: 2
    preClosurePenalInterestOnType: "whole_term"
    minDepositAmount: 1000
    maxDepositAmount: 100000
    interestRate: 5.5
    interestCompoundingPeriodType: "monthly"
    interestPostingPeriodType: "quarterly"
    interestCalculationType: "daily_balance"
    interestCalculationDaysInYearType: 365
    accountingRule: "cash"
    charts: [
      {
        name: "Standard Interest Rates"
        fromDate: "2023-01-01"
        isPrimaryGroupingByAmount: true
        chartSlabs: [
          {
            description: "Small deposits (3-6 months)"
            periodType: "months"
            fromPeriod: 3
            toPeriod: 6
            amountRangeFrom: 1000
            amountRangeTo: 10000
            annualInterestRate: 4.5
            currencyCode: "USD"
          },
          {
            description: "Medium deposits (3-6 months)"
            periodType: "months"
            fromPeriod: 3
            toPeriod: 6
            amountRangeFrom: 10001
            amountRangeTo: 50000
            annualInterestRate: 5.0
            currencyCode: "USD"
          }
        ]
      }
    ]
  ) {
    productId
  }
}
```

**Response:**
```json
{
  "data": {
    "createFixedDepositProduct": {
      "productId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

#### Creating a Fixed Deposit Account

**Request:**
```graphql
mutation CreateFixedDepositAccount {
  createFixedDepositAccount(
    clientId: "123e4567-e89b-12d3-a456-426614174001"
    productId: "123e4567-e89b-12d3-a456-426614174000"
    submittedOnDate: "2023-07-15"
    depositAmount: 25000
    depositPeriod: 12
    depositPeriodFrequencyType: "months"
    interestRate: 5.5
    linkedAccountId: "123e4567-e89b-12d3-a456-426614174002"
    transferInterestToLinkedAccount: true
  ) {
    accountId
  }
}
```

**Response:**
```json
{
  "data": {
    "createFixedDepositAccount": {
      "accountId": "123e4567-e89b-12d3-a456-426614174003"
    }
  }
}
```

#### Retrieving Account Details

**Request:**
```graphql
query GetFixedDepositAccount {
  getFixedDepositAccount(
    accountId: "123e4567-e89b-12d3-a456-426614174003"
  ) {
    id
    accountNo
    clientName
    productName
    status {
      value
      active
      matured
    }
    depositAmount
    interestRate
    maturityAmount
    maturityDate
    depositPeriod
    depositPeriodFrequencyType {
      value
    }
    summary {
      totalDeposits
      totalInterestEarned
      accountBalance
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "getFixedDepositAccount": {
      "id": "123e4567-e89b-12d3-a456-426614174003",
      "accountNo": "FD00001",
      "clientName": "John Doe",
      "productName": "Premium Fixed Deposit",
      "status": {
        "value": "Active",
        "active": true,
        "matured": false
      },
      "depositAmount": 25000,
      "interestRate": 5.5,
      "maturityAmount": 26375.31,
      "maturityDate": "2024-07-15",
      "depositPeriod": 12,
      "depositPeriodFrequencyType": {
        "value": "months"
      },
      "summary": {
        "totalDeposits": 25000,
        "totalInterestEarned": 687.25,
        "accountBalance": 25687.25
      }
    }
  }
}
```

## Technical Documentation

### Database Schema

The Fixed Deposit module uses several tables to store all necessary data:

#### Primary Tables

1. **`fixed_deposit_product`** - Stores fixed deposit product definitions
   - Links to `savings_product` for core savings functionality
   - Stores term settings, premature closure rules, and amount restrictions

2. **`fixed_deposit_interest_rate_chart`** - Defines interest rate charts for products
   - Contains chart metadata and relationship to product

3. **`fixed_deposit_interest_rate_slab`** - Defines individual interest rate slabs
   - Contains amount ranges, period ranges, and corresponding interest rates

4. **`fixed_deposit_account`** - Stores fixed deposit account information
   - Links to `savings_account` for core account functionality
   - Stores deposit-specific details, maturity information, and closure instructions

5. **`fixed_deposit_transaction`** - Records all transactions on fixed deposit accounts
   - Links to `savings_account_transaction` for core transaction handling
   - Stores additional fixed deposit transaction details

6. **`fixed_deposit_account_charge`** - Maintains charges applicable to accounts
   - Links to `savings_account_charge` for core charge functionality

#### Key Relationships

- `fixed_deposit_product` ← 1:N → `fixed_deposit_interest_rate_chart`
- `fixed_deposit_interest_rate_chart` ← 1:N → `fixed_deposit_interest_rate_slab`
- `fixed_deposit_product` ← 1:N → `fixed_deposit_account`
- `fixed_deposit_account` ← 1:N → `fixed_deposit_transaction`
- `fixed_deposit_account` ← 1:N → `fixed_deposit_account_charge`
- `savings_account` ← 1:1 → `fixed_deposit_account`
- `savings_account_transaction` ← 1:1 → `fixed_deposit_transaction`
- `savings_account_charge` ← 1:1 → `fixed_deposit_account_charge`

#### Key Database Enums

- `deposit_term_frequency_type`: Units for deposit terms
- `deposit_period_frequency_type`: Units for interest rate period slabs
- `deposit_preclosure_interest_type`: Penalty calculation methods
- `deposit_account_on_closure_type`: Options for handling matured/closed accounts

### Implementation Architecture

The Fixed Deposit module is implemented using a layered architecture:

1. **Database Layer**:
   - PostgreSQL database with tables defined in migration scripts
   - Foreign key constraints maintain data integrity
   - Indexes optimize query performance

2. **Data Access Layer**:
   - Direct GraphQL API access to database tables where possible
   - Custom resolvers for complex operations

3. **Business Logic Layer**:
   - Action handlers process GraphQL mutations
   - Services implement business rules and validations
   - Interest calculation algorithms

4. **API Layer**:
   - GraphQL schema defines types and operations
   - Hasura handles query resolution and permissions
   - Custom action handlers for complex operations

5. **Integration Layer**:
   - Event triggers for integration with external systems
   - Scheduled job handlers for batch processing
   - Transaction management ensures data consistency

### Integration with Other Modules

The Fixed Deposit module integrates with several other modules:

1. **Client Module**:
   - Links deposits to clients/groups
   - Uses client information for KYC and account opening

2. **Savings Module**:
   - Extends core savings functionality
   - Reuses account and transaction structures
   - Shares charge handling mechanisms

3. **Accounting Module**:
   - Posts accounting entries for deposits, interest, and withdrawals
   - Maintains GL account mappings for financial reporting

4. **Notification Module**:
   - Sends notifications for account approval
   - Alerts for upcoming maturities
   - Confirmation messages for transactions

5. **User Module**:
   - Enforces permissions and role-based access control
   - Tracks user actions for audit purposes

### Batch Processes

Several batch processes support fixed deposit operations:

1. **Interest Calculation and Accrual**:
   - Runs daily to calculate and accrue interest
   - Updates account balances with accrued amounts
   - Generates accounting entries for accruals

2. **Interest Posting**:
   - Runs according to configured posting frequency
   - Posts accrued interest to accounts
   - Creates interest posting transactions

3. **Maturity Processing**:
   - Identifies accounts reaching maturity
   - Executes maturity instructions
   - Closes or renews accounts as specified

4. **Notification Generation**:
   - Generates upcoming maturity notices
   - Sends account statements
   - Creates alerts for required actions

## Operational Guide

### Configuration Options

#### System Configuration

The Fixed Deposit module offers these configuration options:

1. **Interest Calculation Precision**:
   - Number of decimal places for interest calculations
   - Rounding methods for financial calculations

2. **Maturity Processing Settings**:
   - Default maturity handling method
   - Advance notification period for maturing accounts
   - Auto-renewal settings

3. **Accounting Integration**:
   - GL account mappings for different transaction types
   - Accounting rules for interest accrual and posting

4. **Notification Settings**:
   - Notification templates for fixed deposit events
   - Timing and delivery channels for notifications

#### Product Configuration Best Practices

When configuring fixed deposit products:

1. **Interest Rate Strategy**:
   - Use tiered interest rates for larger deposits and longer terms
   - Set competitive rates based on market conditions
   - Consider funding costs and target margins

2. **Term Settings**:
   - Offer a range of terms to meet different customer needs
   - Align terms with liquidity management strategy
   - Consider regulatory requirements for term deposits

3. **Premature Closure Rules**:
   - Balance penalty severity with customer satisfaction
   - Consider reduced interest rather than punitive fees
   - Align with regulatory requirements for early withdrawals

### Scheduled Jobs

The following scheduled jobs should be configured:

1. **Daily Interest Accrual**:
   - Schedule: Daily (end of day)
   - Purpose: Calculate and accrue interest on all active fixed deposits
   - Monitoring: Check completion status and any failed accounts

2. **Interest Posting**:
   - Schedule: Varies (monthly, quarterly, etc.)
   - Purpose: Post accrued interest according to account settings
   - Monitoring: Verify posting amounts match accruals

3. **Maturity Processing**:
   - Schedule: Daily (beginning of day)
   - Purpose: Handle accounts reaching maturity date
   - Monitoring: Verify all maturity instructions are executed correctly

4. **Maturity Notifications**:
   - Schedule: Daily (configurable days before maturity)
   - Purpose: Notify clients of upcoming maturities
   - Monitoring: Check notification delivery

### Monitoring

Key monitoring areas for the Fixed Deposit module:

1. **Transaction Monitoring**:
   - Monitor high-value deposits and withdrawals
   - Track premature closure rates
   - Analyze interest payout volumes

2. **Performance Monitoring**:
   - Track database query performance
   - Monitor batch processing completion times
   - Check API response times for client-facing operations

3. **Financial Monitoring**:
   - Track total fixed deposit volume
   - Monitor interest expense accruals
   - Analyze product profitability

4. **Exception Monitoring**:
   - Track failed batch operations
   - Monitor validation failures
   - Log and alert on unexpected errors

### Troubleshooting

Common issues and their resolutions:

#### Interest Calculation Issues

**Issue**: Interest calculations don't match expected amounts.

**Resolution**:
1. Verify product interest rate settings
2. Check account-specific override rates
3. Confirm compounding and posting frequency settings
4. Verify calculation method (daily balance vs. average daily balance)
5. Check for any backdated transactions affecting calculations

#### Maturity Processing Issues

**Issue**: Maturity instructions not executing properly.

**Resolution**:
1. Check maturity date calculation accuracy
2. Verify maturity instructions are properly recorded
3. Ensure linked accounts are active and accepting deposits
4. Check for any holds or restrictions on the account
5. Verify batch job execution logs for errors

#### Premature Closure Issues

**Issue**: Incorrect penalties or amounts on premature closure.

**Resolution**:
1. Verify product premature closure settings
2. Check account-specific penalty overrides
3. Confirm interest calculation up to closure date
4. Verify penalty calculation method (whole term vs. till preclosure)
5. Review transaction history for any discrepancies

#### Transaction Processing Issues

**Issue**: Deposits or withdrawals not properly reflected.

**Resolution**:
1. Check transaction status and reversal flags
2. Verify accounting entries are properly generated
3. Confirm transaction was properly authorized
4. Check for any account restrictions or holds
5. Verify integration with core banking system if applicable

## Conclusion

The Fixed Deposit module provides a comprehensive solution for financial institutions offering term deposit products. By following this documentation, institutions can effectively configure, manage, and troubleshoot their fixed deposit operations, ensuring a seamless experience for both staff and customers.

For additional support or custom configurations, please contact the Fineract Hasura support team.