// This file contains setup code for jest tests related to recurring deposit functionality

import { jest } from '@jest/globals';

// Set up global mocks for utilities
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the UUID generator to return predictable values for testing
jest.mock('uuid', () => ({
  v4: jest.fn().mockImplementation(() => {
    // Return a new mock ID with incremented counter each time
    const nextId = (globalThis.__nextMockId || 0) + 1;
    globalThis.__nextMockId = nextId;
    return `mock-uuid-${nextId}`;
  })
}));

// Mock account utilities for consistent testing
jest.mock('../../utils/accountUtils', () => ({
  generateAccountNumber: jest.fn().mockImplementation((prefix) => `${prefix}00001`),
  calculateFutureDate: jest.fn().mockImplementation((date, period, type) => {
    // Simple mock implementation that adds period days to the date
    const result = new Date(date);
    result.setDate(result.getDate() + period);
    return result;
  }),
  calculateMaturityAmount: jest.fn().mockImplementation((deposit, rate, years, compounding) => {
    // Simple mock implementation
    return deposit * (1 + (rate / 100 * years));
  }),
  getCompoundingFrequency: jest.fn().mockReturnValue(12), // Monthly
  calculateTermInYears: jest.fn().mockImplementation((period, type) => {
    // Simple implementation
    switch(type) {
      case 'days':
        return period / 365;
      case 'months':
        return period / 12;
      case 'years':
        return period;
      default:
        return period / 12;
    }
  })
}));

// Add test environment setup
beforeAll(() => {
  // Setup test environment variables if needed
});

// Clean up after tests
afterAll(() => {
  // Clean up any global state
  globalThis.__nextMockId = 0;
  jest.clearAllMocks();
});