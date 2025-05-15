import { v4 as uuidv4 } from 'uuid';
import { graphqlClient } from './graphql-client';
import { db, loadFixtures, resetDatabase, setupTestDatabase } from './database';
import { TestContextOptions } from '@config/types';

/**
 * Test context class to manage test state and provide utilities
 */
export class TestContext {
  private testId: string;
  private userData: Record<string, any> | null = null;
  private createdEntities: Record<string, string[]> = {};

  constructor(options?: TestContextOptions) {
    // Generate a unique identifier for this test run
    this.testId = options?.testId || uuidv4();
  }

  /**
   * Initialize the test context
   */
  async initialize(): Promise<this> {
    // Setup database with a clean state
    await setupTestDatabase();
    
    return this;
  }

  /**
   * Get the unique test ID
   */
  getId(): string {
    return this.testId;
  }

  /**
   * Set user data after login/authentication
   */
  setUserData(data: Record<string, any>): void {
    this.userData = data;
    
    // If token is provided, set it in the GraphQL client
    if (data.token) {
      graphqlClient.setAuthToken(data.token);
    }
  }

  /**
   * Get current user data
   */
  getUserData(): Record<string, any> | null {
    return this.userData;
  }

  /**
   * Load fixture data into the database
   * @param tableName Table name
   * @param data Array of fixture data objects
   */
  async loadFixtures<T extends Record<string, any>>(tableName: string, data: T[]): Promise<void> {
    await loadFixtures(tableName, data);
    
    // Track created entities for cleanup
    if (!this.createdEntities[tableName]) {
      this.createdEntities[tableName] = [];
    }
    
    // Extract IDs for tracking
    data.forEach(item => {
      if (item.id) {
        this.createdEntities[tableName].push(item.id);
      }
    });
  }

  /**
   * Register an entity as created during the test
   * @param tableName Table name
   * @param id Entity ID
   */
  trackEntity(tableName: string, id: string): void {
    if (!this.createdEntities[tableName]) {
      this.createdEntities[tableName] = [];
    }
    this.createdEntities[tableName].push(id);
  }

  /**
   * Get created entities by table name
   * @param tableName Table name
   */
  getCreatedEntities(tableName: string): string[] {
    return this.createdEntities[tableName] || [];
  }

  /**
   * Execute raw SQL query
   * @param query SQL query
   * @param params Query parameters
   */
  async executeQuery<T = any>(query: string, params: any[] = []): Promise<T> {
    const result = await db.query(query, params);
    return result.rows as T;
  }

  /**
   * Cleanup the test context
   */
  async cleanup(): Promise<void> {
    // Reset the database (rollback transaction)
    await resetDatabase();
    
    // Clear authentication token
    graphqlClient.clearAuthToken();
    
    // Clear tracked entities
    this.createdEntities = {};
    
    // Clear user data
    this.userData = null;
  }
}

/**
 * Create and initialize a new test context
 * @param options Test context options
 */
export async function createTestContext(options?: TestContextOptions): Promise<TestContext> {
  const context = new TestContext(options);
  await context.initialize();
  return context;
}