import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals';

import {
  validatePassword,
  validatePIN,
  validateEmail,
  validatePhoneNumber,
  validateTransactionAmount,
  validateKYCDocument,
  validateBiometric,
  validateMFA
} from '../../src/utils/validation.utils';

import {
  PASSWORD_VALIDATION,
  PIN_VALIDATION,
  EMAIL_VALIDATION,
  PHONE_VALIDATION,
  AMOUNT_VALIDATION,
  KYC_VALIDATION
} from '../../src/constants/validation.constants';

import {
  User,
  UserProfile,
  KYCStatus,
  BiometricType
} from '../../src/types/auth.types';

describe('Validation Utils - Password Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a strong password meeting all requirements', () => {
    const result = validatePassword('SecureP@ss123');
    expect(result.isValid).toBe(true);
    expect(result.complexity).toBeGreaterThanOrEqual(75);
  });

  it('should reject passwords below minimum length', () => {
    const result = validatePassword('Sh0rt!');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(PASSWORD_VALIDATION.ERROR_MESSAGES.MIN_LENGTH);
  });

  it('should reject passwords above maximum length', () => {
    const result = validatePassword('VeryL0ngP@sswordThatExceedsTheMaximumLength123!');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(PASSWORD_VALIDATION.ERROR_MESSAGES.MAX_LENGTH);
  });

  it('should reject passwords without uppercase letters', () => {
    const result = validatePassword('lowercase123!');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('uppercase letter');
  });

  it('should reject common password patterns', () => {
    const result = validatePassword('Password123!');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('common patterns');
  });

  it('should calculate correct complexity score', () => {
    const result = validatePassword('StrongP@ss123');
    expect(result.complexity).toBe(100); // All criteria met
  });
});

describe('Validation Utils - Transaction Security', () => {
  it('should validate valid transaction amounts', () => {
    const result = validateTransactionAmount({
      amount: 1000.00,
      currency: 'USD'
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject amounts exceeding maximum limit', () => {
    const result = validateTransactionAmount({
      amount: 1000001.00,
      currency: 'USD'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(AMOUNT_VALIDATION.ERROR_MESSAGES.MAX_AMOUNT);
  });

  it('should reject amounts with invalid decimal places', () => {
    const result = validateTransactionAmount({
      amount: 100.999,
      currency: 'USD'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(AMOUNT_VALIDATION.ERROR_MESSAGES.DECIMAL_PLACES);
  });

  it('should reject negative amounts', () => {
    const result = validateTransactionAmount({
      amount: -100.00,
      currency: 'USD'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(AMOUNT_VALIDATION.ERROR_MESSAGES.MIN_AMOUNT);
  });
});

describe('Validation Utils - KYC Document Validation', () => {
  it('should validate valid KYC documents', () => {
    const result = validateKYCDocument({
      type: 'PASSPORT',
      dateOfBirth: '1990-01-01',
      documentNumber: 'AB123456',
      expiryDate: '2030-01-01'
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid document types', () => {
    const result = validateKYCDocument({
      type: 'INVALID_TYPE',
      dateOfBirth: '1990-01-01',
      documentNumber: 'AB123456',
      expiryDate: '2030-01-01'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(KYC_VALIDATION.ERROR_MESSAGES.ID_TYPE);
  });

  it('should reject underage applicants', () => {
    const result = validateKYCDocument({
      type: 'PASSPORT',
      dateOfBirth: new Date().toISOString().split('T')[0], // Today's date
      documentNumber: 'AB123456',
      expiryDate: '2030-01-01'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(KYC_VALIDATION.ERROR_MESSAGES.DOB);
  });

  it('should reject expired documents', () => {
    const result = validateKYCDocument({
      type: 'PASSPORT',
      dateOfBirth: '1990-01-01',
      documentNumber: 'AB123456',
      expiryDate: '2020-01-01'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('expired');
  });
});

describe('Validation Utils - Biometric Validation', () => {
  it('should validate valid biometric data', () => {
    const result = validateBiometric({
      type: BiometricType.FACE_ID,
      deviceId: 'device123',
      timestamp: new Date().toISOString()
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid biometric types', () => {
    const result = validateBiometric({
      type: 'INVALID_TYPE' as BiometricType,
      deviceId: 'device123',
      timestamp: new Date().toISOString()
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('biometric type');
  });

  it('should reject outdated security versions', () => {
    const result = validateBiometric({
      type: BiometricType.FACE_ID,
      deviceId: 'device123',
      timestamp: new Date().toISOString(),
      securityVersion: '1.0.0'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('security version');
  });
});

describe('Validation Utils - Email Validation', () => {
  it('should validate valid email addresses', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid email formats', () => {
    const result = validateEmail('invalid.email@');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(EMAIL_VALIDATION.ERROR_MESSAGES.PATTERN);
  });

  it('should handle international domains', () => {
    const result = validateEmail('user@example.co.uk');
    expect(result.isValid).toBe(true);
  });
});

describe('Validation Utils - Phone Number Validation', () => {
  it('should validate valid international phone numbers', () => {
    const result = validatePhoneNumber('+1234567890');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid phone formats', () => {
    const result = validatePhoneNumber('invalid-number');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(PHONE_VALIDATION.ERROR_MESSAGES.PATTERN);
  });

  it('should handle different country codes', () => {
    const result = validatePhoneNumber('+44123456789');
    expect(result.isValid).toBe(true);
  });
});

describe('Validation Utils - MFA Validation', () => {
  it('should validate valid MFA codes', () => {
    const result = validateMFA({
      code: '123456',
      type: 'SMS',
      deviceId: 'device123'
    });
    expect(result.isValid).toBe(true);
  });

  it('should reject expired MFA codes', () => {
    const result = validateMFA({
      code: '123456',
      type: 'SMS',
      deviceId: 'device123',
      timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should reject invalid MFA types', () => {
    const result = validateMFA({
      code: '123456',
      type: 'INVALID',
      deviceId: 'device123'
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('MFA type');
  });
});