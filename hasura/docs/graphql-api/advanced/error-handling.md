# Error Handling

This guide explains how errors are represented in the Fineract GraphQL API and provides best practices for handling them in your applications.

## Error Structure

GraphQL errors in the Fineract API follow a consistent structure, including:

1. A human-readable error message
2. An error code that identifies the type of error
3. Additional fields to help with troubleshooting

Here's a typical error response:

```json
{
  "errors": [
    {
      "message": "Client with ID '123' not found",
      "extensions": {
        "code": "NOT_FOUND",
        "entity": "CLIENT",
        "entityId": "123",
        "classification": "DataFetchingException"
      },
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "client_get"
      ]
    }
  ],
  "data": {
    "client_get": null
  }
}
```

## Error Classifications

Errors in the API are grouped into the following classifications:

### 1. Authentication Errors

Errors related to authentication and authorization:

```json
{
  "errors": [
    {
      "message": "You must be logged in to perform this action",
      "extensions": {
        "code": "UNAUTHENTICATED",
        "classification": "AuthenticationError"
      }
    }
  ]
}
```

Common authentication error codes:

| Code | Description |
|------|-------------|
| `UNAUTHENTICATED` | User is not authenticated |
| `INVALID_TOKEN` | Authentication token is invalid or expired |
| `INVALID_CREDENTIALS` | Username or password is incorrect |
| `ACCOUNT_LOCKED` | User account is locked due to too many failed attempts |

### 2. Authorization Errors

Errors related to permission restrictions:

```json
{
  "errors": [
    {
      "message": "You do not have permission to create a loan",
      "extensions": {
        "code": "FORBIDDEN",
        "requiredPermission": "CREATE_LOAN",
        "classification": "AuthorizationError"
      }
    }
  ]
}
```

Common authorization error codes:

| Code | Description |
|------|-------------|
| `FORBIDDEN` | User lacks the necessary permission for the operation |
| `RESOURCE_ACCESS_DENIED` | User cannot access the specific resource |
| `TENANT_ACCESS_DENIED` | User cannot access the specified tenant |
| `OFFICE_ACCESS_DENIED` | User cannot access the specified office |

### 3. Validation Errors

Errors related to invalid input data:

```json
{
  "errors": [
    {
      "message": "Invalid input data",
      "extensions": {
        "code": "BAD_REQUEST",
        "classification": "ValidationError",
        "validationErrors": [
          {
            "field": "principal",
            "message": "Principal amount must be greater than zero"
          },
          {
            "field": "interestRatePerPeriod",
            "message": "Interest rate must be between 0 and 100"
          }
        ]
      }
    }
  ]
}
```

Common validation error codes:

| Code | Description |
|------|-------------|
| `BAD_REQUEST` | General validation error |
| `INVALID_FIELD` | Specific field has an invalid value |
| `MISSING_FIELD` | Required field is missing |
| `INVALID_DATE` | Date format or value is invalid |
| `INVALID_AMOUNT` | Monetary amount is invalid |

### 4. Entity Errors

Errors related to entity operations:

```json
{
  "errors": [
    {
      "message": "Loan with ID '456' not found",
      "extensions": {
        "code": "NOT_FOUND",
        "entity": "LOAN",
        "entityId": "456",
        "classification": "EntityError"
      }
    }
  ]
}
```

Common entity error codes:

| Code | Description |
|------|-------------|
| `NOT_FOUND` | The requested entity does not exist |
| `DUPLICATE` | An entity with the same unique identifier already exists |
| `INVALID_STATE` | The entity is in an invalid state for the requested operation |
| `REFERENCE_CONSTRAINT` | The operation would violate a reference constraint |

### 5. Business Logic Errors

Errors related to business rules and constraints:

```json
{
  "errors": [
    {
      "message": "Cannot disburse loan: client has reached maximum exposure limit",
      "extensions": {
        "code": "BUSINESS_RULE_VIOLATION",
        "rule": "CLIENT_EXPOSURE_LIMIT",
        "classification": "BusinessError"
      }
    }
  ]
}
```

Common business logic error codes:

| Code | Description |
|------|-------------|
| `BUSINESS_RULE_VIOLATION` | Operation violates a business rule |
| `INSUFFICIENT_FUNDS` | Insufficient funds for the operation |
| `AMOUNT_EXCEEDS_LIMIT` | Amount exceeds a defined limit |
| `FREQUENCY_EXCEEDS_LIMIT` | Operation frequency exceeds a defined limit |
| `DATE_CONSTRAINT_VIOLATION` | Date does not meet a business constraint |

### 6. System Errors

Errors related to system issues:

```json
{
  "errors": [
    {
      "message": "An unexpected error occurred",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR",
        "classification": "SystemError",
        "referenceId": "ERR-20230601-123456"
      }
    }
  ]
}
```

Common system error codes:

| Code | Description |
|------|-------------|
| `INTERNAL_SERVER_ERROR` | Unhandled error on the server |
| `SERVICE_UNAVAILABLE` | A required service is unavailable |
| `DATABASE_ERROR` | Database operation failed |
| `TIMEOUT` | Operation timed out |

