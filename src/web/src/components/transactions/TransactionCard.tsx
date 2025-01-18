import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // v6.0.0
import { Transaction, TransactionType, TransactionStatus } from '../../types/transaction.types';
import { formatCurrency } from '../../utils/currency.utils';
import { formatTransactionDate } from '../../utils/date.utils';
import { Theme } from '../../styles/theme';
import { SPACING } from '../../styles/spacing';
import { fontFamilies, fontSizes, fontWeights } from '../../styles/fonts';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  testID?: string;
}

const getStatusColor = (status: TransactionStatus, isDarkMode: boolean): string => {
  const colors = {
    [TransactionStatus.COMPLETED]: isDarkMode ? '#34D399' : '#10B981',
    [TransactionStatus.PENDING]: isDarkMode ? '#FBBF24' : '#F59E0B',
    [TransactionStatus.PROCESSING]: isDarkMode ? '#60A5FA' : '#3B82F6',
    [TransactionStatus.FAILED]: isDarkMode ? '#F87171' : '#EF4444',
    [TransactionStatus.CANCELLED]: isDarkMode ? '#9CA3AF' : '#6B7280',
    [TransactionStatus.PENDING_CONFIRMATION]: isDarkMode ? '#FBBF24' : '#F59E0B',
    [TransactionStatus.BLOCKCHAIN_CONFIRMED]: isDarkMode ? '#34D399' : '#10B981',
  };
  return colors[status] || colors[TransactionStatus.PROCESSING];
};

const getTransactionIcon = (type: TransactionType): string => {
  const icons = {
    [TransactionType.TRANSFER]: '↔️',
    [TransactionType.PAYMENT]: '💳',
    [TransactionType.BILL_PAYMENT]: '📄',
    [TransactionType.QR_PAYMENT]: '📱',
    [TransactionType.PI_EXCHANGE]: 'π',
    [TransactionType.PI_MINING_REWARD]: '⛏️',
  };
  return icons[type] || '💰';
};

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onPress,
  testID,
}) => {
  const theme = useTheme() as Theme;
  const { width } = useWindowDimensions();
  const isDarkMode = theme.colors.background === '#121212';
  const isSmallScreen = width < 375;

  const {
    type,
    amount,
    currency,
    status,
    description,
    createdAt,
  } = transaction;

  const isPiTransaction = type === TransactionType.PI_EXCHANGE || 
                         type === TransactionType.PI_MINING_REWARD;

  const styles = StyleSheet.create({
    container: {
      borderRadius: 8,
      padding: isSmallScreen ? SPACING.SM : SPACING.MD,
      marginVertical: SPACING.XS,
      backgroundColor: theme.colors.background.card,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isPiTransaction ? '#8B5CF6' : theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      flex: 1,
      marginLeft: SPACING.SM,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.XXS,
    },
    description: {
      fontFamily: fontFamilies.primary,
      fontSize: fontSizes.md,
      color: theme.colors.text.primary,
      marginBottom: SPACING.XXS,
    },
    amount: {
      fontFamily: fontFamilies.primary,
      fontWeight: fontWeights.medium,
      fontSize: fontSizes.lg,
      color: theme.colors.text.primary,
    },
    date: {
      fontFamily: fontFamilies.primary,
      fontSize: fontSizes.sm,
      color: theme.colors.text.secondary,
    },
    status: {
      paddingHorizontal: SPACING.XS,
      paddingVertical: SPACING.XXS,
      borderRadius: 4,
      backgroundColor: getStatusColor(status, isDarkMode),
    },
    statusText: {
      fontSize: fontSizes.sm,
      fontFamily: fontFamilies.primary,
      fontWeight: fontWeights.medium,
      color: '#FFFFFF',
    },
  });

  return (
    <TouchableOpacity
      onPress={() => onPress?.(transaction)}
      activeOpacity={0.7}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${description} transaction for ${formatCurrency(amount, currency)}`}
      accessibilityHint="Double tap to view transaction details"
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 20 }}>{getTransactionIcon(type)}</Text>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={styles.description} numberOfLines={1}>
              {description}
            </Text>
            <View style={styles.status}>
              <Text style={styles.statusText}>
                {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          
          <Text style={styles.amount}>
            {formatCurrency(amount, currency)}
          </Text>
          
          <Text style={styles.date}>
            {formatTransactionDate(createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TransactionCard;