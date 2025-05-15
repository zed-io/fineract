import { Pool } from 'pg';
import { logger } from './logger';

// Create a PostgreSQL pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis:
  10000 // How long to wait for a connection from the pool
});

// Log pool events
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle database client', { error: err });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

// Function to test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Database connection test failed', { error });
    return false;
  }
};

export default pool;