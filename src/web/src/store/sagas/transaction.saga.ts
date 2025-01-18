/**
 * @fileoverview Redux saga implementation for transaction-related side effects
 * Handles transaction creation, retrieval, and real-time updates with comprehensive
 * error handling and performance optimization
 * @version 2024.1
 */

import { 
    call, 
    put, 
    takeLatest, 
    all, 
    delay, 
    race,
    select 
} from 'redux-saga/effects'; // ^1.2.1
import { PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
    Transaction,
    CreateTransactionRequest,
    TransactionType,
    TransactionStatus,
    isPiTransaction,
    needsBlockchainConfirmation
} from '../../types/transaction.types';
import { 
    createTransaction,
    getTransaction,
    getAccountTransactions
} from '../../api/transaction.api';

// Action type constants
const TRANSACTION_ACTION_TYPES = {
    CREATE_TRANSACTION: 'transaction/createTransaction',
    CREATE_TRANSACTION_SUCCESS: 'transaction/createTransactionSuccess',
    CREATE_TRANSACTION_FAILURE: 'transaction/createTransactionFailure',
    GET_TRANSACTION: 'transaction/getTransaction',
    GET_TRANSACTION_SUCCESS: 'transaction/getTransactionSuccess',
    GET_TRANSACTION_FAILURE: 'transaction/getTransactionFailure',
    GET_ACCOUNT_TRANSACTIONS: 'transaction/getAccountTransactions',
    GET_ACCOUNT_TRANSACTIONS_SUCCESS: 'transaction/getAccountTransactionsSuccess',
    GET_ACCOUNT_TRANSACTIONS_FAILURE: 'transaction/getAccountTransactionsFailure',
    UPDATE_TRANSACTION_STATUS: 'transaction/updateTransactionStatus',
    ROLLBACK_TRANSACTION: 'transaction/rollbackTransaction'
} as const;

// Performance monitoring constants
const PERFORMANCE_THRESHOLDS = {
    TRANSACTION_CREATION: 3000, // 3 seconds as per requirements
    TRANSACTION_RETRIEVAL: 100, // 100ms as per requirements
    BLOCKCHAIN_CONFIRMATION: 15000 // 15 seconds for blockchain confirmation
};

/**
 * Saga handler for creating new transactions with optimistic updates and rollback support
 * @param action PayloadAction containing transaction creation request
 */
function* createTransactionSaga(action: PayloadAction<CreateTransactionRequest>) {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();

    try {
        // Optimistic update
        yield put({
            type: TRANSACTION_ACTION_TYPES.UPDATE_TRANSACTION_STATUS,
            payload: {
                id: requestId,
                status: TransactionStatus.PENDING,
                ...action.payload
            }
        });

        // Create transaction with retry mechanism
        const transaction: Transaction = yield call(createTransaction, action.payload);

        // Handle Pi Network specific transactions
        if (isPiTransaction(transaction)) {
            // Start blockchain confirmation monitoring
            const { confirmation, timeout } = yield race({
                confirmation: call(monitorBlockchainConfirmation, transaction.id),
                timeout: delay(PERFORMANCE_THRESHOLDS.BLOCKCHAIN_CONFIRMATION)
            });

            if (timeout) {
                throw new Error('Blockchain confirmation timeout');
            }
        }

        // Update transaction status
        yield put({
            type: TRANSACTION_ACTION_TYPES.CREATE_TRANSACTION_SUCCESS,
            payload: transaction
        });

        // Performance monitoring
        const duration = performance.now() - startTime;
        if (duration > PERFORMANCE_THRESHOLDS.TRANSACTION_CREATION) {
            console.warn(`Transaction creation exceeded performance threshold: ${duration}ms`);
        }

    } catch (error) {
        // Rollback optimistic update
        yield put({
            type: TRANSACTION_ACTION_TYPES.ROLLBACK_TRANSACTION,
            payload: requestId
        });

        yield put({
            type: TRANSACTION_ACTION_TYPES.CREATE_TRANSACTION_FAILURE,
            payload: {
                error: error instanceof Error ? error.message : 'Transaction creation failed',
                requestId
            }
        });
    }
}

/**
 * Saga handler for retrieving transaction details with caching and real-time updates
 * @param action PayloadAction containing transaction ID
 */
