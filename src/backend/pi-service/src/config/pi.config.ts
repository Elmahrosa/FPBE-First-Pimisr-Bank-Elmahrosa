// Version: 1.0.0
// External dependencies
import dotenv from 'dotenv'; // ^16.0.0 - Environment variable management

// Initialize environment variables
dotenv.config();

// Global constants
const NODE_ENV = process.env.NODE_ENV || 'development';
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_SECRET = process.env.PI_API_SECRET;
const CONFIG_VERSION = '1.0.0';

// Configuration validation decorator
function validateOnStartup(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function() {
        if (!PI_API_KEY || !PI_API_SECRET) {
            throw new Error('Pi Network API credentials are required');
        }
        return originalMethod.apply(this, arguments);
    };
    return descriptor;
}

// Admin-only decorator for protected operations
function adminOnly(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function() {
        // Admin validation would be implemented based on auth context
        return originalMethod.apply(this, arguments);
    };
    return descriptor;
}

// Configuration interface definitions
interface SDKConfig {
    apiKey: string;
    apiSecret: string;
    apiVersion: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
    maxConcurrentRequests: number;
}

interface MiningConfig {
    defaultRate: number;
    maxRate: number;
    minRate: number;
    sessionTimeout: number;
    maxSessionsPerUser: number;
    cooldownPeriod: number;
    dailyLimit: number;
    monitoringInterval: number;
}

interface WalletConfig {
    minBalance: number;
    maxTransactionAmount: number;
    transactionFee: number;
    confirmationBlocks: number;
    addressFormat: string;
    maxPendingTransactions: number;
}

interface NetworkEndpoint {
    rpcEndpoint: string;
    wsEndpoint: string;
    explorerUrl: string;
    healthCheckInterval: number;
}

interface NetworkConfig {
    mainnet: NetworkEndpoint;
    testnet: NetworkEndpoint;
}

interface SecurityConfig {
    rateLimiting: {
        enabled: boolean;
        maxRequests: number;
        windowMs: number;
    };
    encryption: {
        algorithm: string;
        keyRotationInterval: number;
    };
}

interface LoggingConfig {
    level: string;
    format: string;
    piNetworkEvents: boolean;
    sensitiveFields: string[];
    rotationInterval: string;
    maxFiles: number;
}

interface PiConfig {
    version: string;
    sdk: SDKConfig;
    mining: MiningConfig;
    wallet: WalletConfig;
    network: NetworkConfig;
    security: SecurityConfig;
    logging: LoggingConfig;
}

// Configuration validation function
@validateOnStartup
function validateConfig(): void {
    // Validate SDK configuration
    if (!piConfig.sdk.apiKey || !piConfig.sdk.apiSecret) {
        throw new Error('SDK credentials are required');
    }

    // Validate mining parameters
    if (piConfig.mining.maxRate < piConfig.mining.minRate) {
        throw new Error('Invalid mining rate configuration');
    }

    // Validate wallet configuration
    if (!new RegExp(piConfig.wallet.addressFormat).test('pi1234567890abcdef')) {
        throw new Error('Invalid wallet address format');
    }

    // Validate network endpoints
    if (!piConfig.network.mainnet.rpcEndpoint || !piConfig.network.mainnet.wsEndpoint) {
        throw new Error('Network endpoints are required');
    }
}

// Configuration reload function
@adminOnly
async function reloadConfig(): Promise<void> {
    try {
        dotenv.config();
        validateConfig();
        // Notify subscribers of configuration change
        // Implementation would depend on event system
    } catch (error) {
        throw new Error(`Configuration reload failed: ${error.message}`);
    }
}

// Main configuration object
export const piConfig: PiConfig = {
    version: CONFIG_VERSION,
    sdk: {
        apiKey: PI_API_KEY!,
        apiSecret: PI_API_SECRET!,
        apiVersion: 'v1',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        maxConcurrentRequests: 50
    },
    mining: {
        defaultRate: 0.25,
        maxRate: 1.0,
        minRate: 0.1,
        sessionTimeout: 3600,
        maxSessionsPerUser: 1,
        cooldownPeriod: 300,
        dailyLimit: 24.0,
        monitoringInterval: 60
    },
    wallet: {
        minBalance: 0,
        maxTransactionAmount: 1000,
        transactionFee: 0.001,
        confirmationBlocks: 6,
        addressFormat: '^pi[a-zA-Z0-9]{32}$',
        maxPendingTransactions: 10
    },
    network: {
        mainnet: {
            rpcEndpoint: process.env.PI_MAINNET_RPC!,
            wsEndpoint: process.env.PI_MAINNET_WS!,
            explorerUrl: process.env.PI_EXPLORER_URL!,
            healthCheckInterval: 30000
        },
        testnet: {
            rpcEndpoint: process.env.PI_TESTNET_RPC!,
            wsEndpoint: process.env.PI_TESTNET_WS!,
            explorerUrl: process.env.PI_TESTNET_EXPLORER_URL!,
            healthCheckInterval: 30000
        }
    },
    security: {
        rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 60000
        },
        encryption: {
            algorithm: 'aes-256-gcm',
            keyRotationInterval: 86400000 // 24 hours
        }
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        piNetworkEvents: true,
        sensitiveFields: ['apiKey', 'apiSecret'],
        rotationInterval: '1d',
        maxFiles: 30
    }
};

// Validate configuration on module load
validateConfig();

// Export configuration and utilities
export { validateConfig, reloadConfig };