/**
 * @fileoverview TypeScript type definitions for authentication-related interfaces, types and enums
 * used across the FPBE mobile banking application. Implements comprehensive security features
 * and compliance with authentication standards.
 * @version 2023.1
 */

import { ApiResponse } from './api.types';

/**
 * Enhanced Redux auth state interface with comprehensive security tracking
 */
export interface AuthState {
  /** Indicates if user is currently authenticated */
  isAuthenticated: boolean;
  /** Currently authenticated user information */
  user: User | null;
  /** JWT access token for API requests */
  token: string | null;
  /** Loading state for async operations */
  loading: boolean;
  /** Error state for failed operations */
  error: ApiError | null;
  /** ISO 8601 timestamp of last user activity */
  lastActivity: string;
}

/**
 * Enhanced user interface with comprehensive security tracking
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's verified email address */
  email: string;
  /** User's verified phone number */
  phoneNumber: string;
  /** Current KYC verification status */
  kycStatus: KYCStatus;
  /** Detailed user profile information */
  profile: UserProfile;
  /** ISO 8601 timestamp of last login */
  lastLogin: string;
  /** Security version for tracking security updates */
  securityVersion: string;
  /** Unique device identifier for device binding */
  deviceId: string;
}

/**
 * Comprehensive user profile interface for KYC and identity management
 */
export interface UserProfile {
  /** User's legal first name */
  firstName: string;
  /** User's legal last name */
  lastName: string;
  /** User's date of birth (ISO 8601) */
  dateOfBirth: string;
  /** User's residential address */
  address: string;
  /** User's city of residence */
  city: string;
  /** User's country of residence */
  country: string;
  /** User's postal/zip code */
  postalCode: string;
}

/**
 * Enhanced login request interface with device tracking
 */
export interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password (to be hashed) */
  password: string;
  /** Unique device identifier */
  deviceId: string;
}

/**
 * Comprehensive login response with session management
 */
export interface LoginResponse {
  /** Authenticated user information */
  user: User;
  /** JWT access token */
  token: string;
  /** ISO 8601 timestamp of session expiry */
  sessionExpiry: string;
  /** JWT refresh token for token renewal */
  refreshToken: string;
}

/**
 * Enhanced biometric authentication request with security versioning
 */
export interface BiometricAuthRequest {
  /** Unique device identifier */
  deviceId: string;
  /** Type of biometric authentication used */
  biometricType: BiometricType;
  /** Security version for tracking security updates */
  securityVersion: string;
  /** ISO 8601 timestamp of authentication attempt */
  timestamp: string;
}

/**
 * KYC verification status enumeration
 */
export enum KYCStatus {
  /** Initial KYC submission pending */
  PENDING = 'PENDING',
  /** KYC verification in progress */
  IN_PROGRESS = 'IN_PROGRESS',
  /** KYC verification completed successfully */
  VERIFIED = 'VERIFIED',
  /** KYC verification rejected */
  REJECTED = 'REJECTED'
}

/**
 * Supported biometric authentication types
 */
export enum BiometricType {
  /** iOS Touch ID */
  TOUCH_ID = 'TOUCH_ID',
  /** iOS Face ID */
  FACE_ID = 'FACE_ID',
  /** Android Fingerprint */
  FINGERPRINT = 'FINGERPRINT'
}

/**
 * API error interface for authentication failures
 */
export interface ApiError {
  /** Error code for client handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error context */
  details?: Record<string, any>;
}

/**
 * Type alias for authentication API responses
 */
export type AuthApiResponse<T> = ApiResponse<T>;