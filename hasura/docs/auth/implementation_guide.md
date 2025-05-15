# Authentication and Authorization Implementation Guide

This guide provides detailed instructions for implementing and integrating with Fineract's authentication and authorization system.

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Implementation](#2-backend-implementation)
3. [Frontend Integration](#3-frontend-integration)
4. [Mobile App Integration](#4-mobile-app-integration)
5. [Testing](#5-testing)
6. [Security Considerations](#6-security-considerations)
7. [Troubleshooting](#7-troubleshooting)
8. [Advanced Topics](#8-advanced-topics)

## 1. Overview

The Fineract authentication and authorization system is designed to provide secure, flexible, and standards-compliant authentication for various client applications, including web applications, mobile apps, and API integrations.

### 1.1. Architecture

The system follows a modern token-based authentication approach:

1. **JWT-based Authentication**: Uses JSON Web Tokens for secure authentication
2. **Role-Based Access Control**: Fine-grained permissions based on user roles
3. **Two-Factor Authentication**: Additional security through 2FA
4. **Stateless Design**: Allows for horizontal scaling and high availability

### 1.2. Key Components

- **Authentication Service**: Handles user login, token issuance, and validation
- **User Management Service**: Manages user accounts, roles, and permissions
- **Two-Factor Authentication Service**: Provides 2FA capabilities
- **Permission Enforcement**: Controls access to system resources

### 1.3. Authentication Flow

1. User provides credentials (username/password)
2. Server validates credentials against the database
3. If 2FA is required, user completes additional verification
4. Server issues JWT tokens (access token and refresh token)
5. Client includes access token in all subsequent API requests
6. When the access token expires, client uses refresh token to obtain a new one

## 2. Backend Implementation

This section covers the implementation of authentication and authorization on the server side.

### 2.1. Database Schema

The system relies on the following key database tables:

1. **app_user**: Stores user account information
2. **role**: Defines available roles
3. **permission**: Defines individual permissions
4. **user_role**: Maps users to roles (many-to-many)
5. **role_permission**: Maps roles to permissions (many-to-many)
6. **two_factor_***: Tables related to two-factor authentication

### 2.2. JWT Implementation

#### 2.2.1. Token Generation

JWT tokens should be generated with the following structure:

```javascript
// Access token payload
const accessTokenPayload = {
  sub: user.id,                  // Subject (user ID)
  name: user.username,           // Username
  roles: userRoles,              // Array of role names
  perms: userPermissions,        // Array of permission codes
  off: user.officeId,            // Office ID
  tn: tenantId,                  // Tenant ID
  typ: 'access',                 // Token type
  iat: Math.floor(Date.now() / 1000),         // Issued at
  exp: Math.floor(Date.now() / 1000) + 3600,  // Expires in 1 hour
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': userRoles,
    'x-hasura-default-role': userRoles[0],
    'x-hasura-user-id': user.id,
    'x-hasura-office-id': user.officeId,
    'x-hasura-tenant-id': tenantId
  }
};

// Refresh token payload (simpler, longer expiration)
const refreshTokenPayload = {
  sub: user.id,
  typ: 'refresh',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 3600)  // 30 days
};

// Generate tokens
const accessToken = jwt.sign(
  accessTokenPayload,
  process.env.JWT_SECRET,
  { algorithm: 'HS256' }
);

const refreshToken = jwt.sign(
  refreshTokenPayload,
  process.env.JWT_SECRET,
  { algorithm: 'HS256' }
);
```

#### 2.2.2. Token Validation

```javascript
// Middleware for validating tokens
function validateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check token type
    if (decoded.typ !== 'access') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token type' 
      });
    }
    
    // Add user information to request
    req.user = {
      id: decoded.sub,
      username: decoded.name,
      roles: decoded.roles,
      permissions: decoded.perms,
      officeId: decoded.off,
      tenantId: decoded.tn
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
}
```

### 2.3. Permission Checking

Implement permission checking to enforce authorization:

```javascript
// Middleware for checking permissions
function checkPermission(requiredPermission) {
  return (req, res, next) => {
    const { permissions } = req.user;
    
    // Allow if user has ALL_FUNCTIONS permission
    if (permissions && (
      permissions.includes('ALL_FUNCTIONS') || 
      permissions.includes(requiredPermission)
    )) {
      return next();
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Insufficient permissions' 
    });
  };
}

// Example usage
app.get('/api/clients', 
  validateToken,
  checkPermission('READ_CLIENT'),
  clientController.listClients
);
```

### 2.4. Two-Factor Authentication

Implement 2FA using these steps:

1. **Check 2FA Requirement**:
```javascript
// During login flow, after validating credentials
async function checkTwoFactorRequired(user) {
  // Check if 2FA is globally required
  const globalRequired = await getGlobalTwoFactorSetting();
  
  if (!globalRequired) {
    return false;
  }
  
  // Check if user has bypass permission
  const hasBypassPermission = await userHasPermission(user.id, 'BYPASS_TWO_FACTOR');
  
  if (hasBypassPermission) {
    return false;
  }
  
  // Check for trusted device
  const deviceId = extractDeviceId(req);
  const isTrustedDevice = await checkTrustedDevice(user.id, deviceId);
  
  if (isTrustedDevice) {
    return false;
  }
  
  return true;
}
```

2. **Issue Temporary Token**:
```javascript
// Generate a short-lived temporary token for 2FA flow
function generateTemporaryToken(user) {
  const payload = {
    sub: user.id,
    name: user.username,
    twoFactorPending: true,
    exp: Math.floor(Date.now() / 1000) + 600  // 10 minutes
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256' });
}
```

3. **Validate 2FA**:
```javascript
// Validate OTP or TOTP code
async function validateTwoFactor(req, res) {
  const { token, method } = req.body;
  const user = req.user;  // From temporary token
  
  let isValid = false;
  
  if (method === 'OTP') {
    // Validate one-time password from database
    isValid = await validateOTP(user.id, token);
  } else if (method === 'TOTP') {
    // Validate time-based OTP
    isValid = await validateTOTP(user.id, token);
  }
  
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid 2FA token'
    });
  }
  
  // Issue full access tokens after successful 2FA
  const { accessToken, refreshToken } = generateTokens(user);
  
  // Handle trusted device if requested
  if (req.body.trustDevice) {
    await createTrustedDevice(user.id, req.body.deviceInfo, req.ip);
  }
  
  return res.json({
    success: true,
    accessToken,
    refreshToken,
    // ...other user info
  });
}
```

### 2.5. GraphQL Integration with Hasura

For Hasura integration, ensure JWT claims include the necessary Hasura-specific namespaces:

```javascript
const hasuraClaims = {
  'https://hasura.io/jwt/claims': {
    'x-hasura-allowed-roles': userRoles,
    'x-hasura-default-role': userRoles[0],
    'x-hasura-user-id': user.id,
    'x-hasura-office-id': user.officeId,
    'x-hasura-tenant-id': tenantId
  }
};
```

Configure Hasura with your JWT secret and claims mapping:

```yaml
# Hasura JWT configuration
jwt:
  secret: ${JWT_SECRET}
  claims_format: json
  claims_namespace: "https://hasura.io/jwt/claims"
  claims_map:
    x-hasura-user-id: sub
    x-hasura-default-role: $.roles[0]
    x-hasura-allowed-roles: $.roles
    x-hasura-office-id: $.off
    x-hasura-tenant-id: $.tn
```

## 3. Frontend Integration

This section covers how to integrate the authentication system with frontend applications.

### 3.1. Authentication Flow

Implement the following authentication flow in your frontend application:

#### 3.1.1. Login

```javascript
async function login(username, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Check if 2FA is required
    if (data.requiresTwoFactor) {
      // Store temporary token and redirect to 2FA page
      sessionStorage.setItem('temporaryToken', data.temporaryToken);
      return { requiresTwoFactor: true, userId: data.user.id };
    }
    
    // Store tokens securely
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('tokenExpiry', Date.now() + (data.expiresIn * 1000));
    localStorage.setItem('userInfo', JSON.stringify(data.userBasicInfo));
    
    return { success: true, user: data.userBasicInfo };
  } catch (error) {
    console.error('Login failed:', error);
    return { success: false, error: error.message };
  }
}
```

#### 3.1.2. Handle 2FA Challenge

```javascript
// Get available 2FA methods
async function getTwoFactorMethods() {
  const temporaryToken = sessionStorage.getItem('temporaryToken');
  
  const response = await fetch('/api/auth/two-factor/delivery-methods', {
    headers: {
      'Authorization': `Bearer ${temporaryToken}`
    }
  });
  
  return response.json();
}

// Request OTP
async function requestOTP(deliveryMethod) {
  const temporaryToken = sessionStorage.getItem('temporaryToken');
  
  const response = await fetch('/api/auth/two-factor/request-otp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${temporaryToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ deliveryMethod })
  });
  
  return response.json();
}

// Validate OTP or TOTP
async function validateTwoFactor(token, method, trustDevice = false) {
  const temporaryToken = sessionStorage.getItem('temporaryToken');
  const deviceInfo = trustDevice ? getDeviceInfo() : null;
  
  const endpoint = method === 'TOTP' 
    ? '/api/auth/two-factor/validate-totp'
    : '/api/auth/two-factor/validate-otp';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${temporaryToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      token,
      deviceInfo
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  // Complete login with the 2FA token
  const loginResponse = await fetch('/api/auth/complete-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      twoFactorToken: data.token 
    })
  });
  
  const loginData = await loginResponse.json();
  
  // Store tokens and user info
  localStorage.setItem('accessToken', loginData.accessToken);
  localStorage.setItem('refreshToken', loginData.refreshToken);
  localStorage.setItem('tokenExpiry', Date.now() + (loginData.expiresIn * 1000));
  localStorage.setItem('userInfo', JSON.stringify(loginData.userInfo));
  
  // Clear temporary token
  sessionStorage.removeItem('temporaryToken');
  
  return loginData;
}

// Helper to get device info for trusted device
function getDeviceInfo() {
  const browser = getBrowserInfo();
  const os = getOSInfo();
  const deviceId = getDeviceId() || generateDeviceId();
  
  return {
    deviceId,
    deviceName: `${browser.name} on ${os.name}`,
    deviceType: 'browser',
    trustDevice: true
  };
}
```

#### 3.1.3. Token Refresh

```javascript
// Check if token needs refresh
function isTokenExpired() {
  const expiry = localStorage.getItem('tokenExpiry');
  return !expiry || Date.now() > parseInt(expiry);
}

// Refresh token when needed
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Update stored tokens
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('tokenExpiry', Date.now() + (data.expiresIn * 1000));
    
    return data.accessToken;
  } catch (error) {
    // Handle refresh failure - usually means user needs to log in again
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('userInfo');
    
    throw new Error('Session expired. Please log in again.');
  }
}
```

#### 3.1.4. Authenticated API Requests

```javascript
// Wrapper for authenticated API requests with automatic token refresh
async function authenticatedFetch(url, options = {}) {
  // Check if token needs refresh
  if (isTokenExpired()) {
    await refreshToken();
  }
  
  // Get current access token
  const accessToken = localStorage.getItem('accessToken');
  
  // Set authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // Handle 401 by attempting token refresh once
    if (response.status === 401) {
      try {
        await refreshToken();
        
        // Retry request with new token
        const newAccessToken = localStorage.getItem('accessToken');
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`
        };
        
        return fetch(url, {
          ...options,
          headers: newHeaders
        });
      } catch (refreshError) {
        // Redirect to login if refresh fails
        window.location.href = '/login?expired=true';
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```

### 3.2. GraphQL Client Integration

For GraphQL clients, configure Apollo Client to handle authentication:

```javascript
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

// Auth link to add the token to requests
const authLink = new ApolloLink((operation, forward) => {
  const accessToken = localStorage.getItem('accessToken');
  
  operation.setContext({
    headers: {
      authorization: accessToken ? `Bearer ${accessToken}` : ''
    }
  });
  
  return forward(operation);
});

// Error handling link for authentication errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Handle auth errors
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        return fromPromise(
          refreshToken().catch(() => {
            // Redirect to login on refresh failure
            window.location.href = '/login?expired=true';
          })
        ).flatMap(() => {
          // Retry the operation with new token
          const accessToken = localStorage.getItem('accessToken');
          
          operation.setContext({
            headers: {
              authorization: `Bearer ${accessToken}`
            }
          });
          
          return forward(operation);
        });
      }
    }
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// HTTP link for GraphQL endpoint
const httpLink = new HttpLink({ uri: 'https://your-domain.com/v1/graphql' });

// Create Apollo client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache()
});
```

### 3.3. TOTP Setup Integration

Implement the TOTP setup flow in your frontend:

```javascript
// Step 1: Initialize TOTP setup
async function initTOTPSetup() {
  const response = await authenticatedFetch('/api/auth/two-factor/setup-totp', {
    method: 'POST'
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  return {
    secretKey: data.secretKey,
    qrCodeUrl: data.qrCodeUrl
  };
}

// Step 2: Verify TOTP setup with a code from the authenticator app
async function verifyTOTPSetup(secretKey, token) {
  const response = await authenticatedFetch('/api/auth/two-factor/verify-totp-setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ secretKey, token })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Invalid verification code');
  }
  
  return true;
}
```

### 3.4. Permission-Based UI

Implement permission-based UI rendering:

```javascript
// Helper to check if user has permission
function hasPermission(permission) {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const permissions = userInfo.permissions || [];
  
  return permissions.includes('ALL_FUNCTIONS') || permissions.includes(permission);
}

// Example React component that shows/hides based on permissions
function PermissionGuard({ permission, children }) {
  if (!hasPermission(permission)) {
    return null;
  }
  
  return children;
}

// Usage example
function ClientPage() {
  return (
    <div>
      <h1>Client Management</h1>
      
      {/* Only shown if user has CREATE_CLIENT permission */}
      <PermissionGuard permission="CREATE_CLIENT">
        <button>Add New Client</button>
      </PermissionGuard>
      
      {/* Always shown */}
      <ClientList />
      
      {/* Only shown if user has APPROVE_CLIENT permission */}
      <PermissionGuard permission="APPROVE_CLIENT">
        <ClientApprovalQueue />
      </PermissionGuard>
    </div>
  );
}
```

## 4. Mobile App Integration

This section covers how to integrate the authentication system with mobile applications.

### 4.1. Secure Token Storage

For mobile apps, use secure storage mechanisms:

#### 4.1.1. Android (Kotlin)

```kotlin
// Use EncryptedSharedPreferences for secure storage
private fun getEncryptedSharedPreferences(context: Context): SharedPreferences {
    val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
    
    return EncryptedSharedPreferences.create(
        "auth_prefs",
        masterKeyAlias,
        context,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
}

// Store tokens
fun saveTokens(context: Context, accessToken: String, refreshToken: String, expiresIn: Long) {
    val prefs = getEncryptedSharedPreferences(context)
    prefs.edit()
        .putString("access_token", accessToken)
        .putString("refresh_token", refreshToken)
        .putLong("token_expiry", System.currentTimeMillis() + (expiresIn * 1000))
        .apply()
}

// Retrieve access token
fun getAccessToken(context: Context): String? {
    return getEncryptedSharedPreferences(context).getString("access_token", null)
}

// Check if token is expired
fun isTokenExpired(context: Context): Boolean {
    val prefs = getEncryptedSharedPreferences(context)
    val expiry = prefs.getLong("token_expiry", 0)
    return System.currentTimeMillis() > expiry
}
```

#### 4.1.2. iOS (Swift)

```swift
// Use Keychain for secure storage
class KeychainManager {
    enum KeychainError: Error {
        case itemNotFound
        case duplicateItem
        case unexpectedStatus(OSStatus)
    }
    
    static func save(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecDuplicateItem {
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key
            ]
            
            let updateAttributes: [String: Any] = [
                kSecValueData as String: data
            ]
            
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, updateAttributes as CFDictionary)
            
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainError.unexpectedStatus(status)
        }
    }
    
    static func load(key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
        
        guard let data = item as? Data else {
            throw KeychainError.unexpectedStatus(errSecInternalError)
        }
        
        return data
    }
    
    static func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}

// Authentication service
class AuthService {
    func saveTokens(accessToken: String, refreshToken: String, expiresIn: Int) {
        do {
            try KeychainManager.save(key: "access_token", data: Data(accessToken.utf8))
            try KeychainManager.save(key: "refresh_token", data: Data(refreshToken.utf8))
            
            let expiry = Date().timeIntervalSince1970 + Double(expiresIn)
            try KeychainManager.save(key: "token_expiry", data: Data(String(expiry).utf8))
        } catch {
            print("Error saving tokens: \(error)")
        }
    }
    
    func getAccessToken() -> String? {
        do {
            let data = try KeychainManager.load(key: "access_token")
            return String(data: data, encoding: .utf8)
        } catch {
            print("Error loading access token: \(error)")
            return nil
        }
    }
    
    func isTokenExpired() -> Bool {
        do {
            let data = try KeychainManager.load(key: "token_expiry")
            if let expiryString = String(data: data, encoding: .utf8),
               let expiry = Double(expiryString) {
                return Date().timeIntervalSince1970 > expiry
            }
            return true
        } catch {
            return true
        }
    }
}
```

### 4.2. Biometric Authentication

Implement biometric authentication for mobile apps:

#### 4.2.1. Android (Kotlin)

```kotlin
class BiometricAuthManager(private val context: Context) {
    private val biometricManager = BiometricManager.from(context)
    
    fun canAuthenticate(): Boolean {
        return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }
    
    fun authenticate(onSuccess: () -> Unit, onError: (String) -> Unit) {
        val executor = ContextCompat.getMainExecutor(context)
        
        val callback = object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onSuccess()
            }
            
            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                super.onAuthenticationError(errorCode, errString)
                onError(errString.toString())
            }
        }
        
        val biometricPrompt = BiometricPrompt(
            context as FragmentActivity,
            executor,
            callback
        )
        
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Biometric Authentication")
            .setSubtitle("Log in using your biometric credential")
            .setNegativeButtonText("Cancel")
            .build()
        
        biometricPrompt.authenticate(promptInfo)
    }
}
```

#### 4.2.2. iOS (Swift)

```swift
class BiometricAuthManager {
    enum BiometricType {
        case none
        case touchID
        case faceID
    }
    
