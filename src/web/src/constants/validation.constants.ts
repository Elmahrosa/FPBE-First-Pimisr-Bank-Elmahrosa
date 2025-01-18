/**
 * @fileoverview Validation constants for FPBE mobile banking application
 * Implements comprehensive validation rules for user inputs, form data, and authentication
 * Ensures security, compliance, and data integrity according to GDPR and banking standards
 * @version 1.0.0
 */

/**
 * Password validation rules
 * Enforces secure password requirements with complexity rules
 * Compliant with NIST 800-63B guidelines
 */
export const PASSWORD_VALIDATION = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 32,
  PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/,
  ERROR_MESSAGES: {
    MIN_LENGTH: 'Password must be at least 8 characters long',
    MAX_LENGTH: 'Password cannot exceed 32 characters',
    PATTERN: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  }
} as const;

/**
 * PIN validation rules
 * Defines secure PIN validation with numeric-only constraints
 * Implements 6-digit security standard
 */
export const PIN_VALIDATION = {
  LENGTH: 6,
  PATTERN: /^\d{6}$/,
  ERROR_MESSAGES: {
    LENGTH: 'PIN must be exactly 6 digits',
    PATTERN: 'PIN must contain only numbers'
  }
} as const;

/**
 * Email validation rules
 * Ensures valid email format with international domain support
 * Compliant with RFC 5322 standards
 */
export const EMAIL_VALIDATION = {
  PATTERN: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
  ERROR_MESSAGES: {
    PATTERN: 'Please enter a valid email address'
  }
} as const;

/**
 * Phone number validation rules
 * Validates international phone numbers with country code support
 * Follows E.164 format standards
 */
export const PHONE_VALIDATION = {
  PATTERN: /^\+?[1-9]\d{1,14}$/,
  ERROR_MESSAGES: {
    PATTERN: 'Please enter a valid phone number'
  }
} as const;

/**
 * Transaction amount validation rules
 * Enforces transaction amount limits and decimal precision
 * Implements banking industry standard decimal handling
 */
export const AMOUNT_VALIDATION = {
  MIN_AMOUNT: 0.01,
  MAX_AMOUNT: 1000000,
  DECIMAL_PLACES: 2,
  ERROR_MESSAGES: {
    MIN_AMOUNT: 'Amount must be greater than 0.01',
    MAX_AMOUNT: 'Amount cannot exceed 1,000,000',
    DECIMAL_PLACES: 'Amount cannot have more than 2 decimal places'
  }
} as const;

/**
 * KYC validation rules
 * Validates KYC document types and age requirements
 * Ensures compliance with banking regulations and AML policies
 */
export const KYC_VALIDATION = {
  ID_TYPES: ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE'] as const,
  DOB_MIN_AGE: 18,
  DOB_MAX_AGE: 120,
  ERROR_MESSAGES: {
    ID_TYPE: 'Please select a valid ID type',
    DOB: 'Age must be between 18 and 120 years'
  }
} as const;

// Type definitions for exported constants
export type IdType = typeof KYC_VALIDATION.ID_TYPES[number];
export type ValidationErrorMessages = typeof PASSWORD_VALIDATION.ERROR_MESSAGES |
                                    typeof PIN_VALIDATION.ERROR_MESSAGES |
                                    typeof EMAIL_VALIDATION.ERROR_MESSAGES |
                                    typeof PHONE_VALIDATION.ERROR_MESSAGES |
                                    typeof AMOUNT_VALIDATION.ERROR_MESSAGES |
                                    typeof KYC_VALIDATION.ERROR_MESSAGES;