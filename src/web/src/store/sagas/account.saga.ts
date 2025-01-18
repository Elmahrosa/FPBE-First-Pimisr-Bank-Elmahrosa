/**
 * @fileoverview Enhanced Redux saga implementation for handling account-related side effects
 * in the FPBE mobile banking application with comprehensive security and monitoring.
 * @version 1.0.0
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeLatest, all, retry } from 'redux-saga/effects';
import { PerformanceMonitor } from '@performance/monitor'; // v2.0.0
import { Account, CreateAccountRequest, AccountType } from '../../types/account.types';
import { encryptPayload, validateResponse, createSecurityContext } from '../security/utils';
import { accountApi } from '../api/account.api';
import { cacheManager } from '../cache/cacheManager';
import { logger } from '../logging/logger';

// Action types for account operations
export const SAGA_ACTIONS = {
    FETCH_ACCOUNTS: 'accounts/fetchAccounts',
    CREATE_ACCOUNT: 'accounts/createAccount',
    FETCH_ACCOUNTS_SUCCESS: 'accounts/fetchAccountsSuccess',
    FETCH_ACCOUNTS_ERROR: 'accounts/fetchAccountsError',
    CREATE_ACCOUNT_SUCCESS: 'accounts/createAccountSuccess',
    CREATE_ACCOUNT_ERROR: 'accounts/createAccountError'
} as const;

// Security configuration
const SECURITY_CONFIG = {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY: '15m',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
} as const;

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
    TIMEOUT_MS: 5000,
    CACHE_TTL_MS: 300000,
    MONITORING_ENABLED: true
} as const;

/**
 * Enhanced saga for fetching user accounts with security, monitoring, and caching
 * @param {PayloadAction<string>} action - Action containing user ID
 */
export function* handleFetchAccounts(action: PayloadAction<string>) {
    const performanceMonitor = new PerformanceMonitor('fetchAccounts');
    const securityContext = yield call(createSecurityContext, action.payload);
    
    try {
        performanceMonitor.start();
        
        // Check cache first
        const cachedAccounts = yield call(cacheManager.get, `accounts_${action.payload}`);
        if (cachedAccounts) {
            yield put({ type: SAGA_ACTIONS.FETCH_ACCOUNTS_SUCCESS, payload: cachedAccounts });
            return;
        }

        // Fetch with retry mechanism
        const accounts: Account[] = yield retry(
            SECURITY_CONFIG.MAX_RETRIES,
            SECURITY_CONFIG.RETRY_DELAY,
            function* () {
                const response = yield call(accountApi.fetchAccounts, action.payload, securityContext);
                validateResponse(response);
                return response.data;
            }
        );

        // Cache successful response
        yield call(cacheManager.set, `accounts_${action.payload}`, accounts, PERFORMANCE_CONFIG.CACHE_TTL_MS);

        // Update performance metrics
        performanceMonitor.recordMetric('responseTime');
        performanceMonitor.recordMetric('cacheHitRate');

        yield put({ type: SAGA_ACTIONS.FETCH_ACCOUNTS_SUCCESS, payload: accounts });
        
        // Log successful operation
        logger.info('Accounts fetched successfully', { userId: action.payload });

    } catch (error) {
        logger.error('Error fetching accounts', { error, userId: action.payload });
        yield put({ 
            type: SAGA_ACTIONS.FETCH_ACCOUNTS_ERROR, 
            payload: error.message 
        });
        performanceMonitor.recordError(error);
    } finally {
        performanceMonitor.end();
        yield call(securityContext.cleanup);
    }
}

/**
 * Enhanced saga for creating new accounts with comprehensive validation and monitoring
 * @param {PayloadAction<CreateAccountRequest>} action - Action containing account creation details
 */
export function* handleCreateAccount(action: PayloadAction<CreateAccountRequest>) {
    const performanceMonitor = new PerformanceMonitor('createAccount');
    const securityContext = yield call(createSecurityContext, action.payload.userId);
    
    try {
        performanceMonitor.start();

        // Encrypt sensitive payload data
        const encryptedPayload = yield call(encryptPayload, action.payload, SECURITY_CONFIG.ENCRYPTION_ALGORITHM);

        // Create account with retry mechanism
        const newAccount: Account = yield retry(
            SECURITY_CONFIG.MAX_RETRIES,
            SECURITY_CONFIG.RETRY_DELAY,
            function* () {
                const response = yield call(accountApi.createAccount, encryptedPayload, securityContext);
                validateResponse(response);
                return response.data;
            }
        );

        // Invalidate relevant caches
        yield call(cacheManager.invalidate, `accounts_${action.payload.userId}`);

        // Update performance metrics
        performanceMonitor.recordMetric('responseTime');
        performanceMonitor.recordMetric('successRate');

        yield put({ type: SAGA_ACTIONS.CREATE_ACCOUNT_SUCCESS, payload: newAccount });
        
        // Log successful creation
        logger.info('Account created successfully', { 
            accountId: newAccount.id,
            userId: action.payload.userId 
        });

    } catch (error) {
        logger.error('Error creating account', { error, payload: action.payload });
        yield put({ 
            type: SAGA_ACTIONS.CREATE_ACCOUNT_ERROR, 
            payload: error.message 
        });
        performanceMonitor.recordError(error);
    } finally {
        performanceMonitor.end();
        yield call(securityContext.cleanup);
    }
}

/**
 * Root saga combining all account-related sagas with security and monitoring
 */
export function* accountSaga() {
    yield all([
        takeLatest(SAGA_ACTIONS.FETCH_ACCOUNTS, handleFetchAccounts),
        takeLatest(SAGA_ACTIONS.CREATE_ACCOUNT, handleCreateAccount)
    ]);
}

export default accountSaga;