## Client-Side Error Handling

### Basic Error Handling Pattern

Here's a recommended pattern for handling errors in your client applications:

```javascript
const performQuery = async (query, variables) => {
  try {
    const { data, errors } = await client.query({
      query,
      variables
    });
    
    if (errors) {
      // Handle GraphQL errors
      return handleGraphQLErrors(errors);
    }
    
    return {
      success: true,
      data
    };
  } catch (error) {
    // Handle network errors
    return handleNetworkError(error);
  }
};

const handleGraphQLErrors = (errors) => {
  // Check for specific error types
  const authError = errors.find(e => 
    e.extensions?.code === 'UNAUTHENTICATED' || 
    e.extensions?.code === 'INVALID_TOKEN'
  );
  
  if (authError) {
    // Handle authentication errors
    logoutUser();
    return {
      success: false,
      errorType: 'AUTH_ERROR',
      message: 'Your session has expired. Please log in again.',
      errors
    };
  }
  
  const validationError = errors.find(e => 
    e.extensions?.classification === 'ValidationError'
  );
  
  if (validationError) {
    // Handle validation errors
    return {
      success: false,
      errorType: 'VALIDATION_ERROR',
      message: 'Please correct the highlighted fields.',
      validationErrors: validationError.extensions?.validationErrors || [],
      errors
    };
  }
  
  // For other errors, provide a generic message
  return {
    success: false,
    errorType: 'GRAPHQL_ERROR',
    message: 'An error occurred while processing your request.',
    errors
  };
};

const handleNetworkError = (error) => {
  // Check for network connectivity issues
  if (!navigator.onLine) {
    return {
      success: false,
      errorType: 'NETWORK_ERROR',
      message: 'You appear to be offline. Please check your internet connection and try again.',
      error
    };
  }
  
  // For other network errors
  return {
    success: false,
    errorType: 'NETWORK_ERROR',
    message: 'Unable to connect to the server. Please try again later.',
    error
  };
};
```

### Handling Validation Errors

For validation errors, you should map the returned validation errors to your form fields:

```javascript
const submitForm = async (formData) => {
  const result = await performMutation(CREATE_CLIENT_MUTATION, { input: formData });
  
  if (!result.success) {
    if (result.errorType === 'VALIDATION_ERROR') {
      // Map validation errors to form fields
      const fieldErrors = {};
      
      result.validationErrors.forEach(error => {
        fieldErrors[error.field] = error.message;
      });
      
      setFormErrors(fieldErrors);
      return;
    }
    
    // Handle other errors
    setGlobalError(result.message);
    return;
  }
  
  // Handle success
  handleSuccess(result.data);
};
```

### Retry Strategy for Transient Errors

For certain types of errors (network issues, timeouts, temporary server problems), implementing a retry strategy can improve resilience:

```javascript
const performQueryWithRetry = async (query, variables, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const { data, errors } = await client.query({
        query,
        variables
      });
      
      if (errors) {
        const isRetryable = errors.some(e => 
          e.extensions?.code === 'SERVICE_UNAVAILABLE' ||
          e.extensions?.code === 'TIMEOUT'
        );
        
        if (isRetryable && retries < maxRetries - 1) {
          retries++;
          await delay(Math.pow(2, retries) * 300); // Exponential backoff
          continue;
        }
        
        return handleGraphQLErrors(errors);
      }
      
      return {
        success: true,
        data
      };
    } catch (error) {
      // For network errors, retry
      if (error.networkError && retries < maxRetries - 1) {
        retries++;
        await delay(Math.pow(2, retries) * 300); // Exponential backoff
        continue;
      }
      
      return handleNetworkError(error);
    }
  }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
```

## Error Logging and Monitoring

For production applications, implement error logging and monitoring:

```javascript
const logError = (error, context) => {
  // Extract relevant information
  const errorInfo = {
    message: error.message,
    code: error.extensions?.code,
    classification: error.extensions?.classification,
    entityId: error.extensions?.entityId,
    referenceId: error.extensions?.referenceId,
    path: error.path,
    operation: context.operation,
    variables: context.variables,
    user: getUserInfo(),
    timestamp: new Date().toISOString()
  };
  
  // Send to your logging/monitoring service
  logger.error('GraphQL Error', errorInfo);
  
  // For critical errors, consider additional alerting
  if (
    error.extensions?.code === 'INTERNAL_SERVER_ERROR' ||
    error.extensions?.code === 'DATABASE_ERROR'
  ) {
    alertService.sendAlert('Critical API Error', errorInfo);
  }
};
```

## User-Friendly Error Messages

Translate technical error codes into user-friendly messages:

