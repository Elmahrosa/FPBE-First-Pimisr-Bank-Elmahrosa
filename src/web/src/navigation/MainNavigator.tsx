/**
 * @fileoverview Main navigation component for FPBE mobile banking application
 * Implements authenticated navigation structure with enhanced security,
 * accessibility, and performance features
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // ^6.0.0
import { createStackNavigator } from '@react-navigation/stack'; // ^6.0.0
import { useNavigationState, CardStyleInterpolator } from '@react-navigation/native'; // ^6.0.0
import { NavigationErrorBoundary } from '@react-navigation/core'; // ^6.0.0

import { MainStackParamList } from './types';
import BottomTabs from '../components/navigation/BottomTabs';
import { TAB_ROUTES, MAIN_ROUTES } from '../constants/navigation.constants';

// Lazy loaded screen components for better performance
const Dashboard = React.lazy(() => import('../screens/Dashboard'));
const Accounts = React.lazy(() => import('../screens/Accounts'));
const PiWallet = React.lazy(() => import('../screens/PiWallet'));
const Cards = React.lazy(() => import('../screens/Cards'));
const Settings = React.lazy(() => import('../screens/Settings'));
const AccountDetails = React.lazy(() => import('../screens/AccountDetails'));
const TransactionDetails = React.lazy(() => import('../screens/TransactionDetails'));
const PaymentConfirmation = React.lazy(() => import('../screens/PaymentConfirmation'));
const Mining = React.lazy(() => import('../screens/Mining'));
const Exchange = React.lazy(() => import('../screens/Exchange'));

// Navigation stacks
const Tab = createBottomTabNavigator<MainStackParamList>();
const Stack = createStackNavigator<MainStackParamList>();

// Screen tracking configuration
const SCREEN_TRACKING_OPTIONS = {
  enabled: true,
  sampleRate: 100,
};

/**
 * Custom hook for screen view tracking and analytics
 */
const useScreenTracking = () => {
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    if (!SCREEN_TRACKING_OPTIONS.enabled) return;

    const currentRoute = navigationState?.routes[navigationState.index];
    if (currentRoute) {
      // Track screen view with analytics
      const eventData = {
        screen_name: currentRoute.name,
        screen_class: currentRoute.name,
        timestamp: new Date().toISOString(),
      };
      // Analytics implementation would go here
      console.log('Screen View:', eventData);
    }
  }, [navigationState]);
};

/**
 * Stack navigator for screens that aren't part of the bottom tabs
 */
const MainStack = () => {
  const screenOptions = useCallback((): any => ({
    headerShown: true,
    gestureEnabled: Platform.OS === 'ios',
    cardStyleInterpolator: CardStyleInterpolator.forHorizontalIOS,
    headerBackTitleVisible: false,
    presentation: 'card',
    animation: 'slide_from_right',
  }), []);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name={MAIN_ROUTES.ACCOUNT_DETAILS}
        component={AccountDetails}
        options={{ title: 'Account Details' }}
      />
      <Stack.Screen
        name={MAIN_ROUTES.TRANSACTION_DETAILS}
        component={TransactionDetails}
        options={{ title: 'Transaction Details' }}
      />
      <Stack.Screen
        name={MAIN_ROUTES.PAYMENT_CONFIRMATION}
        component={PaymentConfirmation}
        options={{ title: 'Confirm Payment' }}
      />
      <Stack.Screen
        name={MAIN_ROUTES.MINING}
        component={Mining}
        options={{ title: 'Pi Mining' }}
      />
      <Stack.Screen
        name={MAIN_ROUTES.EXCHANGE}
        component={Exchange}
        options={{ title: 'Exchange' }}
      />
    </Stack.Navigator>
  );
};

/**
 * Main navigation component with bottom tabs and nested stack navigation
 */
const MainNavigator: React.FC = () => {
  useScreenTracking();

  const tabScreenOptions = useCallback(() => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,
    lazy: true,
    freezeOnBlur: true,
  }), []);

  return (
    <NavigationErrorBoundary>
      <Tab.Navigator
        tabBar={props => <BottomTabs {...props} />}
        screenOptions={tabScreenOptions}
        initialRouteName={TAB_ROUTES.DASHBOARD}
      >
        <Tab.Screen
          name={TAB_ROUTES.DASHBOARD}
          component={Dashboard}
          options={{
            title: 'Dashboard',
            tabBarAccessibilityLabel: 'Dashboard Tab',
          }}
        />
        <Tab.Screen
          name={TAB_ROUTES.ACCOUNTS}
          component={Accounts}
          options={{
            title: 'Accounts',
            tabBarAccessibilityLabel: 'Accounts Tab',
          }}
        />
        <Tab.Screen
          name={TAB_ROUTES.PI_WALLET}
          component={PiWallet}
          options={{
            title: 'Pi Wallet',
            tabBarAccessibilityLabel: 'Pi Wallet Tab',
          }}
        />
        <Tab.Screen
          name={TAB_ROUTES.CARDS}
          component={Cards}
          options={{
            title: 'Cards',
            tabBarAccessibilityLabel: 'Cards Tab',
          }}
        />
        <Tab.Screen
          name={TAB_ROUTES.SETTINGS}
          component={Settings}
          options={{
            title: 'Settings',
            tabBarAccessibilityLabel: 'Settings Tab',
          }}
        />
      </Tab.Navigator>
    </NavigationErrorBoundary>
  );
};

export default MainNavigator;