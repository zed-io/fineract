import { AppConfig } from './types';

/**
 * Default configuration for integration tests
 * 
 * These values can be overridden with environment variables
 */
const config: AppConfig = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'fineract_default',
  },
  hasura: {
    endpoint: process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql',
    adminSecret: process.env.HASURA_ADMIN_SECRET || 'hasura-admin-secret',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    defaultTestUser: {
      username: process.env.TEST_USERNAME || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'password123',
    },
  },
  environment: process.env.NODE_ENV || 'test',
};

export default config;