/**
 * @fileoverview Enhanced React hook for managing secure notifications in FPBE mobile banking
 * Implements multi-channel support, offline capabilities, and real-time updates
 * @version 2024.1
 */

import { useState, useEffect } from 'react'; // ^18.0.0
import messaging from '@react-native-firebase/messaging'; // ^16.0.0
import SecureStore from '@react-native-community/secure-store'; // ^1.0.0
import io from 'socket.io-client'; // ^4.0.0
import { NotificationService } from '../services/notification.service';

// Notification Types
export enum NotificationType {
    TRANSACTION = 'TRANSACTION',
    BALANCE_UPDATE = 'BALANCE_UPDATE',
    MINING_STATUS = 'MINING_STATUS',
    SECURITY_ALERT = 'SECURITY_ALERT',
    CARD_STATUS = 'CARD_STATUS',
    EXCHANGE_RATE = 'EXCHANGE_RATE'
}

// Notification Priority Levels
export enum NotificationPriority {
    HIGH = 'HIGH',
    NORMAL = 'NORMAL',
    LOW = 'LOW'
}

// Notification Channels
export enum Channel {
    PUSH = 'PUSH',
    SMS = 'SMS',
    EMAIL = 'EMAIL',
    IN_APP = 'IN_APP'
}

// Notification Status
export enum NotificationStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
    ARCHIVED = 'ARCHIVED'
}

// Interfaces
interface Notification {
    id: string;
    type: NotificationType;
    content: EncryptedPayload;
    timestamp: Date;
    priority: NotificationPriority;
    channel: Channel;
    status: NotificationStatus;
    metadata: NotificationMetadata;
}

interface EncryptedPayload {
    data: string;
    iv: string;
    signature: string;
}

interface NotificationMetadata {
    deviceId: string;
    sessionId: string;
    version: string;
    source: string;
}

interface NotificationPreferences {
    channels: Channel[];
    frequency: 'REAL_TIME' | 'BATCHED' | 'SCHEDULED';
    quiet_hours: {
        start: string;
        end: string;
        timezone: string;
    };
    categories: NotificationType[];
}

interface ChannelStatus {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
}

/**
 * Enhanced hook for managing secure notifications with multi-channel support
 * @returns Notification state and management methods
 */
export function useNotifications() {
    // State Management
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [offlineQueue, setOfflineQueue] = useState<Notification[]>([]);
    const [channelStatus, setChannelStatus] = useState<ChannelStatus>({
        push: false,
        email: false,
        sms: false,
        inApp: true
    });
    const [preferences, setPreferences] = useState<NotificationPreferences>();

    // Service instance
    const notificationService = new NotificationService();

    /**
     * Initialize notification services and permissions
     */
    useEffect(() => {
        const initializeNotifications = async () => {
            try {
                // Request push notification permissions
                const authStatus = await messaging().requestPermission();
                const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

                if (enabled) {
                    // Register device token
                    const token = await messaging().getToken();
                    await notificationService.registerDeviceToken(token);

                    // Update channel status
                    setChannelStatus(prev => ({ ...prev, push: true }));
                }

                // Load stored preferences
                const storedPrefs = await SecureStore.getItemAsync('notificationPreferences');
                if (storedPrefs) {
                    setPreferences(JSON.parse(storedPrefs));
                }

                // Initialize WebSocket connection
                initializeWebSocket();

                setLoading(false);
            } catch (err) {
                setError('Failed to initialize notifications');
                setLoading(false);
            }
        };

        initializeNotifications();
    }, []);

    /**
     * Initialize secure WebSocket connection for real-time updates
     */
    const initializeWebSocket = () => {
        const socket = io(process.env.REACT_APP_WS_URL!, {
            transports: ['websocket'],
            secure: true,
            rejectUnauthorized: true
        });

        socket.on('connect', () => {
            console.debug('WebSocket connected for notifications');
        });

        socket.on('notification', async (encryptedPayload: EncryptedPayload) => {
            const validatedNotification = await notificationService.validateNotification(encryptedPayload);
            if (validatedNotification) {
                handleNewNotification(validatedNotification);
            }
        });

        return () => {
            socket.disconnect();
        };
    };

    /**
     * Handle new notifications with security validation
     */
    const handleNewNotification = async (notification: Notification) => {
        try {
            // Decrypt and validate payload
            const decryptedContent = await notificationService.encryptPayload(notification.content);
            
            // Check if notification should be queued offline
            if (!navigator.onLine) {
                setOfflineQueue(prev => [...prev, { ...notification, content: decryptedContent }]);
                return;
            }

            // Update notifications state
            setNotifications(prev => [{ ...notification, content: decryptedContent }, ...prev]);
            if (notification.status === NotificationStatus.UNREAD) {
                setUnreadCount(prev => prev + 1);
            }
        } catch (err) {
            setError('Failed to process notification');
        }
    };

    /**
     * Mark notification as read with server sync
     */
    const markAsRead = async (notificationId: string) => {
        try {
            await notificationService.handleNotification(notificationId, NotificationStatus.READ);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId
                        ? { ...n, status: NotificationStatus.READ }
                        : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            setError('Failed to mark notification as read');
        }
    };

    /**
     * Update notification preferences with encryption
     */
    const updatePreferences = async (newPreferences: NotificationPreferences) => {
        try {
            await notificationService.updatePreferences(newPreferences);
            setPreferences(newPreferences);
            await SecureStore.setItemAsync(
                'notificationPreferences',
                JSON.stringify(newPreferences)
            );
        } catch (err) {
            setError('Failed to update preferences');
        }
    };

    /**
     * Refresh notifications with pagination
     */
    const refreshNotifications = async () => {
        setLoading(true);
        try {
            const response = await notificationService.handleNotification('refresh');
            setNotifications(response);
            setUnreadCount(response.filter(n => n.status === NotificationStatus.UNREAD).length);
        } catch (err) {
            setError('Failed to refresh notifications');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Update channel status with server sync
     */
    const handleChannelUpdate = async (channel: Channel, status: boolean) => {
        try {
            await notificationService.updatePreferences({ channels: [channel] });
            setChannelStatus(prev => ({
                ...prev,
                [channel.toLowerCase()]: status
            }));
        } catch (err) {
            setError('Failed to update channel status');
        }
    };

    /**
     * Process offline notification queue
     */
    const processOfflineQueue = async () => {
        if (navigator.onLine && offlineQueue.length > 0) {
            try {
                for (const notification of offlineQueue) {
                    await handleNewNotification(notification);
                }
                setOfflineQueue([]);
            } catch (err) {
                setError('Failed to process offline queue');
            }
        }
    };

    // Online/Offline handler
    useEffect(() => {
        window.addEventListener('online', processOfflineQueue);
        return () => {
            window.removeEventListener('online', processOfflineQueue);
        };
    }, [offlineQueue]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        channelStatus,
        preferences,
        markAsRead,
        updatePreferences,
        refreshNotifications,
        handleChannelUpdate,
        clearError: () => setError(null)
    };
}

export default useNotifications;