    func getBiometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        
        if #available(iOS 11.0, *) {
            switch context.biometryType {
            case .touchID:
                return .touchID
            case .faceID:
                return .faceID
            default:
                return .none
            }
        } else {
            return .touchID // Only Touch ID available before iOS 11
        }
    }
    
    func authenticate(completion: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        var error: NSError?
        let reason = "Authenticate to access your account"
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(false, error?.localizedDescription ?? "Biometric authentication not available")
            return
        }
        
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
            DispatchQueue.main.async {
                if success {
                    completion(true, nil)
                } else {
                    completion(false, error?.localizedDescription ?? "Authentication failed")
                }
            }
        }
    }
}
```

### 4.3. TOTP Integration in Mobile Apps

Implement TOTP functionality in mobile apps:

#### 4.3.1. QR Code Scanning (Android)

```kotlin
// Scan QR code using ML Kit
private fun startQRCodeScanner() {
    val options = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .build()
    
    val scanner = BarcodeScanning.getClient(options)
    
    val imageAnalysis = ImageAnalysis.Builder()
        .setTargetResolution(Size(1280, 720))
        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
        .build()
    
    imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(this)) { imageProxy ->
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(
                mediaImage,
                imageProxy.imageInfo.rotationDegrees
            )
            
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        val qrContent = barcodes[0].rawValue
                        if (qrContent != null && qrContent.startsWith("otpauth://")) {
                            // Parse TOTP URI
                            val uri = Uri.parse(qrContent)
                            val secret = uri.getQueryParameter("secret")
                            if (secret != null) {
                                // Use the secret for TOTP setup
                                completeTOTPSetup(secret)
                            }
                        }
                    }
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
    
    // Start camera
    val cameraProvider = ProcessCameraProvider.getInstance(this).get()
    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA
    cameraProvider.unbindAll()
    cameraProvider.bindToLifecycle(
        this as LifecycleOwner,
        cameraSelector,
        imageAnalysis
    )
}
```

#### 4.3.2. TOTP Generator (Swift)

```swift
import Foundation
import CryptoKit

