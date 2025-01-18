/**
 * @fileoverview Test suite for BiometricPrompt component
 * Validates biometric authentication, accessibility compliance, and platform-specific behaviors
 * @version 1.0.0
 */

import React from 'react';
import { Platform, Animated } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ThemeProvider } from '@react-navigation/native';

// Component under test
import BiometricPrompt from '../../src/components/auth/BiometricPrompt';
import { BiometricType } from '../../src/hooks/useBiometric';

// Mock external dependencies
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock useBiometric hook
jest.mock('../../src/hooks/useBiometric', () => ({
  useBiometric: jest.fn(),
}));

// Mock security logging
const mockSecurityLog = jest.fn();
global.securityLog = mockSecurityLog;

describe('BiometricPrompt Component', () => {
  // Default props
  const defaultProps = {
    visible: true,
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
    onError: jest.fn(),
    testID: 'biometric-prompt',
  };

  // Mock theme
  const mockTheme = {
    colors: {
      background: { primary: '#FFFFFF' },
      text: { primary: '#000000', secondary: '#666666' },
      semantic: { feedback: { error: '#FF0000' } },
    },
    animation: { duration: { normal: 300 } },
    dimensions: { components: { MODAL_WIDTH: { SMALL: 8 } } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset animation mocks
    Animated.timing = jest.fn(() => ({
      start: jest.fn(),
    }));
    Animated.spring = jest.fn(() => ({
      start: jest.fn(),
    }));
    Animated.parallel = jest.fn((animations) => ({
      start: (callback?: () => void) => callback?.(),
    }));
  });

  describe('Platform Specific Rendering', () => {
    it('renders FaceID UI elements on iOS', () => {
      Platform.OS = 'ios';
      const { getByTestId, getByText } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByTestId('biometric-prompt')).toBeTruthy();
      expect(getByText('auth.biometric.faceId.title')).toBeTruthy();
    });

    it('renders Fingerprint UI elements on Android', () => {
      Platform.OS = 'android';
      const { getByTestId, getByText } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByTestId('biometric-prompt')).toBeTruthy();
      expect(getByText('auth.biometric.fingerprint.title')).toBeTruthy();
    });
  });

  describe('Authentication Flows', () => {
    it('handles successful authentication', async () => {
      const mockUseBiometric = {
        isBiometricAvailable: true,
        isLoading: false,
        error: null,
        biometricType: BiometricType.FACE_ID,
        authenticateWithBiometric: jest.fn().mockResolvedValue(true),
      };

      require('../../src/hooks/useBiometric').useBiometric.mockReturnValue(mockUseBiometric);

      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('biometric-prompt-authenticate'));
      });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(mockSecurityLog).toHaveBeenCalledWith('BIOMETRIC_AUTH_SUCCESS');
      });
    });

    it('handles authentication failure', async () => {
      const mockUseBiometric = {
        isBiometricAvailable: true,
        isLoading: false,
        error: null,
        biometricType: BiometricType.FACE_ID,
        authenticateWithBiometric: jest.fn().mockRejectedValue(new Error('Auth failed')),
      };

      require('../../src/hooks/useBiometric').useBiometric.mockReturnValue(mockUseBiometric);

      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('biometric-prompt-authenticate'));
      });

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Auth failed');
        expect(mockSecurityLog).toHaveBeenCalledWith('BIOMETRIC_AUTH_FAILURE');
      });
    });

    it('handles biometric unavailability', async () => {
      const mockUseBiometric = {
        isBiometricAvailable: false,
        isLoading: false,
        error: null,
        biometricType: BiometricType.NONE,
        authenticateWithBiometric: jest.fn(),
      };

      require('../../src/hooks/useBiometric').useBiometric.mockReturnValue(mockUseBiometric);

      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      const authenticateButton = getByTestId('biometric-prompt-authenticate');
      expect(authenticateButton).toBeDisabled();
    });
  });

  describe('Accessibility Support', () => {
    it('provides proper accessibility labels', () => {
      const { getByRole } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByRole('alert')).toBeTruthy();
    });

    it('maintains focus management', async () => {
      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      const authenticateButton = getByTestId('biometric-prompt-authenticate');
      const cancelButton = getByTestId('biometric-prompt-cancel');

      await act(async () => {
        authenticateButton.focus();
      });

      expect(document.activeElement).toBe(authenticateButton);

      await act(async () => {
        cancelButton.focus();
      });

      expect(document.activeElement).toBe(cancelButton);
    });

    it('announces authentication errors', async () => {
      const mockUseBiometric = {
        isBiometricAvailable: true,
        isLoading: false,
        error: 'Authentication failed',
        biometricType: BiometricType.FACE_ID,
        authenticateWithBiometric: jest.fn(),
      };

      require('../../src/hooks/useBiometric').useBiometric.mockReturnValue(mockUseBiometric);

      const { getByRole } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      expect(getByRole('alert')).toHaveTextContent('Authentication failed');
    });
  });

  describe('Security Validation', () => {
    it('logs security events', async () => {
      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('biometric-prompt-authenticate'));
      });

      expect(mockSecurityLog).toHaveBeenCalled();
    });

    it('handles authentication timeouts', async () => {
      const mockUseBiometric = {
        isBiometricAvailable: true,
        isLoading: false,
        error: null,
        biometricType: BiometricType.FACE_ID,
        authenticateWithBiometric: jest.fn().mockImplementation(() => 
          new Promise((resolve) => setTimeout(resolve, 31000))
        ),
      };

      require('../../src/hooks/useBiometric').useBiometric.mockReturnValue(mockUseBiometric);

      const { getByTestId } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      await act(async () => {
        fireEvent.press(getByTestId('biometric-prompt-authenticate'));
      });

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith('Authentication timeout');
      });
    });
  });

  describe('Animation Behavior', () => {
    it('animates on mount and unmount', async () => {
      const { rerender } = render(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} />
        </ThemeProvider>
      );

      expect(Animated.parallel).toHaveBeenCalled();

      rerender(
        <ThemeProvider value={mockTheme}>
          <BiometricPrompt {...defaultProps} visible={false} />
        </ThemeProvider>
      );

      expect(Animated.parallel).toHaveBeenCalled();
    });
  });
});