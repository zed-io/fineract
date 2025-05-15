# Recurring Deposit - Comprehensive Guide

## Table of Contents
1. [Introduction](#introduction)
2. [User Guide](#user-guide)
   - [Recurring Deposit Concepts](#recurring-deposit-concepts)
   - [Workflow](#workflow)
   - [Installment Tracking](#installment-tracking)
   - [Penalty Structure](#penalty-structure)
   - [Account Management](#account-management)
   - [Reporting](#reporting)
3. [API Guide](#api-guide)
   - [GraphQL Schema](#graphql-schema)
   - [Queries](#queries)
   - [Mutations](#mutations)
   - [Request/Response Examples](#requestresponse-examples)
4. [Technical Documentation](#technical-documentation)
   - [Database Schema](#database-schema)
   - [Job Configuration](#job-configuration)
   - [Penalty Calculation](#penalty-calculation)
   - [Integration Points](#integration-points)
5. [Administrative Guide](#administrative-guide)
   - [Configuration Options](#configuration-options)
   - [Monitoring Jobs](#monitoring-jobs)
   - [Troubleshooting](#troubleshooting)
6. [Appendix](#appendix)
   - [Glossary](#glossary)
   - [Common Error Codes](#common-error-codes)

## Introduction

The Recurring Deposit module allows financial institutions to offer recurring deposit accounts to clients and groups. These accounts encourage regular savings through scheduled, fixed deposits over a specified period, with interest calculated on the cumulative balance.

The module supports the full lifecycle of recurring deposit accounts, from product definition and account opening to installment tracking, interest calculation, and maturity handling. It also includes features for managing missed payments, applying penalties, and sending notifications.

## User Guide

### Recurring Deposit Concepts

**Recurring Deposit Product**: A template that defines the standard terms and conditions for recurring deposit accounts, including:
- Deposit frequency and amount requirements
- Interest rates and compounding methods
- Deposit term requirements
- Penalties for missed payments
- Maturity handling options

**Recurring Deposit Account**: An account opened by a client or group based on a recurring deposit product, which includes:
- A schedule of regular deposits
- Interest calculation based on the product terms
- Maturity date and expected maturity amount
- Rules for handling premature closure

**Installment**: A scheduled deposit that must be made according to the defined frequency, with tracking for on-time, late, and missed payments.

**Maturity**: The point at which all scheduled deposits have been completed and the account reaches its full term, after which it can be closed or renewed.

### Workflow

#### Product Creation
1. Administrator creates a recurring deposit product specifying:
   - Product name and description
   - Currency and interest calculation method
   - Deposit term (minimum, maximum)
   - Deposit amount (minimum, maximum, default)
   - Recurring frequency (weekly, monthly, etc.)
   - Interest rates (possibly tiered by term or amount)
   - Premature closure rules and penalties
   - Charges (if applicable)

2. Administrator defines interest rate charts for the product:
   - Different interest rates based on deposit term
   - Differentiated rates based on deposit amount tiers
   - Effective date ranges for the interest rates

3. The product is then made available to clients.

#### Account Opening
1. Client applies for a recurring deposit account
2. Staff verifies client eligibility and collects:
   - Client information
   - Selected recurring deposit product
   - Deposit amount and frequency
   - Deposit term
   - First deposit (if required immediately)
   - Maturity instructions

3. Staff submits application for approval
4. Authorized staff reviews and approves the application
5. System generates a deposit schedule based on the frequency
6. Client makes the first deposit to activate the account

#### Regular Deposits
1. Client makes regular deposits according to the schedule:
   - Deposits can be made in person, via transfer, or automated debit
   - System tracks whether deposits are made on time, late, or missed
   - Deposits made in advance can be applied to future installments

2. System processes deposits:
   - Updates account balance
   - Records transaction details
   - Updates installment status
   - Identifies and flags missed payments

3. Interest is calculated and posted based on the product's interest calculation method:
   - Daily calculation on balance
   - Posting according to the defined posting period (monthly, quarterly, etc.)
   - Interest can be compounded or transferred to another account

#### Installment Tracking
1. Automated system tracks installment due dates daily
2. For each active recurring deposit account:
   - Checks if installments are due or overdue
   - Updates account statistics (total overdue amount, number of missed installments)
   - Applies penalties for overdue installments (if configured)
   - Sends notifications to clients and staff about overdue installments

#### Maturity
1. When the deposit term is reached and all scheduled deposits are completed:
   - System calculates final interest
   - Account status is updated to "Matured"
   - Maturity amount becomes available based on maturity instructions

2. System processes the account according to maturity instructions:
   - Transfer to savings account
   - Automatic renewal for another term
   - Payout to client

#### Premature Closure
1. Client requests to close the account before maturity
2. System calculates adjusted interest based on premature closure rules:
   - May apply a penalty interest rate
   - May apply penalties on the principal or interest

3. System processes remaining balance:
   - Transfers to savings account
   - Pays out to client

### Installment Tracking

The Installment Tracking system automatically monitors recurring deposit installments and takes actions when payments are missed.

#### Key Features
1. **Daily Monitoring**: The system automatically checks all active recurring deposit accounts daily to identify due and overdue installments.

2. **Overdue Classification**: Installments are classified as:
   - **On Time**: Paid on or before the due date
   - **Late**: Paid after the due date
   - **Missed**: Not paid by the time the next installment is due

3. **Account Status Updates**: The system updates account-level statistics:
   - Total overdue amount
   - Number of overdue installments
   - Last deposit date
   - Compliance status (fully compliant, partially compliant, non-compliant)

4. **Notifications**: Automated alerts sent to:
   - Clients (reminders before due date, alerts after missed payments)
   - Staff (reports of accounts with missed payments)
   - Managers (summary reports of compliance metrics)

#### Workflow
1. **Daily Automated Check**:
   - The job runs automatically at a configured time (default: 3 AM)
   - Processes all active recurring deposit accounts with installment schedules

2. **For Each Account**:
   - Identifies due and overdue installments
   - Updates installment status
   - Calculates total overdue amount
   - Updates account statistics

3. **For Overdue Installments**:
   - If beyond grace period, applies penalties if configured
   - Sends notifications to client and staff
   - Flags account for follow-up if multiple installments are missed

### Penalty Structure

Penalties can be configured to encourage timely deposits and compensate for administrative costs related to late payments.

#### Types of Penalties
1. **Fixed Amount Penalty**: A flat fee applied for each missed installment
2. **Percentage-Based Penalty**: A percentage of the missed deposit amount
3. **Interest Rate Penalty**: Reduced interest rate for accounts with missed payments
4. **Progressive Penalty**: Increasing penalty amounts for repeated missed payments

#### Configuration Options
- **Grace Period**: Days after the due date before a penalty is applied (default: 5 days)
- **Maximum Penalties**: Limit on the number of penalties that can be applied to a single installment
- **Penalty Application Frequency**: One-time, daily, weekly or monthly
- **Penalty Calculation Base**: Whether the penalty applies to the installment amount or the entire account balance

#### Penalty Application Process
1. System identifies overdue installments beyond the grace period
2. Calculates the penalty amount based on configuration
3. Creates a charge on the account for the penalty amount
4. Notifies the client about the penalty
5. Records the penalty in the transaction history

### Account Management

#### Account Opening
1. Select a recurring deposit product
2. Enter client or group details
3. Specify deposit amount and frequency
4. Define deposit term
5. Configure maturity instructions
6. Submit for approval

#### Account Actions
- **Approve**: Authorize new account application
- **Reject**: Decline account application
- **Make Deposit**: Record a deposit for the account
- **Adjust Schedule**: Modify installment due dates if needed
- **Apply Charge**: Add manual charges to the account
- **Premature Close**: Close account before maturity
- **Mature**: Process account at maturity

#### Account Statuses
- **Submitted and Pending Approval**: Initial application status
- **Approved**: Application approved but not yet active
- **Active**: Account is open and accepting deposits
- **Rejected**: Application was declined
- **Closed**: Account closed normally at maturity
- **Premature Closed**: Account closed before maturity
- **Matured**: All installments completed, awaiting final processing

### Reporting

#### Client Reports
- **Account Statement**: Shows all transactions and current balance
- **Deposit Schedule**: Lists all installments with due dates and status
- **Maturity Projection**: Estimated maturity amount based on current deposits
- **Interest Earned**: Details of interest accrued and posted

#### Staff Reports
- **Overdue Installments Report**: Lists accounts with missed payments
- **Maturity Report**: Accounts approaching maturity in the next 30/60/90 days
- **Compliance Report**: Account compliance statistics by branch, officer, etc.
- **Penalty Report**: Summary of penalties applied

#### Management Reports
- **Portfolio Report**: Overall recurring deposit portfolio statistics
- **Interest Liability Report**: Projected interest liability on recurring deposits
- **Product Performance Report**: Comparative performance of different products
- **Trend Analysis**: Deposit and compliance trends over time

## API Guide

### GraphQL Schema

The Recurring Deposit functionality is exposed through GraphQL with the following main types:

#### Core Types
```graphql
# Recurring Deposit Product
type RecurringDepositProductResponse {
  id: String!
  name: String!
  shortName: String!
  description: String
  currency: Currency!
  minDepositTerm: Int!
  maxDepositTerm: Int
  minDepositTermType: EnumOption!
  maxDepositTermType: EnumOption
  # ... additional fields
}

# Recurring Deposit Account
type RecurringDepositAccountResponse {
  id: String!
  accountNo: String!
  externalId: String
  clientId: String
  clientName: String
  groupId: String
  groupName: String
  productId: String!
  productName: String!
  status: AccountStatus!
  timeline: Timeline!
  currency: Currency!
  # ... additional fields
  depositSchedule: [RecurringDepositSchedule!]
}

# Recurring Deposit Schedule
type RecurringDepositSchedule {
  id: String!
  accountId: String!
  dueDate: String!
  installmentNumber: Int!
  depositAmount: Float!
  depositCompletedOnDate: String
  depositCompletedAmount: Float
  isMissed: Boolean!
  isLate: Boolean!
}

# Installment Tracking
type InstallmentTrackingSummary {
  totalAccountsChecked: Int!
  accountsWithOverdueInstallments: Int!
  totalOverdueInstallments: Int!
  totalOverdueAmount: Float!
  totalPenaltiesApplied: Int!
  totalPenaltyAmount: Float!
  processedOn: String!
  accounts: [InstallmentTrackingResult!]!
}
```

### Queries

#### Get Recurring Deposit Product
Retrieves details of a specific recurring deposit product.

```graphql
query GetRecurringDepositProduct($productId: String!) {
  getRecurringDepositProduct(productId: $productId) {
    id
    name
    shortName
    description
    currency {
      code
      name
      decimalPlaces
    }
    # ... additional fields
  }
}
```

#### Get Recurring Deposit Products
Retrieves a list of all available recurring deposit products.

```graphql
query GetRecurringDepositProducts {
  getRecurringDepositProducts {
    products {
      id
      name
      shortName
      description
      # ... additional fields
    }
  }
}
```

#### Get Recurring Deposit Account
Retrieves details of a specific recurring deposit account.

```graphql
query GetRecurringDepositAccount($accountId: String!) {
  getRecurringDepositAccount(accountId: $accountId) {
    id
    accountNo
    clientId
    clientName
    status {
      id
      code
      value
    }
    # ... additional fields
    depositSchedule {
      id
      dueDate
      installmentNumber
      depositAmount
      depositCompletedOnDate
      isMissed
      isLate
    }
  }
}
```

#### Get Client Recurring Deposit Accounts
Retrieves all recurring deposit accounts for a specific client.

```graphql
query GetClientRecurringDepositAccounts($clientId: String!) {
  getClientRecurringDepositAccounts(clientId: $clientId) {
    accounts {
      id
      accountNo
      productName
      status {
        value
      }
      # ... additional fields
    }
  }
}
```

### Mutations

#### Create Recurring Deposit Product
Creates a new recurring deposit product.

```graphql
mutation CreateRecurringDepositProduct(
  $name: String!,
  $shortName: String!,
  $description: String,
  $currencyCode: String!,
  # ... additional parameters
) {
  createRecurringDepositProduct(
    name: $name,
    shortName: $shortName,
    description: $description,
    currencyCode: $currencyCode,
    # ... additional parameters
  ) {
    productId
  }
}
```

#### Create Recurring Deposit Account
Opens a new recurring deposit account.

```graphql
mutation CreateRecurringDepositAccount(
  $clientId: String,
  $groupId: String,
  $productId: String!,
  $submittedOnDate: String!,
  $depositAmount: Float!,
  $depositPeriod: Int!,
  $depositPeriodFrequencyType: String!,
  # ... additional parameters
) {
  createRecurringDepositAccount(
    clientId: $clientId,
    groupId: $groupId,
    productId: $productId,
    submittedOnDate: $submittedOnDate,
    depositAmount: $depositAmount,
    depositPeriod: $depositPeriod,
    depositPeriodFrequencyType: $depositPeriodFrequencyType,
    # ... additional parameters
  ) {
    accountId
  }
}
```

#### Make Recurring Deposit
Makes a deposit to a recurring deposit account.

```graphql
mutation MakeRecurringDeposit(
  $accountId: String!,
  $transactionDate: String!,
  $transactionAmount: Float!,
  $paymentTypeId: String,
  # ... additional parameters
) {
  makeRecurringDeposit(
    accountId: $accountId,
    transactionDate: $transactionDate,
    transactionAmount: $transactionAmount,
    paymentTypeId: $paymentTypeId,
    # ... additional parameters
  ) {
    accountId
    transactionId
    transactionDate
    transactionAmount
  }
}
```

#### Track Recurring Deposit Installments
Manually triggers the installment tracking process.

```graphql
mutation TrackRecurringDepositInstallments(
  $asOfDate: String,
  $applyPenalties: Boolean
) {
  trackRecurringDepositInstallments(
    asOfDate: $asOfDate,
    applyPenalties: $applyPenalties
  ) {
    totalAccountsChecked
    accountsWithOverdueInstallments
    totalOverdueInstallments
    totalOverdueAmount
    totalPenaltiesApplied
    totalPenaltyAmount
    processedOn
    accounts {
      accountId
      accountNo
      overdueInstallments
      totalOverdueAmount
      clientId
      clientName
      lastCheckedDate
      penaltyApplied
      penaltyAmount
    }
  }
}
```

### Request/Response Examples

#### Request: Create Recurring Deposit Product
```json
{
  "variables": {
    "name": "Monthly Savings Plus",
    "shortName": "MSP",
    "description": "A monthly recurring deposit with competitive interest rates",
    "currencyCode": "USD",
    "currencyDigits": 2,
    "minDepositTerm": 12,
    "maxDepositTerm": 60,
    "minDepositTermType": "months",
    "maxDepositTermType": "months",
    "isPrematureClosureAllowed": true,
    "preClosurePenalApplicable": true,
    "preClosurePenalInterest": 1.0,
    "preClosurePenalInterestOnType": "whole_term",
    "minDepositAmount": 50.0,
    "depositAmount": 100.0,
    "maxDepositAmount": 10000.0,
    "interestRate": 5.0,
    "interestCompoundingPeriodType": "monthly",
    "interestPostingPeriodType": "quarterly",
    "interestCalculationType": "daily_balance",
    "interestCalculationDaysInYearType": 365,
    "accountingRule": "cash_based",
    "mandatoryDepositAmount": 100.0,
    "depositPeriodFrequencyType": "months",
    "depositPeriodFrequency": 1
  },
  "query": "mutation CreateRecurringDepositProduct($name: String!, $shortName: String!, $description: String, $currencyCode: String!, $currencyDigits: Int, $minDepositTerm: Int!, $maxDepositTerm: Int, $minDepositTermType: String!, $maxDepositTermType: String, $isPrematureClosureAllowed: Boolean!, $preClosurePenalApplicable: Boolean!, $preClosurePenalInterest: Float, $preClosurePenalInterestOnType: String, $minDepositAmount: Float!, $depositAmount: Float!, $maxDepositAmount: Float, $interestRate: Float!, $interestCompoundingPeriodType: String!, $interestPostingPeriodType: String!, $interestCalculationType: String!, $interestCalculationDaysInYearType: Int!, $accountingRule: String!, $mandatoryDepositAmount: Float!, $depositPeriodFrequencyType: String!, $depositPeriodFrequency: Int!) { createRecurringDepositProduct(name: $name, shortName: $shortName, description: $description, currencyCode: $currencyCode, currencyDigits: $currencyDigits, minDepositTerm: $minDepositTerm, maxDepositTerm: $maxDepositTerm, minDepositTermType: $minDepositTermType, maxDepositTermType: $maxDepositTermType, isPrematureClosureAllowed: $isPrematureClosureAllowed, preClosurePenalApplicable: $preClosurePenalApplicable, preClosurePenalInterest: $preClosurePenalInterest, preClosurePenalInterestOnType: $preClosurePenalInterestOnType, minDepositAmount: $minDepositAmount, depositAmount: $depositAmount, maxDepositAmount: $maxDepositAmount, interestRate: $interestRate, interestCompoundingPeriodType: $interestCompoundingPeriodType, interestPostingPeriodType: $interestPostingPeriodType, interestCalculationType: $interestCalculationType, interestCalculationDaysInYearType: $interestCalculationDaysInYearType, accountingRule: $accountingRule, mandatoryDepositAmount: $mandatoryDepositAmount, depositPeriodFrequencyType: $depositPeriodFrequencyType, depositPeriodFrequency: $depositPeriodFrequency) { productId } }"
}
```

#### Response: Create Recurring Deposit Product
```json
{
  "data": {
    "createRecurringDepositProduct": {
      "productId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

#### Request: Create Recurring Deposit Account
```json
{
  "variables": {
    "clientId": "123e4567-e89b-12d3-a456-426614174001",
    "productId": "123e4567-e89b-12d3-a456-426614174000",
    "submittedOnDate": "2023-07-15",
    "depositAmount": 100.0,
    "depositPeriod": 12,
    "depositPeriodFrequencyType": "months",
    "mandatoryDepositAmount": 100.0,
    "depositPeriodFrequency": 1,
    "recurringFrequencyType": "months",
    "recurringFrequency": 1,
    "expectedFirstDepositOnDate": "2023-07-20"
  },
  "query": "mutation CreateRecurringDepositAccount($clientId: String!, $productId: String!, $submittedOnDate: String!, $depositAmount: Float!, $depositPeriod: Int!, $depositPeriodFrequencyType: String!, $mandatoryDepositAmount: Float!, $depositPeriodFrequency: Int!, $recurringFrequencyType: String!, $recurringFrequency: Int!, $expectedFirstDepositOnDate: String) { createRecurringDepositAccount(clientId: $clientId, productId: $productId, submittedOnDate: $submittedOnDate, depositAmount: $depositAmount, depositPeriod: $depositPeriod, depositPeriodFrequencyType: $depositPeriodFrequencyType, mandatoryDepositAmount: $mandatoryDepositAmount, depositPeriodFrequency: $depositPeriodFrequency, recurringFrequencyType: $recurringFrequencyType, recurringFrequency: $recurringFrequency, expectedFirstDepositOnDate: $expectedFirstDepositOnDate) { accountId } }"
}
```

#### Response: Create Recurring Deposit Account
```json
{
  "data": {
    "createRecurringDepositAccount": {
      "accountId": "123e4567-e89b-12d3-a456-426614174002"
    }
  }
}
```

## Technical Documentation

### Database Schema

The recurring deposit module uses the following tables to store data:

#### Main Tables
1. **recurring_deposit_product**: Defines recurring deposit product templates
   - Linked to `savings_product` for basic product properties
   - Stores deposit term requirements and premature closure rules
   - Contains recurring deposit specific configurations

2. **recurring_deposit_interest_rate_chart**: Interest rate definitions for products
   - Linked to `recurring_deposit_product`
   - Contains effective date ranges for interest rates
   - Can be configured with primary grouping by amount or term

3. **recurring_deposit_interest_rate_slab**: Specific interest rate tiers
   - Linked to `recurring_deposit_interest_rate_chart`
   - Defines interest rates based on term and/or amount
   - Supports currency-specific interest rates

4. **recurring_deposit_account**: Core account information
   - Linked to `savings_account` for basic account properties
   - Stores deposit term, maturity information, and interest rates
   - Contains account-specific premature closure rules

5. **recurring_deposit_account_recurring_detail**: Account recurring parameters
   - Linked to `recurring_deposit_account`
   - Stores deposit frequency, amount requirements
   - Tracks overdue installment statistics

6. **recurring_deposit_schedule_installment**: Individual deposit schedule entries
   - Linked to `recurring_deposit_account`
   - Tracks due dates, installment status, and completion information
   - Records late payment and advance payment details

7. **recurring_deposit_transaction**: Financial transactions
   - Linked to `savings_account_transaction` for basic transaction properties
   - Records transaction type, installment mapping, and balance impact
   - Supports transaction reversal

8. **recurring_deposit_account_charge**: Account charges
   - Linked to `savings_account_charge` for basic charge properties
   - Associates charges with recurring deposit accounts

#### Relationships
```
recurring_deposit_product
  ↓ 1:n
recurring_deposit_interest_rate_chart
  ↓ 1:n
recurring_deposit_interest_rate_slab

recurring_deposit_product
  ↓ 1:n
recurring_deposit_account
  ↓ 1:1
recurring_deposit_account_recurring_detail
  ↓ 1:n
recurring_deposit_schedule_installment

recurring_deposit_account
  ↓ 1:n
recurring_deposit_transaction

recurring_deposit_account
  ↓ 1:n
recurring_deposit_account_charge
```

### Job Configuration

The installment tracking job is implemented as a scheduled job that runs automatically to track installment due dates, update overdue information, and apply penalties.

#### Job Implementation
The job is implemented in TypeScript with the following components:

1. **RecurringDepositInstallmentTrackingJobWorker**: Processes the job
   - Handles parameters like asOfDate, applyPenalties, and sendNotifications
   - Calls the API to track installments
   - Processes notifications based on tracking results
   - Generates execution reports

2. **createRecurringDepositInstallmentTrackingJob**: Creates the job in the system
   - Checks for existing job and updates if found
   - Loads configuration from job_config table
   - Sets default values for unspecified parameters
   - Schedules the job to run daily

#### Configuration Parameters
The job supports the following parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `applyPenalties` | Whether to apply penalties for overdue installments | `true` |
| `sendNotifications` | Whether to send notifications about overdue installments | `true` |
| `trackOverdueOnly` | Whether to track only overdue installments | `false` |
| `testMode` | Run in test mode without applying penalties | `false` |
| `asOfDate` | Specific date to use for tracking (YYYY-MM-DD) | Current date |

#### Scheduling
The job is scheduled using a cron expression, with a default of `0 3 * * *` (daily at 3 AM). This can be configured in the `job_config` table.

### Penalty Calculation

Penalties for missed installments are calculated using a configurable algorithm.

#### Penalty Types
1. **Fixed Amount**: A flat fee applied for each missed installment
   ```
   penalty_amount = configured_penalty_amount
   ```

2. **Percentage-Based**: A percentage of the missed deposit amount
   ```
   penalty_amount = installment_amount * (penalty_percentage / 100)
   ```

#### Penalty Application Rules
1. **Grace Period**: Penalties are only applied after the configured grace period:
   ```
   apply_penalty = (current_date - due_date) > grace_period_days
   ```

2. **Maximum Penalties**: Each installment can only receive a limited number of penalties:
   ```
   can_apply_penalty = penalties_applied < max_penalties_per_installment
   ```

3. **Penalty Frequency**: Controls how often penalties can be applied:
   - One-time: Only one penalty per installment
   - Daily: Penalty can be applied every day after grace period
   - Weekly: Penalty can be applied once per week
   - Monthly: Penalty can be applied once per month

#### Charge Creation
When a penalty is calculated, it's recorded as a charge on the account:
1. Create a charge of type "Penalty Fee"
2. Set the amount based on the calculation
3. Link it to the recurring deposit account
4. Apply the charge immediately (deduct from future deposits)

### Integration Points

The Recurring Deposit module integrates with several other modules in the system:

#### Client Domain
- Links accounts to client or group profiles
- Pulls client contact information for notifications
- Updates client portfolio information

#### Savings Domain
- Shares core account properties through the underlying savings_account table
- Facilitates transfers between recurring deposit and savings accounts
- Supports maturity fund transfers to savings accounts

#### Accounting Domain
- Generates journal entries for all financial transactions
- Maps product and account configurations to GL accounts
- Provides accounting reports for recurring deposit portfolios

#### Notification System
- Sends reminders for upcoming deposits
- Alerts clients about missed installments
- Notifies staff about accounts with compliance issues
- Alerts management about penalty applications

#### Reporting System
- Provides data for portfolio analysis
- Generates compliance reports
- Supports regulatory reporting
- Produces financial reports on interest accrual and liability

## Administrative Guide

### Configuration Options

#### Product Configuration
Administrators can configure recurring deposit products with the following options:

1. **Basic Configuration**:
   - Name, description, and currency
   - Deposit term requirements (min/max terms)
   - Interest calculation method
   - Accounting treatment

2. **Deposit Requirements**:
   - Minimum and maximum deposit amounts
   - Mandatory deposit amount
   - Deposit frequency
   - Advance payment handling

3. **Interest Rates**:
   - Base interest rate
   - Tiered rates based on amount or term
   - Effective date ranges for interest rates
   - Interest compounding and posting frequency

4. **Penalties and Charges**:
   - Premature closure penalties
   - Missed payment penalties
   - Service charges and fees
   - Penalty calculation method

#### System Configuration
System administrators can configure the recurring deposit module with:

1. **Installment Tracking**:
   - Job schedule (when tracking should run)
   - Penalty application rules
   - Grace period length
   - Maximum penalties per installment

2. **Notification System**:
   - Notification templates
   - Delivery channels (email, SMS, in-app)
   - Notification frequency
   - Staff alert thresholds

3. **Processing Options**:
   - Batch size for processing
   - Concurrency limits
   - Timeout settings
   - Retry behavior

4. **Reporting**:
   - Report generation schedule
   - Default report parameters
   - Export formats
   - Distribution lists

### Monitoring Jobs

Administrators should regularly monitor the installment tracking job to ensure it's running correctly.

#### Monitoring Tools
1. **Job Execution History**:
   - Available in the `job_execution` table
   - Shows last run time, duration, and status
   - Records errors and warnings
   - Provides execution metrics

2. **Admin Dashboard**:
   - Visual indicators of job health
   - Trend graphs of execution time
   - Error rate monitoring
   - Execution success rate

3. **System Logs**:
   - Detailed logs of job execution
   - Error messages and stack traces
   - Performance metrics
   - Resource usage information

#### Key Metrics to Monitor
1. **Execution Success Rate**: Percentage of successful job runs
2. **Processing Time**: Time taken to complete the job
3. **Accounts Processed**: Number of accounts checked
4. **Overdue Accounts**: Number of accounts with overdue installments
5. **Penalties Applied**: Number and amount of penalties applied
6. **Notifications Sent**: Number of notifications sent
7. **Error Rate**: Percentage of executions with errors

#### Alert Configuration
Set up alerts for:
1. **Job Failures**: When the job fails to run or complete
2. **Extended Execution Time**: When the job takes longer than expected
3. **High Overdue Rate**: When the percentage of overdue accounts exceeds a threshold
4. **Error Spikes**: When the error rate increases significantly
5. **Missed Executions**: When the job doesn't run on schedule

### Troubleshooting

#### Common Issues and Solutions

1. **Job Not Running**
   - **Symptom**: The installment tracking job doesn't run at the scheduled time
   - **Causes**:
     - Job disabled in `job_config`
     - Invalid cron expression
     - Scheduling service failure
   - **Solutions**:
     - Check job status in `job` table
     - Verify cron expression in job configuration
     - Restart scheduling service
     - Manually run the job to test

2. **Penalties Not Applied**
   - **Symptom**: Overdue installments identified but no penalties applied
   - **Causes**:
     - `applyPenalties` parameter set to false
     - Grace period not expired
     - Maximum penalties per installment reached
     - Penalty configuration missing
   - **Solutions**:
     - Check job parameters in `job` table
     - Verify grace period configuration
     - Check existing penalties on the account
     - Ensure penalty configuration exists

3. **Notifications Not Sent**
   - **Symptom**: Overdue installments tracked but no notifications sent
   - **Causes**:
     - `sendNotifications` parameter set to false
     - Notification templates missing
     - Notification service unavailable
     - Client contact information missing
   - **Solutions**:
     - Check job parameters
     - Verify notification templates exist
     - Test notification service connectivity
     - Update client contact information

4. **Performance Issues**
   - **Symptom**: Job takes too long to complete
   - **Causes**:
     - Too many accounts to process
     - Database performance issues
     - Resource constraints
     - Inefficient query execution
   - **Solutions**:
     - Adjust batch size in configuration
     - Optimize database indexes
     - Allocate more resources to the service
     - Analyze and optimize queries

5. **Data Inconsistencies**
   - **Symptom**: Account statistics don't match actual installment status
   - **Causes**:
     - Failed job runs
     - Partial processing
     - Manual transaction adjustments
     - Database corruption
   - **Solutions**:
     - Run reconciliation procedure
     - Manually update account statistics
     - Investigate transaction history
     - Validate installment schedule integrity

#### Diagnostic Tools
1. **Job Execution Logs**: Review detailed logs of job execution
2. **Database Queries**: Use direct queries to check data consistency
3. **Manual Job Execution**: Run job manually with different parameters
4. **Service Status Check**: Verify all related services are operational

#### Recovery Procedures
1. **Manual Job Execution**: Run the job manually to catch up on missed executions
2. **Data Correction Scripts**: Run scripts to fix data inconsistencies
3. **Reset Job State**: Clear job state and restart if stuck
4. **Service Restart**: Restart related services if needed

## Appendix

### Glossary

- **Recurring Deposit**: A deposit account where the customer deposits a fixed amount at regular intervals for a specified period, earning interest on the cumulative balance.
- **Installment**: A scheduled deposit amount due at a specific date.
- **Maturity**: The point when the deposit term ends and the account reaches its full value.
- **Premature Closure**: Closing an account before the agreed maturity date.
- **Interest Rate Chart**: A configuration that defines interest rates based on amount tiers, terms, and effective dates.
- **Penalty**: A charge applied for not meeting the terms of the deposit, such as missing installments or early closure.
- **Grace Period**: The period after a due date during which a deposit can be made without penalties.
- **Overdue Installment**: An installment that remains unpaid after its due date.

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| RD001 | Invalid recurring deposit product | Verify product configuration |
| RD002 | Invalid deposit amount | Ensure amount is within allowed range |
| RD003 | Invalid deposit term | Ensure term is within allowed range |
| RD004 | Invalid deposit frequency | Verify frequency configuration |
| RD005 | Account not found | Check account ID |
| RD006 | Transaction amount too small | Ensure amount meets minimum requirement |
| RD007 | Transaction date invalid | Verify transaction date is valid |
| RD008 | Premature closure not allowed | Check product configuration for premature closure |
| RD009 | Installment tracking job failed | Check job logs for details |
| RD010 | Notification sending failed | Verify notification service is operational |