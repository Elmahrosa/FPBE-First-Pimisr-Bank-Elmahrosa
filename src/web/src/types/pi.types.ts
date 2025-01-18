/**
 * @fileoverview TypeScript type definitions for Pi Network integration features
 * including mining, wallet management, and transactions in the FPBE mobile banking application.
 * @version 1.0.0
 * 
 * @requires bignumber.js ^9.0.0
 */

import { ApiResponse } from './api.types';
import BigNumber from 'bignumber.js';

/**
 * Enumeration of possible mining session statuses
 */
export enum MiningStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    STOPPED = 'STOPPED',
    ERROR = 'ERROR'
}

/**
 * Enumeration of possible Pi wallet statuses
 */
export enum WalletStatus {
    ACTIVE = 'ACTIVE',
    LOCKED = 'LOCKED',
    SUSPENDED = 'SUSPENDED'
}

/**
 * Enumeration of supported Pi transaction types
 */
export enum TransactionType {
    MINING = 'MINING',
    TRANSFER = 'TRANSFER',
    EXCHANGE = 'EXCHANGE'
}

/**
 * Enumeration of possible transaction statuses
 */
export enum TransactionStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

/**
 * Type alias for UUID strings
 */
type UUID = string;

/**
 * Type alias for ISO 8601 datetime strings
 */
type ISODateTime = string;

/**
 * Type alias for semantic version strings
 */
type SemVer = string;

/**
 * Enumeration of supported device types
 */
enum DeviceType {
    MOBILE = 'MOBILE',
    TABLET = 'TABLET',
    DESKTOP = 'DESKTOP'
}

/**
 * Enumeration of supported platforms
 */
enum Platform {
    IOS = 'IOS',
    ANDROID = 'ANDROID',
    WEB = 'WEB'
}

/**
 * Interface for mining device information
 */
export interface DeviceInfo {
    deviceId: UUID;
    deviceType: DeviceType;
    platform: Platform;
    version: SemVer;
}

/**
 * Interface for transaction metadata
 */
interface TransactionMetadata {
    networkFee?: BigNumber;
    exchangeRate?: BigNumber;
    memo?: string;
    blockHeight?: number;
    blockHash?: string;
    confirmations?: number;
}

/**
 * Interface for Pi mining session data
 */
export interface MiningSession {
    sessionId: UUID;
    status: MiningStatus;
    miningRate: number;
    totalMined: BigNumber;
    currentBalance: BigNumber;
    startTime: ISODateTime;
    lastUpdateTime: ISODateTime;
    deviceInfo: DeviceInfo;
    algorithmVersion: string;
    networkDifficulty: number;
    estimatedEarningsRate: BigNumber;
}

/**
 * Interface for Pi wallet data
 */
export interface PiWallet {
    id: UUID;
    walletAddress: string;
    balance: BigNumber;
    lastMined: ISODateTime;
    status: WalletStatus;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
}

/**
 * Interface for Pi transaction data
 */
export interface PiTransaction {
    id: UUID;
    type: TransactionType;
    amount: BigNumber;
    fromAddress: string;
    toAddress: string;
    status: TransactionStatus;
    metadata: TransactionMetadata;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
}

/**
 * Global constants for Pi Network integration
 */
export const DEFAULT_MINING_RATE = 0.25;
export const MAX_ACTIVE_SESSIONS = 1;

/**
 * Type definitions for API responses related to Pi Network operations
 */
export type PiWalletResponse = ApiResponse<PiWallet>;
export type PiTransactionResponse = ApiResponse<PiTransaction>;
export type MiningSessionResponse = ApiResponse<MiningSession>;
export type PiTransactionListResponse = ApiResponse<PiTransaction[]>;