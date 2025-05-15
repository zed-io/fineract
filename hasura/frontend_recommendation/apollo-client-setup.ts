import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { possibleTypes } from './generated/introspection-result';

// Error handling link that logs errors and provides error info
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL Error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  
  if (networkError) {
    console.error(`[Network Error]: ${networkError}`);
  }
});

// HTTP link to the GraphQL server
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/v1/graphql',
});

// Authentication link for adding the JWT token to requests
const authLink = setContext((_, { headers }) => {
  // Get the auth token from localStorage or another storage method
  const token = localStorage.getItem('auth_token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-hasura-role': 'user', // Adjust based on your Hasura setup
    }
  };
});

// Configure the Apollo Client cache
const cache = new InMemoryCache({
  possibleTypes, // This helps with interface and union types
  typePolicies: {
    Query: {
      fields: {
        // Configure cache behavior for paginated queries
        client_list: {
          // Use a custom merge function for paginated data
          keyArgs: ['input.officeId', 'input.status', 'input.name', 'input.externalId'],
          merge(existing = { clients: [], totalCount: 0 }, incoming) {
            if (!incoming) return existing;
            
            // Handle pagination merging
            if (existing.clients) {
              return {
                ...incoming,
                clients: [...existing.clients, ...incoming.clients],
              };
            }
            
            return incoming;
          },
        },
        // Configure cache for loan applications
        loanApplications: {
          keyArgs: ['where', 'orderBy'],
          merge(existing = [], incoming) {
            return incoming; // Replace with merge logic if needed
          },
        },
      },
    },
    // Configure cache for entity types
    LoanApplication: {
      keyFields: ['id'],
    },
    Client: {
      keyFields: ['id'],
    },
  },
});

// Initialize the Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export default client;