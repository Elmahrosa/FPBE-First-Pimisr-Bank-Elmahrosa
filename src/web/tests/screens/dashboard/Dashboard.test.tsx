/**
 * @fileoverview Comprehensive test suite for the Dashboard screen component
 * Tests component rendering, real-time updates, accessibility, error handling, and performance
 * @version 2024.1
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { axe } from '@axe-core/react';
import { useDispatch, useSelector } from '../../../store/store';
import Dashboard from '../../../src/screens/dashboard/Dashboard';
import ErrorBoundary from '../../../src/components/common/ErrorBoundary';
import { Account, AccountType, AccountStatus } from '../../../types/account.types';
import { MiningStatus } from '../../../types/pi.types';

// Mock dependencies
jest.mock('../../../store/store', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { primary: '#FFFFFF' },
        semantic: { action: { primary: '#1E3A8A' } }
      }
    }
  })
}));

// Mock WebSocket for real-time updates testing
const mockWebSocket = {
  onmessage: jest.fn(),
  send: jest.fn(),
  close: jest.fn()
};
global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Mock performance observer
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn()
};
global.PerformanceObserver = jest.fn(() => mockPerformanceObserver);

describe('Dashboard Screen', () => {
  // Test data
  const mockAccount: Account = {
    id: '123',
    userId: 'user123',
    accountType: AccountType.SAVINGS,
    balance: 1000.00,
    currency: 'USD',
    status: AccountStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockMiningStatus = {
    status: MiningStatus.ACTIVE,
    miningRate: 0.25,
    totalMined: 100
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useDispatch as jest.Mock).mockReturnValue(jest.fn());
    (useSelector as jest.Mock).mockImplementation((selector) => {
      const state = {
        accounts: {
          accounts: [mockAccount],
          selectedAccount: mockAccount,
          loading: false,
          error: null
        },
        pi: {
          miningStatus: mockMiningStatus,
          loading: false,
          error: null
        }
      };
      return selector(state);
    });
  });

  describe('Component Rendering', () => {
    it('renders dashboard with all required components', () => {
      const { getByTestId } = render(
        <Dashboard userId="user123" />
      );

      expect(getByTestId('dashboard-screen')).toBeTruthy();
      expect(getByTestId('account-balance')).toBeTruthy();
      expect(getByTestId('mining-status')).toBeTruthy();
    });

    it('displays loading spinner when data is loading', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => ({
        accounts: { loading: true },
        pi: { loading: true }
      }));

      const { getByTestId } = render(
        <Dashboard userId="user123" />
      );

      expect(getByTestId('dashboard-loading')).toBeTruthy();
    });

    it('handles empty account state gracefully', () => {
      (useSelector as jest.Mock).mockImplementation((selector) => ({
        accounts: { accounts: [], loading: false },
        pi: { miningStatus: null, loading: false }
      }));

      const { queryByTestId } = render(
        <Dashboard userId="user123" />
      );

      expect(queryByTestId('account-balance')).toBeNull();
    });
  });

  describe('Real-time Updates', () => {
    it('updates account balance when WebSocket message received', async () => {
      const { getByTestId } = render(
        <Dashboard userId="user123" />
      );

      // Simulate WebSocket balance update
      act(() => {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'BALANCE_UPDATE',
            data: { accountId: '123', balance: 1500.00 }
          })
        });
      });

      await waitFor(() => {
        expect(getByTestId('account-balance')).toHaveTextContent('$1,500.00');
      });
    });

    it('updates mining status in real-time', async () => {
      const { getByTestId } = render(
        <Dashboard userId="user123" />
      );

      act(() => {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: 'MINING_STATUS_UPDATE',
            data: { status: MiningStatus.ACTIVE, miningRate: 0.5 }
          })
        });
      });

      await waitFor(() => {
        expect(getByTestId('mining-status')).toHaveTextContent('0.5 Pi/hr');
      });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 AA requirements', async () => {
      const { container } = render(
        <Dashboard userId="user123" />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper screen reader support', () => {
      const { getByRole } = render(
        <Dashboard userId="user123" />
      );

      expect(getByRole('scrollView')).toHaveAccessibilityLabel('Dashboard main content');
      expect(getByRole('button', { name: 'Pull to refresh dashboard' })).toBeTruthy();
    });

    it('handles keyboard navigation correctly', () => {
      const { getAllByRole } = render(
        <Dashboard userId="user123" />
      );

      const interactiveElements = getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).toHaveFocus();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error boundary fallback on component error', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');

      (useSelector as jest.Mock).mockImplementation(() => {
        throw error;
      });

      const { getByText } = render(
        <ErrorBoundary>
          <Dashboard userId="user123" />
        </ErrorBoundary>
      );

      expect(getByText(/Something went wrong/i)).toBeTruthy();
      errorSpy.mockRestore();
    });

    it('handles API errors gracefully', async () => {
      const mockError = { code: 'API_ERROR', message: 'Failed to fetch data' };
      (useSelector as jest.Mock).mockImplementation((selector) => ({
        accounts: { error: mockError },
        pi: { error: null }
      }));

      const { getByText } = render(
        <Dashboard userId="user123" />
      );

      expect(getByText(/Failed to fetch data/i)).toBeTruthy();
    });

    it('recovers from network errors with retry', async () => {
      const mockDispatch = jest.fn();
      (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

      const { getByText } = render(
        <Dashboard userId="user123" />
      );

      fireEvent.press(getByText(/Retry/i));

      expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Performance', () => {
    it('renders initial content within performance budget', async () => {
      const startTime = performance.now();

      render(<Dashboard userId="user123" />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms budget as per requirements
    });

    it('handles updates within performance threshold', async () => {
      const { rerender } = render(
        <Dashboard userId="user123" />
      );

      const startTime = performance.now();

      act(() => {
        rerender(<Dashboard userId="user123" />);
      });

      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(50); // 50ms update threshold
    });

    it('optimizes memory usage during updates', async () => {
      const { rerender } = render(
        <Dashboard userId="user123" />
      );

      const initialMemory = performance.memory?.usedJSHeapSize;

      // Simulate multiple updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          rerender(<Dashboard userId="user123" />);
        });
      }

      const finalMemory = performance.memory?.usedJSHeapSize;
      expect(finalMemory - initialMemory).toBeLessThan(1000000); // 1MB threshold
    });
  });
});