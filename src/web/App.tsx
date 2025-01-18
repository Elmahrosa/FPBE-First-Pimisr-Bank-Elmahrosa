/**
 * @fileoverview Root component of the FPBE mobile banking application
 * Implements core providers, navigation, state management, security context,
 * and performance monitoring with comprehensive error handling
 * @version 2024.1
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux'; // ^8.1.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.5.0
import { StatusBar, Platform } from 'react-native'; // v0.71+
import { SecurityProvider } from '@auth0/auth0-react'; // ^2.0.0
import { PerformanceMonitor } from '@performance-monitor/react'; // ^1.0.0

// Internal imports
import AppNavigator from './navigation/AppNavigator';
import { store } from './store/store';
import ErrorBoundary from './components/common/ErrorBoundary';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  targetResponseTime: 100, // 100ms target as per requirements
  monitoringEnabled: true,
  samplingRate: 0.1, // 10% sampling rate for performance monitoring
};

// Security configuration
const SECURITY_CONFIG = {
  validationEnabled: true,
  incidentReporting: true,
  securityLevel: 'high' as const,
};

/**
 * Root component that sets up the application with necessary providers,
 * security context, and performance monitoring
 */
const App: React.FC = () => {
  // Initialize performance monitoring
  useEffect(() => {
    if (PERFORMANCE_CONFIG.monitoringEnabled) {
      PerformanceMonitor.initialize({
        targetResponseTime: PERFORMANCE_CONFIG.targetResponseTime,
        samplingRate: PERFORMANCE_CONFIG.samplingRate,
        onPerformanceIssue: (metric) => {
          console.warn('Performance issue detected:', metric);
        },
      });
    }
  }, []);

  // Configure status bar based on platform
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
  }, []);

  // Cleanup resources on unmount
  useEffect(() => {
    return () => {
      if (PERFORMANCE_CONFIG.monitoringEnabled) {
        PerformanceMonitor.cleanup();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SecurityProvider
          domain={process.env.REACT_APP_AUTH0_DOMAIN!}
          clientId={process.env.REACT_APP_AUTH0_CLIENT_ID!}
          audience={process.env.REACT_APP_AUTH0_AUDIENCE}
          redirectUri={window.location.origin}
          cacheLocation="localstorage"
          useRefreshTokens={true}
          scope="openid profile email"
        >
          <SafeAreaProvider>
            <PerformanceMonitor
              enabled={PERFORMANCE_CONFIG.monitoringEnabled}
              config={{
                targetResponseTime: PERFORMANCE_CONFIG.targetResponseTime,
                samplingRate: PERFORMANCE_CONFIG.samplingRate,
              }}
            >
              <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
              />
              <AppNavigator />
            </PerformanceMonitor>
          </SafeAreaProvider>
        </SecurityProvider>
      </Provider>
    </ErrorBoundary>
  );
};

// Performance monitoring decorator
const withPerformanceTracking = (WrappedComponent: React.FC) => {
  return class extends React.Component {
    componentDidMount() {
      PerformanceMonitor.trackMount('App');
    }

    componentWillUnmount() {
      PerformanceMonitor.trackUnmount('App');
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
};

export default withPerformanceTracking(App);