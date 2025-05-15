# Group Functionality - Fineract Hasura

This document describes the Group Management functionality available in the Fineract Hasura system, including group management, client memberships, group roles, and group loan management.

## Table of Contents

1. [Overview](#overview)
2. [Group Management](#group-management)
   - [Creating Groups](#creating-groups)
   - [Managing Group Lifecycle](#managing-group-lifecycle)
   - [Group Hierarchies](#group-hierarchies)
3. [Group Membership](#group-membership)
   - [Adding and Removing Members](#adding-and-removing-members)
   - [Group Roles](#group-roles)
4. [Group Loans](#group-loans)
   - [Creating Group Loans](#creating-group-loans)
   - [Managing Group Loans](#managing-group-loans)
5. [API Reference](#api-reference)
   - [Group Management APIs](#group-management-apis)
   - [Group Membership APIs](#group-membership-apis)
   - [Group Loan APIs](#group-loan-apis)
6. [GraphQL Examples](#graphql-examples)

## Overview

Group management in Fineract allows financial institutions to organize clients into groups for easier management, joint liability, and solidarity lending. The group functionality provides:

- Management of group structures including hierarchies (groups, centers, villages)
- Client membership and role assignments within groups
- Group-level loans where multiple members share liability
- Tracking of group activities, notes, and transfers

## Group Management

### Creating Groups

Groups are organized entities that can contain multiple clients. A group must be associated with an office and can optionally have a staff member assigned.

#### Group Types

- **Basic Group**: A simple collection of clients
- **Centralized Group**: A group with centralized loan processing
- **Hierarchical Group**: Groups can be part of larger groups (centers or villages)

#### Example: Creating a Group

```graphql
mutation CreateGroup {
  createGroup(
    groupName: "Entrepreneurs Club"
    officeId: "123e4567-e89b-12d3-a456-426614174000"
    staffId: "123e4567-e89b-12d3-a456-426614174001"
    submittedDate: "2023-05-15"
    clientMembers: [
      "123e4567-e89b-12d3-a456-426614174002",
      "123e4567-e89b-12d3-a456-426614174003"
    ]
  ) {
    groupId
    resourceId
  }
}
```

### Managing Group Lifecycle

Groups have a defined lifecycle with the following status transitions:

1. **Pending**: Initial state after group creation
2. **Active**: Group is activated and operational
3. **Inactive**: Group is temporarily deactivated
4. **Closed**: Group is permanently closed

#### Example: Activating a Group

```graphql
mutation ActivateGroup {
  activateGroup(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    activationDate: "2023-05-20"
  ) {
    id
    status
    activationDate
  }
}
```

#### Example: Closing a Group

```graphql
mutation CloseGroup {
  closeGroup(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    closureDate: "2023-12-31"
    closureReason: "Group objectives accomplished, members graduating to individual loans"
  ) {
    id
    status
    closedDate
  }
}
```

### Group Hierarchies

Groups can be organized in hierarchies where a parent group can contain multiple child groups. This is useful for village banking or center-based models.

#### Example: Creating a Parent-Child Group Structure

```graphql
# First create the parent group (Center)
mutation CreateParentGroup {
  createGroup(
    groupName: "Downtown Center"
    officeId: "123e4567-e89b-12d3-a456-426614174000"
    activationDate: "2023-05-15"
  ) {
    groupId
  }
}

# Then create child groups with parent reference
mutation CreateChildGroup {
  createGroup(
    groupName: "Market Vendors Group"
    officeId: "123e4567-e89b-12d3-a456-426614174000"
    parentId: "123e4567-e89b-12d3-a456-426614174020" # Parent group ID
    activationDate: "2023-05-16"
  ) {
    groupId
  }
}
```

## Group Membership

### Adding and Removing Members

Clients can be added to or removed from groups. A client can be a member of multiple groups simultaneously.

#### Example: Adding Members to a Group

```graphql
mutation AddGroupMembers {
  addGroupMembers(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    clientIds: [
      "123e4567-e89b-12d3-a456-426614174030",
      "123e4567-e89b-12d3-a456-426614174031"
    ]
  ) {
    id
    clientId
    clientName
  }
}
```

#### Example: Removing a Member from a Group

```graphql
mutation RemoveMember {
  removeGroupMember(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    clientId: "123e4567-e89b-12d3-a456-426614174030"
  ) {
    success
  }
}
```

### Group Roles

Within a group, clients can be assigned specific roles such as leader, secretary, or treasurer. These roles help establish the group's internal governance structure.

#### Available Roles

- **Leader**: Leads the group and often acts as the primary contact
- **Secretary**: Maintains group records and documentation
- **Treasurer**: Manages group finances and collections
- **Member**: Regular group member with no specific responsibilities

#### Example: Assigning a Role

```graphql
mutation AssignGroupRole {
  assignGroupRole(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    clientId: "123e4567-e89b-12d3-a456-426614174031"
    roleId: "123e4567-e89b-12d3-a456-426614174050" # Role ID for "Leader"
  ) {
    id
    clientName
    roleName
  }
}
```

## Group Loans

Group loans allow multiple clients to collectively take out a single loan, with shared responsibility for repayment.

### Creating Group Loans

Group loans are associated with the group rather than individual clients. They require a loan product that supports group lending.

#### Example: Creating a Group Loan

```graphql
mutation CreateGroupLoan {
  createGroupLoan(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    productId: "123e4567-e89b-12d3-a456-426614174060"
    principal: 50000
    interestRate: 12.5
    termFrequency: 12
    termFrequencyType: "months"
    submittedOnDate: "2023-06-01"
    expectedDisbursementDate: "2023-06-15"
    repaymentFrequency: 1
    repaymentFrequencyType: "months"
    repaymentEvery: 1
    note: "Group loan for business expansion"
  ) {
    loanId
    accountNumber
    loanStatus
  }
}
```

### Managing Group Loans

Group loans follow the same lifecycle as individual loans but are managed at the group level.

#### Example: Getting Group Loan Details

```graphql
query GetGroupLoanDetails {
  getGroupLoanDetails(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
    loanId: "123e4567-e89b-12d3-a456-426614174070"
  ) {
    loanDetails {
      id
      accountNo
      status
      principal
      interestRate
      termFrequency
      termFrequencyType
      disbursedOnDate
      expectedMaturityDate
    }
    transactions {
      id
      transactionType
      amount
      transactionDate
    }
    repaymentSchedule {
      installmentNumber
      dueDate
      principalAmount
      interestAmount
      totalPaidInAdvance
    }
  }
}
```

#### Example: Getting Loan Summary for a Group

```graphql
query GetGroupLoanSummary {
  getGroupLoanSummary(
    groupId: "123e4567-e89b-12d3-a456-426614174010"
  ) {
    statistics {
      totalLoans
      activeLoans
      totalPrincipal
      totalOutstanding
    }
    recentLoans {
      id
      accountNo
      status
      principal
      productName
    }
  }
}
```

## API Reference

### Group Management APIs

| Operation | Description | GraphQL Function |
|-----------|-------------|-----------------|
| Create Group | Creates a new group | `createGroup` |
| Update Group | Updates an existing group | `updateGroup` |
| Get Group | Retrieves group details | `getGroup` |
| Delete Group | Deletes a group | `deleteGroup` |
| Activate Group | Activates a group | `activateGroup` |
| Close Group | Closes a group | `closeGroup` |
| Search Groups | Searches for groups | `searchGroups` |
| Add Group Note | Adds a note to a group | `addGroupNote` |
| Transfer Group | Transfers a group to another office | `transferGroup` |

### Group Membership APIs

| Operation | Description | GraphQL Function |
|-----------|-------------|-----------------|
| Add Group Members | Adds clients to a group | `addGroupMembers` |
| Remove Group Member | Removes a client from a group | `removeGroupMember` |
| Assign Group Role | Assigns a role to a client in a group | `assignGroupRole` |
| Remove Group Role | Removes a role from a client in a group | `removeGroupRole` |

### Group Loan APIs

| Operation | Description | GraphQL Function |
|-----------|-------------|-----------------|
| Create Group Loan | Creates a loan for a group | `createGroupLoan` |
| Get Group Loans | Retrieves all loans for a group | `getGroupLoans` |
| Get Group Loan Details | Retrieves details of a specific group loan | `getGroupLoanDetails` |
| Get Group Loan Summary | Retrieves loan summary statistics for a group | `getGroupLoanSummary` |

## GraphQL Examples

### Example: Search for Groups with Criteria

```graphql
query SearchGroups {
  searchGroups(
    criteria: {
      name: "Village",
      officeId: "123e4567-e89b-12d3-a456-426614174000",
      status: active
    },
    limit: 10,
    offset: 0
  ) {
    totalFilteredRecords
    pageItems {
      id
      name
      status
      officeName
      memberCount
      activationDate
    }
  }
}
```

### Example: Get Group with Members and Roles

```graphql
query GetGroupWithDetails {
  getGroup(
    groupId: "123e4567-e89b-12d3-a456-426614174010",
    includeMembers: true,
    includeRoles: true,
    includeNotes: true
  ) {
    group {
      id
      groupName
      status
      officeName
      staffName
      activationDate
      isCentralizedGroup
    }
    members {
      clientId
      clientName
      accountNo
    }
    roles {
      clientId
      clientName
      roleName
    }
    notes {
      note
      createdDate
    }
    parentGroup {
      id
      name
    }
    childGroups {
      id
      name
      memberCount
    }
  }
}
```

### Example: Transfer a Group to Another Office

```graphql
mutation TransferGroup {
  transferGroup(
    groupId: "123e4567-e89b-12d3-a456-426614174010",
    destinationOfficeId: "123e4567-e89b-12d3-a456-426614174001",
    transferDate: "2023-07-01",
    note: "Transferring to branch office for better supervision"
  ) {
    id
    groupId
    fromOfficeId
    toOfficeId
    transferDate
    status
  }
}
```