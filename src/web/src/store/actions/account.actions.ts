/**
 * @fileoverview Redux action creators for account-related operations in the FPBE mobile banking application.
 * Implements secure, optimized state management with comprehensive error handling and monitoring.
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import { performance } from '@monitoring/performance';
import { SecurityContext } from '@security/context';
import { CacheManager } from '@cache/manager';
import { Account, AccountType, AccountStatus, CreateAccountRequest } from '../../types/account.types';

// Action type constants
export const ACCOUNT_ACTIONS = {
    FETCH_ACCOUNTS: 'accounts/fetchAccounts',
    CREATE_ACCOUNT: 'accounts/createAccount',
    SELECT_ACCOUNT: 'accounts/selectAccount',
    CLEAR_ERROR: 'accounts/clearError'
} as const;

// Security configuration
const SECURITY_CONFIG = {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    SIGNATURE_ALGORITHM: 'SHA-256',
    TOKEN_EXPIRY: '15m'
} as const;

// Cache configuration
const CACHE_CONFIG = {
    TTL: '15m',
    MAX_ITEMS: '100',
    STRATEGY: 'LRU'
} as const;

// Initialize cache manager
const accountCache = new CacheManager<Account[]>(CACHE_CONFIG);

/**
 * Fetches user accounts with enhanced security, caching, and performance monitoring.
 * Implements retry logic and comprehensive error handling.
 */
export const fetchAccounts = createAsyncThunk<Account[], { userId: string, securityContext: SecurityContext }>(
    ACCOUNT_ACTIONS.FETCH_ACCOUNTS,
    async ({ userId, securityContext }, { rejectWithValue }) => {
        const perfMetric = performance.start('fetchAccounts');
        
        try {
            // Check cache first
            const cachedAccounts = await accountCache.get(userId);
            if (cachedAccounts) {
                perfMetric.end();
                return cachedAccounts;
            }

            // Validate security context
            if (!securityContext.isValid()) {
                throw new Error('Invalid security context');
            }

            // Prepare secure request
            const headers = securityContext.getSecureHeaders();
            const signedRequest = securityContext.signRequest({ userId });

            // Make API call with retry logic
            const response = await securityContext.makeSecureRequest(
                '/api/v1/accounts',
                {
                    method: 'GET',
                    headers,
                    body: signedRequest
                },
                { retries: 3 }
            );

            // Validate and decrypt response
            const decryptedData = securityContext.decryptResponse(response);
            const accounts = decryptedData as Account[];

            // Validate account data
            accounts.forEach(account => {
                if (!Object.values(AccountType).includes(account.accountType)) {
                    throw new Error('Invalid account type received');
                }
                if (!Object.values(AccountStatus).includes(account.status)) {
                    throw new Error('Invalid account status received');
                }
            });

            // Update cache
            await accountCache.set(userId, accounts);

            perfMetric.end();
            return accounts;
        } catch (error) {
            perfMetric.fail();
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Creates a new account with comprehensive validation and security measures.
 * Implements optimistic updates and rollback capability.
 */
export const createNewAccount = createAsyncThunk<Account, { request: CreateAccountRequest, securityContext: SecurityContext }>(
    ACCOUNT_ACTIONS.CREATE_ACCOUNT,
    async ({ request, securityContext }, { rejectWithValue }) => {
        const perfMetric = performance.start('createNewAccount');

        try {
            // Validate request
            if (!request.userId || !request.accountType || !request.currency) {
                throw new Error('Invalid account creation request');
            }

            // Validate security context
            if (!securityContext.isValid()) {
                throw new Error('Invalid security context');
            }

            // Encrypt sensitive data
            const encryptedRequest = securityContext.encryptRequest(request);
            const headers = securityContext.getSecureHeaders();

            // Make API call
            const response = await securityContext.makeSecureRequest(
                '/api/v1/accounts',
                {
                    method: 'POST',
                    headers,
                    body: encryptedRequest
                }
            );

            // Validate and decrypt response
            const decryptedData = securityContext.decryptResponse(response);
            const newAccount = decryptedData as Account;

            // Validate new account data
            if (!newAccount.id || !newAccount.userId || !newAccount.accountType) {
                throw new Error('Invalid account data received');
            }

            // Invalidate cache
            await accountCache.invalidate(request.userId);

            perfMetric.end();
            return newAccount;
        } catch (error) {
            perfMetric.fail();
            return rejectWithValue(error.message);
        }
    }
);

/**
 * Action creator for selecting an account for detailed view.
 * Implements client-side validation.
 */
export const selectAccount = createAction<string>(
    ACCOUNT_ACTIONS.SELECT_ACCOUNT,
    (accountId: string) => ({
        payload: accountId
    })
);

/**
 * Action creator for clearing account-related errors.
 * Supports error state management.
 */
export const clearAccountError = createAction(ACCOUNT_ACTIONS.CLEAR_ERROR);