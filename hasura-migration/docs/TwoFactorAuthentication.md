# Two-Factor Authentication (2FA) for Fineract Hasura

This document describes the Two-Factor Authentication (2FA) implementation for the Fineract Hasura migration.

## Overview

The 2FA implementation supports multiple authentication methods:

1. **One-Time Password (OTP)**
   - Email delivery
   - SMS delivery
   
2. **Time-Based One-Time Password (TOTP)**
   - Compatible with authenticator apps like Google Authenticator, Authy, etc.
   
3. **Trusted Devices**
   - Remember devices to reduce 2FA prompts for trusted environments

## Architecture

The 2FA system consists of the following components:

### Database Schema

- `two_factor_configuration`: System-wide 2FA settings
- `two_factor_access_token`: Generated 2FA access tokens
- `otp_request`: OTP requests and tracking
- `totp_secret`: TOTP secret keys for users
- `trusted_device`: Trusted device management

### GraphQL API

The API exposes the following operations:

#### Queries

- `twoFactorDeliveryMethods`: Get available 2FA delivery methods for current user
- `totpConfiguration`: Get TOTP configuration for current user
- `trustedDevices`: Get trusted devices for current user
- `twoFactorConfiguration`: Get 2FA configuration (admin only)

#### Mutations

- `requestOTP`: Request OTP via delivery method
- `validateOTP`: Validate OTP and get access token
- `invalidateAccessToken`: Invalidate access token
- `setupTOTP`: Set up TOTP for current user
- `verifyTOTPSetup`: Verify TOTP setup with a token
- `validateTOTP`: Validate TOTP and get access token
- `disableTOTP`: Disable TOTP for current user
- `updateTrustedDevice`: Update trusted device status
- `updateTwoFactorConfiguration`: Update 2FA configuration (admin only)

## Authentication Flow

### Standard Login with 2FA

1. User provides username and password
2. If credentials are valid and 2FA is required, server returns a temporary token
3. Client fetches available 2FA delivery methods
4. User selects a delivery method
5. Server sends OTP via selected method
6. User enters OTP
7. If OTP is valid, server returns a 2FA access token
8. Client includes 2FA access token in subsequent requests

### TOTP-Based Authentication

1. User provides username and password
2. If credentials are valid and 2FA with TOTP is set up, server returns a temporary token
3. Client prompts for TOTP code
4. User enters TOTP code from authenticator app
5. If TOTP code is valid, server returns a 2FA access token
6. Client includes 2FA access token in subsequent requests

### Trusted Device Flow

1. User completes standard 2FA flow
2. Client requests to trust the current device
3. Server stores device information with trust status
4. On subsequent logins from the same device, 2FA may be bypassed based on configuration

## Configuration Options

The following configuration options are available:

- Email delivery: Enable/disable, customize templates
- SMS delivery: Enable/disable, select provider, customize templates
- TOTP: Enable/disable
- Trusted devices: Enable/disable, configure expiration
- Token settings: OTP length, validity periods, etc.
- System-wide 2FA requirement: Force 2FA for all users or selective enforcement

## Security Considerations

- Temporary tokens have short expiration times (10 minutes)
- 2FA access tokens are invalidated when:
  - They expire
  - The user explicitly invalidates them
  - The user's password changes
  - Admin forces invalidation

- TOTP implementation uses industry standards:
  - SHA-1 hashing algorithm
  - 6-digit codes
  - 30-second refresh interval
  - Tolerance window of ±1 step to account for clock drift

- Trusted devices:
  - Device identification combines multiple factors
  - Trust status expires after a configurable period
  - Users can revoke trust for any device
  - Administrators can enforce 2FA regardless of trusted device status

## Integration with Frontend

Frontend applications should implement the following:

1. Update login flow to handle 2FA challenges
2. Provide UI for selecting 2FA delivery methods
3. Implement OTP input screens
4. Add TOTP setup and verification flows
5. Create trusted device management screens
6. For admin interfaces, add 2FA configuration screens

## Testing

Test all 2FA flows thoroughly, including:

1. Email and SMS delivery
2. TOTP setup, verification, and usage
3. Trusted device recognition
4. Token expiration and renewal
5. Edge cases (invalid OTPs, expired tokens, etc.)

## Appendix: API Reference

Refer to the `two_factor_types.graphql` file for detailed type definitions and the `two_factor_actions.yaml` file for API endpoint configurations.