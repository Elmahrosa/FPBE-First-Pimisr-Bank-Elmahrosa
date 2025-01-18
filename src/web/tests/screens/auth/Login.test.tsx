/**
 * @fileoverview Comprehensive test suite for Login screen component
 * Implements secure authentication testing, accessibility validation,
 * and cross-platform verification with enhanced security measures
 * @version 2024.1
 */

import React from 'react';
import { render, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import { axe } from 'axe-react-native';
import Login from '../../../../src/screens/auth/Login';
import { useAuth } from '../../../../src/hooks/useAuth';
import { BiometricType } from '../../../../src/services/biometric.service';
import { ApiError } from '../../../../src/types/api.types';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useIsFocused: () => true,
}));

// Mock authentication hook
jest.mock('../../../../src/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock biometric service
jest.mock('../../../../src/services/biometric.service');

// Test data with security context
const mockValidCredentials = {
  email: 'test@example.com',
  password: 'ValidPass123!',
  deviceId: 'test-device-123',
  securityVersion: '1.0.0',
};

const mockSecurityContext = {
  securityVersion: '1.0.0',
  deviceId: 'test-device-123',
  lastActivity: new Date().toISOString(),
};

describe('Login Screen', () => {
  // Setup for each test
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      handleLogin: jest.fn(),
      handleBiometricLogin: jest.fn(),
      loading: false,
      error: null,
      securityContext: mockSecurityContext,
    });
  });

  // Authentication Flow Tests
  describe('Authentication Flow', () => {
    it('should handle email/password login successfully', async () => {
      const mockHandleLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        handleLogin: mockHandleLogin,
        loading: false,
        error: null,
        securityContext: mockSecurityContext,
      });

      const { getByTestId } = render(<Login />);

      // Fill form
      fireEvent.changeText(getByTestId('login-email-input'), mockValidCredentials.email);
      fireEvent.changeText(getByTestId('login-password-input'), mockValidCredentials.password);

      // Submit form
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(mockHandleLogin).toHaveBeenCalledWith({
          email: mockValidCredentials.email,
          password: mockValidCredentials.password,
          deviceId: mockSecurityContext.deviceId,
          securityVersion: mockSecurityContext.securityVersion,
        });
      });
    });

    it('should handle biometric authentication', async () => {
      const mockHandleBiometricLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        handleBiometricLogin: mockHandleBiometricLogin,
        loading: false,
        error: null,
        securityContext: mockSecurityContext,
      });

      const { getByTestId } = render(<Login />);

      // Trigger biometric login
      fireEvent.press(getByTestId('login-biometric-button'));

      await waitFor(() => {
        expect(mockHandleBiometricLogin).toHaveBeenCalled();
      });
    });

    it('should handle PIN authentication', async () => {
      const mockHandleLogin = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        handleLogin: mockHandleLogin,
        loading: false,
        error: null,
        securityContext: mockSecurityContext,
      });

      const { getByTestId } = render(<Login />);

      // Open PIN pad
      fireEvent.press(getByTestId('login-pin-button'));

      // Enter PIN
      const pinPad = getByTestId('login-pin-pad');
      for (let i = 1; i <= 6; i++) {
        fireEvent.press(within(pinPad).getByTestId(`pin-key-${i}`));
      }

      await waitFor(() => {
        expect(mockHandleLogin).toHaveBeenCalledWith(expect.objectContaining({
          deviceId: mockSecurityContext.deviceId,
        }));
      });
    });
  });

  // Security Validation Tests
  describe('Security Validation', () => {
    it('should enforce password complexity requirements', async () => {
      const { getByTestId } = render(<Login />);

      // Test weak password
      fireEvent.changeText(getByTestId('login-email-input'), mockValidCredentials.email);
      fireEvent.changeText(getByTestId('login-password-input'), 'weak');
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(getByTestId('login-error-message')).toBeTruthy();
      });
    });

    it('should handle authentication errors securely', async () => {
      const mockError: ApiError = {
        code: 'AUTH_FAILED',
        message: 'Invalid credentials',
        details: {},
      };

      (useAuth as jest.Mock).mockReturnValue({
        handleLogin: jest.fn().mockRejectedValue(mockError),
        loading: false,
        error: mockError,
        securityContext: mockSecurityContext,
      });

      const { getByTestId } = render(<Login />);

      fireEvent.changeText(getByTestId('login-email-input'), mockValidCredentials.email);
      fireEvent.changeText(getByTestId('login-password-input'), mockValidCredentials.password);
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(getByTestId('login-error-message')).toHaveTextContent('Invalid credentials');
      });
    });

    it('should validate device binding', async () => {
      const { getByTestId } = render(<Login />);

      // Test missing device binding
      (useAuth as jest.Mock).mockReturnValue({
        handleLogin: jest.fn(),
        loading: false,
        error: null,
        securityContext: { ...mockSecurityContext, deviceId: '' },
      });

      fireEvent.changeText(getByTestId('login-email-input'), mockValidCredentials.email);
      fireEvent.changeText(getByTestId('login-password-input'), mockValidCredentials.password);
      fireEvent.press(getByTestId('login-submit-button'));

      await waitFor(() => {
        expect(getByTestId('login-error-message')).toHaveTextContent('Device binding required');
      });
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('should meet WCAG 2.1 AA requirements', async () => {
      const { container } = render(<Login />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('should support screen readers', async () => {
      const { getByTestId } = render(<Login />);

      const emailInput = getByTestId('login-email-input');
      const passwordInput = getByTestId('login-password-input');
      const submitButton = getByTestId('login-submit-button');

      expect(emailInput.props.accessibilityLabel).toBe('Email input');
      expect(passwordInput.props.accessibilityLabel).toBe('Password input');
      expect(submitButton.props.accessibilityLabel).toBe('Login button');
    });

    it('should handle keyboard navigation', () => {
      const { getByTestId } = render(<Login />);

      const emailInput = getByTestId('login-email-input');
      const passwordInput = getByTestId('login-password-input');

      // Test tab order
      expect(document.activeElement).toBe(emailInput);
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      expect(document.activeElement).toBe(passwordInput);
    });
  });

  // Performance Tests
  describe('Performance', () => {
    it('should render efficiently', async () => {
      const startTime = performance.now();
      render(<Login />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    });

    it('should handle state updates efficiently', async () => {
      const { getByTestId, rerender } = render(<Login />);

      const startTime = performance.now();
      fireEvent.changeText(getByTestId('login-email-input'), mockValidCredentials.email);
      await act(async () => {
        rerender(<Login />);
      });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(16); // 16ms frame budget
    });
  });
});