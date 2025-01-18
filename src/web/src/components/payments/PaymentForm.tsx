/**
 * @fileoverview Enterprise-grade payment form component for FPBE mobile banking application
 * Implements secure transaction processing with support for traditional and Pi Network payments
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, AccessibilityInfo } from 'react-native';
import { useTheme, useAccessibilityInfo } from '@react-navigation/native';
import { useFormValidation } from 'react-hook-form'; // v7.0+
import { useCurrencyConversion } from '@pi-network/currency-utils'; // v1.0+
import { useRateLimiting } from '@pi-network/security-utils'; // v1.0+
import Input from '../common/Input';
import Button from '../common/Button';
import { AMOUNT_VALIDATION } from '../../constants/validation.constants';
import { Theme } from '../../styles/theme';
import { SPACING } from '../../styles/spacing';

/**
 * Transaction types supported by the payment form
 */
enum TransactionType {
  BANK_TRANSFER = 'BANK_TRANSFER',
  PI_TRANSFER = 'PI_TRANSFER',
  BILL_PAYMENT = 'BILL_PAYMENT'
}

/**
 * Interface defining transaction limits for different payment types
 */
interface TransactionLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  remainingDailyLimit: number;
}

/**
 * Interface for validation rules specific to payment processing
 */
interface ValidationRules {
  requireBeneficiaryName: boolean;
  requireReference: boolean;
  allowInternational: boolean;
}

/**
 * Props interface for the PaymentForm component
 */
interface PaymentFormProps {
  type: TransactionType;
  fromAccountId: string;
  currency: string;
  onSubmit: (transaction: CreateTransactionRequest) => Promise<void>;
  loading: boolean;
  limits: TransactionLimits;
  validationRules: ValidationRules;
}

/**
 * Interface for transaction request payload
 */
interface CreateTransactionRequest {
  fromAccountId: string;
  toAccountId?: string;
  beneficiaryName?: string;
  amount: number;
  currency: string;
  reference?: string;
  type: TransactionType;
  piWalletAddress?: string;
}

/**
 * Security flags for transaction validation
 */
interface SecurityFlags {
  isRateLimited: boolean;
  isAmountValid: boolean;
  isBeneficiaryValid: boolean;
  isWithinLimits: boolean;
}

/**
 * Enterprise-grade payment form component with comprehensive security features
 */
