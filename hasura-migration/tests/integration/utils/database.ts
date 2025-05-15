import { Pool, PoolClient } from 'pg';
import { 
  DatabaseConfig,
  TestDatabaseOptions 
} from '@config/types';
import config from '@config/config';

/**
 * A utility class for managing database connections and operations during tests
 */
class Database {
  private pool: Pool;
  private client: PoolClient | null = null;

  /**
   * Creates a new Database instance
   * @param config Database configuration
   */
  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 5, // Keep a small connection pool for tests
      idleTimeoutMillis: 30000
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    if (!this.client) {
      this.client = await this.pool.connect();
    }
    return this.client;
  }

  /**
   * Execute a query
   * @param text SQL query text
   * @param params Query parameters
   * @returns Query result
   */
  async query(text: string, params: any[] = []): Promise<any> {
    const client = await this.getClient();
    try {
      return await client.query(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Setup a clean test database state
   * @param options Test options
   */
  async setupTestDatabase(options?: TestDatabaseOptions): Promise<void> {
    // Start a transaction to allow rollback of test data
    await this.query('BEGIN');

    // Apply any specified setup SQL
    if (options?.setupSql) {
      for (const sql of options.setupSql) {
        await this.query(sql);
      }
    }
  }

  /**
   * Reset the database after tests by rolling back the transaction
   */
  async resetDatabase(): Promise<void> {
    await this.query('ROLLBACK');
  }

  /**
   * Load fixture data into the database
   * @param tableName Table to load data into
   * @param data Array of data objects
   */
  async loadFixtures(tableName: string, data: any[]): Promise<void> {
    if (!data.length) return;

    // Get column names from the first data object
    const columns = Object.keys(data[0]);
    const placeholders = data.map((_, idx) => 
      `(${columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`).join(', ')})`
    ).join(', ');
    
    const values = data.flatMap(item => columns.map(col => item[col]));
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES ${placeholders}
    `;
    
    await this.query(query, values);
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    await this.pool.end();
  }
}

// Export a singleton instance
export const db = new Database(config.database);

// Export functions for common operations
export const query = (text: string, params: any[] = []): Promise<any> => db.query(text, params);
export const setupTestDatabase = (options?: TestDatabaseOptions): Promise<void> => db.setupTestDatabase(options);
export const resetDatabase = (): Promise<void> => db.resetDatabase();
export const loadFixtures = (tableName: string, data: any[]): Promise<void> => db.loadFixtures(tableName, data);
export const closeDatabase = (): Promise<void> => db.close();