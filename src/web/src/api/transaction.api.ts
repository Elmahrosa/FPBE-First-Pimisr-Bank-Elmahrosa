/**
 * @fileoverview Transaction API client implementation for FPBE mobile banking application
 * Handles creation, retrieval and management of financial transactions including fiat and Pi cryptocurrency
 * @version 2024.1
 */

import axios from 'axios'; // v1.4.0
import { 
    Transaction,
    CreateTransactionRequest,
    TransactionType,
    TransactionStatus,
    isPiTransaction,
    needsBlockchainConfirmation
} from '../types/transaction.types';
import { handleApiRequest } from '../utils/api.utils';
import { apiConfig } from '../config/api.config';

// API endpoints for transaction operations
const API_ENDPOINTS = {
    CREATE_TRANSACTION: '/api/v1/transactions/create',
    GET_TRANSACTION: '/api/v1/transactions/',
    GET_ACCOUNT_TRANSACTIONS: '/api/v1/transactions/account/'
} as const;

// Constants for transaction processing
const DEFAULT_PAGE_SIZE = 20;
const CACHE_TTL = 300000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const TRANSACTION_LIMITS = {
    FIAT_MAX: 50000,
    PI_MAX: 1000
} as const;

/**
 * Creates a new financial transaction with enhanced validation and security checks
 * @param request Transaction creation request details
 * @returns Promise resolving to created transaction
 * @throws ApiError if transaction creation fails
 */
export async function createTransaction(
    request: CreateTransactionRequest
): Promise<Transaction> {
    // Validate transaction limits
    validateTransactionLimits(request);

    // Configure request with enhanced security for transactions
    const config = {
        ...apiConfig,
        url: API_ENDPOINTS.CREATE_TRANSACTION,
        method: 'POST',
        data: request,
        headers: {
            ...apiConfig.headers,
            'X-Transaction-Type': request.type,
            'X-Transaction-Source': 'MOBILE_APP'
        }
    };

    // Handle transaction creation with retry mechanism
    return handleApiRequest<Transaction>(config, {
        retries: MAX_RETRY_ATTEMPTS,
        withAuth: true,
        withEncryption: true,
        priority: 'high'
    });
}

/**
 * Retrieves transaction details with real-time status updates
 * @param transactionId Unique transaction identifier
 * @returns Promise resolving to transaction details
 * @throws ApiError if transaction retrieval fails
 */
export async function getTransaction(transactionId: string): Promise<Transaction> {
    // Validate transaction ID format
    if (!transactionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw new Error('Invalid transaction ID format');
    }

    const config = {
        ...apiConfig,
        url: `${API_ENDPOINTS.GET_TRANSACTION}${transactionId}`,
        method: 'GET',
        headers: {
            ...apiConfig.headers,
            'Cache-Control': 'no-cache'
        }
    };

    // Handle transaction retrieval with blockchain status check
    const transaction = await handleApiRequest<Transaction>(config, {
        withAuth: true,
        priority: 'normal'
    });

    // Check blockchain confirmation status for Pi transactions
    if (needsBlockchainConfirmation(transaction)) {
        await checkBlockchainConfirmation(transaction);
    }

    return transaction;
}

/**
 * Retrieves paginated transaction history with enhanced filtering capabilities
 * @param accountId Account identifier
 * @param options Filtering and pagination options
 * @returns Promise resolving to paginated transaction list
 * @throws ApiError if transaction retrieval fails
 */
export async function getAccountTransactions(
    accountId: string,
    options: {
        pageSize?: number;
        pageToken?: string;
        startDate?: string;
        endDate?: string;
        type?: TransactionType;
        status?: TransactionStatus;
    } = {}
): Promise<{
    transactions: Transaction[];
    nextPageToken?: string;
    totalCount: number;
}> {
    const queryParams = new URLSearchParams({
        pageSize: (options.pageSize || DEFAULT_PAGE_SIZE).toString(),
        ...(options.pageToken && { pageToken: options.pageToken }),
        ...(options.startDate && { startDate: options.startDate }),
        ...(options.endDate && { endDate: options.endDate }),
        ...(options.type && { type: options.type }),
        ...(options.status && { status: options.status })
    });

    const config = {
        ...apiConfig,
        url: `${API_ENDPOINTS.GET_ACCOUNT_TRANSACTIONS}${accountId}?${queryParams}`,
        method: 'GET',
        headers: {
            ...apiConfig.headers,
            'Cache-Control': `max-age=${CACHE_TTL}`
        }
    };

    return handleApiRequest<{
        transactions: Transaction[];
        nextPageToken?: string;
        totalCount: number;
    }>(config, {
        withAuth: true,
        priority: 'normal'
    });
}

/**
 * Validates transaction limits based on transaction type
 * @param request Transaction request to validate
 * @throws Error if transaction limits are exceeded
 */
function validateTransactionLimits(request: CreateTransactionRequest): void {
    const limit = isPiTransaction(request as Transaction) 
        ? TRANSACTION_LIMITS.PI_MAX 
        : TRANSACTION_LIMITS.FIAT_MAX;

    if (request.amount > limit) {
        throw new Error(`Transaction amount exceeds ${limit} ${request.currency} limit`);
    }
}

/**
 * Checks blockchain confirmation status for Pi transactions
 * @param transaction Transaction to check
 * @returns Promise resolving when confirmation is checked
 */
async function checkBlockchainConfirmation(transaction: Transaction): Promise<void> {
    if (!transaction.piTransactionDetails?.blockHash) {
        return;
    }

    const config = {
        ...apiConfig,
        url: `${API_ENDPOINTS.GET_TRANSACTION}${transaction.id}/blockchain-status`,
        method: 'GET'
    };

    await handleApiRequest(config, {
        withAuth: true,
        priority: 'low'
    });
}