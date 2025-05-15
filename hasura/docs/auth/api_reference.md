# Authentication API Reference

This document provides a comprehensive reference for all authentication and authorization related APIs in the Fineract system.

## Table of Contents

1. [Authentication](#1-authentication)
   - [Login](#11-login)
   - [Refresh Token](#12-refresh-token)
   - [Validate Token](#13-validate-token)
   - [Change Password](#14-change-password)
2. [Two-Factor Authentication](#2-two-factor-authentication)
   - [Get Delivery Methods](#21-get-delivery-methods)
   - [Request OTP](#22-request-otp)
   - [Validate OTP](#23-validate-otp)
   - [TOTP Setup](#24-totp-setup)
   - [Verify TOTP Setup](#25-verify-totp-setup)
   - [Validate TOTP](#26-validate-totp)
   - [Trusted Devices](#27-trusted-devices)
3. [User Management](#3-user-management)
   - [Create User](#31-create-user)
   - [Update User](#32-update-user)
   - [Get User](#33-get-user)
   - [List Users](#34-list-users)
   - [Disable User](#35-disable-user)
4. [Role Management](#4-role-management)
   - [Create Role](#41-create-role)
   - [Update Role](#42-update-role)
   - [Get Role](#43-get-role)
   - [List Roles](#44-list-roles)
   - [Assign Role](#45-assign-role)
5. [Permission Management](#5-permission-management)
   - [List Permissions](#51-list-permissions)
   - [Check Permissions](#52-check-permissions)
6. [Admin Operations](#6-admin-operations)
   - [Force Password Change](#61-force-password-change)
   - [Unlock Account](#62-unlock-account)
   - [System Configuration](#63-system-configuration)

## 1. Authentication

### 1.1. Login

Authenticates a user and returns JWT tokens.

#### GraphQL

**Mutation:**
```graphql
mutation Login($input: LoginInput!) {
  auth_login(input: $input) {
    success
    message
    accessToken
    refreshToken
    tokenType
    expiresIn
    roles
    permissions {
      grouping
      code
      entityName
      actionName
    }
    userBasicInfo {
      id
      username
      email
      firstname
      lastname
      displayName
      officeId
      officeName
      staffId
      staffName
      lastLogin
      isSuperUser
      tenantId
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "username": "admin",
    "password": "password123",
    "tenantId": "default"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_login": {
      "success": true,
      "message": "Authentication successful",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 3600,
      "roles": ["admin"],
      "permissions": [
        {
          "grouping": "special",
          "code": "ALL_FUNCTIONS",
          "entityName": "ALL",
          "actionName": "ALL"
        }
      ],
      "userBasicInfo": {
        "id": "1",
        "username": "admin",
        "email": "admin@example.com",
        "firstname": "System",
        "lastname": "Administrator",
        "displayName": "System Administrator",
        "officeId": "1",
        "officeName": "Head Office",
        "staffId": null,
        "staffName": null,
        "lastLogin": "2023-05-15T10:30:00Z",
        "isSuperUser": true,
        "tenantId": "default"
      }
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "admin",
  "password": "password123",
  "tenantId": "default"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "roles": ["admin"],
  "permissions": [
    {
      "grouping": "special",
      "code": "ALL_FUNCTIONS",
      "entityName": "ALL",
      "actionName": "ALL"
    }
  ],
  "userBasicInfo": {
    "id": "1",
    "username": "admin",
    "email": "admin@example.com",
    "firstname": "System",
    "lastname": "Administrator",
    "displayName": "System Administrator",
    "officeId": "1",
    "officeName": "Head Office",
    "staffId": null,
    "staffName": null,
    "lastLogin": "2023-05-15T10:30:00Z",
    "isSuperUser": true,
    "tenantId": "default"
  }
}
```

### 1.2. Refresh Token

Refreshes an expired access token using a refresh token.

#### GraphQL

**Mutation:**
```graphql
mutation RefreshToken($input: RefreshTokenInput!) {
  auth_refresh_token(input: $input) {
    success
    message
    accessToken
    refreshToken
    tokenType
    expiresIn
  }
}
```

**Variables:**
```json
{
  "input": {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_refresh_token": {
      "success": true,
      "message": "Token refreshed successfully",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/refresh-token`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### 1.3. Validate Token

Validates a JWT token and returns decoded information.

#### GraphQL

**Mutation:**
```graphql
mutation ValidateToken($input: ValidateTokenInput!) {
  auth_validate_token(input: $input) {
    success
    message
    decoded
  }
}
```

**Variables:**
```json
{
  "input": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_validate_token": {
      "success": true,
      "message": "Token is valid",
      "decoded": {
        "sub": "1",
        "name": "admin",
        "roles": ["admin"],
        "iat": 1620000000,
        "exp": 1620003600,
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": ["admin"],
          "x-hasura-default-role": "admin",
          "x-hasura-user-id": "1"
        }
      }
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/validate-token`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "decoded": {
    "sub": "1",
    "name": "admin",
    "roles": ["admin"],
    "iat": 1620000000,
    "exp": 1620003600,
    "https://hasura.io/jwt/claims": {
      "x-hasura-allowed-roles": ["admin"],
      "x-hasura-default-role": "admin",
      "x-hasura-user-id": "1"
    }
  }
}
```

### 1.4. Change Password

Allows a user to change their password.

#### GraphQL

**Mutation:**
```graphql
mutation ChangePassword($input: ChangePasswordInput!) {
  auth_change_password(input: $input) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "input": {
    "oldPassword": "password123",
    "newPassword": "newPassword456",
    "repeatPassword": "newPassword456"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_change_password": {
      "success": true,
      "message": "Password changed successfully"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/change-password`

**Request:**
```json
{
  "oldPassword": "password123",
  "newPassword": "newPassword456",
  "repeatPassword": "newPassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## 2. Two-Factor Authentication

### 2.1. Get Delivery Methods

Gets available 2FA delivery methods for the current user.

#### GraphQL

**Query:**
```graphql
query GetTwoFactorMethods {
  auth_two_factor_methods {
    name
    target
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_two_factor_methods": [
      {
        "name": "EMAIL",
        "target": "user@example.com"
      },
      {
        "name": "TOTP",
        "target": "Authenticator App"
      }
    ]
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/two-factor/delivery-methods`

**Response:**
```json
[
  {
    "name": "EMAIL",
    "target": "user@example.com"
  },
  {
    "name": "TOTP",
    "target": "Authenticator App"
  }
]
```

### 2.2. Request OTP

Requests a one-time password via a specified delivery method.

#### GraphQL

**Mutation:**
```graphql
mutation RequestOTP($input: RequestOTPInput!) {
  auth_request_otp(input: $input) {
    deliveryMethod {
      name
      target
    }
    tokenLiveTimeInSec
    extendedAccessToken
  }
}
```

**Variables:**
```json
{
  "input": {
    "deliveryMethod": "EMAIL",
    "extendedToken": false
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_request_otp": {
      "deliveryMethod": {
        "name": "EMAIL",
        "target": "user@example.com"
      },
      "tokenLiveTimeInSec": 300,
      "extendedAccessToken": false
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/two-factor/request-otp`

**Request:**
```json
{
  "deliveryMethod": "EMAIL",
  "extendedToken": false
}
```

**Response:**
```json
{
  "deliveryMethod": {
    "name": "EMAIL",
    "target": "user@example.com"
  },
  "tokenLiveTimeInSec": 300,
  "extendedAccessToken": false
}
```

### 2.3. Validate OTP

Validates a one-time password and returns an access token.

#### GraphQL

**Mutation:**
```graphql
mutation ValidateOTP($input: ValidateOTPInput!) {
  auth_validate_otp(input: $input) {
    token
    validFrom
    validTo
  }
}
```

**Variables:**
```json
{
  "input": {
    "token": "123456",
    "deviceInfo": {
      "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "deviceName": "Chrome on Windows 10",
      "deviceType": "browser",
      "trustDevice": true
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_validate_otp": {
      "token": "2fa-access-token",
      "validFrom": "2023-05-15T14:30:00Z",
      "validTo": "2023-05-16T14:30:00Z"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/two-factor/validate-otp`

**Request:**
```json
{
  "token": "123456",
  "deviceInfo": {
    "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "deviceName": "Chrome on Windows 10",
    "deviceType": "browser",
    "trustDevice": true
  }
}
```

**Response:**
```json
{
  "token": "2fa-access-token",
  "validFrom": "2023-05-15T14:30:00Z",
  "validTo": "2023-05-16T14:30:00Z"
}
```

### 2.4. TOTP Setup

Sets up TOTP for the current user.

#### GraphQL

**Mutation:**
```graphql
mutation SetupTOTP {
  auth_setup_totp {
    secretKey
    qrCodeUrl
    enabled
    verified
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_setup_totp": {
      "secretKey": "BASE32ENCODEDKEY",
      "qrCodeUrl": "data:image/png;base64,...",
      "enabled": false,
      "verified": false
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/two-factor/setup-totp`

**Response:**
```json
{
  "secretKey": "BASE32ENCODEDKEY",
  "qrCodeUrl": "data:image/png;base64,...",
  "enabled": false,
  "verified": false
}
```

### 2.5. Verify TOTP Setup

Verifies TOTP setup with a token.

#### GraphQL

**Mutation:**
```graphql
mutation VerifyTOTPSetup($input: VerifyTOTPSetupInput!) {
  auth_verify_totp_setup(input: $input) {
    success
  }
}
```

**Variables:**
```json
{
  "input": {
    "secretKey": "BASE32ENCODEDKEY",
    "token": "123456"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_verify_totp_setup": {
      "success": true
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/two-factor/verify-totp-setup`

**Request:**
```json
{
  "secretKey": "BASE32ENCODEDKEY",
  "token": "123456"
}
```

**Response:**
```json
{
  "success": true
}
```

### 2.6. Validate TOTP

Validates a TOTP code and returns an access token.

#### GraphQL

**Mutation:**
```graphql
mutation ValidateTOTP($input: ValidateTOTPInput!) {
  auth_validate_totp(input: $input) {
    token
    validFrom
    validTo
  }
}
```

**Variables:**
```json
{
  "input": {
    "token": "123456",
    "deviceInfo": {
      "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "deviceName": "Chrome on Windows 10",
      "deviceType": "browser",
      "trustDevice": true
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_validate_totp": {
      "token": "2fa-access-token",
      "validFrom": "2023-05-15T14:30:00Z",
      "validTo": "2023-05-16T14:30:00Z"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/two-factor/validate-totp`

**Request:**
```json
{
  "token": "123456",
  "deviceInfo": {
    "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "deviceName": "Chrome on Windows 10",
    "deviceType": "browser",
    "trustDevice": true
  }
}
```

**Response:**
```json
{
  "token": "2fa-access-token",
  "validFrom": "2023-05-15T14:30:00Z",
  "validTo": "2023-05-16T14:30:00Z"
}
```

### 2.7. Trusted Devices

#### 2.7.1. Get Trusted Devices

Gets trusted devices for the current user.

##### GraphQL

**Query:**
```graphql
query GetTrustedDevices {
  auth_trusted_devices {
    id
    deviceId
    deviceName
    deviceType
    lastIp
    lastUsed
    expiresAt
    trusted
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_trusted_devices": [
      {
        "id": 1,
        "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
        "deviceName": "Chrome on Windows 10",
        "deviceType": "browser",
        "lastIp": "192.168.1.1",
        "lastUsed": "2023-05-15T14:30:00Z",
        "expiresAt": "2023-06-15T14:30:00Z",
        "trusted": true
      }
    ]
  }
}
```

##### REST API

**Endpoint:** `GET /api/auth/two-factor/trusted-devices`

**Response:**
```json
[
  {
    "id": 1,
    "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "deviceName": "Chrome on Windows 10",
    "deviceType": "browser",
    "lastIp": "192.168.1.1",
    "lastUsed": "2023-05-15T14:30:00Z",
    "expiresAt": "2023-06-15T14:30:00Z",
    "trusted": true
  }
]
```

#### 2.7.2. Update Trusted Device

Updates the trust status of a device.

##### GraphQL

**Mutation:**
```graphql
mutation UpdateTrustedDevice($input: UpdateTrustedDeviceInput!) {
  auth_update_trusted_device(input: $input) {
    success
  }
}
```

**Variables:**
```json
{
  "input": {
    "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "trusted": false
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_update_trusted_device": {
      "success": true
    }
  }
}
```

##### REST API

**Endpoint:** `POST /api/auth/two-factor/update-trusted-device`

**Request:**
```json
{
  "deviceId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "trusted": false
}
```

**Response:**
```json
{
  "success": true
}
```

## 3. User Management

### 3.1. Create User

Creates a new user account (admin only).

#### GraphQL

**Mutation:**
```graphql
mutation CreateUser($input: CreateUserInput!) {
  auth_create_user(input: $input) {
    success
    message
    userId
  }
}
```

**Variables:**
```json
{
  "input": {
    "username": "newuser",
    "email": "newuser@example.com",
    "firstname": "New",
    "lastname": "User",
    "password": "Password123",
    "repeatPassword": "Password123",
    "officeId": "1",
    "staffId": "2",
    "roles": ["user"],
    "isSelfServiceUser": false,
    "sendPasswordToEmail": true
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_create_user": {
      "success": true,
      "message": "User created successfully",
      "userId": "10"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/create-user`

**Request:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "firstname": "New",
  "lastname": "User",
  "password": "Password123",
  "repeatPassword": "Password123",
  "officeId": "1",
  "staffId": "2",
  "roles": ["user"],
  "isSelfServiceUser": false,
  "sendPasswordToEmail": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "userId": "10"
}
```

### 3.2. Update User

Updates an existing user (admin or self).

#### GraphQL

**Mutation:**
```graphql
mutation UpdateUser($input: UpdateUserInput!) {
  auth_update_user(input: $input) {
    success
    message
    user {
      id
      username
      email
      firstname
      lastname
      displayName
      officeId
      officeName
      staffId
      staffName
      roles
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "10",
    "email": "updateduser@example.com",
    "firstname": "Updated",
    "lastname": "User",
    "officeId": "2",
    "staffId": "3",
    "roles": ["user", "reporter"]
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_update_user": {
      "success": true,
      "message": "User updated successfully",
      "user": {
        "id": "10",
        "username": "newuser",
        "email": "updateduser@example.com",
        "firstname": "Updated",
        "lastname": "User",
        "displayName": "Updated User",
        "officeId": "2",
        "officeName": "Branch Office",
        "staffId": "3",
        "staffName": "Staff Name",
        "roles": ["user", "reporter"]
      }
    }
  }
}
```

#### REST API

**Endpoint:** `PUT /api/auth/update-user`

**Request:**
```json
{
  "userId": "10",
  "email": "updateduser@example.com",
  "firstname": "Updated",
  "lastname": "User",
  "officeId": "2",
  "staffId": "3",
  "roles": ["user", "reporter"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": "10",
    "username": "newuser",
    "email": "updateduser@example.com",
    "firstname": "Updated",
    "lastname": "User",
    "displayName": "Updated User",
    "officeId": "2",
    "officeName": "Branch Office",
    "staffId": "3",
    "staffName": "Staff Name",
    "roles": ["user", "reporter"]
  }
}
```

### 3.3. Get User

Gets user details by ID (admin) or current user (self).

#### GraphQL

**Query:**
```graphql
query GetUser($userId: ID) {
  auth_get_user(userId: $userId) {
    id
    username
    email
    firstname
    lastname
    displayName
    officeId
    officeName
    staffId
    staffName
    lastLogin
    isSuperUser
    roles
    permissions {
      grouping
      code
      entityName
      actionName
    }
  }
}
```

**Variables:**
```json
{
  "userId": "10"
}
```

**Response:**
```json
{
  "data": {
    "auth_get_user": {
      "id": "10",
      "username": "newuser",
      "email": "updateduser@example.com",
      "firstname": "Updated",
      "lastname": "User",
      "displayName": "Updated User",
      "officeId": "2",
      "officeName": "Branch Office",
      "staffId": "3",
      "staffName": "Staff Name",
      "lastLogin": "2023-05-15T10:30:00Z",
      "isSuperUser": false,
      "roles": ["user", "reporter"],
      "permissions": [
        {
          "grouping": "portfolio",
          "code": "READ_CLIENT",
          "entityName": "CLIENT",
          "actionName": "READ"
        }
      ]
    }
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/user/{userId}`

**Response:**
```json
{
  "id": "10",
  "username": "newuser",
  "email": "updateduser@example.com",
  "firstname": "Updated",
  "lastname": "User",
  "displayName": "Updated User",
  "officeId": "2",
  "officeName": "Branch Office",
  "staffId": "3",
  "staffName": "Staff Name",
  "lastLogin": "2023-05-15T10:30:00Z",
  "isSuperUser": false,
  "roles": ["user", "reporter"],
  "permissions": [
    {
      "grouping": "portfolio",
      "code": "READ_CLIENT",
      "entityName": "CLIENT",
      "actionName": "READ"
    }
  ]
}
```

### 3.4. List Users

Lists users with filtering and pagination.

#### GraphQL

**Query:**
```graphql
query ListUsers($filter: UserFilterInput, $pagination: PaginationInput) {
  auth_list_users(filter: $filter, pagination: $pagination) {
    totalCount
    pageSize
    pageNumber
    totalPages
    users {
      id
      username
      displayName
      email
      officeId
      officeName
      roles
      enabled
      lastLogin
    }
  }
}
```

**Variables:**
```json
{
  "filter": {
    "office": "2",
    "role": "user",
    "status": "ENABLED"
  },
  "pagination": {
    "pageSize": 10,
    "pageNumber": 1
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_list_users": {
      "totalCount": 1,
      "pageSize": 10,
      "pageNumber": 1,
      "totalPages": 1,
      "users": [
        {
          "id": "10",
          "username": "newuser",
          "displayName": "Updated User",
          "email": "updateduser@example.com",
          "officeId": "2",
          "officeName": "Branch Office",
          "roles": ["user", "reporter"],
          "enabled": true,
          "lastLogin": "2023-05-15T10:30:00Z"
        }
      ]
    }
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/users?office=2&role=user&status=ENABLED&pageSize=10&pageNumber=1`

**Response:**
```json
{
  "totalCount": 1,
  "pageSize": 10,
  "pageNumber": 1,
  "totalPages": 1,
  "users": [
    {
      "id": "10",
      "username": "newuser",
      "displayName": "Updated User",
      "email": "updateduser@example.com",
      "officeId": "2",
      "officeName": "Branch Office",
      "roles": ["user", "reporter"],
      "enabled": true,
      "lastLogin": "2023-05-15T10:30:00Z"
    }
  ]
}
```

### 3.5. Disable User

Disables a user account (admin only).

#### GraphQL

**Mutation:**
```graphql
mutation DisableUser($input: DisableUserInput!) {
  auth_disable_user(input: $input) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "10"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_disable_user": {
      "success": true,
      "message": "User disabled successfully"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/disable-user`

**Request:**
```json
{
  "userId": "10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User disabled successfully"
}
```

## 4. Role Management

### 4.1. Create Role

Creates a new role with permissions (admin only).

#### GraphQL

**Mutation:**
```graphql
mutation CreateRole($input: CreateRoleInput!) {
  auth_create_role(input: $input) {
    success
    message
    roleId
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "loan_officer",
    "description": "Loan officer with client and loan access",
    "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN"]
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_create_role": {
      "success": true,
      "message": "Role created successfully",
      "roleId": "5"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/create-role`

**Request:**
```json
{
  "name": "loan_officer",
  "description": "Loan officer with client and loan access",
  "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role created successfully",
  "roleId": "5"
}
```

### 4.2. Update Role

Updates an existing role (admin only).

#### GraphQL

**Mutation:**
```graphql
mutation UpdateRole($input: UpdateRoleInput!) {
  auth_update_role(input: $input) {
    success
    message
    role {
      id
      name
      description
      permissions
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "roleId": "5",
    "description": "Updated loan officer role",
    "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN", "APPROVE_LOAN"]
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_update_role": {
      "success": true,
      "message": "Role updated successfully",
      "role": {
        "id": "5",
        "name": "loan_officer",
        "description": "Updated loan officer role",
        "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN", "APPROVE_LOAN"]
      }
    }
  }
}
```

#### REST API

**Endpoint:** `PUT /api/auth/update-role`

**Request:**
```json
{
  "roleId": "5",
  "description": "Updated loan officer role",
  "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN", "APPROVE_LOAN"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role updated successfully",
  "role": {
    "id": "5",
    "name": "loan_officer",
    "description": "Updated loan officer role",
    "permissions": ["READ_CLIENT", "CREATE_CLIENT", "READ_LOAN", "CREATE_LOAN", "APPROVE_LOAN"]
  }
}
```

### 4.3. Get Role

Gets role details by ID.

#### GraphQL

**Query:**
```graphql
query GetRole($roleId: ID!) {
  auth_get_role(roleId: $roleId) {
    id
    name
    description
    enabled
    permissions {
      code
      grouping
      entityName
      actionName
    }
    userCount
  }
}
```

**Variables:**
```json
{
  "roleId": "5"
}
```

**Response:**
```json
{
  "data": {
    "auth_get_role": {
      "id": "5",
      "name": "loan_officer",
      "description": "Updated loan officer role",
      "enabled": true,
      "permissions": [
        {
          "code": "READ_CLIENT",
          "grouping": "portfolio",
          "entityName": "CLIENT",
          "actionName": "READ"
        },
        {
          "code": "CREATE_CLIENT",
          "grouping": "portfolio",
          "entityName": "CLIENT",
          "actionName": "CREATE"
        },
        {
          "code": "READ_LOAN",
          "grouping": "portfolio",
          "entityName": "LOAN",
          "actionName": "READ"
        },
        {
          "code": "CREATE_LOAN",
          "grouping": "portfolio",
          "entityName": "LOAN",
          "actionName": "CREATE"
        },
        {
          "code": "APPROVE_LOAN",
          "grouping": "portfolio",
          "entityName": "LOAN",
          "actionName": "APPROVE"
        }
      ],
      "userCount": 1
    }
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/role/{roleId}`

**Response:**
```json
{
  "id": "5",
  "name": "loan_officer",
  "description": "Updated loan officer role",
  "enabled": true,
  "permissions": [
    {
      "code": "READ_CLIENT",
      "grouping": "portfolio",
      "entityName": "CLIENT",
      "actionName": "READ"
    },
    {
      "code": "CREATE_CLIENT",
      "grouping": "portfolio",
      "entityName": "CLIENT",
      "actionName": "CREATE"
    },
    {
      "code": "READ_LOAN",
      "grouping": "portfolio",
      "entityName": "LOAN",
      "actionName": "READ"
    },
    {
      "code": "CREATE_LOAN",
      "grouping": "portfolio",
      "entityName": "LOAN",
      "actionName": "CREATE"
    },
    {
      "code": "APPROVE_LOAN",
      "grouping": "portfolio",
      "entityName": "LOAN",
      "actionName": "APPROVE"
    }
  ],
  "userCount": 1
}
```

### 4.4. List Roles

Lists roles with filtering.

#### GraphQL

**Query:**
```graphql
query ListRoles($filter: RoleFilterInput) {
  auth_list_roles(filter: $filter) {
    roles {
      id
      name
      description
      enabled
      userCount
    }
  }
}
```

**Variables:**
```json
{
  "filter": {
    "enabled": true
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_list_roles": {
      "roles": [
        {
          "id": "1",
          "name": "admin",
          "description": "Administrator with all permissions",
          "enabled": true,
          "userCount": 1
        },
        {
          "id": "2",
          "name": "user",
          "description": "Standard user",
          "enabled": true,
          "userCount": 3
        },
        {
          "id": "5",
          "name": "loan_officer",
          "description": "Updated loan officer role",
          "enabled": true,
          "userCount": 1
        }
      ]
    }
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/roles?enabled=true`

**Response:**
```json
{
  "roles": [
    {
      "id": "1",
      "name": "admin",
      "description": "Administrator with all permissions",
      "enabled": true,
      "userCount": 1
    },
    {
      "id": "2",
      "name": "user",
      "description": "Standard user",
      "enabled": true,
      "userCount": 3
    },
    {
      "id": "5",
      "name": "loan_officer",
      "description": "Updated loan officer role",
      "enabled": true,
      "userCount": 1
    }
  ]
}
```

### 4.5. Assign Role

Assigns a role to a user.

#### GraphQL

**Mutation:**
```graphql
mutation AssignRole($input: AssignRoleInput!) {
  auth_assign_role(input: $input) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "10",
    "roleId": "5"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_assign_role": {
      "success": true,
      "message": "Role assigned successfully"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/assign-role`

**Request:**
```json
{
  "userId": "10",
  "roleId": "5"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role assigned successfully"
}
```

## 5. Permission Management

### 5.1. List Permissions

Lists all available permissions.

#### GraphQL

**Query:**
```graphql
query ListPermissions {
  auth_list_permissions {
    permissions {
      code
      grouping
      entityName
      actionName
      description
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_list_permissions": {
      "permissions": [
        {
          "code": "ALL_FUNCTIONS",
          "grouping": "special",
          "entityName": "ALL",
          "actionName": "ALL",
          "description": "All system functions"
        },
        {
          "code": "READ_CLIENT",
          "grouping": "portfolio",
          "entityName": "CLIENT",
          "actionName": "READ",
          "description": "Read client information"
        },
        {
          "code": "CREATE_CLIENT",
          "grouping": "portfolio",
          "entityName": "CLIENT",
          "actionName": "CREATE",
          "description": "Create new clients"
        }
      ]
    }
  }
}
```

#### REST API

**Endpoint:** `GET /api/auth/permissions`

**Response:**
```json
{
  "permissions": [
    {
      "code": "ALL_FUNCTIONS",
      "grouping": "special",
      "entityName": "ALL",
      "actionName": "ALL",
      "description": "All system functions"
    },
    {
      "code": "READ_CLIENT",
      "grouping": "portfolio",
      "entityName": "CLIENT",
      "actionName": "READ",
      "description": "Read client information"
    },
    {
      "code": "CREATE_CLIENT",
      "grouping": "portfolio",
      "entityName": "CLIENT",
      "actionName": "CREATE",
      "description": "Create new clients"
    }
  ]
}
```

### 5.2. Check Permissions

Checks if the current user has specific permissions.

#### GraphQL

**Query:**
```graphql
query CheckPermissions($permissions: [String!]!) {
  auth_check_permissions(permissions: $permissions) {
    hasPermission
    missingPermissions
  }
}
```

**Variables:**
```json
{
  "permissions": ["READ_CLIENT", "CREATE_LOAN"]
}
```

**Response:**
```json
{
  "data": {
    "auth_check_permissions": {
      "hasPermission": true,
      "missingPermissions": []
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/check-permissions`

**Request:**
```json
{
  "permissions": ["READ_CLIENT", "CREATE_LOAN"]
}
```

**Response:**
```json
{
  "hasPermission": true,
  "missingPermissions": []
}
```

## 6. Admin Operations

### 6.1. Force Password Change

Forces a user to change their password on next login.

#### GraphQL

**Mutation:**
```graphql
mutation ForcePasswordChange($input: ForcePasswordChangeInput!) {
  auth_force_password_change(input: $input) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "10"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_force_password_change": {
      "success": true,
      "message": "User will be required to change password on next login"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/force-password-change`

**Request:**
```json
{
  "userId": "10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User will be required to change password on next login"
}
```

### 6.2. Unlock Account

Unlocks a locked user account.

#### GraphQL

**Mutation:**
```graphql
mutation UnlockAccount($input: UnlockAccountInput!) {
  auth_unlock_account(input: $input) {
    success
    message
  }
}
```

**Variables:**
```json
{
  "input": {
    "userId": "10"
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_unlock_account": {
      "success": true,
      "message": "Account unlocked successfully"
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/unlock-account`

**Request:**
```json
{
  "userId": "10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account unlocked successfully"
}
```

### 6.3. System Configuration

Updates authentication and security system configuration.

#### GraphQL

**Mutation:**
```graphql
mutation UpdateSecurityConfig($input: SecurityConfigInput!) {
  auth_update_security_config(input: $input) {
    success
    message
    config {
      passwordPolicyEnabled
      minimumPasswordLength
      passwordComplexityEnabled
      passwordExpiryDays
      accountLockoutAttempts
      twoFactorEnabled
      twoFactorRequired
      sessionTimeoutMinutes
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "passwordPolicyEnabled": true,
    "minimumPasswordLength": 8,
    "passwordComplexityEnabled": true,
    "passwordExpiryDays": 90,
    "accountLockoutAttempts": 5,
    "twoFactorEnabled": true,
    "twoFactorRequired": false,
    "sessionTimeoutMinutes": 30
  }
}
```

**Response:**
```json
{
  "data": {
    "auth_update_security_config": {
      "success": true,
      "message": "Security configuration updated successfully",
      "config": {
        "passwordPolicyEnabled": true,
        "minimumPasswordLength": 8,
        "passwordComplexityEnabled": true,
        "passwordExpiryDays": 90,
        "accountLockoutAttempts": 5,
        "twoFactorEnabled": true,
        "twoFactorRequired": false,
        "sessionTimeoutMinutes": 30
      }
    }
  }
}
```

#### REST API

**Endpoint:** `POST /api/auth/update-security-config`

**Request:**
```json
{
  "passwordPolicyEnabled": true,
  "minimumPasswordLength": 8,
  "passwordComplexityEnabled": true,
  "passwordExpiryDays": 90,
  "accountLockoutAttempts": 5,
  "twoFactorEnabled": true,
  "twoFactorRequired": false,
  "sessionTimeoutMinutes": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Security configuration updated successfully",
  "config": {
    "passwordPolicyEnabled": true,
    "minimumPasswordLength": 8,
    "passwordComplexityEnabled": true,
    "passwordExpiryDays": 90,
    "accountLockoutAttempts": 5,
    "twoFactorEnabled": true,
    "twoFactorRequired": false,
    "sessionTimeoutMinutes": 30
  }
}
```