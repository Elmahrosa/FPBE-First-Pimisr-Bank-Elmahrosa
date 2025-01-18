/**
 * @fileoverview Test suite for VirtualCard component
 * Verifies rendering, interactions, animations, accessibility, and theme support
 * @version 1.0.0
 */

import React from 'react';
import { render, fireEvent, act, waitFor, within, screen } from '@testing-library/react-native';
import { jest } from '@jest/globals';
import { axe } from 'axe-react-native';
import { ThemeProvider } from '@emotion/react';

import VirtualCard from '../../src/components/cards/VirtualCard';
import { Card, CardStatus, CardType, CardControls } from '../../src/types/card.types';
import createTheme from '../../src/styles/theme';

// Mock card data
const mockCard: Card = {
  id: 'test-card-id',
  cardNumber: '4111111111111111',
  cardholderName: 'John Doe',
  expiryDate: '12/25',
  cvv: '123',
  type: CardType.DEBIT,
  status: CardStatus.ACTIVE,
  controls: {
    onlinePurchases: true,
    internationalTransactions: false,
    atmWithdrawals: true,
    contactlessPayments: true,
    recurringPayments: false,
    geoRestrictions: [],
    merchantCategories: [],
    transactionLimits: {
      daily: 5000,
      monthly: 20000,
      perTransaction: 1000
    }
  },
  spendingLimit: 5000,
  currentSpending: 0,
  currency: 'USD',
  issuedAt: new Date('2023-01-01'),
  lastUsedAt: null,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

// Mock handlers
const mockHandlers = {
  onFlip: jest.fn(),
  onControlsChange: jest.fn(),
  onSecurityViolation: jest.fn()
};

// Test IDs for querying elements
const testIds = {
  cardFront: 'virtual-card-front',
  cardBack: 'virtual-card-back',
  controls: 'card-controls',
  securityFeatures: 'security-features'
};

// Custom render function with theme
const renderWithTheme = (ui: React.ReactNode, themeMode: 'light' | 'dark' = 'light') => {
  const theme = createTheme(themeMode);
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('VirtualCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all required props', () => {
      const { getByText, getByTestId } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
          testID="virtual-card"
        />
      );

      expect(getByTestId('virtual-card')).toBeTruthy();
      expect(getByText(mockCard.cardholderName)).toBeTruthy();
      expect(getByText(mockCard.type)).toBeTruthy();
      expect(getByText(mockCard.status)).toBeTruthy();
    });

    it('renders masked card number correctly', () => {
      const { getByText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const maskedNumber = '•••• •••• •••• 1111';
      expect(getByText(maskedNumber)).toBeTruthy();
    });

    it('applies correct theme styles', () => {
      const { getByTestId } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
          testID="virtual-card"
        />,
        'dark'
      );

      const card = getByTestId('virtual-card');
      expect(card).toHaveStyle({ backgroundColor: '#121212' });
    });
  });

  describe('Interactions', () => {
    it('handles card flip correctly', async () => {
      const { getByText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const flipButton = getByText('Show CVV');
      await act(async () => {
        fireEvent.press(flipButton);
      });

      expect(mockHandlers.onFlip).toHaveBeenCalledWith(true);
      expect(getByText('Back to Front')).toBeTruthy();
    });

    it('updates card controls correctly', async () => {
      const { getByTestId } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const controls = getByTestId(testIds.controls);
      const onlinePurchasesToggle = within(controls).getByRole('switch', { name: /online purchases/i });

      await act(async () => {
        fireEvent(onlinePurchasesToggle, 'valueChange', false);
      });

      expect(mockHandlers.onControlsChange).toHaveBeenCalledWith({
        ...mockCard.controls,
        onlinePurchases: false
      });
    });

    it('handles animation transitions smoothly', async () => {
      const { getByText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const flipButton = getByText('Show CVV');
      
      await act(async () => {
        fireEvent.press(flipButton);
      });

      await waitFor(() => {
        expect(getByText('Back to Front')).toBeTruthy();
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('provides proper screen reader support', () => {
      const { getByLabelText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      expect(getByLabelText(`Virtual ${mockCard.type} card`)).toBeTruthy();
      expect(getByLabelText(`Card number ending in ${mockCard.cardNumber.slice(-4)}`)).toBeTruthy();
      expect(getByLabelText(`Card status: ${mockCard.status.toLowerCase()}`)).toBeTruthy();
    });

    it('supports keyboard navigation', () => {
      const { getByRole } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const flipButton = getByRole('button', { name: /flip card/i });
      expect(flipButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid card data gracefully', () => {
      const invalidCard = { ...mockCard, cardNumber: '' };
      const { getByText } = renderWithTheme(
        <VirtualCard
          card={invalidCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      expect(getByText('•••• •••• •••• ••••')).toBeTruthy();
    });

    it('handles control update failures', async () => {
      const errorHandler = jest.fn();
      const { getByTestId } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={() => Promise.reject(new Error('Update failed'))}
          onError={errorHandler}
        />
      );

      const controls = getByTestId(testIds.controls);
      const toggle = within(controls).getByRole('switch', { name: /online purchases/i });

      await act(async () => {
        fireEvent(toggle, 'valueChange', false);
      });

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Security Features', () => {
    it('masks sensitive data correctly', () => {
      const { queryByText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      expect(queryByText(mockCard.cvv)).toBeNull();
      expect(queryByText(mockCard.cardNumber)).toBeNull();
    });

    it('requires confirmation for sensitive control changes', async () => {
      const { getByTestId, getByText } = renderWithTheme(
        <VirtualCard
          card={mockCard}
          onFlip={mockHandlers.onFlip}
          onControlsChange={mockHandlers.onControlsChange}
        />
      );

      const controls = getByTestId(testIds.controls);
      const internationalToggle = within(controls).getByRole('switch', { name: /international transactions/i });

      await act(async () => {
        fireEvent(internationalToggle, 'valueChange', true);
      });

      expect(getByText(/confirm changes/i)).toBeTruthy();
    });
  });
});