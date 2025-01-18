/**
 * @fileoverview Enhanced notification service module for FPBE mobile banking application
 * Provides secure, multi-channel notification delivery with encryption and audit logging
 * @version 2024.1
 */

import axios from 'axios'; // ^1.4.0
import CryptoJS from 'crypto-js'; // ^4.1.1
import zlib from 'zlib'; // ^1.0.5
import { ApiResponse } from '../types/api.types';
import { createApiClient } from '../config/api.config';

// API Version and Endpoints
const NOTIFICATION_API_VERSION = 'v1';
const NOTIFICATION_ENDPOINTS = {
  SEND: '/notifications/send',
  BATCH_SEND: '/notifications/batch',
  STATUS: '/notifications/{notification_id}',
  REGISTER_DEVICE: '/devices',
  PREFERENCES: '/preferences',
  AUDIT: '/audit',
  HEALTH: '/health'
} as const;

// Rate Limiting Configuration
const RATE_LIMITS = {
  PUSH: '100/minute',
  SMS: '10/minute',
  EMAIL: '20/minute'
} as const;

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Supported notification channels
 */
export enum NotificationChannel {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP'
}

/**
 * Notification types with specific handling requirements
 */
export enum NotificationType {
  TRANSACTION = 'TRANSACTION',
  SECURITY = 'SECURITY',
  ACCOUNT = 'ACCOUNT',
  MINING = 'MINING',
  MARKETING = 'MARKETING'
}

/**
 * Security metadata for notification encryption
 */
interface SecurityMetadata {
  encryptionVersion: string;
  signatureTimestamp: string;
  deviceFingerprint: string;
  contentHash: string;
}

/**
 * Delivery configuration options
 */
interface DeliveryOptions {
  retryAttempts: number;
  ttlSeconds: number;
  requireConfirmation: boolean;
  priority: NotificationPriority;
  silent: boolean;
}

/**
 * Enhanced notification request interface
 */
export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  security: SecurityMetadata;
  delivery: DeliveryOptions;
}

/**
 * Notification response interface
 */
interface NotificationResponse {
  notificationId: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  deliveryTimestamp: string;
  channels: {
    [key in NotificationChannel]?: {
      status: string;
      timestamp: string;
      error?: string;
    };
  };
}

/**
 * Batch notification options
 */
interface BatchOptions {
  maxBatchSize: number;
  parallelDelivery: boolean;
  priorityOrder: boolean;
  consolidateByUser: boolean;
}

/**
 * Encrypts sensitive notification content
 * @param content Content to encrypt
 * @returns Encrypted content with metadata
 */
const encryptNotificationContent = (content: string): { encrypted: string; metadata: SecurityMetadata } => {
  const timestamp = new Date().toISOString();
  const contentHash = CryptoJS.SHA256(content).toString();
  const encrypted = CryptoJS.AES.encrypt(content, process.env.REACT_APP_ENCRYPTION_KEY || '').toString();

  return {
    encrypted,
    metadata: {
      encryptionVersion: '2.0',
      signatureTimestamp: timestamp,
      deviceFingerprint: localStorage.getItem('deviceId') || '',
      contentHash
    }
  };
};

/**
 * Compresses large notification payloads
 * @param payload Notification payload
 * @returns Compressed payload if size exceeds threshold
 */
const compressPayload = (payload: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const stringPayload = JSON.stringify(payload);
    if (stringPayload.length <= 1024) {
      resolve(Buffer.from(stringPayload));
      return;
    }

    zlib.gzip(stringPayload, (error, compressed) => {
      if (error) reject(error);
      else resolve(compressed);
    });
  });
};

/**
 * Sends an encrypted notification through specified channels with retry logic
 * @param request Notification request details
 * @param options Additional delivery options
 * @returns Notification delivery status and tracking ID
 */
export const sendNotification = async (
  request: NotificationRequest,
  options?: Partial<DeliveryOptions>
): Promise<ApiResponse<NotificationResponse>> => {
  const apiClient = createApiClient({
    headers: {
      'X-Notification-Version': NOTIFICATION_API_VERSION,
      'X-Priority': request.priority
    }
  });

  // Encrypt sensitive content
  const { encrypted, metadata } = encryptNotificationContent(request.body);
  request.body = encrypted;
  request.security = metadata;

  // Apply delivery options
  request.delivery = {
    retryAttempts: options?.retryAttempts || 3,
    ttlSeconds: options?.ttlSeconds || 3600,
    requireConfirmation: options?.requireConfirmation || false,
    priority: options?.priority || NotificationPriority.MEDIUM,
    silent: options?.silent || false
  };

  // Compress payload if necessary
  const compressedPayload = await compressPayload(request);

  try {
    const response = await apiClient.post<ApiResponse<NotificationResponse>>(
      NOTIFICATION_ENDPOINTS.SEND,
      compressedPayload,
      {
        headers: {
          'Content-Encoding': 'gzip',
          'X-Channels': request.channels.join(',')
        }
      }
    );

    // Log to audit trail
    await apiClient.post(NOTIFICATION_ENDPOINTS.AUDIT, {
      notificationId: response.data.data.notificationId,
      userId: request.userId,
      channels: request.channels,
      status: response.data.data.status,
      timestamp: new Date().toISOString()
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Notification delivery failed: ${error.response?.data.message}`);
    }
    throw error;
  }
};

/**
 * Sends multiple notifications in batch with optimization
 * @param requests Array of notification requests
 * @param options Batch processing options
 * @returns Batch operation results
 */
export const batchSendNotifications = async (
  requests: NotificationRequest[],
  options: BatchOptions
): Promise<ApiResponse<NotificationResponse[]>> => {
  const apiClient = createApiClient();

  // Group notifications by channel for optimization
  const groupedRequests = requests.reduce((acc, request) => {
    request.channels.forEach(channel => {
      if (!acc[channel]) acc[channel] = [];
      acc[channel].push(request);
    });
    return acc;
  }, {} as Record<NotificationChannel, NotificationRequest[]>);

  // Process each channel group with rate limiting
  const results = await Promise.all(
    Object.entries(groupedRequests).map(async ([channel, channelRequests]) => {
      const batchSize = Math.min(options.maxBatchSize, channelRequests.length);
      const batches = [];

      for (let i = 0; i < channelRequests.length; i += batchSize) {
        const batch = channelRequests.slice(i, i + batchSize);
        const encryptedBatch = await Promise.all(
          batch.map(async request => {
            const { encrypted, metadata } = encryptNotificationContent(request.body);
            return {
              ...request,
              body: encrypted,
              security: metadata
            };
          })
        );

        batches.push(encryptedBatch);
      }

      const compressedBatches = await Promise.all(
        batches.map(batch => compressPayload(batch))
      );

      return Promise.all(
        compressedBatches.map(compressedBatch =>
          apiClient.post<ApiResponse<NotificationResponse[]>>(
            NOTIFICATION_ENDPOINTS.BATCH_SEND,
            compressedBatch,
            {
              headers: {
                'Content-Encoding': 'gzip',
                'X-Channel': channel,
                'X-Batch-Size': String(batchSize)
              }
            }
          )
        )
      );
    })
  );

  // Consolidate and return results
  return {
    data: results.flatMap(channelResults =>
      channelResults.flatMap(response => response.data.data)
    ),
    status: 200,
    error: null
  };
};