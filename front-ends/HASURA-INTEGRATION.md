# Hasura Integration Strategy

This document outlines the strategy for integrating the Next.js application with Hasura GraphQL API while maintaining compatibility with both the credit-cloud-admin and web-app functionality.

## 1. Current Architecture

The credit-cloud-admin app currently uses:
- **Apollo Client** for GraphQL operations
- **Firebase Authentication** for user management
- **Hasura GraphQL API** with admin secret authorization
- Two GraphQL clients (creditCloud and wam)

## 2. Integration Requirements

The converted application needs to:
- Support Fineract API endpoints in addition to existing GraphQL
- Maintain existing permission rules for client self-service
- Provide a unified authentication approach
- Handle both Apollo subscription and REST API requests

## 3. Authentication Integration

### Unified Auth Provider

Create a unified authentication provider that supports both Firebase and JWT authentication:

```typescript
// Enhanced Auth Provider
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { AuthStore } from '@/stores/auth';

export const AuthContext = createContext<{
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  user: any;
  loading: boolean;
}>({
  signIn: async () => {},
  signOut: async () => {},
  signInWithToken: async () => {},
  user: null,
  loading: true
});

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const updateAuthStore = AuthStore((state) => state.updateAuthStore);
  
  // Method 1: Firebase Auth
  const signIn = async (email, password) => {
    // Firebase sign in
  };
  
  // Method 2: JWT Auth (for Fineract)
  const signInWithToken = async (token) => {
    // Store JWT token and user info
  };
  
  // Unified sign out
  const signOut = async () => {
    // Clear both auth types
  };
  
  // Listen for auth changes
  useEffect(() => {
    return auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Process Firebase user
      } else {
        // Check for JWT token
      }
      setLoading(false);
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{ signIn, signOut, signInWithToken, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## 4. GraphQL Client Configuration

Extend the existing Apollo configuration to support the Fineract API:

```typescript
// Enhanced Apollo Client
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';
import { AuthStore } from '@/stores/auth';

export enum ClientType {
  creditCloud = "creditCloud",
  wam = "wam",
  fineract = "fineract"
}

const createApolloClient = (clientType: ClientType) => {
  // Existing clients (creditCloud, wam)
  
  // New Fineract client
  if (clientType === ClientType.fineract) {
    const httpLink = new HttpLink({
      uri: `${process.env.NEXT_PUBLIC_FINERACT_GRAPHQL_ENDPOINT || 'http://localhost:8080/hasura/v1/graphql'}`
    });
    
    const authLink = setContext((_, { headers }) => {
      // Get the authentication token from store
      const token = AuthStore.getState().token;
      
      return {
        headers: {
          ...headers,
          authorization: token ? `Bearer ${token}` : "",
        }
      };
    });

    const wsLink = new GraphQLWsLink(
      createClient({
        url: `${process.env.NEXT_PUBLIC_FINERACT_WS_ENDPOINT || 'ws://localhost:8080/hasura/v1/graphql'}`,
        connectionParams: () => ({
          headers: {
            authorization: `Bearer ${AuthStore.getState().token}`,
          },
        }),
        reconnect: true,
      })
    );
    
    const splitLink = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      authLink.concat(httpLink)
    );
    
    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  }
  
  // Return existing client implementation
};

// Create and export client instances
export const creditCloudClient = createApolloClient(ClientType.creditCloud);
export const wamClient = createApolloClient(ClientType.wam);
export const fineractClient = createApolloClient(ClientType.fineract);
```

## 5. REST API Integration

Create REST API service for direct Fineract API calls:

```typescript
// src/services/api.ts
import { AuthStore } from '@/stores/auth';

const API_URL = process.env.NEXT_PUBLIC_FINERACT_API_URL || 'https://localhost:8443/fineract-provider/api/v1';

export const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const token = AuthStore.getState().token;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'Fineract-Platform-TenantId': 'default'
      },
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  },
  
  get: (endpoint: string) => api.fetch(endpoint),
  
  post: (endpoint: string, data: any) => api.fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (endpoint: string, data: any) => api.fetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (endpoint: string) => api.fetch(endpoint, {
    method: 'DELETE'
  })
};
```

## 6. React Query Integration for REST API

Use React Query for caching and managing REST API state:

```typescript
// src/hooks/useFineractApi.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '@/services/api';

