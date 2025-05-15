# Clients Module

The Clients module provides operations for managing client information within the Fineract system. Clients are the core entity in the system and represent individual customers who use banking services.

## Overview

The Clients module allows you to:

- Create and manage client profiles
- Track client status through their lifecycle
- Associate clients with offices and staff
- Manage client identifiers, addresses, and family members
- Access client account summaries

## Types

### ClientSummary

A simplified representation of a client used in list responses:

```graphql
type ClientSummary {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  subStatus: String
  activationDate: String
  officeId: String!
  officeName: String!
  staffId: String
  staffName: String
  submittedDate: String
  mobileNo: String
  emailAddress: String
  dateOfBirth: String
  gender: String
  clientType: String
  legalForm: String
  firstname: String
  middlename: String
  lastname: String
  fullname: String
  displayName: String!
}
```

### ClientDetail

A detailed representation of a client with all associated information:

```graphql
type ClientDetail {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  subStatus: String
  activationDate: String
  officeId: String!
  officeName: String!
  staffId: String
  staffName: String
  submittedDate: String
  mobileNo: String
  emailAddress: String
  dateOfBirth: String
  gender: String
  clientType: String
  clientTypeValue: String
  clientClassification: String
  clientClassificationValue: String
  legalForm: String
  firstname: String
  middlename: String
  lastname: String
  fullname: String
  displayName: String!
  createdDate: String
  lastModifiedDate: String
  closedDate: String
  reopenedDate: String
  identifiers: [ClientIdentifier!]!
  addresses: [ClientAddress!]!
  familyMembers: [ClientFamilyMember!]!
  notes: [ClientNote!]!
  documents: [ClientDocument!]!
}
```

### Associated Types

```graphql
type ClientIdentifier {
  id: String!
  documentType: String!
  documentTypeId: String!
  documentKey: String!
  description: String
  status: String!
}

type ClientAddress {
  id: String!
  addressType: String!
  addressLine1: String
  addressLine2: String
  addressLine3: String
  city: String
  stateProvince: String
  country: String
  postalCode: String
  isActive: Boolean!
}

type ClientFamilyMember {
  id: String!
  firstname: String!
  middlename: String
  lastname: String
  qualification: String
  mobileNumber: String
  age: Int
  isDependent: Boolean!
  relationshipId: String
  relationship: String
  maritalStatus: String
  gender: String
  dateOfBirth: String
  profession: String
}

type ClientNote {
  id: String!
  note: String!
  createdDate: String!
  createdBy: String
}

type ClientDocument {
  id: String!
  name: String!
  fileName: String!
  size: Int
  type: String
  description: String
  location: String!
}
```

### Account Types

```graphql
type ClientAccountsSummary {
  loanAccounts: [LoanAccount!]!
  savingsAccounts: [SavingsAccount!]!
}

type LoanAccount {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  productName: String!
  loanType: String!
  principalAmount: Float!
  disbursedDate: String
  expectedMaturityDate: String
  totalOutstanding: Float
}

type SavingsAccount {
  id: String!
  accountNo: String!
  externalId: String
  status: String!
  productName: String!
  accountType: String!
  currencyCode: String!
  accountBalance: Float!
}
```

### Response Type

```graphql
type ClientActionResponse {
  resourceId: String!
  officeId: String!
  clientId: String!
  resourceIdentifier: String
  changes: JSON
}

type ClientListResponse {
  totalCount: Int!
  clients: [ClientSummary!]!
}
```

## Queries

### client_list

Retrieves a paginated list of clients, with options for filtering and sorting.

```graphql
client_list(input: ClientListInput!): ClientListResponse!

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

#### Example Usage

```graphql
query {
  client_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    status: "active"
  }) {
    totalCount
    clients {
      id
      displayName
      status
      mobileNo
    }
  }
}
```

### client_get

Retrieves detailed information about a specific client by ID.

```graphql
client_get(input: ClientGetInput!): ClientDetail!

input ClientGetInput {
  id: String!
}
```

#### Example Usage

```graphql
query {
  client_get(input: {
    id: "123"
  }) {
    id
    displayName
    status
    mobileNo
    emailAddress
    addresses {
      addressType
      city
      country
    }
    identifiers {
      documentType
      documentKey
    }
  }
}
```

### client_accounts

Retrieves the loan and savings accounts associated with a client.

```graphql
client_accounts(input: ClientAccountsInput!): ClientAccountsSummary!

input ClientAccountsInput {
  clientId: String!
}
```

#### Example Usage

```graphql
query {
  client_accounts(input: {
    clientId: "123"
  }) {
    loanAccounts {
      id
      accountNo
      status
      productName
      principalAmount
      totalOutstanding
    }
    savingsAccounts {
      id
      accountNo
      status
      productName
      accountBalance
    }
  }
}
```

## Mutations

### client_create

Creates a new client in the system.

```graphql
client_create(input: ClientCreateInput!): ClientActionResponse!

