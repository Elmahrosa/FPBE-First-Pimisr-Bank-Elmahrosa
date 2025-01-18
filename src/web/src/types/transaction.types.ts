/**
 * @fileoverview TypeScript type definitions for transaction-related data structures
 * in the FPBE mobile banking application frontend, supporting both traditional banking
 * and Pi Network transactions with comprehensive validation and type safety.
 * @version 1.0.0
 */

import { BaseEntity } from './api.types';
import { Account } from './account.types';
import { PiTransaction } from './pi.types';

/**
 * Enumeration of all supported transaction types including traditional banking
 * and Pi Network operations.
 */
export enum TransactionType {
    TRANSFER = 'TRANSFER',
    PAYMENT = 'PAYMENT',
    BILL_PAYMENT = 'BILL_PAYMENT',
    QR_PAYMENT = 'QR_PAYMENT',
    PI_EXCHANGE = 'PI_EXCHANGE',
    PI_MINING_REWARD = 'PI_MINING_REWARD'
}

/**
 * Extended transaction status enumeration including blockchain-specific statuses
 * for comprehensive transaction lifecycle tracking.
 */
export enum TransactionStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
    BLOCKCHAIN_CONFIRMED = 'BLOCKCHAIN_CONFIRMED'
}

/**
 * Global constants for transaction processing
 */
export const MAX_TRANSACTION_AMOUNT = 50000;
export const DEFAULT_CURRENCY = 'USD';
export const MAX_PROCESSING_ATTEMPTS = 3;
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'PI'];

/**
 * Comprehensive transaction interface with enhanced validation and error tracking.
 * Extends BaseEntity for audit trail support.
 */
export interface Transaction extends BaseEntity {
    /** Transaction type identifier */
    type: TransactionType;

    /** Source account identifier */
    fromAccountId: string;

    /** Destination account identifier */
    toAccountId: string;

    /** Transaction amount in the specified currency */
    amount: number;

    /** Currency code for the transaction */
    currency: string;

    /** Current transaction status */
    status: TransactionStatus;

    /** Human-readable transaction description */
    description: string;

    /** Additional transaction metadata */
    metadata: Record<string, any>;

    /** Optional Pi Network specific transaction details */
    piTransactionDetails?: PiTransaction;

    /** Number of processing attempts for retry tracking */
    processingAttempts: number;

    /** Last error message if transaction failed */
    lastErrorMessage?: string;
}

/**
 * Interface for creating new transactions with optional Pi Network details.
 * Used for transaction creation requests.
 */
export interface CreateTransactionRequest {
    /** Type of transaction to create */
    type: TransactionType;

    /** Source account identifier */
    fromAccountId: string;

    /** Destination account identifier */
    toAccountId: string;

    /** Transaction amount */
    amount: number;

    /** Currency code */
    currency: string;

    /** Optional transaction description */
    description?: string;

    /** Optional transaction metadata */
    metadata?: Record<string, any>;

    /** Optional Pi Network transaction details */
    piTransactionDetails?: Partial<PiTransaction>;
}

/**
 * Type guard to check if a transaction is Pi Network related
 * @param transaction Transaction to check
 * @returns boolean indicating if transaction is Pi Network related
 */
export function isPiTransaction(transaction: Transaction): boolean {
    return transaction.type === TransactionType.PI_EXCHANGE || 
           transaction.type === TransactionType.PI_MINING_REWARD;
}

/**
 * Type guard to check if a transaction is in a final state
 * @param status Transaction status to check
 * @returns boolean indicating if status is final
 */
export function isFinalStatus(status: TransactionStatus): boolean {
    return [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
        TransactionStatus.BLOCKCHAIN_CONFIRMED
    ].includes(status);
}

/**
 * Type guard to check if a transaction needs blockchain confirmation
 * @param transaction Transaction to check
 * @returns boolean indicating if blockchain confirmation is needed
 */
export function needsBlockchainConfirmation(transaction: Transaction): boolean {
    return isPiTransaction(transaction) && 
           transaction.status === TransactionStatus.PENDING_CONFIRMATION;
}