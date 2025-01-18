// External imports with versions
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'; // ^29.0.0
import { Platform } from 'react-native'; // ^0.71.0
import TouchID from 'react-native-touch-id'; // ^4.4.1
import ReactNativeBiometrics from 'react-native-biometrics'; // ^3.0.1

// Internal imports
import { BiometricService, BiometricType, BiometricConfig } from '../../src/services/biometric.service';

// Mock configurations
const mockBiometricConfig: BiometricConfig = {
  title: 'FPBE Authentication',
  description: 'Verify your identity',
  fallbackLabel: 'Use PIN',
  timeout: 30000,
  maxAttempts: 3,
  securityLevel: 'STRONG'
};

// Mock setup
jest.mock('react-native-touch-id');
jest.mock('react-native-biometrics');

describe('BiometricService', () => {
  let biometricService: BiometricService;
  let platformSelectSpy: jest.SpyInstance;

  beforeAll(() => {
    platformSelectSpy = jest.spyOn(Platform, 'select');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    biometricService = new BiometricService(mockBiometricConfig);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    platformSelectSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with default config when no config provided', () => {
      const service = new BiometricService();
      expect(service).toBeInstanceOf(BiometricService);
    });

    it('should throw error for invalid timeout configuration', () => {
      expect(() => new BiometricService({ timeout: 1000 }))
        .toThrow('Security timeout must be between 5 and 60 seconds');
    });

    it('should throw error for invalid maxAttempts configuration', () => {
      expect(() => new BiometricService({ maxAttempts: 6 }))
        .toThrow('Max attempts must be between 1 and 5');
    });
  });

  describe('checkAvailability', () => {
    describe('iOS', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('ios');
      });

      it('should return true when TouchID is supported', async () => {
        (TouchID.isSupported as jest.Mock).mockResolvedValue('TouchID');
        const result = await biometricService.checkAvailability();
        expect(result).toBe(true);
        expect(TouchID.isSupported).toHaveBeenCalled();
      });

      it('should return true when FaceID is supported', async () => {
        (TouchID.isSupported as jest.Mock).mockResolvedValue('FaceID');
        const result = await biometricService.checkAvailability();
        expect(result).toBe(true);
        expect(TouchID.isSupported).toHaveBeenCalled();
      });

      it('should return false when biometric support check fails', async () => {
        (TouchID.isSupported as jest.Mock).mockRejectedValue(new Error('Not supported'));
        const result = await biometricService.checkAvailability();
        expect(result).toBe(false);
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('android');
      });

      it('should return true when fingerprint is available', async () => {
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockResolvedValue({ available: true, biometryType: 'Fingerprint' });
        const result = await biometricService.checkAvailability();
        expect(result).toBe(true);
      });

      it('should return false when biometric sensor is not available', async () => {
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockResolvedValue({ available: false, biometryType: null });
        const result = await biometricService.checkAvailability();
        expect(result).toBe(false);
      });

      it('should return false when sensor check fails', async () => {
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockRejectedValue(new Error('Sensor error'));
        const result = await biometricService.checkAvailability();
        expect(result).toBe(false);
      });
    });
  });

  describe('authenticate', () => {
    describe('iOS', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('ios');
        (TouchID.isSupported as jest.Mock).mockResolvedValue('TouchID');
      });

      it('should successfully authenticate with TouchID', async () => {
        (TouchID.authenticate as jest.Mock).mockResolvedValue(true);
        const result = await biometricService.authenticate();
        expect(result).toBe(true);
        expect(TouchID.authenticate).toHaveBeenCalledWith(
          mockBiometricConfig.description,
          expect.objectContaining({
            title: mockBiometricConfig.title,
            fallbackLabel: mockBiometricConfig.fallbackLabel
          })
        );
      });

      it('should handle authentication failure', async () => {
        (TouchID.authenticate as jest.Mock).mockRejectedValue({ name: 'TouchIDError' });
        const result = await biometricService.authenticate();
        expect(result).toBe(false);
      });

      it('should throw error after max attempts', async () => {
        (TouchID.authenticate as jest.Mock).mockRejectedValue({ name: 'TouchIDError' });
        await biometricService.authenticate();
        await biometricService.authenticate();
        await biometricService.authenticate();
        await expect(biometricService.authenticate())
          .rejects.toThrow('Maximum authentication attempts exceeded');
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('android');
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockResolvedValue({ available: true, biometryType: 'Fingerprint' });
      });

      it('should successfully authenticate with fingerprint', async () => {
        (ReactNativeBiometrics.prototype.simplePrompt as jest.Mock)
          .mockResolvedValue({ success: true });
        const result = await biometricService.authenticate();
        expect(result).toBe(true);
        expect(ReactNativeBiometrics.prototype.simplePrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            promptMessage: mockBiometricConfig.description,
            cancelButtonText: mockBiometricConfig.fallbackLabel
          })
        );
      });

      it('should handle authentication failure', async () => {
        (ReactNativeBiometrics.prototype.simplePrompt as jest.Mock)
          .mockResolvedValue({ success: false });
        const result = await biometricService.authenticate();
        expect(result).toBe(false);
      });

      it('should handle biometric errors', async () => {
        (ReactNativeBiometrics.prototype.simplePrompt as jest.Mock)
          .mockRejectedValue({ name: 'BiometricError' });
        const result = await biometricService.authenticate();
        expect(result).toBe(false);
      });
    });
  });

  describe('getBiometricType', () => {
    describe('iOS', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('ios');
      });

      it('should return FACE_ID when FaceID is supported', async () => {
        (TouchID.isSupported as jest.Mock).mockResolvedValue('FaceID');
        const result = await biometricService.getBiometricType();
        expect(result).toBe(BiometricType.FACE_ID);
      });

      it('should return TOUCH_ID when TouchID is supported', async () => {
        (TouchID.isSupported as jest.Mock).mockResolvedValue('TouchID');
        const result = await biometricService.getBiometricType();
        expect(result).toBe(BiometricType.TOUCH_ID);
      });

      it('should return NONE when no biometric is supported', async () => {
        (TouchID.isSupported as jest.Mock).mockRejectedValue(new Error('Not supported'));
        const result = await biometricService.getBiometricType();
        expect(result).toBe(BiometricType.NONE);
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        platformSelectSpy.mockReturnValue('android');
      });

      it('should return FINGERPRINT when fingerprint is available', async () => {
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockResolvedValue({ available: true, biometryType: 'Biometrics' });
        const result = await biometricService.getBiometricType();
        expect(result).toBe(BiometricType.FINGERPRINT);
      });

      it('should return NONE when no biometric is available', async () => {
        (ReactNativeBiometrics.prototype.isSensorAvailable as jest.Mock)
          .mockResolvedValue({ available: false, biometryType: null });
        const result = await biometricService.getBiometricType();
        expect(result).toBe(BiometricType.NONE);
      });
    });
  });
});