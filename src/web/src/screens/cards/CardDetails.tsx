/**
 * @fileoverview CardDetails screen component for FPBE mobile banking application
 * Implements secure virtual card management with enhanced accessibility
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.0+
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
} from 'react-native'; // v0.71+
import { useDispatch, useSelector } from 'react-redux'; // ^8.0.5
import { useAccessibility } from '@react-native-aria/focus'; // ^0.2.7

import VirtualCard from '../../components/cards/VirtualCard';
import CardControls from '../../components/cards/CardControls';
import Button from '../../components/common/Button';
import { updateCardControls, updateCardStatus } from '../../store/actions/card.actions';
import { Card, CardStatus, CardControls as ICardControls } from '../../types/card.types';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';
import { COMPONENT_DIMENSIONS } from '../../styles/dimensions';

interface CardDetailsScreenProps {
  route: {
    params: {
      cardId: string;
    };
  };
  navigation: any;
}

interface CardSecurityState {
  isAuthenticated: boolean;
  cvvVisible: boolean;
  sensitiveDataTimeout: NodeJS.Timeout | null;
}

const CardDetailsScreen: React.FC<CardDetailsScreenProps> = ({ route, navigation }) => {
  const dispatch = useDispatch();
  const { cardId } = route.params;
  const { focusProps } = useAccessibility();

  // Redux state
  const card = useSelector((state: any) => 
    state.cards.items.find((c: Card) => c.id === cardId)
  );
  const loading = useSelector((state: any) => state.cards.loading);
  const error = useSelector((state: any) => state.cards.error);

  // Local state
  const [securityState, setSecurityState] = useState<CardSecurityState>({
    isAuthenticated: false,
    cvvVisible: false,
    sensitiveDataTimeout: null,
  });
  const [isFlipped, setIsFlipped] = useState(false);

  // Refs for handling component unmount
  const unmountedRef = useRef(false);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (securityState.sensitiveDataTimeout) {
        clearTimeout(securityState.sensitiveDataTimeout);
      }
    };
  }, []);

  // Handle card flip with security timeout
  const handleCardFlip = useCallback((flipped: boolean) => {
    setIsFlipped(flipped);
    if (flipped && !securityState.sensitiveDataTimeout) {
      const timeout = setTimeout(() => {
        if (!unmountedRef.current) {
          setIsFlipped(false);
          setSecurityState(prev => ({
            ...prev,
            cvvVisible: false,
            sensitiveDataTimeout: null,
          }));
        }
      }, 30000); // 30 seconds timeout for security

      setSecurityState(prev => ({
        ...prev,
        sensitiveDataTimeout: timeout,
      }));
    }
  }, [securityState.sensitiveDataTimeout]);

  // Handle card control updates
  const handleControlsUpdate = useCallback(async (controls: ICardControls) => {
    try {
      await dispatch(updateCardControls({ cardId, controls }) as any);
    } catch (error) {
      console.error('Failed to update card controls:', error);
    }
  }, [cardId, dispatch]);

  // Handle card status update
  const handleStatusUpdate = useCallback(async (status: CardStatus) => {
    try {
      await dispatch(updateCardStatus({ cardId, status }) as any);
    } catch (error) {
      console.error('Failed to update card status:', error);
    }
  }, [cardId, dispatch]);

  if (!card) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={shared.primary} />
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      {...focusProps}
      accessibilityRole="main"
      accessibilityLabel="Card Details"
    >
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Card Visualization Section */}
        <View style={styles.section}>
          <VirtualCard
            card={card}
            onFlip={handleCardFlip}
            onControlsChange={handleControlsUpdate}
            securityConfig={{
              showSensitiveData: securityState.cvvVisible,
              autoHideDelay: 30000,
            }}
            testID="virtual-card"
          />
        </View>

        {/* Card Controls Section */}
        <View 
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Card Controls"
        >
          <Text style={styles.sectionTitle}>Card Controls</Text>
          <CardControls
            cardId={card.id}
            controls={card.controls}
            onUpdate={handleControlsUpdate}
            loading={loading}
          />
        </View>

        {/* Card Status Section */}
        <View 
          style={styles.section}
          accessibilityRole="region"
          accessibilityLabel="Card Status"
        >
          <Text style={styles.sectionTitle}>Card Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Current Status: 
              <Text style={[styles.statusValue, { color: getStatusColor(card.status) }]}>
                {` ${card.status}`}
              </Text>
            </Text>
            {card.status === CardStatus.ACTIVE && (
              <Button
                title="Block Card"
                onPress={() => handleStatusUpdate(CardStatus.BLOCKED)}
                variant="error"
                size="medium"
                loading={loading}
                accessibilityLabel="Block card"
              />
            )}
            {card.status === CardStatus.BLOCKED && (
              <Button
                title="Unblock Card"
                onPress={() => handleStatusUpdate(CardStatus.ACTIVE)}
                variant="success"
                size="medium"
                loading={loading}
                accessibilityLabel="Unblock card"
              />
            )}
          </View>
        </View>

        {/* Error Display */}
        {error && (
          <View 
            style={styles.errorContainer}
            accessibilityRole="alert"
          >
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Helper function to get status-specific color
const getStatusColor = (status: CardStatus): string => {
  switch (status) {
    case CardStatus.ACTIVE:
      return shared.success;
    case CardStatus.BLOCKED:
    case CardStatus.CANCELLED:
      return shared.error;
    case CardStatus.SUSPENDED:
      return shared.warning;
    default:
      return shared.secondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.MD,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    marginBottom: SPACING.SM,
    color: '#333333',
  },
  statusContainer: {
    backgroundColor: '#F9FAFB',
    padding: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.XS,
  },
  statusText: {
    fontSize: fontSizes.md,
    marginBottom: SPACING.SM,
  },
  statusValue: {
    fontWeight: fontWeights.medium,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.MD,
    borderRadius: 8,
    marginTop: SPACING.MD,
  },
  errorText: {
    color: shared.error,
    fontSize: fontSizes.sm,
  },
});

export default CardDetailsScreen;