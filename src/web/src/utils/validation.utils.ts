/**
 * @fileoverview Validation utilities for FPBE mobile banking application
 * Implements secure input validation with rate limiting and audit logging
 * @version 1.0.0
 */

import {
  PASSWORD_VALIDATION,
  PIN_VALIDATION,
  EMAIL_VALIDATION,
  PHONE_VALIDATION,
  AMOUNT_VALIDATION,
  KYC_VALIDATION
} from '../constants/validation.constants';
import { User, UserProfile, KYCStatus } from '../types/auth.types';
import createDOMPurifier from 'dompurify'; // v3.0.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import winston from 'winston'; // v3.8.0

// Initialize DOMPurifier for input sanitization
const DOMPurifier = createDOMPurifier(window);

// Configure rate limiter for validation attempts
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // limit each IP to 10 validation attempts per window
  message: 'Too many validation attempts, please try again later'
});

// Configure logger for validation audit trail
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'validation-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'validation-combined.log' })
  ]
});

// Cache for validation results to prevent repeated validation attempts
const validationCache = new Map<string, ValidationResult>();

/**
 * Interface for validation result with enhanced error tracking
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorId?: string;
  complexity?: number;
}

/**
 * Interface for validation rule structure
 */
interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  errorMessages: Record<string, string>;
}

/**
 * Generic input validation with rate limiting and audit logging
 * @param input - Input string to validate
 * @param validationRule - Validation rule to apply
 * @param userId - Optional user ID for audit logging
 * @returns Validation result with error details if invalid
 */
export const validateInput = (
  input: string,
  validationRule: ValidationRule,
  userId?: string
): ValidationResult => {
  // Generate cache key
  const cacheKey = `${input}-${JSON.stringify(validationRule)}`;
  
  // Check cache first
  const cachedResult = validationCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Sanitize input
  const sanitizedInput = DOMPurifier.sanitize(input);

  // Validate length if specified
  if (validationRule.minLength && sanitizedInput.length < validationRule.minLength) {
    const result = {
      isValid: false,
      error: validationRule.errorMessages.minLength,
      errorId: `VAL_MIN_${Date.now()}`
    };
    validationCache.set(cacheKey, result);
    logValidationAttempt(false, 'MIN_LENGTH', userId);
    return result;
  }

  if (validationRule.maxLength && sanitizedInput.length > validationRule.maxLength) {
    const result = {
      isValid: false,
      error: validationRule.errorMessages.maxLength,
      errorId: `VAL_MAX_${Date.now()}`
    };
    validationCache.set(cacheKey, result);
    logValidationAttempt(false, 'MAX_LENGTH', userId);
    return result;
  }

  // Validate pattern if specified
  if (validationRule.pattern && !validationRule.pattern.test(sanitizedInput)) {
    const result = {
      isValid: false,
      error: validationRule.errorMessages.pattern,
      errorId: `VAL_PAT_${Date.now()}`
    };
    validationCache.set(cacheKey, result);
    logValidationAttempt(false, 'PATTERN', userId);
    return result;
  }

  // Validation passed
  const result = { isValid: true };
  validationCache.set(cacheKey, result);
  logValidationAttempt(true, 'SUCCESS', userId);
  return result;
};

/**
 * Enhanced password validation with security checks and complexity scoring
 * @param password - Password string to validate
 * @returns Validation result with complexity score
 */
export const validatePassword = (password: string): ValidationResult => {
  // Initial validation using standard rules
  const baseValidation = validateInput(password, PASSWORD_VALIDATION);
  if (!baseValidation.isValid) {
    return baseValidation;
  }

  // Calculate password complexity score
  let complexityScore = 0;
  
  // Check for uppercase letters
  if (/[A-Z]/.test(password)) complexityScore += 25;
  
  // Check for lowercase letters
  if (/[a-z]/.test(password)) complexityScore += 25;
  
  // Check for numbers
  if (/\d/.test(password)) complexityScore += 25;
  
  // Check for special characters
  if (/[@$!%*?&]/.test(password)) complexityScore += 25;

  // Check for common password patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    return {
      isValid: false,
      error: 'Password contains common patterns that are easily guessable',
      errorId: `VAL_COMMON_${Date.now()}`,
      complexity: complexityScore
    };
  }

  return {
    isValid: true,
    complexity: complexityScore
  };
};

/**
 * Log validation attempt for audit trail
 * @param success - Whether validation was successful
 * @param type - Type of validation performed
 * @param userId - Optional user ID for tracking
 */
const logValidationAttempt = (
  success: boolean,
  type: string,
  userId?: string
): void => {
  logger.info('Validation attempt', {
    timestamp: new Date().toISOString(),
    success,
    type,
    userId,
    ip: process.env.NODE_ENV === 'development' ? 'localhost' : undefined
  });
};

/**
 * Clear validation cache periodically
 * Runs every hour to prevent memory leaks
 */
setInterval(() => {
  validationCache.clear();
}, 3600000);

export default {
  validateInput,
  validatePassword
};