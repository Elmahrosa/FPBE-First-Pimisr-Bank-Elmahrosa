/**
 * @fileoverview Redux action creators for authentication operations in FPBE mobile banking
 * Implements secure authentication flows with biometric support and device binding
 * @version 2023.1
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  AuthState, 
  LoginRequest, 
  BiometricAuthRequest,
  User,
  KYCStatus,
  BiometricType,
  ApiError
} from '../../types/auth.types';
import { ApiResponse } from '../../types/api.types';

/**
 * Authentication action type constants with versioning
 */
export const AUTH_ACTION_TYPES = {
  LOGIN: 'auth/login',
  LOGIN_BIOMETRIC: 'auth/loginBiometric',
  LOGOUT: 'auth/logout',
  REFRESH: 'auth/refresh',
  UPDATE_SECURITY: 'auth/updateSecurity',
  UPDATE_SESSION: 'auth/updateSession',
  CLEAR_ERROR: 'auth/clearError'
} as const;

/**
 * Authentication configuration constants
 */
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: 900000, // 15 minutes
  REFRESH_THRESHOLD: 300000, // 5 minutes
  MAX_RETRY_ATTEMPTS: 3,
  SECURITY_CHECK_INTERVAL: 3600000, // 1 hour
  DEVICE_BINDING_VERSION: '2023.1'
} as const;

/**
 * Standard login action creator with enhanced security
 */
export const loginRequest = createAsyncThunk<
  ApiResponse<{ user: User; token: string }>,
  LoginRequest,
  { rejectValue: ApiError }
>(
  AUTH_ACTION_TYPES.LOGIN,
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': credentials.deviceId,
          'X-Security-Version': AUTH_CONFIG.DEVICE_BINDING_VERSION
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error as ApiError);
      }

      const data = await response.json();
      return data as ApiResponse<{ user: User; token: string }>;
    } catch (error) {
      return rejectWithValue({
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: error
      } as ApiError);
    }
  }
);

/**
 * Biometric authentication action creator
 */
export const loginWithBiometric = createAsyncThunk<
  ApiResponse<{ user: User; token: string }>,
  BiometricAuthRequest,
  { rejectValue: ApiError }
>(
  AUTH_ACTION_TYPES.LOGIN_BIOMETRIC,
  async (biometricData: BiometricAuthRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/biometric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': biometricData.deviceId,
          'X-Security-Version': AUTH_CONFIG.DEVICE_BINDING_VERSION
        },
        body: JSON.stringify(biometricData)
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error as ApiError);
      }

      const data = await response.json();
      return data as ApiResponse<{ user: User; token: string }>;
    } catch (error) {
      return rejectWithValue({
        code: 'BIOMETRIC_AUTH_ERROR',
        message: 'Biometric authentication failed',
        details: error
      } as ApiError);
    }
  }
);

/**
 * Session refresh action creator with security validation
 */
export const refreshSession = createAsyncThunk<
  ApiResponse<{ token: string; sessionExpiry: string }>,
  void,
  { state: { auth: AuthState }; rejectValue: ApiError }
>(
  AUTH_ACTION_TYPES.REFRESH,
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'X-Device-Id': auth.deviceId,
          'X-Security-Version': auth.securityVersion
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error as ApiError);
      }

      const data = await response.json();
      return data as ApiResponse<{ token: string; sessionExpiry: string }>;
    } catch (error) {
      return rejectWithValue({
        code: 'REFRESH_ERROR',
        message: 'Session refresh failed',
        details: error
      } as ApiError);
    }
  }
);

/**
 * Security version update action creator
 */
export const updateSecurityVersion = createAction<string>(
  AUTH_ACTION_TYPES.UPDATE_SECURITY
);

/**
 * Session update action creator
 */
export const updateSession = createAction<{ sessionExpiry: number }>(
  AUTH_ACTION_TYPES.UPDATE_SESSION
);

/**
 * Logout action creator with device unbinding
 */
export const logout = createAsyncThunk<
  void,
  void,
  { state: { auth: AuthState }; rejectValue: ApiError }
>(
  AUTH_ACTION_TYPES.LOGOUT,
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState();
    
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'X-Device-Id': auth.deviceId
        }
      });
    } catch (error) {
      return rejectWithValue({
        code: 'LOGOUT_ERROR',
        message: 'Logout failed',
        details: error
      } as ApiError);
    }
  }
);

/**
 * Clear authentication error action creator
 */
export const clearAuthError = createAction(AUTH_ACTION_TYPES.CLEAR_ERROR);