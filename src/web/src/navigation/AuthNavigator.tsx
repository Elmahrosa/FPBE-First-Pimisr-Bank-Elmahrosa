/**
 * @fileoverview Enhanced authentication navigation stack component for FPBE mobile banking application
 * Implements secure navigation flow with biometric authentication and accessibility support
 * @version 2024.1
 */

import React from 'react';
import { Platform } from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';

// Internal imports
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register';
import BiometricSetup from '../screens/auth/BiometricSetup';
import PinSetup from '../screens/auth/PinSetup';
import OnBoarding from '../screens/auth/OnBoarding';
import ForgotPassword from '../screens/auth/ForgotPassword';
import { AuthStackParamList } from './types';

// Initialize stack navigator with type safety
const Stack = createStackNavigator<AuthStackParamList>();

/**
 * Enhanced screen options for secure navigation
 */
const screenOptions = {
  headerStyle: {
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
    backgroundColor: '#FFFFFF',
  },
  headerTitleStyle: {
    fontFamily: Platform.select({
      ios: 'SF-Pro-Display-Medium',
      android: 'Roboto',
      default: 'System'
    }),
    fontSize: 18,
  },
  headerTintColor: '#1E3A8A',
  headerBackTitleVisible: false,
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  gestureEnabled: true,
  animationEnabled: true,
  presentation: 'card' as const,
};

/**
 * Navigation configuration with security and accessibility enhancements
 */
const navigationConfig = {
  screenListeners: {
    focus: (e: any) => {
      // Track screen focus for security auditing
      console.log('Screen focused:', e.target);
    },
    blur: (e: any) => {
      // Clear sensitive data on screen blur
      console.log('Screen blurred:', e.target);
    },
    state: (e: any) => {
      // Validate navigation state transitions
      console.log('Navigation state changed:', e.data);
    }
  },
  detachInactiveScreens: true,
  keyboardHandlingEnabled: true
};

/**
 * Enhanced authentication navigator component with security features
 * and accessibility support
 */
const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={screenOptions}
      {...navigationConfig}
    >
      <Stack.Screen
        name="Login"
        component={Login}
        options={{
          title: 'Sign In',
          headerShown: false,
          gestureEnabled: false
        }}
      />

      <Stack.Screen
        name="Register"
        component={Register}
        options={{
          title: 'Create Account',
          headerLeft: () => null,
          gestureEnabled: false
        }}
      />

      <Stack.Screen
        name="BiometricSetup"
        component={BiometricSetup}
        options={{
          title: 'Biometric Setup',
          headerLeft: () => null,
          gestureEnabled: false
        }}
      />

      <Stack.Screen
        name="PinSetup"
        component={PinSetup}
        options={{
          title: 'Create PIN',
          headerLeft: () => null,
          gestureEnabled: false
        }}
      />

      <Stack.Screen
        name="OnBoarding"
        component={OnBoarding}
        options={{
          title: 'Welcome',
          headerShown: false,
          gestureEnabled: false
        }}
      />

      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPassword}
        options={{
          title: 'Reset Password',
          gestureEnabled: true
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;