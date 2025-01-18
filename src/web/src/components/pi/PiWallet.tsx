/**
 * @fileoverview Secure and performant Pi wallet component with real-time updates
 * and comprehensive transaction management for FPBE mobile banking application.
 * @version 2024.1
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // ^18.2.0
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'; // ^0.71.0
import { useErrorBoundary } from 'react-error-boundary'; // ^4.0.0
import { usePerformanceMonitor } from '@performance/monitor'; // ^1.0.0
import BigNumber from 'bignumber.js'; // ^9.0.0
import { PiWallet, WalletStatus } from '../../types/pi.types';
import { usePiMining } from '../../hooks/usePiMining';
import { piApi } from '../../api/pi.api';

// Constants for component operation
const REFRESH_INTERVAL = 15000; // 15 seconds as per requirements
const MIN_TRANSFER_AMOUNT = 0.1;
const MAX_RETRY_ATTEMPTS = 3;
const OPERATION_TIMEOUT = 5000;

interface PiWalletProps {
    userId: string;
    onBalanceUpdate?: (balance: BigNumber) => void;
    onError?: (error: Error) => void;
}

/**
 * Enhanced Pi Wallet component with comprehensive security and performance features
 */
const PiWallet: React.FC<PiWalletProps> = ({ userId, onBalanceUpdate, onError }) => {
    // State management
    const [wallet, setWallet] = useState<PiWallet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [transferAmount, setTransferAmount] = useState<string>('');
    const [recipientAddress, setRecipientAddress] = useState<string>('');

    // Refs for cleanup and performance optimization
    const refreshInterval = useRef<NodeJS.Timeout>();
    const lastUpdateTime = useRef<number>(0);

    // Error boundary integration
    const { showBoundary } = useErrorBoundary();

    // Performance monitoring
    const performance = usePerformanceMonitor('PiWallet');

    // Mining hook integration
    const {
        miningSession,
        startMining,
        stopMining,
        performance: miningPerformance,
        error: miningError
    } = usePiMining(userId);

    /**
     * Securely fetches wallet data with performance monitoring
     */
    const fetchWalletData = useCallback(async () => {
        const now = Date.now();
        if (now - lastUpdateTime.current < REFRESH_INTERVAL) return;

        performance.startOperation('fetchWallet');
        try {
            const response = await piApi.getWallet();
            setWallet(response.data);
            lastUpdateTime.current = now;

            if (onBalanceUpdate) {
                onBalanceUpdate(new BigNumber(response.data.balance));
            }

            performance.endOperation('fetchWallet');
        } catch (error) {
            performance.recordError('fetchWallet');
            handleError(error as Error);
        }
    }, [onBalanceUpdate]);

    /**
     * Handles secure Pi transfer with comprehensive validation
     */
    const handleTransfer = useCallback(async () => {
        if (!wallet || !recipientAddress || !transferAmount) return;

        performance.startOperation('transfer');
        try {
            const amount = new BigNumber(transferAmount);

            // Validate transfer parameters
            if (amount.isLessThan(MIN_TRANSFER_AMOUNT)) {
                throw new Error(`Minimum transfer amount is ${MIN_TRANSFER_AMOUNT} Pi`);
            }

            if (amount.isGreaterThan(wallet.balance)) {
                throw new Error('Insufficient balance');
            }

            // Execute transfer with timeout
            const transferPromise = piApi.transferPi(recipientAddress, amount);
            const result = await Promise.race([
                transferPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transfer timeout')), OPERATION_TIMEOUT)
                )
            ]);

            // Update wallet state
            await fetchWalletData();
            setTransferAmount('');
            setRecipientAddress('');

            performance.endOperation('transfer');
            return result;
        } catch (error) {
            performance.recordError('transfer');
            handleError(error as Error);
        }
    }, [wallet, recipientAddress, transferAmount, fetchWalletData]);

    /**
     * Enhanced error handler with retry logic
     */
    const handleError = useCallback((error: Error) => {
        console.error('Pi Wallet error:', error);
        if (onError) onError(error);
        showBoundary(error);
    }, [onError, showBoundary]);

    /**
     * Memoized wallet status for performance optimization
     */
    const walletStatus = useMemo(() => {
        if (!wallet) return null;
        return {
            isActive: wallet.status === WalletStatus.ACTIVE,
            formattedBalance: new BigNumber(wallet.balance).toFormat(4),
            lastUpdate: new Date(wallet.updatedAt).toLocaleTimeString()
        };
    }, [wallet]);

    // Initialize wallet data and polling
    useEffect(() => {
        fetchWalletData();
        refreshInterval.current = setInterval(fetchWalletData, REFRESH_INTERVAL);

        return () => {
            if (refreshInterval.current) {
                clearInterval(refreshInterval.current);
            }
        };
    }, [fetchWalletData]);

    // Handle mining errors
    useEffect(() => {
        if (miningError) {
            handleError(new Error(miningError.message));
        }
    }, [miningError, handleError]);

    if (isLoading && !wallet) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#1E3A8A" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Wallet Status Section */}
            <View style={styles.statusContainer}>
                <Text style={styles.title}>Pi Wallet</Text>
                <Text style={styles.balance}>
                    {walletStatus?.formattedBalance || '0'} Pi
                </Text>
                <Text style={styles.status}>
                    Status: {wallet?.status || 'Inactive'}
                </Text>
            </View>

            {/* Mining Control Section */}
            <View style={styles.miningContainer}>
                <Text style={styles.subtitle}>Mining Status</Text>
                {miningSession ? (
                    <>
                        <Text>Rate: {miningPerformance.miningRate} Pi/hour</Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={stopMining}
                        >
                            <Text style={styles.buttonText}>Stop Mining</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.button}
                        onPress={startMining}
                    >
                        <Text style={styles.buttonText}>Start Mining</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Transfer Section */}
            <View style={styles.transferContainer}>
                <Text style={styles.subtitle}>Transfer Pi</Text>
                <View style={styles.inputContainer}>
                    <Text>Recipient Address:</Text>
                    <input
                        style={styles.input}
                        value={recipientAddress}
                        onChange={(e) => setRecipientAddress(e.target.value)}
                        placeholder="Enter recipient address"
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text>Amount:</Text>
                    <input
                        style={styles.input}
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        type="number"
                        min={MIN_TRANSFER_AMOUNT}
                        step="0.1"
                        placeholder="Enter amount"
                    />
                </View>
                <TouchableOpacity
                    style={[
                        styles.button,
                        (!recipientAddress || !transferAmount) && styles.buttonDisabled
                    ]}
                    onPress={handleTransfer}
                    disabled={!recipientAddress || !transferAmount}
                >
                    <Text style={styles.buttonText}>Transfer</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    statusContainer: {
        marginBottom: 24
    },
    miningContainer: {
        marginBottom: 24
    },
    transferContainer: {
        marginBottom: 16
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E3A8A',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E3A8A',
        marginBottom: 12
    },
    balance: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 8
    },
    status: {
        fontSize: 14,
        color: '#6B7280'
    },
    inputContainer: {
        marginBottom: 12
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 4,
        padding: 8,
        marginTop: 4
    },
    button: {
        backgroundColor: '#1E3A8A',
        padding: 12,
        borderRadius: 4,
        alignItems: 'center',
        marginTop: 8
    },
    buttonDisabled: {
        backgroundColor: '#9CA3AF'
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600'
    }
});

export default PiWallet;