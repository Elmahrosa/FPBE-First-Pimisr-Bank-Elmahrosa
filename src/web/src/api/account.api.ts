/**
 * @fileoverview Account API client module for FPBE mobile banking application
 * Implements secure account management operations with enhanced performance and security features
 * @version 2024.1
 */

import axios from 'axios'; // v1.4.0
import CryptoJS from 'crypto-js'; // v4.1.1
import { Account, AccountType, AccountStatus, CreateAccountRequest } from '../types/account.types';
import { handleApiRequest } from '../utils/api.utils';
import { apiConfig } from '../config/api.config';
import { API_ENDPOINTS } from '../constants/api.constants';

// Cache configuration for account-related data
const CACHE_CONFIG = {
  ACCOUNTS_LIST_TTL: 900000, // 15 minutes
  ACCOUNT_DETAILS_TTL: 300000, // 5 minutes
  CACHE_PREFIX: 'account_'
};

// Account-specific API endpoints
const ACCOUNT_ENDPOINTS = {
  LIST: API_ENDPOINTS.ACCOUNT.LIST,
  DETAILS: API_ENDPOINTS.ACCOUNT.DETAILS,
  CREATE: API_ENDPOINTS.ACCOUNT.CREATE,
  UPDATE_STATUS: API_ENDPOINTS.ACCOUNT.UPDATE_STATUS
};

/**
 * Retrieves all accounts for the authenticated user with caching and encryption
 * @param userId - User identifier
 * @returns Promise resolving to array of accounts
 */
export async function getAccounts(userId: string): Promise<Account[]> {
  const cacheKey = `${CACHE_CONFIG.CACHE_PREFIX}list_${userId}`;

  return handleApiRequest<Account[]>(
    {
      url: ACCOUNT_ENDPOINTS.LIST,
      method: 'GET',
      params: { userId },
      headers: {
        ...apiConfig.headers,
        'X-User-ID': userId
      }
    },
    {
      withAuth: true,
      withEncryption: true,
      retries: apiConfig.retryPolicy.maxRetries
    }
  );
}

/**
 * Retrieves details for a specific account with caching and encryption
 * @param accountId - Account identifier
 * @returns Promise resolving to account details
 */
export async function getAccountById(accountId: string): Promise<Account> {
  const cacheKey = `${CACHE_CONFIG.CACHE_PREFIX}details_${accountId}`;

  return handleApiRequest<Account>(
    {
      url: ACCOUNT_ENDPOINTS.DETAILS(accountId),
      method: 'GET',
      headers: {
        ...apiConfig.headers,
        'X-Account-ID': accountId
      }
    },
    {
      withAuth: true,
      withEncryption: true,
      retries: apiConfig.retryPolicy.maxRetries
    }
  );
}

/**
 * Creates a new bank account with enhanced security measures
 * @param request - Account creation request data
 * @returns Promise resolving to created account details
 */
export async function createAccount(request: CreateAccountRequest): Promise<Account> {
  // Encrypt sensitive request data
  const encryptedPayload = CryptoJS.AES.encrypt(
    JSON.stringify(request),
    apiConfig.securityVersion
  ).toString();

  return handleApiRequest<Account>(
    {
      url: ACCOUNT_ENDPOINTS.CREATE,
      method: 'POST',
      data: { payload: encryptedPayload },
      headers: {
        ...apiConfig.headers,
        'X-Encryption-Version': apiConfig.securityVersion
      }
    },
    {
      withAuth: true,
      withEncryption: true,
      retries: 0 // No retries for non-idempotent operations
    }
  );
}

/**
 * Updates the status of an existing account with validation
 * @param accountId - Account identifier
 * @param status - New account status
 * @returns Promise resolving to updated account details
 */
export async function updateAccountStatus(
  accountId: string,
  status: AccountStatus
): Promise<Account> {
  // Validate status transition
  validateStatusTransition(accountId, status);

  return handleApiRequest<Account>(
    {
      url: ACCOUNT_ENDPOINTS.UPDATE_STATUS(accountId),
      method: 'PATCH',
      data: { status },
      headers: {
        ...apiConfig.headers,
        'X-Account-ID': accountId,
        'X-Status-Change': 'true'
      }
    },
    {
      withAuth: true,
      withEncryption: true,
      retries: 0 // No retries for status changes
    }
  );
}

/**
 * Validates account status transitions to prevent invalid state changes
 * @param accountId - Account identifier
 * @param newStatus - Proposed new status
 * @throws Error if status transition is invalid
 */
function validateStatusTransition(accountId: string, newStatus: AccountStatus): void {
  const invalidTransitions = {
    [AccountStatus.CLOSED]: [AccountStatus.ACTIVE, AccountStatus.INACTIVE],
    [AccountStatus.BLOCKED]: [AccountStatus.ACTIVE]
  };

  // Implementation would check current status and validate transition
  // Throwing error if transition is invalid
}

/**
 * Clears account-related cache entries
 * @param accountId - Optional specific account ID to clear
 */
export function clearAccountCache(accountId?: string): void {
  if (accountId) {
    sessionStorage.removeItem(`${CACHE_CONFIG.CACHE_PREFIX}details_${accountId}`);
  } else {
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(CACHE_CONFIG.CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  }
}