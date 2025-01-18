/**
 * @fileoverview Analytics service for FPBE mobile banking application
 * Implements comprehensive tracking with privacy controls and offline support
 * @version 2024.1
 */

import mixpanel, { Mixpanel } from 'mixpanel-react-native'; // v2.3.0
import analytics from '@react-native-firebase/analytics'; // v18.0.0
import perf from '@react-native-firebase/perf'; // v18.0.0
import { apiConfig } from '../config/api.config';

// Analytics event types
export enum EVENT_TYPES {
    USER_ACTION = 'USER_ACTION',
    SCREEN_VIEW = 'SCREEN_VIEW',
    ERROR = 'ERROR',
    PERFORMANCE = 'PERFORMANCE',
    TRANSACTION = 'TRANSACTION',
    PI_MINING = 'PI_MINING',
    NETWORK_STATUS = 'NETWORK_STATUS',
    SESSION = 'SESSION'
}

// User properties for segmentation
export const USER_PROPERTIES = [
    'userId',
    'accountType',
    'kycStatus',
    'hasWallet',
    'isMining',
    'deviceType',
    'appVersion',
    'lastActive',
    'userSegment',
    'preferredLanguage'
] as const;

// Analytics event interface
interface AnalyticsEvent {
    eventName: string;
    eventType: EVENT_TYPES;
    properties: Record<string, any>;
    timestamp: number;
    sessionId: string;
}

// Queue for offline event storage
interface EventQueue {
    push(event: AnalyticsEvent): void;
    process(): Promise<void>;
    clear(): void;
}

/**
 * Decorator for error boundary in analytics methods
 */
function ErrorBoundary(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
        try {
            return await originalMethod.apply(this, args);
        } catch (error) {
            console.error(`Analytics error in ${propertyKey}:`, error);
            // Track error but don't throw to prevent app disruption
            this.trackError('ANALYTICS_ERROR', { method: propertyKey, error: error.message });
            return null;
        }
    };
    return descriptor;
}

/**
 * Analytics service for comprehensive tracking with privacy controls
 */
export class AnalyticsService {
    private mixpanel: Mixpanel;
    private firebaseAnalytics: ReturnType<typeof analytics>;
    private performance: ReturnType<typeof perf>;
    private eventQueue: EventQueue;
    private sessionId: string;
    private initialized: boolean = false;
    private consentGranted: boolean = false;

    constructor() {
        this.sessionId = crypto.randomUUID();
        this.initializeAnalytics();
    }

    /**
     * Initializes analytics providers with proper configuration
     */
    @ErrorBoundary
    private async initializeAnalytics(): Promise<void> {
        if (this.initialized) return;

        // Initialize Mixpanel
        await mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN!, {
            trackAutomaticEvents: true,
            useNativeDeviceInfo: true,
            serverURL: `${apiConfig.baseURL}/analytics/mixpanel`
        });

        // Initialize Firebase Analytics
        this.firebaseAnalytics = analytics();
        await this.firebaseAnalytics.setAnalyticsCollectionEnabled(true);

        // Initialize Performance Monitoring
        this.performance = perf();
        await this.performance.setPerformanceCollectionEnabled(true);

        // Configure offline queue
        this.eventQueue = this.createEventQueue();

        this.initialized = true;
        this.trackEvent('ANALYTICS_INITIALIZED', { timestamp: Date.now() });
    }

    /**
     * Creates event queue for offline support
     */
    private createEventQueue(): EventQueue {
        const queue: AnalyticsEvent[] = [];
        return {
            push: (event: AnalyticsEvent) => queue.push(event),
            process: async () => {
                while (queue.length > 0) {
                    const event = queue.shift();
                    if (event) {
                        await this.processEvent(event);
                    }
                }
            },
            clear: () => queue.length = 0
        };
    }

    /**
     * Processes a single analytics event
     */
    @ErrorBoundary
    private async processEvent(event: AnalyticsEvent): Promise<void> {
        if (!this.consentGranted) return;

        const enrichedProperties = {
            ...event.properties,
            sessionId: this.sessionId,
            timestamp: event.timestamp,
            appVersion: process.env.REACT_APP_VERSION
        };

        // Track in Mixpanel
        await mixpanel.track(event.eventName, enrichedProperties);

        // Track in Firebase
        await this.firebaseAnalytics.logEvent(event.eventName, enrichedProperties);
    }

    /**
     * Tracks user events with privacy controls
     */
    @ErrorBoundary
    public async trackEvent(eventName: string, properties: Record<string, any> = {}): Promise<void> {
        const event: AnalyticsEvent = {
            eventName,
            eventType: EVENT_TYPES.USER_ACTION,
            properties,
            timestamp: Date.now(),
            sessionId: this.sessionId
        };

        if (navigator.onLine) {
            await this.processEvent(event);
        } else {
            this.eventQueue.push(event);
        }
    }

    /**
     * Tracks screen views with automatic timing
     */
    @ErrorBoundary
    public async trackScreen(screenName: string, properties: Record<string, any> = {}): Promise<void> {
        await this.firebaseAnalytics.logScreenView({
            screen_name: screenName,
            screen_class: screenName,
            ...properties
        });

        await this.trackEvent('SCREEN_VIEW', {
            screenName,
            ...properties
        });
    }

    /**
     * Tracks errors with automatic context
     */
    @ErrorBoundary
    public async trackError(error: string, context: Record<string, any> = {}): Promise<void> {
        await this.trackEvent('ERROR', {
            error,
            context,
            timestamp: Date.now()
        });
    }

    /**
     * Tracks performance metrics
     */
    @ErrorBoundary
    public async trackPerformance(metricName: string, duration: number): Promise<void> {
        const trace = await this.performance.newTrace(metricName);
        await trace.start();
        
        await this.trackEvent('PERFORMANCE', {
            metricName,
            duration,
            timestamp: Date.now()
        });

        await trace.stop();
    }

    /**
     * Sets user properties for segmentation
     */
    @ErrorBoundary
    public async setUserProperties(properties: Partial<Record<typeof USER_PROPERTIES[number], any>>): Promise<void> {
        if (!this.consentGranted) return;

        await mixpanel.getPeople().set(properties);
        await this.firebaseAnalytics.setUserProperties(properties);
    }

    /**
     * Updates user consent status
     */
    public setConsentStatus(granted: boolean): void {
        this.consentGranted = granted;
        if (!granted) {
            this.eventQueue.clear();
        }
    }

    /**
     * Processes queued events when coming online
     */
    @ErrorBoundary
    public async processOfflineEvents(): Promise<void> {
        if (navigator.onLine && this.consentGranted) {
            await this.eventQueue.process();
        }
    }
}

export default new AnalyticsService();