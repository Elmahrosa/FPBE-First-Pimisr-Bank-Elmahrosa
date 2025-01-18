/**
 * @fileoverview Production-ready virtual card component for FPBE mobile banking
 * Implements secure card display with comprehensive accessibility features
 * @version 1.0.0
 */

import React, { memo, useCallback, useEffect, useState } from 'react'; // v18.0+
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // ^6.0.0
import { useAnalytics } from '@analytics/react-native'; // ^1.0.0

import { Card, CardStatus, CardSecurityConfig } from '../../types/card.types';
import CardControls from './CardControls';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';
import { COMPONENT_DIMENSIONS } from '../../styles/dimensions';

interface VirtualCardProps {
  card: Card;
  onFlip: (isFlipped: boolean) => void;
  onControlsChange: (controls: CardControls) => void;
  securityConfig: CardSecurityConfig;
  testID?: string;
}

/**
 * Securely formats card number with configurable masking
 */
const formatCardNumber = (cardNumber: string, showLast4: boolean = true): string => {
  const last4 = cardNumber.slice(-4);
  const masked = showLast4
    ? `•••• •••• •••• ${last4}`
    : '•••• •••• •••• ••••';
  return masked;
};

/**
 * Enhanced virtual card component with security features and accessibility
 */
export const VirtualCard = memo<VirtualCardProps>(({
  card,
  onFlip,
  onControlsChange,
  securityConfig,
  testID,
}) => {
  const theme = useTheme();
  const analytics = useAnalytics();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  
  // Initialize flip animation
  const flipAnimation = new Animated.Value(0);

  // Handle secure card flip with analytics
  const handleFlip = useCallback(() => {
    const newFlipState = !isFlipped;
    setIsFlipped(newFlipState);
    
    Animated.spring(flipAnimation, {
      toValue: newFlipState ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();

    // Track card interaction
    analytics.track('card_flip', {
      cardId: card.id,
      cardType: card.type,
    });

    onFlip(newFlipState);

    // Announce card flip for accessibility
    AccessibilityInfo.announceForAccessibility(
      `Card flipped to ${newFlipState ? 'back' : 'front'} side`
    );
  }, [isFlipped, card.id, card.type, analytics, onFlip]);

  // Configure card rotation interpolation
  const frontRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // Set up accessibility announcements
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Virtual ${card.type.toLowerCase()} card. ${
        card.status === CardStatus.ACTIVE ? 'Active' : 'Inactive'
      }`
    );
  }, [card.type, card.status]);

  // Get status-specific styles
  const getStatusColor = useCallback(() => {
    switch (card.status) {
      case CardStatus.ACTIVE:
        return shared.success;
      case CardStatus.BLOCKED:
      case CardStatus.CANCELLED:
        return shared.error;
      case CardStatus.SUSPENDED:
        return shared.warning;
      default:
        return theme.colors.text.secondary;
    }
  }, [card.status]);

  return (
    <View 
      style={styles.container}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Virtual ${card.type} card`}
    >
      {/* Card Front */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFront,
          { transform: [{ rotateY: frontRotation }] },
          { backgroundColor: theme.colors.background.primary }
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardType}>{card.type}</Text>
          <Text 
            style={[styles.statusText, { color: getStatusColor() }]}
            accessibilityLabel={`Card status: ${card.status.toLowerCase()}`}
          >
            {card.status}
          </Text>
        </View>

        <Text
          style={styles.cardNumber}
          accessibilityLabel={`Card number ending in ${card.cardNumber.slice(-4)}`}
        >
          {formatCardNumber(card.cardNumber, showSensitiveData)}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.label}>CARDHOLDER NAME</Text>
            <Text style={styles.value}>{card.cardholderName}</Text>
          </View>
          <View>
            <Text style={styles.label}>EXPIRES</Text>
            <Text style={styles.value}>{card.expiryDate}</Text>
          </View>
        </View>

        <Pressable
          onPress={handleFlip}
          style={styles.flipButton}
          accessibilityRole="button"
          accessibilityLabel="Flip card to see security code"
        >
          <Text style={styles.flipButtonText}>Show CVV</Text>
        </Pressable>
      </Animated.View>

      {/* Card Back */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardBack,
          { transform: [{ rotateY: backRotation }] },
          { backgroundColor: theme.colors.background.secondary }
        ]}
      >
        <View style={styles.cvvContainer}>
          <Text style={styles.label}>CVV</Text>
          <Text 
            style={styles.cvvValue}
            accessibilityLabel="Security code"
          >
            {card.cvv}
          </Text>
        </View>

        <CardControls
          cardId={card.id}
          controls={card.controls}
          onUpdate={onControlsChange}
          loading={false}
        />

        <Pressable
          onPress={handleFlip}
          style={styles.flipButton}
          accessibilityRole="button"
          accessibilityLabel="Flip card to front"
        >
          <Text style={styles.flipButtonText}>Back to Front</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

VirtualCard.displayName = 'VirtualCard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1.586,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    padding: SPACING.MD,
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    justifyContent: 'space-between',
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardType: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: shared.primary,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  cardNumber: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.medium,
    letterSpacing: 2,
    marginVertical: SPACING.MD,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: fontSizes.xs,
    color: shared.secondary,
    marginBottom: SPACING.XXS,
  },
  value: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  cvvContainer: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  cvvValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    letterSpacing: 4,
  },
  flipButton: {
    position: 'absolute',
    bottom: SPACING.MD,
    right: SPACING.MD,
    padding: SPACING.XS,
    minHeight: COMPONENT_DIMENSIONS.TOUCH_TARGET.MIN,
  },
  flipButtonText: {
    fontSize: fontSizes.sm,
    color: shared.primary,
    fontWeight: fontWeights.medium,
  },
});

export default VirtualCard;