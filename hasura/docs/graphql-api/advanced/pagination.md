# Pagination

This guide explains the pagination patterns used in the Fineract GraphQL API and provides best practices for working with paginated data.

## Pagination Overview

The Fineract GraphQL API implements offset-based pagination for list queries, which allows you to:

1. Retrieve a specific subset of results
2. Get the total count of available records
3. Navigate through large datasets efficiently

## Pagination Parameters

List queries typically include the following pagination parameters:

```graphql
input ClientListInput {
  officeId: String!
  status: String
  name: String
  externalId: String
  limit: Int      # Maximum number of records to return
  offset: Int     # Number of records to skip
  orderBy: String # Field to sort by
  sortOrder: String # Sort direction (asc or desc)
}
```

- **limit**: The maximum number of items to return (default varies by endpoint, typically 10-50)
- **offset**: The number of items to skip before starting to return results (default: 0)
- **orderBy**: The field to sort the results by (varies by entity type)
- **sortOrder**: The direction to sort in ('asc' or 'desc')

## Pagination Response Structure

List query responses follow a consistent pattern that includes the total count and the requested subset of results:

```graphql
type ClientListResponse {
  totalCount: Int!
  clients: [ClientSummary!]!
}
```

- **totalCount**: The total number of records that match the query criteria (before pagination)
- **clients**: The subset of matching records based on the limit and offset

This pattern is consistent across different entity types, with the array field name matching the entity type (e.g., `clients`, `loans`, `savingsAccounts`, etc.).

## Basic Pagination Example

Here's a basic example of a paginated query for clients:

```graphql
query {
  client_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    orderBy: "displayName",
    sortOrder: "asc"
  }) {
    totalCount
    clients {
      id
      displayName
      status
      mobileNo
    }
  }
}
```

To retrieve the next page of results, increment the offset by the limit value:

```graphql
query {
  client_list(input: {
    officeId: "1",
    limit: 10,
    offset: 10,  # Increased by limit to get the next page
    orderBy: "displayName",
    sortOrder: "asc"
  }) {
    totalCount
    clients {
      id
      displayName
      status
      mobileNo
    }
  }
}
```

## Implementing Pagination in Client Applications

### Basic Pagination Controls

Here's a simple implementation of pagination controls in a React application:

```jsx
const ClientList = () => {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchClients();
  }, [page, limit]);
  
  const fetchClients = async () => {
    setLoading(true);
    
    try {
      const { data } = await client.query({
        query: CLIENT_LIST_QUERY,
        variables: {
          input: {
            officeId: "1",
            limit,
            offset: page * limit,
            orderBy: "displayName",
            sortOrder: "asc"
          }
        }
      });
      
      setClients(data.client_list.clients);
      setTotalCount(data.client_list.totalCount);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPages = Math.ceil(totalCount / limit);
  
  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Mobile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>{client.displayName}</td>
                  <td>{client.status}</td>
                  <td>{client.mobileNo}</td>
                  <td>
                    <button onClick={() => viewClient(client.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </button>
            
            <span>
              Page {page + 1} of {totalPages}
            </span>
            
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </button>
            
            <select 
              value={limit}
              onChange={e => {
                setLimit(Number(e.target.value));
                setPage(0); // Reset to first page when changing limit
              }}
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};
```

### Advanced Pagination with Apollo Client

For applications using Apollo Client, you can implement more sophisticated pagination:

```jsx
import { useQuery } from '@apollo/client';
import { useState } from 'react';

const CLIENT_LIST_QUERY = gql`
  query GetClients($input: ClientListInput!) {
    client_list(input: $input) {
      totalCount
      clients {
        id
        displayName
        status
        mobileNo
      }
    }
  }
