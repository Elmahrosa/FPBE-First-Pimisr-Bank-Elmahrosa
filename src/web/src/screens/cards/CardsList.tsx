/**
 * @fileoverview Virtual cards list screen component for FPBE mobile banking
 * Implements secure card management with accessibility and performance optimizations
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, memo } from 'react'; // v18.0+
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  AccessibilityInfo,
  Text,
  Platform,
} from 'react-native'; // v0.71+
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import { useNavigation } from '@react-navigation/native'; // ^6.0.0
import analytics from '@segment/analytics-react-native'; // ^2.0.0

import VirtualCard from '../../components/cards/VirtualCard';
import {
  Card,
  CardStatus,
  CardControls,
  CardError,
} from '../../types/card.types';
import {
  fetchCards,
  updateCardControls,
  updateCardStatus,
} from '../../store/actions/card.actions';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';
import { COMPONENT_DIMENSIONS } from '../../styles/dimensions';

interface CardsListScreenProps {
  navigation: any;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * CardsList component for displaying and managing virtual cards
 * Implements WCAG 2.1 AA accessibility standards
 */
const CardsList = memo<CardsListScreenProps>(({
  navigation,
  accessibilityLabel = 'Virtual Cards List',
  testID = 'cards-list-screen',
}) => {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redux state selectors
  const cards = useSelector((state: any) => state.cards.items);
  const loading = useSelector((state: any) => state.cards.loading);

  // Track screen view
  useEffect(() => {
    analytics.screen('CardsList', {
      cardCount: cards.length,
    });
  }, []);

  // Initial cards fetch
  useEffect(() => {
    const loadCards = async () => {
      try {
        await dispatch(fetchCards({ page: 1, limit: 10 }));
        setError(null);
      } catch (err) {
        setError('Failed to load cards. Please try again.');
        AccessibilityInfo.announceForAccessibility('Error loading cards');
      }
    };

    loadCards();
  }, [dispatch]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    analytics.track('cards_list_refresh_initiated');

    try {
      await dispatch(fetchCards({ page: 1, limit: 10 }));
      setError(null);
      analytics.track('cards_list_refresh_success');
    } catch (err) {
      setError('Failed to refresh cards. Please try again.');
      analytics.track('cards_list_refresh_error', { error: err });
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Handle card control updates
  const handleCardControlsChange = useCallback(async (
    cardId: string,
    controls: CardControls
  ) => {
    try {
      analytics.track('card_controls_update_initiated', {
        cardId,
        controls,
      });

      await dispatch(updateCardControls({ cardId, controls }));
      AccessibilityInfo.announceForAccessibility('Card controls updated successfully');
      analytics.track('card_controls_update_success', { cardId });
    } catch (err) {
      const error = err as CardError;
      setError(error.message);
      AccessibilityInfo.announceForAccessibility('Failed to update card controls');
      analytics.track('card_controls_update_error', { cardId, error });
    }
  }, [dispatch]);

  // Handle card status updates
  const handleCardStatusChange = useCallback(async (
    cardId: string,
    status: CardStatus
  ) => {
    try {
      analytics.track('card_status_update_initiated', {
        cardId,
        status,
      });

      await dispatch(updateCardStatus({ cardId, status }));
      AccessibilityInfo.announceForAccessibility(`Card status updated to ${status}`);
      analytics.track('card_status_update_success', { cardId, status });
    } catch (err) {
      const error = err as CardError;
      setError(error.message);
      AccessibilityInfo.announceForAccessibility('Failed to update card status');
      analytics.track('card_status_update_error', { cardId, error });
    }
  }, [dispatch]);

  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text
        style={styles.emptyStateText}
        accessibilityRole="text"
      >
        No virtual cards found. Add a new card to get started.
      </Text>
    </View>
  ), []);

  // Render card item with memoization
  const renderCard = useCallback(({ item: card }: { item: Card }) => (
    <VirtualCard
      key={card.id}
      card={card}
      onControlsChange={(controls) => handleCardControlsChange(card.id, controls)}
      onStatusChange={(status) => handleCardStatusChange(card.id, status)}
      securityConfig={{
        showSensitiveData: false,
        requireAuthForControls: true,
      }}
      testID={`card-${card.id}`}
    />
  ), [handleCardControlsChange, handleCardStatusChange]);

  // Render error state
  const renderError = useCallback(() => (
    error && (
      <View
        style={styles.errorContainer}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  ), [error]);

  return (
    <View
      style={styles.container}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      {renderError()}
      
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={shared.primary}
            accessibilityLabel="Pull to refresh cards"
          />
        }
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        accessibilityRole="list"
        accessibilityHint="List of your virtual cards"
      />
    </View>
  );
});

CardsList.displayName = 'CardsList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: shared.background.primary,
  },
  listContent: {
    padding: SPACING.MD,
    paddingBottom: SPACING.XL,
  },
  separator: {
    height: SPACING.MD,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.XL,
    minHeight: COMPONENT_DIMENSIONS.CARD_HEIGHT,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: shared.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: shared.error,
    padding: SPACING.MD,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    borderRadius: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    textAlign: 'center',
  },
});

export default CardsList;