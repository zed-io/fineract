# Query Examples

This document provides examples of common queries you can perform using the Fineract GraphQL API. These examples demonstrate how to fetch data efficiently and how to structure your queries for optimal results.

## Client Queries

### List Clients

Retrieve a list of clients with pagination and filtering:

```graphql
query ListClients {
  client_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active",
    orderBy: "displayName",
    sortOrder: "asc"
  }) {
    totalCount
    clients {
      id
      accountNo
      displayName
      status
      officeName
      mobileNo
      activationDate
    }
  }
}
```

### Get Client Details

Retrieve complete information about a specific client:

```graphql
query GetClientDetails {
  client_get(input: {
    id: "123"
  }) {
    id
    accountNo
    displayName
    status
    activationDate
    officeName
    staffName
    mobileNo
    emailAddress
    dateOfBirth
    gender
    addresses {
      id
      addressType
      addressLine1
      addressLine2
      city
      stateProvince
      country
      postalCode
      isActive
    }
    identifiers {
      id
      documentType
      documentKey
      status
    }
    familyMembers {
      id
      firstname
      lastname
      relationship
      dateOfBirth
      isDependent
    }
    notes {
      id
      note
      createdDate
      createdBy
    }
  }
}
```

### Get Client Accounts

Retrieve all accounts associated with a client:

```graphql
query GetClientAccounts {
  client_accounts(input: {
    clientId: "123"
  }) {
    loanAccounts {
      id
      accountNo
      status
      productName
      loanType
      principalAmount
      disbursedDate
      expectedMaturityDate
      totalOutstanding
    }
    savingsAccounts {
      id
      accountNo
      status
      productName
      accountType
      currencyCode
      accountBalance
    }
  }
}
```

## Loan Queries

### List Loans

Retrieve a list of loans with pagination and filtering:

```graphql
query ListLoans {
  loan_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active",
    orderBy: "submittedDate",
    sortOrder: "desc"
  }) {
    totalCount
    loans {
      id
      accountNo
      clientId
      clientName
      productName
      loanOfficerName
      principalAmount
      status
      disbursedDate
      maturityDate
    }
  }
}
```

### Get Loan Details

Retrieve complete information about a specific loan:

```graphql
query GetLoanDetails {
  loan_get(input: {
    id: "456"
  }) {
    id
    accountNo
    clientId
    clientName
    status
    submittedDate
    approvedDate
    disbursedDate
    maturityDate
    loanPurpose
    loanOfficerName
    
    # Loan terms
    principalAmount
    interestRate
    numberOfRepayments
    repaymentEvery
    repaymentFrequencyType
    interestType
    amortizationType
    
    # Current loan state
    totalOutstanding
    principalOutstanding
    interestOutstanding
    feeOutstanding
    penaltyOutstanding
    totalPaid
    
    # Repayments
    repaymentSchedule {
      periods {
        dueDate
        principalDue
        principalPaid
        interestDue
        interestPaid
        totalDue
        totalPaid
        totalOutstanding
      }
    }
    
    # Transactions
    transactions {
      id
      transactionType
      amount
      date
      principalPortion
      interestPortion
      feePortion
      penaltyPortion
      overpaymentPortion
    }
    
    # Charges
    charges {
      id
      name
      amount
      dueDate
      chargeTimeType
      chargeCalculationType
      paid
      amountOutstanding
      amountWaived
    }
  }
}
```

## Savings Queries

### List Savings Accounts

Retrieve a list of savings accounts with pagination and filtering:

```graphql
query ListSavingsAccounts {
  savings_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active",
    orderBy: "accountNo",
    sortOrder: "asc"
  }) {
    totalCount
    accounts {
      id
      accountNo
      clientId
      clientName
      productName
      accountBalance
      status
      interestRate
      lastActiveTransactionDate
    }
  }
}
```

### Get Savings Account Details

Retrieve complete information about a specific savings account:

```graphql
query GetSavingsDetails {
  savings_get(input: {
    id: "789"
  }) {
    id
    accountNo
    clientId
    clientName
    status
    activatedDate
    productName
    accountType
    
    # Account state
    accountBalance
    availableBalance
    
    # Account settings
    interestRate
    interestCalculationType
    interestCompoundingPeriodType
    interestPostingPeriodType
    
    # Transactions
    transactions {
      id
      transactionType
      amount
      runningBalance
      submittedDate
      description
    }
    
    # Standing instructions
    standingInstructions {
      id
      name
      priority
      instructionType
      status
      amount
      validFrom
      validTill
      recurrenceType
      recurrenceFrequency
      recurrenceInterval
    }
  }
}
```

## Fixed Deposit Queries

### List Fixed Deposit Accounts

```graphql
query ListFixedDepositAccounts {
  fixed_deposit_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active"
  }) {
    totalCount
    accounts {
      id
      accountNo
      clientId
      clientName
      productName
      depositAmount
      maturityAmount
      interestRate
      depositPeriod
      depositPeriodFrequency
      maturityDate
      status
    }
  }
}
```

