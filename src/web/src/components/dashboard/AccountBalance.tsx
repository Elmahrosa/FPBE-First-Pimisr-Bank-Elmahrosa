/**
 * @fileoverview Account balance display component for FPBE mobile banking dashboard
 * Supports both fiat and Pi cryptocurrency balances with animations and accessibility
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
  ViewStyle
} from 'react-native';
import { useTheme } from '@react-navigation/native';

import { Account, AccountType } from '../../types/account.types';
import { formatCurrency } from '../../utils/currency.utils';
import type { Theme } from '../../styles/theme';

/**
 * Props interface for the AccountBalance component
 */
interface AccountBalanceProps {
  account: Account;
  onPress?: (account: Account) => void;
  style?: ViewStyle;
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * AccountBalance component displays the user's account balance with proper formatting
 * and accessibility features. Supports both fiat and Pi cryptocurrency balances.
 */
const AccountBalance: React.FC<AccountBalanceProps> = React.memo(({
  account,
  onPress,
  style,
  isLoading = false,
  error = null
}) => {
  const theme = useTheme() as Theme;

  // Memoized formatted balance
  const formattedBalance = useMemo(() => {
    try {
      return formatCurrency(account.balance, account.currency, {
        showSymbol: true,
        showCode: account.currency === 'PI',
        locale: Platform.select({ ios: 'en-US', android: 'en-US' })
      });
    } catch (err) {
      console.error('Error formatting balance:', err);
      return '---';
    }
  }, [account.balance, account.currency]);

  // Handle press with proper type safety
  const handlePress = useCallback(() => {
    if (onPress && !isLoading && !error) {
      onPress(account);
    }
  }, [onPress, isLoading, error, account]);

  // Accessibility label for screen readers
  const accessibilityLabel = useMemo(() => {
    const accountType = account.accountType.toLowerCase();
    return `${accountType} account balance ${formattedBalance}`;
  }, [account.accountType, formattedBalance]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator
          size="small"
          color={theme.colors.primary}
          accessibilityLabel="Loading account balance"
        />
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error.message || 'Error loading balance'}
        </Text>
      </View>
    );
  }

  // Main balance display
  const content = (
    <>
      <Text style={[styles.balanceText, { 
        color: theme.colors.text.primary,
        fontFamily: theme.typography.platform[Platform.OS].fontFamily
      }]}>
        {formattedBalance}
      </Text>
      {account.accountType === AccountType.VIRTUAL && (
        <Text style={[styles.virtualTag, { color: theme.colors.text.secondary }]}>
          Virtual Account
        </Text>
      )}
    </>
  );

  // Wrap in Pressable if onPress is provided
  if (onPress) {
    return (
      <Pressable
        style={[styles.container, style]}
        onPress={handlePress}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: isLoading }}
        android_ripple={{ color: theme.colors.background.secondary }}
      >
        {content}
      </Pressable>
    );
  }

  // Static view if no onPress handler
  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: 150,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  balanceText: {
    fontSize: 24,
    fontWeight: 'bold',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  virtualTag: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

// Export with display name for debugging
AccountBalance.displayName = 'AccountBalance';

export default AccountBalance;