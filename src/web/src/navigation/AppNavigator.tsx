/**
 * @fileoverview Root navigation component for FPBE mobile banking application
 * Implements secure navigation state management, deep linking, and analytics tracking
 * @version 2024.1
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import analytics from '@react-native-firebase/analytics';
import { ErrorBoundary } from 'react-error-boundary';

// Internal imports
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { useAuth } from '../hooks/useAuth';
import { RootStackParamList } from './types';
import { createTheme } from '../styles/theme';

// Initialize stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['fpbe://', 'https://fpbe.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          BiometricSetup: 'biometric-setup',
          PinSetup: 'pin-setup',
          OnBoarding: 'onboarding'
        }
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Accounts: 'accounts',
          PiWallet: 'pi-wallet',
          Cards: 'cards',
          Settings: 'settings',
          AccountDetails: 'account/:id',
          TransactionDetails: 'transaction/:id',
          PaymentConfirmation: 'payment/confirm',
          Mining: 'mining',
          Exchange: 'exchange'
        }
      }
    }
  }
};

/**
 * Root navigation component with enhanced security and analytics
 */
const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  // Configure navigation theme
  const theme = {
    ...DefaultTheme,
    ...createTheme(),
    colors: {
      ...DefaultTheme.colors,
      ...createTheme().colors
    }
  };

  // Track screen views for analytics
  const handleNavigationStateChange = async () => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    if (currentRoute) {
      await analytics().logScreenView({
        screen_name: currentRoute.name,
        screen_class: currentRoute.name
      });
    }
  };

  // Handle navigation errors
  const handleNavigationError = (error: Error) => {
    console.error('Navigation error:', error);
    analytics().logEvent('navigation_error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary}
          accessibilityLabel="Loading application"
        />
      </View>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={theme.colors.error} />
        </View>
      }
      onError={handleNavigationError}
    >
      <NavigationContainer
        theme={theme}
        linking={linking}
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        }
        onStateChange={handleNavigationStateChange}
        documentTitle={{
          formatter: (options, route) => 
            `FPBE Banking - ${route?.name || 'Loading...'}`
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            animationEnabled: true
          }}
        >
          {isAuthenticated ? (
            <Stack.Screen 
              name="Main" 
              component={MainNavigator}
              options={{
                gestureEnabled: false
              }}
            />
          ) : (
            <Stack.Screen 
              name="Auth" 
              component={AuthNavigator}
              options={{
                gestureEnabled: false
              }}
            />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  }
});

export default AppNavigator;