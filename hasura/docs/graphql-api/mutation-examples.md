# Mutation Examples

This document provides examples of common mutations you can perform using the Fineract GraphQL API. These examples demonstrate how to create, update, and manage various banking entities.

## Authentication Mutations

### Login

```graphql
mutation Login {
  auth_login(input: {
    username: "admin",
    password: "password123"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      username
      roles
    }
  }
}
```

### Refresh Token

```graphql
mutation RefreshToken {
  auth_refresh_token(input: {
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }) {
    accessToken
    refreshToken
    expiresIn
  }
}
```

### Change Password

```graphql
mutation ChangePassword {
  auth_change_password(input: {
    oldPassword: "oldpassword123",
    newPassword: "newpassword456"
  }) {
    success
    message
  }
}
```

## Client Mutations

### Create Client

```graphql
mutation CreateClient {
  client_create(input: {
    officeId: "1",
    firstname: "John",
    lastname: "Doe",
    mobileNo: "+1234567890",
    emailAddress: "johndoe@example.com",
    externalId: "EXT123",
    dateOfBirth: "1990-01-15",
    gender: "Male",
    active: false,
    submittedDate: "2023-05-01"
  }) {
    resourceId
    clientId
    resourceIdentifier
    changes
  }
}
```

### Update Client

```graphql
mutation UpdateClient {
  client_update(input: {
    id: "123",
    firstname: "John",
    lastname: "Smith",
    mobileNo: "+1234567890",
    emailAddress: "johnsmith@example.com"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### Activate Client

```graphql
mutation ActivateClient {
  client_activate(input: {
    id: "123",
    activationDate: "2023-05-10"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### Add Client Identifier

```graphql
mutation AddClientIdentifier {
  client_add_identifier(input: {
    clientId: "123",
    documentTypeId: "1",
    documentKey: "SSN1234567890",
    description: "Social Security Number"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### Add Client Address

```graphql
mutation AddClientAddress {
  client_add_address(input: {
    clientId: "123",
    addressType: "HOME",
    addressLine1: "123 Main St",
    addressLine2: "Apt 4B",
    city: "Springfield",
    stateProvince: "IL",
    country: "USA",
    postalCode: "62701",
    isActive: true
  }) {
    resourceId
    clientId
    changes
  }
}
```

### Add Family Member

```graphql
mutation AddFamilyMember {
  client_add_family_member(input: {
    clientId: "123",
    firstname: "Jane",
    lastname: "Doe",
    relationshipId: "1",
    gender: "Female",
    dateOfBirth: "1995-03-20",
    isDependent: true
  }) {
    resourceId
    clientId
    changes
  }
}
```

### Close Client

```graphql
mutation CloseClient {
  client_close(input: {
    id: "123",
    closureDate: "2023-12-31",
    closureReasonId: "2"
  }) {
    resourceId
    clientId
    changes
  }
}
```

## Loan Mutations

### Create Loan Application

```graphql
mutation CreateLoanApplication {
  loan_create(input: {
    clientId: "123",
    productId: "1",
    loanOfficerId: "5",
    submittedDate: "2023-05-15",
    expectedDisbursementDate: "2023-06-01",
    loanPurposeId: "12",
    principal: 5000,
    loanTermFrequency: 12,
    loanTermFrequencyType: "MONTHS",
    numberOfRepayments: 12,
    repaymentEvery: 1,
    repaymentFrequencyType: "MONTHS",
    interestRatePerPeriod: 10,
    interestType: "FLAT",
    amortizationType: "EQUAL_INSTALLMENTS",
    transactionProcessingStrategyId: "1"
  }) {
    resourceId
    officeId
    clientId
    loanId
    changes
  }
}
```

### Approve Loan

```graphql
mutation ApproveLoan {
  loan_approve(input: {
    id: "456",
    approvedOnDate: "2023-05-20",
    approvedLoanAmount: 5000,
    expectedDisbursementDate: "2023-06-01",
    note: "Loan approved based on good credit history"
  }) {
    resourceId
    loanId
    changes
  }
}
```

### Disburse Loan

```graphql
mutation DisburseLoan {
  loan_disburse(input: {
    id: "456",
    actualDisbursementDate: "2023-06-01",
    transactionAmount: 5000,
    paymentTypeId: "1",
    note: "Loan disbursed to client's account"
  }) {
    resourceId
    loanId
    changes
  }
}
```

### Add Loan Charge

```graphql
mutation AddLoanCharge {
  loan_add_charge(input: {
    loanId: "456",
    chargeId: "10",
    amount: 50,
    dueDate: "2023-07-01"
  }) {
    resourceId
    loanId
    changes
  }
}
```

### Make Loan Repayment

```graphql
mutation MakeLoanRepayment {
  loan_repayment(input: {
    loanId: "456",
    transactionDate: "2023-07-01",
    transactionAmount: 458.33,
    paymentTypeId: "1",
    note: "Monthly repayment"
  }) {
    resourceId
    loanId
    changes
  }
}
```

### Waive Interest

```graphql
mutation WaiveInterest {
  loan_waive_interest(input: {
    loanId: "456",
    transactionDate: "2023-07-01",
    transactionAmount: 41.67,
    note: "Interest waived due to hardship"
  }) {
    resourceId
    loanId
    changes
  }
}
```

### Write Off Loan

```graphql
mutation WriteOffLoan {
  loan_write_off(input: {
    loanId: "456",
    transactionDate: "2023-12-01",
    note: "Loan written off due to default"
  }) {
    resourceId
    loanId
    changes
  }
}
```

## Savings Mutations

### Create Savings Account

```graphql
mutation CreateSavingsAccount {
  savings_create(input: {
    clientId: "123",
    productId: "3",
    submittedDate: "2023-05-15",
    nominalAnnualInterestRate: 4.5,
    interestCompoundingPeriodType: "DAILY",
    interestPostingPeriodType: "MONTHLY",
    interestCalculationType: "DAILY_BALANCE",
    interestCalculationDaysInYearType: "365",
    allowOverdraft: false,
    enforceMinRequiredBalance: false
  }) {
    resourceId
    officeId
    clientId
    savingsId
    changes
  }
}
```

### Approve Savings Account

```graphql
mutation ApproveSavingsAccount {
  savings_approve(input: {
    id: "789",
    approvedOnDate: "2023-05-20",
    note: "Savings account approved"
  }) {
    resourceId
    savingsId
    changes
  }
}
```

### Activate Savings Account

```graphql
mutation ActivateSavingsAccount {
  savings_activate(input: {
    id: "789",
    activatedOnDate: "2023-05-25"
  }) {
    resourceId
    savingsId
    changes
  }
}
```

### Deposit to Savings

```graphql
mutation DepositToSavings {
  savings_deposit(input: {
    savingsId: "789",
    transactionDate: "2023-06-01",
    transactionAmount: 1000,
    paymentTypeId: "1",
    note: "Initial deposit"
  }) {
    resourceId
    savingsId
    changes
  }
}
```

### Withdraw from Savings

```graphql
mutation WithdrawFromSavings {
  savings_withdrawal(input: {
    savingsId: "789",
    transactionDate: "2023-07-15",
    transactionAmount: 250,
    paymentTypeId: "1",
    note: "Withdrawal for expenses"
  }) {
    resourceId
    savingsId
    changes
  }
}
```

### Add Standing Instruction

```graphql
mutation AddStandingInstruction {
  savings_add_standing_instruction(input: {
    fromAccountId: "789",
    fromAccountType: "SAVINGS",
    toAccountId: "456",
    toAccountType: "LOAN",
    name: "Automatic loan payment",
    transferAmount: 458.33,
    validFrom: "2023-07-01",
    validTill: "2024-06-30",
    priority: 1,
    recurrenceType: "PERIODIC",
    recurrenceFrequency: "MONTHLY",
    recurrenceInterval: 1,
    recurrenceOnDay: 1
  }) {
    resourceId
    savingsId
    instructionId
  }
}
```

## Fixed Deposit Mutations

### Create Fixed Deposit Account

```graphql
mutation CreateFixedDepositAccount {
  fixed_deposit_create(input: {
    clientId: "123",
    productId: "5",
    submittedDate: "2023-05-15",
    depositAmount: 10000,
    depositPeriod: 12,
    depositPeriodFrequencyType: "MONTHS",
    interestCompoundingPeriodType: "DAILY",
    interestPostingPeriodType: "MATURITY",
    interestCalculationType: "DAILY_BALANCE",
    interestCalculationDaysInYearType: "365"
  }) {
    resourceId
    officeId
    clientId
    accountId
    changes
  }
}
```

### Approve Fixed Deposit

```graphql
mutation ApproveFixedDeposit {
  fixed_deposit_approve(input: {
    id: "890",
    approvedOnDate: "2023-05-20",
    note: "Fixed deposit approved"
  }) {
    resourceId
    accountId
    changes
  }
}
```

### Activate Fixed Deposit

```graphql
mutation ActivateFixedDeposit {
  fixed_deposit_activate(input: {
    id: "890",
    activatedOnDate: "2023-05-25"
  }) {
    resourceId
    accountId
    changes
  }
}
```

### Premature Close Fixed Deposit

```graphql
mutation PrematureCloseFixedDeposit {
  fixed_deposit_premature_close(input: {
    id: "890",
    closedOnDate: "2023-08-15",
    note: "Premature closure due to emergency need",
    transferToSavingsId: "789"
  }) {
    resourceId
    accountId
    changes
  }
}
```

## Recurring Deposit Mutations

### Create Recurring Deposit Account

```graphql
mutation CreateRecurringDepositAccount {
  recurring_deposit_create(input: {
    clientId: "123",
    productId: "6",
    submittedDate: "2023-05-15",
    depositAmount: 500,
    depositPeriod: 12,
    depositPeriodFrequencyType: "MONTHS",
    recurringDepositFrequency: 1,
    recurringDepositFrequencyType: "MONTHS",
    expectedFirstDepositDate: "2023-06-01",
    interestCompoundingPeriodType: "DAILY",
    interestPostingPeriodType: "MONTHLY",
    interestCalculationType: "DAILY_BALANCE",
    interestCalculationDaysInYearType: "365"
  }) {
    resourceId
    officeId
    clientId
    accountId
    changes
  }
}
```

### Approve Recurring Deposit

```graphql
mutation ApproveRecurringDeposit {
  recurring_deposit_approve(input: {
    id: "901",
    approvedOnDate: "2023-05-20",
    note: "Recurring deposit approved"
  }) {
    resourceId
    accountId
    changes
  }
}
```

### Activate Recurring Deposit

```graphql
mutation ActivateRecurringDeposit {
  recurring_deposit_activate(input: {
    id: "901",
    activatedOnDate: "2023-05-25"
  }) {
    resourceId
    accountId
    changes
  }
}
```

### Make Recurring Deposit

```graphql
mutation MakeRecurringDeposit {
  recurring_deposit_transaction(input: {
    accountId: "901",
    transactionDate: "2023-06-01",
    transactionAmount: 500,
    paymentTypeId: "1",
    note: "Monthly deposit"
  }) {
    resourceId
    accountId
    changes
  }
}
```

### Premature Close Recurring Deposit

```graphql
mutation PrematureCloseRecurringDeposit {
  recurring_deposit_premature_close(input: {
    id: "901",
    closedOnDate: "2023-09-15",
    note: "Premature closure due to changed savings plan",
    transferToSavingsId: "789"
  }) {
    resourceId
    accountId
    changes
  }
}
```

## Group Mutations

### Create Group

```graphql
mutation CreateGroup {
  group_create(input: {
    name: "Village Savings Group",
    officeId: "1",
    staffId: "5",
    active: false,
    submittedDate: "2023-05-01",
    externalId: "EXT456"
  }) {
    resourceId
    officeId
    groupId
    changes
  }
}
```

### Add Client to Group

```graphql
mutation AddClientToGroup {
  group_add_client(input: {
    groupId: "345",
    clientId: "123"
  }) {
    resourceId
    groupId
    changes
  }
}
```

### Activate Group

```graphql
mutation ActivateGroup {
  group_activate(input: {
    id: "345",
    activationDate: "2023-05-10"
  }) {
    resourceId
    groupId
    changes
  }
}
```

## Accounting Mutations

### Create Journal Entry

```graphql
mutation CreateJournalEntry {
  accounting_create_journal_entry(input: {
    officeId: "1",
    transactionDate: "2023-06-30",
    comments: "End of month adjustments",
    referenceNumber: "JE-2023-001",
    credits: [
      {
        glAccountId: "25",
        amount: 1000
      }
    ],
    debits: [
      {
        glAccountId: "11",
        amount: 1000
      }
    ]
  }) {
    resourceId
    entryId
    transactionId
  }
}
```

### Create GL Account

```graphql
mutation CreateGLAccount {
  accounting_create_account(input: {
    name: "Petty Cash",
    glCode: "10101",
    parentId: "10",
    type: "ASSET",
    usage: "DETAIL",
    description: "Petty cash account for small expenses",
    manualEntriesAllowed: true,
    tagId: "1"
  }) {
    resourceId
    accountId
  }
}
```

## Using Variables

All the examples above can be modified to use GraphQL variables for better reusability:

```graphql
mutation CreateClient($clientData: ClientCreateInput!) {
  client_create(input: $clientData) {
    resourceId
    clientId
    resourceIdentifier
    changes
  }
}
```

Variables would be passed separately:

```json
{
  "clientData": {
    "officeId": "1",
    "firstname": "John",
    "lastname": "Doe",
    "mobileNo": "+1234567890",
    "emailAddress": "johndoe@example.com",
    "dateOfBirth": "1990-01-15"
  }
}
```

## Error Handling

When a mutation fails, the API will return an error response:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "BAD_REQUEST",
        "errors": [
          {
            "field": "principal",
            "message": "Principal amount must be greater than zero"
          }
        ]
      }
    }
  ]
}
```

Always check for error responses and handle them appropriately in your application.