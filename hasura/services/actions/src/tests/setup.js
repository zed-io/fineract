// Increase timeout for integration tests
jest.setTimeout(30000);

// Set test environment variables
process.env.NODE_ENV = 'test';

// Setup global mocks
global.console = {
  ...console,
  // Comment out if you want to see full logs during testing
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock module to prevent actual DB connections in unit tests
jest.mock('../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(async (callback) => await callback({ query: jest.fn() })),
  pool: {
    connect: jest.fn()
  }
}));

// Don't mock DB for integration tests
if (process.env.RUN_INTEGRATION_TESTS === 'true') {
  jest.unmock('../utils/db');
}