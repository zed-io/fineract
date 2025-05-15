module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/utils/db.ts', // Exclude database connection file
    '!src/utils/logger.ts' // Exclude logger
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  // Setup files for testing
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/tests/recurringDeposit/jest.setup.ts'
  ]
};