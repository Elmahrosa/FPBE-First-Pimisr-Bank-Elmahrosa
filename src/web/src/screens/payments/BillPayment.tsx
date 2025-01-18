/**
 * @fileoverview Bill Payment screen component for FPBE mobile banking application
 * Implements secure payment processing with validation, accessibility, and offline support
 * @version 2024.1
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, AccessibilityInfo } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNetworkStatus } from '@react-native-community/netinfo';
import analytics from '../services/analytics.service';
import { createApiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import { AMOUNT_VALIDATION } from '../constants/validation.constants';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../styles/theme';

// Component imports
import PaymentForm from '../../components/payments/PaymentForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Types
import { TransactionType } from '../../types/account.types';
import { ApiError } from '../../types/api.types';

interface BillPaymentScreenProps {
  navigation: any;
  route: any;
}

/**
 * Enhanced Bill Payment screen component with comprehensive security and accessibility
 */
const BillPayment: React.FC<BillPaymentScreenProps> = React.memo(({ navigation, route }) => {
  // Hooks and state
  const { theme } = useTheme();
  const { isConnected } = useNetworkStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useMemo(() => createApiClient(), []);

  // Transaction limits from route params or defaults
  const transactionLimits = useMemo(() => ({
    minAmount: route.params?.minAmount || AMOUNT_VALIDATION.MIN_AMOUNT,
    maxAmount: route.params?.maxAmount || AMOUNT_VALIDATION.MAX_AMOUNT,
    dailyLimit: route.params?.dailyLimit || 10000,
    remainingDailyLimit: route.params?.remainingDailyLimit || 10000
  }), [route.params]);

  // Validation rules
  const validationRules = useMemo(() => ({
    requireBeneficiaryName: true,
    requireReference: true,
    allowInternational: false
  }), []);

  /**
   * Handles bill payment submission with comprehensive validation
   */
  const handlePaymentSubmit = useCallback(async (transaction: any) => {
    try {
      setLoading(true);
      setError(null);

      // Track analytics event
      analytics.trackEvent(EVENT_TYPES.TRANSACTION, {
        type: 'BILL_PAYMENT',
        amount: transaction.amount,
        currency: transaction.currency
      });

      // Verify network connectivity
      if (!isConnected) {
        throw new Error('Please check your internet connection');
      }

      // Process payment
      const response = await apiClient.post(
        API_ENDPOINTS.TRANSACTION.CREATE,
        {
          ...transaction,
          type: TransactionType.BILL_PAYMENT
        }
      );

      // Announce success to screen readers
      AccessibilityInfo.announceForAccessibility('Payment processed successfully');

      // Navigate to confirmation screen
      navigation.navigate('PaymentConfirmation', {
        transactionId: response.data.id,
        amount: transaction.amount,
        beneficiary: transaction.beneficiaryName
      });

    } catch (error) {
      const errorMessage = error instanceof ApiError 
        ? error.message 
        : 'Failed to process payment. Please try again.';
      
      setError(errorMessage);
      
      // Track error
      analytics.trackError('BILL_PAYMENT_ERROR', {
        error: errorMessage,
        transaction
      });

      // Announce error to screen readers
      AccessibilityInfo.announceForAccessibility(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiClient, isConnected, navigation]);

  // Track screen view
  useEffect(() => {
    analytics.trackScreen('BillPayment');
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessible={true}
      accessibilityLabel="Bill Payment Screen"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Pay Bills
        </Text>
      </View>

      {error && (
        <View 
          style={styles.errorContainer}
          accessible={true}
          accessibilityRole="alert"
        >
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <LoadingSpinner 
          size="large"
          accessibilityLabel="Processing payment"
        />
      ) : (
        <PaymentForm
          type={TransactionType.BILL_PAYMENT}
          fromAccountId={route.params?.accountId}
          currency={route.params?.currency || 'USD'}
          onSubmit={handlePaymentSubmit}
          loading={loading}
          limits={transactionLimits}
          validationRules={validationRules}
        />
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme => theme.colors.background.primary
  },
  contentContainer: {
    padding: theme => theme.spacing.MD,
    gap: theme => theme.spacing.SM
  },
  header: {
    marginBottom: theme => theme.spacing.MD
  },
  title: {
    fontSize: theme => theme.typography.fontSize.xl,
    fontFamily: theme => theme.typography.families.primary,
    fontWeight: theme => theme.typography.weights.bold
  },
  errorContainer: {
    backgroundColor: theme => `${theme.colors.semantic.feedback.error}20`,
    padding: theme => theme.spacing.SM,
    borderRadius: 8,
    marginBottom: theme => theme.spacing.MD
  },
  errorText: {
    color: theme => theme.colors.semantic.feedback.error,
    fontSize: theme => theme.typography.fontSize.sm,
    fontFamily: theme => theme.typography.families.primary,
    textAlign: 'center'
  }
});

// Optimize re-renders
BillPayment.displayName = 'BillPayment';

export default BillPayment;