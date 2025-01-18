import { createReducer } from '@reduxjs/toolkit'; // v1.9.5
import { Card, CardStatus } from '../../types/card.types';
import { 
  fetchCards, 
  createCard, 
  updateCardControls, 
  updateCardStatus 
} from '../actions/card.actions';

/**
 * Interface defining the comprehensive card slice state structure
 */
export interface CardState {
  cards: Card[];
  selectedCard: Card | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    currentPage: number;
  };
}

/**
 * Initial state for the card reducer with proper type safety
 */
const initialState: CardState = {
  cards: [],
  selectedCard: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    currentPage: 1
  }
};

/**
 * Redux reducer for managing virtual card state with comprehensive error handling
 * and loading states using Redux Toolkit's createReducer
 */
const cardReducer = createReducer(initialState, (builder) => {
  builder
    // Fetch Cards Handlers
    .addCase(fetchCards.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(fetchCards.fulfilled, (state, action) => {
      state.loading = false;
      state.cards = action.payload.cards;
      state.pagination.total = action.payload.total;
      state.error = null;
      
      // Maintain selected card reference after refresh
      if (state.selectedCard) {
        state.selectedCard = action.payload.cards.find(
          card => card.id === state.selectedCard?.id
        ) || null;
      }
    })
    .addCase(fetchCards.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to fetch cards';
    })

    // Create Card Handlers
    .addCase(createCard.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(createCard.fulfilled, (state, action) => {
      state.loading = false;
      state.cards.push(action.payload);
      state.selectedCard = action.payload;
      state.error = null;
      state.pagination.total += 1;
    })
    .addCase(createCard.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to create card';
    })

    // Update Card Controls Handlers
    .addCase(updateCardControls.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(updateCardControls.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      
      // Update card in cards array
      const index = state.cards.findIndex(card => card.id === action.payload.id);
      if (index !== -1) {
        state.cards[index] = action.payload;
        
        // Update selected card if it's the one being modified
        if (state.selectedCard?.id === action.payload.id) {
          state.selectedCard = action.payload;
        }
      }
    })
    .addCase(updateCardControls.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to update card controls';
    })

    // Update Card Status Handlers
    .addCase(updateCardStatus.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(updateCardStatus.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      
      // Update card in cards array
      const index = state.cards.findIndex(card => card.id === action.payload.id);
      if (index !== -1) {
        state.cards[index] = action.payload;
        
        // Update selected card if it's the one being modified
        if (state.selectedCard?.id === action.payload.id) {
          state.selectedCard = action.payload;
        }

        // If card is cancelled, deselect it
        if (action.payload.status === CardStatus.CANCELLED) {
          state.selectedCard = null;
        }
      }
    })
    .addCase(updateCardStatus.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to update card status';
    });
});

export default cardReducer;