class TOTPGenerator {
    private let period: TimeInterval = 30 // Default TOTP period is 30 seconds
    private let digits: Int = 6 // Default is 6 digits
    
    func generateTOTP(secret: String) -> String? {
        guard let secretData = base32Decode(secret) else {
            return nil
        }
        
        // Get current time and convert to counter (number of periods since epoch)
        let counter = UInt64(Date().timeIntervalSince1970 / period)
        
        // Convert counter to big-endian data
        var counterData = Data(count: 8)
        for i in 0..<8 {
            counterData[7-i] = UInt8((counter >> (i * 8)) & 0xFF)
        }
        
        // Calculate HMAC
        let hmac = HMAC<Insecure.SHA1>.authenticationCode(
            for: counterData,
            using: SymmetricKey(data: secretData)
        )
        let hmacData = Data(hmac)
        
        // Get offset based on last nibble of HMAC
        let offset = Int(hmacData[hmacData.count - 1] & 0x0F)
        
        // Get 4 bytes from HMAC starting at offset
        let truncatedHash = hmacData[offset...offset+3]
        
        // Convert to UInt32 (masking out the most significant bit)
        var code = truncatedHash.withUnsafeBytes { pointer in
            return pointer.load(as: UInt32.self).bigEndian & 0x7FFFFFFF
        }
        
        // Generate code by taking modulo and padding with leading zeros
        code = code % UInt32(pow(10, Double(digits)))
        return String(format: "%0\(digits)d", code)
    }
    
