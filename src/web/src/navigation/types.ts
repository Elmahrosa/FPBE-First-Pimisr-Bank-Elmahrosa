import { 
  NavigationProp, 
  RouteProp, 
  CompositeNavigationProp 
} from '@react-navigation/native'; // ^6.0.0
import { 
  BottomTabNavigationProp 
} from '@react-navigation/bottom-tabs'; // ^6.0.0

// Root level navigation constants
export const AUTH_STACK = 'Auth' as const;
export const MAIN_STACK = 'Main' as const;

// Root stack navigation parameters
export type RootStackParamList = {
  [AUTH_STACK]: undefined;
  [MAIN_STACK]: undefined;
};

// Authentication flow navigation parameters
export type AuthStackParamList = {
  Login: {
    redirectTo?: string;
  };
  Register: {
    referralCode?: string;
  };
  ForgotPassword: {
    email?: string;
  };
  BiometricSetup: {
    userId: string;
  };
  PinSetup: {
    userId: string;
    isReset?: boolean;
  };
  OnBoarding: {
    userId: string;
    isNewUser: boolean;
  };
};

// Main application navigation parameters
export type MainStackParamList = {
  Dashboard: {
    showNotification?: boolean;
  };
  AccountDetails: {
    accountId: string;
    initialTab?: 'transactions' | 'statements' | 'settings';
  };
  TransactionDetails: {
    transactionId: string;
    type: 'fiat' | 'crypto';
  };
  CardDetails: {
    cardId: string;
    showControls?: boolean;
  };
  PaymentConfirmation: {
    amount: number;
    recipientId: string;
    type: 'transfer' | 'bill' | 'qr';
    reference?: string;
  };
  PiWallet: {
    tab?: 'balance' | 'history' | 'exchange';
  };
  Mining: {
    autoStart?: boolean;
  };
  Exchange: {
    initialPair?: string;
    amount?: number;
  };
  Settings: {
    section?: 'profile' | 'security' | 'preferences';
  };
};

// Root navigation prop type
export type RootNavigationProp = NavigationProp<RootStackParamList>;

// Authentication flow navigation prop type with nesting
export type AuthNavigationProp = CompositeNavigationProp<
  NavigationProp<AuthStackParamList>,
  NavigationProp<RootStackParamList>
>;

// Main application navigation prop type with bottom tabs
export type MainNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainStackParamList>,
  NavigationProp<RootStackParamList>
>;

// Base navigation props interface
export interface NavigationProps {
  navigation: RootNavigationProp;
}

// Authentication screen props interface
export interface AuthScreenProps<T extends keyof AuthStackParamList> {
  navigation: AuthNavigationProp;
  route: RouteProp<AuthStackParamList, T>;
}

// Main application screen props interface
export interface MainScreenProps<T extends keyof MainStackParamList> {
  navigation: MainNavigationProp;
  route: RouteProp<MainStackParamList, T>;
}