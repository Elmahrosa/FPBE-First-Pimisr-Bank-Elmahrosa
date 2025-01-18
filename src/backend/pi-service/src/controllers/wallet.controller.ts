import { Controller, Post, Get, Put, Body, Param, UseGuards, UseInterceptors, HttpException, HttpStatus } from '@nestjs/common'; // ^8.0.0
import { RateLimit } from '@nestjs/throttler'; // ^3.0.0
import { SecurityHeaders } from '@nestjs/helmet'; // ^8.0.0
import { AuditLogger } from '@nestjs/audit'; // ^1.0.0
import { Request, Response } from 'express';

import { WalletService } from '../services/wallet.service';
import { PiWallet, PiTransaction, WalletStatus, TransactionType, SecurityLevel } from '../models/wallet.model';
import { AuthGuard } from '../guards/auth.guard';
import { SecurityInterceptor } from '../interceptors/security.interceptor';
import { ValidationInterceptor } from '../interceptors/validation.interceptor';
import { piConfig } from '../config/pi.config';

@Controller('/api/v1/wallet')
@UseGuards(AuthGuard)
@UseInterceptors(SecurityInterceptor, ValidationInterceptor)
@SecurityHeaders()
export class WalletController {
    constructor(
        private readonly walletService: WalletService,
        private readonly auditLogger: AuditLogger
    ) {}

    @Post('/')
    @RateLimit({ ttl: 60, limit: piConfig.security.rateLimiting.maxRequests })
    @UseGuards(AuthGuard)
    async createWallet(@Body() body: { userId: string }): Promise<PiWallet> {
        try {
            this.auditLogger.log('Wallet creation initiated', {
                userId: body.userId,
                timestamp: new Date(),
                action: 'CREATE_WALLET'
            });

            const wallet = await this.walletService.createWallet(body.userId);

            this.auditLogger.log('Wallet created successfully', {
                userId: body.userId,
                walletAddress: wallet.walletAddress,
                timestamp: new Date(),
                action: 'WALLET_CREATED'
            });

            return wallet;
        } catch (error) {
            this.auditLogger.error('Wallet creation failed', {
                userId: body.userId,
                error: error.message,
                timestamp: new Date()
            });
            throw new HttpException(
                'Failed to create wallet',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('/:userId')
    @RateLimit({ ttl: 60, limit: piConfig.security.rateLimiting.maxRequests })
    async getWallet(@Param('userId') userId: string): Promise<PiWallet> {
        try {
            this.auditLogger.log('Wallet retrieval initiated', {
                userId,
                timestamp: new Date(),
                action: 'GET_WALLET'
            });

            const wallet = await this.walletService.getWallet(userId);

            if (!wallet) {
                throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
            }

            return wallet;
        } catch (error) {
            this.auditLogger.error('Wallet retrieval failed', {
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('/transfer')
    @RateLimit({ ttl: 60, limit: piConfig.security.rateLimiting.maxRequests })
    @UseGuards(AuthGuard)
    async transferPi(
        @Body() transferData: {
            fromAddress: string;
            toAddress: string;
            amount: number;
        }
    ): Promise<PiTransaction> {
        try {
            this.auditLogger.log('Pi transfer initiated', {
                ...transferData,
                timestamp: new Date(),
                action: 'TRANSFER_PI'
            });

            if (transferData.amount > piConfig.wallet.maxTransactionAmount) {
                throw new HttpException(
                    'Transfer amount exceeds limit',
                    HttpStatus.BAD_REQUEST
                );
            }

            const transaction = await this.walletService.transferPi(
                transferData.fromAddress,
                transferData.toAddress,
                transferData.amount
            );

            this.auditLogger.log('Pi transfer completed', {
                transactionId: transaction.id,
                ...transferData,
                timestamp: new Date(),
                action: 'TRANSFER_COMPLETED'
            });

            return transaction;
        } catch (error) {
            this.auditLogger.error('Pi transfer failed', {
                ...transferData,
                error: error.message,
                timestamp: new Date()
            });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('/:userId/transactions')
    @RateLimit({ ttl: 60, limit: piConfig.security.rateLimiting.maxRequests })
    async getTransactionHistory(
        @Param('userId') userId: string,
        @Body() filters: {
            startDate?: Date;
            endDate?: Date;
            type?: TransactionType;
            status?: string;
        }
    ): Promise<PiTransaction[]> {
        try {
            this.auditLogger.log('Transaction history retrieval initiated', {
                userId,
                filters,
                timestamp: new Date(),
                action: 'GET_TRANSACTIONS'
            });

            const transactions = await this.walletService.getTransactionHistory(
                userId,
                filters
            );

            return transactions;
        } catch (error) {
            this.auditLogger.error('Transaction history retrieval failed', {
                userId,
                error: error.message,
                timestamp: new Date()
            });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('/:walletAddress/status')
    @RateLimit({ ttl: 60, limit: piConfig.security.rateLimiting.maxRequests })
    async getWalletStatus(
        @Param('walletAddress') walletAddress: string
    ): Promise<{
        status: WalletStatus;
        securityLevel: SecurityLevel;
        lastAuditDate: Date;
    }> {
        try {
            this.auditLogger.log('Wallet status check initiated', {
                walletAddress,
                timestamp: new Date(),
                action: 'CHECK_WALLET_STATUS'
            });

            const status = await this.walletService.getWalletStatus(walletAddress);

            return status;
        } catch (error) {
            this.auditLogger.error('Wallet status check failed', {
                walletAddress,
                error: error.message,
                timestamp: new Date()
            });
            throw new HttpException(
                error.message,
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}