function* getTransactionSaga(action: PayloadAction<string>) {
    const startTime = performance.now();

    try {
        // Get transaction details
        const transaction: Transaction = yield call(getTransaction, action.payload);

        // Subscribe to real-time updates if transaction is pending
        if (needsBlockchainConfirmation(transaction)) {
            yield call(subscribeToTransactionUpdates, transaction.id);
        }

        yield put({
            type: TRANSACTION_ACTION_TYPES.GET_TRANSACTION_SUCCESS,
            payload: transaction
        });

        // Performance monitoring
        const duration = performance.now() - startTime;
        if (duration > PERFORMANCE_THRESHOLDS.TRANSACTION_RETRIEVAL) {
            console.warn(`Transaction retrieval exceeded performance threshold: ${duration}ms`);
        }

    } catch (error) {
        yield put({
            type: TRANSACTION_ACTION_TYPES.GET_TRANSACTION_FAILURE,
            payload: error instanceof Error ? error.message : 'Transaction retrieval failed'
        });
    }
}

/**
 * Saga handler for retrieving account transaction history with pagination
 * @param action PayloadAction containing account ID and optional filters
 */
function* getAccountTransactionsSaga(
    action: PayloadAction<{
        accountId: string;
        pageSize?: number;
        pageToken?: string;
        startDate?: string;
        endDate?: string;
        type?: TransactionType;
        status?: TransactionStatus;
    }>
) {
    try {
        const { transactions, nextPageToken, totalCount } = yield call(
            getAccountTransactions,
            action.payload.accountId,
            {
                pageSize: action.payload.pageSize,
                pageToken: action.payload.pageToken,
                startDate: action.payload.startDate,
                endDate: action.payload.endDate,
                type: action.payload.type,
                status: action.payload.status
            }
        );

        yield put({
            type: TRANSACTION_ACTION_TYPES.GET_ACCOUNT_TRANSACTIONS_SUCCESS,
            payload: { transactions, nextPageToken, totalCount }
        });

    } catch (error) {
        yield put({
            type: TRANSACTION_ACTION_TYPES.GET_ACCOUNT_TRANSACTIONS_FAILURE,
            payload: error instanceof Error ? error.message : 'Failed to retrieve transactions'
        });
    }
}

/**
 * Helper generator to monitor blockchain confirmation status
 * @param transactionId Transaction ID to monitor
 */
function* monitorBlockchainConfirmation(transactionId: string) {
    while (true) {
        const transaction: Transaction = yield call(getTransaction, transactionId);
        
        if (transaction.status === TransactionStatus.BLOCKCHAIN_CONFIRMED) {
            return transaction;
        }
        
        if (transaction.status === TransactionStatus.FAILED) {
            throw new Error('Blockchain confirmation failed');
        }
        
        yield delay(5000); // Poll every 5 seconds
    }
}

/**
 * Helper generator to subscribe to real-time transaction updates
 * @param transactionId Transaction ID to monitor
 */
function* subscribeToTransactionUpdates(transactionId: string) {
    const socket = new WebSocket(`${process.env.REACT_APP_WS_URL}/transactions/${transactionId}`);

    try {
        while (true) {
            const { data } = yield new Promise((resolve, reject) => {
                socket.onmessage = resolve;
                socket.onerror = reject;
            });

            const update = JSON.parse(data);
            yield put({
                type: TRANSACTION_ACTION_TYPES.UPDATE_TRANSACTION_STATUS,
                payload: update
            });

            if (update.status === TransactionStatus.COMPLETED || 
                update.status === TransactionStatus.FAILED) {
                break;
            }
        }
    } finally {
        socket.close();
    }
}

/**
 * Root saga that watches for transaction-related actions
 */
export default function* watchTransactionSagas() {
    yield all([
        takeLatest(TRANSACTION_ACTION_TYPES.CREATE_TRANSACTION, createTransactionSaga),
        takeLatest(TRANSACTION_ACTION_TYPES.GET_TRANSACTION, getTransactionSaga),
        takeLatest(TRANSACTION_ACTION_TYPES.GET_ACCOUNT_TRANSACTIONS, getAccountTransactionsSaga)
    ]);
}