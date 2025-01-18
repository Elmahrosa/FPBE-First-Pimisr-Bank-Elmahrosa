/**
 * @fileoverview Enhanced API client module for authentication-related operations
 * Implements secure multi-factor authentication, biometric verification, and device binding
 * @version 2024.1
 */

import axios from 'axios'; // v1.4.0
import CryptoJS from 'crypto-js'; // v4.1.1
import { apiConfig, createApiClient } from '../config/api.config';
import { AuthTypes } from '../types/auth.types';

// API endpoints for authentication operations
const AUTH_API_ENDPOINTS = {
    LOGIN: '/auth/login',
    BIOMETRIC: '/auth/biometric',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
} as const;

// Security configuration for authentication
const SECURITY_CONFIG = {
    REQUEST_TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    SECURITY_VERSION: '1.0',
    SIGNATURE_ALGORITHM: 'SHA-256'
} as const;

/**
 * Signs the request payload with device information for enhanced security
 * @param payload Request payload to sign
 * @param deviceId Unique device identifier
 * @returns Signed request payload with HMAC
 */
const signRequest = (payload: any, deviceId: string): string => {
    const timestamp = new Date().toISOString();
    const dataToSign = JSON.stringify({
        ...payload,
        deviceId,
        timestamp,
        securityVersion: SECURITY_CONFIG.SECURITY_VERSION
    });
    
    return CryptoJS.HmacSHA256(dataToSign, deviceId).toString();
};

/**
 * Enhanced authentication API client with security features and performance optimizations
 */
export const AuthAPI = {
    /**
     * Authenticates user with email/password and device binding
     * @param credentials Login credentials with device information
     * @returns Promise resolving to login response with tokens and security context
     */
    async login(credentials: AuthTypes.LoginRequest): Promise<AuthTypes.LoginResponse> {
        const apiClient = createApiClient({
            timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'X-Security-Version': SECURITY_CONFIG.SECURITY_VERSION,
                'X-Device-ID': credentials.deviceId
            }
        });

        const signature = signRequest(credentials, credentials.deviceId);
        
        const response = await apiClient.post<AuthTypes.LoginResponse>(
            AUTH_API_ENDPOINTS.LOGIN,
            credentials,
            {
                headers: {
                    'X-Request-Signature': signature
                }
            }
        );

        return response.data;
    },

    /**
     * Performs biometric authentication with security versioning
     * @param request Biometric authentication request with security context
     * @returns Promise resolving to login response with enhanced security
     */
    async loginWithBiometric(request: AuthTypes.BiometricAuthRequest): Promise<AuthTypes.LoginResponse> {
        const apiClient = createApiClient({
            timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'X-Security-Version': SECURITY_CONFIG.SECURITY_VERSION,
                'X-Device-ID': request.deviceId,
                'X-Biometric-Type': request.biometricType
            }
        });

        const signature = signRequest(request, request.deviceId);

        const response = await apiClient.post<AuthTypes.LoginResponse>(
            AUTH_API_ENDPOINTS.BIOMETRIC,
            request,
            {
                headers: {
                    'X-Request-Signature': signature
                }
            }
        );

        return response.data;
    },

    /**
     * Refreshes authentication tokens with security validation
     * @param refreshToken Current refresh token
     * @param securityContext Current security context
     * @returns Promise resolving to new authentication tokens
     */
    async refreshToken(
        refreshToken: string,
        securityContext: { deviceId: string; securityVersion: string }
    ): Promise<AuthTypes.LoginResponse> {
        const apiClient = createApiClient({
            timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'X-Security-Version': securityContext.securityVersion,
                'X-Device-ID': securityContext.deviceId
            }
        });

        const signature = signRequest({ refreshToken }, securityContext.deviceId);

        const response = await apiClient.post<AuthTypes.LoginResponse>(
            AUTH_API_ENDPOINTS.REFRESH,
            { refreshToken },
            {
                headers: {
                    'X-Request-Signature': signature,
                    'Authorization': `Bearer ${refreshToken}`
                }
            }
        );

        return response.data;
    },

    /**
     * Performs secure logout with token invalidation
     * @param refreshToken Current refresh token to invalidate
     * @param securityContext Current security context
     * @returns Promise resolving to void on successful logout
     */
    async logout(
        refreshToken: string,
        securityContext: { deviceId: string; securityVersion: string }
    ): Promise<void> {
        const apiClient = createApiClient({
            timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
            headers: {
                'X-Security-Version': securityContext.securityVersion,
                'X-Device-ID': securityContext.deviceId
            }
        });

        const signature = signRequest({ refreshToken }, securityContext.deviceId);

        await apiClient.post(
            AUTH_API_ENDPOINTS.LOGOUT,
            { refreshToken },
            {
                headers: {
                    'X-Request-Signature': signature,
                    'Authorization': `Bearer ${refreshToken}`
                }
            }
        );
    }
};