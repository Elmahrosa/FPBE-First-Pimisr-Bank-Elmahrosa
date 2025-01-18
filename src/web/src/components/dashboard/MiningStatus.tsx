/**
 * @fileoverview Enhanced mining status component for Pi Network integration
 * Displays and manages mining status with real-time updates and performance monitoring
 * @version 2024.1
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { usePiMining } from '../../hooks/usePiMining';
import LoadingSpinner from '../common/LoadingSpinner';
import { MiningStatus } from '../../types/pi.types';

interface MiningStatusProps {
    userId: string;
    style?: ViewStyle;
    onStatusChange?: (status: MiningStatus) => void;
    pollingInterval?: number;
}

export const MiningStatus: React.FC<MiningStatusProps> = React.memo(({
    userId,
    style,
    onStatusChange,
    pollingInterval = 15000
}) => {
    const {
        miningSession,
        isLoading,
        error,
        startMining,
        stopMining,
        performance,
        networkStatus
    } = usePiMining(userId, {
        maxCPU: 80,
        networkPriority: 1,
        autoRestart: true
    });

    const lastAnnouncementRef = useRef<string>('');

    /**
     * Format mining rate with appropriate units
     */
    const formatMiningRate = useCallback((rate: number): string => {
        if (rate >= 1) {
            return `${rate.toFixed(2)} Pi/hr`;
        }
        return `${(rate * 60).toFixed(2)} Pi/min`;
    }, []);

    /**
     * Handle mining status changes with accessibility announcements
     */
    const handleStatusChange = useCallback(async (status: MiningStatus) => {
        const announcement = `Mining status changed to ${status.toLowerCase()}`;
        if (announcement !== lastAnnouncementRef.current) {
            await AccessibilityInfo.announceForAccessibility(announcement);
            lastAnnouncementRef.current = announcement;
        }
        onStatusChange?.(status);
    }, [onStatusChange]);

    /**
     * Handle mining control actions
     */
    const handleMiningControl = useCallback(async () => {
        try {
            if (miningSession?.status === MiningStatus.ACTIVE) {
                await stopMining();
                handleStatusChange(MiningStatus.STOPPED);
            } else {
                await startMining();
                handleStatusChange(MiningStatus.ACTIVE);
            }
        } catch (error) {
            console.error('Mining control error:', error);
        }
    }, [miningSession?.status, startMining, stopMining, handleStatusChange]);

    /**
     * Monitor mining status changes
     */
    useEffect(() => {
        if (miningSession?.status) {
            handleStatusChange(miningSession.status);
        }
    }, [miningSession?.status, handleStatusChange]);

    /**
     * Render mining status content
     */
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner size="medium" testID="mining-status-loading" />;
        }

        if (error) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText} accessibilityRole="alert">
                        {error.message}
                    </Text>
                </View>
            );
        }

        return (
            <>
                <Text style={styles.statusText} accessibilityRole="text">
                    Mining Status: {miningSession?.status || MiningStatus.STOPPED}
                </Text>
                
                {miningSession?.status === MiningStatus.ACTIVE && (
                    <Text style={styles.rateText} accessibilityRole="text">
                        Current Rate: {formatMiningRate(miningSession.miningRate)}
                    </Text>
                )}

                {performance && (
                    <View style={styles.metricsContainer}>
                        <Text style={styles.networkStatus}>
                            Network Status: {networkStatus?.isConnected ? 'Connected' : 'Disconnected'}
                        </Text>
                        <Text style={styles.networkStatus}>
                            Success Rate: {(performance.successRate * 100).toFixed(1)}%
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[
                        styles.controlButton,
                        miningSession?.status === MiningStatus.ACTIVE && styles.stopButton
                    ]}
                    onPress={handleMiningControl}
                    accessibilityRole="button"
                    accessibilityLabel={
                        miningSession?.status === MiningStatus.ACTIVE
                            ? 'Stop Mining'
                            : 'Start Mining'
                    }
                    accessibilityState={{ busy: isLoading }}
                    accessible={true}
                >
                    <Text style={styles.buttonText}>
                        {miningSession?.status === MiningStatus.ACTIVE ? 'Stop Mining' : 'Start Mining'}
                    </Text>
                </TouchableOpacity>
            </>
        );
    };

    return (
        <View 
            style={[styles.container, style]}
            accessibilityRole="region"
            accessibilityLabel="Mining Status Panel"
        >
            {renderContent()}
        </View>
    );
});

MiningStatus.displayName = 'MiningStatus';

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        marginVertical: 8,
        elevation: 2,
        minHeight: 150
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1E293B'
    },
    rateText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 12
    },
    metricsContainer: {
        marginVertical: 8,
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4
    },
    controlButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
        backgroundColor: '#1E3A8A',
        alignItems: 'center',
        minHeight: 44
    },
    stopButton: {
        backgroundColor: '#EF4444'
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500'
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginBottom: 8
    },
    errorContainer: {
        padding: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 4
    },
    networkStatus: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4
    }
});

export default MiningStatus;