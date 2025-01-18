import type { Config } from '@jest/globals';

const config: Config = {
  // React Native preset for proper mobile testing environment
  preset: 'react-native',

  // Setup files to extend Jest's expect and setup test environment
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    './src/test/setup/piNetwork.setup.js',
    './src/test/setup/biometrics.setup.js'
  ],

  // Supported file extensions for test files
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Module path aliases mapping for clean imports
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@banking/(.*)$': '<rootDir>/src/features/banking/$1',
    '^@pi-network/(.*)$': '<rootDir>/src/features/pi-network/$1',
    '^@security/(.*)$': '<rootDir>/src/features/security/$1'
  },

  // Transform files using babel-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },

  // Ignore node_modules except for specific packages that need transformation
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|native-base|@react-navigation|@pi-network)/)'
  ],

  // Test file patterns
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js|jsx)$',

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '\\.snap$',
    '<rootDir>/node_modules/',
    '<rootDir>/ios/',
    '<rootDir>/android/',
    '<rootDir>/build/'
  ],

  // Cache directory for faster subsequent runs
  cacheDirectory: '.jest/cache',

  // Enable coverage collection
  collectCoverage: true,

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/assets/**',
    '!src/constants/**',
    '!src/types/**',
    'src/features/banking/**/*.{ts,tsx}',
    'src/features/pi-network/**/*.{ts,tsx}',
    'src/features/security/**/*.{ts,tsx}'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/features/banking/**/*.{ts,tsx}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'src/features/security/**/*.{ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    }
  },

  // Global variables available in tests
  globals: {
    window: {},
    __DEV__: true,
    PI_NETWORK_ENV: 'test'
  },

  // Setup files to run before tests
  setupFiles: [
    './jest.setup.js',
    './src/test/mocks/pi-network.mock.js',
    './src/test/mocks/biometrics.mock.js'
  ]
};

export default config;