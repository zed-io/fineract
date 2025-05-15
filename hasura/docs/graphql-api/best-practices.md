# API Best Practices

This guide outlines recommended practices for using the Fineract GraphQL API efficiently and effectively. Following these guidelines will help ensure optimal performance, security, and maintainability for your applications.

## Query Design

### Request Only What You Need

One of GraphQL's key advantages is the ability to request only the fields you need. Always tailor your queries to include just the data required for your specific use case:

```graphql
# BAD: Requesting everything, including fields you don't need
query {
  client_get(input: { id: "123" }) {
    id
    accountNo
    externalId
    status
    subStatus
    activationDate
    officeId
    officeName
    staffId
    staffName
    submittedDate
    mobileNo
    emailAddress
    dateOfBirth
    gender
    clientType
    legalForm
    # ... and many more fields
  }
}

# GOOD: Requesting only the necessary fields
query {
  client_get(input: { id: "123" }) {
    id
    displayName
    status
    mobileNo
    emailAddress
  }
}
```

### Use Aliases for Multiple Instances

When requesting the same type multiple times in a single query, use aliases to distinguish the results:

```graphql
query {
  activeLoan: loan_get(input: { id: "456" }) {
    id
    status
    principalAmount
  }
  
  closedLoan: loan_get(input: { id: "789" }) {
    id
    status
    principalAmount
  }
}
```

### Use Fragments for Reusable Field Sets

Use fragments to define reusable sets of fields, especially when the same fields are requested in multiple places:

```graphql
fragment ClientBasicInfo on ClientDetail {
  id
  displayName
  status
  mobileNo
  emailAddress
}

query {
  client1: client_get(input: { id: "123" }) {
    ...ClientBasicInfo
    identifiers {
      documentType
      documentKey
    }
  }
  
  client2: client_get(input: { id: "456" }) {
    ...ClientBasicInfo
    addresses {
      addressType
      city
      country
    }
  }
}
```

### Limit List Query Results

Always specify reasonable limits when querying lists to avoid fetching excessive data:

```graphql
query {
  client_list(input: {
    officeId: "1",
    limit: 20,  # Always include a reasonable limit
    offset: 0
  }) {
    totalCount
    clients {
      id
      displayName
    }
  }
}
```

## Performance Optimization

### Batch Requests When Possible

Combine multiple related operations in a single request to reduce network overhead:

```graphql
# Instead of separate requests for each client
query {
  clients: client_list(input: { officeId: "1", limit: 5 }) {
    clients {
      id
      displayName
      # Include necessary client fields
    }
  }
  
  loans: loan_list(input: { officeId: "1", limit: 5 }) {
    loans {
      id
      accountNo
      # Include necessary loan fields
    }
  }
  
  savingsAccounts: savings_list(input: { officeId: "1", limit: 5 }) {
    accounts {
      id
      accountNo
      # Include necessary savings fields
    }
  }
}
```

### Use Query Variables

Always use query variables for dynamic values instead of string interpolation:

```graphql
# Query definition
query GetClientDetails($clientId: String!) {
  client_get(input: { id: $clientId }) {
    id
    displayName
    status
  }
}

# Variables passed separately
{
  "clientId": "123"
}
```

### Implement Caching

Use a client with caching capabilities (like Apollo Client) to avoid refetching stable data:

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const client = new ApolloClient({
  link: createHttpLink({ uri: 'https://your-api-url/graphql' }),
  cache: new InMemoryCache({
    typePolicies: {
      ClientDetail: {
        keyFields: ['id'],
        fields: {
          // Configure field-specific cache policies
        }
      }
    }
  })
});
```

### Use Persisted Queries

For production applications, consider using persisted queries to reduce payload size and improve security:

1. Generate a hash of your query
2. Store the query on the server
3. Send only the hash and variables in your requests

## Security Best Practices

### Secure Token Storage

Store authentication tokens securely:

```javascript
// BAD: Don't store in localStorage (vulnerable to XSS)
localStorage.setItem('accessToken', token);

// BETTER: Use HttpOnly cookies (when supported by your architecture)
// This is typically handled at the server level

