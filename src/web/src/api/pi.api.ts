/**
 * @fileoverview Pi Network API client module for FPBE mobile banking application
 * Implements secure API communication for Pi Network integration features
 * @version 2024.1
 */

import axios from 'axios'; // v1.4.0
import { apiConfig, createApiClient } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';
import { MiningStatus, MiningSession, DeviceInfo, PiWallet, PiTransaction, TransactionType, WalletStatus } from '../types/pi.types';
import { ApiResponse, ApiError } from '../types/api.types';
import BigNumber from 'bignumber.js'; // v9.0.0

// API configuration constants
const API_BASE_PATH = '/api/v1/pi';
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_ATTEMPTS = 3;
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60000;

// Create API client instance with enhanced security
const apiClient = createApiClient({
    timeout: DEFAULT_TIMEOUT,
    headers: {
        'X-Pi-Network-Version': '2024.1',
        'X-Mining-Client': 'FPBE-Mobile'
    }
});

/**
 * Pi Network API client with enhanced security and monitoring features
 */
export const piApi = {
    /**
     * Initiates a new Pi mining session with enhanced validation and monitoring
     * @param deviceInfo Mining device information
     * @param preferences Mining preferences configuration
     * @returns Promise resolving to mining session details
     */
    async startMining(
        deviceInfo: DeviceInfo,
        preferences: { maxCPU: number; networkPriority: number }
    ): Promise<ApiResponse<MiningSession>> {
        try {
            const response = await apiClient.post<ApiResponse<MiningSession>>(
                `${API_ENDPOINTS.PI_WALLET.MINE}`,
                {
                    deviceInfo,
                    preferences,
                    timestamp: new Date().toISOString(),
                    clientVersion: '2024.1'
                }
            );

            // Initialize performance monitoring for the mining session
            this.initializeMiningMetrics(response.data.data.sessionId);

            return response.data;
        } catch (error) {
            console.error('Mining start failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Stops an active mining session
     * @param sessionId Active mining session identifier
     */
    async stopMining(sessionId: string): Promise<ApiResponse<void>> {
        try {
            const response = await apiClient.post<ApiResponse<void>>(
                `${API_ENDPOINTS.PI_WALLET.MINE}/stop`,
                { sessionId }
            );
            return response.data;
        } catch (error) {
            console.error('Mining stop failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Retrieves detailed mining status with real-time performance metrics
     * @param sessionId Mining session identifier
     */
    async getMiningStatus(sessionId: string): Promise<ApiResponse<MiningSession>> {
        try {
            const response = await apiClient.get<ApiResponse<MiningSession>>(
                `${API_ENDPOINTS.PI_WALLET.MINING_STATUS}/${sessionId}`
            );
            return response.data;
        } catch (error) {
            console.error('Mining status retrieval failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Retrieves Pi wallet information with enhanced security
     */
    async getWallet(): Promise<ApiResponse<PiWallet>> {
        try {
            const response = await apiClient.get<ApiResponse<PiWallet>>(
                API_ENDPOINTS.PI_WALLET.BALANCE
            );
            return response.data;
        } catch (error) {
            console.error('Wallet retrieval failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Initiates a Pi transfer with enhanced security validation
     * @param toAddress Recipient's Pi wallet address
     * @param amount Amount of Pi to transfer
     * @param memo Optional transaction memo
     */
    async transferPi(
        toAddress: string,
        amount: BigNumber,
        memo?: string
    ): Promise<ApiResponse<PiTransaction>> {
        try {
            const response = await apiClient.post<ApiResponse<PiTransaction>>(
                API_ENDPOINTS.PI_WALLET.TRANSFER,
                {
                    toAddress,
                    amount: amount.toString(),
                    memo,
                    timestamp: new Date().toISOString(),
                    type: TransactionType.TRANSFER
                }
            );
            return response.data;
        } catch (error) {
            console.error('Pi transfer failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Retrieves transaction history with pagination
     * @param page Page number
     * @param limit Items per page
     */
    async getTransactionHistory(
        page: number = 0,
        limit: number = 10
    ): Promise<ApiResponse<PiTransaction[]>> {
        try {
            const response = await apiClient.get<ApiResponse<PiTransaction[]>>(
                API_ENDPOINTS.PI_WALLET.HISTORY,
                {
                    params: { page, limit }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Transaction history retrieval failed:', error);
            throw this.handleApiError(error);
        }
    },

    /**
     * Initializes mining session performance metrics
     * @param sessionId Mining session identifier
     */
    private initializeMiningMetrics(sessionId: string): void {
        // Initialize performance monitoring
        const metrics = {
            sessionId,
            startTime: Date.now(),
            lastUpdateTime: Date.now(),
            totalMined: new BigNumber(0),
            networkDifficulty: 0,
            miningEfficiency: 0
        };

        // Store metrics for monitoring
        sessionStorage.setItem(`mining_metrics_${sessionId}`, JSON.stringify(metrics));
    },

    /**
     * Handles API errors with enhanced error information
     * @param error API error object
     */
    private handleApiError(error: any): ApiError {
        if (axios.isAxiosError(error) && error.response) {
            return {
                code: error.response.status.toString(),
                message: error.response.data.message || 'An error occurred',
                details: error.response.data,
                timestamp: new Date().toISOString(),
                requestId: error.config?.headers['X-Request-ID'] || '',
                path: error.config?.url || ''
            };
        }

        return {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
            details: {},
            timestamp: new Date().toISOString(),
            requestId: '',
            path: ''
        };
    }
};