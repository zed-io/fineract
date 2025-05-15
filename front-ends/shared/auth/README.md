# Fineract Unified Authentication System

This module provides a unified authentication system for Fineract front-end applications, supporting both Angular and React/Next.js frameworks. It is designed to work seamlessly across different front-end applications while providing consistent authentication features.

## Features

- Framework-agnostic core authentication logic
- Framework-specific implementations for Angular and React/Next.js
- Support for JWT, Basic Auth, and OAuth2 authentication methods
- Two-Factor Authentication (2FA) support
- Password expiry and reset functionality
- Integration with Hasura GraphQL API through JWT tokens
- Automatic token refresh
- Persistent authentication state
- Cross-application session management

## Installation

### For Angular Applications

1. Import the `FineractAuthModule` in your app module:

```typescript
import { FineractAuthModule, DEFAULT_AUTH_CONFIG } from '@fineract/shared/auth';

@NgModule({
  imports: [
    // ...other imports
    FineractAuthModule.forRoot({
      ...DEFAULT_AUTH_CONFIG,
      apiUrl: environment.apiUrl,
      hasuraUrl: environment.hasuraUrl,
      oauthConfig: environment.oauth
    })
  ]
})
export class AppModule { }
```

2. Use the `AngularAuthService` in your components:

```typescript
import { Component } from '@angular/core';
import { AngularAuthService, AuthCredentials } from '@fineract/shared/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  constructor(private authService: AngularAuthService) {}

  login(credentials: AuthCredentials): void {
    this.authService.authenticate(credentials).subscribe({
      next: () => {
        // Handle successful login
      },
      error: (error) => {
        // Handle login error
      }
    });
  }
}
```

3. Protect routes with the `AuthGuard`:

```typescript
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@fineract/shared/auth';

const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
```

### For React/Next.js Applications

1. Wrap your application with the `AuthProvider`:

```tsx
// _app.tsx or App.tsx
import { AuthProvider, DEFAULT_AUTH_CONFIG } from '@fineract/shared/auth';

const authConfig = {
  ...DEFAULT_AUTH_CONFIG,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  hasuraUrl: process.env.NEXT_PUBLIC_HASURA_URL
};

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider config={authConfig}>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
```

2. Use the `useAuth` hook in your components:

```tsx
import { useAuth, AuthCredentials } from '@fineract/shared/auth';

function LoginPage() {
  const { login, loading, error } = useAuth();

  const handleLogin = async (credentials: AuthCredentials) => {
    try {
      await login(credentials);
      // Handle successful login (e.g., redirect)
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  return (
    <form onSubmit={/* form submit handler */}>
      {/* Login form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

3. Create a route middleware for authentication:

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/register', '/forgot-password'];
  
  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }
  
  // Check for authentication cookie/token
  const authToken = request.cookies.get('fineract_auth')?.value;
  
  if (!authToken) {
    // Redirect to login if not authenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Two-Factor Authentication

The library provides built-in support for two-factor authentication:

### Angular Example

```typescript
@Component({
  selector: 'app-two-factor',
  templateUrl: './two-factor.component.html'
})
export class TwoFactorComponent {
  constructor(private authService: AngularAuthService) {}

  requestCode(deliveryMethod: string): void {
    this.authService.requestTwoFactorCode({ 
      deliveryMethod,
      extendedToken: true
    }).subscribe();
  }

  validateCode(code: string): void {
    this.authService.validateTwoFactorCode(code).subscribe({
      next: () => {
        // Handle successful validation
      },
      error: (error) => {
        // Handle validation error
      }
    });
  }
}
```

### React Example

```tsx
function TwoFactorPage() {
  const { requestTwoFactorCode, validateTwoFactorCode, loading, error } = useAuth();
  const [code, setCode] = useState('');

  const handleRequestCode = async (deliveryMethod: string) => {
    try {
      await requestTwoFactorCode({ 
        deliveryMethod,
        extendedToken: true
      });
      // Show message that code was sent
    } catch (error) {
      // Handle error
    }
  };

  const handleValidateCode = async () => {
    try {
      await validateTwoFactorCode(code);
      // Redirect on success
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  return (
    <div>
      <h2>Two-Factor Authentication</h2>
      <button onClick={() => handleRequestCode('email')} disabled={loading}>
        Send Code to Email
      </button>
      <input 
        type="text" 
        value={code} 
        onChange={(e) => setCode(e.target.value)} 
        placeholder="Enter code"
      />
      <button onClick={handleValidateCode} disabled={loading}>
        Verify
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## Hasura GraphQL Integration

The library provides seamless integration with Hasura GraphQL API:

### Generate Hasura JWT Token

```typescript
// Angular
this.authService.generateHasuraToken().then(token => {
  console.log('Hasura JWT token generated:', token);
});

// React
const { generateHasuraToken } = useAuth();
generateHasuraToken().then(token => {
  console.log('Hasura JWT token generated:', token);
});
```

### API Route for Hasura Token Generation

The example below shows a Next.js API route for generating Hasura-compatible JWT tokens:

```typescript
// pages/api/hasura-token.ts
import { NextApiRequest, NextApiResponse } from 'next';
import * as jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the Fineract auth token from headers
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const tenantId = req.headers['fineract-platform-tenantid'] || 'default';
    
    // Parse request body
    const { userId, username, officeId, roles } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // JWT secret should be environment variable
    const jwtSecret = process.env.HASURA_JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }
    
    // Determine Hasura roles based on Fineract roles
    const hasuraRoles = ['user'];
    if (roles && roles.includes('ADMIN')) {
      hasuraRoles.push('admin');
    }
    
    // Create JWT payload with Hasura claims
    const payload = {
      sub: userId.toString(),
      name: username,
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": hasuraRoles,
        "x-hasura-default-role": hasuraRoles[0],
        "x-hasura-user-id": userId.toString(),
        "x-hasura-office-id": officeId?.toString(),
        "x-hasura-tenant-id": tenantId
      },
      // Set expiration to 8 hours
      exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
    };
    
    // Sign the JWT token
    const token = jwt.sign(payload, jwtSecret);
    
    // Return the token and expiration
    return res.json({
      token,
      expiresAt: payload.exp * 1000 // Convert to milliseconds
    });
  } catch (error: any) {
    console.error('Error generating Hasura token:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
```

## Configuration Options

The authentication library can be configured with the following options:

```typescript
interface AuthConfig {
  // Base URL for Fineract API
  apiUrl: string;
  
  // Hasura GraphQL URL (optional)
  hasuraUrl?: string;
  
  // OAuth2 configuration (optional)
  oauthConfig?: {
    enabled: boolean;
    serverUrl: string;
    appId: string;
  };
  
  // Default tenant ID for multi-tenant environments
  defaultTenantId: string;
  
  // Storage keys for persistent state
  storageKeys: {
    auth: string;
    token: string;
    twoFactor: string;
  };
  
  // Time threshold before token expiry to trigger refresh (milliseconds)
  tokenRefreshThreshold: number;
}
```

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production to protect authentication tokens.
2. **Token Storage**: Authentication tokens are stored in browser storage, which has inherent security limitations. Consider shorter token expiry times for sensitive applications.
3. **API Routes**: Secure API routes for token generation and validation.
4. **Environment Variables**: Store sensitive configuration values like JWT secrets in environment variables.

## Contributing

Contributions to improve the authentication library are welcome. Please ensure that changes maintain compatibility with both Angular and React/Next.js frameworks.