# Schema Overview

The Fineract GraphQL API schema is organized around core banking entities and their relationships. This document provides a high-level overview of the key types and their relationships.

## Core Types

The schema defines several core types that represent the main entities in the Fineract system:

### Client

Represents individual customers in the system.

```graphql
type ClientDetail {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  # ...other fields
  identifiers: [ClientIdentifier!]!
  addresses: [ClientAddress!]!
  familyMembers: [ClientFamilyMember!]!
  notes: [ClientNote!]!
  documents: [ClientDocument!]!
}
```

### Group

Represents collections of clients that are managed together.

```graphql
type GroupDetail {
  id: String!
  name: String!
  externalId: String
  status: String!
  # ...other fields
  clients: [ClientSummary!]!
  loans: [LoanAccount!]!
  notes: [GroupNote!]!
}
```

### Loan

Represents loan accounts and applications.

```graphql
type LoanAccount {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  productName: String!
  loanType: String!
  principalAmount: Float!
  # ...other fields
  disbursedDate: String
  expectedMaturityDate: String
  totalOutstanding: Float
}
```

### Savings

Represents savings accounts.

```graphql
type SavingsAccount {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  productName: String!
  accountType: String!
  currencyCode: String!
  accountBalance: Float!
  # ...other fields
}
```

### Fixed Deposit

Represents fixed deposit accounts.

```graphql
type FixedDepositAccount {
  id: String!
  accountNo: String!
  status: String!
  depositAmount: Float!
  maturityAmount: Float!
  interestRate: Float!
  depositPeriod: Int!
  depositPeriodFrequency: String!
  # ...other fields
}
```

### Recurring Deposit

Represents recurring deposit accounts.

```graphql
type RecurringDepositAccount {
  id: String!
  accountNo: String!
  status: String!
  depositAmount: Float!
  interestRate: Float!
  depositPeriod: Int!
  depositPeriodFrequency: String!
  recurringDepositFrequency: Int!
  recurringDepositFrequencyType: String!
  # ...other fields
}
```

### Share Account

Represents share accounts.

```graphql
type ShareAccount {
  id: String!
  accountNo: String!
  status: String!
  productId: String!
  productName: String!
  totalApprovedShares: Int!
  totalPendingShares: Int!
  unitPrice: Float!
  # ...other fields
}
```

## Root Types

The GraphQL schema has two root types that serve as entry points for all operations:

### Query

The `Query` type contains all operations that retrieve data but don't change it:

```graphql
type Query {
  # Client queries
  client_list(input: ClientListInput!): ClientListResponse!
  client_get(input: ClientGetInput!): ClientDetail!
  client_accounts(input: ClientAccountsInput!): ClientAccountsSummary!
  
  # Loan queries
  loan_list(input: LoanListInput!): LoanListResponse!
  loan_get(input: LoanGetInput!): LoanDetail!
  
  # Savings queries
  savings_list(input: SavingsListInput!): SavingsListResponse!
  savings_get(input: SavingsGetInput!): SavingsDetail!
  
  # ... other queries
}
```

### Mutation

The `Mutation` type contains all operations that change data:

```graphql
type Mutation {
  # Authentication
  auth_login(input: LoginInput!): AuthResponse!
  auth_refresh_token(input: RefreshTokenInput!): TokenRefreshResponse!
  
  # Client mutations
  client_create(input: ClientCreateInput!): ClientActionResponse!
  client_update(input: ClientUpdateInput!): ClientActionResponse!
  
  # Loan mutations
  loan_create(input: LoanCreateInput!): LoanActionResponse!
  loan_approve(input: LoanApproveInput!): LoanActionResponse!
  loan_disburse(input: LoanDisburseInput!): LoanActionResponse!
  
  # ... other mutations
}
```

## Common Patterns

### Input Types

All operations use input types to structure their parameters:

```graphql
input ClientListInput {
  officeId: String!
  status: String
  name: String
  externalId: String
  limit: Int
  offset: Int
  orderBy: String
  sortOrder: String
}
```

### Response Types

Most query responses follow a consistent pattern with pagination support:

```graphql
type ClientListResponse {
  totalCount: Int!
  clients: [ClientSummary!]!
}
```

### Action Response Pattern

Actions that modify data return a standardized response format:

```graphql
type ClientActionResponse {
  resourceId: String!
  officeId: String!
  clientId: String!
  resourceIdentifier: String
  changes: JSON
}
```

## Custom Scalars

The schema defines several custom scalar types:

- `JSON`: Represents arbitrary JSON data
- `Date`: Represents dates in ISO 8601 format (YYYY-MM-DD)
- `DateTime`: Represents date-time values in ISO 8601 format
- `Decimal`: Represents precise decimal numbers for financial calculations

## Enumerations

The schema includes various enumerations for structured choices:

- `LoanStatus`: Pending, Approved, Active, Closed, etc.
- `SavingsStatus`: Active, Closed, Dormant, etc.
- `ClientStatus`: Pending, Active, Closed, Rejected, etc.
- `Gender`: Male, Female, Other
- `LoanTermFrequencyType`: Days, Weeks, Months, Years
- `RepaymentFrequencyType`: Daily, Weekly, Monthly, etc.

## Interfaces

The schema uses interfaces to define common behavior:

```graphql
interface Account {
  id: String!
  accountNo: String!
  status: String!
}

type LoanAccount implements Account {
  id: String!
  accountNo: String!
  status: String!
  # ...loan specific fields
}

type SavingsAccount implements Account {
  id: String!
  accountNo: String!
  status: String!
  # ...savings specific fields
}
```

## Relationships

Entity relationships are represented through object fields:

```graphql
type Client {
  id: String!
  # ...other fields
  loans: [LoanAccount!]!
  savingsAccounts: [SavingsAccount!]!
  group: Group
}
```

## Schema Extensions

The schema can be extended with custom types and fields specific to your implementation. See [Extending the Schema](./advanced/extending-schema.md) for more information.