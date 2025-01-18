/**
 * @fileoverview Advanced logging service for FPBE mobile banking application
 * Implements structured logging with security features and performance tracking
 * @version 2024.1
 */

import winston from 'winston'; // v3.10.0
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.1
import config from 'config'; // v3.3.9
import { AnalyticsService } from './analytics.service';

// Log levels with semantic meanings
export enum LOG_LEVELS {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug'
}

// Fields that should be masked in logs for security
const SENSITIVE_FIELDS = [
    'password', 'token', 'pin', 'cardNumber', 'cvv',
    'privateKey', 'sessionId', 'biometricData',
    'accountNumber', 'routingNumber'
];

/**
 * Masks sensitive data in log messages with advanced pattern matching
 */
function maskSensitiveData(data: any, customFields: string[] = []): any {
    const fieldsToMask = [...SENSITIVE_FIELDS, ...customFields];
    
    if (typeof data === 'string') {
        let maskedData = data;
        fieldsToMask.forEach(field => {
            const regex = new RegExp(`(${field}["']?\\s*[:=]\\s*["']?)([^"'\\s,}]+)`, 'gi');
            maskedData = maskedData.replace(regex, '$1********');
        });
        return maskedData;
    }

    if (Array.isArray(data)) {
        return data.map(item => maskSensitiveData(item, customFields));
    }

    if (data && typeof data === 'object') {
        const maskedObj: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            if (fieldsToMask.includes(key.toLowerCase())) {
                maskedObj[key] = '********';
            } else if (typeof value === 'object') {
                maskedObj[key] = maskSensitiveData(value, customFields);
            } else {
                maskedObj[key] = value;
            }
        }
        return maskedObj;
    }

    return data;
}

/**
 * Advanced logging service with security features and performance tracking
 */
export class LoggerService {
    private logger: winston.Logger;
    private analyticsService: AnalyticsService;
    private rotateConfig: DailyRotateFile.DailyRotateFileTransportOptions;

    constructor(analyticsService: AnalyticsService) {
        this.analyticsService = analyticsService;
        this.rotateConfig = {
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
            maxSize: '100m',
            compress: true,
            zippedArchive: true
        };

        this.logger = winston.createLogger({
            level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
                winston.format.errors({ stack: true })
            ),
            defaultMeta: {
                service: 'fpbe-mobile-banking',
                environment: process.env.NODE_ENV,
                version: process.env.REACT_APP_VERSION
            },
            transports: this.configureTransports()
        });

        // Handle uncaught exceptions
        this.logger.exceptions.handle(
            new winston.transports.File({ filename: 'logs/exceptions.log' })
        );
    }

    private configureTransports(): winston.transport[] {
        const transports: winston.transport[] = [];

        // Console transport for development
        if (process.env.NODE_ENV !== 'production') {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }

        // File rotation transport for production
        if (process.env.NODE_ENV === 'production') {
            transports.push(
                new DailyRotateFile({
                    ...this.rotateConfig,
                    filename: 'logs/application-%DATE%.log',
                    level: 'info'
                }),
                new DailyRotateFile({
                    ...this.rotateConfig,
                    filename: 'logs/error-%DATE%.log',
                    level: 'error'
                })
            );
        }

        return transports;
    }

    /**
     * Enhanced logging method with context enrichment and security features
     */
    public async log(
        level: LOG_LEVELS,
        message: string,
        meta: Record<string, any> = {}
    ): Promise<void> {
        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        // Mask sensitive data
        const maskedMeta = maskSensitiveData(meta);
        const maskedMessage = maskSensitiveData(message);

        // Enrich log context
        const enrichedMeta = {
            ...maskedMeta,
            requestId,
            timestamp,
            correlationId: meta.correlationId || requestId,
            userId: meta.userId,
            sessionId: meta.sessionId
        };

        // Track performance metrics if provided
        if (meta.duration) {
            await this.analyticsService.trackPerformance(
                meta.operation || 'unknown_operation',
                meta.duration
            );
        }

        // Log with structured format
        this.logger.log(level, maskedMessage, enrichedMeta);

        // Track errors in analytics
        if (level === LOG_LEVELS.ERROR) {
            await this.analyticsService.trackError(maskedMessage, enrichedMeta);
        }
    }

    // Convenience methods for different log levels
    public async error(message: string, meta?: Record<string, any>): Promise<void> {
        return this.log(LOG_LEVELS.ERROR, message, meta);
    }

    public async warn(message: string, meta?: Record<string, any>): Promise<void> {
        return this.log(LOG_LEVELS.WARN, message, meta);
    }

    public async info(message: string, meta?: Record<string, any>): Promise<void> {
        return this.log(LOG_LEVELS.INFO, message, meta);
    }

    public async debug(message: string, meta?: Record<string, any>): Promise<void> {
        return this.log(LOG_LEVELS.DEBUG, message, meta);
    }
}

export default LoggerService;