# Authentication and Authorization in Fineract

This guide provides a comprehensive overview of Fineract's authentication and authorization architecture, implementation details, and integration guidelines.

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
   - [Authentication Methods](#21-authentication-methods)
   - [JWT Structure](#22-jwt-structure)
   - [Authentication Flows](#23-authentication-flows)
3. [Authorization](#3-authorization)
   - [Role-Based Access Control](#31-role-based-access-control)
   - [Permission Structure](#32-permission-structure)
   - [Data Access Control](#33-data-access-control)
4. [Two-Factor Authentication](#4-two-factor-authentication)
   - [2FA Methods](#41-2fa-methods)
   - [2FA Flow](#42-2fa-flow)
   - [Trusted Devices](#43-trusted-devices)
5. [Security Considerations](#5-security-considerations)
6. [Integration Guide](#6-integration-guide)
7. [API Reference](#7-api-reference)
8. [User Management](#8-user-management)
9. [Password Policies](#9-password-policies)
10. [Audit and Logging](#10-audit-and-logging)

## 1. Architecture Overview

The Fineract authentication and authorization system consists of the following core components:

### 1.1. Database Schema

- **User Tables**: `app_user`, `user_role`, `role`, `permission`, etc.
- **Authentication Tables**: `two_factor_configuration`, `two_factor_access_token`, `otp_request`, `totp_secret`, `trusted_device`
- **Audit Tables**: `m_portfolio_command_source`, `audit_log`, etc.

### 1.2. Microservices

- **Authentication Service**: Handles login, token management, and 2FA
- **Authorization Service**: Enforces permission and data access controls
- **User Management Service**: Manages user creation, updates, and deactivation

### 1.3. Security Layer

- **JWT-based Authentication**: Uses JWT tokens for secure API access
- **Role-Based Access Control**: Enforces permissions based on user roles
- **Multi-tenancy Support**: Isolates data between tenants
- **Office Hierarchy**: Restricts data access based on office structure

## 2. Authentication

### 2.1. Authentication Methods

Fineract supports multiple authentication methods:

#### 2.1.1. Basic Authentication (Legacy Support)

- Username/password-based authentication
- Primarily for compatibility with legacy systems
- Secured through TLS/SSL

#### 2.1.2. JWT Authentication

- Token-based authentication using JSON Web Tokens (JWT)
- Access tokens with short lifespans (1 hour by default)
- Refresh tokens for obtaining new access tokens

#### 2.1.3. OAuth2 Authentication (Optional)

- Support for OAuth2 authorization code flow
- Integration with external identity providers
- Single sign-on capabilities

### 2.2. JWT Structure

#### 2.2.1. Standard Claims

```json
{
  "sub": "<user-id>",
  "name": "<username>",
  "iat": 1516239022,
  "exp": 1516246222
}
```

#### 2.2.2. Fineract-Specific Claims

```json
{
  "roles": ["admin", "user"],
  "perms": ["CREATE_CLIENT", "VIEW_LOAN"],
  "off": "<office-id>",
  "tn": "<tenant-id>"
}
```

#### 2.2.3. Hasura Claims

```json
{
  "https://hasura.io/jwt/claims": {
    "x-hasura-allowed-roles": ["admin", "user"],
    "x-hasura-default-role": "user",
    "x-hasura-user-id": "<user-id>",
    "x-hasura-office-id": "<office-id>",
    "x-hasura-tenant-id": "<tenant-id>"
  }
}
```

### 2.3. Authentication Flows

#### 2.3.1. Standard Login Flow

1. User submits username and password
2. Server validates credentials against database
3. On success, server generates JWT tokens (access and refresh)
4. Client stores tokens and includes access token in subsequent requests
5. When access token expires, client uses refresh token to obtain new tokens

#### 2.3.2. Login Flow with 2FA (if enabled)

1. User submits username and password
2. Server validates credentials against database
3. Server returns a temporary token and indicates 2FA is required
4. User completes 2FA verification (OTP, TOTP, etc.)
5. On successful verification, server issues JWT tokens
6. Client stores tokens and includes access token in subsequent requests

## 3. Authorization

### 3.1. Role-Based Access Control

Fineract implements a hierarchical RBAC system:

#### 3.1.1. Roles

- Predefined roles (e.g., admin, user, viewer)
- Custom roles can be created and configured
- Roles can be enabled/disabled
- Users can have multiple roles

#### 3.1.2. Role Hierarchy

- Super-admin: Access to all functions and data
- Admin: Administrative access to specific modules
- Business User: Limited access based on job functions
- Self-Service User: Access to only their own data

### 3.2. Permission Structure

#### 3.2.1. Permission Format

Permissions follow the format: `ACTION_ENTITY` or `ACTION_ENTITY_QUALIFIER`

Examples:
- `CREATE_CLIENT` - Create clients
- `READ_LOAN` - View loan data
- `APPROVE_LOAN_CHECKER` - Approve loans (with checker)

#### 3.2.2. Special Permissions

- `ALL_FUNCTIONS` - Grants access to all system functions
- `BYPASS_TWO_FACTOR` - Allows bypassing 2FA (for technical users)
- `MAKER_CHECKER` - Enables maker-checker workflow for all actions

#### 3.2.3. Permission Assignment

- Permissions are assigned to roles
- Roles are assigned to users
- Permission checks are performed at API and database levels

### 3.3. Data Access Control

#### 3.3.1. Office Hierarchy

- Users are associated with an office in the organizational hierarchy
- Data access is filtered based on office hierarchy
- Users can only access data from their office and subordinate offices

#### 3.3.2. Self-Service Restrictions

- Self-service users can only access their own data
- Associated with a specific client
- Strict permission limits

#### 3.3.3. Multi-tenancy

- Data isolation between tenants
- Tenant-specific configurations
- Cross-tenant operations prohibited (except for system users)

## 4. Two-Factor Authentication

### 4.1. 2FA Methods

Fineract supports multiple 2FA methods:

#### 4.1.1. Email-based OTP

- One-time passwords sent via email
- Configurable OTP length and expiration
- Customizable email templates

#### 4.1.2. SMS-based OTP

- One-time passwords sent via SMS
- Integration with SMS service providers
- Customizable SMS templates

#### 4.1.3. TOTP (Time-based One-Time Password)

- Compatible with authenticator apps (Google Authenticator, Authy, etc.)
- Standard TOTP implementation (RFC 6238)
- QR code-based setup

### 4.2. 2FA Flow

#### 4.2.1. Initial Setup

1. Administrator enables 2FA in system configuration
2. User sets up preferred 2FA method
3. For TOTP, user scans QR code with authenticator app
4. User verifies setup with a test code

#### 4.2.2. Authentication Flow

1. User submits username/password
2. After successful credential validation, server prompts for 2FA
3. User provides 2FA code via the configured method
4. Server validates the code
5. On success, server issues full JWT tokens

### 4.3. Trusted Devices

#### 4.3.1. Device Recognition

- Clients can be marked as trusted devices
- Device identification uses multiple factors:
  - Browser/device fingerprint
  - IP address
  - User agent information

#### 4.3.2. Trust Policy

- Trust expires after a configurable period
- Trusted devices can bypass 2FA (if configured)
- Users can manage their trusted devices
- Administrators can force 2FA for all devices

## 5. Security Considerations

### 5.1. Password Security

- Bcrypt password hashing with per-user salts
- Configurable password complexity requirements
- Password expiration and history policies
- Account lockout after failed attempts

### 5.2. Token Security

- Short-lived access tokens (default 1 hour)
- Refresh tokens with longer lifespans (default 30 days)
- Token revocation mechanisms
- Secure token storage recommendations

### 5.3. Transport Security

- HTTPS required for all API communications
- HTTP Strict Transport Security (HSTS)
- Secure cookie flags (HttpOnly, Secure, SameSite)
- Cross-Origin Resource Sharing (CORS) restrictions

### 5.4. API Security

- Rate limiting for authentication endpoints
- IP-based filtering options
- Protection against common attacks (CSRF, XSS, Injection)
- Security headers configuration

## 6. Integration Guide

### 6.1. Frontend Integration

- How to integrate authentication in web applications
- Mobile application integration
- Handling token management and refresh
- 2FA implementation in user interfaces

### 6.2. API Client Integration

- Authentication flow implementation
- Handling expired tokens
- Managing 2FA challenges
- Error handling

### 6.3. SSO Integration

- Configuring OAuth2 providers
- SAML integration options
- Custom authentication providers

## 7. API Reference

Comprehensive API reference for authentication and authorization endpoints.

### 7.1. Authentication Endpoints

- `/api/auth/login` - User login
- `/api/auth/refresh-token` - Refresh tokens
- `/api/auth/validate-token` - Validate token
- `/api/auth/create-user` - Create user (admin)
- `/api/auth/change-password` - Change user password

### 7.2. Two-Factor Authentication Endpoints

- `/api/auth/two-factor/delivery-methods` - Get 2FA methods
- `/api/auth/two-factor/request-otp` - Request OTP
- `/api/auth/two-factor/validate-otp` - Validate OTP
- `/api/auth/two-factor/setup-totp` - Set up TOTP
- `/api/auth/two-factor/validate-totp` - Validate TOTP
- `/api/auth/two-factor/trusted-devices` - Manage trusted devices

### 7.3. User Management Endpoints

- User CRUD operations
- Role management
- Permission assignment
- Password management

## 8. User Management

### 8.1. User Lifecycle

- User creation process
- User activation and deactivation
- Password reset procedures
- Account lockout and recovery

### 8.2. User Self-Service

- Self-registration (if enabled)
- Profile management
- Password changes
- 2FA enrollment

### 8.3. Administrative Functions

- User management dashboard
- Bulk operations
- Audit trail viewing
- Security policy enforcement

## 9. Password Policies

### 9.1. Password Requirements

- Minimum length (configurable, default 8)
- Character complexity (uppercase, lowercase, numbers, symbols)
- Dictionary word checks
- Username/personal info exclusion

### 9.2. Password Lifecycle

- Password expiration periods
- Password history restrictions
- First-time login password change
- Temporary password handling

### 9.3. Password Recovery

- Self-service password reset
- Administrative password reset
- Account recovery verification

## 10. Audit and Logging

### 10.1. Authentication Events

- Login attempts (successful and failed)
- Token issuance and validation
- 2FA events
- Password changes and resets

### 10.2. Authorization Events

- Permission checks
- Access denials
- Role changes
- Privilege escalations

### 10.3. Audit Reports

- Security audit reports
- Compliance reports
- Anomaly detection
- Forensic analysis tools