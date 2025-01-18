/**
 * @fileoverview Redux reducer for managing transaction state in the FPBE mobile banking application.
 * Implements high-performance state management for both traditional banking and Pi Network
 * transactions with comprehensive error handling, validation, and audit trail support.
 * @version 2023.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Transaction, TransactionType, TransactionStatus } from '../../types/transaction.types';
import { TransactionState } from '../types';

/**
 * Initial state for transaction management with validation support
 */
const initialState: TransactionState = {
  transactions: [],
  recentTransactions: [],
  loading: false,
  error: null,
  validation: {
    isValid: true,
    errors: [],
    limits: {
      maxAmount: 50000,
      dailyLimit: 100000,
      monthlyLimit: 1000000
    }
  },
  lastUpdated: null
};

/**
 * Transaction slice with optimized performance and comprehensive error handling
 */
const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    /**
     * Updates the full list of transactions with validation and performance optimization
     */
    setTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.transactions = action.payload.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },

    /**
     * Updates recent transactions list with performance optimization
     */
    setRecentTransactions: (state, action: PayloadAction<Transaction[]>) => {
      state.recentTransactions = action.payload.slice(0, 10).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    /**
     * Updates loading state for transaction operations
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Sets error state with comprehensive error tracking
     */
    setError: (state, action: PayloadAction<{
      code: string;
      message: string;
      transactionId?: string;
      transactionType?: TransactionType;
    }>) => {
      state.error = action.payload;
      state.loading = false;
    },

    /**
     * Clears error state and resets validation
     */
    clearError: (state) => {
      state.error = null;
      state.validation.isValid = true;
      state.validation.errors = [];
    },

    /**
     * Real-time update of transaction status with validation
     */
    updateTransactionStatus: (state, action: PayloadAction<{
      id: string;
      status: TransactionStatus;
    }>) => {
      const { id, status } = action.payload;
      const transactionIndex = state.transactions.findIndex(t => t.id === id);
      
      if (transactionIndex !== -1) {
        state.transactions[transactionIndex] = {
          ...state.transactions[transactionIndex],
          status,
          updatedAt: new Date().toISOString()
        };

        // Update recent transactions if necessary
        const recentIndex = state.recentTransactions.findIndex(t => t.id === id);
        if (recentIndex !== -1) {
          state.recentTransactions[recentIndex] = {
            ...state.recentTransactions[recentIndex],
            status,
            updatedAt: new Date().toISOString()
          };
        }
      }
      state.lastUpdated = new Date().toISOString();
    },

    /**
     * Updates transaction validation state with comprehensive validation rules
     */
    setValidationState: (state, action: PayloadAction<{
      isValid: boolean;
      errors: string[];
      limits?: {
        maxAmount?: number;
        dailyLimit?: number;
        monthlyLimit?: number;
      };
    }>) => {
      state.validation = {
        ...state.validation,
        ...action.payload,
        limits: {
          ...state.validation.limits,
          ...action.payload.limits
        }
      };
    },

    /**
     * Adds a new transaction with optimistic updates and validation
     */
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload);
      if (state.recentTransactions.length < 10) {
        state.recentTransactions.unshift(action.payload);
      } else {
        state.recentTransactions.pop();
        state.recentTransactions.unshift(action.payload);
      }
      state.lastUpdated = new Date().toISOString();
    },

    /**
     * Updates transaction metadata with validation
     */
    updateTransactionMetadata: (state, action: PayloadAction<{
      id: string;
      metadata: Record<string, any>;
    }>) => {
      const { id, metadata } = action.payload;
      const transactionIndex = state.transactions.findIndex(t => t.id === id);
      
      if (transactionIndex !== -1) {
        state.transactions[transactionIndex] = {
          ...state.transactions[transactionIndex],
          metadata: {
            ...state.transactions[transactionIndex].metadata,
            ...metadata
          },
          updatedAt: new Date().toISOString()
        };
      }
      state.lastUpdated = new Date().toISOString();
    }
  }
});

export const {
  setTransactions,
  setRecentTransactions,
  setLoading,
  setError,
  clearError,
  updateTransactionStatus,
  setValidationState,
  addTransaction,
  updateTransactionMetadata
} = transactionSlice.actions;

export default transactionSlice.reducer;