    // Base32 decode function
    private func base32Decode(_ string: String) -> Data? {
        let base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        let string = string.uppercased()
            .replacingOccurrences(of: "=", with: "")
        
        var result = Data()
        var buffer = 0
        var bitsInBuffer = 0
        
        for char in string {
            guard let value = base32Chars.firstIndex(of: char) else {
                return nil
            }
            
            let charValue = Int(value.utf16Offset(in: base32Chars))
            
            buffer = (buffer << 5) | charValue
            bitsInBuffer += 5
            
            if bitsInBuffer >= 8 {
                bitsInBuffer -= 8
                result.append(UInt8(buffer >> bitsInBuffer))
                buffer &= (1 << bitsInBuffer) - 1
            }
        }
        
        return result
    }
}
```

## 5. Testing

### 5.1. Unit Testing

Examples of unit tests for the authentication system:

```javascript
// Example Jest tests for authentication
describe('Auth Service', () => {
  test('should generate valid JWT token', () => {
    const user = {
      id: '123',
      username: 'testuser',
      roles: ['user']
    };
    
    const token = generateAccessToken(user);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    expect(decoded.sub).toBe(user.id);
    expect(decoded.name).toBe(user.username);
    expect(decoded.roles).toEqual(user.roles);
  });
  
  test('should validate permissions correctly', () => {
    const userWithPermission = {
      permissions: ['READ_CLIENT', 'CREATE_LOAN']
    };
    
    const userWithoutPermission = {
      permissions: ['READ_LOAN']
    };
    
    const userWithAllFunctions = {
      permissions: ['ALL_FUNCTIONS']
    };
    
    expect(hasPermission(userWithPermission, 'READ_CLIENT')).toBe(true);
    expect(hasPermission(userWithoutPermission, 'READ_CLIENT')).toBe(false);
    expect(hasPermission(userWithAllFunctions, 'ANY_PERMISSION')).toBe(true);
  });
  
  test('should validate OTP codes correctly', async () => {
    // Mock database with valid OTP
    const mockDb = {
      query: jest.fn().mockResolvedValue({
        rows: [{
          id: 1,
          user_id: '123',
          token: '123456',
          valid_to: new Date(Date.now() + 300000), // 5 minutes in the future
          extended_access_token: false
        }]
      })
    };
    
    const result = await validateOTP('123', '123456', mockDb);
    expect(result).toBe(true);
    
    // Test expired OTP
    mockDb.query = jest.fn().mockResolvedValue({
      rows: [{
        id: 1,
        user_id: '123',
        token: '123456',
        valid_to: new Date(Date.now() - 60000), // 1 minute in the past
        extended_access_token: false
      }]
    });
    
    const expiredResult = await validateOTP('123', '123456', mockDb);
    expect(expiredResult).toBe(false);
  });
});
```

### 5.2. Integration Testing

Example integration tests:

```javascript
// Example Supertest integration tests
describe('Authentication API', () => {
  let app, server;
  
  beforeAll(() => {
    app = require('../app');
    server = app.listen(4000);
  });
  
  afterAll((done) => {
    server.close(done);
  });
  
  test('should return 401 for invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'invalid',
        password: 'invalid'
      });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  test('should return tokens for valid credentials', async () => {
    // Assuming test database has this user
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
  });
  
  test('should validate tokens correctly', async () => {
    // First login to get a token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpass'
      });
    
    const { accessToken } = loginResponse.body;
    
    // Test protected endpoint
    const response = await request(app)
      .get('/api/protected-resource')
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(response.status).toBe(200);
    
    // Test with invalid token
    const invalidResponse = await request(app)
      .get('/api/protected-resource')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(invalidResponse.status).toBe(401);
  });
});
```

### 5.3. E2E Testing

Example Cypress E2E test for login flow:

```javascript
// cypress/integration/auth.spec.js
describe('Authentication Flow', () => {
  it('should log in successfully with valid credentials', () => {
    cy.visit('/login');
    
    cy.get('[data-cy=username-input]').type('testuser');
    cy.get('[data-cy=password-input]').type('testpass');
    cy.get('[data-cy=login-button]').click();
    
    // Should redirect to dashboard after login
    cy.url().should('include', '/dashboard');
    
    // Local storage should have tokens
    cy.window().then((window) => {
      const accessToken = window.localStorage.getItem('accessToken');
      expect(accessToken).to.be.a('string');
    });
  });
  
  it('should show error message for invalid credentials', () => {
    cy.visit('/login');
    
    cy.get('[data-cy=username-input]').type('invaliduser');
    cy.get('[data-cy=password-input]').type('invalidpass');
    cy.get('[data-cy=login-button]').click();
    
    // Should show error message
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials');
    
    // Should stay on login page
    cy.url().should('include', '/login');
  });
  
  it('should handle 2FA flow correctly', () => {
    // Mock 2FA requirement
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        requiresTwoFactor: true,
        temporaryToken: 'temp-token-123',
        user: {
          id: '123',
          username: 'testuser'
        }
      }
    }).as('login');
    
    cy.intercept('GET', '/api/auth/two-factor/delivery-methods', {
      statusCode: 200,
      body: [
        {
          name: 'EMAIL',
          target: 'user@example.com'
        }
      ]
    }).as('deliveryMethods');
    
    cy.intercept('POST', '/api/auth/two-factor/request-otp', {
      statusCode: 200,
      body: {
        deliveryMethod: {
          name: 'EMAIL',
          target: 'user@example.com'
        },
        tokenLiveTimeInSec: 300
      }
    }).as('requestOTP');
    
    cy.intercept('POST', '/api/auth/two-factor/validate-otp', {
      statusCode: 200,
      body: {
        token: '2fa-token-123',
        validFrom: new Date().toISOString(),
        validTo: new Date(Date.now() + 86400000).toISOString()
      }
    }).as('validateOTP');
    
    cy.intercept('POST', '/api/auth/complete-login', {
      statusCode: 200,
      body: {
        success: true,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
        userInfo: {
          id: '123',
          username: 'testuser'
        }
      }
    }).as('completeLogin');
    
    // Start login flow
    cy.visit('/login');
    cy.get('[data-cy=username-input]').type('testuser');
    cy.get('[data-cy=password-input]').type('testpass');
    cy.get('[data-cy=login-button]').click();
    
    cy.wait('@login');
    
    // Should redirect to 2FA page
    cy.url().should('include', '/two-factor');
    
    cy.wait('@deliveryMethods');
    
    // Select email delivery
    cy.get('[data-cy=delivery-method-email]').click();
    cy.get('[data-cy=request-otp-button]').click();
    
    cy.wait('@requestOTP');
    
    // Enter OTP
    cy.get('[data-cy=otp-input]').type('123456');
    cy.get('[data-cy=verify-otp-button]').click();
    
    cy.wait('@validateOTP');
    cy.wait('@completeLogin');
    
    // Should redirect to dashboard after successful 2FA
    cy.url().should('include', '/dashboard');
  });
});
```

## 6. Security Considerations

### 6.1. Password Handling

Best practices for password handling:

1. **Never store plaintext passwords**
2. **Use strong hashing algorithms**:
```javascript
const bcrypt = require('bcrypt');

