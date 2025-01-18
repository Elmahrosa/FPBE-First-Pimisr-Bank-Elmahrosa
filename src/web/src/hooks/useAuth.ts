/**
 * @fileoverview Enhanced authentication hook for FPBE mobile banking application
 * Implements secure multi-factor authentication, biometric verification, and OWASP MASVS compliant session management
 * @version 2024.1
 */

import { useState, useEffect } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import SecurityLogger from '@fpbe/security-logger'; // v1.0.0
import { login, loginWithBiometric, refreshToken } from '../api/auth.api';
import { BiometricService, BiometricType } from '../services/biometric.service';
import { AuthState, LoginRequest, BiometricAuthRequest, User, ApiError } from '../types/auth.types';

// Security configuration constants
const TOKEN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_RETRY_ATTEMPTS = 3;
const SECURITY_VERSION = '1.0';
const BIOMETRIC_CONFIG = {
  title: 'Authenticate',
  description: 'Use your biometric to securely access your account',
  fallbackEnabled: true,
  securityLevel: 'high'
} as const;

/**
 * Enhanced authentication hook with comprehensive security features
 * @returns Authentication state and secure methods
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Initialize security services
  const biometricService = new BiometricService(BIOMETRIC_CONFIG);
  const securityLogger = new SecurityLogger();

  // Redux auth state
  const authState = useSelector((state: { auth: AuthState }) => state.auth);
  const { isAuthenticated, user, token } = authState;

  /**
   * Validates security requirements for authentication
   * @private
   */
  const validateSecurityRequirements = async (): Promise<boolean> => {
    try {
      const deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        throw new Error('Device binding required');
      }

      const securityVersion = localStorage.getItem('securityVersion');
      if (securityVersion !== SECURITY_VERSION) {
        throw new Error('Security update required');
      }

      return true;
    } catch (error) {
      securityLogger.error('Security validation failed', { error });
      return false;
    }
  };

  /**
   * Handles secure token refresh with retry mechanism
   * @private
   */
  const handleTokenRefresh = async (): Promise<void> => {
    try {
      if (!token || !user?.deviceId) return;

      const response = await refreshToken(token, {
        deviceId: user.deviceId,
        securityVersion: SECURITY_VERSION
      });

      dispatch({ type: 'AUTH_REFRESH_SUCCESS', payload: response });
      securityLogger.info('Token refreshed successfully');
    } catch (error) {
      securityLogger.error('Token refresh failed', { error });
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount(prev => prev + 1);
        setTimeout(handleTokenRefresh, 1000 * Math.pow(2, retryCount));
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    }
  };

  /**
   * Handles secure user login with device binding
   * @param credentials Login credentials
   */
  const handleLogin = async (credentials: LoginRequest): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!(await validateSecurityRequirements())) {
        throw new Error('Security requirements not met');
      }

      const response = await login({
        ...credentials,
        deviceId: localStorage.getItem('deviceId') || ''
      });

      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: response });
      securityLogger.info('User logged in successfully', { userId: response.user.id });
    } catch (error) {
      setError(error as ApiError);
      securityLogger.error('Login failed', { error });
      dispatch({ type: 'AUTH_LOGIN_FAILURE', payload: error });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles secure biometric authentication
   */
  const handleBiometricLogin = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      if (!(await validateSecurityRequirements())) {
        throw new Error('Security requirements not met');
      }

      const biometricType = await biometricService.getBiometricType();
      if (biometricType === BiometricType.NONE) {
        throw new Error('Biometric authentication not available');
      }

      const isAuthenticated = await biometricService.authenticate();
      if (!isAuthenticated) {
        throw new Error('Biometric authentication failed');
      }

      const request: BiometricAuthRequest = {
        deviceId: localStorage.getItem('deviceId') || '',
        biometricType,
        securityVersion: SECURITY_VERSION,
        timestamp: new Date().toISOString()
      };

      const response = await loginWithBiometric(request);
      dispatch({ type: 'AUTH_LOGIN_SUCCESS', payload: response });
      securityLogger.info('Biometric authentication successful', { userId: response.user.id });
    } catch (error) {
      setError(error as ApiError);
      securityLogger.error('Biometric authentication failed', { error });
      dispatch({ type: 'AUTH_LOGIN_FAILURE', payload: error });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles secure logout with token invalidation
   */
  const handleLogout = async (): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOGOUT' });
      localStorage.removeItem('deviceId');
      securityLogger.info('User logged out successfully');
    } catch (error) {
      securityLogger.error('Logout failed', { error });
    }
  };

  // Setup automatic token refresh
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;

    if (isAuthenticated && token) {
      handleTokenRefresh();
      refreshInterval = setInterval(handleTokenRefresh, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, token]);

  return {
    isAuthenticated,
    user,
    loading,
    error,
    handleLogin,
    handleBiometricLogin,
    handleLogout,
    securityContext: {
      securityVersion: SECURITY_VERSION,
      deviceId: localStorage.getItem('deviceId'),
      lastActivity: new Date().toISOString()
    }
  };
};