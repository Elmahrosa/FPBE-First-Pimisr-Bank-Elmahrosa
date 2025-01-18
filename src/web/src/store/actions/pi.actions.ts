/**
 * @fileoverview Redux action creators for Pi Network integration features
 * including mining operations, wallet management, and transaction handling
 * in the FPBE mobile banking application.
 * @version 2024.1
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import { logger } from '@fpbe/logger'; // ^1.0.0
import piApi from '../../api/pi.api';
import { PiState, DeviceInfo, MiningStatus, PiWallet, PiTransaction } from '../types';
import BigNumber from 'bignumber.js';

// Action type prefix for Pi Network actions
const PI_ACTIONS_PREFIX = 'pi';

// Constants for mining operations
const MINING_RETRY_ATTEMPTS = 3;
const METRICS_INTERVAL_MS = 5000;
const MAX_TRANSFER_AMOUNT = 1000000;

/**
 * Start Pi mining operation with enhanced monitoring and security
 */
export const startMining = createAsyncThunk(
    `${PI_ACTIONS_PREFIX}/startMining`,
    async (deviceInfo: DeviceInfo, { rejectWithValue }) => {
        try {
            logger.info('Starting Pi mining operation', { deviceInfo });

            const preferences = {
                maxCPU: 80, // Maximum CPU usage percentage
                networkPriority: 1 // High priority for network operations
            };

            const response = await piApi.startMining(deviceInfo, preferences);
            
            logger.info('Mining operation started successfully', {
                sessionId: response.data.sessionId,
                miningRate: response.data.miningRate
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to start mining operation', { error, deviceInfo });
            return rejectWithValue(error);
        }
    }
);

/**
 * Stop Pi mining operation with cleanup and metrics collection
 */
export const stopMining = createAsyncThunk(
    `${PI_ACTIONS_PREFIX}/stopMining`,
    async (sessionId: string, { rejectWithValue }) => {
        try {
            logger.info('Stopping Pi mining operation', { sessionId });

            const response = await piApi.stopMining(sessionId);
            
            logger.info('Mining operation stopped successfully', { sessionId });

            return response.data;
        } catch (error) {
            logger.error('Failed to stop mining operation', { error, sessionId });
            return rejectWithValue(error);
        }
    }
);

/**
 * Fetch Pi wallet information with enhanced security validation
 */
export const fetchWallet = createAsyncThunk(
    `${PI_ACTIONS_PREFIX}/fetchWallet`,
    async (_, { rejectWithValue }) => {
        try {
            logger.info('Fetching Pi wallet information');

            const response = await piApi.getWallet();
            
            logger.info('Wallet information retrieved successfully', {
                balance: response.data.balance.toString()
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to fetch wallet information', { error });
            return rejectWithValue(error);
        }
    }
);

/**
 * Transfer Pi to another wallet with comprehensive validation
 */
export const transferPi = createAsyncThunk(
    `${PI_ACTIONS_PREFIX}/transferPi`,
    async (
        params: { toAddress: string; amount: BigNumber; memo?: string },
        { rejectWithValue }
    ) => {
        try {
            // Validate transfer amount
            if (params.amount.isGreaterThan(MAX_TRANSFER_AMOUNT)) {
                throw new Error('Transfer amount exceeds maximum limit');
            }

            logger.info('Initiating Pi transfer', {
                toAddress: params.toAddress,
                amount: params.amount.toString()
            });

            const response = await piApi.transferPi(
                params.toAddress,
                params.amount,
                params.memo
            );
            
            logger.info('Pi transfer completed successfully', {
                transactionId: response.data.id
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to transfer Pi', { error, params });
            return rejectWithValue(error);
        }
    }
);

/**
 * Update mining metrics for active session
 */
export const updateMiningMetrics = createAction(
    `${PI_ACTIONS_PREFIX}/updateMiningMetrics`,
    (metrics: { sessionId: string; miningRate: number; totalMined: BigNumber }) => ({
        payload: metrics
    })
);

/**
 * Set mining status with validation
 */
export const setMiningStatus = createAction(
    `${PI_ACTIONS_PREFIX}/setMiningStatus`,
    (status: MiningStatus) => ({
        payload: status
    })
);

/**
 * Clear Pi-related errors
 */
export const clearPiError = createAction(
    `${PI_ACTIONS_PREFIX}/clearError`
);

/**
 * Reset Pi wallet state
 */
export const resetPiState = createAction(
    `${PI_ACTIONS_PREFIX}/resetState`
);

/**
 * Update wallet balance
 */
export const updateWalletBalance = createAction(
    `${PI_ACTIONS_PREFIX}/updateBalance`,
    (balance: BigNumber) => ({
        payload: balance
    })
);

/**
 * Add transaction to history
 */
export const addTransaction = createAction(
    `${PI_ACTIONS_PREFIX}/addTransaction`,
    (transaction: PiTransaction) => ({
        payload: transaction
    })
);

/**
 * Update transaction status
 */
export const updateTransactionStatus = createAction(
    `${PI_ACTIONS_PREFIX}/updateTransactionStatus`,
    (params: { transactionId: string; status: string }) => ({
        payload: params
    })
);