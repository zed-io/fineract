/**
 * Jest setup file
 * 
 * This file runs before tests to set up the testing environment
 */

// Mock the database module
jest.mock('../../utils/db', () => ({
  db: {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});