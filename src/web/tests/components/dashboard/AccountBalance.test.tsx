import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react-native';
import { useTheme } from '@react-navigation/native';
import { formatCurrency } from 'currency-formatter';
import AccountBalance from '../../src/components/dashboard/AccountBalance';
import { Account, AccountType, Currency } from '../../src/types/account.types';

// Mock navigation theme hook
jest.mock('@react-navigation/native', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      primary: '#1E3A8A',
      text: {
        primary: '#333333',
        secondary: '#666666'
      },
      error: '#EF4444',
      background: {
        secondary: '#F9FAFB'
      }
    },
    typography: {
      platform: {
        ios: {
          fontFamily: 'SF Pro Display'
        },
        android: {
          fontFamily: 'Roboto'
        }
      }
    }
  }))
}));

// Mock currency formatter
jest.mock('currency-formatter', () => ({
  formatCurrency: jest.fn((amount, currency) => {
    if (currency === 'PI') return `${amount} π`;
    return `$${amount.toFixed(2)}`;
  })
}));

// Test data
const mockFiatAccount: Account = {
  id: 'test-fiat-id',
  userId: 'test-user',
  accountType: AccountType.SAVINGS,
  balance: 1000.50,
  currency: Currency.USD,
  status: 'ACTIVE',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

const mockPiAccount: Account = {
  id: 'test-pi-id',
  userId: 'test-user',
  accountType: AccountType.CRYPTOCURRENCY,
  balance: 100.0,
  currency: Currency.PI,
  status: 'ACTIVE',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

describe('AccountBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render fiat balance correctly', () => {
      const { getByText, getByRole } = render(
        <AccountBalance account={mockFiatAccount} />
      );

      const balance = getByText('$1000.50');
      expect(balance).toBeTruthy();
      expect(getByRole('text')).toHaveAccessibleLabel(
        'savings account balance $1000.50'
      );
    });

    it('should render Pi balance correctly', () => {
      const { getByText, getByRole } = render(
        <AccountBalance account={mockPiAccount} />
      );

      const balance = getByText('100 π');
      expect(balance).toBeTruthy();
      expect(getByRole('text')).toHaveAccessibleLabel(
        'cryptocurrency account balance 100 π'
      );
    });

    it('should render loading state correctly', () => {
      const { getByLabelText } = render(
        <AccountBalance account={mockFiatAccount} isLoading={true} />
      );

      expect(getByLabelText('Loading account balance')).toBeTruthy();
    });

    it('should render error state correctly', () => {
      const error = new Error('Failed to load balance');
      const { getByText } = render(
        <AccountBalance account={mockFiatAccount} error={error} />
      );

      expect(getByText('Failed to load balance')).toBeTruthy();
    });

    it('should render virtual account tag when applicable', () => {
      const virtualAccount = {
        ...mockFiatAccount,
        accountType: AccountType.VIRTUAL
      };
      const { getByText } = render(
        <AccountBalance account={virtualAccount} />
      );

      expect(getByText('Virtual Account')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should handle press events when provided', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <AccountBalance account={mockFiatAccount} onPress={onPress} />
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(mockFiatAccount);
    });

    it('should not trigger press events when loading', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <AccountBalance 
          account={mockFiatAccount} 
          onPress={onPress} 
          isLoading={true} 
        />
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not trigger press events when error exists', () => {
      const onPress = jest.fn();
      const error = new Error('Test error');
      const { getByRole } = render(
        <AccountBalance 
          account={mockFiatAccount} 
          onPress={onPress} 
          error={error} 
        />
      );

      fireEvent.press(getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('Theming', () => {
    it('should apply theme colors correctly', () => {
      const { getByText } = render(
        <AccountBalance account={mockFiatAccount} />
      );

      const balance = getByText('$1000.50');
      expect(balance).toHaveStyle({
        color: '#333333'
      });
    });

    it('should apply error theme color for error state', () => {
      const error = new Error('Test error');
      const { getByText } = render(
        <AccountBalance account={mockFiatAccount} error={error} />
      );

      const errorText = getByText('Test error');
      expect(errorText).toHaveStyle({
        color: '#EF4444'
      });
    });

    it('should apply platform-specific font family', () => {
      const { getByText } = render(
        <AccountBalance account={mockFiatAccount} />
      );

      const balance = getByText('$1000.50');
      const expectedFontFamily = Platform.OS === 'ios' 
        ? 'SF Pro Display' 
        : 'Roboto';
      expect(balance).toHaveStyle({
        fontFamily: expectedFontFamily
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role and label for static view', () => {
      const { getByRole } = render(
        <AccountBalance account={mockFiatAccount} />
      );

      const container = getByRole('text');
      expect(container).toHaveAccessibleLabel(
        'savings account balance $1000.50'
      );
    });

    it('should have correct accessibility role and label for pressable view', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <AccountBalance account={mockFiatAccount} onPress={onPress} />
      );

      const button = getByRole('button');
      expect(button).toHaveAccessibleLabel(
        'savings account balance $1000.50'
      );
    });

    it('should indicate busy state when loading', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <AccountBalance 
          account={mockFiatAccount} 
          onPress={onPress} 
          isLoading={true} 
        />
      );

      expect(getByRole('button')).toHaveAccessibleState({ busy: true });
    });
  });
});