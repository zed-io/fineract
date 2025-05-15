# GraphQL Implementation for Fineract Front-ends

This document explains the GraphQL implementation in both the Angular web-app and Next.js credit-cloud-admin application.

## Overview

We've implemented Apollo Client for both frontend applications to enable seamless GraphQL integration with the Fineract Hasura GraphQL API. The implementation includes:

1. Setting up Apollo Client with proper configuration
2. Creating authentication handling for GraphQL requests
3. Setting up code generation for TypeScript types
4. Creating sample components that use GraphQL

## Angular Web App Implementation

### Core Components

- **GraphQL Module** (`/src/app/core/graphql/graphql.module.ts`): Configures Apollo Client with authentication handling
- **Code Generation** (`/codegen.ts`): Configuration for generating TypeScript types from GraphQL schema
- **Sample GraphQL Queries** (`/src/app/core/graphql/queries/clients.graphql`): Example query definitions
- **Demo Component** (`/src/app/core/graphql/components/graphql-client-list.component.ts`): Sample component demonstrating GraphQL usage

### Usage Example

```typescript
import { Component } from '@angular/core';
import { GetClientsGQL } from '../generated/graphql';

@Component({
  selector: 'app-example',
  template: `
    <div *ngIf="clients$ | async as clients">
      <ul>
        <li *ngFor="let client of clients">
          {{ client.displayName }}
        </li>
      </ul>
    </div>
  `
})
export class ExampleComponent {
  clients$ = this.getClientsGQL.watch({
    limit: 10,
    offset: 0
  })
  .valueChanges
  .pipe(
    map(result => result.data?.clients || [])
  );

  constructor(private getClientsGQL: GetClientsGQL) {}
}
```

### Authentication

The implementation automatically adds authentication headers to GraphQL requests:

- JWT token from AuthenticationService when available
- Tenant ID header for multi-tenancy support
- Admin secret fallback for development environments

## Next.js Credit-Cloud-Admin Implementation

### Core Components

- **Apollo Client Configuration** (`/apollo.ts`): Setup for multiple Apollo Clients (Fineract, WAM, CreditCloud)
- **Apollo Provider** (`/src/providers/apollo-provider.tsx`): React provider for Apollo Client
- **Provider Integration** (`/src/providers/providers.tsx`): Integration with other app providers
- **Demo Component** (`/src/components/graphql-examples/clients-list-graphql.tsx`): Sample component using GraphQL
- **Demo Page** (`/src/app/dashboard/graphql-demo/page.tsx`): Page showcasing GraphQL component

### Usage Example

```tsx
import { useQuery, gql } from '@apollo/client';

const GET_DATA = gql`
  query GetSomeData {
    myData {
      id
      name
    }
  }
`;

function MyComponent() {
  const { loading, error, data } = useQuery(GET_DATA);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <div>
      {data.myData.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Authentication

The Apollo Client is configured to handle authentication through:

- JWT tokens from auth store
- Tenant ID headers for multi-tenancy
- Admin secret fallback for development

## Code Generation

Both applications use GraphQL Code Generator to automatically generate TypeScript types and hooks from the GraphQL schema and operations.

### Angular

```bash
npm run generate
```

This generates:
- TypeScript interfaces for all GraphQL types
- Angular services for queries and mutations

### Next.js

```bash
pnpm generate
```

This generates:
- TypeScript types for all GraphQL operations
- React hooks for queries and mutations

## Directory Structure

```
front-ends/
├── web-app/                           # Angular application
│   ├── src/app/core/graphql/
│   │   ├── graphql.module.ts          # Apollo Client configuration
│   │   ├── queries/                    # GraphQL query definitions
│   │   ├── components/                 # Sample GraphQL components
│   │   └── generated/                  # Generated types (after running codegen)
│   └── codegen.ts                     # GraphQL code generation config
│
└── credit-cloud-admin/                # Next.js application
    ├── src/
    │   ├── apollo.ts                  # Apollo Client configuration
    │   ├── providers/
    │   │   ├── apollo-provider.tsx    # Apollo Provider component
    │   │   └── providers.tsx          # Provider integration
    │   └── components/graphql-examples/ # Sample GraphQL components
    └── codegen.ts                     # GraphQL code generation config
```

## Authentication Flow

1. The Apollo Client is initialized with appropriate link composition
2. Authentication link intercepts all requests to add auth headers
3. JWT tokens are retrieved from the authentication service/store
4. Tenant IDs are added for multi-tenancy support
5. Admin secret is used as fallback in development environments

## Error Handling

Both implementations include error handling:
- Network errors are caught and logged
- Authentication errors trigger logout/redirect
- GraphQL errors are displayed to the user

## Recommended Practices

1. Define all GraphQL operations in separate `.graphql` files
2. Use generated types for type safety
3. Keep queries and mutations focused and specific
4. Use fragments for reusable parts of queries
5. Implement proper error handling and loading states