// Hash a password
async function hashPassword(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Verify a password
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
```

3. **Implement password complexity requirements**:
```javascript
function isPasswordValid(password) {
  // At least 8 characters
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter' };
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter' };
  }
  
  // At least one number
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number' };
  }
  
  // At least one special character
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}
```

4. **Implement account lockout after failed attempts**:
```javascript
async function checkLoginAttempts(userId, db) {
  const result = await db.query(
    'SELECT failed_attempts, locked_until FROM user_login_attempts WHERE user_id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) {
    // No previous attempts
    return { attempts: 0, locked: false };
  }
  
  const { failed_attempts, locked_until } = result.rows[0];
  
  if (locked_until && new Date() < new Date(locked_until)) {
    return { attempts: failed_attempts, locked: true, lockedUntil: locked_until };
  }
  
  return { attempts: failed_attempts, locked: false };
}

async function recordLoginAttempt(userId, success, db) {
  const { attempts } = await checkLoginAttempts(userId, db);
  
  if (success) {
    // Reset attempts on successful login
    await db.query(
      `INSERT INTO user_login_attempts (user_id, failed_attempts, locked_until) 
       VALUES ($1, 0, NULL)
       ON CONFLICT (user_id) DO UPDATE SET failed_attempts = 0, locked_until = NULL`,
      [userId]
    );
  } else {
    const newAttempts = attempts + 1;
    let lockedUntil = null;
    
    // Lock account after 5 attempts (for 30 minutes)
    if (newAttempts >= 5) {
      lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    
    await db.query(
      `INSERT INTO user_login_attempts (user_id, failed_attempts, locked_until) 
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET failed_attempts = $2, locked_until = $3`,
      [userId, newAttempts, lockedUntil]
    );
  }
}
```

### 6.2. HTTPS Configuration

Always use HTTPS in production with proper configuration:

```javascript
// Express HTTPS configuration
const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');

const app = express();

// Use Helmet for security headers
app.use(helmet());

// HTTP Strict Transport Security
app.use(helmet.hsts({
  maxAge: 15552000, // 180 days in seconds
  includeSubDomains: true,
  preload: true
}));

// Set secure cookies
app.use((req, res, next) => {
  res.cookie('secure-cookie', 'value', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });
  next();
});

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});

