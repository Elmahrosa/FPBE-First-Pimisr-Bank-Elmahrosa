/**
 * @fileoverview Redux store configuration for FPBE mobile banking application
 * Implements high-performance, type-safe store with comprehensive security and monitoring
 * @version 2024.1
 */

import { configureStore, Middleware } from '@reduxjs/toolkit'; // ^1.9.5
import createSagaMiddleware from 'redux-saga'; // ^1.2.1
import { persistStore, persistReducer } from 'redux-persist'; // ^6.0.0
import storage from 'redux-persist/lib/storage';
import { createStateSyncMiddleware } from 'redux-state-sync'; // ^3.1.4
import { errorBoundaryMiddleware } from '@redux-middleware/error-boundary'; // ^1.0.0

// Import root reducer and saga
import rootReducer from './reducers';
import rootSaga from './sagas';

// Performance monitoring constants
const PERFORMANCE_THRESHOLD_MS = 100;
const REDUX_DEVTOOLS_CONFIG = {
  maxAge: 50,
  trace: true,
  traceLimit: 25
};

// Security configuration for state persistence
const PERSIST_CONFIG = {
  key: 'fpbe-root',
  storage,
  whitelist: ['auth', 'accounts', 'pi'],
  blacklist: ['_persist', 'error'],
  version: 1,
  timeout: 10000,
  serialize: true,
  writeFailHandler: (err: Error) => {
    console.error('State persistence failed:', err);
  }
};

// State synchronization configuration
const STATE_SYNC_CONFIG = {
  channel: 'fpbe_state_sync',
  broadcastChannelOption: {
    type: 'localstorage'
  },
  whitelist: ['auth/updateSession', 'pi/updateMiningStatus']
};

/**
 * Performance monitoring middleware with threshold alerts
 */
const performanceMiddleware: Middleware = () => next => action => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  if (duration > PERFORMANCE_THRESHOLD_MS) {
    console.warn(
      `Action ${action.type} took ${duration.toFixed(2)}ms to process`
    );
  }

  return result;
};

/**
 * Configures and creates the Redux store with enhanced security and monitoring
 */
export function configureAppStore() {
  // Create and configure saga middleware
  const sagaMiddleware = createSagaMiddleware({
    onError: (error: Error, { sagaStack }) => {
      console.error('Saga error:', error, '\nSaga Stack:', sagaStack);
    }
  });

  // Configure error boundary middleware
  const errorMiddleware = errorBoundaryMiddleware({
    onError: (error: Error, action) => {
      console.error('Redux error:', {
        error,
        action,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Configure state persistence
  const persistedReducer = persistReducer(PERSIST_CONFIG, rootReducer);

  // Configure state synchronization
  const stateSyncMiddleware = createStateSyncMiddleware(STATE_SYNC_CONFIG);

  // Create store with all middleware
  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
      },
      thunk: false
    }).concat(
      sagaMiddleware,
      errorMiddleware,
      performanceMiddleware,
      stateSyncMiddleware
    ),
    devTools: process.env.NODE_ENV !== 'production' && REDUX_DEVTOOLS_CONFIG
  });

  // Run root saga
  sagaMiddleware.run(rootSaga);

  // Create persistor
  const persistor = persistStore(store, null, () => {
    console.log('State rehydration complete');
  });

  // Enable hot module replacement for reducers
  if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./reducers', () => {
      store.replaceReducer(persistReducer(PERSIST_CONFIG, rootReducer));
    });
  }

  return { store, persistor };
}

// Create store instance
const { store, persistor } = configureAppStore();

// Export store types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store and persistor
export { store, persistor };