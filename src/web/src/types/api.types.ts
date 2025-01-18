/**
 * @fileoverview Core TypeScript type definitions for API requests, responses, and common interfaces
 * used across all API services in the FPBE mobile banking application.
 * @version 2023.1
 */

import { Account } from './account.types';

/**
 * Generic API response wrapper interface with enhanced security tracking and metadata.
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T> {
  /** The response payload */
  data: T;
  /** HTTP status code */
  status: number;
  /** Human-readable response message */
  message: string;
  /** ISO 8601 timestamp of the response */
  timestamp: string;
  /** Unique request identifier for tracing */
  requestId: string;
}

/**
 * Enhanced API error response interface with detailed tracking information.
 */
export interface ApiError {
  /** Error code for client-side error handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context and details */
  details: Record<string, any>;
  /** ISO 8601 timestamp of when the error occurred */
  timestamp: string;
  /** Unique request identifier for error tracing */
  requestId: string;
  /** API endpoint path where the error occurred */
  path: string;
}

/**
 * Generic paginated response interface with enhanced metadata.
 * @template T The type of items being paginated
 */
export interface PaginatedResponse<T> {
  /** Array of paginated items */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (0-based) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Indicates if there are more pages available */
  hasNext: boolean;
  /** Total number of available pages */
  totalPages: number;
}

/**
 * Interface for retry configuration in API requests.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
}

/**
 * Enhanced API request configuration interface with security features.
 */
export interface ApiRequestConfig {
  /** Custom request headers */
  headers: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Whether to send cookies with the request */
  withCredentials: boolean;
  /** API security version for version-specific security measures */
  securityVersion: string;
  /** Whether to use end-to-end encryption for the request */
  encryption: boolean;
  /** Retry configuration for failed requests */
  retryPolicy: RetryConfig;
}

/**
 * Base interface for all API entities with comprehensive audit fields.
 */
export interface BaseEntity {
  /** Unique identifier */
  id: string;
  /** ISO 8601 timestamp of entity creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
  /** Entity version for optimistic locking */
  version: number;
  /** ID of the user who created the entity */
  createdBy: string;
  /** ID of the user who last updated the entity */
  updatedBy: string;
}

/**
 * Global API configuration constants
 */
export const API_TIMEOUT = 30000;
export const API_VERSION = 'v1';
export const API_SECURITY_VERSION = '2023.1';
export const API_MAX_RETRIES = 3;

/**
 * Type guard to check if a response is an error
 */
export function isApiError(response: any): response is ApiError {
  return 'code' in response && 'message' in response;
}

/**
 * Type guard to check if a response is paginated
 */
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
  return 'items' in response && 'total' in response && 'page' in response;
}

/**
 * Default API request configuration
 */
export const DEFAULT_API_CONFIG: ApiRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': API_VERSION,
    'X-Security-Version': API_SECURITY_VERSION
  },
  timeout: API_TIMEOUT,
  withCredentials: true,
  securityVersion: API_SECURITY_VERSION,
  encryption: true,
  retryPolicy: {
    maxRetries: API_MAX_RETRIES,
    retryDelay: 1000,
    useExponentialBackoff: true
  }
};