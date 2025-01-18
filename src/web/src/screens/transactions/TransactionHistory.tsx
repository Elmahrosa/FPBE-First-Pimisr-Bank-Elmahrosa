/**
 * @fileoverview Transaction history screen component for FPBE mobile banking application
 * Displays paginated list of financial transactions with filtering capabilities and
 * enhanced accessibility features.
 * @version 2024.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../types/transaction.types';
import TransactionCard from '../../components/transactions/TransactionCard';
import { getAccountTransactions } from '../../api/transaction.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Constants for pagination and performance
const ITEMS_PER_PAGE = 20;
const LOADING_THRESHOLD = 0.8;
const DEBOUNCE_DELAY = 300;

interface TransactionFilter {
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}

interface TransactionHistoryScreenProps {
  route: {
    params: {
      accountId: string;
      initialFilter?: TransactionFilter;
    };
  };
}

interface TransactionHistoryState {
  transactions: Transaction[];
  loading: boolean;
  refreshing: boolean;
  nextPageToken?: string;
  hasMoreData: boolean;
  error: Error | null;
  filter: TransactionFilter;
}

const TransactionHistory: React.FC<TransactionHistoryScreenProps> = ({ route }) => {
  const { accountId, initialFilter } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();

  // State management
  const [state, setState] = useState<TransactionHistoryState>({
    transactions: [],
    loading: true,
    refreshing: false,
    nextPageToken: undefined,
    hasMoreData: true,
    error: null,
    filter: initialFilter || {},
  });

  /**
   * Loads transaction history with pagination and error handling
   */
  const loadTransactions = useCallback(async (
    refresh: boolean = false,
    filter: TransactionFilter = state.filter
  ) => {
    try {
      if (!refresh && state.loading) return;

      setState(prev => ({
        ...prev,
        loading: !refresh && !prev.refreshing,
      }));

      const response = await getAccountTransactions(accountId, {
        pageSize: ITEMS_PER_PAGE,
        pageToken: refresh ? undefined : state.nextPageToken,
        ...filter,
      });

      setState(prev => ({
        ...prev,
        transactions: refresh 
          ? response.transactions 
          : [...prev.transactions, ...response.transactions],
        nextPageToken: response.nextPageToken,
        hasMoreData: !!response.nextPageToken,
        loading: false,
        refreshing: false,
        error: null,
      }));

      // Announce completion to screen readers
      AccessibilityInfo.announceForAccessibility(
        refresh 
          ? 'Transactions refreshed' 
          : 'Additional transactions loaded'
      );
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error as Error,
      }));

      // Announce error to screen readers
      AccessibilityInfo.announceForAccessibility(
        'Error loading transactions. Please try again.'
      );
    }
  }, [accountId, state.nextPageToken, state.filter]);

  /**
   * Handles pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    AccessibilityInfo.announceForAccessibility('Refreshing transactions');
    setState(prev => ({ ...prev, refreshing: true }));
    await loadTransactions(true);
  }, [loadTransactions]);

  /**
   * Handles infinite scroll pagination with performance optimization
   */
  const handleLoadMore = useCallback(() => {
    if (!state.hasMoreData || state.loading) return;
    loadTransactions(false);
  }, [state.hasMoreData, state.loading, loadTransactions]);

  /**
   * Handles transaction item press with navigation
   */
  const handleTransactionPress = useCallback((transaction: Transaction) => {
    navigation.navigate('TransactionDetails', { transaction });
  }, [navigation]);

  /**
   * Memoized render item function for FlatList
   */
  const renderTransaction = useCallback(({ item }: { item: Transaction }) => (
    <TransactionCard
      transaction={item}
      onPress={handleTransactionPress}
      testID={`transaction-${item.id}`}
    />
  ), [handleTransactionPress]);

  /**
   * Memoized key extractor for FlatList
   */
  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  // Initial load
  useEffect(() => {
    loadTransactions(true);
  }, []);

  // Filter change handler
  useEffect(() => {
    if (initialFilter) {
      setState(prev => ({ ...prev, filter: initialFilter }));
      loadTransactions(true, initialFilter);
    }
  }, [initialFilter]);

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <FlatList
          data={state.transactions}
          renderItem={renderTransaction}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.semantic.action.primary}
              accessibilityLabel="Pull to refresh transactions"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={LOADING_THRESHOLD}
          ListEmptyComponent={
            !state.loading && (
              <View style={styles.emptyContainer}>
                <Text 
                  style={[styles.emptyText, { color: theme.colors.text.secondary }]}
                  accessibilityRole="text"
                >
                  No transactions found
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            state.loading && !state.refreshing ? (
              <LoadingSpinner size="medium" testID="transactions-loading" />
            ) : null
          }
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          accessibilityRole="list"
          accessibilityLabel="Transaction history list"
          testID="transaction-list"
        />
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default TransactionHistory;