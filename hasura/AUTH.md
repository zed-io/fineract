# Authentication & Authorization System

This document outlines the authentication and authorization system implemented for the Fineract Hasura migration.

## Overview

The system uses JWT (JSON Web Tokens) for authentication and implements a role-based permission system that integrates with Hasura's authorization model. Key features include:

- JWT-based authentication with access and refresh tokens
- Role-based access control (RBAC) with granular permissions
- Multi-tenancy support
- Password security with validation requirements
- Account locking after failed login attempts
- Token refresh mechanism
- Hasura action handlers for auth operations

## Architecture

The authentication system consists of the following components:

1. **Auth Models** (`/models/auth.ts`): Defines interfaces, types, and validation functions
2. **Auth Service** (`/services/authService.ts`): Core implementation of authentication logic
3. **Auth Handlers** (`/handlers/auth.ts`): API endpoints for auth operations
4. **Auth Middleware** (`/utils/authMiddleware.ts`): Express middleware for route protection
5. **Hasura Auth Actions** (`/metadata/actions/auth_actions.yaml`): Hasura GraphQL actions for auth
6. **Hasura JWT Config** (`/metadata/jwt_config.yaml`): JWT configuration for Hasura

## Authentication Flow

1. **Login**:
   - User provides username/password
   - System validates credentials against database
   - If valid, returns access and refresh tokens
   - JWT contains user ID, roles, permissions, office ID, and tenant ID

2. **Authenticated Requests**:
   - Client includes access token in Authorization header
   - Backend validates token before processing request
   - Hasura uses token claims to enforce authorization rules

3. **Token Refresh**:
   - When access token expires, client uses refresh token to get new tokens
   - Refresh tokens have longer expiry (7 days by default)

4. **Logout**:
   - Client-side only (discards tokens)
   - Tokens naturally expire based on configured timeouts

## Authorization Model

Permissions are structured around:

- **User**: Has one or more roles
- **Role**: Collection of permissions (e.g., admin, staff, client)
- **Permission**: Specific action on entity (e.g., CREATE_CLIENT, VIEW_LOAN)

### Role Types

- **Super user**: Has all permissions
- **Admin**: Manages users, roles, and system settings
- **Staff**: Regular staff with limited permissions
- **Self-service**: Client self-service with minimal permissions

### Permission Structure

Permissions follow this format: `ACTION_ENTITY` (e.g., `CREATE_LOAN`, `VIEW_CLIENT`)

Permission attributes:
- **Grouping**: Functional category (e.g., client, loan, savings)
- **Entity**: Resource type (e.g., loan, client, user)
- **Action**: Operation (e.g., create, read, update, delete)

## Hasura Integration

The system integrates with Hasura through:

1. **JWT Claims**: Token payload contains values Hasura uses for authorization
2. **Session Variables**: Values from JWT are available as `x-hasura-*` variables in GraphQL
3. **Role-Based Access**: Hasura permission rules use JWT roles for access control
4. **Permission Rules**: Database-level permissions enforced by Hasura

### JWT Structure

```json
{
  "sub": "user-uuid",
  "iat": 1620000000,
  "exp": 1620003600,
  "roles": ["admin", "staff"],
  "perms": ["CREATE_USER", "VIEW_LOAN", "..."],
  "off": "office-uuid",
  "tn": "tenant-identifier",
  "typ": "access",
  "jti": "token-uuid"
}
```

## API Endpoints

| Endpoint | Method | Description | Permissions |
|----------|--------|-------------|------------|
| `/api/auth/login` | POST | User login with credentials | Anonymous |
| `/api/auth/refresh-token` | POST | Refresh access token | Anonymous/User |
| `/api/auth/create-user` | POST | Create new user | Admin |
| `/api/auth/change-password` | POST | Change user password | User |
| `/api/auth/validate-token` | POST | Validate JWT token | Anonymous/User |

## Security Considerations

1. **Password Security**:
   - Passwords stored with bcrypt hashing
   - Password requirements enforced (length, complexity)
   - Account lockout after failed attempts

2. **Token Security**:
   - Short-lived access tokens (1 hour default)
   - Longer-lived refresh tokens (7 days default)
   - Token type enforcement (access vs. refresh)

3. **Hasura Security**:
   - Row-level security based on user roles and IDs
   - Permission rules limit data access by role
   - JWT verification on all requests

## Multi-tenancy

The system supports multi-tenancy with:

1. **Tenant Isolation**: Users belong to specific tenants
2. **JWT Tenant Claim**: Tokens include tenant information
3. **Hasura Row Filters**: Tenant ID used for row-level security

## Development Guidelines

1. **Adding Permissions**:
   - Add permission code in `PermissionGroup` and `PermissionAction` enums
   - Ensure database has corresponding permission records

2. **Securing Routes**:
   - Use the `requireAuth` middleware to protect routes
   - Use `requirePermissions(['PERMISSION_CODE'])` to enforce specific permissions

3. **Testing Tokens**:
   - Use `/api/auth/validate-token` to debug token issues
   - Check JWT claims match expected values

## Configuration

Key configuration values are in:

- `TOKEN_CONFIG`: Token expiration times and algorithm
- `PASSWORD_VALIDATION`: Password security requirements
- Environmental variables:
  - `JWT_SECRET`: Secret key for token signing (required in production)
  - `MAX_FAILED_ATTEMPTS`: Number of failed logins before account lockout