`;

const ClientList = () => {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  
  const { loading, error, data, fetchMore } = useQuery(CLIENT_LIST_QUERY, {
    variables: {
      input: {
        officeId: "1",
        limit,
        offset: page * limit,
        orderBy: "displayName",
        sortOrder: "asc"
      }
    },
    notifyOnNetworkStatusChange: true
  });
  
  const loadNextPage = () => {
    const newPage = page + 1;
    setPage(newPage);
    
    fetchMore({
      variables: {
        input: {
          officeId: "1",
          limit,
          offset: newPage * limit,
          orderBy: "displayName",
          sortOrder: "asc"
        }
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return fetchMoreResult;
      }
    });
  };
  
  const loadPreviousPage = () => {
    if (page > 0) {
      const newPage = page - 1;
      setPage(newPage);
      
      fetchMore({
        variables: {
          input: {
            officeId: "1",
            limit,
            offset: newPage * limit,
            orderBy: "displayName",
            sortOrder: "asc"
          }
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return fetchMoreResult;
        }
      });
    }
  };
  
  if (error) return <p>Error: {error.message}</p>;
  
  const clients = data?.client_list?.clients || [];
  const totalCount = data?.client_list?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit);
  
  return (
    <div>
      {/* Render client table */}
      
      <div className="pagination">
        <button 
          onClick={loadPreviousPage}
          disabled={page === 0 || loading}
        >
          Previous
        </button>
        
        <span>
          Page {page + 1} of {totalPages}
        </span>
        
        <button 
          onClick={loadNextPage}
          disabled={page >= totalPages - 1 || loading}
        >
          Next
        </button>
        
        {/* Limit selector */}
      </div>
    </div>
  );
};
```

## Pagination with Filtering

When combining pagination with filtering, the pagination restarts based on the filtered results:

```graphql
query {
  client_list(input: {
    officeId: "1",
    status: "active",  # Filter by status
    name: "John",      # Filter by name
    limit: 10,
    offset: 0,
    orderBy: "displayName",
    sortOrder: "asc"
  }) {
    totalCount         # Will reflect the number of matching records
    clients {
      id
      displayName
      status
      mobileNo
    }
  }
}
```

When implementing filtering in a client application, reset the page to 0 when filters change:

```jsx
const ClientListWithFilters = () => {
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    status: "",
    name: "",
    externalId: ""
  });
  
  // Use effect to fetch data when page, limit, or filters change
  useEffect(() => {
    fetchData();
  }, [page, limit, filters]);
  
  // When filters change, reset to page 0
  const applyFilters = (newFilters) => {
    setFilters(newFilters);
    setPage(0); // Reset to first page
  };
  
  // Rest of the component...
};
```

## Best Practices for Pagination

### 1. Use Reasonable Page Sizes

Choose appropriate page sizes based on the use case:

- Small page sizes (10-25) for user interfaces with interactive pagination
- Medium page sizes (50-100) for data tables or reports
- Larger page sizes for data export or system integration

```graphql
# For a user interface
query {
  client_list(input: { officeId: "1", limit: 20, offset: 0 }) {
    # fields
  }
}

# For a data export
query {
  client_list(input: { officeId: "1", limit: 500, offset: 0 }) {
    # fields
  }
}
```

### 2. Sort for Consistent Results

Always specify a consistent sorting order to ensure stable pagination:

```graphql
query {
  client_list(input: {
    officeId: "1",
    limit: 10,
    offset: 0,
    orderBy: "displayName",  # Always sort by a unique or stable field
    sortOrder: "asc"
  }) {
    # fields
  }
}
```

Ideally, sort by a unique field to ensure consistent ordering across pages.

### 3. Cache Paginated Results

For better performance, cache paginated results in client applications:

```javascript
// Using Apollo Client
const client = new ApolloClient({
  uri: 'https://your-api-url/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          client_list: {
            // Merge function for client_list
            merge(existing, incoming, { args }) {
              // Use args (which contains the input) as the cache key
              return incoming;
            },
            // Read function to find a cached result
            read(existing, { args }) {
              if (!existing) return undefined;
              return existing;
            }
          }
        }
      }
    }
  })
});
```

### 4. Handle Empty Results

Always handle cases where no results are returned:

```jsx
const ClientList = ({ /* props */ }) => {
  // Fetch data...
  
  if (loading) {
    return <p>Loading...</p>;
  }
  
  if (error) {
    return <p>Error: {error.message}</p>;
  }
  
  if (clients.length === 0) {
    return (
      <div className="empty-state">
        <h3>No clients found</h3>
        <p>Try adjusting your filters or adding a new client.</p>
        <button onClick={handleAddClient}>Add Client</button>
      </div>
    );
  }
  
  // Render client list...
};
```

### 5. Implement Infinite Scroll

For some user interfaces, infinite scroll provides a better experience than traditional pagination:

