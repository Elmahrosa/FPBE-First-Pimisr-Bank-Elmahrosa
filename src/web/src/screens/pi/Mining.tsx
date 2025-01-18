/**
 * @fileoverview Mining screen component for Pi Network integration in FPBE mobile banking
 * Implements secure mining operations with performance monitoring and real-time updates
 * @version 2024.1
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  AccessibilityInfo,
  Platform
} from 'react-native';
import analytics from '@segment/analytics-react-native';
import MiningControls from '../../components/pi/MiningControls';
import PiWallet from '../../components/pi/PiWallet';
import { usePiMining } from '../../hooks/usePiMining';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useTheme } from '../../hooks/useTheme';
import { MiningMetrics } from '../../types/pi.types';

/**
 * Enhanced mining screen component with comprehensive monitoring and security
 */
const MiningScreen: React.FC = () => {
  // Theme and state management
  const { theme } = useTheme();
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  // Mining hook with performance monitoring
  const {
    miningSession,
    isLoading,
    error,
    performance: miningMetrics,
    resetError
  } = usePiMining(localStorage.getItem('userId') || '');

  /**
   * Handles mining performance metrics tracking
   */
  const handlePerformanceMetric = useCallback((metrics: MiningMetrics) => {
    analytics.track('Mining_Performance', {
      sessionId: miningSession?.sessionId,
      miningRate: metrics.miningRate,
      cpuUsage: metrics.cpuUsage,
      networkLatency: metrics.networkLatency,
      timestamp: new Date().toISOString()
    });
  }, [miningSession]);

  /**
   * Handles mining operation errors with analytics
   */
  const handleError = useCallback((error: Error) => {
    analytics.track('Mining_Error', {
      error: error.message,
      sessionId: miningSession?.sessionId,
      timestamp: new Date().toISOString()
    });
    resetError();
  }, [miningSession, resetError]);

  // Check accessibility settings
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(
      screenReaderEnabled => setIsAccessibilityEnabled(screenReaderEnabled)
    );
  }, []);

  // Announce mining status changes to screen readers
  useEffect(() => {
    if (isAccessibilityEnabled && miningSession) {
      AccessibilityInfo.announceForAccessibility(
        `Mining status: ${miningSession.status}. Current rate: ${miningSession.miningRate} Pi per hour`
      );
    }
  }, [isAccessibilityEnabled, miningSession]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner
            size="large"
            accessibilityLabel="Loading mining status"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.contentContainer}
        contentInsetAdjustmentBehavior="automatic"
        accessibilityRole="scrollview"
      >
        <View style={styles.section}>
          <MiningControls
            userId={localStorage.getItem('userId') || ''}
            onPerformanceMetric={handlePerformanceMetric}
            onError={handleError}
          />
        </View>

        <View style={styles.section}>
          <PiWallet
            userId={localStorage.getItem('userId') || ''}
            refreshInterval={15000}
          />
        </View>

        {error && (
          <View style={styles.errorContainer} accessibilityRole="alert">
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    minHeight: '100%'
  },
  section: {
    marginBottom: 24,
    accessibilityRole: 'region'
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: '#DC2626',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto'
    }),
    fontSize: 14
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default MiningScreen;