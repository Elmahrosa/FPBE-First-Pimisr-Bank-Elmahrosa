/**
 * @fileoverview Core TypeScript type definitions for Redux store state, actions, and reducers
 * in the FPBE mobile banking application with enhanced security validation and type safety.
 * @version 2023.1
 */

import { Action } from '@reduxjs/toolkit'; // ^1.9.5
import { Account, AccountStatus, AccountType } from '../types/account.types';
import { AuthState, User, KYCStatus, ApiError } from '../types/auth.types';
import { PiWallet, MiningStatus, WalletStatus, MiningSession } from '../types/pi.types';
import { Transaction, TransactionStatus, TransactionType } from '../types/transaction.types';

/**
 * Root state interface for the entire Redux store with comprehensive security context
 */
export interface RootState {
  auth: AuthState;
  accounts: AccountState;
  transactions: TransactionState;
  pi: PiState;
  security: SecurityState;
}

/**
 * Enhanced account state interface with validation and error tracking
 */
export interface AccountState {
  /** List of user accounts */
  accounts: Account[];
  /** Currently selected account */
  selectedAccount: Account | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error state for account operations */
  error: AccountError | null;
  /** Account validation state */
  validation: AccountValidationState;
}

/**
 * Enhanced transaction state interface with security validation
 */
export interface TransactionState {
  /** List of all transactions */
  transactions: Transaction[];
  /** Recent transactions for quick access */
  recentTransactions: Transaction[];
  /** Loading state indicator */
  loading: boolean;
  /** Error state for transaction operations */
  error: TransactionError | null;
  /** Transaction validation state */
  validation: TransactionValidationState;
}

/**
 * Enhanced Pi Network integration state interface with security validation
 */
export interface PiState {
  /** Pi wallet information */
  wallet: PiWallet | null;
  /** Current mining status */
  miningStatus: MiningStatus;
  /** Current mining rate in Pi/hour */
  miningRate: number;
  /** Active mining session */
  activeSession: MiningSession | null;
  /** Loading state indicator */
  loading: boolean;
  /** Error state for Pi operations */
  error: PiError | null;
  /** Pi Network validation state */
  validation: PiValidationState;
}

/**
 * Enhanced security state interface for global security context
 */
export interface SecurityState {
  /** Last security audit timestamp */
  lastSecurityAudit: string;
  /** Current security version */
  securityVersion: string;
  /** Active security alerts */
  alerts: SecurityAlert[];
  /** Security validation state */
  validation: SecurityValidationState;
}

/**
 * Account validation state interface
 */
export interface AccountValidationState {
  /** Overall validation status */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** Account-specific validation rules */
  rules: {
    balanceLimit: number;
    allowedTransactionTypes: TransactionType[];
    statusRestrictions: AccountStatus[];
  };
}

/**
 * Transaction validation state interface
 */
export interface TransactionValidationState {
  /** Overall validation status */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** Transaction limits */
  limits: {
    maxAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
}

/**
 * Pi Network validation state interface
 */
export interface PiValidationState {
  /** Overall validation status */
  isValid: boolean;
  /** List of validation errors */
  errors: string[];
  /** Pi-specific validation rules */
  rules: {
    maxMiningRate: number;
    minWalletBalance: number;
    maxTransactionAmount: number;
  };
}

/**
 * Security validation state interface
 */
export interface SecurityValidationState {
  /** Overall security status */
  isSecure: boolean;
  /** List of security violations */
  violations: string[];
  /** Security requirements */
  requirements: {
    minPasswordLength: number;
    requireMFA: boolean;
    sessionTimeout: number;
  };
}

/**
 * Enhanced error interfaces for different operations
 */
export interface AccountError extends ApiError {
  accountId?: string;
  accountType?: AccountType;
}

export interface TransactionError extends ApiError {
  transactionId?: string;
  transactionType?: TransactionType;
}

export interface PiError extends ApiError {
  walletAddress?: string;
  miningSessionId?: string;
}

/**
 * Security alert interface for security monitoring
 */
export interface SecurityAlert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
}

/**
 * Initial state template for reducers with validation
 */
export const INITIAL_STATE = {
  loading: false,
  error: null,
  validation: { isValid: true, errors: [] }
};