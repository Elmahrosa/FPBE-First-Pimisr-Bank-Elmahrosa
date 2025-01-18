/**
 * @fileoverview Transaction details component for FPBE mobile banking application
 * Displays comprehensive transaction information with Pi Network integration
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react'; // v18.0+
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native'; // v0.71+

import {
  Transaction,
  TransactionType,
  TransactionStatus,
  isPiTransaction,
} from '../../types/transaction.types';
import Button from '../common/Button';
import {
  formatCurrency,
  convertPiToFiat,
  getExchangeRate,
} from '../../utils/currency.utils';
import {
  formatTransactionDate,
  getRelativeTime,
} from '../../utils/date.utils';

interface TransactionDetailsProps {
  transaction: Transaction;
  onClose: () => void;
  onShare?: () => void;
  showActions?: boolean;
  showConversion?: boolean;
}

const getStatusColor = (status: TransactionStatus): string => {
  switch (status) {
    case TransactionStatus.COMPLETED:
    case TransactionStatus.BLOCKCHAIN_CONFIRMED:
      return '#10B981';
    case TransactionStatus.PENDING:
    case TransactionStatus.PENDING_CONFIRMATION:
    case TransactionStatus.PROCESSING:
      return '#F59E0B';
    case TransactionStatus.FAILED:
    case TransactionStatus.CANCELLED:
      return '#EF4444';
    default:
      return '#6B7280';
  }
};

const getTransactionTypeLabel = (type: TransactionType): string => {
  switch (type) {
    case TransactionType.TRANSFER:
      return 'Bank Transfer';
    case TransactionType.PAYMENT:
      return 'Payment';
    case TransactionType.BILL_PAYMENT:
      return 'Bill Payment';
    case TransactionType.QR_PAYMENT:
      return 'QR Payment';
    case TransactionType.PI_EXCHANGE:
      return 'Pi Exchange';
    case TransactionType.PI_MINING_REWARD:
      return 'Mining Reward';
    default:
      return 'Transaction';
  }
};

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  onClose,
  onShare,
  showActions = true,
  showConversion = true,
}) => {
  const [fiatEquivalent, setFiatEquivalent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFiatEquivalent = useCallback(async () => {
    if (isPiTransaction(transaction) && showConversion) {
      try {
        setIsLoading(true);
        const fiatAmount = await convertPiToFiat(transaction.amount, 'USD');
        setFiatEquivalent(fiatAmount);
      } catch (error) {
        console.error('Error converting Pi to fiat:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [transaction, showConversion]);

  useEffect(() => {
    loadFiatEquivalent();
  }, [loadFiatEquivalent]);

  const handleShare = async () => {
    if (!onShare) {
      try {
        const message = `Transaction Details:\n
Amount: ${formatCurrency(transaction.amount, transaction.currency)}
Type: ${getTransactionTypeLabel(transaction.type)}
Date: ${formatTransactionDate(transaction.createdAt)}
Status: ${transaction.status}`;

        await Share.share({
          message,
          title: 'Transaction Details',
        });
      } catch (error) {
        console.error('Error sharing transaction:', error);
      }
    } else {
      onShare();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transaction Details</Text>
        <Button
          title="Close"
          variant="outline"
          size="small"
          onPress={onClose}
          accessibilityLabel="Close transaction details"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.amount}>
          {formatCurrency(transaction.amount, transaction.currency)}
        </Text>

        <View
          style={[
            styles.status,
            { backgroundColor: `${getStatusColor(transaction.status)}20` },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(transaction.status) },
            ]}
          >
            {transaction.status}
          </Text>
        </View>

        {isPiTransaction(transaction) && showConversion && (
          <View style={styles.conversionContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#1E3A8A" />
            ) : (
              fiatEquivalent !== null && (
                <Text style={styles.conversionText}>
                  ≈ {formatCurrency(fiatEquivalent, 'USD')}
                </Text>
              )
            )}
          </View>
        )}

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Type</Text>
            <Text style={styles.value}>
              {getTransactionTypeLabel(transaction.type)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>
              {formatTransactionDate(transaction.createdAt)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>
              {getRelativeTime(transaction.createdAt)}
            </Text>
          </View>

          {transaction.description && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{transaction.description}</Text>
            </View>
          )}

          {transaction.piTransactionDetails && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Block Height</Text>
                <Text style={styles.value}>
                  {transaction.piTransactionDetails.metadata.blockHeight || 'N/A'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Confirmations</Text>
                <Text style={styles.value}>
                  {transaction.piTransactionDetails.metadata.confirmations || '0'}
                </Text>
              </View>
            </>
          )}
        </View>

        {showActions && (
          <View style={styles.actionsContainer}>
            <Button
              title="Share"
              variant="outline"
              size="medium"
              onPress={handleShare}
              accessibilityLabel="Share transaction details"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'SF Pro Display',
  },
  content: {
    paddingBottom: 24,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    fontFamily: 'SF Pro Display',
    color: '#111827',
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 24,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'SF Pro Text',
  },
  conversionContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  conversionText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'SF Pro Text',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'SF Pro Text',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    fontFamily: 'SF Pro Text',
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default TransactionDetails;