// Alternative: Use a secure storage mechanism specific to your platform
// For example, secure storage in mobile apps
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('accessToken', token);
```

### Set Timeouts for Sensitive Operations

Include timeouts for sensitive operations to prevent hanging requests:

```javascript
const fetchWithTimeout = (timeoutMs) => {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      reject(new Error('Request timed out'));
    }, timeoutMs);
    
    fetch('https://your-api-url/graphql', {
      signal: controller.signal,
      // other fetch options
    })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
};
```

### Implement Proper Logout

Always clear tokens and sensitive data when logging out:

```javascript
const logout = () => {
  // Clear tokens from storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Clear in-memory state
  client.clearStore();
  
  // Redirect to login page
  window.location.href = '/login';
};
```

### Validate Input Data

Always validate input data before sending it to the API:

```javascript
const validateLoanInput = (loanData) => {
  const errors = {};
  
  if (!loanData.principal || loanData.principal <= 0) {
    errors.principal = 'Principal amount must be greater than zero';
  }
  
  if (!loanData.numberOfRepayments || loanData.numberOfRepayments <= 0) {
    errors.numberOfRepayments = 'Number of repayments must be greater than zero';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

const createLoan = (loanData) => {
  const errors = validateLoanInput(loanData);
  
  if (errors) {
    // Handle validation errors
    return { success: false, errors };
  }
  
  // Proceed with API call
  return client.mutate({
    mutation: CREATE_LOAN_MUTATION,
    variables: { input: loanData }
  });
};
```

## Error Handling

### Implement Comprehensive Error Handling

Always implement proper error handling for all API operations:

```javascript
const getLoanDetails = async (loanId) => {
  try {
    const { data } = await client.query({
      query: GET_LOAN_QUERY,
      variables: { id: loanId }
    });
    
    return {
      success: true,
      loan: data.loan_get
    };
  } catch (error) {
    // Check for specific error types
    if (error.graphQLErrors) {
      // Handle GraphQL errors
      const notFoundError = error.graphQLErrors.find(
        e => e.extensions?.code === 'NOT_FOUND'
      );
      
      if (notFoundError) {
        return {
          success: false,
          error: 'Loan not found',
          code: 'NOT_FOUND'
        };
      }
      
      const permissionError = error.graphQLErrors.find(
        e => e.extensions?.code === 'FORBIDDEN'
      );
      
      if (permissionError) {
        return {
          success: false,
          error: 'You do not have permission to view this loan',
          code: 'FORBIDDEN'
        };
      }
    }
    
    // Handle network errors
    if (error.networkError) {
      return {
        success: false,
        error: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      };
    }
    
    // Handle other errors
    return {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: error.message
    };
  }
};
```

### Retry With Exponential Backoff

Implement retry logic with exponential backoff for transient errors:

```javascript
const fetchWithRetry = async (query, variables, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await client.query({
        query,
        variables
      });
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries || !isRetryableError(error)) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, retries) * 300 + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const isRetryableError = (error) => {
  // Return true for network errors and certain server errors
  return (
    error.networkError ||
    (error.graphQLErrors && error.graphQLErrors.some(e => 
      e.extensions?.code === 'INTERNAL_SERVER_ERROR' ||
      e.extensions?.code === 'SERVICE_UNAVAILABLE'
    ))
  );
};
```

## Rate Limit Compliance

### Respect Rate Limits

The API enforces rate limits to ensure fair usage. Always respect these limits and implement appropriate throttling:

1. Check rate limit headers in responses:
   - `X-RateLimit-Limit`: Maximum requests per time window
   - `X-RateLimit-Remaining`: Remaining requests in current window
   - `X-RateLimit-Reset`: Time until window resets (in seconds)

2. Implement a request queue with rate limiting:

```javascript
class RateLimitedQueue {
  constructor(maxRequestsPerMinute) {
    this.queue = [];
    this.processing = false;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.requestsThisMinute = 0;
    this.resetTime = Date.now() + 60000;
  }
  
  enqueue(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      // Reset counter if the minute has passed
      if (Date.now() > this.resetTime) {
        this.requestsThisMinute = 0;
        this.resetTime = Date.now() + 60000;
      }
      
      // If we're at the limit, wait until reset
      if (this.requestsThisMinute >= this.maxRequestsPerMinute) {
        const waitTime = this.resetTime - Date.now();
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestsThisMinute = 0;
        this.resetTime = Date.now() + 60000;
      }
      
      // Process the next request
      const { request, resolve, reject } = this.queue.shift();
      this.requestsThisMinute++;
      
      try {
        const result = await request();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    } finally {
      this.processing = false;
      
      // Continue processing the queue
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
}
```

## Data Synchronization

### Implement Offline-First Architecture

For mobile or web applications that may operate with intermittent connectivity:

1. Store essential data locally
2. Queue operations when offline
3. Sync when connectivity is restored

```javascript
// Example using Apollo Client for offline support
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { persistCache } from 'apollo3-cache-persist';
import { QueueLink } from 'apollo-link-queue';
import { RetryLink } from '@apollo/client/link/retry';

// Set up cache persistence
const cache = new InMemoryCache();
await persistCache({
  cache,
  storage: window.localStorage
});

// Create a link that queues operations when offline
const queueLink = new QueueLink();

// Detect network status
window.addEventListener('online', () => queueLink.open());
window.addEventListener('offline', () => queueLink.close());

// Set initial status
if (navigator.onLine) {
  queueLink.open();
} else {
  queueLink.close();
}

// Retry link for failed requests
const retryLink = new RetryLink();

const client = new ApolloClient({
  link: retryLink.concat(queueLink.concat(httpLink)),
  cache
});
```

## API Versioning

### Handle API Changes

The Fineract GraphQL API uses a versioning strategy where:

1. Non-breaking changes are added continually
2. Breaking changes are announced with deprecation notices
3. Major version changes are communicated in advance

To handle API evolution:

1. Monitor deprecation notices in the schema
2. Subscribe to the developer newsletter for updates
3. Test your application against the staging environment before production updates
4. Use the schema introspection to discover new capabilities

```javascript
// Periodically fetch the latest schema
const getLatestSchema = async () => {
  const { data } = await fetch('https://your-api-url/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: getIntrospectionQuery()
    })
  }).then(res => res.json());
  
  // Process the schema for deprecation notices
  const deprecatedFields = findDeprecatedFields(data.__schema);
  
  if (deprecatedFields.length > 0) {
    console.warn('Deprecated fields in use:', deprecatedFields);
  }
};
```

## Monitoring and Logging

### Implement Request Monitoring

Track API request performance and errors:

```javascript
// Create a logging link for Apollo Client
const loggingLink = new ApolloLink((operation, forward) => {
  const startTime = Date.now();
  
  return forward(operation).map(response => {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log request details
    console.log({
      operation: operation.operationName,
      variables: operation.variables,
      duration,
      successful: !response.errors,
      errors: response.errors
    });
    
    // Send metrics to monitoring system
    if (duration > 1000) {
      sendSlowOperationAlert(operation.operationName, duration);
    }
    
    if (response.errors) {
      sendErrorAlert(operation.operationName, response.errors);
    }
    
    return response;
  });
});
```

### Add Business Context to Requests

Include business context in your operations for better debugging and analytics:

```graphql
query GetLoanDetails($loanId: String!, $context: String) {
  loan_get(input: { id: $loanId, _context: $context }) {
    id
    status
    principalAmount
  }
}

