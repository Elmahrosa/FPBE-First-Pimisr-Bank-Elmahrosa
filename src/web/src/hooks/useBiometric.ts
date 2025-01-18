// External imports with versions
import { useState, useEffect, useCallback } from 'react'; // ^18.2.0

// Internal imports
import { BiometricService, BiometricType } from '../services/biometric.service';

/**
 * Interface for structured error handling in biometric operations
 */
interface BiometricError {
  code: string;
  message: string;
  technical: string;
}

/**
 * Interface defining the return type of the useBiometric hook
 * with enhanced security features and OWASP MASVS compliance
 */
interface UseBiometricHook {
  isBiometricAvailable: boolean;
  isLoading: boolean;
  error: BiometricError | null;
  biometricType: BiometricType;
  attemptCount: number;
  authenticateWithBiometric: () => Promise<boolean>;
  checkBiometricAvailability: () => Promise<void>;
  resetState: () => void;
}

// Maximum authentication attempts before lockout
const MAX_AUTH_ATTEMPTS = 3;

// Timeout duration for authentication attempts (milliseconds)
const AUTH_TIMEOUT = 30000;

/**
 * Custom hook for managing biometric authentication state and methods
 * with enhanced security features and OWASP MASVS compliance
 */
export const useBiometric = (): UseBiometricHook => {
  // State management with security considerations
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<BiometricError | null>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>(BiometricType.NONE);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  // Create memoized BiometricService instance with security configuration
  const biometricService = useCallback(
    () =>
      new BiometricService({
        timeout: AUTH_TIMEOUT,
        maxAttempts: MAX_AUTH_ATTEMPTS,
        securityLevel: 'STRONG',
      }),
    []
  );

  /**
   * Checks biometric availability with comprehensive error handling
   */
  const checkBiometricAvailability = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const service = biometricService();
      const isAvailable = await service.checkAvailability();
      setIsBiometricAvailable(isAvailable);

      if (isAvailable) {
        const type = await service.getBiometricType();
        setBiometricType(type);
      }
    } catch (err) {
      setError({
        code: 'AVAILABILITY_CHECK_ERROR',
        message: 'Unable to check biometric availability',
        technical: err.message,
      });
      setIsBiometricAvailable(false);
      setBiometricType(BiometricType.NONE);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Performs biometric authentication with retry logic and rate limiting
   * Implements OWASP MASVS security requirements
   */
  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Rate limiting check
      if (attemptCount >= MAX_AUTH_ATTEMPTS) {
        throw new Error('Maximum authentication attempts exceeded');
      }

      const service = biometricService();
      
      // Verify availability before attempting authentication
      if (!isBiometricAvailable) {
        await checkBiometricAvailability();
        if (!isBiometricAvailable) {
          throw new Error('Biometric authentication not available');
        }
      }

      // Increment attempt counter
      setAttemptCount((prev) => prev + 1);

      // Perform authentication with timeout
      const authResult = await Promise.race([
        service.authenticate(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout')), AUTH_TIMEOUT)
        ),
      ]);

      if (authResult) {
        // Reset attempt counter on success
        setAttemptCount(0);
        return true;
      }

      throw new Error('Authentication failed');
    } catch (err) {
      setError({
        code: 'AUTH_ERROR',
        message: 'Biometric authentication failed',
        technical: err.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Resets authentication state and attempt counter
   */
  const resetState = useCallback((): void => {
    setError(null);
    setAttemptCount(0);
    setIsLoading(false);
  }, []);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  return {
    isBiometricAvailable,
    isLoading,
    error,
    biometricType,
    attemptCount,
    authenticateWithBiometric,
    checkBiometricAvailability,
    resetState,
  };
};