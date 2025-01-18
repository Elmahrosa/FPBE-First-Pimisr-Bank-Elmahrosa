import { Router } from 'express'; // ^4.17.1
import { authenticate } from '@nestjs/passport'; // ^8.0.0
import { rateLimit } from 'express-rate-limit'; // ^5.3.0
import { cache } from 'express-cache-middleware'; // ^1.0.0
import { validator } from 'express-validator'; // ^6.14.0
import { helmet } from 'helmet'; // ^4.6.0

import { MiningController } from '../controllers/mining.controller';
import { WalletController } from '../controllers/wallet.controller';

// Global constants
const API_VERSION = 'v1';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;
const CACHE_DURATION = 5 * 60; // 5 minutes
const MAX_TRANSACTION_AMOUNT = 1000;

// Initialize router
const router = Router();

// Apply global middleware
router.use(helmet());
router.use(authenticate('jwt'));

// Configure rate limiting
const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    message: 'Too many requests, please try again later'
});

// Configure caching
const cacheMiddleware = cache({
    duration: CACHE_DURATION,
    getKey: (req) => `${req.path}-${req.user?.id}`
});

/**
 * Configure mining routes with enhanced security and validation
 */
function configureMiningRoutes(router: Router, miningController: MiningController): Router {
    // Mining-specific rate limiter
    const miningLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: 10, // Stricter limit for mining operations
        message: 'Mining rate limit exceeded'
    });

    // Start mining session
    router.post(
        `/${API_VERSION}/mining/start`,
        miningLimiter,
        validator.body('deviceInfo').isObject(),
        async (req, res, next) => {
            try {
                const session = await miningController.startMining(req.body.deviceInfo);
                res.status(201).json(session);
            } catch (error) {
                next(error);
            }
        }
    );

    // Stop mining session
    router.put(
        `/${API_VERSION}/mining/stop/:sessionId`,
        miningLimiter,
        validator.param('sessionId').isString(),
        async (req, res, next) => {
            try {
                await miningController.stopMining(req.params.sessionId);
                res.status(200).send();
            } catch (error) {
                next(error);
            }
        }
    );

    // Get mining status with caching
    router.get(
        `/${API_VERSION}/mining/status/:sessionId`,
        cacheMiddleware,
        validator.param('sessionId').isString(),
        async (req, res, next) => {
            try {
                const status = await miningController.getMiningStatus(req.params.sessionId);
                res.status(200).json(status);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get mining rewards with caching
    router.get(
        `/${API_VERSION}/mining/rewards/:sessionId`,
        cacheMiddleware,
        validator.param('sessionId').isString(),
        async (req, res, next) => {
            try {
                const rewards = await miningController.getMiningRewards(req.params.sessionId);
                res.status(200).json({ rewards });
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

/**
 * Configure wallet routes with enhanced security and transaction validation
 */
function configureWalletRoutes(router: Router, walletController: WalletController): Router {
    // Wallet-specific rate limiter
    const walletLimiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: 50, // Moderate limit for wallet operations
        message: 'Wallet operation rate limit exceeded'
    });

    // Create wallet
    router.post(
        `/${API_VERSION}/wallet`,
        walletLimiter,
        validator.body('userId').isString(),
        async (req, res, next) => {
            try {
                const wallet = await walletController.createWallet(req.body);
                res.status(201).json(wallet);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get wallet with caching
    router.get(
        `/${API_VERSION}/wallet/:userId`,
        cacheMiddleware,
        validator.param('userId').isString(),
        async (req, res, next) => {
            try {
                const wallet = await walletController.getWallet(req.params.userId);
                res.status(200).json(wallet);
            } catch (error) {
                next(error);
            }
        }
    );

    // Transfer Pi
    router.post(
        `/${API_VERSION}/wallet/transfer`,
        walletLimiter,
        validator.body('fromAddress').isString(),
        validator.body('toAddress').isString(),
        validator.body('amount').isFloat({ min: 0, max: MAX_TRANSACTION_AMOUNT }),
        async (req, res, next) => {
            try {
                const transaction = await walletController.transferPi(req.body);
                res.status(200).json(transaction);
            } catch (error) {
                next(error);
            }
        }
    );

    // Get transaction history with caching
    router.get(
        `/${API_VERSION}/wallet/:userId/transactions`,
        cacheMiddleware,
        validator.param('userId').isString(),
        validator.query('startDate').optional().isISO8601(),
        validator.query('endDate').optional().isISO8601(),
        validator.query('type').optional().isString(),
        validator.query('status').optional().isString(),
        async (req, res, next) => {
            try {
                const transactions = await walletController.getTransactionHistory(
                    req.params.userId,
                    req.query
                );
                res.status(200).json(transactions);
            } catch (error) {
                next(error);
            }
        }
    );

    return router;
}

// Configure routes
configureMiningRoutes(router, new MiningController());
configureWalletRoutes(router, new WalletController());

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
    console.error('Route Error:', error);
    res.status(error.status || 500).json({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

export default router;