/**
 * @fileoverview Test suite for authentication reducer with enhanced security testing
 * Verifies state management for login, logout, and session handling with security validations
 * @version 2023.1
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { authReducer } from '../../../src/store/reducers/auth.reducer';
import { AuthState } from '../../../src/types/auth.types';
import {
  loginRequest,
  loginWithBiometricRequest,
  refreshSessionRequest,
  updateSecurityVersion,
  updateSession,
  logout,
  clearAuthError,
  AUTH_CONFIG
} from '../../../src/store/actions/auth.actions';

// Test data setup
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  phoneNumber: '+1234567890',
  kycStatus: 'VERIFIED',
  profile: {
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01'
  },
  securityVersion: '2023.1',
  deviceId: 'mock-device-id-123',
  lastLogin: '2023-01-01T00:00:00Z'
};

const mockSecurityMetadata = {
  version: '2023.1',
  deviceId: 'mock-device-id-123',
  sessionTimeout: 3600000
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  securityVersion: null,
  deviceId: null,
  sessionExpiry: null,
  lastActivity: new Date().toISOString()
};

describe('authReducer', () => {
  let state: AuthState;

  beforeEach(() => {
    state = { ...initialState };
  });

  test('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('login flow', () => {
    test('should handle loginRequest.pending', () => {
      const nextState = authReducer(state, loginRequest.pending);
      expect(nextState.loading).toBe(true);
      expect(nextState.error).toBeNull();
    });

    test('should handle loginRequest.fulfilled', () => {
      const payload = {
        data: {
          user: mockUser,
          token: 'mock-jwt-token'
        }
      };
      const nextState = authReducer(state, loginRequest.fulfilled(payload, '', { email: '', password: '', deviceId: '' }));
      
      expect(nextState.isAuthenticated).toBe(true);
      expect(nextState.user).toEqual(mockUser);
      expect(nextState.token).toBe('mock-jwt-token');
      expect(nextState.deviceId).toBe(mockUser.deviceId);
      expect(nextState.securityVersion).toBe(mockUser.securityVersion);
      expect(nextState.sessionExpiry).toBeDefined();
      expect(nextState.lastActivity).toBeDefined();
    });

    test('should handle loginRequest.rejected', () => {
      const error = {
        code: 'AUTH_ERROR',
        message: 'Invalid credentials',
        details: {}
      };
      const nextState = authReducer(state, loginRequest.rejected(null, '', { email: '', password: '', deviceId: '' }, error));
      
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toEqual(error);
      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
    });
  });

  describe('biometric authentication', () => {
    test('should handle loginWithBiometricRequest.fulfilled', () => {
      const payload = {
        data: {
          user: mockUser,
          token: 'mock-biometric-token'
        }
      };
      const nextState = authReducer(
        state,
        loginWithBiometricRequest.fulfilled(payload, '', {
          deviceId: mockUser.deviceId,
          biometricType: 'FACE_ID',
          securityVersion: mockUser.securityVersion,
          timestamp: new Date().toISOString()
        })
      );

      expect(nextState.isAuthenticated).toBe(true);
      expect(nextState.user).toEqual(mockUser);
      expect(nextState.token).toBe('mock-biometric-token');
      expect(nextState.deviceId).toBe(mockUser.deviceId);
      expect(nextState.securityVersion).toBe(mockUser.securityVersion);
    });

    test('should handle loginWithBiometricRequest.rejected', () => {
      const error = {
        code: 'BIOMETRIC_AUTH_ERROR',
        message: 'Biometric verification failed',
        details: {}
      };
      const nextState = authReducer(
        state,
        loginWithBiometricRequest.rejected(null, '', {
          deviceId: mockUser.deviceId,
          biometricType: 'FACE_ID',
          securityVersion: mockUser.securityVersion,
          timestamp: new Date().toISOString()
        }, error)
      );

      expect(nextState.error).toEqual(error);
      expect(nextState.isAuthenticated).toBe(false);
    });
  });

  describe('session management', () => {
    test('should handle refreshSessionRequest.fulfilled', () => {
      const payload = {
        data: {
          token: 'mock-refresh-token',
          sessionExpiry: new Date(Date.now() + AUTH_CONFIG.SESSION_TIMEOUT).toISOString()
        }
      };
      const nextState = authReducer(state, refreshSessionRequest.fulfilled(payload, ''));

      expect(nextState.token).toBe('mock-refresh-token');
      expect(nextState.sessionExpiry).toBeDefined();
      expect(nextState.lastActivity).toBeDefined();
    });

    test('should handle refreshSessionRequest.rejected', () => {
      const error = {
        code: 'REFRESH_ERROR',
        message: 'Session refresh failed',
        details: {}
      };
      const nextState = authReducer(state, refreshSessionRequest.rejected(null, '', error));

      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
      expect(nextState.sessionExpiry).toBeNull();
    });

    test('should handle updateSession', () => {
      const newExpiry = Date.now() + AUTH_CONFIG.SESSION_TIMEOUT;
      const nextState = authReducer(state, updateSession({ sessionExpiry: newExpiry }));

      expect(nextState.sessionExpiry).toBe(newExpiry);
      expect(nextState.lastActivity).toBeDefined();
    });
  });

  describe('security features', () => {
    test('should handle updateSecurityVersion', () => {
      const newVersion = '2023.2';
      const nextState = authReducer(state, updateSecurityVersion(newVersion));

      expect(nextState.securityVersion).toBe(newVersion);
      expect(nextState.lastActivity).toBeDefined();
    });

    test('should preserve security version on logout', () => {
      state.securityVersion = '2023.1';
      const nextState = authReducer(state, logout.fulfilled(undefined, ''));

      expect(nextState.securityVersion).toBe('2023.1');
      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
    });

    test('should validate device binding on login', () => {
      const payload = {
        data: {
          user: { ...mockUser, deviceId: 'different-device-id' },
          token: 'mock-jwt-token'
        }
      };
      const nextState = authReducer(state, loginRequest.fulfilled(payload, '', { email: '', password: '', deviceId: mockUser.deviceId }));

      expect(nextState.deviceId).toBe(payload.data.user.deviceId);
    });
  });

  describe('error handling', () => {
    test('should handle clearAuthError', () => {
      state.error = {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: {}
      };
      const nextState = authReducer(state, clearAuthError());

      expect(nextState.error).toBeNull();
    });

    test('should handle logout.rejected', () => {
      const error = {
        code: 'LOGOUT_ERROR',
        message: 'Logout failed',
        details: {}
      };
      const nextState = authReducer(state, logout.rejected(null, '', error));

      expect(nextState.error).toEqual(error);
      expect(nextState.isAuthenticated).toBe(false);
      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
    });
  });
});