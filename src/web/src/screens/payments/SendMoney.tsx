/**
 * @fileoverview SendMoney screen component for FPBE mobile banking application
 * Implements secure money transfer functionality with support for both fiat and Pi cryptocurrency
 * @version 2024.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, AccessibilityInfo } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { useSecurityContext } from '@pi-network/security-context';
import LoadingOverlay from '@react-native-loading-overlay';

// Internal imports
import PaymentForm from '../../components/payments/PaymentForm';
import { createTransaction } from '../../api/transaction.api';
import { useAuth } from '../../hooks/useAuth';

// Types
import { TransactionType, TransactionStatus } from '../../types/transaction.types';
import { Theme } from '../../styles/theme';
import { AMOUNT_VALIDATION } from '../../constants/validation.constants';

/**
 * SendMoney screen component with comprehensive security and validation
 */
const SendMoney: React.FC = () => {
  const theme = useTheme() as Theme;
  const navigation = useNavigation();
  const route = useRoute();
  const { user, validateSession } = useAuth();
  const securityContext = useSecurityContext();

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate user session on mount
  useEffect(() => {
    const validateUserSession = async () => {
      const isValid = await validateSession();
      if (!isValid) {
        navigation.navigate('Login');
      }
    };
    validateUserSession();
  }, []);

  /**
   * Handles secure money transfer with comprehensive validation
   * @param transactionRequest Transaction request details
   */
  const handleSendMoney = useCallback(async (transactionRequest: CreateTransactionRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Security validation
      if (!user?.id || !securityContext.isDeviceVerified()) {
        throw new Error('Security validation failed');
      }

      // Transaction validation
      if (transactionRequest.amount > AMOUNT_VALIDATION.MAX_AMOUNT) {
        throw new Error(`Amount exceeds maximum limit of ${AMOUNT_VALIDATION.MAX_AMOUNT}`);
      }

      // Sign transaction with security context
      const signedRequest = await securityContext.signTransaction({
        ...transactionRequest,
        userId: user.id,
        deviceId: securityContext.deviceId,
        timestamp: new Date().toISOString()
      });

      // Create transaction
      const transaction = await createTransaction(signedRequest);

      // Handle success
      if (transaction.status === TransactionStatus.COMPLETED) {
        AccessibilityInfo.announceForAccessibility('Transaction completed successfully');
        navigation.navigate('TransactionSuccess', { transactionId: transaction.id });
      } else {
        // Monitor pending transactions
        navigation.navigate('TransactionPending', { transactionId: transaction.id });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      AccessibilityInfo.announceForAccessibility(`Transaction failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user, securityContext, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content} accessible={true} accessibilityRole="main">
        <PaymentForm
          type={TransactionType.TRANSFER}
          fromAccountId={user?.id || ''}
          currency="USD"
          onSubmit={handleSendMoney}
          loading={loading}
          limits={{
            minAmount: AMOUNT_VALIDATION.MIN_AMOUNT,
            maxAmount: AMOUNT_VALIDATION.MAX_AMOUNT,
            dailyLimit: 50000,
            remainingDailyLimit: 50000
          }}
          validationRules={{
            requireBeneficiaryName: true,
            requireReference: true,
            allowInternational: true
          }}
        />

        {error && (
          <View 
            style={styles.errorContainer}
            accessible={true}
            accessibilityRole="alert"
          >
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {loading && (
          <LoadingOverlay
            visible={true}
            accessibilityLabel="Processing transaction"
            textContent="Processing your transaction..."
            textStyle={styles.loadingText}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme => theme.colors.background.primary,
    accessibilityRole: 'main'
  },
  content: {
    padding: 16,
    flex: 1
  },
  errorContainer: {
    padding: 16,
    backgroundColor: theme => `${theme.colors.error}10`,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    fontSize: theme => theme.typography.fontSize.sm,
    fontFamily: theme => theme.typography.fontFamily.regular,
    textAlign: 'center'
  },
  loadingText: {
    fontSize: theme => theme.typography.fontSize.md,
    fontFamily: theme => theme.typography.fontFamily.regular,
    color: theme => theme.colors.text.primary
  }
});

export default SendMoney;