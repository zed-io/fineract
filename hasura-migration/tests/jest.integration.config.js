module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/integration'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'integration/**/*.ts',
    '!integration/**/*.d.ts',
    '!integration/config/**/*',
    '!integration/fixtures/**/*'
  ],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/integration/config/jest.setup.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/integration/config/$1',
    '^@utils/(.*)$': '<rootDir>/integration/utils/$1',
    '^@graphql/(.*)$': '<rootDir>/integration/graphql/$1',
    '^@fixtures/(.*)$': '<rootDir>/integration/fixtures/$1',
    '^@helpers/(.*)$': '<rootDir>/integration/helpers/$1'
  }
};