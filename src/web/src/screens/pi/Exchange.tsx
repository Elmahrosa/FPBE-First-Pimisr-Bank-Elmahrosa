/**
 * @fileoverview Enhanced Pi Network exchange screen component with real-time rate updates,
 * comprehensive validation, and secure transaction processing.
 * @version 2024.1
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import { PiWallet, TransactionType } from '../../types/pi.types';
import { piApi } from '../../api/pi.api';
import { PiWalletComponent } from '../../components/pi/PiWallet';

// Constants for exchange operations
const MIN_EXCHANGE_AMOUNT = 0.1;
const MAX_EXCHANGE_AMOUNT = 1000;
const EXCHANGE_FEE_PERCENTAGE = 1.5;
const RATE_REFRESH_INTERVAL = 30000;
const RATE_CACHE_DURATION = 60000;
const MAX_RETRY_ATTEMPTS = 3;
const DEBOUNCE_DELAY = 300;
const SAFETY_MARGIN_PERCENTAGE = 1.0;

interface ExchangeRateResult {
  rate: number;
  fee: number;
  total: BigNumber;
  expiryTime: number;
}

interface ExchangeResult {
  success: boolean;
  transactionId?: string;
  message: string;
}

/**
 * Enhanced Pi Network exchange screen component
 */
