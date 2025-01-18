import bcrypt from 'bcrypt'; // ^5.0.0
import zxcvbn from 'zxcvbn'; // ^4.4.2
import { security } from './config/auth.config';

// Interfaces for password validation and strength results
export interface IPasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strengthScore: number;
  validationTime: number;
}

export interface IPasswordStrengthResult {
  score: number;
  feedback: string[];
  crackTimesSeconds: number;
  patterns: string[];
}

// Constants for password validation and security
const SALT_ROUNDS = 12;

const PASSWORD_PATTERNS = {
  SPECIAL_CHAR: /[!@#$%^&*(),.?":{}|<>]/,
  NUMBER: /\d/,
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  SEQUENTIAL: /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/
};

const MIN_PASSWORD_LENGTH = security.passwordMinLength;
const MIN_STRENGTH_SCORE = 3;

/**
 * Securely hashes a password using bcrypt with configurable salt rounds
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 * @throws Error if password is empty or invalid
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password provided for hashing');
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
}

/**
 * Securely compares a plain text password with a hashed password using timing-safe comparison
 * @param plainPassword - Plain text password to compare
 * @param hashedPassword - Hashed password to compare against
 * @returns Promise resolving to boolean indicating if passwords match
 * @throws Error if either password is invalid
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    throw new Error('Both passwords must be provided for comparison');
  }

  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
}

/**
 * Validates password strength and compliance with security requirements
 * @param password - Password to validate
 * @returns IPasswordValidationResult containing validation details
 */
export function validatePasswordStrength(password: string): IPasswordValidationResult {
  const startTime = process.hrtime();
  const errors: string[] = [];

  // Basic validation checks
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strengthScore: 0,
      validationTime: 0
    };
  }

  // Length check
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Pattern checks based on security configuration
  if (security.passwordRequireSpecialChar && !PASSWORD_PATTERNS.SPECIAL_CHAR.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (security.passwordRequireNumber && !PASSWORD_PATTERNS.NUMBER.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (security.passwordRequireUppercase && !PASSWORD_PATTERNS.UPPERCASE.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!PASSWORD_PATTERNS.LOWERCASE.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for sequential patterns
  if (PASSWORD_PATTERNS.SEQUENTIAL.test(password)) {
    errors.push('Password contains sequential characters');
  }

  // Perform zxcvbn strength analysis
  const strengthAnalysis = checkPasswordStrength(password);

  // Calculate validation time
  const endTime = process.hrtime(startTime);
  const validationTime = endTime[0] * 1000 + endTime[1] / 1000000;

  return {
    isValid: errors.length === 0 && strengthAnalysis.score >= MIN_STRENGTH_SCORE,
    errors,
    strengthScore: strengthAnalysis.score,
    validationTime
  };
}

/**
 * Performs advanced password strength analysis using zxcvbn
 * @param password - Password to analyze
 * @returns IPasswordStrengthResult containing detailed strength analysis
 */
export function checkPasswordStrength(password: string): IPasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      feedback: ['Password is required'],
      crackTimesSeconds: 0,
      patterns: []
    };
  }

  // Custom dictionary for additional pattern checking
  const customDictionary = [
    'fpbe', 'bank', 'elmahrosa', 'admin', 'password', 'banking',
    'mobile', 'secure', 'account', 'login', 'user'
  ];

  // Perform zxcvbn analysis with custom dictionary
  const result = zxcvbn(password, customDictionary);

  // Extract patterns found in the password
  const patterns = result.sequence.map(match => match.pattern || match.token);

  return {
    score: result.score,
    feedback: [
      ...result.feedback.suggestions,
      result.feedback.warning
    ].filter(Boolean),
    crackTimesSeconds: result.crack_times_seconds.online_throttling_100_per_hour,
    patterns: [...new Set(patterns)]
  };
}