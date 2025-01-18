import { describe, test, beforeAll, afterAll, expect, jest } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import { Container } from 'inversify'; // ^6.0.1
import { PerformanceMonitor } from '@performance/monitor'; // ^2.1.0

import { PiSDKService } from '../src/services/pi-sdk.service';
import { MiningService } from '../src/services/mining.service';
import { WalletService } from '../src/services/wallet.service';
import { MiningStatus, DeviceType } from '../src/models/mining.model';
import { WalletStatus, TransactionType, SecurityLevel } from '../src/models/wallet.model';

// Test constants
const TEST_USER_ID = 'test-user-123';
const TEST_DEVICE_INFO = {
    deviceId: 'test-device-123',
    deviceType: DeviceType.MOBILE,
    platform: 'android',
    version: '1.0.0',
    lastKnownLocation: {
        latitude: 0,
        longitude: 0,
        accuracy: 10,
        timestamp: new Date()
    },
    hardwareSignature: 'test-signature',
    securityLevel: 8
};
const PERFORMANCE_THRESHOLDS = {
    miningStart: 3000,  // 3 seconds
    walletOperation: 2000,  // 2 seconds
    transactionProcess: 3000  // 3 seconds
};

describe('Pi Network Integration Tests', () => {
    let container: Container;
    let piSdkService: PiSDKService;
    let miningService: MiningService;
    let walletService: WalletService;
    let performanceMonitor: PerformanceMonitor;
    let testWallet: any;
    let testMiningSession: any;

    beforeAll(async () => {
        // Setup dependency injection container
        container = new Container();
        container.bind<PiSDKService>('PiSDKService').to(PiSDKService);
        container.bind<MiningService>('MiningService').to(MiningService);
        container.bind<WalletService>('WalletService').to(WalletService);
        container.bind<PerformanceMonitor>('PerformanceMonitor').to(PerformanceMonitor);

        // Initialize services
        piSdkService = container.get<PiSDKService>('PiSDKService');
        miningService = container.get<MiningService>('MiningService');
        walletService = container.get<WalletService>('WalletService');
        performanceMonitor = container.get<PerformanceMonitor>('PerformanceMonitor');

        // Initialize SDK
        await piSdkService.initializeSdk();

        // Create test wallet
        testWallet = await walletService.createWallet(TEST_USER_ID);
    });

    afterAll(async () => {
        // Cleanup test data
        if (testMiningSession) {
            await miningService.stopMining(testMiningSession.sessionId);
        }
        await performanceMonitor.generateReport();
        container.unbindAll();
    });

    describe('Mining Operations', () => {
        test('should start mining session with performance monitoring', async () => {
            const startTime = performanceMonitor.startTimer('mining-start');

            testMiningSession = await miningService.startMining(TEST_USER_ID, TEST_DEVICE_INFO);

            const duration = performanceMonitor.endTimer(startTime);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.miningStart);

            expect(testMiningSession).toBeDefined();
            expect(testMiningSession.status).toBe(MiningStatus.ACTIVE);
            expect(testMiningSession.userId).toBe(TEST_USER_ID);
            expect(testMiningSession.deviceInfo).toMatchObject(TEST_DEVICE_INFO);
        });

        test('should validate mining rate calculations', async () => {
            const miningRate = testMiningSession.miningRate;
            expect(miningRate).toBeGreaterThan(0);
            expect(miningRate).toBeLessThanOrEqual(1.0);

            const updatedSession = await miningService.getMiningStatus(testMiningSession.sessionId);
            expect(updatedSession.miningRate).toBe(miningRate);
        });

        test('should enforce security validations during mining', async () => {
            const securityContext = await piSdkService.validateSecurityContext(
                TEST_USER_ID,
                TEST_DEVICE_INFO
            );
            expect(securityContext.isValid).toBe(true);
            expect(securityContext.securityLevel).toBeGreaterThanOrEqual(7);
        });
    });

    describe('Wallet Management', () => {
        test('should create and validate wallet with security checks', async () => {
            const startTime = performanceMonitor.startTimer('wallet-creation');

            const wallet = await walletService.createWallet(TEST_USER_ID);
            
            const duration = performanceMonitor.endTimer(startTime);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.walletOperation);

            expect(wallet).toBeDefined();
            expect(wallet.status).toBe(WalletStatus.PENDING_VERIFICATION);
            expect(wallet.securityLevel).toBe(SecurityLevel.BASIC);
        });

        test('should process wallet transactions within performance limits', async () => {
            const startTime = performanceMonitor.startTimer('transaction-process');

            const transaction = await walletService.transferPi(
                testWallet.walletAddress,
                'pi1234567890abcdef',
                0.1
            );

            const duration = performanceMonitor.endTimer(startTime);
            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.transactionProcess);

            expect(transaction).toBeDefined();
            expect(transaction.status).toBe('COMPLETED');
        });
    });

    describe('Performance Metrics', () => {
        test('should monitor and validate performance metrics', async () => {
            const metrics = await miningService.getPerformanceMetrics(testMiningSession.sessionId);
            
            expect(metrics).toBeDefined();
            expect(metrics.cpuUsage).toBeLessThan(80);
            expect(metrics.memoryUsage).toBeLessThan(512);
            expect(metrics.networkLatency).toBeLessThan(100);
        });

        test('should validate transaction processing times', async () => {
            const transactions = await Promise.all([
                performanceMonitor.measureAsync('transaction-1', () => 
                    walletService.transferPi(testWallet.walletAddress, 'pi1234567890abcdef', 0.1)
                ),
                performanceMonitor.measureAsync('transaction-2', () =>
                    walletService.transferPi(testWallet.walletAddress, 'pi0987654321fedcba', 0.2)
                )
            ]);

            transactions.forEach(transaction => {
                expect(transaction.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.transactionProcess);
                expect(transaction.result.status).toBe('COMPLETED');
            });
        });
    });

    describe('Security Validations', () => {
        test('should enforce rate limiting', async () => {
            const requests = Array(12).fill(null).map(() => 
                walletService.getWallet(TEST_USER_ID)
            );

            await expect(Promise.all(requests)).rejects.toThrow('Rate limit exceeded');
        });

        test('should validate transaction security', async () => {
            const validation = await walletService.validateTransaction({
                fromAddress: testWallet.walletAddress,
                toAddress: 'pi1234567890abcdef',
                amount: 1000000  // Exceeds limit
            });

            expect(validation.isValid).toBe(false);
            expect(validation.errors).toContain('AMOUNT_EXCEEDS_LIMIT');
        });

        test('should maintain secure session state', async () => {
            const sessionState = await miningService.getMiningStatus(testMiningSession.sessionId);
            
            expect(sessionState.securityMetrics).toBeDefined();
            expect(sessionState.securityMetrics.validationCount).toBeGreaterThan(0);
            expect(sessionState.securityMetrics.riskScore).toBeLessThan(50);
        });
    });
});