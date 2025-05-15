# Angular Web-App to Next.js Conversion Plan

This document outlines the strategy for converting the Angular-based Mifos web-app to a modern Next.js application following the patterns established in the credit-cloud-admin codebase.

## 1. Project Structure

| Angular (Current) | Next.js (Target) |
|-------------------|------------------|
| Module-based organization | App router with directory-based routing |
| Component files co-located (.html, .scss, .ts) | React components with JSX and Tailwind |
| Service-based data fetching | Apollo Client + GraphQL/REST with Zustand |
| Angular Material UI | shadcn/ui components |

### Folder Structure Mapping

```
Angular web-app                     Next.js credit-cloud-admin
-------------------                 ------------------------
/src/app/                           /src/
  /clients/                           /app/
    /clients.module.ts                  /dashboard/clients/
    /clients-view/                        /[id]/
      /clients-view.component.ts            /page.tsx
    /clients.service.ts                   /page.tsx
                                        /api/clients/
                                          /route.ts
  /shared/                             /components/
    /material.module.ts                  /ui/
  /core/                               /providers/
    /authentication/                     /auth-provider.tsx
  /directives/                         /lib/utils.ts
```

## 2. Authentication Strategy

Create a hybrid authentication approach that supports both:

1. **Firebase Authentication** - For compatibility with credit-cloud-admin
2. **JWT Authentication** - For compatibility with Fineract API

Implementation:
- Create an AuthProvider that supports both authentication mechanisms
- Use Zustand store for auth state management (`AuthStore`)
- Implement token refresh handling for JWT authentication
- Support Hasura JWT claims for both authentication methods

## 3. Hasura Integration

Extend the existing Apollo clients to support:

1. **Credit Cloud GraphQL API** - Already implemented
2. **Web-App REST API** - Add REST data source

Key considerations:
- Reuse the existing `apollo.ts` configuration
- Create GraphQL schemas for Fineract endpoints
- Implement permission rules similar to those in `client_self_service_permissions.json`
- Add JWT token handling for Hasura authorization

## 4. UI Component Migration

Map Angular Material components to shadcn/ui equivalents:

| Angular Material | shadcn/ui |
|------------------|-----------|
| mat-button | Button |
| mat-table | DataTable |
| mat-dialog | Dialog |
| mat-form-field | Input + Label |
| mat-select | Select |
| mat-card | Card |
| mat-tab | Tabs |
| mat-progress-bar | Progress |
| mat-sidenav | Sheet or sidebar |
| mat-snackbar | Toast |

## 5. State Management

Convert Angular services to Zustand stores:

1. Identify key services in the Angular app
2. Create corresponding Zustand stores
3. Implement Apollo Client for GraphQL data fetching
4. Use React Query for REST API calls

Example store migration:
```typescript
// Angular service:
@Injectable()
export class ClientsService {
  getClients(): Observable<Client[]> { ... }
}

// Next.js Zustand store:
export const useClientStore = create<ClientState & ClientActions>((set) => ({
  clients: [],
  loading: false,
  fetchClients: async () => {
    set({ loading: true });
    // Use Apollo client or fetch
    set({ clients: data, loading: false });
  }
}));
```

## 6. Route Mapping

Map Angular routes to Next.js app directory:

| Angular Route | Next.js Route |
|---------------|---------------|
| /home | /dashboard |
| /clients | /dashboard/clients |
| /clients/:id | /dashboard/clients/[id] |
| /loans | /dashboard/loans |
| /loans/:id | /dashboard/loans/[id] |
| /savings | /dashboard/savings |
| /savings/:id | /dashboard/savings/[id] |

## 7. Data Fetching Strategy

Replace Angular's HttpClient with:

1. **Apollo Client** - For GraphQL queries and subscriptions
2. **fetch API** - For direct REST calls
3. **Server Components** - For server-side data fetching

Data fetching patterns:
- Use React Query for REST API caching and state management
- Implement Apollo Client for GraphQL operations
- Create custom hooks for complex data fetching logic

## 8. Styling Migration

Convert SCSS to Tailwind CSS:

1. Analyze existing SCSS variables and create Tailwind theme
2. Extend the current Tailwind configuration with Mifos-specific colors
3. Convert component styling to utility classes

Theme variables to extend:
```js
// Add to tailwind.config.js
theme: {
  extend: {
    colors: {
      // Existing theme colors
      // ...
      
      // Mifos-specific colors from web-app
      mifos: {
        primary: '#4fa2db',
        secondary: '#5e819d',
        success: '#1abc9c',
        warning: '#f39c12',
        danger: '#e74c3c',
      }
    }
  }
}
```

## 9. Feature Implementation Plan

### Phase 1: Core Infrastructure
- Setup Next.js project structure
- Implement authentication system
- Create base UI components and layouts
- Build Hasura integration

### Phase 2: Dashboard & Basic Functionality
- Implement dashboard
- Develop client management features
- Build loan overview features
- Create savings account view

### Phase 3: Advanced Features
- Implement loan management
- Build transaction management
- Develop reporting features
- Add administrative functions

### Phase 4: Testing & Refinement
- Comprehensive testing
- Performance optimization
- Accessibility improvements
- Documentation

## 10. Testing Strategy

- Use Jest for unit testing
- Implement Cypress for E2E testing
- Create component tests with React Testing Library
- Ensure test coverage for critical features

## 11. Accessibility & Internationalization

- Implement Next.js internationalization
- Ensure WCAG 2.1 AA compliance
- Support RTL languages
- Maintain existing language translations

## 12. Deployment Strategy

- Configure CI/CD pipeline
- Set up staging and production environments
- Implement feature flags for gradual rollout
- Create monitoring and error tracking

## Next Steps

1. Set up project skeleton
2. Create authentication provider
3. Implement base UI components
4. Build dashboard layout
5. Develop client list and detail views