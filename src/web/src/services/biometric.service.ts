// External imports with versions
import { Platform } from 'react-native'; // ^0.71.0
import TouchID from 'react-native-touch-id'; // ^4.4.1
import ReactNativeBiometrics from 'react-native-biometrics'; // ^3.0.1

/**
 * Enum representing supported biometric authentication types
 */
export enum BiometricType {
  TOUCH_ID = 'TOUCH_ID',
  FACE_ID = 'FACE_ID',
  FINGERPRINT = 'FINGERPRINT',
  NONE = 'NONE'
}

/**
 * Interface for enhanced biometric authentication configuration
 * following OWASP MASVS security guidelines
 */
export interface BiometricConfig {
  title: string;
  description: string;
  fallbackLabel: string;
  timeout: number;
  maxAttempts: number;
  securityLevel: 'STRONG' | 'WEAK';
}

/**
 * Enhanced service class for secure biometric authentication
 * Implements OWASP MASVS guidelines and platform-specific security measures
 */
export class BiometricService {
  private readonly config: BiometricConfig;
  private readonly platform: string;
  private attempts: number;
  private readonly rnBiometrics: ReactNativeBiometrics;
  private readonly defaultConfig: BiometricConfig = {
    title: 'Biometric Authentication',
    description: 'Please authenticate to continue',
    fallbackLabel: 'Use Passcode',
    timeout: 30000,
    maxAttempts: 3,
    securityLevel: 'STRONG'
  };

  /**
   * Initializes BiometricService with security configuration
   * @param config Optional configuration override
   */
  constructor(config?: Partial<BiometricConfig>) {
    this.platform = Platform.OS;
    this.attempts = 0;
    this.config = { ...this.defaultConfig, ...config };
    this.rnBiometrics = new ReactNativeBiometrics({
      allowDeviceCredentials: false
    });

    this.validateSecurityConfig();
  }

  /**
   * Validates security configuration against OWASP MASVS requirements
   * @private
   */
  private validateSecurityConfig(): void {
    if (this.config.timeout < 5000 || this.config.timeout > 60000) {
      throw new Error('Security timeout must be between 5 and 60 seconds');
    }
    if (this.config.maxAttempts < 1 || this.config.maxAttempts > 5) {
      throw new Error('Max attempts must be between 1 and 5');
    }
  }

  /**
   * Checks if secure biometric authentication is available
   * @returns Promise resolving to availability status
   */
  public async checkAvailability(): Promise<boolean> {
    try {
      if (this.platform === 'ios') {
        const supportedTypes = await TouchID.isSupported();
        return !!supportedTypes;
      } else if (this.platform === 'android') {
        const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
        return available && biometryType !== 'Biometrics';
      }
      return false;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Performs secure biometric authentication with comprehensive error handling
   * @param config Optional configuration override
   * @returns Promise resolving to authentication result
   */
  public async authenticate(config?: Partial<BiometricConfig>): Promise<boolean> {
    try {
      const mergedConfig = { ...this.config, ...config };
      
      if (this.attempts >= mergedConfig.maxAttempts) {
        throw new Error('Maximum authentication attempts exceeded');
      }

      if (!(await this.checkAvailability())) {
        throw new Error('Biometric authentication not available');
      }

      this.attempts++;

      if (this.platform === 'ios') {
        const result = await TouchID.authenticate(mergedConfig.description, {
          title: mergedConfig.title,
          fallbackLabel: mergedConfig.fallbackLabel,
          passcodeFallback: true,
          timeout: mergedConfig.timeout
        });
        this.attempts = 0;
        return !!result;
      } else if (this.platform === 'android') {
        const { success } = await this.rnBiometrics.simplePrompt({
          promptMessage: mergedConfig.description,
          cancelButtonText: mergedConfig.fallbackLabel,
          fallbackPromptMessage: 'Use alternative authentication'
        });
        this.attempts = 0;
        return success;
      }

      return false;
    } catch (error) {
      if (error.name === 'TouchIDError' || error.name === 'BiometricError') {
        console.warn('Biometric authentication failed:', error);
        return false;
      }
      throw error;
    }
  }

  /**
   * Gets the current biometric type with security validation
   * @returns Promise resolving to validated BiometricType
   */
  public async getBiometricType(): Promise<BiometricType> {
    try {
      if (this.platform === 'ios') {
        const type = await TouchID.isSupported();
        switch (type) {
          case 'FaceID':
            return BiometricType.FACE_ID;
          case 'TouchID':
            return BiometricType.TOUCH_ID;
          default:
            return BiometricType.NONE;
        }
      } else if (this.platform === 'android') {
        const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
        if (available && biometryType === 'Biometrics') {
          return BiometricType.FINGERPRINT;
        }
      }
      return BiometricType.NONE;
    } catch (error) {
      console.error('Biometric type detection failed:', error);
      return BiometricType.NONE;
    }
  }

  /**
   * Resets the authentication attempts counter
   * @private
   */
  private resetAttempts(): void {
    this.attempts = 0;
  }
}