import { 
  NavigationProp, 
  RouteProp, 
  CompositeNavigationProp 
} from '@react-navigation/native'; // ^6.0.0

// Root stack navigation type
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Authentication flow navigation types with security parameters
export type AuthStackParamList = {
  Login: {
    returnTo?: string;
  };
  Register: undefined;
  ForgotPassword: {
    email?: string;
  };
  BiometricSetup: {
    userId: string;
  };
  PinSetup: {
    userId: string;
    biometricEnabled: boolean;
  };
  OnBoarding: {
    userId: string;
    isNewUser: boolean;
  };
};

// Main application navigation types with comprehensive screen parameters
export type MainStackParamList = {
  Dashboard: undefined;
  AccountDetails: {
    accountId: string;
    accountType: 'savings' | 'checking' | 'investment';
  };
  TransactionDetails: {
    transactionId: string;
    type: 'fiat' | 'crypto';
  };
  CardDetails: {
    cardId: string;
    isVirtual: boolean;
  };
  PaymentConfirmation: {
    amount: number;
    recipientId: string;
    type: 'internal' | 'external' | 'pi';
    currency: string;
  };
  PiWallet: {
    walletId: string;
  };
  Mining: {
    currentRate: number;
    sessionId: string;
  };
  Exchange: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
  };
  Settings: {
    section?: 'security' | 'preferences' | 'notifications';
  };
};

// Base navigation props interface
export interface NavigationProps {
  navigation: NavigationProp<RootStackParamList>;
}

// Authentication screen props with nested navigation support
export interface AuthScreenProps<T extends keyof AuthStackParamList> {
  navigation: CompositeNavigationProp<
    NavigationProp<AuthStackParamList>,
    NavigationProp<RootStackParamList>
  >;
  route: RouteProp<AuthStackParamList, T>;
}

// Main application screen props with nested navigation support
export interface MainScreenProps<T extends keyof MainStackParamList> {
  navigation: CompositeNavigationProp<
    NavigationProp<MainStackParamList>,
    NavigationProp<RootStackParamList>
  >;
  route: RouteProp<MainStackParamList, T>;
}