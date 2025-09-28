// External dependencies
import mongoose, { Schema, Document, HookNextFunction } from 'mongoose'; // ^6.0.0
import bcrypt from 'bcrypt'; // ^5.0.0

// Interfaces
export interface IUserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  documentExpiryDate: Date;
}

export interface IDeviceInfo {
  deviceId: string;
  deviceType: string;
  deviceName: string;
  lastUsed: Date;
  trusted: boolean;
}

// Enums
export enum KYCStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export enum AuthMethod {
  PASSWORD = 'PASSWORD',
  BIOMETRIC = 'BIOMETRIC',
  PIN = 'PIN',
  DEVICE_BINDING = 'DEVICE_BINDING',
}

// User Interface extending Document
export interface IUser extends Document {
  email: string;
  phoneNumber: string;
  passwordHash: string;
  pin?: string;
  kycStatus: KYCStatus;
  biometricData?: Buffer;
  devices: IDeviceInfo[];
  loginAttempts: number;
  lockedUntil?: Date | null;
  lastLogin?: Date | null;
  lastPasswordChange: Date;
  requiresPasswordChange: boolean;
  profile: IUserProfile;
  preferredAuthMethod: AuthMethod;
  securityQuestions: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;

  validatePassword(password: string): Promise<boolean>;
  incrementLoginAttempts(): Promise<IUser>;
  resetLoginAttempts(): Promise<IUser>;
  validateDevice(deviceInfo: IDeviceInfo): Promise<boolean>;
}

// Schema Definition
const DeviceInfoSchema = new Schema<IDeviceInfo>(
  {
    deviceId: { type: String, required: true },
    deviceType: { type: String, required: true },
    deviceName: { type: String, required: true },
    lastUsed: { type: Date, required: true, default: Date.now },
    trusted: { type: Boolean, required: true, default: false },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
    nationality: { type: String, required: true },
    documentType: { type: String, required: true },
    documentNumber: { type: String, required: true },
    documentExpiryDate: { type: Date, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    pin: {
      type: String,
      required: false,
      select: false,
    },
    kycStatus: {
      type: String,
      enum: Object.values(KYCStatus),
      default: KYCStatus.PENDING,
    },
    biometricData: {
      type: Buffer,
      required: false,
      select: false,
    },
    devices: {
      type: [DeviceInfoSchema],
      default: [],
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
    requiresPasswordChange: {
      type: Boolean,
      default: false,
    },
    profile: {
      type: UserProfileSchema,
      required: true,
    },
    preferredAuthMethod: {
      type: String,
      enum: Object.values(AuthMethod),
      default: AuthMethod.PASSWORD,
    },
    securityQuestions: {
      type: Map,
      of: String,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
UserSchema.index({ email: 1, phoneNumber: 1 });
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ kycStatus: 1 });

// Methods

UserSchema.methods.validatePassword = async function (
  password: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, this.passwordHash);
    if (isValid) {
      this.lastLogin = new Date();
      await this.save();
    }
    return isValid;
  } catch (error) {
    throw new Error('Password validation failed');
  }
};

// Atomic increment of loginAttempts with progressive lockout
UserSchema.methods.incrementLoginAttempts = async function (): Promise<IUser> {
  const now = new Date();

  // If lockedUntil is in the past, reset attempts
  if (this.lockedUntil && this.lockedUntil < now) {
    this.loginAttempts = 1;
    this.lockedUntil = null;
  } else {
    this.loginAttempts += 1;
  }

  if (this.loginAttempts >= 5) {
    // Lockout duration in minutes: exponential backoff capped at 24 hours (1440 minutes)
    const lockoutDuration = Math.min(
      2 ** (this.loginAttempts - 5) * 5,
      1440
    );
    this.lockedUntil = new Date(Date.now() + lockoutDuration * 60000);
  }

  return await this.save();
};

UserSchema.methods.resetLoginAttempts = async function (): Promise<IUser> {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  return await this.save();
};

UserSchema.methods.validateDevice = async function (
  deviceInfo: IDeviceInfo
): Promise<boolean> {
  const device = this.devices.find((d) => d.deviceId === deviceInfo.deviceId);

  if (!device) {
    return false;
  }

  // Update last used timestamp atomically
  device.lastUsed = new Date();
  await this.save();

  return device.trusted;
};

// Pre-save middleware for password hashing
UserSchema.pre('save', async function (next: HookNextFunction) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Export the model
export const User = mongoose.model<IUser>('User ', UserSchema);
