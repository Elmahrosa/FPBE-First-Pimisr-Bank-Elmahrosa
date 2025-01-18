/**
 * @fileoverview Enhanced notification service for FPBE mobile banking application
 * Implements secure multi-channel notifications with delivery tracking and analytics
 * @version 2024.1
 */

import messaging from '@react-native-firebase/messaging'; // ^18.0.0
import Twilio from '@twilio/client'; // ^4.0.0
import sgMail from '@sendgrid/mail'; // ^7.7.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import { LoggerService } from './logger.service';
import { sendNotification } from '../api/notification.api';
import analytics from './analytics.service';

// Notification Types
export enum NOTIFICATION_TYPES {
    TRANSACTION = 'transaction',
    BALANCE_UPDATE = 'balance_update',
    MINING_STATUS = 'mining_status',
    SECURITY_ALERT = 'security_alert',
    SYSTEM_UPDATE = 'system_update',
    CARD_STATUS = 'card_status',
    EXCHANGE_RATE = 'exchange_rate'
}

// Notification Priorities
export enum NOTIFICATION_PRIORITIES {
    HIGH = 'high',
    NORMAL = 'normal',
    LOW = 'low'
}

// Notification Channels
export enum NOTIFICATION_CHANNELS {
    PUSH = 'push',
    SMS = 'sms',
    EMAIL = 'email'
}

// Rate Limits
const RATE_LIMITS = {
    PUSH_PER_MINUTE: 60,
    SMS_PER_HOUR: 10,
    EMAIL_PER_HOUR: 20
};

// Interfaces
interface NotificationRequest {
    userId: string;
    type: NOTIFICATION_TYPES;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority: NOTIFICATION_PRIORITIES;
    channels: NOTIFICATION_CHANNELS[];
}

interface DeliveryStatus {
    notificationId: string;
    status: 'delivered' | 'failed' | 'pending';
    timestamp: string;
    channel: NOTIFICATION_CHANNELS;
    error?: string;
}

interface NotificationPreferences {
    userId: string;
    enabledChannels: NOTIFICATION_CHANNELS[];
    quietHours: {
        start: string;
        end: string;
    };
    priorities: NOTIFICATION_PRIORITIES[];
}

/**
 * Comprehensive notification service for handling multi-channel notifications
 * with security, tracking, and delivery management
 */
export class NotificationService {
    private logger: LoggerService;
    private deviceToken: string | null = null;
    private notificationListeners: Map<string, Function>;
    private twilioClient: Twilio;
    private sendGridClient: typeof sgMail;
    private notificationQueue: NotificationRequest[] = [];
    private deliveryTracker: Map<string, DeliveryStatus>;
    private rateLimiters: Map<NOTIFICATION_CHANNELS, { count: number; resetTime: number }>;

    constructor(
        logger: LoggerService,
        twilioConfig: { accountSid: string; authToken: string },
        sendGridConfig: { apiKey: string }
    ) {
        this.logger = logger;
        this.notificationListeners = new Map();
        this.deliveryTracker = new Map();
        this.rateLimiters = new Map();

        // Initialize clients
        this.twilioClient = new Twilio(twilioConfig.accountSid, twilioConfig.authToken);
        this.sendGridClient = sgMail;
        this.sendGridClient.setApiKey(sendGridConfig.apiKey);

        // Initialize rate limiters
        this.initializeRateLimiters();
    }

    /**
     * Initializes the notification service with required permissions and configurations
     */
    public async initialize(): Promise<boolean> {
        try {
            // Request push notification permissions
            const authStatus = await messaging().requestPermission();
            const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

            if (enabled) {
                // Get FCM token
                this.deviceToken = await messaging().getToken();
                await this.registerDeviceToken();

                // Set up background handlers
                messaging().setBackgroundMessageHandler(this.handleBackgroundMessage);
                messaging().onMessage(this.handleForegroundMessage);

                // Load notification preferences
                await this.loadNotificationPreferences();

                this.logger.info('Notification service initialized successfully');
                return true;
            }

            this.logger.warn('Push notifications not authorized');
            return false;
        } catch (error) {
            this.logger.error('Failed to initialize notification service', { error });
            return false;
        }
    }

