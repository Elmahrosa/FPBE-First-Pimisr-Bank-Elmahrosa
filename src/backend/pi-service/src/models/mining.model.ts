import mongoose, { Schema } from 'mongoose';  // mongoose@^6.0.0

// Enums
export enum MiningStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR'
}

export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP'
}

// Constants
export const DEFAULT_MINING_RATE = 0.25;
export const MAX_ACTIVE_SESSIONS = 1;
export const MIN_MINING_RATE = 0.1;
export const MAX_MINING_RATE = 1.0;
export const SESSION_TIMEOUT = 3600000; // 1 hour in milliseconds

// Interfaces
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: DeviceType;
  platform: string;
  version: string;
  lastKnownLocation: GeoLocation;
  hardwareSignature: string;
  securityLevel: number;
}

export interface NetworkStats {
  difficulty: number;
  networkLoad: number;
  participantCount: number;
  averageRate: number;
  lastUpdateTime: Date;
}

export interface SecurityMetrics {
  validationCount: number;
  failedAttempts: number;
  lastValidIp: string;
  riskScore: number;
  anomalyFlags: string[];
}

export interface MiningSession {
  userId: string;
  sessionId: string;
  status: MiningStatus;
  miningRate: number;
  totalMined: number;
  currentBalance: number;
  startTime: Date;
  lastUpdateTime: Date;
  lastValidationTime: Date;
  deviceInfo: DeviceInfo;
  networkStats: NetworkStats;
  securityMetrics: SecurityMetrics;
}

export interface ValidationResult {
  isValid: boolean;
  riskLevel: number;
  validationTime: Date;
  securityFlags: string[];
  actionRequired?: string;
}

// Helper Functions
export const calculateMiningRate = (
  deviceInfo: DeviceInfo,
  networkStats: NetworkStats,
  securityMetrics: SecurityMetrics
): number => {
  // Base rate calculation
  let rate = DEFAULT_MINING_RATE;

  // Device type multiplier
  const deviceMultiplier = {
    [DeviceType.MOBILE]: 1.0,
    [DeviceType.TABLET]: 1.1,
    [DeviceType.DESKTOP]: 1.2
  }[deviceInfo.deviceType];
  rate *= deviceMultiplier;

  // Network difficulty adjustment
  rate *= (1 - (networkStats.difficulty / 100));

  // Security level impact
  rate *= (deviceInfo.securityLevel / 10);

  // Risk score adjustment
  const riskFactor = Math.max(0, 1 - (securityMetrics.riskScore / 100));
  rate *= riskFactor;

  // Network load factor
  const loadFactor = Math.max(0.5, 1 - (networkStats.networkLoad / 100));
  rate *= loadFactor;

  // Bound the final rate
  return Math.min(Math.max(rate, MIN_MINING_RATE), MAX_MINING_RATE);
};

export const validateMiningSession = (
  session: MiningSession,
  metrics: SecurityMetrics
): ValidationResult => {
  const validationResult: ValidationResult = {
    isValid: true,
    riskLevel: 0,
    validationTime: new Date(),
    securityFlags: []
  };

  // Session timeout check
  const sessionAge = Date.now() - session.startTime.getTime();
  if (sessionAge > SESSION_TIMEOUT) {
    validationResult.isValid = false;
    validationResult.securityFlags.push('SESSION_TIMEOUT');
  }

  // Security metrics evaluation
  if (metrics.failedAttempts > 3) {
    validationResult.riskLevel += 30;
    validationResult.securityFlags.push('EXCESSIVE_FAILURES');
  }

  if (metrics.riskScore > 70) {
    validationResult.isValid = false;
    validationResult.securityFlags.push('HIGH_RISK_SCORE');
  }

  // Device signature validation
  if (!session.deviceInfo.hardwareSignature) {
    validationResult.riskLevel += 20;
    validationResult.securityFlags.push('MISSING_HARDWARE_SIGNATURE');
  }

  return validationResult;
};

// Mongoose Schema
const deviceInfoSchema = new Schema<DeviceInfo>({
  deviceId: { type: String, required: true, index: true },
  deviceType: { type: String, enum: Object.values(DeviceType), required: true },
  platform: { type: String, required: true },
  version: { type: String, required: true },
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  hardwareSignature: { type: String, required: true },
  securityLevel: { type: Number, required: true, min: 0, max: 10 }
});

const networkStatsSchema = new Schema<NetworkStats>({
  difficulty: { type: Number, required: true, min: 0 },
  networkLoad: { type: Number, required: true, min: 0, max: 100 },
  participantCount: { type: Number, required: true, min: 0 },
  averageRate: { type: Number, required: true },
  lastUpdateTime: { type: Date, required: true }
});

const securityMetricsSchema = new Schema<SecurityMetrics>({
  validationCount: { type: Number, required: true, default: 0 },
  failedAttempts: { type: Number, required: true, default: 0 },
  lastValidIp: { type: String, required: true },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  anomalyFlags: [{ type: String }]
});

export const MiningSessionSchema = new Schema<MiningSession>({
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: Object.values(MiningStatus), required: true },
  miningRate: { type: Number, required: true, min: MIN_MINING_RATE, max: MAX_MINING_RATE },
  totalMined: { type: Number, required: true, default: 0 },
  currentBalance: { type: Number, required: true, default: 0 },
  startTime: { type: Date, required: true },
  lastUpdateTime: { type: Date, required: true },
  lastValidationTime: { type: Date, required: true },
  deviceInfo: { type: deviceInfoSchema, required: true },
  networkStats: { type: networkStatsSchema, required: true },
  securityMetrics: { type: securityMetricsSchema, required: true }
}, {
  timestamps: true,
  collection: 'mining_sessions'
});

// Indexes for performance optimization
MiningSessionSchema.index({ userId: 1, status: 1 });
MiningSessionSchema.index({ sessionId: 1 }, { unique: true });
MiningSessionSchema.index({ lastUpdateTime: 1 });
MiningSessionSchema.index({ 'deviceInfo.deviceId': 1 });

export default mongoose.model<MiningSession>('MiningSession', MiningSessionSchema);