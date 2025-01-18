/**
 * @fileoverview Enhanced API utility functions for FPBE mobile banking application
 * Implements secure API communication with comprehensive error handling and performance monitoring
 * @version 2024.1
 */

import axios, { AxiosError, AxiosResponse } from 'axios'; // v1.4.0
import { ApiRequestConfig } from '../types/api.types';
import { apiConfig } from '../config/api.config';

// Constants for API request handling
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_TTL = 300000; // 5 minutes

// Enhanced security headers
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
};

// Error codes for standardized error handling
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  SECURITY_ERROR: 'SECURITY_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Enhanced API request handler with security, performance, and monitoring features
 * @template T Response data type
 * @param config API request configuration
 * @param options Additional request options
 * @returns Promise resolving to the API response
 */
export async function handleApiRequest<T>(
  config: ApiRequestConfig,
  options: {
    retries?: number;
    withAuth?: boolean;
    withEncryption?: boolean;
    priority?: 'high' | 'normal' | 'low';
  } = {}
): Promise<T> {
  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    // Validate request configuration
    validateRequestConfig(config);

    // Check cache for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const cachedResponse = await checkCache<T>(config.url || '');
      if (cachedResponse) return cachedResponse;
    }

    // Apply request encryption if enabled
    const secureConfig = options.withEncryption
      ? await encryptRequest(config)
      : config;

    // Create secure headers
    const headers = await createApiHeaders({
      withAuth: options.withAuth,
      withEncryption: options.withEncryption,
      requestId
    });

    // Configure request with security and monitoring
    const requestConfig = {
      ...secureConfig,
      headers: { ...secureConfig.headers, ...headers },
      timeout: config.timeout || DEFAULT_TIMEOUT,
      metadata: { startTime, requestId }
    };

    // Make API request with retry logic
    const response = await makeRequestWithRetry<T>(
      requestConfig,
      options.retries || MAX_RETRIES
    );

    // Process and validate response
    const processedResponse = await processApiResponse<T>(response);

    // Cache successful GET responses
    if (config.method?.toLowerCase() === 'get') {
      await cacheResponse(config.url || '', processedResponse);
    }

    // Log performance metrics
    logPerformanceMetrics(requestId, startTime);

    return processedResponse;
  } catch (error) {
    throw await handleApiError(error, requestId);
  }
}

/**
 * Creates comprehensive secure headers for API requests
 * @param options Header configuration options
 * @returns Secure headers object
 */
export function createApiHeaders(options: {
  withAuth?: boolean;
  withEncryption?: boolean;
  requestId: string;
  additionalHeaders?: Record<string, string>;
}): Record<string, string> {
  const headers: Record<string, string> = {
    ...SECURITY_HEADERS,
    'X-Request-ID': options.requestId,
    'X-API-Version': apiConfig.securityVersion,
    'X-Device-ID': getDeviceId(),
    'X-Request-Timestamp': new Date().toISOString()
  };

  if (options.withAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (options.withEncryption) {
    headers['X-Encryption-Version'] = apiConfig.securityVersion;
  }

  return {
    ...headers,
    ...options.additionalHeaders
  };
}

/**
 * Enhanced error handler with security incident logging
 * @param error Error object
 * @param requestId Request identifier
 * @returns Standardized API error
 */
export async function handleApiError(
  error: unknown,
  requestId: string
): Promise<never> {
  const errorResponse = {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    requestId,
    timestamp: new Date().toISOString(),
    details: {}
  };

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    // Categorize and enhance error information
    if (axiosError.response) {
      errorResponse.code = getErrorCode(axiosError.response.status);
      errorResponse.message = axiosError.response.data?.message || axiosError.message;
      errorResponse.details = {
        status: axiosError.response.status,
        data: axiosError.response.data
      };
    } else if (axiosError.request) {
      errorResponse.code = ERROR_CODES.NETWORK_ERROR;
      errorResponse.message = 'Network error occurred';
    }

    // Log security-related errors
    if (isSecurityError(axiosError)) {
      await logSecurityIncident(errorResponse);
    }
  }

  // Log error with performance impact
  console.error('API Error:', {
    ...errorResponse,
    performance: {
      timestamp: new Date().toISOString(),
      requestId
    }
  });

  throw errorResponse;
}

// Helper functions

function validateRequestConfig(config: ApiRequestConfig): void {
  if (!config.url) {
    throw new Error('Request URL is required');
  }
}

async function checkCache<T>(key: string): Promise<T | null> {
  const cached = sessionStorage.getItem(key);
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_TTL) {
    sessionStorage.removeItem(key);
    return null;
  }

  return data as T;
}

async function makeRequestWithRetry<T>(
  config: ApiRequestConfig,
  retries: number
): Promise<AxiosResponse<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error as Error;
      if (attempt === retries) break;
      
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

async function processApiResponse<T>(response: AxiosResponse<T>): Promise<T> {
  validateResponseIntegrity(response);
  return response.data;
}

function validateResponseIntegrity(response: AxiosResponse): void {
  if (!response.headers['x-request-id']) {
    throw new Error('Response integrity check failed');
  }
}

function getDeviceId(): string {
  return localStorage.getItem('deviceId') || crypto.randomUUID();
}

function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

function getErrorCode(status: number): string {
  switch (true) {
    case status === 401: return ERROR_CODES.AUTH_ERROR;
    case status === 403: return ERROR_CODES.SECURITY_ERROR;
    case status === 422: return ERROR_CODES.VALIDATION_ERROR;
    case status >= 500: return ERROR_CODES.SERVER_ERROR;
    default: return ERROR_CODES.UNKNOWN_ERROR;
  }
}

function isSecurityError(error: AxiosError): boolean {
  return [401, 403, 407, 429].includes(error.response?.status || 0);
}

async function logSecurityIncident(error: Record<string, any>): Promise<void> {
  // Implementation would integrate with security monitoring system
  console.error('Security Incident:', error);
}

function logPerformanceMetrics(requestId: string, startTime: number): void {
  const duration = performance.now() - startTime;
  if (duration > 100) { // Performance threshold from requirements
    console.warn(`API request ${requestId} exceeded performance threshold: ${duration}ms`);
  }
}

async function encryptRequest(config: ApiRequestConfig): Promise<ApiRequestConfig> {
  // Implementation would handle request payload encryption
  return config;
}

async function cacheResponse<T>(key: string, data: T): Promise<void> {
  sessionStorage.setItem(key, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
}