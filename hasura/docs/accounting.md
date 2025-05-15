# Accounting Module Documentation

The Accounting Module provides comprehensive general ledger and accounting functionality for the Fineract system. This module is essential for financial tracking, reporting, and compliance with accounting standards.

## Key Features

- Chart of Accounts Management
- Journal Entry Processing
- Accounting Closures
- Accounting Rules
- Payment Type Management
- Financial Reporting

## Domain Model

The Accounting module is built around these primary entities:

### GL Account

GL Accounts (General Ledger Accounts) form the foundation of the chart of accounts. They can be of different types:

- **ASSET**: Resources owned or controlled by the organization
- **LIABILITY**: Obligations or debts owed by the organization
- **EQUITY**: Residual interest in the assets after deducting liabilities
- **INCOME**: Revenue or income earned by the organization
- **EXPENSE**: Costs incurred by the organization

GL Accounts can be organized hierarchically with:
- **HEADER** accounts: Used for grouping and organization
- **DETAIL** accounts: Used for actual transactions

### GL Closure

Represents the closing of books for a specific period. Once a period is closed:
- No further entries can be posted to that period
- Ensures financial data for closed periods remains consistent

### Accounting Rule

Predefined rules that determine how certain transactions should be recorded:
- **FIXED**: Automatically applies specific debits and credits
- **MANUAL**: Guides manual entry of transactions with predefined accounts

### Payment Type

Defines different methods of payment supported by the system:
- Cash payments
- Bank transfers
- Mobile payments
- Other electronic payment methods

### Journal Entry

Records individual financial transactions using double-entry accounting principles:
- Each entry affects at least two accounts
- Total debits must equal total credits
- Journal entries may be reversed with proper audit trail

## API Reference

### GL Account Operations

#### Create GL Account
- **Endpoint**: `/api/accounting/gl-account/create`
- **Method**: POST
- **Description**: Creates a new GL account in the chart of accounts
- **Required Permissions**: admin

#### Update GL Account
- **Endpoint**: `/api/accounting/gl-account/update`
- **Method**: POST
- **Description**: Updates an existing GL account
- **Required Permissions**: admin

#### Delete GL Account
- **Endpoint**: `/api/accounting/gl-account/delete`
- **Method**: POST
- **Description**: Deletes a GL account (only if unused in transactions)
- **Required Permissions**: admin

#### Get GL Account
- **Endpoint**: `/api/accounting/gl-account/get`
- **Method**: POST
- **Description**: Retrieves a specific GL account by ID
- **Required Permissions**: admin, user

#### Get GL Accounts
- **Endpoint**: `/api/accounting/gl-accounts`
- **Method**: POST
- **Description**: Retrieves a list of GL accounts with optional filtering
- **Required Permissions**: admin, user

#### Get GL Accounts Tree
- **Endpoint**: `/api/accounting/gl-accounts-tree`
- **Method**: POST
- **Description**: Retrieves GL accounts in a hierarchical tree structure
- **Required Permissions**: admin, user

### GL Closure Operations

#### Create GL Closure
- **Endpoint**: `/api/accounting/gl-closure/create`
- **Method**: POST
- **Description**: Creates a new accounting period closure
- **Required Permissions**: admin

