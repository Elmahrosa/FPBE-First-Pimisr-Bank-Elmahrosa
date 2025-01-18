/**
 * @fileoverview Quick Actions component for the FPBE mobile banking dashboard
 * Displays common banking operations in a responsive grid layout with accessibility support
 * @version 1.0.0
 */

import React from 'react'; // v18.0+
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native'; // v0.71+
import { useNavigation, useTheme } from '@react-navigation/native'; // v6.0+
import { Button } from '../common/Button';
import { MainNavigationProp } from '../../navigation/types';
import { Theme } from '../../styles/theme';

/**
 * Props interface for the QuickActions component
 */
interface QuickActionsProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Quick Actions component for common banking operations
 * Implements responsive grid layout and WCAG 2.1 accessibility guidelines
 */
export const QuickActions = React.memo<QuickActionsProps>(({ style }) => {
  const navigation = useNavigation<MainNavigationProp>();
  const theme = useTheme() as Theme;

  // Memoized navigation handlers
  const handleSendMoney = React.useCallback(() => {
    navigation.navigate('PaymentConfirmation', {
      amount: 0,
      recipientId: '',
      type: 'transfer'
    });
  }, [navigation]);

  const handleReceiveMoney = React.useCallback(() => {
    navigation.navigate('AccountDetails', {
      accountId: 'primary',
      initialTab: 'transactions'
    });
  }, [navigation]);

  const handlePayBills = React.useCallback(() => {
    navigation.navigate('PaymentConfirmation', {
      amount: 0,
      recipientId: '',
      type: 'bill'
    });
  }, [navigation]);

  const handlePiMining = React.useCallback(() => {
    navigation.navigate('Mining', {
      autoStart: false
    });
  }, [navigation]);

  // Container styles with RTL support
  const containerStyle = [
    styles.container,
    {
      flexDirection: theme.rtl.direction === 'rtl' ? 'row-reverse' : 'row'
    },
    style
  ];

  return (
    <View
      style={containerStyle}
      accessibilityRole="group"
      accessibilityLabel="Quick Actions"
    >
      <Button
        title="Send Money"
        onPress={handleSendMoney}
        variant="primary"
        style={[styles.actionButton, { backgroundColor: theme.colors.semantic.action.primary }]}
        accessibilityLabel="Send money to another account"
        accessibilityHint="Opens send money form"
        testID="quick-action-send"
      />

      <Button
        title="Receive Money"
        onPress={handleReceiveMoney}
        variant="secondary"
        style={[styles.actionButton, { backgroundColor: theme.colors.semantic.action.secondary }]}
        accessibilityLabel="Receive money to your account"
        accessibilityHint="Shows account details for receiving money"
        testID="quick-action-receive"
      />

      <Button
        title="Pay Bills"
        onPress={handlePayBills}
        variant="secondary"
        style={[styles.actionButton, { backgroundColor: theme.colors.semantic.action.secondary }]}
        accessibilityLabel="Pay your bills"
        accessibilityHint="Opens bill payment form"
        testID="quick-action-bills"
      />

      <Button
        title="Pi Mining"
        onPress={handlePiMining}
        variant="primary"
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        accessibilityLabel="Start Pi Network mining"
        accessibilityHint="Opens Pi mining controls"
        testID="quick-action-mining"
      />
    </View>
  );
});

// Set display name for debugging
QuickActions.displayName = 'QuickActions';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginVertical: 16,
    alignItems: 'stretch',
    gap: 12
  },
  actionButton: {
    width: '48%',
    marginBottom: 12,
    minHeight: 80,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41
  }
});

export default QuickActions;