# Variables
{
  "loanId": "123",
  "context": "user_dashboard_view"
}
```

## Testing Strategies

### Implement Proper Test Coverage

Ensure comprehensive testing of your API integration:

1. **Unit tests**: Test individual components that interact with the API
2. **Integration tests**: Test the full flow of API requests
3. **Mock tests**: Use static responses for testing UI components
4. **End-to-end tests**: Test complete user workflows

```javascript
// Example of a mock service for testing
const mockLoanService = {
  getLoan: jest.fn().mockResolvedValue({
    id: '123',
    status: 'ACTIVE',
    principalAmount: 5000
  }),
  
  createLoan: jest.fn().mockImplementation((data) => {
    // Validate input
    if (!data.principal || data.principal <= 0) {
      return Promise.reject(new Error('Invalid principal amount'));
    }
    
    return Promise.resolve({
      resourceId: '456',
      loanId: '456',
      changes: { status: 'PENDING' }
    });
  })
};

// Example test
test('should display loan details', async () => {
  // Setup component with mock service
  render(<LoanDetails loanId="123" loanService={mockLoanService} />);
  
  // Wait for data to load
  await screen.findByText('Loan #123');
  
  // Assert expected UI elements
  expect(screen.getByText('Status: ACTIVE')).toBeInTheDocument();
  expect(screen.getByText('Principal: $5,000.00')).toBeInTheDocument();
  
  // Verify service was called with correct params
  expect(mockLoanService.getLoan).toHaveBeenCalledWith('123');
});
```

## Documentation

### Keep API Documentation Bookmarked

Always refer to the most current API documentation:

- GraphQL Schema Explorer: `https://your-api-domain.com/graphql`
- API Documentation Portal: `https://your-api-domain.com/docs`
- Changelog: `https://your-api-domain.com/docs/changelog`

### Use Schema Introspection

GraphQL provides built-in schema introspection. Use tools like GraphQL Playground or Apollo Studio Explorer to explore the API capabilities and field documentation in real-time.