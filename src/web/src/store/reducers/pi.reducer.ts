/**
 * @fileoverview Redux reducer for Pi Network integration with enhanced security validation,
 * performance monitoring, and error recovery features in the FPBE mobile banking application.
 * @version 2024.1
 */

import { createReducer } from '@reduxjs/toolkit'; // ^1.9.5
import { PiState, MiningStatus } from '../../types/pi.types';
import { startMining, stopMining, fetchWallet, transferPi, updateMiningMetrics, 
         setMiningStatus, clearPiError, resetPiState, updateWalletBalance, 
         addTransaction, updateTransactionStatus } from '../actions/pi.actions';
import BigNumber from 'bignumber.js';

// Initial state with comprehensive security and performance tracking
const INITIAL_STATE: PiState = {
    wallet: null,
    miningStatus: MiningStatus.STOPPED,
    miningRate: 0,
    activeSession: null,
    loading: false,
    error: null,
    validation: {
        isValid: true,
        errors: [],
        rules: {
            maxMiningRate: 0.25,
            minWalletBalance: 0,
            maxTransactionAmount: 1000000
        }
    },
    performanceMetrics: {
        lastUpdateTime: null,
        averageMiningRate: 0,
        networkLatency: 0,
        successfulOperations: 0,
        failedOperations: 0
    },
    networkStatus: {
        isConnected: true,
        lastSyncTime: null,
        syncStatus: 'SYNCED'
    }
};

/**
 * Enhanced Pi Network reducer with comprehensive security validation and performance monitoring
 */
export const piReducer = createReducer(INITIAL_STATE, (builder) => {
    builder
        // Handle mining start operation
        .addCase(startMining.pending, (state) => {
            state.loading = true;
            state.error = null;
            state.performanceMetrics.lastUpdateTime = new Date().toISOString();
        })
        .addCase(startMining.fulfilled, (state, action) => {
            state.loading = false;
            state.miningStatus = MiningStatus.ACTIVE;
            state.activeSession = action.payload;
            state.miningRate = action.payload.miningRate;
            state.performanceMetrics.successfulOperations++;
            state.performanceMetrics.averageMiningRate = action.payload.miningRate;
            state.networkStatus.lastSyncTime = new Date().toISOString();
        })
        .addCase(startMining.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { code: 'UNKNOWN', message: 'Mining operation failed' };
            state.performanceMetrics.failedOperations++;
            state.validation.errors.push('Mining operation failed: ' + action.error.message);
        })

        // Handle mining stop operation
        .addCase(stopMining.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(stopMining.fulfilled, (state) => {
            state.loading = false;
            state.miningStatus = MiningStatus.STOPPED;
            state.activeSession = null;
            state.miningRate = 0;
            state.performanceMetrics.successfulOperations++;
            state.networkStatus.lastSyncTime = new Date().toISOString();
        })
        .addCase(stopMining.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { code: 'UNKNOWN', message: 'Failed to stop mining' };
            state.performanceMetrics.failedOperations++;
        })

        // Handle wallet fetch operation
        .addCase(fetchWallet.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchWallet.fulfilled, (state, action) => {
            state.loading = false;
            state.wallet = action.payload;
            state.performanceMetrics.successfulOperations++;
            state.networkStatus.lastSyncTime = new Date().toISOString();
            state.validation.isValid = true;
        })
        .addCase(fetchWallet.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { code: 'UNKNOWN', message: 'Failed to fetch wallet' };
            state.performanceMetrics.failedOperations++;
        })

        // Handle Pi transfer operation
        .addCase(transferPi.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(transferPi.fulfilled, (state, action) => {
            state.loading = false;
            if (state.wallet) {
                state.wallet.balance = new BigNumber(state.wallet.balance)
                    .minus(action.payload.amount).toString();
            }
            state.performanceMetrics.successfulOperations++;
            state.networkStatus.lastSyncTime = new Date().toISOString();
        })
        .addCase(transferPi.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || { code: 'UNKNOWN', message: 'Transfer failed' };
            state.performanceMetrics.failedOperations++;
            state.validation.errors.push('Transfer failed: ' + action.error.message);
        })

        // Handle mining metrics update
        .addCase(updateMiningMetrics, (state, action) => {
            if (state.activeSession?.sessionId === action.payload.sessionId) {
                state.miningRate = action.payload.miningRate;
                state.performanceMetrics.averageMiningRate = 
                    (state.performanceMetrics.averageMiningRate + action.payload.miningRate) / 2;
                state.performanceMetrics.lastUpdateTime = new Date().toISOString();
            }
        })

        // Handle mining status updates
        .addCase(setMiningStatus, (state, action) => {
            state.miningStatus = action.payload;
            state.networkStatus.lastSyncTime = new Date().toISOString();
        })

        // Handle wallet balance updates
        .addCase(updateWalletBalance, (state, action) => {
            if (state.wallet) {
                state.wallet.balance = action.payload.toString();
                state.networkStatus.lastSyncTime = new Date().toISOString();
            }
        })

        // Handle transaction updates
        .addCase(addTransaction, (state, action) => {
            if (state.wallet) {
                state.wallet.transactions = [
                    action.payload,
                    ...(state.wallet.transactions || [])
                ];
            }
        })

        // Handle transaction status updates
        .addCase(updateTransactionStatus, (state, action) => {
            if (state.wallet?.transactions) {
                const transaction = state.wallet.transactions.find(
                    t => t.id === action.payload.transactionId
                );
                if (transaction) {
                    transaction.status = action.payload.status;
                    state.networkStatus.lastSyncTime = new Date().toISOString();
                }
            }
        })

        // Handle error clearing
        .addCase(clearPiError, (state) => {
            state.error = null;
            state.validation.errors = [];
        })

        // Handle state reset
        .addCase(resetPiState, () => INITIAL_STATE);
});

export default piReducer;