    /**
     * Sends a notification through specified channels with security and tracking
     */
    public async sendNotification(
        request: NotificationRequest,
        options?: { bypassRateLimit?: boolean; urgent?: boolean }
    ): Promise<DeliveryStatus[]> {
        const notificationId = crypto.randomUUID();
        const deliveryStatuses: DeliveryStatus[] = [];

        try {
            // Validate request
            this.validateNotificationRequest(request);

            // Check rate limits unless bypassed
            if (!options?.bypassRateLimit) {
                this.checkRateLimits(request.channels);
            }

            // Encrypt sensitive data
            const encryptedPayload = this.encryptNotificationPayload(request);

            // Process each channel
            for (const channel of request.channels) {
                try {
                    const status = await this.deliverToChannel(channel, encryptedPayload, notificationId);
                    deliveryStatuses.push(status);

                    // Track delivery
                    this.deliveryTracker.set(notificationId, status);

                    // Update analytics
                    await analytics.trackEvent('NOTIFICATION_SENT', {
                        notificationId,
                        channel,
                        type: request.type,
                        status: status.status
                    });
                } catch (error) {
                    this.logger.error(`Failed to deliver notification to ${channel}`, { error });
                    deliveryStatuses.push({
                        notificationId,
                        channel,
                        status: 'failed',
                        timestamp: new Date().toISOString(),
                        error: error.message
                    });
                }
            }

            return deliveryStatuses;
        } catch (error) {
            this.logger.error('Failed to send notification', { error, request });
            throw error;
        }
    }

    /**
     * Handles background push messages
     */
    private handleBackgroundMessage = async (message: messaging.RemoteMessage) => {
        try {
            const decryptedPayload = this.decryptNotificationPayload(message.data);
            await this.processNotification(decryptedPayload);
        } catch (error) {
            this.logger.error('Background message handling failed', { error });
        }
    };

    /**
     * Handles foreground push messages
     */
    private handleForegroundMessage = async (message: messaging.RemoteMessage) => {
        try {
            const decryptedPayload = this.decryptNotificationPayload(message.data);
            await this.processNotification(decryptedPayload);
        } catch (error) {
            this.logger.error('Foreground message handling failed', { error });
        }
    };

    /**
     * Encrypts notification payload for secure transmission
     */
    private encryptNotificationPayload(payload: any): string {
        const stringified = JSON.stringify(payload);
        return CryptoJS.AES.encrypt(stringified, process.env.REACT_APP_ENCRYPTION_KEY!).toString();
    }

    /**
     * Decrypts notification payload
     */
    private decryptNotificationPayload(encryptedPayload: any): any {
        const bytes = CryptoJS.AES.decrypt(encryptedPayload, process.env.REACT_APP_ENCRYPTION_KEY!);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }

    /**
     * Delivers notification to specified channel
     */
    private async deliverToChannel(
        channel: NOTIFICATION_CHANNELS,
        payload: any,
        notificationId: string
    ): Promise<DeliveryStatus> {
        switch (channel) {
            case NOTIFICATION_CHANNELS.PUSH:
                return this.sendPushNotification(payload, notificationId);
            case NOTIFICATION_CHANNELS.SMS:
                return this.sendSmsNotification(payload, notificationId);
            case NOTIFICATION_CHANNELS.EMAIL:
                return this.sendEmailNotification(payload, notificationId);
            default:
                throw new Error(`Unsupported channel: ${channel}`);
        }
    }

    /**
     * Validates notification request
     */
    private validateNotificationRequest(request: NotificationRequest): void {
        if (!request.userId || !request.type || !request.channels || !request.title || !request.body) {
            throw new Error('Invalid notification request: Missing required fields');
        }
    }

    /**
     * Initializes rate limiters for each channel
     */
    private initializeRateLimiters(): void {
        Object.values(NOTIFICATION_CHANNELS).forEach(channel => {
            this.rateLimiters.set(channel, {
                count: 0,
                resetTime: Date.now() + 3600000 // 1 hour
            });
        });
    }

    /**
     * Checks rate limits for specified channels
     */
    private checkRateLimits(channels: NOTIFICATION_CHANNELS[]): void {
        channels.forEach(channel => {
            const limiter = this.rateLimiters.get(channel);
            if (!limiter) return;

            if (Date.now() > limiter.resetTime) {
                limiter.count = 0;
                limiter.resetTime = Date.now() + 3600000;
            }

            if (limiter.count >= RATE_LIMITS[`${channel.toUpperCase()}_PER_HOUR`]) {
                throw new Error(`Rate limit exceeded for channel: ${channel}`);
            }

            limiter.count++;
        });
    }
}

export default NotificationService;