# Frontend GraphQL Migration Strategy

This document outlines a comprehensive approach for migrating the existing frontend applications from REST to GraphQL API while maintaining backward compatibility.

## 1. Current Landscape Assessment

### Existing Frontend Applications

1. **Web App (Angular)**
   - Traditional Angular application using services for REST API calls
   - Angular Material UI components
   - Module-based architecture with routing

2. **Credit Cloud Admin (Next.js)**
   - Modern React application using Next.js
   - Apollo Client for GraphQL
   - Tailwind CSS with shadcn/ui components
   - Uses Firebase authentication

### Current API Consumption Patterns

1. **REST API (Web App)**
   - HTTP client for fetching data
   - JSON transformation in services
   - Token-based authentication

2. **GraphQL API (Credit Cloud Admin)**
   - Apollo Client for queries and mutations
   - Client-side state with Apollo Cache
   - Subscription support

## 2. GraphQL Migration Approach

### Phased Transition Strategy

**Phase 1: Infrastructure Setup**
- Configure Apollo Client for both applications
- Implement unified authentication handling
- Create GraphQL schema types for core entities
- Setup proper error handling

**Phase 2: Incremental Module Migration**
- Migrate modules one by one, prioritizing by complexity and usage
- Create parallel implementations (REST and GraphQL)
- Update component data fetching logic
- Validate functionality is equivalent

**Phase 3: REST API Deprecation**
- Remove REST implementation once all modules are migrated
- Clean up legacy code and dependencies
- Optimize GraphQL queries

### Authentication Integration

1. **Unified Auth Provider**
   - Support JWT and Firebase authentication
   - Handle token refresh automatically
   - Store authentication state in global store
   - Provide consistent auth hooks across apps

2. **JWT Token Handling**
   - Configure Apollo Client to include authentication headers
   - Handle token expiration and refresh
   - Support Hasura claims for authorization

## 3. Technical Implementation Plan

### Apollo Client Configuration

```typescript
// apollo-client.ts
import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { getAuthToken } from './auth-utils';

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Auth link for adding headers
const authLink = new ApolloLink((operation, forward) => {
  const token = getAuthToken();
  
  operation.setContext({
    headers: {
      authorization: token ? `Bearer ${token}` : '',
      'x-hasura-role': 'user' // or appropriate role
    }
  });
  
  return forward(operation);
});

// HTTP link for GraphQL endpoint
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_API || 'http://localhost:8080/v1/graphql'
});

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all'
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  }
});
```

### GraphQL Code Generation

Implement code generation for type-safe GraphQL operations:

```bash
# Install dependencies
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo

# Create config file - codegen.ts
```

```typescript
// codegen.ts
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_API || 'http://localhost:8080/v1/graphql',
  documents: ['src/**/*.graphql', 'src/**/*.tsx'],
  generates: {
    './src/generated/': {
      preset: 'client',
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo'
      ],
      config: {
        skipTypename: false,
        withHooks: true,
        withHOC: false,
        withComponent: false
      }
    }
  }
};

export default config;
```

### Angular Integration Strategy

For the Angular application, implement a hybrid approach:

1. **Apollo Angular Package**
   - Install and configure Apollo Angular
   - Create GraphQL module for centralized configuration

2. **Service Refactoring**
   - Create GraphQL versions of existing services
   - Implement adapter pattern for backward compatibility
   - Gradually migrate components to use GraphQL services

```typescript
// apollo.module.ts
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { AuthService } from '../core/auth/auth.service';

export function createApollo(
  httpLink: HttpLink,
  authService: AuthService
): ApolloClientOptions<any> {
  const basic = setContext(() => ({
    headers: {
      'Content-Type': 'application/json',
    },
  }));

  const auth = setContext(() => {
    const token = authService.getToken();
    if (token === null) {
      return {};
    } else {
      return {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    }
  });

  const link = ApolloLink.from([
    basic,
    auth,
    httpLink.create({ uri: environment.graphqlUrl }),
  ]);

  return {
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
    },
  };
}

@NgModule({
  imports: [HttpClientModule],
  providers: [
    {
      provide: APOLLO_OPTIONS,
      useFactory: createApollo,
      deps: [HttpLink, AuthService],
    },
  ],
})
export class GraphQLModule {}
```

## 4. Module Migration Prioritization

Migrate modules in the following order of priority:

1. **Client Module**
   - Basic client listing and details
   - Client creation and update
   - Document management

2. **Authentication Module**
   - User authentication
   - Permission handling
   - User profile management

3. **Loan Module**
   - Loan application and processing
   - Loan details and status
   - Repayment schedules

4. **Savings Module**
   - Account management
   - Transactions
   - Statements

5. **Remaining Modules**
   - Fixed deposits
   - Recurring deposits
   - Share accounts
   - Accounting
   - Reporting

## 5. Component Refactoring Examples

### Angular Component Refactoring

**Before (REST):**
```typescript
// clients.component.ts
import { Component, OnInit } from '@angular/core';
import { ClientsService } from '../../services/clients.service';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clients: any[] = [];
  isLoading = false;

  constructor(private clientsService: ClientsService) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.isLoading = true;
    this.clientsService.getClients().subscribe(
      (data) => {
        this.clients = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error loading clients', error);
        this.isLoading = false;
      }
    );
  }
}
```