const Exchange: React.FC = () => {
  // State management
  const [wallet, setWallet] = useState<PiWallet | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [is2FAModalVisible, setIs2FAModalVisible] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup and optimization
  const rateUpdateInterval = useRef<NodeJS.Timeout>();
  const rateCache = useRef<Map<string, ExchangeRateResult>>(new Map());
  const lastInputTime = useRef<number>(0);

  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // Fetch wallet data and initialize rate updates
  useEffect(() => {
    if (isFocused) {
      fetchWalletData();
      startRateUpdates();
    }

    return () => {
      if (rateUpdateInterval.current) {
        clearInterval(rateUpdateInterval.current);
      }
    };
  }, [isFocused]);

  /**
   * Fetches current wallet data with error handling
   */
  const fetchWalletData = async () => {
    try {
      const response = await piApi.getWallet();
      setWallet(response.data);
    } catch (error) {
      setError('Failed to fetch wallet data');
      console.error('Wallet fetch error:', error);
    }
  };

  /**
   * Starts periodic rate updates with caching
   */
  const startRateUpdates = () => {
    if (rateUpdateInterval.current) {
      clearInterval(rateUpdateInterval.current);
    }

    rateUpdateInterval.current = setInterval(() => {
      if (amount && targetCurrency) {
        calculateExchangeRate(new BigNumber(amount), targetCurrency, true);
      }
    }, RATE_REFRESH_INTERVAL);
  };

  /**
   * Handles amount input with debouncing and validation
   */
  const handleAmountChange = (value: string) => {
    setAmount(value);
    const now = Date.now();
    lastInputTime.current = now;

    setTimeout(() => {
      if (now === lastInputTime.current && value) {
        calculateExchangeRate(new BigNumber(value), targetCurrency, false);
      }
    }, DEBOUNCE_DELAY);
  };

  /**
   * Calculates exchange rate with caching and validation
   */
  const calculateExchangeRate = async (
    piAmount: BigNumber,
    currency: string,
    forceRefresh: boolean
  ) => {
    const cacheKey = `${piAmount.toString()}_${currency}`;
    const cachedRate = rateCache.current.get(cacheKey);

    if (!forceRefresh && cachedRate && Date.now() < cachedRate.expiryTime) {
      setExchangeRate(cachedRate);
      return;
    }

    try {
      const response = await piApi.getExchangeRate(piAmount.toString(), currency);
      const rate: ExchangeRateResult = {
        rate: response.data.rate,
        fee: (piAmount.toNumber() * EXCHANGE_FEE_PERCENTAGE) / 100,
        total: piAmount.times(response.data.rate),
        expiryTime: Date.now() + RATE_CACHE_DURATION
      };

      rateCache.current.set(cacheKey, rate);
      setExchangeRate(rate);
    } catch (error) {
      setError('Failed to fetch exchange rate');
      console.error('Rate calculation error:', error);
    }
  };

  /**
   * Handles exchange execution with comprehensive validation
   */
  const handleExchange = async () => {
    if (!wallet || !amount || !exchangeRate) return;

    try {
      // Validate exchange parameters
      const piAmount = new BigNumber(amount);
      
      if (piAmount.isLessThan(MIN_EXCHANGE_AMOUNT)) {
        throw new Error(`Minimum exchange amount is ${MIN_EXCHANGE_AMOUNT} Pi`);
      }

      if (piAmount.isGreaterThan(MAX_EXCHANGE_AMOUNT)) {
        throw new Error(`Maximum exchange amount is ${MAX_EXCHANGE_AMOUNT} Pi`);
      }

      const totalWithSafetyMargin = piAmount.times(1 + SAFETY_MARGIN_PERCENTAGE / 100);
      if (totalWithSafetyMargin.isGreaterThan(wallet.balance)) {
        throw new Error('Insufficient balance');
      }

      // Show 2FA modal
      setIs2FAModalVisible(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Exchange validation failed');
    }
  };

  /**
   * Processes exchange with 2FA verification
   */
  const processExchange = async () => {
    if (!wallet || !amount || !exchangeRate || !twoFactorCode) return;

    setIsLoading(true);
    try {
      // Verify 2FA code
      await piApi.verify2FA(twoFactorCode);

      // Execute exchange
      const response = await piApi.transferPi(
        wallet.walletAddress,
        new BigNumber(amount),
        `Exchange to ${targetCurrency}`
      );

      setIs2FAModalVisible(false);
      setTwoFactorCode('');
      setAmount('');
      
      // Refresh wallet data
      await fetchWalletData();

      Alert.alert(
        'Exchange Successful',
        `Successfully exchanged ${amount} Pi to ${targetCurrency}`
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Exchange failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Wallet Component */}
      <PiWalletComponent
        balance={wallet?.balance || new BigNumber(0)}
        onRefresh={fetchWalletData}
      />

      {/* Exchange Form */}
      <View style={styles.exchangeForm}>
        <Text style={styles.title}>Exchange Pi</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount (Pi)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="Enter Pi amount"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Target Currency</Text>
          <TextInput
            style={styles.input}
            value={targetCurrency}
            onChangeText={setTargetCurrency}
            placeholder="USD"
            editable={false}
          />
        </View>

        {/* Exchange Rate Display */}
        {exchangeRate && (
          <View style={styles.rateContainer}>
            <Text style={styles.rateText}>
              Rate: 1 Pi = {exchangeRate.rate} {targetCurrency}
            </Text>
            <Text style={styles.feeText}>
              Fee: {exchangeRate.fee} Pi ({EXCHANGE_FEE_PERCENTAGE}%)
            </Text>
            <Text style={styles.totalText}>
              Total: {exchangeRate.total.toFormat(2)} {targetCurrency}
            </Text>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Exchange Button */}
        <TouchableOpacity
          style={[
            styles.exchangeButton,
            (!amount || isLoading) && styles.disabledButton
          ]}
          onPress={handleExchange}
          disabled={!amount || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Exchange Pi</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 2FA Modal */}
      <Modal
        visible={is2FAModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>2FA Verification</Text>
            <TextInput
              style={styles.input}
              value={twoFactorCode}
              onChangeText={setTwoFactorCode}
              placeholder="Enter 2FA code"
              keyboardType="number-pad"
              maxLength={6}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIs2FAModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={processExchange}
                disabled={!twoFactorCode || twoFactorCode.length !== 6}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  exchangeForm: {
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 24
  },
  inputContainer: {
    marginBottom: 16
  },
  label: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  rateContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16
  },
  rateText: {
    fontSize: 16,
    color: '#1E3A8A',
    marginBottom: 8
  },
  feeText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981'
  },
  errorText: {
    color: '#EF4444',
    marginVertical: 8
  },
  exchangeButton: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16
  },
  disabledButton: {
    backgroundColor: '#9CA3AF'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '80%'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    marginRight: 8
  },
  confirmButton: {
    backgroundColor: '#1E3A8A',
    marginLeft: 8
  }
});

export default Exchange;