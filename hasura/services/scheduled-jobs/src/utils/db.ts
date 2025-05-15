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

// Get a connection for a specific tenant
export async function getTenantConnection(tenantId: string) {
  try {
    // Get tenant connection details
    const tenantQuery = await query(
      'SELECT name, identifier, db_host, db_port, db_name, db_username, db_password, is_active FROM tenant WHERE id = $1',
      [tenantId]
    );
    
    if (tenantQuery.rowCount === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    
    const tenant = tenantQuery.rows[0];
    
    if (!tenant.is_active) {
      throw new Error(`Tenant is not active: ${tenantId}`);
    }
    
    // Create a new pool for the tenant
    const tenantPool = new Pool({
      host: tenant.db_host,
      port: tenant.db_port,
      database: tenant.db_name,
      user: tenant.db_username,
      password: tenant.db_password,
      max: 5, // Limit connections per tenant
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Return object with tenant-specific methods
    return {
      query: async (text: string, params: any[] = []) => {
        const start = Date.now();
        try {
          const res = await tenantPool.query(text, params);
          const duration = Date.now() - start;

          if (duration > 1000) { // Log slow queries (over 1 second)
            logger.warn(`Slow tenant query (${duration}ms) for tenant ${tenant.name}: ${text}`);
          } else if (process.env.LOG_QUERIES === 'true') {
            logger.debug('Executed tenant query', { tenant: tenant.name, text, duration, rows: res.rowCount });
          }

          return res;
        } catch (error) {
          logger.error('Error executing tenant query', { tenant: tenant.name, text, error });
          throw error;
        }
      },
      transaction: async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
        const client = await tenantPool.connect();
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
      },
      release: () => {
        tenantPool.end();
      }
    };
  } catch (error) {
    logger.error('Failed to get tenant connection:', error);
    throw error;
  }
}

// Export for backward compatibility
export const db = {
  query,
  transaction,
  pool,
  initDatabase,
  getTenantConnection
};