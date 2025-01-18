/**
 * @fileoverview Redux reducer for authentication state management in FPBE mobile banking
 * Implements secure session handling, device binding, and multi-factor authentication
 * @version 2023.1
 */

import { createReducer } from '@reduxjs/toolkit';
import { AuthState } from '../../types/auth.types';
import {
  loginRequest,
  loginWithBiometricRequest,
  refreshSessionRequest,
  updateSecurityVersion,
  updateSession,
  logout,
  clearAuthError,
  AUTH_CONFIG
} from '../actions/auth.actions';

/**
 * Initial authentication state with security defaults
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  securityVersion: '2023.1',
  deviceId: null,
  sessionExpiry: null,
  lastActivity: new Date().toISOString()
};

/**
 * Enhanced authentication reducer with comprehensive security features
 */
export const authReducer = createReducer(initialState, (builder) => {
  builder
    // Handle login request
    .addCase(loginRequest.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(loginRequest.fulfilled, (state, action) => {
      const { user, token } = action.payload.data;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.loading = false;
      state.error = null;
      state.deviceId = user.deviceId;
      state.securityVersion = user.securityVersion;
      state.sessionExpiry = Date.now() + AUTH_CONFIG.SESSION_TIMEOUT;
      state.lastActivity = new Date().toISOString();
    })
    .addCase(loginRequest.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: {}
      };
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    })

    // Handle biometric authentication
    .addCase(loginWithBiometricRequest.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(loginWithBiometricRequest.fulfilled, (state, action) => {
      const { user, token } = action.payload.data;
      state.isAuthenticated = true;
      state.user = user;
      state.token = token;
      state.loading = false;
      state.error = null;
      state.deviceId = user.deviceId;
      state.securityVersion = user.securityVersion;
      state.sessionExpiry = Date.now() + AUTH_CONFIG.SESSION_TIMEOUT;
      state.lastActivity = new Date().toISOString();
    })
    .addCase(loginWithBiometricRequest.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || {
        code: 'BIOMETRIC_AUTH_ERROR',
        message: 'Biometric authentication failed',
        details: {}
      };
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    })

    // Handle session refresh
    .addCase(refreshSessionRequest.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(refreshSessionRequest.fulfilled, (state, action) => {
      const { token, sessionExpiry } = action.payload.data;
      state.token = token;
      state.sessionExpiry = new Date(sessionExpiry).getTime();
      state.loading = false;
      state.error = null;
      state.lastActivity = new Date().toISOString();
    })
    .addCase(refreshSessionRequest.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || {
        code: 'REFRESH_ERROR',
        message: 'Session refresh failed',
        details: {}
      };
      // Force logout on refresh failure
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.sessionExpiry = null;
    })

    // Handle security version updates
    .addCase(updateSecurityVersion, (state, action) => {
      state.securityVersion = action.payload;
      state.lastActivity = new Date().toISOString();
    })

    // Handle session updates
    .addCase(updateSession, (state, action) => {
      state.sessionExpiry = action.payload.sessionExpiry;
      state.lastActivity = new Date().toISOString();
    })

    // Handle logout
    .addCase(logout.fulfilled, (state) => {
      // Reset to initial state while preserving security version
      const securityVersion = state.securityVersion;
      Object.assign(state, { ...initialState, securityVersion });
    })
    .addCase(logout.rejected, (state, action) => {
      // Force logout even if API call fails
      const securityVersion = state.securityVersion;
      Object.assign(state, { ...initialState, securityVersion });
      state.error = action.payload || {
        code: 'LOGOUT_ERROR',
        message: 'Logout failed',
        details: {}
      };
    })

    // Handle error clearing
    .addCase(clearAuthError, (state) => {
      state.error = null;
    });
});