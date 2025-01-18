import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  AccessibilityInfo
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from '../../store/store';
import { PiWallet, WalletStatus, MiningStatus } from '../../types/pi.types';
import { usePiMining } from '../../hooks/usePiMining';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import BigNumber from 'bignumber.js';
import { createTheme } from '../../styles/theme';

// Constants for component behavior
const REFRESH_INTERVAL = 15000; // 15 seconds
const MAX_RETRY_ATTEMPTS = 3;
const CACHE_DURATION = 300000; // 5 minutes

// Create theme instance
const theme = createTheme();

interface WalletDetailsProps {
  navigation: any;
  route: {
    params: {
      walletId: string;
    };
  };
}

const WalletDetails: React.FC<WalletDetailsProps> = React.memo(({ navigation, route }) => {
  // State management
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [offlineData, setOfflineData] = useState<PiWallet | null>(null);

  // Refs for tracking component lifecycle
  const refreshInterval = useRef<NodeJS.Timeout>();
  const retryCount = useRef(0);

  // Redux state
  const dispatch = useDispatch();
  const wallet = useSelector(state => state.pi.wallet);
  const networkStatus = useSelector(state => state.pi.networkStatus);

  // Mining hook integration
  const {
    miningSession,
    startMining,
    stopMining,
    performance: miningPerformance,
    error: miningError
  } = usePiMining();

  // Memoized wallet status
  const walletStatus = useMemo(() => {
    if (!wallet) return null;
    return {
      isActive: wallet.status === WalletStatus.ACTIVE,
      isMining: miningSession?.status === MiningStatus.ACTIVE,
      balance: new BigNumber(wallet.balance).toFixed(4),
      lastMined: new Date(wallet.lastMined).toLocaleString()
    };
  }, [wallet, miningSession]);

  // Fetch wallet data with caching and retry logic
  const fetchWalletData = useCallback(async () => {
    try {
      const networkState = await NetInfo.fetch();
      
      if (!networkState.isConnected) {
        if (offlineData) {
          return; // Use cached offline data
        }
        throw new Error('No network connection');
      }

      setIsRefreshing(true);
      const response = await fetch(`/api/v1/pi-wallet/${route.params.walletId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet data');
      }

      const data = await response.json();
      setOfflineData(data); // Cache for offline use
      setLastUpdate(new Date());
      retryCount.current = 0;
    } catch (error) {
      retryCount.current++;
      if (retryCount.current <= MAX_RETRY_ATTEMPTS) {
        setTimeout(fetchWalletData, 1000 * retryCount.current);
      }
      console.error('Wallet data fetch error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [route.params.walletId]);

  // Setup polling interval for real-time updates
  useEffect(() => {
    fetchWalletData();
    refreshInterval.current = setInterval(fetchWalletData, REFRESH_INTERVAL);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [fetchWalletData]);

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Handle mining toggle
  const handleMiningToggle = useCallback(async () => {
    try {
      if (miningSession?.status === MiningStatus.ACTIVE) {
        await stopMining();
      } else {
        await startMining();
      }
    } catch (error) {
      console.error('Mining toggle error:', error);
    }
  }, [miningSession, startMining, stopMining]);

  // Render wallet status section
  const renderWalletStatus = useMemo(() => {
    if (!walletStatus) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Wallet Status
        </Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Status: {walletStatus.isActive ? 'Active' : 'Inactive'}
          </Text>
          <Text style={styles.balanceText}>
            Balance: π{walletStatus.balance}
          </Text>
          <Text style={styles.lastMinedText}>
            Last Mined: {walletStatus.lastMined}
          </Text>
        </View>
      </View>
    );
  }, [walletStatus]);

  // Render mining controls section
  const renderMiningControls = useMemo(() => {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Mining Controls
        </Text>
        <TouchableOpacity
          style={[
            styles.miningButton,
            { backgroundColor: walletStatus?.isMining ? theme.colors.error : theme.colors.primary }
          ]}
          onPress={handleMiningToggle}
          accessibilityRole="button"
          accessibilityLabel={`${walletStatus?.isMining ? 'Stop' : 'Start'} mining`}
          accessibilityHint="Toggles Pi mining operation"
        >
          <Text style={styles.buttonText}>
            {walletStatus?.isMining ? 'Stop Mining' : 'Start Mining'}
          </Text>
        </TouchableOpacity>
        {miningSession && (
          <View style={styles.miningStats}>
            <Text style={styles.statsText}>
              Mining Rate: {miningPerformance.miningRate.toFixed(2)} Pi/hr
            </Text>
            <Text style={styles.statsText}>
              Session Duration: {formatDuration(Date.now() - new Date(miningSession.startTime).getTime())}
            </Text>
          </View>
        )}
      </View>
    );
  }, [walletStatus, miningSession, miningPerformance, handleMiningToggle]);

  return (
    <ErrorBoundary>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh wallet details"
          />
        }
      >
        {renderWalletStatus}
        {renderMiningControls}
        
        <View style={styles.section}>
          <Text style={styles.updateText}>
            Last Updated: {lastUpdate.toLocaleTimeString()}
          </Text>
          {!networkStatus.isConnected && (
            <Text style={styles.offlineText}>
              Offline Mode - Using Cached Data
            </Text>
          )}
        </View>
      </ScrollView>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary
  },
  section: {
    padding: theme.spacing.MD,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.SM
  },
  statusContainer: {
    marginVertical: theme.spacing.SM
  },
  statusText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.XS
  },
  balanceText: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginVertical: theme.spacing.SM
  },
  lastMinedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary
  },
  miningButton: {
    padding: theme.spacing.MD,
    borderRadius: theme.spacing.XS,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.SM
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium
  },
  miningStats: {
    marginTop: theme.spacing.SM,
    padding: theme.spacing.SM,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.XS
  },
  statsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginVertical: theme.spacing.XXS
  },
  updateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center'
  },
  offlineText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.semantic.feedback.warning,
    textAlign: 'center',
    marginTop: theme.spacing.XS
  }
});

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

WalletDetails.displayName = 'WalletDetails';

export default WalletDetails;