// Redirect HTTP to HTTPS
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(301, { 'Location': 'https://' + req.headers.host + req.url });
  res.end();
}).listen(80);
```

### 6.3. XSS and CSRF Protection

Implement protection against cross-site scripting (XSS) and cross-site request forgery (CSRF):

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { xss } = require('express-xss-sanitizer');

const app = express();

// Parse cookies for CSRF
app.use(cookieParser());

// XSS protection - sanitize user input
app.use(xss());

// CSRF protection
const csrfProtection = csrf({ cookie: { httpOnly: true, secure: true, sameSite: 'strict' } });

// Apply CSRF protection to all POST, PUT, DELETE routes
app.post('*', csrfProtection);
app.put('*', csrfProtection);
app.delete('*', csrfProtection);

// Provide CSRF token for forms
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Add CSRF token to API routes that need it
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### 6.4. API Rate Limiting

Implement rate limiting to prevent brute force attacks:

```javascript
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to all requests
app.use(apiLimiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Apply to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh-token', authLimiter);
```

## 7. Troubleshooting

### 7.1. Common Issues and Solutions

#### 7.1.1. Token Validation Failures

**Problem**: JWT tokens are being rejected as invalid.

**Solutions**:
1. Check if the token is expired
2. Verify that the correct JWT secret is being used
3. Ensure the token format is correct (no extra spaces or characters)
4. Verify the token algorithm matches what's expected

```javascript
// Debug JWT token issues
function debugToken(token) {
  try {
    // Decode without verification to see structure
    const decoded = jwt.decode(token, { complete: true });
    console.log('Header:', decoded.header);
    console.log('Payload:', decoded.payload);
    console.log('Signature exists:', !!decoded.signature);
    
    // Check expiration
    if (decoded.payload.exp) {
      const expiry = new Date(decoded.payload.exp * 1000);
      const now = new Date();
      console.log('Token expired:', now > expiry, 'Expiry:', expiry.toISOString());
    }
    
    // Try to verify
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verification successful');
    } catch (verifyError) {
      console.error('Verification error:', verifyError.message);
    }
  } catch (error) {
    console.error('Token decoding error:', error.message);
  }
}
```

#### 7.1.2. CORS Issues

**Problem**: Cross-Origin Resource Sharing (CORS) errors when accessing API from browser.

**Solution**: Configure proper CORS headers:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Basic CORS (development)
app.use(cors());

// Production CORS configuration
const corsOptions = {
  origin: [
    'https://yourapp.com',
    'https://admin.yourapp.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
```

