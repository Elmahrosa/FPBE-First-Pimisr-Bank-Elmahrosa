// External dependencies
import mongoose, { Schema, Document } from 'mongoose'; // ^6.0.0
import bcrypt from 'bcrypt'; // ^5.0.0
import crypto from 'crypto'; // built-in

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
    REVIEW_REQUIRED = 'REVIEW_REQUIRED'
}

export enum AuthMethod {
    PASSWORD = 'PASSWORD',
    BIOMETRIC = 'BIOMETRIC',
    PIN = 'PIN',
    DEVICE_BINDING = 'DEVICE_BINDING'
}

// User Interface extending Document
export interface IUser extends Document {
    email: string;
    phoneNumber: string;
    passwordHash: string;
    pin: string;
    kycStatus: KYCStatus;
    biometricData: Buffer;
    devices: IDeviceInfo[];
    loginAttempts: number;
    lockedUntil: Date;
    lastLogin: Date;
    lastPasswordChange: Date;
    requiresPasswordChange: boolean;
    profile: IUserProfile;
    preferredAuthMethod: AuthMethod;
    securityQuestions: Map<string, string>;
    createdAt: Date;
    updatedAt: Date;
    validatePassword(password: string): Promise<boolean>;
    incrementLoginAttempts(): Promise<void>;
    validateDevice(deviceInfo: IDeviceInfo): Promise<boolean>;
}

// Schema Definition
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    pin: {
        type: String,
        required: false,
        select: false
    },
    kycStatus: {
        type: String,
        enum: Object.values(KYCStatus),
        default: KYCStatus.PENDING
    },
    biometricData: {
        type: Buffer,
        required: false,
        select: false
    },
    devices: [{
        deviceId: String,
        deviceType: String,
        deviceName: String,
        lastUsed: Date,
        trusted: Boolean
    }],
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastPasswordChange: {
        type: Date,
        default: Date.now
    },
    requiresPasswordChange: {
        type: Boolean,
        default: false
    },
    profile: {
        firstName: String,
        lastName: String,
        dateOfBirth: Date,
        address: String,
        city: String,
        country: String,
        postalCode: String,
        nationality: String,
        documentType: String,
        documentNumber: String,
        documentExpiryDate: Date
    },
    preferredAuthMethod: {
        type: String,
        enum: Object.values(AuthMethod),
        default: AuthMethod.PASSWORD
    },
    securityQuestions: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Indexes for performance optimization
UserSchema.index({ email: 1, phoneNumber: 1 });
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ kycStatus: 1 });

// Methods
UserSchema.methods.validatePassword = async function(password: string): Promise<boolean> {
    try {
        // Implement constant-time comparison to prevent timing attacks
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

UserSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
    // Implement progressive lockout strategy
    this.loginAttempts += 1;
    
    if (this.loginAttempts >= 5) {
        const lockoutDuration = Math.min(2 ** (this.loginAttempts - 5) * 5, 1440); // Max 24 hours
        this.lockedUntil = new Date(Date.now() + lockoutDuration * 60000);
    }
    
    await this.save();
};

UserSchema.methods.validateDevice = async function(deviceInfo: IDeviceInfo): Promise<boolean> {
    const device = this.devices.find(d => d.deviceId === deviceInfo.deviceId);
    
    if (!device) {
        return false;
    }

    // Update last used timestamp
    device.lastUsed = new Date();
    await this.save();

    return device.trusted;
};

// Pre-save middleware for password hashing
UserSchema.pre('save', async function(next) {
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

// Create and export the model
export const User = mongoose.model<IUser>('User', UserSchema);