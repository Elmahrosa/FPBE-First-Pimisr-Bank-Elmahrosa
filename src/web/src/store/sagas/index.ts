/**
 * @fileoverview Root saga configuration file that combines all feature-specific sagas
 * with comprehensive error handling, performance monitoring, and type-safe saga orchestration
 * for the FPBE mobile banking application.
 * @version 2024.1
 */

import { all, fork, cancelled } from 'redux-saga/effects'; // ^1.2.1
import { createSagaMonitor } from '@redux-saga/core'; // ^1.2.1
import { withErrorBoundary } from '@redux-saga/error-boundary'; // ^1.2.1

// Import feature-specific sagas
import accountSaga from './account.saga';
import { watchAuth } from './auth.saga';
import piSaga from './pi.saga';
import watchTransactionSagas from './transaction.saga';

// Constants for saga monitoring and error handling
const SAGA_MONITORING_INTERVAL = 1000; // 1 second monitoring interval
const SAGA_ERROR_THRESHOLD = 100; // 100ms performance threshold

/**
 * Configure saga monitoring for performance tracking
 */
const sagaMonitor = createSagaMonitor({
  effectTriggered: (options) => {
    const startTime = performance.now();
    options.effect.metadata = { startTime };
  },
  effectResolved: (options) => {
    const endTime = performance.now();
    const startTime = options.effect.metadata?.startTime || endTime;
    const duration = endTime - startTime;

    if (duration > SAGA_ERROR_THRESHOLD) {
      console.warn(`Saga effect ${options.effectId} exceeded performance threshold: ${duration}ms`);
    }
  }
});

/**
 * Error boundary decorator for saga error handling
 */
const withSagaErrorBoundary = (saga: any) =>
  withErrorBoundary(saga, {
    onError: (error: Error, { sagaStack }) => {
      console.error('Saga error:', {
        error,
        stack: sagaStack,
        timestamp: new Date().toISOString()
      });
    },
    handleRetry: (error: Error, retries: number) => {
      // Allow up to 3 retries for recoverable errors
      return retries < 3 && !error.message.includes('CRITICAL');
    }
  });

/**
 * Performance monitoring decorator for saga execution
 */
const withPerformanceMonitoring = (saga: any) => {
  return function* monitoredSaga(...args: any[]) {
    const startTime = performance.now();
    const sagaName = saga.name;

    try {
      yield* saga(...args);
    } finally {
      const duration = performance.now() - startTime;
      if (duration > SAGA_ERROR_THRESHOLD) {
        console.warn(`Saga ${sagaName} exceeded performance threshold: ${duration}ms`);
      }
    }
  };
};

/**
 * Root saga that combines all feature sagas with comprehensive error handling,
 * performance monitoring, and cleanup handlers.
 */
export function* rootSaga() {
  try {
    // Fork all feature sagas with error boundaries and monitoring
    yield all([
      // Authentication saga with highest priority
      fork(withSagaErrorBoundary(withPerformanceMonitoring(watchAuth))),
      
      // Account management saga
      fork(withSagaErrorBoundary(withPerformanceMonitoring(accountSaga))),
      
      // Pi Network integration saga
      fork(withSagaErrorBoundary(withPerformanceMonitoring(piSaga))),
      
      // Transaction management saga
      fork(withSagaErrorBoundary(withPerformanceMonitoring(watchTransactionSagas)))
    ]);
  } catch (error) {
    // Log critical saga errors
    console.error('Critical saga error:', {
      error,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Cleanup handler for saga cancellation
    if (yield cancelled()) {
      console.log('Root saga cancelled, cleaning up resources...');
      
      // Perform cleanup operations
      yield all([
        // Add specific cleanup tasks here if needed
      ]);
    }
  }
}

export default rootSaga;