#### 7.1.3. 2FA Issues

**Problem**: Users unable to complete 2FA verification.

**Solutions**:
1. Provide clear error messages
2. Implement backup codes for account recovery
3. Add administrative override for emergencies

```javascript
// Example backup code validation
async function validateBackupCode(userId, code) {
  const result = await db.query(
    'SELECT * FROM user_backup_codes WHERE user_id = $1 AND code = $2 AND used = false',
    [userId, code]
  );
  
  if (result.rows.length === 0) {
    return false;
  }
  
  // Mark code as used
  await db.query(
    'UPDATE user_backup_codes SET used = true WHERE user_id = $1 AND code = $2',
    [userId, code]
  );
  
  return true;
}

// Generate backup codes
async function generateBackupCodes(userId) {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex'));
  }
  
  // Delete existing codes
  await db.query('DELETE FROM user_backup_codes WHERE user_id = $1', [userId]);
  
  // Insert new codes
  for (const code of codes) {
    await db.query(
      'INSERT INTO user_backup_codes (user_id, code, used) VALUES ($1, $2, false)',
      [userId, code]
    );
  }
  
  return codes;
}
```

### 7.2. Debugging Tools

#### 7.2.1. Token Debugger

A utility to debug JWT tokens:

```javascript
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// Example usage
const token = localStorage.getItem('accessToken');
const tokenData = parseJwt(token);
console.log('Token data:', tokenData);
console.log('Token expiry:', new Date(tokenData.exp * 1000).toLocaleString());
console.log('Is expired:', Date.now() > tokenData.exp * 1000);
```

#### 7.2.2. API Monitoring Tools

Implement API request logging and monitoring:

```javascript
// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Capture response
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    
    // Log auth errors
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.error(`Authentication error: ${req.method} ${req.path} - User: ${req.user?.id || 'anonymous'}`);
    }
    
    originalSend.call(this, body);
  };
  
  next();
});
```

#### 7.2.3. API Testing Tools

Use API testing tools like Postman to debug authentication issues:

1. Create environment variables for tokens
2. Set up pre-request scripts to handle token refresh
3. Create test suites for all authentication endpoints

Example Postman pre-request script for automatic token refresh:

```javascript
// Check if token needs refresh
const tokenExpiry = pm.environment.get('tokenExpiry');
const currentTime = Date.now();

if (!tokenExpiry || currentTime > parseInt(tokenExpiry)) {
    const refreshToken = pm.environment.get('refreshToken');
    
    if (refreshToken) {
        pm.sendRequest({
            url: pm.environment.get('baseUrl') + '/api/auth/refresh-token',
            method: 'POST',
            header: {
                'Content-Type': 'application/json'
            },
            body: {
                mode: 'raw',
                raw: JSON.stringify({ refreshToken })
            }
        }, function (err, res) {
            if (!err && res.code === 200) {
                const resBody = res.json();
                
                if (resBody.success) {
                    pm.environment.set('accessToken', resBody.accessToken);
                    pm.environment.set('refreshToken', resBody.refreshToken);
                    pm.environment.set('tokenExpiry', Date.now() + (resBody.expiresIn * 1000));
                    console.log('Token refreshed successfully');
                } else {
                    console.error('Token refresh failed:', resBody.message);
                }
            } else {
                console.error('Token refresh failed:', err);
            }
        });
    }
}
```

## 8. Advanced Topics

### 8.1. Single Sign-On (SSO) Integration

Implement SSO integration with external identity providers:

```javascript
const passport = require('passport');
const OIDCStrategy = require('passport-openidconnect').Strategy;

// Configure passport
passport.use('oidc', new OIDCStrategy({
    issuer: 'https://identity-provider.com',
    authorizationURL: 'https://identity-provider.com/authorize',
    tokenURL: 'https://identity-provider.com/token',
    userInfoURL: 'https://identity-provider.com/userinfo',
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    callbackURL: 'https://yourapp.com/auth/callback',
    scope: 'openid profile email'
  },
  async (issuer, profile, done) => {
    try {
      // Find or create user based on external identity
      let user = await db.findUserByExternalId(profile.id, issuer);
      
      if (!user) {
        user = await db.createUserFromExternalProfile({
          externalId: profile.id,
          issuer,
          email: profile.emails[0]?.value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Authentication routes
app.get('/auth/login/sso', passport.authenticate('oidc'));

app.get('/auth/callback',
  passport.authenticate('oidc', { session: false }),
  (req, res) => {
    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(req.user);
    
    // Redirect with tokens (or set cookies)
    res.redirect(`/login-success?access_token=${accessToken}&refresh_token=${refreshToken}`);
  }
);
```

### 8.2. OAuth2 Authorization Server

Implement a full OAuth2 authorization server:

