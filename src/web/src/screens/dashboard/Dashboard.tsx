/**
 * @fileoverview Main dashboard screen component for FPBE mobile banking application
 * Displays account balances, Pi mining status, quick actions, and recent transactions
 * with enhanced real-time updates, accessibility, and error handling
 * @version 2024.1
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    StyleSheet,
    AccessibilityInfo,
    Platform,
    useWindowDimensions
} from 'react-native';
import { useDispatch, useSelector } from '../../store/store';
import { useTheme } from '../../hooks/useTheme';
import { usePerformanceMonitor } from '@react-native-performance';

// Component imports
import AccountBalance from '../../components/dashboard/AccountBalance';
import MiningStatus from '../../components/dashboard/MiningStatus';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Type imports
import { Account } from '../../types/account.types';
import { MiningStatus as MiningStatusType } from '../../types/pi.types';

interface DashboardScreenProps {
    userId: string;
    onError?: (error: Error) => void;
}

/**
 * Enhanced dashboard screen component with real-time updates and accessibility
 */
const Dashboard: React.FC<DashboardScreenProps> = React.memo(({ userId, onError }) => {
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const performance = usePerformanceMonitor();

    // Local state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Redux selectors
    const accounts = useSelector(state => state.accounts.accounts);
    const selectedAccount = useSelector(state => state.accounts.selectedAccount);
    const miningStatus = useSelector(state => state.pi.miningStatus);
    const isLoading = useSelector(state => state.accounts.loading || state.pi.loading);
    const error = useSelector(state => state.accounts.error || state.pi.error);

    /**
     * Handle dashboard refresh with performance tracking
     */
    const handleRefresh = useCallback(async () => {
        try {
            performance.startMeasurement('dashboard_refresh');
            setIsRefreshing(true);

            // Fetch latest data
            await Promise.all([
                dispatch({ type: 'accounts/fetchAccounts', payload: userId }),
                dispatch({ type: 'pi/fetchMiningStatus' })
            ]);

            setLastUpdate(new Date());
            performance.stopMeasurement('dashboard_refresh');
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setIsRefreshing(false);
        }
    }, [dispatch, userId, onError, performance]);

    /**
     * Handle mining status changes with accessibility announcements
     */
    const handleMiningStatusChange = useCallback((status: MiningStatusType) => {
        AccessibilityInfo.announceForAccessibility(
            `Mining status changed to ${status.toLowerCase()}`
        );
    }, []);

    /**
     * Initialize dashboard data
     */
    useEffect(() => {
        handleRefresh();
    }, [handleRefresh]);

    /**
     * Memoized account balance section
     */
    const accountBalanceSection = useMemo(() => (
        <ErrorBoundary>
            <View style={styles.section}>
                <AccountBalance
                    account={selectedAccount || accounts[0]}
                    isLoading={isLoading}
                    error={error}
                    style={styles.accountBalance}
                />
            </View>
        </ErrorBoundary>
    ), [selectedAccount, accounts, isLoading, error]);

    /**
     * Memoized mining status section
     */
    const miningStatusSection = useMemo(() => (
        <ErrorBoundary>
            <View style={styles.section}>
                <MiningStatus
                    userId={userId}
                    onStatusChange={handleMiningStatusChange}
                    style={styles.miningStatus}
                />
            </View>
        </ErrorBoundary>
    ), [userId, handleMiningStatusChange]);

    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner size="large" testID="dashboard-loading" />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme.colors.semantic.action.primary}
                    accessibilityLabel="Pull to refresh dashboard"
                />
            }
            testID="dashboard-screen"
            accessibilityRole="scrollView"
            accessibilityLabel="Dashboard main content"
        >
            {accountBalanceSection}
            {miningStatusSection}
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24
    },
    section: {
        marginBottom: 16
    },
    accountBalance: {
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4
            },
            android: {
                elevation: 4
            }
        })
    },
    miningStatus: {
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4
            },
            android: {
                elevation: 4
            }
        })
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});

// Set display name for debugging
Dashboard.displayName = 'Dashboard';

export default Dashboard;