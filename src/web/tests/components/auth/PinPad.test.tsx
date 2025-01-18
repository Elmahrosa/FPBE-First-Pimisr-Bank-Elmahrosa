/**
 * @fileoverview Test suite for PinPad component
 * Verifies security features, PIN handling, and accessibility compliance
 * according to OWASP MASVS requirements
 * @version 1.0.0
 */

import React from 'react'; // v18.0+
import { render, fireEvent, act, waitFor, within } from '@testing-library/react-native'; // v12.0+
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals'; // v29.0+
import PinPad from '../../../src/components/auth/PinPad';
import { clearSensitiveData } from '@security/utils';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useTheme: () => ({
    colors: {
      primary: '#1E3A8A',
      border: '#E5E7EB',
    },
  }),
}));

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Vibration: {
    vibrate: jest.fn(),
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('@security/utils', () => ({
  clearSensitiveData: jest.fn(),
  maskPinDisplay: jest.fn((pin) => '•'.repeat(pin.length)),
}));

// Mock crypto for secure random number generation
const mockCrypto = {
  getRandomValues: (array: Uint32Array) => {
    array[0] = Math.floor(Math.random() * 0xffffffff);
    return array;
  },
};
global.crypto = mockCrypto;

describe('PinPad Component Security Tests', () => {
  const defaultProps = {
    pinLength: 6,
    verificationMode: false,
    onComplete: jest.fn(),
    onError: jest.fn(),
    testID: 'pin-pad',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  describe('Security Features', () => {
    it('should randomize keypad layout on initial render', () => {
      const { getAllByRole } = render(<PinPad {...defaultProps} />);
      const buttons = getAllByRole('button').filter(btn => btn.props.accessibilityLabel?.match(/Enter \d/));
      
      // Verify all digits 0-9 are present but in random order
      const digits = buttons.map(btn => btn.props.accessibilityLabel?.replace('Enter ', ''));
      expect(digits).toHaveLength(10);
      expect(new Set(digits)).toHaveLength(10);
    });

    it('should randomize keypad after each input in high security mode', () => {
      const { getByTestId, getAllByRole } = render(
        <PinPad {...defaultProps} securityLevel="high" />
      );

      const initialLayout = getAllByRole('button')
        .filter(btn => btn.props.accessibilityLabel?.match(/Enter \d/))
        .map(btn => btn.props.accessibilityLabel);

      // Enter a digit
      fireEvent.press(getByTestId('pin-key-1'));

      const newLayout = getAllByRole('button')
        .filter(btn => btn.props.accessibilityLabel?.match(/Enter \d/))
        .map(btn => btn.props.accessibilityLabel);

      expect(newLayout).not.toEqual(initialLayout);
    });

    it('should enforce maximum attempt limits', async () => {
      const { getByTestId } = render(
        <PinPad
          {...defaultProps}
          verificationMode
          correctPin="123456"
          maxAttempts={3}
        />
      );

      // Attempt incorrect PIN 3 times
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 6; j++) {
          fireEvent.press(getByTestId('pin-key-0'));
        }
      }

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          'Maximum attempts exceeded. Please try again later.'
        );
      });

      // Verify keypad is locked
      const keyButton = getByTestId('pin-key-1');
      expect(keyButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should prevent rapid input attempts', () => {
      const { getByTestId } = render(<PinPad {...defaultProps} />);
      
      // Attempt rapid PIN entry
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('pin-key-1'));
      }

      // Verify only one input was registered
      const pinDisplay = within(getByTestId('pin-pad')).getByRole('text');
      expect(pinDisplay.props.accessibilityLabel).toBe('PIN entry: 1 digits entered');
    });

    it('should clear sensitive data on unmount', () => {
      const { unmount } = render(<PinPad {...defaultProps} />);
      unmount();
      expect(clearSensitiveData).toHaveBeenCalled();
    });
  });

  describe('PIN Handling', () => {
    it('should validate PIN length requirement', async () => {
      const { getByTestId } = render(
        <PinPad {...defaultProps} pinLength={4} />
      );

      // Enter 4 digits
      for (let i = 0; i < 4; i++) {
        fireEvent.press(getByTestId('pin-key-1'));
      }

      expect(defaultProps.onComplete).toHaveBeenCalledWith('1111');
    });

    it('should handle backspace correctly', () => {
      const { getByTestId } = render(<PinPad {...defaultProps} />);

      // Enter digits and delete
      fireEvent.press(getByTestId('pin-key-1'));
      fireEvent.press(getByTestId('pin-key-2'));
      fireEvent.press(getByTestId('pin-key-backspace'));

      const pinDisplay = within(getByTestId('pin-pad')).getByRole('text');
      expect(pinDisplay.props.accessibilityLabel).toBe('PIN entry: 1 digits entered');
    });

    it('should timeout after period of inactivity', async () => {
      const onTimeout = jest.fn();
      render(
        <PinPad
          {...defaultProps}
          timeoutDuration={1000}
          onTimeout={onTimeout}
        />
      );

      // Fast-forward past timeout duration
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(onTimeout).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isScreenReaderEnabled')
        .mockImplementation(() => Promise.resolve(true));
    });

    it('should provide appropriate accessibility labels', () => {
      const { getAllByRole } = render(<PinPad {...defaultProps} />);
      
      const buttons = getAllByRole('button');
      buttons.forEach(button => {
        expect(button.props.accessibilityLabel).toBeDefined();
        expect(button.props.accessibilityRole).toBe('button');
      });
    });

    it('should announce PIN entry progress', () => {
      const { getByTestId } = render(<PinPad {...defaultProps} />);
      
      fireEvent.press(getByTestId('pin-key-1'));
      
      const pinDisplay = within(getByTestId('pin-pad')).getByRole('text');
      expect(pinDisplay.props.accessibilityLabel).toBe('PIN entry: 1 digits entered');
    });

    it('should announce error messages', async () => {
      const { getByRole } = render(
        <PinPad
          {...defaultProps}
          verificationMode
          correctPin="123456"
        />
      );

      // Enter incorrect PIN
      for (let i = 0; i < 6; i++) {
        fireEvent.press(getByRole('button', { name: 'Enter 0' }));
      }

      const errorMessage = getByRole('alert');
      expect(errorMessage).toBeDefined();
    });
  });
});