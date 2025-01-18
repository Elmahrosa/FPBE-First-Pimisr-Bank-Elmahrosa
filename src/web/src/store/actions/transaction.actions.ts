/**
 * @fileoverview Redux action creators and thunks for transaction management in FPBE mobile banking.
 * Implements secure transaction processing, real-time tracking, and Pi Network integration.
 * @version 2023.1
 */

import { createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import { retry } from 'axios-retry'; // ^3.5.0
import { SecurityLogger } from '@security/logger'; // ^1.0.0

import {
  Transaction,
  CreateTransactionRequest,
  TransactionType,
  TransactionStatus,
  isPiTransaction,
  isFinalStatus,
  needsBlockchainConfirmation
} from '../../types/transaction.types';

import {
  setTransactions,
  setRecentTransactions,
  setLoading,
  setError,
  updateTransactionStatus,
  setValidationState,
  addTransaction,
  updateTransactionMetadata
} from '../reducers/transaction.reducer';

// Action type constants
export const TRANSACTION_ACTION_TYPES = {
  CREATE_TRANSACTION: 'transaction/createTransaction',
  GET_TRANSACTION: 'transaction/getTransaction',
  GET_ACCOUNT_TRANSACTIONS: 'transaction/getAccountTransactions',
  CREATE_PI_TRANSACTION: 'transaction/createPiTransaction',
  GET_PI_TRANSACTION: 'transaction/getPiTransaction'
} as const;

// Performance thresholds (ms)
const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME: 100,
  TRANSACTION_COMPLETION_TIME: 3000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000
} as const;

/**
 * Creates a new transaction with enhanced security validation and performance monitoring
 */
export const createTransactionThunk = createAsyncThunk(
  TRANSACTION_ACTION_TYPES.CREATE_TRANSACTION,
  async (request: CreateTransactionRequest, { dispatch, rejectWithValue }) => {
    const startTime = performance.now();
    const securityLogger = new SecurityLogger('TransactionService');

    try {
      // Set loading state
      dispatch(setLoading(true));

      // Validate transaction request
      const validationResult = validateTransactionRequest(request);
      if (!validationResult.isValid) {
        dispatch(setValidationState({
          isValid: false,
          errors: validationResult.errors
        }));
        return rejectWithValue({
          code: 'VALIDATION_ERROR',
          message: 'Transaction validation failed',
          details: validationResult.errors
        });
      }

      // Log transaction initiation
      securityLogger.logSecurityEvent({
        eventType: 'TRANSACTION_INITIATED',
        metadata: {
          type: request.type,
          amount: request.amount,
          currency: request.currency
        }
      });

      // Create transaction with retry mechanism
      const transaction = await retry(
        async () => {
          const response = await createTransaction(request);
          const responseTime = performance.now() - startTime;

          // Log performance metrics
          if (responseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME) {
            securityLogger.logPerformanceIssue({
              operation: 'createTransaction',
              responseTime,
              threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
            });
          }

          return response;
        },
        {
          retries: PERFORMANCE_THRESHOLDS.RETRY_COUNT,
          retryDelay: PERFORMANCE_THRESHOLDS.RETRY_DELAY,
          retryCondition: (error) => error.isRetryable
        }
      );

      // Handle Pi Network specific logic
      if (isPiTransaction(transaction)) {
        dispatch(updateTransactionMetadata({
          id: transaction.id,
          metadata: {
            blockchainStatus: transaction.piTransactionDetails?.status,
            confirmations: transaction.piTransactionDetails?.confirmations
          }
        }));

        if (needsBlockchainConfirmation(transaction)) {
          startBlockchainConfirmationPolling(transaction.id, dispatch);
        }
      }

      // Update store state
      dispatch(addTransaction(transaction));
      dispatch(setLoading(false));

      // Log successful completion
      securityLogger.logSecurityEvent({
        eventType: 'TRANSACTION_COMPLETED',
        metadata: {
          transactionId: transaction.id,
          executionTime: performance.now() - startTime
        }
      });

      return transaction;

    } catch (error) {
      // Handle error with comprehensive logging
      const errorDetails = {
        code: error.code || 'TRANSACTION_ERROR',
        message: error.message || 'Transaction failed',
        transactionType: request.type
      };

      securityLogger.logSecurityIncident({
        severity: 'HIGH',
        error: errorDetails,
        metadata: {
          request,
          executionTime: performance.now() - startTime
        }
      });

      dispatch(setError(errorDetails));
      return rejectWithValue(errorDetails);
    }
  }
);

/**
 * Retrieves transaction details with caching and performance optimization
 */
export const getTransactionThunk = createAsyncThunk(
  TRANSACTION_ACTION_TYPES.GET_TRANSACTION,
  async (transactionId: string, { dispatch, rejectWithValue }) => {
    const startTime = performance.now();
    const securityLogger = new SecurityLogger('TransactionService');

    try {
      dispatch(setLoading(true));

      const transaction = await retry(
        async () => {
          const response = await getTransaction(transactionId);
          const responseTime = performance.now() - startTime;

          if (responseTime > PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME) {
            securityLogger.logPerformanceIssue({
              operation: 'getTransaction',
              responseTime,
              threshold: PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME
            });
          }

          return response;
        },
        {
          retries: PERFORMANCE_THRESHOLDS.RETRY_COUNT,
          retryDelay: PERFORMANCE_THRESHOLDS.RETRY_DELAY
        }
      );

      dispatch(setLoading(false));

      if (transaction.status !== TransactionStatus.COMPLETED && 
          !isFinalStatus(transaction.status)) {
        startTransactionStatusPolling(transaction.id, dispatch);
      }

      return transaction;

    } catch (error) {
      const errorDetails = {
        code: error.code || 'FETCH_ERROR',
        message: error.message || 'Failed to fetch transaction',
        transactionId
      };

      securityLogger.logSecurityIncident({
        severity: 'MEDIUM',
        error: errorDetails,
        metadata: {
          transactionId,
          executionTime: performance.now() - startTime
        }
      });

      dispatch(setError(errorDetails));
      return rejectWithValue(errorDetails);
    }
  }
);

// Helper functions
const validateTransactionRequest = (request: CreateTransactionRequest) => {
  const errors: string[] = [];

  if (!request.fromAccountId || !request.toAccountId) {
    errors.push('Invalid account information');
  }

  if (!request.amount || request.amount <= 0) {
    errors.push('Invalid transaction amount');
  }

  if (!Object.values(TransactionType).includes(request.type)) {
    errors.push('Invalid transaction type');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const startTransactionStatusPolling = (transactionId: string, dispatch: any) => {
  const pollInterval = setInterval(async () => {
    try {
      const transaction = await getTransaction(transactionId);
      dispatch(updateTransactionStatus({
        id: transactionId,
        status: transaction.status
      }));

      if (isFinalStatus(transaction.status)) {
        clearInterval(pollInterval);
      }
    } catch (error) {
      clearInterval(pollInterval);
    }
  }, 5000);
};

const startBlockchainConfirmationPolling = (transactionId: string, dispatch: any) => {
  const pollInterval = setInterval(async () => {
    try {
      const transaction = await getTransaction(transactionId);
      if (transaction.piTransactionDetails?.confirmations >= 6) {
        dispatch(updateTransactionStatus({
          id: transactionId,
          status: TransactionStatus.BLOCKCHAIN_CONFIRMED
        }));
        clearInterval(pollInterval);
      }
    } catch (error) {
      clearInterval(pollInterval);
    }
  }, 10000);
};