import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Animated,
  Platform
} from 'react-native';
import { debounce } from 'lodash'; // v4.17.21
import analytics from '@react-native-firebase/analytics'; // v18.0.0

// Internal imports
import TransactionCard from '../transactions/TransactionCard';
import {
  PiTransaction,
  TransactionType,
  TransactionStatus,
  TransactionMetadata
} from '../../types/pi.types';
import { piApi } from '../../api/pi.api';
import { useTheme, ThemeColors } from '../../styles/theme';
import ErrorBoundary from '../common/ErrorBoundary';

interface TransactionHistoryProps {
  walletId: string;
  onTransactionPress?: (transaction: PiTransaction) => void;
  style?: StyleProp<ViewStyle>;
  filter?: TransactionType[];
  sortOrder?: 'asc' | 'desc';
}

interface TransactionGroup {
  date: string;
  transactions: PiTransaction[];
}

const ITEMS_PER_PAGE = 20;
const SCROLL_THRESHOLD = 0.8;

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  walletId,
  onTransactionPress,
  style,
  filter,
  sortOrder = 'desc'
}) => {
  // State management
  const [transactions, setTransactions] = useState<PiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const subscriptionRef = useRef<any>(null);

  // Theme
  const theme = useTheme();

  // Memoized transaction groups
  const groupedTransactions = useMemo(() => {
    return transactions.reduce((groups: TransactionGroup[], transaction) => {
      const date = new Date(transaction.createdAt).toLocaleDateString();
      const existingGroup = groups.find(group => group.date === date);
      
      if (existingGroup) {
        existingGroup.transactions.push(transaction);
      } else {
        groups.push({ date, transactions: [transaction] });
      }
      
      return groups;
    }, []);
  }, [transactions]);

  // Fetch transactions with debounce
  const fetchTransactions = useCallback(
    debounce(async (pageNum: number, refresh: boolean = false) => {
      try {
        setLoading(true);
        
        // Track analytics event
        await analytics().logEvent('fetch_pi_transactions', {
          walletId,
          page: pageNum,
          filter: filter?.join(','),
          sortOrder
        });

        const response = await piApi.getTransactionHistory(pageNum, ITEMS_PER_PAGE);
        const newTransactions = response.data.data;

        // Apply filters if specified
        const filteredTransactions = filter
          ? newTransactions.filter(tx => filter.includes(tx.type))
          : newTransactions;

        // Sort transactions
        const sortedTransactions = filteredTransactions.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        setTransactions(prev => 
          refresh ? sortedTransactions : [...prev, ...sortedTransactions]
        );
        setHasMore(sortedTransactions.length === ITEMS_PER_PAGE);
        setError(null);

      } catch (err) {
        setError('Failed to load transactions. Please try again.');
        await analytics().logEvent('transaction_fetch_error', {
          error: err.message,
          walletId
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, 300),
    [walletId, filter, sortOrder]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        subscriptionRef.current = await piApi.subscribeToTransactionUpdates(
          walletId,
          (updatedTransaction: PiTransaction) => {
            setTransactions(prev => {
              const index = prev.findIndex(tx => tx.id === updatedTransaction.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = updatedTransaction;
                return updated;
              }
              return [updatedTransaction, ...prev];
            });
          }
        );
      } catch (err) {
        console.error('Failed to setup transaction subscription:', err);
      }
    };

    setupSubscription();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [walletId]);

  // Initial load and refresh handler
  useEffect(() => {
    fetchTransactions(0, true);
  }, [fetchTransactions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    fetchTransactions(0, true);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage);
    }
  }, [loading, hasMore, page, fetchTransactions]);

  const renderTransaction = useCallback(({ item }: { item: PiTransaction }) => (
    <TransactionCard
      transaction={item}
      onPress={() => onTransactionPress?.(item)}
      testID={`transaction-${item.id}`}
    />
  ), [onTransactionPress]);

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator
          color={theme.colors.primary}
          size="large"
          testID="loading-indicator"
        />
      </View>
    );
  }, [loading, theme]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
        No transactions found
      </Text>
    </View>
  ), [theme]);

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: theme.colors.semantic.error }]}>
        {error}
      </Text>
    </View>
  ), [error, theme]);

  return (
    <ErrorBoundary>
      <View style={[styles.container, style]}>
        <FlatList
          ref={flatListRef}
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={SCROLL_THRESHOLD}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListFooterComponent={renderFooter}
          ListEmptyComponent={error ? renderError : renderEmpty}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          testID="transaction-list"
          accessible={true}
          accessibilityLabel="Transaction history list"
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center'
  }
});

export default TransactionHistory;