```javascript
const oauth2orize = require('oauth2orize');
const passport = require('passport');
const crypto = require('crypto');

// Create OAuth 2.0 server
const server = oauth2orize.createServer();

// Client credentials exchange
server.exchange(oauth2orize.exchange.clientCredentials((client, scope, done) => {
  // Validate client
  validateClient(client.id, client.secret, (err, validClient) => {
    if (err) return done(err);
    if (!validClient) return done(null, false);
    
    // Generate token
    const token = generateToken();
    const expiresIn = 3600;
    
    // Save token
    saveToken(token, validClient.id, null, expiresIn, (err) => {
      if (err) return done(err);
      return done(null, token, { expires_in: expiresIn });
    });
  });
}));

// Password exchange
server.exchange(oauth2orize.exchange.password((client, username, password, scope, done) => {
  // Validate client
  validateClient(client.id, client.secret, (err, validClient) => {
    if (err) return done(err);
    if (!validClient) return done(null, false);
    
    // Validate user
    validateUser(username, password, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      
      // Generate token
      const token = generateToken();
      const refreshToken = generateToken();
      const expiresIn = 3600;
      
      // Save tokens
      saveToken(token, validClient.id, user.id, expiresIn, (err) => {
        if (err) return done(err);
        saveRefreshToken(refreshToken, validClient.id, user.id, (err) => {
          if (err) return done(err);
          return done(null, token, refreshToken, { expires_in: expiresIn });
        });
      });
    });
  });
}));

// Refresh token exchange
server.exchange(oauth2orize.exchange.refreshToken((client, refreshToken, scope, done) => {
  // Validate refresh token
  validateRefreshToken(refreshToken, client.id, (err, token) => {
    if (err) return done(err);
    if (!token) return done(null, false);
    
    // Generate new access token
    const newToken = generateToken();
    const expiresIn = 3600;
    
    // Save new access token
    saveToken(newToken, client.id, token.userId, expiresIn, (err) => {
      if (err) return done(err);
      return done(null, newToken, null, { expires_in: expiresIn });
    });
  });
}));

// Token endpoint
app.post('/oauth/token',
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  server.token(),
  server.errorHandler()
);
```

### 8.3. Multi-Tenant Architecture

Configure multi-tenant authentication:

```javascript
// Middleware to identify tenant
function tenantIdentifier(req, res, next) {
  // Identify tenant from various sources
  const tenant = 
    req.headers['x-tenant-id'] || 
    req.query.tenant ||
    req.hostname.split('.')[0];
  
  if (!tenant) {
    return res.status(400).json({ 
      success: false, 
      message: 'Tenant identifier required' 
    });
  }
  
  // Validate and load tenant info
  getTenantInfo(tenant)
    .then(tenantInfo => {
      if (!tenantInfo) {
        return res.status(404).json({ 
          success: false, 
          message: 'Tenant not found' 
        });
      }
      
      req.tenant = tenantInfo;
      next();
    })
    .catch(err => {
      console.error('Tenant lookup error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    });
}

// Apply tenant identification to all routes
app.use(tenantIdentifier);

// Use tenant-specific config in JWT generation
function generateTokenForTenant(user, tenant) {
  const payload = {
    sub: user.id,
    name: user.username,
    roles: user.roles,
    perms: user.permissions,
    off: user.officeId,
    tn: tenant.id,
    'https://hasura.io/jwt/claims': {
      'x-hasura-allowed-roles': user.roles,
      'x-hasura-default-role': user.roles[0],
      'x-hasura-user-id': user.id,
      'x-hasura-office-id': user.officeId,
      'x-hasura-tenant-id': tenant.id
    }
  };
  
  return jwt.sign(
    payload,
    tenant.jwtSecret || process.env.JWT_SECRET,
    { 
      algorithm: 'HS256',
      expiresIn: tenant.tokenExpirySeconds || 3600
    }
  );
}
```

### 8.4. User Impersonation for Support

Implement secure user impersonation for support staff:

```javascript
// Admin-only endpoint for user impersonation
app.post('/api/auth/impersonate', async (req, res) => {
  try {
    // Verify admin permissions
    if (!req.user || !req.user.permissions.includes('IMPERSONATE_USER')) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied for user impersonation'
      });
    }
    
    const { targetUserId, reason } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }
    
    // Get target user
    const targetUser = await db.getUserById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }
    
    // Create impersonation token
    const impersonationToken = jwt.sign({
      sub: targetUser.id,
      name: targetUser.username,
      roles: targetUser.roles,
      perms: targetUser.permissions,
      off: targetUser.officeId,
      tn: req.tenant.id,
      imp: {
        by: req.user.id,
        at: Date.now(),
        reason: reason || 'Support assistance'
      },
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': targetUser.roles,
        'x-hasura-default-role': targetUser.roles[0],
        'x-hasura-user-id': targetUser.id,
        'x-hasura-office-id': targetUser.officeId,
        'x-hasura-tenant-id': req.tenant.id,
        'x-hasura-impersonated-by': req.user.id
      }
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Log impersonation event
    await db.logAuditEvent({
      eventType: 'IMPERSONATION',
      userId: req.user.id,
      targetUserId: targetUser.id,
      metadata: {
        reason: reason || 'Support assistance',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.json({
      success: true,
      message: 'Impersonation successful',
      impersonationToken,
      expiresIn: 3600,
      targetUser: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: `${targetUser.firstName} ${targetUser.lastName}`
      }
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// End impersonation session
app.post('/api/auth/end-impersonation', async (req, res) => {
  try {
    // Check if current session is an impersonation
    if (!req.user || !req.user.imp) {
      return res.status(400).json({
        success: false,
        message: 'Not an impersonation session'
      });
    }
    
    // Get original admin user
    const adminUser = await db.getUserById(req.user.imp.by);
    
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Original admin user not found'
      });
    }
    
    // Generate admin token
    const adminToken = generateTokens(adminUser);
    
    // Log end of impersonation
    await db.logAuditEvent({
      eventType: 'IMPERSONATION_END',
      userId: adminUser.id,
      targetUserId: req.user.id,
      metadata: {
        duration: Date.now() - req.user.imp.at,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });
    
    res.json({
      success: true,
      message: 'Impersonation ended',
      accessToken: adminToken.accessToken,
      refreshToken: adminToken.refreshToken,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('End impersonation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});