**After (GraphQL):**
```typescript
// clients.component.ts
import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { GET_CLIENTS } from './graphql/queries';

@Component({
  selector: 'app-clients',
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  clients: any[] = [];
  isLoading = false;

  constructor(private apollo: Apollo) {}

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.isLoading = true;
    this.apollo.watchQuery({
      query: GET_CLIENTS,
      variables: {
        limit: 20,
        offset: 0
      }
    }).valueChanges.subscribe(
      ({ data, loading }) => {
        if (data) {
          this.clients = data.clients;
        }
        this.isLoading = loading;
      },
      (error) => {
        console.error('Error loading clients', error);
        this.isLoading = false;
      }
    );
  }
}
```

### Next.js Component Refactoring

**Before (Mixed REST/GraphQL):**
```tsx
// ClientDetails.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'next/router';
import { fetchClientById } from '@/services/api';

export default function ClientDetails() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClient() {
      try {
        const data = await fetchClientById(id);
        setClient(data);
      } catch (error) {
        console.error('Error loading client', error);
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!client) return <div>Client not found</div>;

  return (
    <div>
      <h1>{client.displayName}</h1>
      <p>Account: {client.accountNo}</p>
      {/* More client details */}
    </div>
  );
}
```

**After (Full GraphQL):**
```tsx
// ClientDetails.tsx
import { useQuery } from '@apollo/client';
import { useParams } from 'next/router';
import { GET_CLIENT } from '@/graphql/queries';

export default function ClientDetails() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(GET_CLIENT, {
    variables: { id },
    fetchPolicy: 'cache-and-network'
  });

  if (loading && !data) return <div>Loading...</div>;
  if (error) return <div>Error loading client: {error.message}</div>;
  if (!data?.client) return <div>Client not found</div>;

  const { client } = data;

  return (
    <div>
      <h1>{client.displayName}</h1>
      <p>Account: {client.accountNo}</p>
      {/* More client details */}
    </div>
  );
}
```

## 6. GraphQL Schema Types

Define TypeScript types for GraphQL schema to ensure type safety:

```typescript
// src/generated/graphql.ts (automatically generated)

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };

export type Client = {
  __typename?: 'Client';
  id: Scalars['ID'];
  accountNo: Scalars['String'];
  status: ClientStatus;
  firstname?: Maybe<Scalars['String']>;
  lastname?: Maybe<Scalars['String']>;
  displayName: Scalars['String'];
  activationDate?: Maybe<Scalars['DateTime']>;
  submittedDate: Scalars['DateTime'];
  mobileNo?: Maybe<Scalars['String']>;
  emailAddress?: Maybe<Scalars['String']>;
  externalId?: Maybe<Scalars['String']>;
  addresses: Array<ClientAddress>;
  identifiers: Array<ClientIdentifier>;
  documents: Array<ClientDocument>;
  notes: Array<ClientNote>;
  familyMembers: Array<ClientFamilyMember>;
  accounts: ClientAccounts;
};

export type ClientStatus = {
  __typename?: 'ClientStatus';
  id: Scalars['Int'];
  code: Scalars['String'];
  value: Scalars['String'];
};

// More type definitions...
```

## 7. Testing Strategy

### Unit Testing

1. **Angular Tests**
   - Test Apollo service wrappers
   - Mock GraphQL responses
   - Validate component rendering with data

2. **React Tests**
   - Test Apollo hooks with React Testing Library
   - Mock Apollo Provider for components
   - Test loading and error states

### Integration Testing

1. **E2E Tests with Cypress**
   - Test complete user flows
   - Intercept GraphQL operations
   - Validate UI state after operations

### Manual Testing Checklist

For each migrated module, verify:
- Data is displayed correctly
- All CRUD operations work
- Error handling is appropriate
- Performance is acceptable

## 8. Performance Considerations

1. **Query Optimization**
   - Use fragments for reusable query parts
   - Select only needed fields
   - Implement pagination for large datasets

2. **Caching Strategy**
   - Configure Apollo Cache policies
   - Implement optimistic UI updates
   - Use cache invalidation for consistency

3. **Network Optimization**
   - Batch related queries
   - Implement retry logic for failures
   - Monitor network performance

## 9. Migration Timeline

| Phase | Timeframe | Description |
|-------|-----------|-------------|
| Infrastructure Setup | 2 weeks | Apollo configuration, authentication, base components |
| Client Module | 2 weeks | Client listings, details, and management |
| Authentication Module | 1 week | Login, user management, permissions |
| Loan Module | 3 weeks | Loan applications, processing, repayments |
| Savings Module | 2 weeks | Account management, transactions |
| Remaining Modules | 4 weeks | Fixed deposits, recurring deposits, shares, accounting |
| Testing & Optimization | 2 weeks | Performance tuning, comprehensive testing |

## 10. Success Metrics

Measure the success of the migration using these metrics:

1. **Feature Parity**
   - All existing features work with GraphQL API
   - No regression in functionality

2. **Performance**
   - Equal or better response times
   - Reduced network payload size
   - Improved client-side rendering speed

3. **Developer Experience**
   - Reduced code complexity
   - Improved type safety
   - Easier state management

4. **User Experience**
   - Faster perceived performance
   - More responsive UI updates
   - Improved error handling

## Next Steps

1. Set up Apollo Client configuration for both applications
2. Create GraphQL schema type definitions
3. Implement authentication integration
4. Begin client module migration as proof of concept
5. Establish testing frameworks and benchmarks