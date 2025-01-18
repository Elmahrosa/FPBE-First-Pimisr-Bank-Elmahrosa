/**
 * @fileoverview Redux reducer for managing account state in the FPBE mobile banking application
 * with enhanced error handling, optimistic updates, and performance optimizations.
 * @version 2023.1
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { AccountState, LoadingState, ErrorState } from '../types';
import { Account, AccountType, AccountStatus } from '../../types/account.types';

/**
 * Initial state for account management with comprehensive error tracking
 */
const initialState: AccountState = {
  accounts: [],
  selectedAccount: null,
  loading: {
    isLoading: false,
    operation: null
  },
  error: null,
  lastUpdated: 0
};

/**
 * Enhanced account reducer with optimistic updates and granular error handling
 */
export default createReducer(initialState, (builder) => {
  builder
    // Fetch Accounts Actions
    .addCase('accounts/fetchAccounts/pending', (state) => {
      state.loading = {
        isLoading: true,
        operation: 'FETCH_ACCOUNTS'
      };
      state.error = null;
    })
    .addCase('accounts/fetchAccounts/fulfilled', (state, action: PayloadAction<Account[]>) => {
      // Performance optimization: Only update if data has changed
      const hasChanges = JSON.stringify(state.accounts) !== JSON.stringify(action.payload);
      if (hasChanges) {
        state.accounts = action.payload;
        state.lastUpdated = Date.now();
      }
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = null;
    })
    .addCase('accounts/fetchAccounts/rejected', (state, action: PayloadAction<ErrorState>) => {
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = {
        code: action.payload.code,
        message: action.payload.message,
        operation: 'FETCH_ACCOUNTS'
      };
    })

    // Create Account Actions
    .addCase('accounts/createAccount/pending', (state) => {
      state.loading = {
        isLoading: true,
        operation: 'CREATE_ACCOUNT'
      };
      state.error = null;
    })
    .addCase('accounts/createAccount/fulfilled', (state, action: PayloadAction<Account>) => {
      // Optimistic update with validation
      if (action.payload.id && action.payload.status === AccountStatus.ACTIVE) {
        state.accounts.push(action.payload);
        state.lastUpdated = Date.now();
      }
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = null;
    })
    .addCase('accounts/createAccount/rejected', (state, action: PayloadAction<ErrorState>) => {
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = {
        code: action.payload.code,
        message: action.payload.message,
        operation: 'CREATE_ACCOUNT'
      };
    })

    // Update Account Actions
    .addCase('accounts/updateAccount/pending', (state) => {
      state.loading = {
        isLoading: true,
        operation: 'UPDATE_ACCOUNT'
      };
      state.error = null;
    })
    .addCase('accounts/updateAccount/fulfilled', (state, action: PayloadAction<Account>) => {
      // Optimistic update with validation
      const index = state.accounts.findIndex(acc => acc.id === action.payload.id);
      if (index !== -1) {
        state.accounts[index] = action.payload;
        // Update selected account if it was updated
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
        state.lastUpdated = Date.now();
      }
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = null;
    })
    .addCase('accounts/updateAccount/rejected', (state, action: PayloadAction<ErrorState>) => {
      state.loading = {
        isLoading: false,
        operation: null
      };
      state.error = {
        code: action.payload.code,
        message: action.payload.message,
        operation: 'UPDATE_ACCOUNT'
      };
    })

    // Select Account Action
    .addCase('accounts/selectAccount', (state, action: PayloadAction<string>) => {
      const account = state.accounts.find(acc => acc.id === action.payload);
      if (account && account.status === AccountStatus.ACTIVE) {
        state.selectedAccount = account;
      }
    })

    // Clear Account Error Action
    .addCase('accounts/clearError', (state) => {
      state.error = null;
    })

    // Balance Update Action (WebSocket)
    .addCase('accounts/balanceUpdate', (state, action: PayloadAction<{ id: string; balance: number }>) => {
      const account = state.accounts.find(acc => acc.id === action.payload.id);
      if (account) {
        account.balance = action.payload.balance;
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount.balance = action.payload.balance;
        }
        state.lastUpdated = Date.now();
      }
    })

    // Account Status Update Action
    .addCase('accounts/statusUpdate', (state, action: PayloadAction<{ id: string; status: AccountStatus }>) => {
      const account = state.accounts.find(acc => acc.id === action.payload.id);
      if (account) {
        account.status = action.payload.status;
        // Clear selected account if it becomes inactive
        if (state.selectedAccount?.id === action.payload.id && action.payload.status !== AccountStatus.ACTIVE) {
          state.selectedAccount = null;
        }
        state.lastUpdated = Date.now();
      }
    });
});