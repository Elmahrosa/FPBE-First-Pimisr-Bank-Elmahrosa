/**
 * @fileoverview Centralized API constants for the FPBE mobile banking application
 * Defines endpoints, security configurations, and request settings for all API services
 * @version 2024.1
 */

import { ApiRequestConfig } from '../types/api.types';

// API Version and Base URL Configuration
export const API_VERSION = 'v1';
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.fpbe.com';

// Performance Configuration
export const API_TIMEOUT = 30000; // 30 seconds max timeout
export const API_MAX_RETRIES = 3;
export const API_RETRY_DELAY = 1000; // 1 second base delay

// Security Configuration
export const API_SECURITY_VERSION = '2024.1';
export const API_CONTENT_SECURITY_POLICY = "default-src 'self'; connect-src 'self' https://api.fpbe.com";

/**
 * HTTP Method constants for API requests
 */
export enum API_METHODS {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}

/**
 * Enhanced security headers for API requests
 */
export const API_HEADERS = {
    CONTENT_TYPE: 'Content-Type',
    AUTHORIZATION: 'Authorization',
    ACCEPT: 'Accept',
    X_API_VERSION: 'X-API-Version',
    X_SECURITY_VERSION: 'X-Security-Version',
    X_REQUEST_ID: 'X-Request-ID',
    X_DEVICE_ID: 'X-Device-ID',
    CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
    STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
    X_FRAME_OPTIONS: 'X-Frame-Options',
    X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
    X_XSS_PROTECTION: 'X-XSS-Protection'
} as const;

/**
 * Comprehensive API endpoint definitions for all services
 */
export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH_TOKEN: '/auth/refresh',
        REGISTER: '/auth/register',
        VERIFY_2FA: '/auth/verify-2fa',
        RESET_PASSWORD: '/auth/reset-password',
        VERIFY_BIOMETRIC: '/auth/verify-biometric'
    },
    ACCOUNT: {
        LIST: '/accounts',
        DETAILS: (id: string) => `/accounts/${id}`,
        CREATE: '/accounts',
        UPDATE_STATUS: (id: string) => `/accounts/${id}/status`,
        BALANCE: (id: string) => `/accounts/${id}/balance`,
        STATEMENTS: (id: string) => `/accounts/${id}/statements`
    },
    TRANSACTION: {
        CREATE: '/transactions',
        LIST: '/transactions',
        DETAILS: (id: string) => `/transactions/${id}`,
        VERIFY: (id: string) => `/transactions/${id}/verify`,
        HISTORY: (accountId: string) => `/accounts/${accountId}/transactions`
    },
    PI_WALLET: {
        BALANCE: '/pi-wallet/balance',
        MINE: '/pi-wallet/mine',
        TRANSFER: '/pi-wallet/transfer',
        HISTORY: '/pi-wallet/history',
        EXCHANGE_RATE: '/pi-wallet/exchange-rate',
        MINING_STATUS: '/pi-wallet/mining-status'
    },
    NOTIFICATION: {
        REGISTER_DEVICE: '/notifications/register-device',
        PREFERENCES: '/notifications/preferences',
        HISTORY: '/notifications/history'
    },
    VIRTUAL_CARDS: {
        LIST: '/virtual-cards',
        CREATE: '/virtual-cards',
        DETAILS: (id: string) => `/virtual-cards/${id}`,
        UPDATE_STATUS: (id: string) => `/virtual-cards/${id}/status`,
        TRANSACTIONS: (id: string) => `/virtual-cards/${id}/transactions`
    }
} as const;

/**
 * Default request configuration with security and performance settings
 */
export const DEFAULT_REQUEST_CONFIG: ApiRequestConfig = {
    headers: {
        [API_HEADERS.CONTENT_TYPE]: 'application/json',
        [API_HEADERS.ACCEPT]: 'application/json',
        [API_HEADERS.X_API_VERSION]: API_VERSION,
        [API_HEADERS.X_SECURITY_VERSION]: API_SECURITY_VERSION,
        [API_HEADERS.CONTENT_SECURITY_POLICY]: API_CONTENT_SECURITY_POLICY,
        [API_HEADERS.STRICT_TRANSPORT_SECURITY]: 'max-age=31536000; includeSubDomains',
        [API_HEADERS.X_FRAME_OPTIONS]: 'DENY',
        [API_HEADERS.X_CONTENT_TYPE_OPTIONS]: 'nosniff',
        [API_HEADERS.X_XSS_PROTECTION]: '1; mode=block'
    },
    timeout: API_TIMEOUT,
    withCredentials: true,
    securityVersion: API_SECURITY_VERSION,
    encryption: true,
    retryPolicy: {
        maxRetries: API_MAX_RETRIES,
        retryDelay: API_RETRY_DELAY,
        useExponentialBackoff: true
    }
};