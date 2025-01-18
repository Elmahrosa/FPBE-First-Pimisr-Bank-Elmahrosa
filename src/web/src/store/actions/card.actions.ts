import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // v1.9.5
import { Card, CardControls, CardStatus, CardType } from '../../types/card.types';
import { api } from '../../services/api';
import { RootState } from '../store';
import { logger } from '../../utils/logger';
import { cardCache } from '../../utils/cache';

// Error types for better error handling
interface CardError {
  code: string;
  message: string;
  details?: any;
}

// Pagination params interface
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Card creation params interface
interface CardCreationParams {
  type: CardType;
  spendingLimit: number;
  currency: string;
  controls?: Partial<CardControls>;
}

// Action creators for optimistic updates
export const setCardLoading = createAction<string>('cards/setLoading');
export const clearCardError = createAction('cards/clearError');
export const invalidateCardCache = createAction('cards/invalidateCache');

/**
 * Fetch user's virtual cards with pagination and caching
 */
export const fetchCards = createAsyncThunk<
  { cards: Card[]; total: number },
  PaginationParams,
  { state: RootState; rejectValue: CardError }
>(
  'cards/fetchCards',
  async (params: PaginationParams, { rejectWithValue, getState }) => {
    try {
      // Check cache first
      const cacheKey = `cards_${params.page}_${params.limit}`;
      const cachedData = await cardCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      // Validate pagination parameters
      if (params.page < 0 || params.limit <= 0 || params.limit > 100) {
        throw new Error('Invalid pagination parameters');
      }

      // Make API call with retry logic
      const response = await api.get('/cards', {
        params,
        timeout: 5000,
        retries: 3,
      });

      // Cache the response
      await cardCache.set(cacheKey, response.data, 300); // 5 minutes cache

      // Log telemetry
      logger.info('Cards fetched successfully', {
        count: response.data.cards.length,
        page: params.page,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch cards', { error });
      return rejectWithValue({
        code: 'FETCH_CARDS_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * Create a new virtual card with enhanced validation
 */
export const createCard = createAsyncThunk<
  Card,
  CardCreationParams,
  { state: RootState; rejectValue: CardError }
>(
  'cards/createCard',
  async (params: CardCreationParams, { rejectWithValue, getState }) => {
    try {
      // Validate card creation parameters
      if (params.spendingLimit <= 0) {
        throw new Error('Invalid spending limit');
      }

      // Check user's card creation limits
      const state = getState();
      const existingCards = state.cards.items.length;
      if (existingCards >= 5) {
        throw new Error('Maximum card limit reached');
      }

      // Create card with security headers
      const response = await api.post('/cards', params, {
        headers: {
          'X-Security-Context': 'card-creation',
        },
        timeout: 10000,
      });

      // Log audit trail
      logger.audit('Virtual card created', {
        cardId: response.data.id,
        type: params.type,
      });

      // Invalidate cache
      await cardCache.invalidate(/^cards_/);

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create card', { error, params });
      return rejectWithValue({
        code: 'CREATE_CARD_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * Update card control settings with validation and debouncing
 */
export const updateCardControls = createAsyncThunk<
  Card,
  { cardId: string; controls: CardControls },
  { state: RootState; rejectValue: CardError }
>(
  'cards/updateCardControls',
  async ({ cardId, controls }, { rejectWithValue }) => {
    try {
      // Validate control settings
      if (controls.transactionLimits.daily <= 0 || 
          controls.transactionLimits.monthly <= 0) {
        throw new Error('Invalid transaction limits');
      }

      // Update controls with debouncing
      const response = await api.patch(
        `/cards/${cardId}/controls`,
        { controls },
        {
          headers: {
            'X-Security-Context': 'card-controls-update',
          },
          debounce: 1000, // 1 second debounce
          timeout: 5000,
        }
      );

      // Log control changes
      logger.audit('Card controls updated', {
        cardId,
        controls: controls,
      });

      // Invalidate specific card cache
      await cardCache.invalidate(`card_${cardId}`);

      return response.data;
    } catch (error: any) {
      logger.error('Failed to update card controls', { error, cardId });
      return rejectWithValue({
        code: 'UPDATE_CONTROLS_ERROR',
        message: error.message,
      });
    }
  }
);

/**
 * Update card status with retry logic and validation
 */
export const updateCardStatus = createAsyncThunk<
  Card,
  { cardId: string; status: CardStatus },
  { state: RootState; rejectValue: CardError }
>(
  'cards/updateCardStatus',
  async ({ cardId, status }, { rejectWithValue, getState }) => {
    try {
      // Validate status transition
      const state = getState();
      const card = state.cards.items.find(c => c.id === cardId);
      if (!card) {
        throw new Error('Card not found');
      }

      // Validate status transition rules
      if (!isValidStatusTransition(card.status, status)) {
        throw new Error('Invalid status transition');
      }

      // Update status with retry logic
      const response = await api.patch(
        `/cards/${cardId}/status`,
        { status },
        {
          headers: {
            'X-Security-Context': 'card-status-update',
          },
          timeout: 5000,
          retry: {
            retries: 3,
            backoff: {
              min: 1000,
              max: 5000,
              factor: 2,
            },
          },
        }
      );

      // Log status change
      logger.audit('Card status updated', {
        cardId,
        oldStatus: card.status,
        newStatus: status,
      });

      // Invalidate specific card cache
      await cardCache.invalidate(`card_${cardId}`);

      return response.data;
    } catch (error: any) {
      logger.error('Failed to update card status', { error, cardId });
      return rejectWithValue({
        code: 'UPDATE_STATUS_ERROR',
        message: error.message,
      });
    }
  }
);

// Helper function to validate status transitions
function isValidStatusTransition(currentStatus: CardStatus, newStatus: CardStatus): boolean {
  const allowedTransitions: Record<CardStatus, CardStatus[]> = {
    [CardStatus.PENDING_ACTIVATION]: [CardStatus.ACTIVE, CardStatus.CANCELLED],
    [CardStatus.ACTIVE]: [CardStatus.INACTIVE, CardStatus.BLOCKED, CardStatus.SUSPENDED],
    [CardStatus.INACTIVE]: [CardStatus.ACTIVE, CardStatus.CANCELLED],
    [CardStatus.BLOCKED]: [CardStatus.ACTIVE, CardStatus.CANCELLED],
    [CardStatus.SUSPENDED]: [CardStatus.ACTIVE, CardStatus.CANCELLED],
    [CardStatus.EXPIRED]: [CardStatus.CANCELLED],
    [CardStatus.CANCELLED]: [],
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}