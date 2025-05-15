# Authentication Guide

This guide explains how to authenticate with the Fineract GraphQL API using JSON Web Tokens (JWT).

## Authentication Flow

The Fineract GraphQL API uses JWT (JSON Web Tokens) for authentication. The authentication flow consists of the following steps:

1. **Login Request**: Provide username and password to obtain access and refresh tokens
2. **Using Access Token**: Include the access token in API requests
3. **Token Refresh**: Use the refresh token to get a new access token when it expires
4. **Logout**: Discard tokens on the client side

## Obtaining Tokens

To authenticate with the API, you first need to obtain an access token and refresh token by logging in:

```graphql
mutation {
  auth_login(input: {
    username: "your-username",
    password: "your-password"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      username
      roles
    }
  }
}
```

### Response Example:

```json
{
  "data": {
    "auth_login": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "username": "your-username",
        "roles": ["staff"]
      }
    }
  }
}
```

## Making Authenticated Requests

To make authenticated requests, include the access token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example with curl:

```bash
curl 'https://your-domain.com/v1/graphql' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  --data-binary '{"query":"query { client_list(input: {officeId: \"123\"}) { totalCount clients { id displayName } } }"}'
```

### Example with a GraphQL client:

```javascript
import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'https://your-domain.com/v1/graphql',
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = localStorage.getItem('accessToken');
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});
```

## Refreshing Tokens

Access tokens have a limited lifespan (typically 1 hour). When an access token expires, use the refresh token to obtain a new one:

```graphql
mutation {
  auth_refresh_token(input: {
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }) {
    accessToken
    refreshToken
    expiresIn
  }
}
```

### Response Example:

```json
{
  "data": {
    "auth_refresh_token": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

## JWT Token Structure

The JWT tokens used by Fineract contain the following claims:

```json
{
  "sub": "user-uuid",          // Subject (User ID)
  "iat": 1620000000,           // Issued At timestamp
  "exp": 1620003600,           // Expiration timestamp
  "roles": ["admin", "staff"],  // User roles
  "perms": ["CREATE_USER", "VIEW_LOAN", "..."],  // User permissions
  "off": "office-uuid",        // Office ID
  "tn": "tenant-identifier",   // Tenant ID
  "typ": "access",             // Token type (access or refresh)
  "jti": "token-uuid"          // JWT ID (unique identifier)
}
```

## Security Considerations

1. **Token Storage**: 
   - Store tokens securely (e.g., HttpOnly cookies or secure storage)
   - Never store tokens in local storage for production applications

2. **Token Validation**:
   - Always verify tokens on the server side
   - Check expiration and signature validity

3. **HTTPS**: 
   - Always use HTTPS to protect token transmission
   - Never send tokens over unencrypted connections

4. **Token Scope**:
   - Access tokens provide full access to permitted resources
   - Implement proper logout by discarding tokens

## Error Handling

Common authentication-related errors:

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INVALID_CREDENTIALS` | Username or password is incorrect | Verify credentials |
| `ACCOUNT_LOCKED` | Account is locked due to too many failed attempts | Contact administrator |
| `INVALID_TOKEN` | Token is invalid or malformed | Re-authenticate |
| `EXPIRED_TOKEN` | Token has expired | Refresh the token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Request additional permissions |

## Multi-tenancy Support

For multi-tenant deployments, the JWT includes a tenant identifier (`tn` claim). Hasura automatically uses this claim to apply row-level security, ensuring users can only access data for their tenant.

## Password Requirements

The system enforces the following password requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Account Security

For enhanced security, the system:

- Locks accounts after 5 failed login attempts
- Enforces password expiration (90 days by default)
- Requires different passwords when changing (no reuse of last 5 passwords)
- Supports two-factor authentication (if enabled)