### Get Fixed Deposit Details

```graphql
query GetFixedDepositDetails {
  fixed_deposit_get(input: {
    id: "789"
  }) {
    id
    accountNo
    clientId
    clientName
    status
    activatedDate
    maturityDate
    
    # Account details
    depositAmount
    maturityAmount
    interestRate
    depositPeriod
    depositPeriodFrequency
    
    # Account settings
    interestCompoundingPeriodType
    interestPostingPeriodType
    
    # Pre-closure details
    preClosureAllowed
    preClosurePenalInterest
    
    # Transactions
    transactions {
      id
      transactionType
      amount
      date
      description
    }
  }
}
```

## Recurring Deposit Queries

### List Recurring Deposit Accounts

```graphql
query ListRecurringDepositAccounts {
  recurring_deposit_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active"
  }) {
    totalCount
    accounts {
      id
      accountNo
      clientId
      clientName
      productName
      depositAmount
      interestRate
      depositPeriod
      depositPeriodFrequency
      recurringDepositFrequency
      recurringDepositFrequencyType
      expectedFirstDepositDate
      maturityDate
      status
    }
  }
}
```

### Get Recurring Deposit Details

```graphql
query GetRecurringDepositDetails {
  recurring_deposit_get(input: {
    id: "789"
  }) {
    id
    accountNo
    clientId
    clientName
    status
    activatedDate
    maturityDate
    
    # Account details
    depositAmount
    totalDeposited
    expectedMaturityAmount
    interestRate
    depositPeriod
    depositPeriodFrequency
    recurringDepositFrequency
    recurringDepositFrequencyType
    
    # Schedule
    expectedFirstDepositDate
    missedDepositCount
    
    # Account settings
    interestCompoundingPeriodType
    interestPostingPeriodType
    
    # Pre-closure details
    preClosureAllowed
    preClosurePenalInterest
    
    # Transactions and installments
    transactions {
      id
      transactionType
      amount
      date
      description
    }
    installments {
      dueDate
      depositAmount
      isPaid
      actualPaymentDate
    }
  }
}
```

## Group Queries

### List Groups

```graphql
query ListGroups {
  group_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active"
  }) {
    totalCount
    groups {
      id
      name
      status
      activationDate
      officeId
      officeName
      staffId
      staffName
      centerName
      hierarchy
      groupLevel
      externalId
    }
  }
}
```

### Get Group Details

```graphql
query GetGroupDetails {
  group_get(input: {
    id: "123"
  }) {
    id
    name
    status
    activationDate
    officeId
    officeName
    staffId
    staffName
    
    # Group structure
    centerName
    hierarchy
    groupLevel
    
    # Members
    clients {
      id
      accountNo
      displayName
      status
    }
    
    # Accounts
    loans {
      id
      accountNo
      productName
      status
      principalAmount
    }
    
    # Additional info
    notes {
      id
      note
      createdDate
      createdBy
    }
    
    # Group details
    meetingFrequency
    meetingDayOfWeek
  }
}
```

## Accounting Queries

### List GL Accounts

```graphql
query ListGLAccounts {
  accounting_list_accounts(input: {
    type: "ASSET",
    usage: "DETAIL",
    disabled: false,
    manualEntriesAllowed: true,
    limit: 20,
    offset: 0
  }) {
    totalCount
    accounts {
      id
      name
      glCode
      type
      usage
      description
      parentId
      tagId
      manualEntriesAllowed
      disabled
    }
  }
}
```

### Get Journal Entries

```graphql
query GetJournalEntries {
  accounting_journal_entries(input: {
    officeId: "1",
    fromDate: "2023-01-01",
    toDate: "2023-12-31",
    limit: 20,
    offset: 0
  }) {
    totalCount
    entries {
      id
      officeId
      officeName
      transactionId
      transactionDate
      glAccountId
      glAccountName
      entryType
      amount
      createdByUserId
      createdByUserName
      createdDate
      comments
      reversed
      referenceNumber
    }
  }
}
```

## Using Variables

All the examples above can be modified to use GraphQL variables for better reusability:

```graphql
query GetClientDetails($clientId: String!) {
  client_get(input: {
    id: $clientId
  }) {
    id
    accountNo
    displayName
    # ... other fields
  }
}
```

Variables would be passed separately:

```json
{
  "clientId": "123"
}
```

## Combining Multiple Queries

GraphQL allows fetching multiple resources in a single request:

```graphql
query ClientDashboard($clientId: String!, $loanId: String!, $savingsId: String!) {
  client: client_get(input: { id: $clientId }) {
    id
    displayName
    status
  }
  
  loan: loan_get(input: { id: $loanId }) {
    id
    status
    principalAmount
    totalOutstanding
  }
  
  savings: savings_get(input: { id: $savingsId }) {
    id
    status
    accountBalance
  }
}
```

## Field Selection

One of GraphQL's key advantages is the ability to request only the fields you need. Adjust any of the examples above to include more or fewer fields according to your application's requirements.