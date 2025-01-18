import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../styles/theme';
import { Transaction, TransactionType, TransactionStatus } from '../../types/transaction.types';
import TransactionCard from '../transactions/TransactionCard';
import ErrorBoundary from '../common/ErrorBoundary';
import { fetchAccountTransactions } from '../../store/actions/transaction.actions';
import analytics from '../../services/analytics.service';

interface RecentTransactionsProps {
  accountId: string;
  limit?: number;
  onViewAll?: () => void;
  style?: StyleProp<ViewStyle>;
  refreshInterval?: number;
  showPiDetails?: boolean;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  accountId,
  limit = 5,
  onViewAll,
  style,
  refreshInterval = 30000,
  showPiDetails = true,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;

  // Redux state selectors
  const transactions = useSelector((state: RootState) => state.transactions.recentTransactions);
  const loading = useSelector((state: RootState) => state.transactions.loading);
  const error = useSelector((state: RootState) => state.transactions.error);

  // Fetch transactions with performance tracking
  const fetchTransactions = useCallback(async () => {
    const startTime = performance.now();
    try {
      await dispatch(fetchAccountTransactions({ accountId, limit }));
      const duration = performance.now() - startTime;
      
      // Track performance metrics
      if (duration > 100) {
        analytics.trackPerformance('recent_transactions_fetch', duration);
      }
    } catch (error) {
      analytics.trackError('FETCH_TRANSACTIONS_ERROR', {
        accountId,
        error: error.message,
      });
    }
  }, [accountId, limit, dispatch]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchTransactions();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchTransactions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTransactions, refreshInterval]);

  // Memoized empty state component
  const EmptyState = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Text
        style={[styles.emptyText, { color: theme.colors.text.secondary }]}
        accessibilityRole="text"
      >
        No recent transactions
      </Text>
    </View>
  ), [theme]);

  // Memoized loading skeleton
  const LoadingSkeleton = useMemo(() => (
    <View style={styles.loadingContainer}>
      {[...Array(limit)].map((_, index) => (
        <View
          key={`skeleton-${index}`}
          style={[
            styles.skeletonItem,
            {
              backgroundColor: theme.colors.background.tertiary,
              opacity: 1 - (index * 0.15),
            },
          ]}
        />
      ))}
    </View>
  ), [limit, theme]);

  // Render transaction item
  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionCard
      transaction={item}
      testID={`transaction-${item.id}`}
      onPress={() => {
        analytics.trackEvent('TRANSACTION_SELECTED', {
          transactionId: item.id,
          type: item.type,
        });
      }}
    />
  ), []);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  // Render header component
  const ListHeader = useMemo(() => (
    <View style={styles.header}>
      <Text
        style={[styles.title, { color: theme.colors.text.primary }]}
        accessibilityRole="header"
      >
        Recent Transactions
      </Text>
      {onViewAll && (
        <TouchableOpacity
          onPress={() => {
            onViewAll();
            analytics.trackEvent('VIEW_ALL_TRANSACTIONS_CLICKED');
          }}
          style={styles.viewAllButton}
          accessibilityRole="button"
          accessibilityLabel="View all transactions"
        >
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
            View All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  ), [theme, onViewAll]);

  // Error state handling
  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text
          style={[styles.errorText, { color: theme.colors.semantic.feedback.error }]}
          accessibilityRole="alert"
        >
          {error.message}
        </Text>
        <TouchableOpacity
          onPress={fetchTransactions}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry loading transactions"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, style]}>
        {loading ? (
          LoadingSkeleton
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={EmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            maxToRenderPerBatch={5}
            windowSize={3}
            removeClippedSubviews={true}
            testID="recent-transactions-list"
            accessibilityRole="list"
            accessibilityLabel="Recent transactions list"
          />
        )}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
  },
  viewAllButton: {
    padding: 8,
    minHeight: 44, // WCAG touch target size
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonItem: {
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    minHeight: 44,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default React.memo(RecentTransactions);