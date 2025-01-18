/**
 * @fileoverview Enhanced error handling service for FPBE mobile banking application
 * Implements comprehensive error tracking, logging, and reporting with security measures
 * @version 2024.1
 */

import axios, { AxiosError } from 'axios'; // ^1.4.0
import * as Sentry from '@sentry/react-native'; // ^5.5.0
import winston from 'winston'; // ^3.10.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import { AnalyticsService } from './analytics.service';

// Error type enumeration
export enum ERROR_TYPES {
    API_ERROR = 'API_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTH_ERROR = 'AUTH_ERROR',
    RUNTIME_ERROR = 'RUNTIME_ERROR',
    PI_NETWORK_ERROR = 'PI_NETWORK_ERROR',
    TRANSACTION_ERROR = 'TRANSACTION_ERROR',
    COMPLIANCE_ERROR = 'COMPLIANCE_ERROR'
}

// Error severity levels
export enum ERROR_SEVERITY {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
    REGULATORY = 'regulatory'
}

// Sensitive fields that should be masked in error logs
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'pin',
    'cardNumber',
    'cvv',
    'accountNumber',
    'routingNumber',
    'piWalletKey',
    'biometricData',
    'socialSecurityNumber'
];

// Error context interface
interface ErrorContext {
    userId?: string;
    sessionId?: string;
    deviceId?: string;
    path?: string;
    metadata?: Record<string, any>;
    severity?: ERROR_SEVERITY;
    errorType?: ERROR_TYPES;
}

// Error result interface
interface ErrorResult {
    handled: boolean;
    errorId: string;
    severity: ERROR_SEVERITY;
    message: string;
    context: ErrorContext;
}

/**
 * Decorator for compliance checking in error handling
 */
function ComplianceCheck(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (error) {
            // Log compliance-related errors separately
            if (error.type === ERROR_TYPES.COMPLIANCE_ERROR) {
                await this.handleComplianceError(error);
            }
            throw error;
        }
    };
    return descriptor;
}

/**
 * Enhanced error handling service with banking-specific features and compliance
 */
export class ErrorService {
    private readonly logger: winston.Logger;
    private readonly analyticsService: AnalyticsService;
    private readonly rateLimiter: any;

    constructor(analyticsService: AnalyticsService) {
        this.analyticsService = analyticsService;
        this.initializeErrorService();
    }

    /**
     * Initializes error service components
     */
    private async initializeErrorService(): Promise<void> {
        // Initialize Winston logger with secure configuration
        this.logger = winston.createLogger({
            level: 'error',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            defaultMeta: { service: 'fpbe-mobile' },
            transports: [
                new winston.transports.File({ filename: 'error.log' }),
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });

        // Initialize Sentry with banking-specific configuration
        await this.initializeSentry();

        // Configure rate limiting for error logging
        this.rateLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        });
    }

    /**
     * Initializes Sentry with enhanced configuration
     */
    @ComplianceCheck
    private async initializeSentry(): Promise<void> {
        Sentry.init({
            dsn: process.env.REACT_APP_SENTRY_DSN,
            environment: process.env.REACT_APP_ENV,
            beforeSend(event) {
                // Mask sensitive data before sending to Sentry
                if (event.extra) {
                    event.extra = this.maskSensitiveData(event.extra);
                }
                return event;
            },
            integrations: [
                new Sentry.ReactNativeTracing({
                    tracingOrigins: ['api.fpbe.com']
                })
            ]
        });
    }

    /**
     * Masks sensitive data in error context
     */
    private maskSensitiveData(data: Record<string, any>): Record<string, any> {
        const maskedData = { ...data };
        for (const key in maskedData) {
            if (SENSITIVE_FIELDS.includes(key)) {
                maskedData[key] = '***MASKED***';
            }
        }
        return maskedData;
    }

    /**
     * Handles errors with comprehensive tracking and compliance
     */
    public async handleError(error: Error, context: ErrorContext = {}): Promise<ErrorResult> {
        const errorId = crypto.randomUUID();
        const severity = this.determineErrorSeverity(error, context);

        try {
            // Check rate limiting
            if (this.rateLimiter.tryRemoveTokens(1)) {
                // Sanitize error data
                const sanitizedContext = this.maskSensitiveData(context);

                // Log error with context
                this.logger.error({
                    errorId,
                    error: error.message,
                    stack: error.stack,
                    context: sanitizedContext,
                    severity
                });

                // Track in analytics
                await this.analyticsService.trackError(error.message, {
                    errorId,
                    type: context.errorType || ERROR_TYPES.RUNTIME_ERROR,
                    severity,
                    ...sanitizedContext
                });

                // Report to Sentry if critical
                if (severity === ERROR_SEVERITY.CRITICAL || severity === ERROR_SEVERITY.REGULATORY) {
                    Sentry.captureException(error, {
                        extra: sanitizedContext,
                        tags: {
                            errorId,
                            severity,
                            type: context.errorType
                        }
                    });
                }

                // Track performance impact
                await this.analyticsService.trackPerformanceImpact('error_handling', {
                    errorId,
                    duration: Date.now() - (context.metadata?.startTime || Date.now())
                });
            }

            return {
                handled: true,
                errorId,
                severity,
                message: error.message,
                context: context
            };
        } catch (handlingError) {
            // Fallback error handling
            console.error('Error handling failed:', handlingError);
            return {
                handled: false,
                errorId,
                severity: ERROR_SEVERITY.CRITICAL,
                message: 'Error handling failed',
                context: context
            };
        }
    }

    /**
     * Determines error severity based on type and context
     */
    private determineErrorSeverity(error: Error, context: ErrorContext): ERROR_SEVERITY {
        if (error instanceof axios.AxiosError) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                return ERROR_SEVERITY.HIGH;
            }
            return ERROR_SEVERITY.MEDIUM;
        }

        switch (context.errorType) {
            case ERROR_TYPES.COMPLIANCE_ERROR:
                return ERROR_SEVERITY.REGULATORY;
            case ERROR_TYPES.TRANSACTION_ERROR:
            case ERROR_TYPES.PI_NETWORK_ERROR:
                return ERROR_SEVERITY.HIGH;
            case ERROR_TYPES.AUTH_ERROR:
                return ERROR_SEVERITY.HIGH;
            case ERROR_TYPES.VALIDATION_ERROR:
                return ERROR_SEVERITY.LOW;
            default:
                return ERROR_SEVERITY.MEDIUM;
        }
    }

    /**
     * Handles compliance-specific errors with regulatory requirements
     */
    private async handleComplianceError(error: Error): Promise<void> {
        // Implement specific compliance error handling
        this.logger.error({
            type: ERROR_TYPES.COMPLIANCE_ERROR,
            message: error.message,
            timestamp: new Date().toISOString(),
            requiresRegulatorNotification: true
        });
    }
}

export default ErrorService;