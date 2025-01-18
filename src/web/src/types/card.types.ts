/**
 * Type definitions for virtual card management in the FPBE mobile banking application
 * Supports comprehensive virtual card data structures, control settings, and status tracking
 */

/**
 * Enum defining available virtual card types
 */
export enum CardType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
  PREPAID = 'PREPAID',
  CORPORATE = 'CORPORATE',
  SINGLE_USE = 'SINGLE_USE'
}

/**
 * Enum defining possible virtual card statuses
 */
export enum CardStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
  PENDING_ACTIVATION = 'PENDING_ACTIVATION',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Interface defining comprehensive card control settings
 */
export interface CardControls {
  onlinePurchases: boolean;
  internationalTransactions: boolean;
  atmWithdrawals: boolean;
  contactlessPayments: boolean;
  recurringPayments: boolean;
  geoRestrictions: string[];
  merchantCategories: string[];
  transactionLimits: {
    daily: number;
    monthly: number;
    perTransaction: number;
  };
}

/**
 * Interface defining the structure of a virtual card with comprehensive type safety
 */
export interface Card {
  id: string;
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  type: CardType;
  status: CardStatus;
  controls: CardControls;
  spendingLimit: number;
  currentSpending: number;
  currency: string;
  issuedAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}