# Fixed Deposit Functionality - Fineract Hasura

This document describes the Fixed Deposit Account functionality available in the Fineract Hasura system, which allows financial institutions to offer fixed deposit products and services to their clients.

## Table of Contents

1. [Overview](#overview)
2. [Fixed Deposit Products](#fixed-deposit-products)
   - [Product Features](#product-features)
   - [Interest Rate Charts](#interest-rate-charts)
   - [Creating a Fixed Deposit Product](#creating-a-fixed-deposit-product)
3. [Fixed Deposit Accounts](#fixed-deposit-accounts)
   - [Account Lifecycle](#account-lifecycle)
   - [Creating a Fixed Deposit Account](#creating-a-fixed-deposit-account)
   - [Managing Fixed Deposit Accounts](#managing-fixed-deposit-accounts)
4. [Maturity and Premature Closure](#maturity-and-premature-closure)
   - [Maturity Options](#maturity-options)
   - [Premature Closure](#premature-closure)
5. [API Reference](#api-reference)
   - [Fixed Deposit Product APIs](#fixed-deposit-product-apis)
   - [Fixed Deposit Account APIs](#fixed-deposit-account-apis)
6. [GraphQL Examples](#graphql-examples)

## Overview

Fixed Deposit accounts (also known as Term Deposits or Time Deposits) are savings products where clients deposit a fixed amount of money for a specified period, earning a fixed interest rate that is typically higher than regular savings accounts. The key characteristic is that the money cannot be withdrawn before the maturity date without incurring penalties.

The Fineract Hasura system provides comprehensive fixed deposit management capabilities, allowing financial institutions to:

1. Define various fixed deposit products with different terms and rates
2. Create and manage fixed deposit accounts for clients and groups
3. Handle the account lifecycle from application to maturity
4. Manage premature closures and maturity instructions
5. Calculate interest accurately based on configured terms

## Fixed Deposit Products

### Product Features

Fixed Deposit products define the terms and conditions for all accounts created under them:

- **Term Settings**: Minimum and maximum deposit terms, with flexibility in term frequency (days, weeks, months, years)
- **Amount Restrictions**: Minimum and maximum deposit amounts
- **Interest Rate Settings**: Fixed interest rates or interest rate charts based on amount and term
- **Premature Closure Rules**: Whether premature withdrawals are allowed and associated penalties
- **Interest Calculation**: Compounding period, posting period, and calculation methods

### Interest Rate Charts

Fixed deposit products can have interest rate charts that define different interest rates based on:

1. Deposit amount ranges
2. Deposit term ranges
3. Combination of both

This allows for flexible interest rate structures where higher amounts or longer terms can earn better rates.

### Creating a Fixed Deposit Product

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
          },
          {
            description: "Large deposits (3-6 months)"
            periodType: "months"
            fromPeriod: 3
            toPeriod: 6
            amountRangeFrom: 50001
            annualInterestRate: 5.5
            currencyCode: "USD"
          },
          {
            description: "Small deposits (7-12 months)"
            periodType: "months"
            fromPeriod: 7
            toPeriod: 12
            amountRangeFrom: 1000
            amountRangeTo: 10000
            annualInterestRate: 5.0
            currencyCode: "USD"
          },
          {
            description: "Medium deposits (7-12 months)"
            periodType: "months"
            fromPeriod: 7
            toPeriod: 12
            amountRangeFrom: 10001
            amountRangeTo: 50000
            annualInterestRate: 5.5
            currencyCode: "USD"
          },
          {
            description: "Large deposits (7-12 months)"
            periodType: "months"
            fromPeriod: 7
            toPeriod: 12
            amountRangeFrom: 50001
            annualInterestRate: 6.0
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

## Fixed Deposit Accounts

### Account Lifecycle

Fixed deposit accounts follow a defined lifecycle:

1. **Submitted and Pending Approval**: Initial state after account creation
2. **Approved**: Account is approved but not yet active (deposit not made)
3. **Active**: Initial deposit has been made and the account is earning interest
4. **Matured**: Term has completed and account is ready for maturity processing
5. **Closed** or **Prematurely Closed**: Account is closed after maturity or before

### Creating a Fixed Deposit Account

```graphql
mutation CreateFixedDepositAccount {
  createFixedDepositAccount(
    clientId: "123e4567-e89b-12d3-a456-426614174000"
    productId: "123e4567-e89b-12d3-a456-426614174010"
    submittedOnDate: "2023-07-15"
    depositAmount: 25000
    depositPeriod: 12
    depositPeriodFrequencyType: "months"
    interestRate: 5.5  # If different from product default
    linkedAccountId: "123e4567-e89b-12d3-a456-426614174020"  # Optional savings account to link
    transferInterestToLinkedAccount: true  # Whether to transfer interest to linked account
  ) {
    accountId
  }
}
```

### Managing Fixed Deposit Accounts

#### Approving an Account

```graphql
mutation ApproveFixedDepositAccount {
  approveFixedDepositAccount(
    accountId: "123e4567-e89b-12d3-a456-426614174030"
    approvedOnDate: "2023-07-20"
    note: "Account approved with standard terms"
  ) {
    accountId
    approvedOnDate
    maturityDate
    maturityAmount
  }
}
```

#### Activating an Account (Making the Initial Deposit)

```graphql
mutation ActivateFixedDepositAccount {
  activateFixedDepositAccount(
    accountId: "123e4567-e89b-12d3-a456-426614174030"
    activatedOnDate: "2023-07-25"
    note: "Initial deposit received from client"
  ) {
    accountId
    activatedOnDate
    transactionId
  }
}
```

#### Getting Account Details

```graphql
query GetFixedDepositAccount {
  getFixedDepositAccount(
    accountId: "123e4567-e89b-12d3-a456-426614174030"
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
    charges {
      name
      amount
      amountOutstanding
    }
    transactions {
      date
      transactionType {
        value
      }
      amount
      runningBalance
    }
  }
}
```

## Maturity and Premature Closure

### Maturity Options

When a fixed deposit account reaches maturity, it can be handled in various ways:

1. **Withdraw Deposit**: Full amount is withdrawn
2. **Transfer to Savings**: Amount is transferred to a savings account
3. **Reinvest**: Principal with or without interest is reinvested in a new fixed deposit
4. **Transfer to Linked Account**: Amount is transferred to a pre-linked savings account

```graphql
mutation UpdateMaturityInstructions {
  updateFixedDepositMaturityInstructions(
    accountId: "123e4567-e89b-12d3-a456-426614174030"
    onAccountClosureType: "transfer_to_savings"
    transferToSavingsAccountId: "123e4567-e89b-12d3-a456-426614174040"
    transferDescription: "Maturity transfer from fixed deposit"
  ) {
    accountId
    onAccountClosureType
    transferToSavingsAccountId
  }
}
```

### Premature Closure

If allowed by the product, fixed deposit accounts can be closed before maturity with a penalty:

```graphql
mutation PrematureCloseFixedDepositAccount {
  prematureCloseFixedDepositAccount(
    accountId: "123e4567-e89b-12d3-a456-426614174030"
    closedOnDate: "2023-10-15"
    onAccountClosureType: "withdraw_deposit"
    note: "Client needs funds for emergency"
  ) {
    accountId
    closedOnDate
    totalAmount
    transactionId
  }
}
```

## API Reference

### Fixed Deposit Product APIs

| Operation | Description | GraphQL Function |
|-----------|-------------|-----------------|
| Create Product | Creates a new fixed deposit product | `createFixedDepositProduct` |
| Get Product | Retrieves a specific fixed deposit product | `getFixedDepositProduct` |
| Get Products | Retrieves all fixed deposit products | `getFixedDepositProducts` |

### Fixed Deposit Account APIs

| Operation | Description | GraphQL Function |
|-----------|-------------|-----------------|
| Create Account | Creates a new fixed deposit account | `createFixedDepositAccount` |
| Get Account | Retrieves a specific fixed deposit account | `getFixedDepositAccount` |
| Approve Account | Approves a fixed deposit account | `approveFixedDepositAccount` |
| Activate Account | Activates a fixed deposit account | `activateFixedDepositAccount` |
| Get Client Accounts | Retrieves all fixed deposit accounts for a client | `getClientFixedDepositAccounts` |
| Get Template | Retrieves template data for creating accounts | `getFixedDepositTemplate` |
| Premature Close | Prematurely closes a fixed deposit account | `prematureCloseFixedDepositAccount` |
| Update Maturity Instructions | Updates maturity instructions | `updateFixedDepositMaturityInstructions` |

## GraphQL Examples

### Get Fixed Deposit Products with Interest Rate Charts

```graphql
query GetFixedDepositProductsWithRateCharts {
  getFixedDepositProducts {
    products {
      id
      name
      shortName
      currency {
        code
        displayLabel
      }
      minDepositTerm
      maxDepositTerm
      minDepositTermType {
        value
      }
      maxDepositTermType {
        value
      }
      minDepositAmount
      maxDepositAmount
      interestRate
      charts {
        name
        fromDate
        isPrimaryGroupingByAmount
        chartSlabs {
          description
          periodType {
            value
          }
          fromPeriod
          toPeriod
          amountRangeFrom
          amountRangeTo
          annualInterestRate
        }
      }
    }
  }
}
```

### Get Client's Fixed Deposit Accounts

```graphql
query GetClientFixedDepositAccounts {
  getClientFixedDepositAccounts(
    clientId: "123e4567-e89b-12d3-a456-426614174000"
  ) {
    accounts {
      id
      accountNo
      productName
      status {
        value
        active
        matured
      }
      depositAmount
      maturityAmount
      maturityDate
      interestRate
      summary {
        accountBalance
        totalInterestEarned
      }
    }
  }
}
```