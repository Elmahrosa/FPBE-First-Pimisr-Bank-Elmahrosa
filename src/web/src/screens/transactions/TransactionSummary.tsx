/**
 * @fileoverview Transaction Summary Screen Component
 * Displays comprehensive transaction details with real-time updates and accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'; // v18.0+
import { View, Text, StyleSheet, ActivityIndicator, AccessibilityInfo } from 'react-native'; // v0.71+
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native'; // ^6.0.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import { 
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionMetrics,
  isPiTransaction,
  isFinalStatus
} from '../../types/transaction.types';

// Security and monitoring interfaces
interface SecurityStatus {
  verified: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastChecked: Date;
}

interface TransactionMetrics {
  processingTime: number;
  confirmationBlocks?: number;
  networkLatency: number;
  retryCount: number;
}

interface TransactionSummaryProps {
  route: RouteProp<RootStackParamList, 'TransactionSummary'>;
  navigation: NavigationProp<RootStackParamList>;
}

interface TransactionSummaryState {
  transaction: Transaction | null;
  loading: boolean;
  error: string | null;
  metrics: TransactionMetrics;
  securityStatus: SecurityStatus;
}

/**
 * Custom hook for managing transaction details with monitoring
 * @param transactionId - Transaction identifier
 */
const useTransactionDetails = (transactionId: string) => {
  const [state, setState] = useState<TransactionSummaryState>({
    transaction: null,
    loading: true,
    error: null,
    metrics: {
      processingTime: 0,
      networkLatency: 0,
      retryCount: 0
    },
    securityStatus: {
      verified: false,
      riskLevel: 'LOW',
      lastChecked: new Date()
    }
  });

  const dispatch = useDispatch();

  const fetchTransactionDetails = useCallback(async () => {
    try {
      const startTime = performance.now();
      const response = await dispatch(getTransactionThunk(transactionId));
      const endTime = performance.now();

      setState(prev => ({
        ...prev,
        transaction: response.payload,
        loading: false,
        metrics: {
          ...prev.metrics,
          processingTime: endTime - startTime,
          networkLatency: response.meta?.networkLatency || 0
        }
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [transactionId, dispatch]);

  useEffect(() => {
    fetchTransactionDetails();
  }, [fetchTransactionDetails]);

  return state;
};

/**
 * Transaction Summary Screen Component
 * Displays detailed transaction information with accessibility support
 */
const TransactionSummary: React.FC<TransactionSummaryProps> = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { transactionId } = route.params;

  const {
    transaction,
    loading,
    error,
    metrics,
    securityStatus
  } = useTransactionDetails(transactionId);

  // Set up accessibility announcements for status changes
  useEffect(() => {
    if (transaction?.status) {
      AccessibilityInfo.announce(
        `Transaction status: ${transaction.status.toLowerCase()}`
      );
    }
  }, [transaction?.status]);

  // Monitor real-time updates for Pi transactions
  useFocusEffect(
    useCallback(() => {
      let statusCheckInterval: NodeJS.Timeout;
      
      if (transaction && isPiTransaction(transaction) && 
          !isFinalStatus(transaction.status)) {
        statusCheckInterval = setInterval(() => {
          dispatch(checkTransactionStatusThunk(transactionId));
        }, 5000);
      }

      return () => {
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
        }
      };
    }, [transaction, transactionId])
  );

  const renderStatusIndicator = useMemo(() => {
    if (!transaction) return null;

    return (
      <View style={styles.statusIndicator}>
        <Text accessibilityRole="text">
          Status: {transaction.status}
        </Text>
        {isPiTransaction(transaction) && transaction.piTransactionDetails && (
          <Text accessibilityRole="text">
            Confirmations: {transaction.piTransactionDetails.metadata.confirmations || 0}
          </Text>
        )}
      </View>
    );
  }, [transaction]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text accessibilityRole="text">Loading transaction details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText} accessibilityRole="alert">
          Transaction not found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.transactionContainer}>
        <Text accessibilityRole="header" accessibilityLevel={1}>
          Transaction Details
        </Text>
        
        <Text accessibilityRole="text">
          Amount: {transaction.amount} {transaction.currency}
        </Text>
        
        {isPiTransaction(transaction) && (
          <Text accessibilityRole="text">
            Pi Value: {transaction.piTransactionDetails?.amount} Pi
          </Text>
        )}
        
        <Text accessibilityRole="text">
          Type: {transaction.type}
        </Text>
        
        <Text accessibilityRole="text">
          Description: {transaction.description}
        </Text>
        
        {renderStatusIndicator}
        
        <View accessibilityRole="text">
          <Text>Processing Time: {metrics.processingTime.toFixed(2)}ms</Text>
          <Text>Network Latency: {metrics.networkLatency.toFixed(2)}ms</Text>
        </View>
        
        {securityStatus.riskLevel !== 'LOW' && (
          <Text 
            style={styles.errorText} 
            accessibilityRole="alert"
          >
            Security Risk Level: {securityStatus.riskLevel}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    accessibilityRole: 'main'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    accessibilityRole: 'progressbar'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    accessibilityRole: 'alert'
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    accessibilityRole: 'text'
  },
  transactionContainer: {
    padding: 16,
    accessibilityRole: 'article'
  },
  statusIndicator: {
    marginVertical: 8,
    accessibilityRole: 'status'
  }
});

export default TransactionSummary;