```javascript
const getUserFriendlyMessage = (error) => {
  // Default message
  let message = 'An error occurred. Please try again later.';
  
  if (!error || !error.extensions) {
    return message;
  }
  
  const { code, classification } = error.extensions;
  
  // Authentication/authorization errors
  if (code === 'UNAUTHENTICATED') {
    return 'Your session has expired. Please log in again.';
  }
  
  if (code === 'FORBIDDEN') {
    return 'You do not have permission to perform this action.';
  }
  
  // Not found errors
  if (code === 'NOT_FOUND') {
    const entity = error.extensions.entity?.toLowerCase() || 'item';
    return `The requested ${entity} could not be found.`;
  }
  
  // Validation errors
  if (classification === 'ValidationError') {
    return 'Please check your input and try again.';
  }
  
  // Business logic errors
  if (code === 'BUSINESS_RULE_VIOLATION') {
    return error.message || 'This action violates a business rule.';
  }
  
  if (code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds to complete this transaction.';
  }
  
  // System errors
  if (code === 'INTERNAL_SERVER_ERROR') {
    return 'An unexpected error occurred. Our team has been notified.';
  }
  
  if (code === 'SERVICE_UNAVAILABLE') {
    return 'The service is temporarily unavailable. Please try again later.';
  }
  
  // For other errors, use the error message if provided
  return error.message || message;
};
```

## Handling Specific Error Scenarios

### Authentication Errors

When an authentication error occurs, redirect to the login page:

```javascript
const handleAuthError = (error) => {
  // Clear auth tokens
  clearAuthTokens();
  
  // Redirect to login page
  router.push('/login');
  
  // Show message
  notificationService.error('Your session has expired. Please log in again.');
};
```

### Form Validation Errors

Display validation errors next to the corresponding form fields:

```jsx
const ClientForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await createClient(formData);
    
    if (!result.success && result.errorType === 'VALIDATION_ERROR') {
      setErrors(mapValidationErrors(result.validationErrors));
      return;
    }
    
    // Handle success or other errors
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label>First Name</label>
        <input
          type="text"
          value={formData.firstname || ''}
          onChange={(e) => setFormData({...formData, firstname: e.target.value})}
        />
        {errors.firstname && <div className="error">{errors.firstname}</div>}
      </div>
      
      {/* Other form fields */}
      
      <button type="submit">Create Client</button>
    </form>
  );
};

const mapValidationErrors = (validationErrors) => {
  const mappedErrors = {};
  
  validationErrors.forEach(error => {
    mappedErrors[error.field] = error.message;
  });
  
  return mappedErrors;
};
```

### Business Logic Errors

Display business logic errors as notifications or alerts:

```javascript
const disburseLoan = async (loanId, disbursementData) => {
  const result = await performMutation(DISBURSE_LOAN_MUTATION, {
    input: { id: loanId, ...disbursementData }
  });
  
  if (!result.success) {
    if (
      result.errors?.[0]?.extensions?.code === 'BUSINESS_RULE_VIOLATION' ||
      result.errors?.[0]?.extensions?.code === 'AMOUNT_EXCEEDS_LIMIT'
    ) {
      // Show business error as a warning
      notificationService.warning(result.errors[0].message);
      return result;
    }
    
    // Show other errors as errors
    notificationService.error(result.message);
    return result;
  }
  
  // Handle success
  notificationService.success('Loan disbursed successfully');
  return result;
};
```

### Offline Handling

Implement offline detection and handling:

```javascript
const ApiClient = {
  queryWithOfflineSupport: async (query, variables) => {
    if (!navigator.onLine) {
      // Store operation for later execution
      offlineQueue.addOperation({ query, variables });
      
      // If we have cached data, return it
      const cachedData = await getCachedData(query, variables);
      
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          fromCache: true,
          offline: true
        };
      }
      
      return {
        success: false,
        errorType: 'OFFLINE',
        message: 'You are currently offline. This action will be completed when you reconnect.',
        offline: true
      };
    }
    
    // Regular online execution
    return performQuery(query, variables);
  },
  
  syncOfflineOperations: async () => {
    if (navigator.onLine) {
      const operations = offlineQueue.getOperations();
      
      for (const op of operations) {
        try {
          await performQuery(op.query, op.variables);
          offlineQueue.removeOperation(op.id);
        } catch (error) {
          console.error('Failed to sync offline operation', error);
        }
      }
    }
  }
};

// Listen for online/offline events
window.addEventListener('online', () => {
  notificationService.info('You are back online!');
  ApiClient.syncOfflineOperations();
});

window.addEventListener('offline', () => {
  notificationService.warning('You are offline. Some functionality may be limited.');
});
```

## Error Boundaries in React

For React applications, implement error boundaries to catch rendering errors:

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.error('React Error Boundary Caught Error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>We're sorry, but there was an error rendering this component.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
const App = () => {
  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
};
```

## Conclusion

Effective error handling is crucial for building robust applications with the Fineract GraphQL API. By implementing the patterns and best practices described in this guide, you can:

1. Provide clear feedback to users when errors occur
2. Gracefully handle different types of errors
3. Improve application reliability with retry mechanisms
4. Support offline functionality when appropriate
5. Collect error information for troubleshooting and monitoring

Remember that good error handling not only improves the user experience but also makes your application more maintainable and easier to debug.