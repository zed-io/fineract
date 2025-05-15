import { graphqlClient, gql } from '@utils/graphql-client';
import config from '@config/config';
import { TestContext } from '@utils/test-context';

// GraphQL mutation for login
const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      token
      user {
        id
        username
        role
      }
    }
  }
`;

/**
 * Login a test user and set the token in the client
 * @param context Test context
 * @param username Optional username (defaults to config)
 * @param password Optional password (defaults to config)
 */
export async function loginTestUser(
  context: TestContext,
  username?: string,
  password?: string
): Promise<{ token: string; user: any }> {
  const credentials = {
    username: username || config.auth.defaultTestUser.username,
    password: password || config.auth.defaultTestUser.password,
  };

  try {
    // Use the admin client to login, as regular client requires auth
    const result = await graphqlClient.adminQuery<{ login: { token: string; user: any } }>(
      LOGIN_MUTATION,
      credentials
    );
    
    // Set user data in context and token in client
    context.setUserData({
      token: result.login.token,
      user: result.login.user,
    });
    
    return {
      token: result.login.token,
      user: result.login.user,
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error(`Failed to login with test user: ${error}`);
  }
}

/**
 * Create a test user for authentication
 * @param context Test context
 * @param userData User data (username, password, etc.)
 */
export async function createTestUser(
  context: TestContext,
  userData: { username: string; password: string; role?: string }
): Promise<{ id: string }> {
  // GraphQL mutation for user creation
  const CREATE_USER_MUTATION = gql`
    mutation CreateUser($username: String!, $password: String!, $role: String) {
      createUser(input: { username: $username, password: $password, role: $role }) {
        id
      }
    }
  `;
  
  try {
    // Use admin client to create user
    const result = await graphqlClient.adminQuery<{ createUser: { id: string } }>(
      CREATE_USER_MUTATION,
      {
        username: userData.username,
        password: userData.password,
        role: userData.role || 'user',
      }
    );
    
    // Track created user for cleanup
    context.trackEntity('users', result.createUser.id);
    
    return result.createUser;
  } catch (error) {
    console.error('Create user failed:', error);
    throw new Error(`Failed to create test user: ${error}`);
  }
}