// Client API
export const useClients = () => {
  return useQuery('clients', () => api.get('/clients'));
};

export const useClient = (id: string) => {
  return useQuery(['client', id], () => api.get(`/clients/${id}`));
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation(
    (client: any) => api.post('/clients', client),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('clients');
      },
    }
  );
};

// Similar hooks for loans, savings, etc.
```

## 7. Hasura Permission Mapping

Implement permission rules similar to those in the Hasura metadata:

```typescript
// src/lib/hasura-permissions.ts
export const hasuraPermissions = {
  client_self_service: {
    tables: {
      client: {
        select: {
          columns: [
            'account_no',
            'activation_date',
            'client_type',
            'company_name',
            'display_name',
            'email_address',
            'external_id',
            'firstname',
            'fullname',
            'id',
            'lastname',
            'middlename',
            'mobile_no',
            'status',
            'submitted_date'
          ],
          filter: {
            id: {
              _eq: 'X-Hasura-Client-Id'
            }
          }
        }
      },
      // Other table permissions
    }
  }
};

// These can be used to validate client-side access or
// in server components to control data access
```

## 8. Using Both GraphQL and REST in Components

Example component using both GraphQL and REST API:

```typescript
// src/app/dashboard/clients/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useClient } from '@/hooks/useFineractApi';
import { useClientLoansQuery } from '@/generated/graphql';
import { fineractClient } from '@/apollo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApolloProvider } from '@apollo/client';

export default function ClientDetailsPage() {
  const { id } = useParams();
  
  // REST API call via React Query
  const { data: client, isLoading: clientLoading } = useClient(id as string);
  
  if (clientLoading) {
    return <div>Loading client details...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{client.displayName}</h1>
      
      {/* Client details from REST API */}
      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Account #: {client.accountNo}</p>
          <p>Status: {client.status.value}</p>
          {/* More client details */}
        </CardContent>
      </Card>
      
      {/* Loans from GraphQL */}
      <ApolloProvider client={fineractClient}>
        <ClientLoans clientId={id as string} />
      </ApolloProvider>
    </div>
  );
}

// Component using GraphQL
function ClientLoans({ clientId }: { clientId: string }) {
  const { data, loading } = useClientLoansQuery({
    variables: { clientId }
  });
  
  if (loading) return <div>Loading loans...</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loans</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Render loans from GraphQL data */}
      </CardContent>
    </Card>
  );
}
```

## 9. Extending Hasura Metadata

Steps to integrate existing web-app data with Hasura:

1. Create tables in Hasura for all Fineract entities
2. Set up Hasura as a proxy over Fineract API
3. Configure Hasura permissions to match Fineract permissions
4. Create relationships between entities
5. Define GraphQL operations for common queries

## 10. JWT Authentication with Hasura

Configure Hasura to accept JWT tokens from Fineract:

```json
{
  "type": "RS256",
  "jwk_url": "https://fineract-server/.well-known/jwks.json",
  "claims_format": "json",
  "claims_namespace": "https://hasura.io/jwt/claims",
  "claims_namespace_path": "$.hasura.claims",
  "audience": "fineract-web-app",
  "issuer": "fineract"
}
```

## 11. Implementation Phases

### Phase 1: Basic Connectivity
- Set up Apollo Client for Fineract GraphQL
- Implement REST API service
- Create authentication provider with dual support

### Phase 2: Data Integration
- Create GraphQL schemas for core entities
- Implement React Query hooks for REST API
- Build data fetching components

### Phase 3: Advanced Features
- Implement real-time subscriptions 
- Build transaction management with optimistic updates
- Create complex reporting using GraphQL

### Phase 4: Security and Performance
- Audit and secure all data access
- Implement caching strategies
- Optimize query performance

## Next Steps

1. Create authentication provider
2. Set up Apollo Client configuration
3. Implement basic REST API service
4. Build React Query hooks for core entities