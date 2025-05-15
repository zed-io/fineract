import { Pool } from 'pg';
import { logger } from './logger';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error('Database connection error:', err);
  } else {
    logger.info('Database connected successfully:', res.rows[0]);
  }
});

// Handle unexpected errors
pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: () => pool.connect(),
};