import { GraphQLClient } from 'graphql-request';
import gql from 'graphql-tag';
import config from '@config/config';

/**
 * GraphQL client for making requests to Hasura API endpoints
 */
class HasuraGraphQLClient {
  private client: GraphQLClient;
  private adminClient: GraphQLClient;
  private token: string | null = null;

  constructor(apiUrl: string, adminSecret: string) {
    // Regular client (for authenticated user requests)
    this.client = new GraphQLClient(apiUrl);
    
    // Admin client (for accessing admin-only endpoints)
    this.adminClient = new GraphQLClient(apiUrl, {
      headers: {
        'x-hasura-admin-secret': adminSecret,
      },
    });
  }

  /**
   * Set the authentication token for the regular client
   * @param token JWT token
   */
  setAuthToken(token: string): void {
    this.token = token;
    this.client.setHeader('Authorization', `Bearer ${token}`);
  }

  /**
   * Clear the authentication token
   */
  clearAuthToken(): void {
    this.token = null;
    this.client.setHeader('Authorization', '');
  }

  /**
   * Get the current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Execute a query as an authenticated user
   * @param query GraphQL query
   * @param variables Query variables
   * @returns Query result
   */
  async query<T = any, V = any>(query: string, variables?: V): Promise<T> {
    if (!this.token) {
      throw new Error('Authentication token not set. Call setAuthToken first.');
    }
    
    try {
      return await this.client.request<T>(query, variables);
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  }

  /**
   * Execute a query with admin privileges
   * @param query GraphQL query
   * @param variables Query variables
   * @returns Query result
   */
  async adminQuery<T = any, V = any>(query: string, variables?: V): Promise<T> {
    try {
      return await this.adminClient.request<T>(query, variables);
    } catch (error) {
      console.error('Admin GraphQL query error:', error);
      throw error;
    }
  }

  /**
   * Execute a mutation as an authenticated user
   * @param mutation GraphQL mutation
   * @param variables Mutation variables
   * @returns Mutation result
   */
  async mutate<T = any, V = any>(mutation: string, variables?: V): Promise<T> {
    return this.query<T, V>(mutation, variables);
  }

  /**
   * Execute a mutation with admin privileges
   * @param mutation GraphQL mutation
   * @param variables Mutation variables
   * @returns Mutation result
   */
  async adminMutate<T = any, V = any>(mutation: string, variables?: V): Promise<T> {
    return this.adminQuery<T, V>(mutation, variables);
  }
}

// Export a singleton instance
export const graphqlClient = new HasuraGraphQLClient(
  config.hasura.endpoint,
  config.hasura.adminSecret
);

// Export common query/mutation functions
export const query = <T = any, V = any>(query: string, variables?: V): Promise<T> => 
  graphqlClient.query<T, V>(query, variables);

export const adminQuery = <T = any, V = any>(query: string, variables?: V): Promise<T> => 
  graphqlClient.adminQuery<T, V>(query, variables);

export const mutate = <T = any, V = any>(mutation: string, variables?: V): Promise<T> => 
  graphqlClient.mutate<T, V>(mutation, variables);

export const adminMutate = <T = any, V = any>(mutation: string, variables?: V): Promise<T> => 
  graphqlClient.adminMutate<T, V>(mutation, variables);

// Simple utility to create gql documents
export { gql };