```jsx
const ClientInfiniteList = () => {
  const [clients, setClients] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const limit = 20;
  
  const loadMoreClients = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    try {
      const { data } = await client.query({
        query: CLIENT_LIST_QUERY,
        variables: {
          input: {
            officeId: "1",
            limit,
            offset,
            orderBy: "displayName",
            sortOrder: "asc"
          }
        }
      });
      
      const newClients = data.client_list.clients;
      
      if (newClients.length > 0) {
        setClients(prev => [...prev, ...newClients]);
        setOffset(prev => prev + limit);
      }
      
      // Check if we've loaded all available clients
      setHasMore(offset + newClients.length < data.client_list.totalCount);
    } catch (error) {
      console.error("Error fetching more clients:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadMoreClients();
  }, []);
  
  return (
    <div>
      <ul>
        {clients.map(client => (
          <li key={client.id}>
            {client.displayName} - {client.status}
          </li>
        ))}
      </ul>
      
      {loading && <p>Loading more...</p>}
      
      {!loading && hasMore && (
        <button onClick={loadMoreClients}>Load More</button>
      )}
      
      {!hasMore && <p>No more clients to load</p>}
    </div>
  );
};
```

### 6. Virtual Lists for Large Datasets

For very large lists, use virtualization to render only the visible items:

```jsx
import { FixedSizeList as List } from 'react-window';

const VirtualizedClientList = () => {
  // Fetch initial data...
  
  const Row = ({ index, style }) => {
    const client = clients[index];
    
    // Handle loading more data when approaching the end
    if (index === clients.length - 10 && hasMore && !loading) {
      loadMoreClients();
    }
    
    // Render a loading placeholder if needed
    if (!client) {
      return (
        <div style={style} className="loading-row">
          Loading...
        </div>
      );
    }
    
    return (
      <div style={style} className="client-row">
        <div>{client.displayName}</div>
        <div>{client.status}</div>
        <div>{client.mobileNo}</div>
      </div>
    );
  };
  
  return (
    <List
      height={500}
      itemCount={hasMore ? clients.length + 10 : clients.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

## Performance Considerations

### Limit vs. Performance

The choice of limit value affects both server and client performance:

- Smaller limits reduce server load and initial load time
- Larger limits reduce the number of network requests
- Very large limits can impact server performance and response time

For most user interfaces, a limit of 10-25 items per page offers a good balance.

### Prefetching Next Page

To improve perceived performance, prefetch the next page of results:

```javascript
const ClientList = () => {
  // Current page data...
  
  // Prefetch next page when user is on the current page
  useEffect(() => {
    if (data && totalPages > page + 1) {
      client.query({
        query: CLIENT_LIST_QUERY,
        variables: {
          input: {
            officeId: "1",
            limit,
            offset: (page + 1) * limit,
            orderBy: "displayName",
            sortOrder: "asc"
          }
        }
      });
    }
  }, [page, data]);
  
  // Rest of component...
};
```

### Optimizing Repeated Queries

If users frequently navigate between pages, configure your GraphQL client to optimize caching:

```javascript
const client = new ApolloClient({
  uri: 'https://your-api-url/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          client_list: {
            keyArgs: ['input.officeId', 'input.status', 'input.name', 'input.externalId', 'input.orderBy', 'input.sortOrder'],
            merge(existing = { clients: [] }, incoming, { args }) {
              const offset = args.input.offset || 0;
              const limit = args.input.limit || 10;
              
              // Create a copy of the existing clients list or initialize if needed
              const merged = existing ? { ...existing } : { clients: [] };
              
              // Set the total count from incoming data
              merged.totalCount = incoming.totalCount;
              
              // Create a new array with the correct length
              const clients = [...merged.clients];
              
              // Copy the incoming clients to the correct positions
              incoming.clients.forEach((client, index) => {
                clients[offset + index] = client;
              });
              
              merged.clients = clients;
              return merged;
            }
          }
        }
      }
    }
  })
});
```

## Conclusion

Pagination is essential for working with large datasets in the Fineract GraphQL API. By following the patterns and best practices in this guide, you can create efficient, responsive interfaces that handle paginated data effectively.

Remember these key points:

1. Use appropriate page sizes for your use case
2. Always sort data for consistent pagination
3. Reset pagination when filters change
4. Handle empty results and loading states
5. Consider alternative patterns like infinite scroll for certain interfaces
6. Optimize performance with caching and prefetching