input ClientCreateInput {
  officeId: String!
  firstname: String
  lastname: String
  fullname: String
  mobileNo: String
  emailAddress: String
  externalId: String
  staffId: String
  dateOfBirth: String
  gender: String
  clientType: String
  clientClassification: String
  isStaff: Boolean
  active: Boolean
  activationDate: String
  submittedDate: String
}
```

#### Example Usage

```graphql
mutation {
  client_create(input: {
    officeId: "1",
    firstname: "John",
    lastname: "Doe",
    mobileNo: "+1234567890",
    emailAddress: "john.doe@example.com",
    dateOfBirth: "1990-01-15",
    gender: "Male",
    submittedDate: "2023-05-01"
  }) {
    resourceId
    clientId
    resourceIdentifier
    changes
  }
}
```

#### Notes

- At least one of `firstname`/`lastname` or `fullname` must be provided
- If `active` is set to `true`, `activationDate` must be provided
- `submittedDate` defaults to the current date if not provided

### client_update

Updates an existing client's information.

```graphql
client_update(input: ClientUpdateInput!): ClientActionResponse!

input ClientUpdateInput {
  id: String!
  firstname: String
  lastname: String
  fullname: String
  mobileNo: String
  emailAddress: String
  externalId: String
  staffId: String
  dateOfBirth: String
  gender: String
  clientType: String
  clientClassification: String
  isStaff: Boolean
}
```

#### Example Usage

```graphql
mutation {
  client_update(input: {
    id: "123",
    mobileNo: "+1987654321",
    emailAddress: "john.updated@example.com"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_activate

Activates a client that is in pending status.

```graphql
client_activate(input: ClientActivateInput!): ClientActionResponse!

input ClientActivateInput {
  id: String!
  activationDate: String!
}
```

#### Example Usage

```graphql
mutation {
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

### client_close

Closes an active client account.

```graphql
client_close(input: ClientCloseInput!): ClientActionResponse!

input ClientCloseInput {
  id: String!
  closureDate: String!
  closureReasonId: String!
}
```

#### Example Usage

```graphql
mutation {
  client_close(input: {
    id: "123",
    closureDate: "2023-12-31",
    closureReasonId: "2"  # ID of the closure reason (e.g., "Relocated")
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_reject

Rejects a client that is in pending status.

```graphql
client_reject(input: ClientRejectInput!): ClientActionResponse!

input ClientRejectInput {
  id: String!
  rejectionDate: String!
  rejectionReasonId: String!
}
```

#### Example Usage

```graphql
mutation {
  client_reject(input: {
    id: "123",
    rejectionDate: "2023-05-05",
    rejectionReasonId: "1"  # ID of the rejection reason
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_withdraw

Withdraws a client application that is in pending status.

```graphql
client_withdraw(input: ClientWithdrawInput!): ClientActionResponse!

input ClientWithdrawInput {
  id: String!
  withdrawalDate: String!
  withdrawalReasonId: String!
}
```

#### Example Usage

```graphql
mutation {
  client_withdraw(input: {
    id: "123",
    withdrawalDate: "2023-05-05",
    withdrawalReasonId: "1"  # ID of the withdrawal reason
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_reactivate

Reactivates a client that has been closed, rejected, or withdrawn.

```graphql
client_reactivate(input: ClientReactivateInput!): ClientActionResponse!

input ClientReactivateInput {
  id: String!
  reactivationDate: String!
}
```

#### Example Usage

```graphql
mutation {
  client_reactivate(input: {
    id: "123",
    reactivationDate: "2023-06-15"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_add_identifier

Adds an identification document to a client.

```graphql
client_add_identifier(input: ClientAddIdentifierInput!): ClientActionResponse!

input ClientAddIdentifierInput {
  clientId: String!
  documentTypeId: String!
  documentKey: String!
  description: String
}
```

#### Example Usage

```graphql
mutation {
  client_add_identifier(input: {
    clientId: "123",
    documentTypeId: "1",  # ID of the document type (e.g., "National ID")
    documentKey: "AB123456789",
    description: "National identification card"
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_add_address

Adds an address to a client.

```graphql
client_add_address(input: ClientAddAddressInput!): ClientActionResponse!

input ClientAddAddressInput {
  clientId: String!
  addressType: String!
  addressLine1: String
  addressLine2: String
  addressLine3: String
  city: String
  stateProvince: String
  country: String
  postalCode: String
  isActive: Boolean
}
```

#### Example Usage

```graphql
mutation {
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

### client_add_family_member

Adds a family member to a client.

```graphql
client_add_family_member(input: ClientAddFamilyMemberInput!): ClientActionResponse!

input ClientAddFamilyMemberInput {
  clientId: String!
  firstname: String!
  middlename: String
  lastname: String
  qualification: String
  mobileNumber: String
  age: Int
  isDependent: Boolean
  relationshipId: String
  maritalStatus: String
  gender: String
  dateOfBirth: String
  profession: String
}
```

#### Example Usage

```graphql
mutation {
  client_add_family_member(input: {
    clientId: "123",
    firstname: "Jane",
    lastname: "Doe",
    relationshipId: "1",  # ID of the relationship type (e.g., "Spouse")
    gender: "Female",
    dateOfBirth: "1992-05-20",
    isDependent: true
  }) {
    resourceId
    clientId
    changes
  }
}
```

### client_add_document

Adds a document to a client.

```graphql
client_add_document(input: ClientAddDocumentInput!): ClientActionResponse!

input ClientAddDocumentInput {
  clientId: String!
  name: String!
  fileName: String!
  size: Int
  type: String
  description: String
  location: String!
}
```

#### Example Usage

```graphql
mutation {
  client_add_document(input: {
    clientId: "123",
    name: "Proof of Address",
    fileName: "utility_bill.pdf",
    size: 245760,
    type: "application/pdf",
    description: "Recent utility bill as proof of address",
    location: "/documents/clients/123/utility_bill.pdf"
  }) {
    resourceId
    clientId
    changes
  }
}
```

## Client Lifecycle

A client in the Fineract system progresses through the following statuses:

1. **Pending**: Initial state after client creation
2. **Active**: Client has been activated and can use services
3. **Closed**: Client relationship has been terminated
4. **Rejected**: Client application was rejected
5. **Withdrawn**: Client application was withdrawn

The typical lifecycle flow is:

```
Pending → Active → Closed
```

Alternative flows include:

```
Pending → Rejected
Pending → Withdrawn
Closed → Active (reactivation)
Rejected → Active (reactivation)
Withdrawn → Active (reactivation)
```

## Best Practices

### 1. Fetching Client Data Efficiently

When displaying client information, tailor your queries to fetch only the necessary data:

```graphql
# For a client list/table view
query {
  client_list(input: {
    officeId: "1",
    limit: 20,
    offset: 0
  }) {
    totalCount
    clients {
      id
      displayName
      status
      mobileNo
      # Only include fields needed for the UI
    }
  }
}

# For a client details page
query {
  client_get(input: {
    id: "123"
  }) {
    # Include all relevant fields for the detailed view
    id
    displayName
    status
    # ... other basic fields
    
    # Only include these sections if you're displaying them
    addresses {
      # Address fields
    }
    identifiers {
      # Identifier fields
    }
  }
}
```

### 2. Handling Client Creation

Always validate client data before submission:

- Ensure required fields are provided
- Validate formats for phone numbers, emails, dates
- Check that the office ID is valid

### 3. Managing Client Status Changes

Status transitions should follow the valid lifecycle paths. Implement proper validation:

```javascript
const canActivateClient = (client) => {
  return client.status === 'PENDING';
};

const canCloseClient = (client) => {
  return client.status === 'ACTIVE';
};

const canReactivateClient = (client) => {
  return ['CLOSED', 'REJECTED', 'WITHDRAWN'].includes(client.status);
};
```

### 4. Efficient Searching and Filtering

When searching for clients, use the appropriate filters:

```graphql
query {
  client_list(input: {
    officeId: "1",
    name: "John",  # Searches display name, first name, and last name
    externalId: "EXT123",  # For external system IDs
    status: "active",
    limit: 20,
    offset: 0
  }) {
    totalCount
    clients {
      # Fields
    }
  }
}
```

### 5. Handling Client Photos

Client photos are managed through separate API endpoints. Follow these practices:

- Store client photos separately from other client documents
- Use appropriate image formats and compression
- Implement client-side image resizing before upload

## Error Handling

Common error scenarios and how to handle them:

| Error Code | Description | Handling Strategy |
|------------|-------------|-------------------|
| `DUPLICATE_ACCOUNT` | Client with the same details already exists | Check for existing clients before creation |
| `INVALID_OFFICE` | Office ID is invalid or inaccessible | Validate office ID before submission |
| `INVALID_STATUS_CHANGE` | Invalid client status transition | Check current status before attempting transition |
| `ACTIVE_ACCOUNTS_EXIST` | Cannot close a client with active accounts | Close or transfer all accounts before client closure |

## Integration with Other Modules

The Clients module integrates closely with:

1. **Loan Module**: Access a client's loan accounts
2. **Savings Module**: Access a client's savings accounts
3. **Group Module**: Manage client membership in groups
4. **Document Module**: Store and retrieve client-related documents

Always consider these relationships when designing client-related features.