import { injectable, inject } from 'inversify'; // ^6.0.1
import { Model } from 'mongoose'; // ^6.0.0
import { Logger } from 'winston'; // ^3.8.0
import { Redis } from 'ioredis'; // ^5.0.0
import { RateLimiterMemory } from 'rate-limiter-flexible'; // ^2.3.0
import { createHash, randomBytes } from 'crypto';

import { PiWallet, PiTransaction, WalletStatus, TransactionType, TransactionStatus, SecurityLevel } from '../models/wallet.model';
import { PiSDKService } from './pi-sdk.service';
import { piConfig } from '../config/pi.config';

const CACHE_TTL = 300; // 5 minutes
const RATE_LIMIT_POINTS = 10;
const RATE_LIMIT_DURATION = 60; // 1 minute

@injectable()
export class WalletService {
    private rateLimiter: RateLimiterMemory;

    constructor(
        @inject('Logger') private logger: Logger,
        @inject('PiSDKService') private piSdkService: PiSDKService,
        @inject('WalletModel') private walletModel: Model<PiWallet>,
        @inject('TransactionModel') private transactionModel: Model<PiTransaction>,
        @inject('RedisClient') private redisClient: Redis
    ) {
        this.rateLimiter = new RateLimiterMemory({
            points: RATE_LIMIT_POINTS,
            duration: RATE_LIMIT_DURATION
        });
    }

    /**
     * Creates a new Pi wallet with enhanced security
     */
    public async createWallet(userId: string): Promise<PiWallet> {
        try {
            await this.rateLimiter.consume(userId);

            // Generate secure wallet address
            const randomSeed = randomBytes(32);
            const walletAddress = 'pi' + createHash('sha256')
                .update(randomSeed)
                .digest('hex')
                .substring(0, 32);

            // Create wallet with security controls
            const wallet = new this.walletModel({
                userId,
                walletAddress,
                balance: 0,
                status: WalletStatus.PENDING_VERIFICATION,
                securityLevel: SecurityLevel.BASIC,
                dailyTransactionLimit: piConfig.wallet.maxTransactionAmount,
                monthlyTransactionLimit: piConfig.wallet.maxTransactionAmount * 30,
                lastAuditDate: new Date(),
                riskScore: 0
            });

            await wallet.save();

            // Cache wallet data
            await this.cacheWalletData(wallet);

            this.logger.info('Wallet created successfully', {
                userId,
                walletAddress,
                timestamp: new Date()
            });

            return wallet;
        } catch (error) {
            this.logger.error('Failed to create wallet', {
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Retrieves wallet with caching and security checks
     */
    public async getWallet(userId: string): Promise<PiWallet> {
        try {
            await this.rateLimiter.consume(userId);

            // Check cache first
            const cachedWallet = await this.getCachedWallet(userId);
            if (cachedWallet) {
                return cachedWallet;
            }

            // Retrieve from database with security checks
            const wallet = await this.walletModel.findOne({
                userId,
                status: { $ne: WalletStatus.SUSPENDED }
            });

            if (!wallet) {
                throw new Error('Wallet not found');
            }

            // Sync balance with Pi Network
            const networkBalance = await this.piSdkService.getWalletBalance(wallet.walletAddress);
            if (networkBalance !== wallet.balance) {
                wallet.balance = networkBalance;
                await wallet.save();
            }

            // Update cache
            await this.cacheWalletData(wallet);

            this.logger.info('Wallet retrieved successfully', {
                userId,
                walletAddress: wallet.walletAddress,
                timestamp: new Date()
            });

            return wallet;
        } catch (error) {
            this.logger.error('Failed to retrieve wallet', {
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    /**
     * Updates wallet balance with enhanced validation and security
     */
    public async updateBalance(
        walletId: string,
        amount: number,
        type: TransactionType
    ): Promise<PiWallet> {
        try {
            const wallet = await this.walletModel.findById(walletId);
            if (!wallet) {
                throw new Error('Wallet not found');
            }

            await this.rateLimiter.consume(wallet.userId);

            // Validate transaction limits
            if (amount > wallet.dailyTransactionLimit) {
                throw new Error('Transaction exceeds daily limit');
            }

            // Create and sign transaction
            const transaction = new this.transactionModel({
                walletId,
                type,
                amount,
                status: TransactionStatus.PENDING,
                fromAddress: wallet.walletAddress,
                toAddress: wallet.walletAddress,
                metadata: {
                    initiatedAt: new Date(),
                    transactionType: type
                }
            });

            // Execute transaction through Pi Network
            const success = await this.piSdkService.transferPi(
                wallet.walletAddress,
                wallet.walletAddress,
                amount
            );

            if (!success) {
                throw new Error('Transaction failed on Pi Network');
            }

            // Update wallet balance
            wallet.balance += amount;
            wallet.lastAuditDate = new Date();
            await wallet.save();

            // Update transaction status
            transaction.status = TransactionStatus.COMPLETED;
            await transaction.save();

            // Invalidate cache
            await this.invalidateWalletCache(wallet.userId);

            this.logger.info('Balance updated successfully', {
                walletId,
                amount,
                type,
                timestamp: new Date()
            });

            return wallet;
        } catch (error) {
            this.logger.error('Failed to update balance', {
                walletId,
                amount,
                type,
                error: error.message,
                timestamp: new Date()
            });
            throw error;
        }
    }

    private async cacheWalletData(wallet: PiWallet): Promise<void> {
        const cacheKey = `wallet:${wallet.userId}`;
        await this.redisClient.setex(
            cacheKey,
            CACHE_TTL,
            JSON.stringify(wallet)
        );
    }

    private async getCachedWallet(userId: string): Promise<PiWallet | null> {
        const cacheKey = `wallet:${userId}`;
        const cachedData = await this.redisClient.get(cacheKey);
        return cachedData ? JSON.parse(cachedData) : null;
    }

    private async invalidateWalletCache(userId: string): Promise<void> {
        const cacheKey = `wallet:${userId}`;
        await this.redisClient.del(cacheKey);
    }
}