/**
 * Navigation Constants
 * Defines constant values for navigation stacks, routes, screen names, and navigation metadata
 * used throughout the FPBE mobile banking application.
 */

/**
 * Root-level navigation stack names
 */
export const STACK_NAMES = {
  AUTH: 'Auth',
  MAIN: 'Main',
} as const;

/**
 * Authentication flow route names
 * Used for user authentication, registration, and onboarding process
 */
export const AUTH_ROUTES = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  BIOMETRIC_SETUP: 'BiometricSetup',
  PIN_SETUP: 'PinSetup',
  ONBOARDING: 'OnBoarding',
} as const;

/**
 * Main application route names
 * Used for primary application screens and features
 */
export const MAIN_ROUTES = {
  DASHBOARD: 'Dashboard',
  ACCOUNT_DETAILS: 'AccountDetails',
  TRANSACTION_DETAILS: 'TransactionDetails',
  CARD_DETAILS: 'CardDetails',
  PAYMENT_CONFIRMATION: 'PaymentConfirmation',
  PI_WALLET: 'PiWallet',
  MINING: 'Mining',
  EXCHANGE: 'Exchange',
  SETTINGS: 'Settings',
} as const;

/**
 * Bottom tab navigation route names
 * Used for primary navigation tabs in the main application flow
 */
export const TAB_ROUTES = {
  DASHBOARD: 'Dashboard',
  ACCOUNTS: 'Accounts',
  PI_WALLET: 'PiWallet',
  CARDS: 'Cards',
  SETTINGS: 'Settings',
} as const;

/**
 * Modal route names
 * Used for overlay screens and popup dialogs
 */
export const MODAL_ROUTES = {
  QUICK_ACTIONS: 'QuickActions',
  NOTIFICATIONS: 'Notifications',
  HELP: 'Help',
} as const;

/**
 * Type definitions for type-safe navigation
 */
export type StackNames = typeof STACK_NAMES[keyof typeof STACK_NAMES];
export type AuthRoutes = typeof AUTH_ROUTES[keyof typeof AUTH_ROUTES];
export type MainRoutes = typeof MAIN_ROUTES[keyof typeof MAIN_ROUTES];
export type TabRoutes = typeof TAB_ROUTES[keyof typeof TAB_ROUTES];
export type ModalRoutes = typeof MODAL_ROUTES[keyof typeof MODAL_ROUTES];

/**
 * Combined route type for all possible navigation routes
 */
export type AppRoutes = AuthRoutes | MainRoutes | TabRoutes | ModalRoutes;