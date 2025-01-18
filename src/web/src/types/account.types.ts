/**
 * @fileoverview Type definitions for account-related data structures in the FPBE mobile banking application.
 * Provides comprehensive type safety and alignment with backend data models.
 * @version 1.0.0
 */

/**
 * Enumeration of available account types supporting core banking features.
 * Maps to backend account type classifications.
 */
export enum AccountType {
    SAVINGS = 'SAVINGS',
    CHECKING = 'CHECKING',
    VIRTUAL = 'VIRTUAL'
}

/**
 * Enumeration of possible account statuses for account lifecycle management.
 * Used for controlling account accessibility and operations.
 */
export enum AccountStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    BLOCKED = 'BLOCKED',
    CLOSED = 'CLOSED'
}

/**
 * Comprehensive interface defining the account data structure.
 * Ensures type safety and provides complete account information including audit trail.
 */
export interface Account {
    /** Unique identifier for the account */
    id: string;
    
    /** Reference to the account owner's user ID */
    userId: string;
    
    /** Type of account (savings, checking, virtual) */
    accountType: AccountType;
    
    /** Current balance in the account's currency */
    balance: number;
    
    /** Currency code for the account (e.g., USD, EUR) */
    currency: string;
    
    /** Current status of the account */
    status: AccountStatus;
    
    /** ISO 8601 timestamp of account creation */
    createdAt: string;
    
    /** ISO 8601 timestamp of last account update */
    updatedAt: string;
}

/**
 * Interface for account creation request payload.
 * Ensures valid data submission when creating new accounts.
 */
export interface CreateAccountRequest {
    /** User ID for whom the account is being created */
    userId: string;
    
    /** Type of account to be created */
    accountType: AccountType;
    
    /** Currency code for the new account */
    currency: string;
}

/**
 * Interface for account status update request payload.
 * Supports account lifecycle management operations.
 */
export interface UpdateAccountStatusRequest {
    /** New status to be applied to the account */
    status: AccountStatus;
}