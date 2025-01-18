/**
 * @fileoverview Entry point for FPBE mobile banking application
 * Initializes the application with security configurations, performance monitoring,
 * and accessibility features.
 * @version 2024.1
 */

import React from 'react';
import { AppRegistry, LogBox, AccessibilityInfo, Platform } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import { performanceMonitor } from '@performance/monitor';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';

// Internal imports
import App from './App';

// Constants
const APP_NAME = 'FPBE';
const PERFORMANCE_THRESHOLD = 100; // 100ms as per requirements

// Ignore specific warnings that are known and handled
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
  'ViewPropTypes will be removed'
]);

/**
 * Initializes application with necessary configurations and monitoring
 */
const initializeApp = async (): Promise<void> => {
  try {
    // Initialize performance monitoring
    performanceMonitor.initialize({
      threshold: PERFORMANCE_THRESHOLD,
      enableReporting: true,
      sampleRate: 100
    });

    // Configure accessibility features
    await configureAccessibility();

    // Platform-specific initialization
    if (Platform.OS === 'android') {
      await configurePlatformSpecifics();
    }

  } catch (error) {
    console.error('Application initialization failed:', error);
    performanceMonitor.recordError('INIT_ERROR', error);
  }
};

/**
 * Configures accessibility features and screen reader support
 */
const configureAccessibility = async (): Promise<void> => {
  try {
    // Check if screen reader is enabled
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

    // Configure accessibility announcements
    AccessibilityInfo.announceForAccessibility('FPBE Banking application initialized');

    if (screenReaderEnabled) {
      // Additional screen reader specific configurations
      AccessibilityInfo.setAccessibilityFocus('main-content');
    }

  } catch (error) {
    console.error('Accessibility configuration failed:', error);
  }
};

/**
 * Configures platform-specific features
 */
const configurePlatformSpecifics = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    // Android-specific configurations
    if (Platform.Version >= 23) {
      // Configure modern Android features
    }
  }
};

/**
 * Error fallback component for critical errors
 */
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Something went wrong</Text>
    <Text>{error.message}</Text>
    <Button onPress={resetErrorBoundary} title="Try again" />
  </View>
);

/**
 * Root component with error boundary and state management
 */
const Root = () => (
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error) => {
      console.error('Critical error:', error);
      performanceMonitor.recordError('CRITICAL_ERROR', error);
    }}
  >
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </ErrorBoundary>
);

// Initialize application
initializeApp().then(() => {
  // Register the application
  AppRegistry.registerComponent(APP_NAME, () => Root);
}).catch(error => {
  console.error('Fatal error during initialization:', error);
  performanceMonitor.recordError('FATAL_ERROR', error);
});

// Export for testing purposes
export default Root;