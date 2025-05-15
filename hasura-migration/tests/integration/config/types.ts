/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Hasura configuration
 */
export interface HasuraConfig {
  endpoint: string;
  adminSecret: string;
}

/**
 * Auth configuration
 */
export interface AuthConfig {
  jwtSecret: string;
  defaultTestUser: {
    username: string;
    password: string;
  };
}

/**
 * Application configuration
 */
export interface AppConfig {
  database: DatabaseConfig;
  hasura: HasuraConfig;
  auth: AuthConfig;
  environment: string;
}

/**
 * Test database options
 */
export interface TestDatabaseOptions {
  setupSql?: string[];
}

/**
 * Test context options
 */
export interface TestContextOptions {
  testId?: string;
}