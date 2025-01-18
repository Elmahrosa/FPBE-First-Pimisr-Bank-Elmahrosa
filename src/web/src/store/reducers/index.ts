/**
 * @fileoverview Root reducer configuration for FPBE mobile banking application
 * Combines all feature reducers with performance monitoring and security validation
 * @version 2024.1
 */

import { combineReducers, Reducer, AnyAction } from '@reduxjs/toolkit'; // ^1.9.5
import { createLogger } from 'redux-logger'; // ^3.0.6
import { performance } from '@redux-devtools/extension'; // ^3.2.5
import { StateValidator } from 'redux-state-validator'; // ^1.0.0

// Import individual reducers
import authReducer from './auth.reducer';
import accountReducer from './account.reducer';
import transactionReducer from './transaction.reducer';
import piReducer from './pi.reducer';

// Import types
import { RootState } from '../types';

// Performance monitoring configuration
const PERFORMANCE_THRESHOLD_MS = 100; // Maximum acceptable state update time
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Performance monitoring decorator for state updates
 */
const performanceMonitor = (reducer: Reducer) => (state: RootState | undefined, action: AnyAction) => {
  const start = performance.now();
  const newState = reducer(state, action);
  const duration = performance.now() - start;

  if (duration > PERFORMANCE_THRESHOLD_MS) {
    console.warn(`State update for action ${action.type} took ${duration}ms`);
  }

  return newState;
};

/**
 * State validation configuration for security and data integrity
 */
const stateValidator = new StateValidator({
  auth: {
    required: ['isAuthenticated', 'user', 'token'],
    validateUser: (user: any) => user === null || (user.id && user.email && user.securityVersion)
  },
  accounts: {
    validateAccounts: (accounts: any[]) => Array.isArray(accounts),
    validateSelectedAccount: (account: any) => account === null || account.id
  },
  transactions: {
    validateTransactions: (transactions: any[]) => Array.isArray(transactions),
    validateLimits: (limits: any) => limits.maxAmount && limits.dailyLimit
  },
  pi: {
    validateWallet: (wallet: any) => wallet === null || (wallet.walletAddress && wallet.balance),
    validateMiningStatus: (status: string) => ['ACTIVE', 'PAUSED', 'STOPPED', 'ERROR'].includes(status)
  }
});

/**
 * Development-only logging configuration
 */
const loggerMiddleware = createLogger({
  collapsed: true,
  duration: true,
  timestamp: false,
  colors: {
    title: (action: AnyAction) => action.error ? 'red' : 'blue',
    prevState: () => '#9E9E9E',
    action: () => '#03A9F4',
    nextState: () => '#4CAF50'
  }
});

/**
 * Combined root reducer with performance monitoring and validation
 */
const rootReducer: Reducer<RootState> = performanceMonitor(
  stateValidator.wrapReducer(
    combineReducers<RootState>({
      auth: authReducer,
      accounts: accountReducer,
      transactions: transactionReducer,
      pi: piReducer
    })
  )
);

// Apply development-only middleware
if (isDevelopment) {
  console.log('Development mode: Redux logging enabled');
}

export default rootReducer;