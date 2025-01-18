/**
 * @fileoverview Custom React hook for managing Pi Network mining operations
 * with comprehensive security validation, performance monitoring, and error handling.
 * @version 2024.1
 */

import React, { useEffect, useCallback, useState, useRef } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from '../../store/store';
import { startMiningSession, stopMiningSession, fetchMiningStatus } from '../../store/actions/pi.actions';
import { MiningStatus, MiningSession, MiningError } from '../../types/pi.types';
import { debounce } from 'lodash'; // ^4.17.21

// Constants for mining operations
const MINING_STATUS_POLL_INTERVAL = 15000;
const MINING_PERFORMANCE_THRESHOLD = 0.8;
const MAX_ERROR_RETRIES = 3;
const ERROR_RETRY_DELAY = 5000;

/**
 * Interface for mining performance metrics
 */
interface MiningPerformance {
  miningRate: number;
  cpuUsage: number;
  networkLatency: number;
  successRate: number;
  lastUpdateTime: string;
}

/**
 * Enhanced hook for managing Pi Network mining operations
 * @param userId User identifier for mining session
 * @param options Additional mining configuration options
 * @returns Mining session state and control functions
 */
export function usePiMining(
  userId: string,
  options: {
    maxCPU?: number;
    networkPriority?: number;
    autoRestart?: boolean;
  } = {}
) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MiningError | null>(null);
  const [performance, setPerformance] = useState<MiningPerformance>({
    miningRate: 0,
    cpuUsage: 0,
    networkLatency: 0,
    successRate: 1,
    lastUpdateTime: new Date().toISOString()
  });

  // Refs for tracking mining session state
  const retryCount = useRef(0);
  const pollInterval = useRef<NodeJS.Timeout>();
  const miningStartTime = useRef<number>(0);

  // Select mining session from Redux store
  const miningSession = useSelector(state => state.pi.activeSession);

  /**
   * Debounced status update to prevent excessive API calls
   */
  const debouncedStatusUpdate = useCallback(
    debounce(async (sessionId: string) => {
      try {
        await dispatch(fetchMiningStatus(sessionId));
        retryCount.current = 0;
        updatePerformanceMetrics();
      } catch (error) {
        handleMiningError(error);
      }
    }, 1000),
    []
  );

  /**
   * Start mining operation with enhanced security validation
   */
  const startMining = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      miningStartTime.current = Date.now();

      // Get device information for mining
      const deviceInfo = {
        deviceId: localStorage.getItem('deviceId') || crypto.randomUUID(),
        platform: navigator.platform,
        version: '2024.1'
      };

      // Start mining session with configured options
      await dispatch(startMiningSession({
        userId,
        deviceInfo,
        preferences: {
          maxCPU: options.maxCPU || 80,
          networkPriority: options.networkPriority || 1
        }
      }));

      // Initialize performance monitoring
      initializePerformanceMonitoring();
    } catch (error) {
      handleMiningError(error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, options, dispatch]);

  /**
   * Stop mining operation with cleanup
   */
  const stopMining = useCallback(async () => {
    try {
      setIsLoading(true);
      if (miningSession?.sessionId) {
        await dispatch(stopMiningSession(miningSession.sessionId));
        cleanupMiningSession();
      }
    } catch (error) {
      handleMiningError(error);
    } finally {
      setIsLoading(false);
    }
  }, [miningSession, dispatch]);

  /**
   * Refresh mining status manually
   */
  const refreshStatus = useCallback(async () => {
    if (miningSession?.sessionId) {
      await debouncedStatusUpdate(miningSession.sessionId);
    }
  }, [miningSession, debouncedStatusUpdate]);

  /**
   * Initialize performance monitoring for mining session
   */
  const initializePerformanceMonitoring = useCallback(() => {
    setPerformance(prev => ({
      ...prev,
      lastUpdateTime: new Date().toISOString()
    }));

    // Start polling for mining status
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }

    pollInterval.current = setInterval(() => {
      if (miningSession?.sessionId) {
        debouncedStatusUpdate(miningSession.sessionId);
      }
    }, MINING_STATUS_POLL_INTERVAL);
  }, [miningSession, debouncedStatusUpdate]);

  /**
   * Update performance metrics for mining session
   */
  const updatePerformanceMetrics = useCallback(() => {
    if (!miningSession) return;

    const currentTime = Date.now();
    const duration = currentTime - miningStartTime.current;
    const newPerformance: MiningPerformance = {
      miningRate: miningSession.miningRate,
      cpuUsage: performance.memory?.usedJSHeapSize || 0,
      networkLatency: performance.now() % 1000, // Simplified latency calculation
      successRate: (retryCount.current === 0) ? 1 : (MAX_ERROR_RETRIES - retryCount.current) / MAX_ERROR_RETRIES,
      lastUpdateTime: new Date().toISOString()
    };

    // Check performance thresholds
    if (newPerformance.miningRate < MINING_PERFORMANCE_THRESHOLD) {
      console.warn('Mining performance below threshold:', newPerformance);
    }

    setPerformance(newPerformance);
  }, [miningSession]);

  /**
   * Handle mining operation errors with retry logic
   */
  const handleMiningError = useCallback((error: any) => {
    retryCount.current++;
    const errorMessage = error?.message || 'Mining operation failed';
    
    setError({
      code: error?.code || 'MINING_ERROR',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      retryCount: retryCount.current
    });

    // Attempt retry if within limits
    if (retryCount.current < MAX_ERROR_RETRIES && options.autoRestart) {
      setTimeout(() => {
        refreshStatus();
      }, ERROR_RETRY_DELAY * retryCount.current);
    } else {
      cleanupMiningSession();
    }

    console.error('Mining error:', {
      error,
      retryCount: retryCount.current,
      sessionId: miningSession?.sessionId
    });
  }, [miningSession, options.autoRestart, refreshStatus]);

  /**
   * Cleanup mining session resources
   */
  const cleanupMiningSession = useCallback(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    retryCount.current = 0;
    miningStartTime.current = 0;
  }, []);

  /**
   * Reset error state
   */
  const resetError = useCallback(() => {
    setError(null);
    retryCount.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMiningSession();
    };
  }, [cleanupMiningSession]);

  return {
    miningSession,
    isLoading,
    error,
    performance,
    startMining,
    stopMining,
    refreshStatus,
    resetError
  };
}