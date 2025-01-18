/**
 * @fileoverview Mining controls component for Pi Network integration in FPBE mobile banking
 * Implements real-time mining status updates, accessibility features, and theme-aware styling
 * @version 2024.1
 */

import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import { usePiMining } from '../../hooks/usePiMining';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';

interface MiningControlsProps {
  userId: string;
  onError?: (error: Error) => void;
}

/**
 * Mining controls component with comprehensive status display and accessibility
 */
export const MiningControls = React.memo<MiningControlsProps>(({ 
  userId,
  onError 
}) => {
  const { theme, isDarkMode } = useTheme();
  const { 
    miningSession,
    isLoading,
    error,
    startMining,
    stopMining
  } = usePiMining(userId);

  // Handle mining action with error handling
  const handleMiningAction = useCallback(async () => {
    try {
      if (miningSession?.status === 'ACTIVE') {
        await stopMining();
      } else {
        await startMining();
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [miningSession, startMining, stopMining, onError]);

  // Announce mining status changes to screen readers
  useEffect(() => {
    if (miningSession) {
      AccessibilityInfo.announceForAccessibility(
        `Mining status: ${miningSession.status}. Current rate: ${miningSession.miningRate} Pi per hour`
      );
    }
  }, [miningSession?.status, miningSession?.miningRate]);

  // Error effect handler
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary }
      ]}
      accessibilityRole="region"
      accessibilityLabel="Mining Controls"
    >
      <View style={styles.statusContainer}>
        <Text 
          style={[
            styles.statusText,
            { color: theme.colors.text.primary }
          ]}
          accessibilityRole="text"
        >
          Mining Status: {miningSession?.status || 'STOPPED'}
        </Text>
        {isLoading && (
          <LoadingSpinner 
            size="small"
            color={theme.colors.primary}
            accessibilityLabel="Mining operation in progress"
          />
        )}
      </View>

      {miningSession?.status === 'ACTIVE' && (
        <View style={styles.rateContainer}>
          <Text 
            style={[
              styles.rateText,
              { color: theme.colors.text.secondary }
            ]}
            accessibilityRole="text"
          >
            Mining Rate: {miningSession.miningRate.toFixed(2)} Pi/hour
          </Text>
        </View>
      )}

      {error && (
        <Text 
          style={[
            styles.errorText,
            { color: theme.colors.error }
          ]}
          accessibilityRole="alert"
        >
          {error.message}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        <Button
          onPress={handleMiningAction}
          title={miningSession?.status === 'ACTIVE' ? 'Stop Mining' : 'Start Mining'}
          variant={miningSession?.status === 'ACTIVE' ? 'error' : 'primary'}
          loading={isLoading}
          disabled={isLoading}
          accessibilityLabel={`${miningSession?.status === 'ACTIVE' ? 'Stop' : 'Start'} Pi mining`}
          fullWidth
        />
      </View>
    </View>
  );
});

MiningControls.displayName = 'MiningControls';

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    minHeight: 150,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
  },
  rateContainer: {
    marginTop: 8,
    minHeight: 20,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'SF-Pro-Display-Medium',
  },
  rateText: {
    fontSize: 14,
    fontFamily: 'SF-Pro-Display-Regular',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'SF-Pro-Display-Regular',
    marginTop: 8,
  },
  buttonContainer: {
    minHeight: 44,
    marginTop: 16,
  },
});

export default MiningControls;