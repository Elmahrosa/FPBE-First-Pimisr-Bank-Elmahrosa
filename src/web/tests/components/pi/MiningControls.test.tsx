/**
 * @fileoverview Test suite for MiningControls component
 * Verifies mining control functionality, status display, error handling,
 * accessibility compliance, and performance monitoring
 * @version 2024.1
 */

import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import { MiningControls } from '../../../../src/components/pi/MiningControls';
import { usePiMining } from '../../../../src/hooks/usePiMining';
import { MiningStatus } from '../../../types/pi.types';

// Mock the usePiMining hook
jest.mock('../../../../src/hooks/usePiMining');

// Mock theme hook
jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { secondary: '#F3F4F6' },
        text: { primary: '#333333', secondary: '#666666' },
        primary: '#1E3A8A',
        error: '#EF4444'
      }
    },
    isDarkMode: false
  })
}));

describe('MiningControls', () => {
  // Default props for testing
  const defaultProps = {
    userId: 'test-user-id',
    onError: jest.fn()
  };

  // Mock implementation setup
  const mockStartMining = jest.fn();
  const mockStopMining = jest.fn();

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset usePiMining hook mock
    (usePiMining as jest.Mock).mockReturnValue({
      miningSession: null,
      isLoading: false,
      error: null,
      startMining: mockStartMining,
      stopMining: mockStopMining
    });
  });

  describe('Rendering', () => {
    it('renders initial state correctly', () => {
      render(<MiningControls {...defaultProps} />);

      expect(screen.getByText('Mining Status: STOPPED')).toBeTruthy();
      expect(screen.getByText('Start Mining')).toBeTruthy();
      expect(screen.getByRole('region')).toHaveAccessibilityLabel('Mining Controls');
    });

    it('displays mining status when active', () => {
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: {
          status: MiningStatus.ACTIVE,
          miningRate: 0.25
        },
        isLoading: false,
        error: null,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      expect(screen.getByText('Mining Status: ACTIVE')).toBeTruthy();
      expect(screen.getByText('Mining Rate: 0.25 Pi/hour')).toBeTruthy();
      expect(screen.getByText('Stop Mining')).toBeTruthy();
    });

    it('shows loading state correctly', () => {
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: null,
        isLoading: true,
        error: null,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      expect(screen.getByAccessibilityLabel('Mining operation in progress')).toBeTruthy();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('displays error state properly', () => {
      const error = new Error('Mining failed');
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: null,
        isLoading: false,
        error,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      expect(screen.getByText(error.message)).toBeTruthy();
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  describe('Mining Controls', () => {
    it('handles start mining action', async () => {
      render(<MiningControls {...defaultProps} />);

      fireEvent.press(screen.getByText('Start Mining'));

      await waitFor(() => {
        expect(mockStartMining).toHaveBeenCalled();
      });
    });

    it('handles stop mining action', async () => {
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: {
          status: MiningStatus.ACTIVE,
          miningRate: 0.25
        },
        isLoading: false,
        error: null,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      fireEvent.press(screen.getByText('Stop Mining'));

      await waitFor(() => {
        expect(mockStopMining).toHaveBeenCalled();
      });
    });

    it('disables controls during loading', () => {
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: null,
        isLoading: true,
        error: null,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibilityState({ disabled: true, busy: true });
    });

    it('handles mining errors correctly', async () => {
      const error = new Error('Mining operation failed');
      mockStartMining.mockRejectedValue(error);

      render(<MiningControls {...defaultProps} />);

      fireEvent.press(screen.getByText('Start Mining'));

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('Accessibility', () => {
    it('announces mining status changes', async () => {
      const { rerender } = render(<MiningControls {...defaultProps} />);

      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: {
          status: MiningStatus.ACTIVE,
          miningRate: 0.25
        },
        isLoading: false,
        error: null,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      rerender(<MiningControls {...defaultProps} />);

      expect(screen.getByRole('region')).toHaveAccessibilityLabel('Mining Controls');
      expect(screen.getByRole('button')).toHaveAccessibilityLabel('Stop Pi mining');
    });

    it('provides error announcements', () => {
      const error = new Error('Mining failed');
      (usePiMining as jest.Mock).mockReturnValue({
        miningSession: null,
        isLoading: false,
        error,
        startMining: mockStartMining,
        stopMining: mockStopMining
      });

      render(<MiningControls {...defaultProps} />);

      expect(screen.getByRole('alert')).toHaveTextContent(error.message);
    });
  });

  describe('Performance', () => {
    it('handles rapid state changes efficiently', async () => {
      const { rerender } = render(<MiningControls {...defaultProps} />);

      // Simulate rapid mining status changes
      for (const status of [MiningStatus.ACTIVE, MiningStatus.PAUSED, MiningStatus.STOPPED]) {
        act(() => {
          (usePiMining as jest.Mock).mockReturnValue({
            miningSession: {
              status,
              miningRate: 0.25
            },
            isLoading: false,
            error: null,
            startMining: mockStartMining,
            stopMining: mockStopMining
          });
        });

        rerender(<MiningControls {...defaultProps} />);
        expect(screen.getByText(`Mining Status: ${status}`)).toBeTruthy();
      }
    });

    it('maintains UI responsiveness during mining operations', async () => {
      const { rerender } = render(<MiningControls {...defaultProps} />);

      // Simulate mining start with loading state
      act(() => {
        (usePiMining as jest.Mock).mockReturnValue({
          miningSession: null,
          isLoading: true,
          error: null,
          startMining: mockStartMining,
          stopMining: mockStopMining
        });
      });

      rerender(<MiningControls {...defaultProps} />);
      expect(screen.getByAccessibilityLabel('Mining operation in progress')).toBeTruthy();

      // Simulate mining active state
      act(() => {
        (usePiMining as jest.Mock).mockReturnValue({
          miningSession: {
            status: MiningStatus.ACTIVE,
            miningRate: 0.25
          },
          isLoading: false,
          error: null,
          startMining: mockStartMining,
          stopMining: mockStopMining
        });
      });

      rerender(<MiningControls {...defaultProps} />);
      expect(screen.getByText('Mining Rate: 0.25 Pi/hour')).toBeTruthy();
    });
  });
});