const PaymentForm: React.FC<PaymentFormProps> = ({
  type,
  fromAccountId,
  currency,
  onSubmit,
  loading,
  limits,
  validationRules
}) => {
  const theme = useTheme() as Theme;
  const { isScreenReaderEnabled } = useAccessibilityInfo();
  const { convertCurrency, loading: conversionLoading } = useCurrencyConversion();
  const { checkRateLimit } = useRateLimiting();

  // Form state
  const [amount, setAmount] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [piWalletAddress, setPiWalletAddress] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validates transaction details with comprehensive security checks
   */
  const validateTransaction = useCallback(async (): Promise<SecurityFlags> => {
    const securityFlags: SecurityFlags = {
      isRateLimited: false,
      isAmountValid: false,
      isBeneficiaryValid: false,
      isWithinLimits: false
    };

    // Check rate limiting
    securityFlags.isRateLimited = await checkRateLimit(fromAccountId);
    if (securityFlags.isRateLimited) {
      setErrors({ general: 'Too many transaction attempts. Please try again later.' });
      return securityFlags;
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < limits.minAmount || numericAmount > limits.maxAmount) {
      setErrors({ amount: `Amount must be between ${limits.minAmount} and ${limits.maxAmount}` });
      return securityFlags;
    }
    securityFlags.isAmountValid = true;

    // Validate daily limit
    if (numericAmount > limits.remainingDailyLimit) {
      setErrors({ amount: 'Amount exceeds daily transaction limit' });
      return securityFlags;
    }
    securityFlags.isWithinLimits = true;

    // Validate beneficiary details
    if (validationRules.requireBeneficiaryName && !beneficiaryName.trim()) {
      setErrors({ beneficiaryName: 'Beneficiary name is required' });
      return securityFlags;
    }

    if (type === TransactionType.PI_TRANSFER && !piWalletAddress.match(/^[A-Za-z0-9]{32,}$/)) {
      setErrors({ piWalletAddress: 'Invalid Pi wallet address' });
      return securityFlags;
    }

    securityFlags.isBeneficiaryValid = true;
    return securityFlags;
  }, [amount, beneficiaryName, piWalletAddress, limits, validationRules, fromAccountId, type]);

  /**
   * Handles form submission with security checks and rate limiting
   */
  const handleSubmit = useCallback(async () => {
    setErrors({});
    
    const securityFlags = await validateTransaction();
    if (!Object.values(securityFlags).every(flag => flag)) {
      AccessibilityInfo.announceForAccessibility('Transaction validation failed. Please check the form for errors.');
      return;
    }

    try {
      const transaction: CreateTransactionRequest = {
        fromAccountId,
        amount: parseFloat(amount),
        currency,
        type,
        reference: reference || undefined,
        beneficiaryName: beneficiaryName || undefined,
        toAccountId: type === TransactionType.BANK_TRANSFER ? accountNumber : undefined,
        piWalletAddress: type === TransactionType.PI_TRANSFER ? piWalletAddress : undefined
      };

      await onSubmit(transaction);
      
      // Reset form on success
      setAmount('');
      setBeneficiaryName('');
      setAccountNumber('');
      setReference('');
      setPiWalletAddress('');
      
      AccessibilityInfo.announceForAccessibility('Transaction submitted successfully');
    } catch (error) {
      setErrors({ general: 'Failed to process transaction. Please try again.' });
      AccessibilityInfo.announceForAccessibility('Transaction failed. Please try again.');
    }
  }, [
    fromAccountId,
    amount,
    currency,
    type,
    reference,
    beneficiaryName,
    accountNumber,
    piWalletAddress,
    onSubmit,
    validateTransaction
  ]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      accessible={true}
      accessibilityLabel="Payment form"
    >
      <Input
        value={amount}
        onChangeText={(text) => setAmount(text)}
        label="Amount"
        placeholder={`Enter amount in ${currency}`}
        error={errors.amount}
        keyboardType="decimal-pad"
        maxLength={10}
        testID="payment-amount-input"
      />

      {validationRules.requireBeneficiaryName && (
        <Input
          value={beneficiaryName}
          onChangeText={(text) => setBeneficiaryName(text)}
          label="Beneficiary Name"
          placeholder="Enter beneficiary name"
          error={errors.beneficiaryName}
          testID="payment-beneficiary-input"
        />
      )}

      {type === TransactionType.BANK_TRANSFER && (
        <Input
          value={accountNumber}
          onChangeText={(text) => setAccountNumber(text)}
          label="Account Number"
          placeholder="Enter account number"
          error={errors.accountNumber}
          testID="payment-account-input"
        />
      )}

      {type === TransactionType.PI_TRANSFER && (
        <Input
          value={piWalletAddress}
          onChangeText={(text) => setPiWalletAddress(text)}
          label="Pi Wallet Address"
          placeholder="Enter Pi wallet address"
          error={errors.piWalletAddress}
          testID="payment-pi-wallet-input"
        />
      )}

      {validationRules.requireReference && (
        <Input
          value={reference}
          onChangeText={(text) => setReference(text)}
          label="Reference"
          placeholder="Enter payment reference"
          error={errors.reference}
          testID="payment-reference-input"
        />
      )}

      {errors.general && (
        <View style={styles.errorContainer} accessible={true} accessibilityRole="alert">
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {errors.general}
          </Text>
        </View>
      )}

      <Button
        title="Submit Payment"
        onPress={handleSubmit}
        loading={loading || conversionLoading}
        disabled={loading || conversionLoading}
        variant="primary"
        fullWidth
        testID="payment-submit-button"
        accessibilityLabel="Submit payment button"
        accessibilityHint="Double tap to submit the payment"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme => theme.colors.background.primary,
  },
  contentContainer: {
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  errorContainer: {
    marginVertical: SPACING.XS,
    padding: SPACING.SM,
    backgroundColor: theme => theme.colors.error + '10',
    borderRadius: 8,
  },
  errorText: {
    fontSize: theme => theme.typography.fontSize.sm,
    fontFamily: theme => theme.typography.fontFamily.regular,
    textAlign: 'center',
  },
});

export default PaymentForm;