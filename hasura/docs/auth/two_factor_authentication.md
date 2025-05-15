# Two-Factor Authentication (2FA) Guide

This document provides a comprehensive guide to Fineract's Two-Factor Authentication (2FA) system, including implementation details, integration guidelines, and best practices.

## Table of Contents

1. [Introduction](#1-introduction)
2. [2FA Methods](#2-2fa-methods)
3. [System Architecture](#3-system-architecture)
4. [Configuration](#4-configuration)
5. [Implementation](#5-implementation)
6. [API Reference](#6-api-reference)
7. [Frontend Integration](#7-frontend-integration)
8. [Security Considerations](#8-security-considerations)
9. [Troubleshooting](#9-troubleshooting)
10. [Best Practices](#10-best-practices)

## 1. Introduction

Two-Factor Authentication (2FA) adds an additional layer of security to the authentication process by requiring users to provide two different authentication factors: something they know (password) and something they have (a device-generated code, email access, or phone access).

### 1.1. Benefits of 2FA

- **Enhanced Security**: Significantly reduces the risk of unauthorized access
- **Compliance**: Meets regulatory requirements for secure authentication
- **User Confidence**: Provides users with greater confidence in the system's security
- **Fraud Prevention**: Helps prevent account takeovers and unauthorized transactions

### 1.2. When 2FA is Required

2FA can be configured to be required in various situations:

- For all users (system-wide setting)
- For specific user roles
- For specific high-security operations
- Based on risk assessment (suspicious login locations, unusual activities)

## 2. 2FA Methods

Fineract's 2FA system supports multiple authentication methods:

### 2.1. Email-Based OTP

- One-time passwords sent to the user's registered email
- Configurable token length and expiration time
- Customizable email templates
- Requires valid email addresses for all users

### 2.2. SMS-Based OTP

- One-time passwords sent via SMS to the user's registered phone number
- Configurable token length and expiration time
- Customizable SMS templates
- Requires integration with SMS gateway providers

### 2.3. TOTP (Time-Based One-Time Password)

- Standard TOTP implementation (RFC 6238)
- Compatible with authenticator apps like Google Authenticator, Authy, Microsoft Authenticator
- Based on a shared secret key and the current time
- Generates 6-digit codes that change every 30 seconds

### 2.4. Trusted Devices

- Allows users to mark devices as trusted
- Trusted devices can bypass 2FA for a configurable period
- Based on device fingerprinting and user confirmation
- Can be revoked by users or administrators at any time

## 3. System Architecture

### 3.1. Database Schema

The 2FA system uses the following database tables:

#### 3.1.1. `two_factor_configuration`

Stores system-wide 2FA settings:

| Column | Type | Description |
|--------|------|-------------|
| `name` | VARCHAR | Configuration key name |
| `value` | TEXT | Configuration value |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

Common configuration items include:
- `otp-delivery-email-enable`: Enable/disable email delivery (true/false)
- `otp-delivery-sms-enable`: Enable/disable SMS delivery (true/false)
- `totp-enabled`: Enable/disable TOTP (true/false)
- `trusted-devices-enabled`: Enable/disable trusted devices (true/false)
- `otp-token-length`: Length of OTP tokens (default: 6)
- `otp-token-live-time`: OTP validity period in seconds (default: 300)
- `access-token-live-time`: 2FA access token validity period in seconds (default: 86400)
- `trusted-device-live-time`: Trusted device validity period in seconds (default: 2592000)

#### 3.1.2. `two_factor_access_token`

Stores 2FA access tokens:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | User ID |
| `token` | VARCHAR | Access token |
| `valid_from` | TIMESTAMP | Token validity start |
| `valid_to` | TIMESTAMP | Token validity end |
| `enabled` | BOOLEAN | Token enabled status |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### 3.1.3. `otp_request`

Tracks OTP requests and validation:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | User ID |
| `token` | VARCHAR | OTP token |
| `valid_to` | TIMESTAMP | Token validity end |
| `delivery_method` | VARCHAR | Delivery method (EMAIL/SMS) |
| `delivery_target` | VARCHAR | Email or phone number |
| `extended_access_token` | BOOLEAN | Flag for extended token validity |
| `created_at` | TIMESTAMP | Creation timestamp |

#### 3.1.4. `totp_secret`

Stores TOTP secrets for users:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | User ID |
| `secret_key` | VARCHAR | TOTP secret key (base32 encoded) |
| `enabled` | BOOLEAN | TOTP enabled status |
| `verified` | BOOLEAN | TOTP verification status |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### 3.1.5. `trusted_device`

Manages trusted devices:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `user_id` | BIGINT | User ID |
| `device_id` | VARCHAR | Unique device identifier |
| `device_name` | VARCHAR | Device name/description |
| `device_type` | VARCHAR | Device type (browser, mobile, etc.) |
| `last_ip` | VARCHAR | Last IP address |
| `last_used` | TIMESTAMP | Last usage timestamp |
| `expires_at` | TIMESTAMP | Trust expiration timestamp |
| `trusted` | BOOLEAN | Trust status |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

### 3.2. Service Architecture

The 2FA system consists of the following components:

1. **Authentication Service**: Handles login and 2FA flow
2. **OTP Generator/Validator**: Generates and validates one-time passwords
3. **Email Delivery Service**: Sends OTP emails
4. **SMS Delivery Service**: Sends OTP SMS messages
5. **TOTP Service**: Manages TOTP setup and validation
6. **Trusted Device Service**: Handles device trust management

## 4. Configuration

### 4.1. System-Wide Configuration

Administrators can configure the following 2FA settings:

#### 4.1.1. General Settings

- Enable/disable 2FA system-wide
- Force 2FA for all users or specific roles
- Allow users to bypass 2FA on trusted devices
- Specify 2FA token validity periods

#### 4.1.2. Email Delivery Settings

- Enable/disable email delivery
- Configure email templates
- Set email sender address and name
- Configure SMTP settings

#### 4.1.3. SMS Delivery Settings

- Enable/disable SMS delivery
- Select SMS provider
- Configure SMS templates
- Set delivery timeout and retry policy

#### 4.1.4. TOTP Settings

- Enable/disable TOTP
- Configure token parameters (digits, algorithm)
- Customize QR code appearance
- Set clock drift tolerance

#### 4.1.5. Trusted Device Settings

- Enable/disable trusted devices
- Set trust validity period
- Configure device identification parameters
- Set maximum number of trusted devices per user

### 4.2. User-Level Configuration

Users can configure their 2FA preferences:

- Select preferred 2FA method (if multiple are enabled)
- Enable/disable TOTP for their account
- Manage their trusted devices
- Set up and verify their 2FA methods

## 5. Implementation

### 5.1. 2FA Implementation Process

The typical implementation process includes:

1. **Enable 2FA**: System administrator enables 2FA system-wide or for specific user roles
2. **Configure Delivery Methods**: Set up email and/or SMS delivery
3. **User Enrollment**: Users set up their preferred 2FA method
4. **Testing**: Verify 2FA functionality with test accounts
5. **Monitoring**: Monitor 2FA usage and success rates

### 5.2. Authentication Flow

#### 5.2.1. Standard Login with 2FA

1. User provides username and password
2. System validates credentials
3. If 2FA is required, system returns a temporary token and 2FA challenge
4. User receives or generates 2FA code (via email, SMS, or authenticator app)
5. User submits 2FA code
6. System validates the code
7. If valid, system issues full authentication tokens

#### 5.2.2. Trusted Device Flow

1. User completes standard 2FA flow
2. User chooses to trust the current device
3. System stores device information with trust status
4. On subsequent logins from the same device, 2FA may be bypassed based on configuration

### 5.3. OTP Generation and Validation

- OTPs are randomly generated numeric codes
- Default length is 6 digits (configurable)
- OTPs are valid for a limited time (default 5 minutes)
- OTPs can only be used once
- Invalid OTP attempts are logged

### 5.4. TOTP Implementation

- Based on the TOTP standard (RFC 6238)
- 6-digit codes that change every 30 seconds
- QR code setup for easy enrollment in authenticator apps
- Verification required during initial setup
- Clock drift tolerance of ±1 time step (30 seconds)

### 5.5. Trusted Device Implementation

- Devices are identified using multiple factors:
  - Browser/device fingerprint
  - User agent
  - IP information
- Trust is established only after successful 2FA
- Trust has a configurable expiration period
- Trust can be revoked by the user or administrator

## 6. API Reference

The following GraphQL operations are available for 2FA:

### 6.1. Queries

#### 6.1.1. Get Available 2FA Methods

```graphql
query GetTwoFactorMethods {
  auth_two_factor_methods {
    name
    target
  }
}
```

Response:
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

#### 6.1.2. Get TOTP Configuration

```graphql
query GetTOTPConfiguration {
  auth_totp_configuration {
    secretKey
    qrCodeUrl
    enabled
    verified
  }
}
```

Response:
```json
{
  "data": {
    "auth_totp_configuration": {
      "secretKey": "BASE32ENCODEDKEY",
      "qrCodeUrl": "data:image/png;base64,...",
      "enabled": true,
      "verified": true
    }
  }
}
```

#### 6.1.3. Get Trusted Devices

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

Response:
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

### 6.2. Mutations

#### 6.2.1. Request OTP

```graphql
mutation RequestOTP {
  auth_request_otp(input: {
    deliveryMethod: "EMAIL",
    extendedToken: false
  }) {
    deliveryMethod {
      name
      target
    }
    tokenLiveTimeInSec
    extendedAccessToken
  }
}
```

Response:
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

#### 6.2.2. Validate OTP

```graphql
mutation ValidateOTP {
  auth_validate_otp(input: {
    token: "123456",
    deviceInfo: {
      deviceId: "d290f1ee-6c54-4b01-90e6-d701748f0851",
      deviceName: "Chrome on Windows 10",
      deviceType: "browser",
      trustDevice: true
    }
  }) {
    token
    validFrom
    validTo
  }
}
```

Response:
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

#### 6.2.3. Setup TOTP

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

Response:
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

#### 6.2.4. Verify TOTP Setup

```graphql
mutation VerifyTOTPSetup {
  auth_verify_totp_setup(input: {
    secretKey: "BASE32ENCODEDKEY",
    token: "123456"
  }) {
    success
  }
}
```

Response:
```json
{
  "data": {
    "auth_verify_totp_setup": {
      "success": true
    }
  }
}
```

#### 6.2.5. Validate TOTP

```graphql
mutation ValidateTOTP {
  auth_validate_totp(input: {
    token: "123456",
    deviceInfo: {
      deviceId: "d290f1ee-6c54-4b01-90e6-d701748f0851",
      deviceName: "Chrome on Windows 10",
      deviceType: "browser",
      trustDevice: true
    }
  }) {
    token
    validFrom
    validTo
  }
}
```

Response:
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

#### 6.2.6. Update Trusted Device

```graphql
mutation UpdateTrustedDevice {
  auth_update_trusted_device(input: {
    deviceId: "d290f1ee-6c54-4b01-90e6-d701748f0851",
    trusted: false
  }) {
    success
  }
}
```

Response:
```json
{
  "data": {
    "auth_update_trusted_device": {
      "success": true
    }
  }
}
```

## 7. Frontend Integration

### 7.1. Login Flow Implementation

The frontend application should implement the following flow:

1. **Standard Login**: Collect username and password
2. **Check 2FA Requirement**: After successful credential validation, check if 2FA is required
3. **Show 2FA Methods**: Display available 2FA methods to the user
4. **OTP Delivery**: If email/SMS is selected, request OTP delivery
5. **OTP Input**: Provide UI for entering the OTP
6. **TOTP Input**: If TOTP is used, provide UI for entering TOTP code
7. **Device Trust**: Offer option to trust the current device
8. **Token Storage**: Securely store access and refresh tokens after successful authentication

### 7.2. TOTP Setup Flow

For TOTP setup, implement the following flow:

1. **Initiate Setup**: Call the setup TOTP mutation
2. **Display QR Code**: Show the QR code for scanning with an authenticator app
3. **Show Secret Key**: Provide manual entry option with the secret key
4. **Verification**: Ask user to enter a generated TOTP code to verify setup
5. **Confirmation**: Confirm successful setup and provide backup options

### 7.3. Trusted Device Management

Implement the following for trusted device management:

1. **Device List**: Show all trusted devices with details
2. **Remove Trust**: Allow users to revoke trust for any device
3. **Current Device**: Highlight the current device in the list
4. **Expiration**: Show when trust expires for each device

### 7.4. UI Components

Common UI components for 2FA:

- 2FA method selection screen
- OTP input component (with timer for expiration)
- QR code display for TOTP setup
- Trusted device toggle
- Device management list

## 8. Security Considerations

### 8.1. Token Security

- 2FA access tokens should be short-lived (1 day maximum)
- Invalidate tokens when:
  - User changes password
  - User logs out explicitly
  - Suspicious activity is detected
  - Administrator forces invalidation

### 8.2. OTP Security

- Limit OTP validity period (5 minutes recommended)
- Implement rate limiting for OTP requests
- Block accounts after multiple failed OTP attempts
- Use secure random number generation for OTPs
- Implement secure delivery methods

### 8.3. TOTP Security

- Use standard TOTP parameters (6 digits, 30-second interval)
- Store TOTP secrets securely (encrypted)
- Require verification during setup
- Provide backup options (recovery codes)
- Limited tolerance window for clock drift

### 8.4. Trusted Device Security

- Use multiple factors for device identification
- Limit trust period (30 days recommended)
- Allow users to revoke trust at any time
- Restrict number of trusted devices per user
- Consider additional verification for suspicious devices

## 9. Troubleshooting

Common issues and solutions:

### 9.1. OTP Delivery Issues

- **Email not received**: Check spam folders, verify email address, check email delivery service
- **SMS not received**: Verify phone number, check SMS gateway status, check carrier restrictions

### 9.2. TOTP Synchronization Issues

- **Invalid TOTP codes**: Verify device time synchronization, reset TOTP setup if necessary
- **QR code scanning problems**: Provide manual entry option, check camera permissions

### 9.3. Trusted Device Problems

- **Device not recognized**: Clear browser cache, update device information, re-establish trust
- **Trust expired unexpectedly**: Verify trust expiration settings, check for clock synchronization issues

### 9.4. Account Lockout

- **Too many failed attempts**: Implement account recovery procedure, administrative reset
- **Inaccessible 2FA method**: Provide backup methods, administrative override

## 10. Best Practices

### 10.1. Implementation Best Practices

- Offer multiple 2FA methods for flexibility
- Implement gradual rollout of 2FA requirements
- Provide clear user guidance during setup
- Test all 2FA flows thoroughly before deployment
- Monitor 2FA usage and success rates

### 10.2. Security Best Practices

- Follow secure coding practices for all 2FA components
- Implement rate limiting and account lockout protections
- Use encryption for all sensitive data
- Regularly audit 2FA implementation and usage
- Follow industry standards for OTP and TOTP implementation

### 10.3. User Experience Best Practices

- Keep 2FA flows simple and intuitive
- Provide clear error messages and recovery options
- Educate users about the importance of 2FA
- Allow users to manage their 2FA preferences
- Minimize friction while maintaining security

### 10.4. Administrative Best Practices

- Maintain ability to assist users with 2FA issues
- Monitor 2FA usage patterns for anomalies
- Implement secure administrative override procedures
- Regularly review and update 2FA policies
- Train support staff on 2FA troubleshooting