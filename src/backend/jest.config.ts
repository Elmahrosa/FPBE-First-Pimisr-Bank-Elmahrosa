import type { Config } from '@jest/types';
import { defaults as tsjPreset } from 'ts-jest/presets';

// @jest/types: ^29.0.0
// ts-jest: ^29.0.0
// jest-junit: ^15.0.0

const config: Config.InitialOptions = {
  // Root directories for test discovery across all microservices
  roots: [
    '<rootDir>/api-gateway/test',
    '<rootDir>/auth-service/test',
    '<rootDir>/account-service/src/test',
    '<rootDir>/notification-service/tests',
    '<rootDir>/pi-service/test',
    '<rootDir>/transaction-service/src/test'
  ],

  // Test pattern matching
  testMatch: ['**/?(*.)+(spec|test).(ts|tsx|js|jsx)'],

  // TypeScript transformation configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      isolatedModules: true,
      diagnostics: {
        warnOnly: false
      }
    }]
  },

  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'api-gateway/src/**/*.ts',
    'auth-service/src/**/*.ts',
    'account-service/src/main/**/*.java',
    'notification-service/src/**/*.py',
    'pi-service/src/**/*.ts',
    'transaction-service/src/main/**/*.java',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/types.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'api-gateway/src/**/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'auth-service/src/**/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test environment configuration
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
    '<rootDir>/test/setup-pi-network-mock.ts',
    '<rootDir>/test/setup-database.ts'
  ],

  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@api/(.*)$': '<rootDir>/api-gateway/src/$1',
    '^@auth/(.*)$': '<rootDir>/auth-service/src/$1',
    '^@pi/(.*)$': '<rootDir>/pi-service/src/$1'
  },

  // Test execution configuration
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%',
  clearMocks: true,
  restoreMocks: true,

  // Reporters configuration for CI/CD integration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{filepath}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Paths to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__fixtures__/',
    '/__mocks__/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/__fixtures__/',
    '/__mocks__/',
    '/test/',
    '/coverage/'
  ],

  // Additional settings
  errorOnDeprecated: true,
  detectOpenHandles: true,
  forceExit: true,
  bail: 1,
  cache: true,

  // Global setup/teardown
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',

  // TypeScript preset
  preset: 'ts-jest'
};

export default config;