/**
 * @fileoverview Core API configuration for FPBE mobile banking application
 * Implements secure API communication with Pi Network integration and performance optimizations
 * @version 2024.1
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'; // v1.4.0
import axiosRetry from 'axios-retry'; // v3.5.0
import { API_ENDPOINTS, API_HEADERS, DEFAULT_REQUEST_CONFIG } from '../constants/api.constants';
import { ApiRequestConfig, ApiError, isApiError } from '../types/api.types';

// Environment-specific configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.fpbe.com';
const API_VERSION = 'v1';
const API_TIMEOUT = 30000;
const API_MAX_RETRIES = 3;
const API_RETRY_DELAY = 1000;
const PI_NETWORK_TIMEOUT = 45000;
const BLOCKCHAIN_TRANSACTION_TIMEOUT = 60000;
const CACHE_DURATION = 300000; // 5 minutes

/**
 * Default API configuration with enhanced security and performance settings
 */
export const apiConfig: ApiRequestConfig = {
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Version': API_VERSION,
        'X-Security-Version': DEFAULT_REQUEST_CONFIG.securityVersion,
        'Content-Security-Policy': DEFAULT_REQUEST_CONFIG.headers['Content-Security-Policy'],
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'X-Request-ID': '',
        'X-Device-ID': ''
    },
    timeout: API_TIMEOUT,
    withCredentials: true,
    securityVersion: DEFAULT_REQUEST_CONFIG.securityVersion,
    encryption: true,
    retryPolicy: {
        maxRetries: API_MAX_RETRIES,
        retryDelay: API_RETRY_DELAY,
        useExponentialBackoff: true
    }
};

/**
 * Creates and configures an Axios instance with enhanced security and Pi Network support
 * @param config Custom API configuration to override defaults
 * @returns Configured Axios instance
 */
export const createApiClient = (config?: Partial<ApiRequestConfig>): AxiosInstance => {
    const mergedConfig: AxiosRequestConfig = {
        ...apiConfig,
        ...config,
        baseURL: API_BASE_URL,
        headers: {
            ...apiConfig.headers,
            ...config?.headers
        }
    };

    const instance = axios.create(mergedConfig);

    // Configure retry mechanism with exponential backoff
    axiosRetry(instance, {
        retries: apiConfig.retryPolicy.maxRetries,
        retryDelay: (retryCount) => {
            return apiConfig.retryPolicy.useExponentialBackoff
                ? axiosRetry.exponentialDelay(retryCount)
                : API_RETRY_DELAY;
        },
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                   (error.response?.status === 429); // Retry on rate limit
        }
    });

    // Request interceptor for authentication and tracking
    instance.interceptors.request.use((config) => {
        config.headers['X-Request-ID'] = crypto.randomUUID();
        config.headers['X-Device-ID'] = localStorage.getItem('deviceId') || '';

        // Adjust timeout for Pi Network and blockchain transactions
        if (config.url?.includes('/pi-wallet')) {
            config.timeout = PI_NETWORK_TIMEOUT;
            config.headers = {
                ...config.headers,
                'X-Pi-Network-Version': '2024.1',
                'X-Blockchain-Transaction': 'true'
            };
        }

        if (config.url?.includes('/transactions')) {
            config.timeout = BLOCKCHAIN_TRANSACTION_TIMEOUT;
        }

        return config;
    });

    // Response interceptor for error handling and caching
    instance.interceptors.response.use(
        (response) => {
            // Cache successful GET responses
            if (response.config.method?.toLowerCase() === 'get') {
                const cacheKey = `${response.config.url}`;
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    data: response.data,
                    timestamp: Date.now()
                }));
            }
            return response;
        },
        async (error) => {
            if (isApiError(error.response?.data)) {
                // Log API errors for monitoring
                console.error('API Error:', {
                    code: error.response.data.code,
                    message: error.response.data.message,
                    requestId: error.config.headers['X-Request-ID']
                });
            }

            // Handle rate limiting with exponential backoff
            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 1;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                return instance(error.config);
            }

            return Promise.reject(error);
        }
    );

    // Enable response compression
    instance.defaults.decompress = true;

    // Initialize performance monitoring
    instance.interceptors.request.use((config) => {
        config.metadata = { startTime: Date.now() };
        return config;
    });

    instance.interceptors.response.use((response) => {
        const endTime = Date.now();
        const duration = endTime - (response.config.metadata?.startTime || endTime);
        
        // Log if response time exceeds threshold
        if (duration > 100) { // 100ms threshold as per requirements
            console.warn(`API call to ${response.config.url} took ${duration}ms`);
        }
        
        return response;
    });

    return instance;
};