#### Delete GL Closure
- **Endpoint**: `/api/accounting/gl-closure/delete`
- **Method**: POST
- **Description**: Deletes an accounting period closure (only if it's the most recent)
- **Required Permissions**: admin

#### Get GL Closure
- **Endpoint**: `/api/accounting/gl-closure/get`
- **Method**: POST
- **Description**: Retrieves a specific accounting closure by ID
- **Required Permissions**: admin, user

#### Get GL Closures
- **Endpoint**: `/api/accounting/gl-closures`
- **Method**: POST
- **Description**: Retrieves a list of accounting closures with optional filtering by office
- **Required Permissions**: admin, user

### Accounting Rule Operations

#### Create Accounting Rule
- **Endpoint**: `/api/accounting/rule/create`
- **Method**: POST
- **Description**: Creates a new accounting rule
- **Required Permissions**: admin

#### Update Accounting Rule
- **Endpoint**: `/api/accounting/rule/update`
- **Method**: POST
- **Description**: Updates an existing accounting rule
- **Required Permissions**: admin

#### Delete Accounting Rule
- **Endpoint**: `/api/accounting/rule/delete`
- **Method**: POST
- **Description**: Deletes an accounting rule
- **Required Permissions**: admin

#### Get Accounting Rule
- **Endpoint**: `/api/accounting/rule/get`
- **Method**: POST
- **Description**: Retrieves a specific accounting rule by ID
- **Required Permissions**: admin, user

#### Get Accounting Rules
- **Endpoint**: `/api/accounting/rules`
- **Method**: POST
- **Description**: Retrieves all accounting rules
- **Required Permissions**: admin, user

### Payment Type Operations

#### Create Payment Type
- **Endpoint**: `/api/accounting/payment-type/create`
- **Method**: POST
- **Description**: Creates a new payment type
- **Required Permissions**: admin

#### Update Payment Type
- **Endpoint**: `/api/accounting/payment-type/update`
- **Method**: POST
- **Description**: Updates an existing payment type
- **Required Permissions**: admin

#### Delete Payment Type
- **Endpoint**: `/api/accounting/payment-type/delete`
- **Method**: POST
- **Description**: Deletes a payment type
- **Required Permissions**: admin

#### Get Payment Type
- **Endpoint**: `/api/accounting/payment-type/get`
- **Method**: POST
- **Description**: Retrieves a specific payment type by ID
- **Required Permissions**: admin, user

#### Get Payment Types
- **Endpoint**: `/api/accounting/payment-types`
- **Method**: POST
- **Description**: Retrieves all payment types with optional filtering
- **Required Permissions**: admin, user

### Template Operations

#### Get Accounting Template
- **Endpoint**: `/api/accounting/template`
- **Method**: POST
- **Description**: Retrieves accounting template data for UI forms
- **Required Permissions**: admin, user

## Integration with Other Modules

The Accounting module integrates with several other modules in the system:

### Loan Module
- Auto-generation of journal entries for loan disbursements
- Auto-generation of journal entries for loan repayments
- Auto-generation of journal entries for loan write-offs and recoveries

### Savings Module
- Auto-generation of journal entries for deposits
- Auto-generation of journal entries for withdrawals
- Auto-generation of journal entries for interest postings

### Share Module
- Auto-generation of journal entries for share purchases
- Auto-generation of journal entries for share redemptions
- Auto-generation of journal entries for dividend payments

## Technical Implementation

The Accounting module follows a layered architecture:

1. **Database Schema**: Tables in PostgreSQL for storing accounting data
2. **Models Layer**: TypeScript interfaces defining accounting entities
3. **Service Layer**: Business logic for accounting operations
4. **API Handlers**: Express.js handlers for HTTP requests
5. **GraphQL Integration**: Hasura actions connecting GraphQL to API handlers

## Best Practices

1. **Double-Entry Accounting**: Ensure that for every transaction, debits and credits are equal
2. **Period Closure**: Regularly close accounting periods to prevent retroactive changes
3. **Audit Trail**: Every accounting transaction should maintain proper audit trail
4. **Reconciliation**: Regularly reconcile accounts to ensure data integrity
5. **Access Control**: Restrict accounting operations to authorized personnel

## Common Operations Examples

### Creating a GL Account

```graphql
mutation CreateAssetAccount {
  createGLAccount(input: {
    name: "Cash on Hand",
    glCode: "10001",
    type: ASSET,
    usage: DETAIL,
    manualEntriesAllowed: true
  }) {
    success
    accountId
    message
  }
}
```

### Retrieving the Chart of Accounts as a Tree

```graphql
query GetChartOfAccounts {
  getGLAccountsTree {
    success
    glAccountsTree {
      id
      name
      glCode
      type
      usage
      children {
        id
        name
        glCode
        type
        usage
      }
    }
  }
}
```

### Creating a GL Closure

```graphql
mutation CloseAccountingPeriod {
  createGLClosure(input: {
    officeId: "1",
    closingDate: "2023-06-30",
    comments: "End of Q2 2023"
  }) {
    success
    closureId
    message
  }
}
```

### Creating an Accounting Rule

```graphql
mutation CreateAccountingRule {
  createAccountingRule(input: {
    name: "Office Expense Rule",
    officeId: "1",
    ruleType: FIXED,
    debitAccountId: "1001", # Office Expenses
    creditAccountId: "2001" # Cash Account
  }) {
    success
    ruleId
    message
  }
}
```

## Error Handling

All API endpoints in the Accounting module follow a consistent error handling approach:

- HTTP Status Code 400 for validation and business logic errors
- Detailed error messages to help diagnose issues
- Logging of errors with appropriate context

## Future Enhancements

Planned enhancements for the Accounting module include:

1. Financial statement generation (Balance Sheet, Income Statement, Cash Flow)
2. Tax reporting integration
3. Advanced financial analysis dashboards
4. Multi-currency support
5. Budget tracking and variance analysis

## References

- [International Financial Reporting Standards (IFRS)](https://www.ifrs.org/)
- [Generally Accepted Accounting Principles (GAAP)](https://www.fasb.org/)