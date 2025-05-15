"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
exports.transaction = transaction;
exports.query = query;
exports.initDatabase = initDatabase;
const pg_1 = require("pg");
const logger_1 = require("./logger");
// Create a PostgreSQL connection pool
exports.pool = new pg_1.Pool(process.env.DATABASE_URL
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
    });
// Log connection errors
exports.pool.on('error', (err) => {
    logger_1.logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});
// Helper to run database operations in a transaction
async function transaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
// Simple query helper with enhanced logging
async function query(text, params = []) {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) { // Log slow queries (over 1 second)
            logger_1.logger.warn(`Slow query (${duration}ms): ${text}`);
        }
        else if (process.env.LOG_QUERIES === 'true') {
            logger_1.logger.debug('Executed query', { text, duration, rows: res.rowCount });
        }
        return res;
    }
    catch (error) {
        logger_1.logger.error('Error executing query', { text, error });
        throw error;
    }
}
// Initialize database connection
async function initDatabase() {
    try {
        const client = await exports.pool.connect();
        logger_1.logger.info('Successfully connected to PostgreSQL database');
        client.release();
        return true;
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to PostgreSQL database:', error);
        return false;
    }
}
// Export for backward compatibility
exports.db = {
    query,
    transaction,
    pool: exports.pool,
    initDatabase
};
