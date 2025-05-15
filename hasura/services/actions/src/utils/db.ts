import { Pool } from 'pg';
import { logger } from './logger';

// Create a PostgreSQL connection pool
export const pool = new Pool(
  process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL
    }
  : {
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'fineract_tenants',
      // Max number of clients in the pool
      max: 20,
      // How long a client is allowed to remain idle before being closed
      idleTimeoutMillis: 30000,
      // How long to wait for a client to become available
      connectionTimeoutMillis: 5000,
    }
);

// Log connection errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper to run database operations in a transaction
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Simple query helper with enhanced logging
export async function query(text: string, params: any[] = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) { // Log slow queries (over 1 second)
      logger.warn(`Slow query (${duration}ms): ${text}`);
    } else if (process.env.LOG_QUERIES === 'true') {
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    logger.error('Error executing query', { text, error });
    throw error;
  }
}

// Initialize database connection
export async function initDatabase() {
  try {
    const client = await pool.connect();
    logger.info('Successfully connected to PostgreSQL database');
    client.release();
    return true;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    return false;
  }
}

// Export for backward compatibility
export const db = {
  query,
  transaction,
  pool,
  initDatabase
};