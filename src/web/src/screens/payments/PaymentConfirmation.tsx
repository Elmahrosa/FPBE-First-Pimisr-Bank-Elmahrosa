/**
 * @fileoverview Payment confirmation screen component for FPBE mobile banking application
 * Handles both traditional and Pi Network cryptocurrency payment confirmations
 * with real-time exchange rates and blockchain integration.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePiNetwork } from '@pi-network/sdk';

import {
  Transaction,
  TransactionType,
  TransactionStatus,
  CreateTransactionRequest,
  PiTransactionDetails,
  isPiTransaction,
} from '../../types/transaction.types';
import Button from '../../components/common/Button';
import TransactionDetails from '../../components/transactions/TransactionDetails';
import { formatCurrency, convertPiToFiat } from '../../utils/currency.utils';
import { formatTransactionDate } from '../../utils/date.utils';

interface PaymentConfirmationScreenProps {
  route: {
    params: {
      transactionRequest: CreateTransactionRequest;
      previewTransaction: Transaction;
      piTransactionDetails?: PiTransactionDetails;
    };
  };
}

const PaymentConfirmation: React.FC<PaymentConfirmationScreenProps> = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { transactionRequest, previewTransaction, piTransactionDetails } = route.params;
  const { initializeTransaction, confirmTransaction } = usePiNetwork();

  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<string>('');

  // Fetch exchange rate for Pi transactions
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (isPiTransaction(previewTransaction)) {
        try {
          const rate = await convertPiToFiat(1, 'USD');
          setExchangeRate(rate);
        } catch (error) {
          console.error('Error fetching exchange rate:', error);
        }
      }
    };

    fetchExchangeRate();
  }, [previewTransaction]);

  // Handle blockchain transaction confirmation
  const handleBlockchainConfirmation = useCallback(async () => {
    if (!piTransactionDetails) return;

    try {
      setBlockchainStatus('Initializing blockchain transaction...');
      const blockchainTx = await initializeTransaction({
        amount: previewTransaction.amount,
        recipient: transactionRequest.toAccountId,
        metadata: {
          type: TransactionType.PI_EXCHANGE,
          description: transactionRequest.description,
        },
      });

      setBlockchainStatus('Waiting for blockchain confirmation...');
      const confirmation = await confirmTransaction(blockchainTx.id);

      if (!confirmation.success) {
        throw new Error('Blockchain confirmation failed');
      }

      return confirmation;
    } catch (error) {
      console.error('Blockchain confirmation error:', error);
      throw error;
    }
  }, [piTransactionDetails, previewTransaction, transactionRequest, initializeTransaction, confirmTransaction]);

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    try {
      setIsLoading(true);

      // Validate transaction details
      if (!transactionRequest || !previewTransaction) {
        throw new Error('Invalid transaction data');
      }

      // Handle Pi Network transaction if applicable
      if (isPiTransaction(previewTransaction)) {
        const blockchainConfirmation = await handleBlockchainConfirmation();
        if (!blockchainConfirmation) {
          throw new Error('Blockchain confirmation failed');
        }
      }

      // Process payment through backend API
      const response = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionRequest),
      });

      if (!response.ok) {
        throw new Error('Payment processing failed');
      }

      // Navigate to success screen
      navigation.navigate('PaymentSuccess', {
        transaction: await response.json(),
      });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      Alert.alert(
        'Payment Failed',
        'Unable to process your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment cancellation
  const handleCancelPayment = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TransactionDetails
          transaction={previewTransaction}
          onClose={() => navigation.goBack()}
          showActions={false}
          showConversion={isPiTransaction(previewTransaction)}
        />

        {isPiTransaction(previewTransaction) && exchangeRate && (
          <View style={styles.exchangeRateContainer}>
            <Text style={styles.exchangeRateText}>
              Current Exchange Rate: 1 π = ${exchangeRate.toFixed(2)} USD
            </Text>
          </View>
        )}

        {blockchainStatus && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.statusText}>{blockchainStatus}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={handleCancelPayment}
          style={{ flex: 1, marginRight: 8 }}
          disabled={isLoading}
        />
        <Button
          title="Confirm Payment"
          variant="primary"
          onPress={handleConfirmPayment}
          style={{ flex: 1, marginLeft: 8 }}
          loading={isLoading}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  exchangeRateContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  exchangeRateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1E3A8A',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default PaymentConfirmation;