# Beneficiary Management

This document describes the Beneficiary Management feature for savings accounts in the Credit Cloud platform.

## Overview

Beneficiary Management allows users to:
- Add, edit, and remove beneficiaries for savings accounts
- Allocate percentage shares to each beneficiary
- Track total allocation across all beneficiaries
- View percentage share distribution visually
- Manage contact information for beneficiaries

## User Flows

### Viewing Beneficiaries

1. Navigate to a savings account detail page
2. Select the "Beneficiaries" tab
3. View the list of beneficiaries and their percentage allocations
4. Use the percentage chart to visualize the distribution

### Adding a Beneficiary

1. From the Beneficiaries tab, click "Add Beneficiary"
2. Fill in the required information:
   - Beneficiary name
   - Relationship type
   - Percentage share
   - Optional: Contact information and address
3. Submit the form to create the beneficiary

### Editing a Beneficiary

1. Find the beneficiary in the list
2. Click the menu icon and select "Edit"
3. Modify the information as needed
4. Save changes

### Removing a Beneficiary

1. Find the beneficiary in the list
2. Click the menu icon and select "Remove"
3. Confirm the removal

## Technical Implementation

### GraphQL Schema

The Beneficiary Management feature uses the following GraphQL types:

#### Types

```graphql
type Beneficiary {
  id: UUID!
  name: String!
  relationshipType: String!
  percentageShare: Float!
  address: String
  contactNumber: String
  email: String
  isActive: Boolean!
}

type SavingsAccount {
  id: UUID!
  accountNo: String!
  # other fields...
  beneficiaries: [Beneficiary!]
}
```

#### Queries

```graphql
query GetSavingsBeneficiaries($accountId: UUID!) {
  getSavingsAccount(id: $accountId) {
    id
    accountNo
    clientName
    beneficiaries {
      id
      name
      relationshipType
      percentageShare
      address
      contactNumber
      email
      isActive
    }
  }
}
```

#### Mutations

```graphql
mutation AddSavingsBeneficiary($input: AddBeneficiaryInput!) {
  addSavingsBeneficiary(input: $input) {
    success
    message
    beneficiary {
      # beneficiary fields
    }
  }
}

mutation UpdateSavingsBeneficiary($input: UpdateBeneficiaryInput!) {
  updateSavingsBeneficiary(input: $input) {
    success
    message
    beneficiary {
      # beneficiary fields
    }
  }
}

mutation RemoveSavingsBeneficiary($input: RemoveBeneficiaryInput!) {
  removeSavingsBeneficiary(input: $input) {
    success
    message
  }
}
```

### Front-End Components

The feature consists of these main components:

1. **BeneficiaryManagement**: Main container component
2. **BeneficiaryList**: Table-based list of beneficiaries with actions
3. **BeneficiaryFormDialog**: Form for adding/editing beneficiaries
4. **PercentageShareChart**: Visual representation of allocation distribution

### Permissions

The following permissions control access to beneficiary management:

- `savings_read`: Allows viewing beneficiaries
- `savings_update`: Allows adding, editing, and removing beneficiaries
- `admin_manage`: Grants full access to all beneficiary operations

## Validation Rules

- Beneficiary names must be at least 2 characters
- Relationship type is required
- Percentage shares must be greater than 0% and not exceed 100%
- Total allocation across all beneficiaries should equal 100%
- Email addresses must be in valid format
- Percentage share validation accounts for the total allocation of other beneficiaries

## Future Enhancements

1. **Document Management**
   - Allow attaching legal documents to beneficiaries
   - Support verification of beneficiary identity

2. **Beneficiary Verification Workflow**
   - Add verification status for beneficiaries
   - Implement approval process for changes

3. **Multi-level Beneficiaries**
   - Support for primary and contingent beneficiaries
   - Allow specification of inheritance order

4. **Notifications**
   - Notify account holders when beneficiary details change
   - Alert beneficiaries when they are added/removed

## Implementation Status

- ✅ GraphQL schema definition
- ✅ Backend Hasura actions
- ✅ Front-end components
- ✅ Permission-based access control
- ✅ Percentage share visualization

## Related Documentation

- [Savings Account Management](./savings_implementation_plan.md)
- [Client Management](./client_migration.md)
- [Permission System](../AUTH.md)