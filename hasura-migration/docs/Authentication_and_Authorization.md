# Fineract Authentication and Authorization Design

This document outlines the authentication and authorization model for the Fineract Hasura migration, based on the original Java implementation.

## 1. Overview

The Fineract security model consists of several key components:

1. **Users** - AppUser entities that represent individual system users
2. **Roles** - Collections of permissions assigned to users
3. **Permissions** - Granular access rights to specific resources and actions
4. **Offices** - Organizational hierarchy that restricts data access
5. **Tenants** - Multi-tenancy support through separate database schemas

## 2. Authentication Mechanisms

Fineract supports multiple authentication mechanisms:

### 2.1. Basic Authentication

- Username/password authentication using HTTP Basic Auth
- Password hashing and security with the platform's password encoder
- Session tracking with expiration time

### 2.2. OAuth2 Authentication

- Token-based OAuth2 authentication
- JWT tokens with claims and expiration
- Refresh token flow

### 2.3. Two-Factor Authentication (2FA)

- Optional 2FA for additional security
- Implemented through a separate verification flow

## 3. Authorization Model

### 3.1. Role-Based Access Control (RBAC)

The Fineract permission system is built on a hierarchical RBAC model:

1. **Permissions**:
   - Basic unit of access control
   - Format: `ACTION_ENTITY` (e.g., `CREATE_CLIENT`, `READ_LOAN`)
   - Special permissions like `ALL_FUNCTIONS` provide global access

2. **Roles**:
   - Collections of permissions (many-to-many)
   - Assigned to users (many-to-many)
   - Roles can be enabled/disabled

3. **Authorization Checks**:
   - Every API endpoint validates user permissions
   - Supports hierarchical validation (e.g., `ALL_FUNCTIONS` grants access to all)
   - Provides methods like `hasPermissionTo()`, `validateHasPermission()`

### 3.2. Data Access Control

1. **Office Hierarchy**:
   - Users are associated with an office
   - Access to data is filtered based on office hierarchy
   - Methods like `validateAccessRights()` enforce this

2. **Self-Service Users**:
   - Special user type with limited permissions
   - Can only access their own data
   - Associated with specific clients

## 4. JWT Implementation for Hasura

For our Hasura implementation, we'll use JWT tokens with the following structure:

```json
{
  "sub": "<user-id>",
  "name": "<username>",
  "iat": 1516239022,
  "exp": 1516246222,
  "roles": ["admin", "user"],
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": ["admin", "user"],
    "x-hasura-default-role": "user",
    "x-hasura-user-id": "<user-id>",
    "x-hasura-office-id": "<office-id>",
    "x-hasura-tenant-id": "default"
  }
}
```

### 4.1. JWT Token Claims

1. **Standard Claims**:
   - `sub`: User ID
   - `name`: Username
   - `iat`: Issued at timestamp
   - `exp`: Expiration timestamp

2. **Hasura-Specific Claims**:
   - `x-hasura-allowed-roles`: Roles assigned to the user
   - `x-hasura-default-role`: Default role to use
   - `x-hasura-user-id`: User ID for row-level security
   - `x-hasura-office-id`: Office ID for data filtering
   - `x-hasura-tenant-id`: Tenant ID for multi-tenancy support

### 4.2. Hasura Permissions

Hasura permissions will be configured based on:

1. **Role-Based Access**:
   - Define permissions for each role (admin, user, etc.)
   - Configure field-level permissions

2. **Row-Level Security**:
   - Filter data based on office hierarchy
   - Use `x-hasura-office-id` for filtering

3. **Permission Checks**:
   - Use Hasura Actions for complex permission checks
   - Implement `hasPermissionTo()` logic in our Action handlers

## 5. Authentication Flow

1. **Login Request**:
   - User provides username/password
   - Action handler validates credentials against database

2. **Token Generation**:
   - Generate JWT token with appropriate claims
   - Set token expiration (default 12 hours)

3. **Token Refresh**:
   - Implement token refresh through a dedicated endpoint
   - Issue new token before expiration

4. **Logout**:
   - Client discards token
   - No server-side session to invalidate

## 6. Authorization Implementation

### 6.1. Hasura Permissions

1. **Table/View Permissions**:
   - Define insert/select/update/delete permissions per role
   - Use PostgreSQL expressions for row filtering

2. **Field-Level Permissions**:
   - Control which fields each role can access
   - Sensitive fields hidden from certain roles

### 6.2. Custom Authorization Logic

For complex authorization rules, we'll implement Hasura Actions that:

1. Validate user permissions for specific operations
2. Check hierarchical permission logic (e.g., `ALL_FUNCTIONS`)
3. Handle maker-checker workflows
4. Implement multi-tenant isolation

## 7. Security Considerations

1. **Token Security**:
   - Short-lived tokens (12 hours max)
   - Secure storage on client side
   - HTTPS for all communications

2. **Password Security**:
   - Bcrypt hashing for passwords
   - Password policies (complexity, rotation)
   - Account lockout on failed attempts

3. **Audit Logging**:
   - Log all authentication events
   - Track permission checks
   - Record sensitive data access

## 8. Migration Steps

1. **Schema Migration**:
   - Port user, role, and permission tables
   - Ensure compatibility with existing data

2. **Authentication Service**:
   - Implement login/refresh endpoints
   - Support for Basic Auth and JWT

3. **Permission Mapping**:
   - Convert Java permission checks to Hasura
   - Implement complex checks as Actions

4. **Testing**:
   - Validate all permission scenarios
   - Test hierarchical access control
   - Verify multi-tenancy isolation