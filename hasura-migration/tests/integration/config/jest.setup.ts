/**
 * Jest setup file for integration tests
 */
import { closeDatabase } from '@utils/database';

// Increase test timeout to accommodate API calls
jest.setTimeout(30000);

// Global cleanup after all tests
afterAll(async () => {
  // Close database connections
  await closeDatabase();
});