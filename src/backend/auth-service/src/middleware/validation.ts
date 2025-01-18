// External dependencies
import { Request, Response, NextFunction } from 'express'; // ^4.17.1
import Joi from 'joi'; // ^17.4.0
import httpStatus from 'http-status'; // ^1.5.0
import xss from 'xss'; // ^1.0.9
import dns from 'dns/promises';

// Internal imports
import { User, IUserProfile, KYCStatus, IDeviceInfo } from '../models/user.model';
import { authConfig } from '../config/auth.config';

// Custom validation functions
const sanitizeInput = (value: string) => xss(value.trim());

const validatePasswordStrength = (password: string) => {
    const { security } = authConfig;
    const passwordRegex = new RegExp(
        `^(?=.*[a-z])(?=.*[A-Z])${security.passwordRequireNumber ? '(?=.*\\d)' : ''}${security.passwordRequireSpecialChar ? '(?=.*[@$!%*?&])' : ''}[A-Za-z\\d@$!%*?&]{${security.passwordMinLength},}$`
    );
    
    if (!passwordRegex.test(password)) {
        throw new Error('Password does not meet security requirements');
    }
    return password;
};

const validateDeviceInfo = (deviceInfo: IDeviceInfo) => {
    if (!deviceInfo.deviceId || !deviceInfo.deviceType || !deviceInfo.deviceName) {
        throw new Error('Invalid device information');
    }
    return deviceInfo;
};

// Schema definitions with enhanced validation
const loginSchema = Joi.object({
    email: Joi.string().email().custom(sanitizeInput),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/),
    password: Joi.string().custom(validatePasswordStrength).required(),
    deviceInfo: Joi.object().custom(validateDeviceInfo).required()
}).xor('email', 'phoneNumber');

const pinSchema = Joi.object({
    userId: Joi.string().required(),
    pin: Joi.string()
        .length(authConfig.authMethods.pinLength)
        .pattern(/^\d+$/)
        .required(),
    deviceInfo: Joi.object().custom(validateDeviceInfo).required()
});

const biometricSchema = Joi.object({
    userId: Joi.string().required(),
    biometricData: Joi.binary().required(),
    deviceInfo: Joi.object().custom(validateDeviceInfo).required(),
    biometricType: Joi.string().valid('FINGERPRINT', 'FACE_ID', 'IRIS').required()
});

const registrationSchema = Joi.object({
    email: Joi.string().email().custom(sanitizeInput).required(),
    phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
    password: Joi.string().custom(validatePasswordStrength).required(),
    profile: Joi.object({
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        dateOfBirth: Joi.date().max('now').required(),
        address: Joi.string().required(),
        city: Joi.string().required(),
        country: Joi.string().required(),
        postalCode: Joi.string().required(),
        nationality: Joi.string().required(),
        documentType: Joi.string().required(),
        documentNumber: Joi.string().required(),
        documentExpiryDate: Joi.date().min('now').required()
    }).required(),
    deviceInfo: Joi.object().custom(validateDeviceInfo).required(),
    kycData: Joi.object().required()
});

// Validation middleware functions
export const validateLoginRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Sanitize and validate request body
        const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid request data',
                details: error.details.map(detail => detail.message)
            });
            return;
        }

        // Additional email validation if provided
        if (value.email) {
            const [domain] = value.email.split('@')[1];
            try {
                await dns.resolve(domain, 'MX');
            } catch (err) {
                res.status(httpStatus.BAD_REQUEST).json({
                    status: 'error',
                    message: 'Invalid email domain'
                });
                return;
            }
        }

        // Check for account lockout
        const user = await User.findOne({
            $or: [{ email: value.email }, { phoneNumber: value.phoneNumber }]
        });

        if (user?.lockedUntil && user.lockedUntil > new Date()) {
            res.status(httpStatus.FORBIDDEN).json({
                status: 'error',
                message: 'Account is temporarily locked',
                unlockTime: user.lockedUntil
            });
            return;
        }

        req.body = value;
        next();
    } catch (error) {
        next(error);
    }
};

export const validatePinRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = pinSchema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid PIN request',
                details: error.details.map(detail => detail.message)
            });
            return;
        }

        // Verify user exists and has PIN authentication enabled
        const user = await User.findById(value.userId);
        if (!user || !user.pin) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'PIN authentication not enabled for user'
            });
            return;
        }

        req.body = value;
        next();
    } catch (error) {
        next(error);
    }
};

export const validateBiometricRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = biometricSchema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid biometric request',
                details: error.details.map(detail => detail.message)
            });
            return;
        }

        // Verify user exists and has biometric authentication enabled
        const user = await User.findById(value.userId);
        if (!user || !user.biometricData) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Biometric authentication not enabled for user'
            });
            return;
        }

        req.body = value;
        next();
    } catch (error) {
        next(error);
    }
};

export const validateRegistrationRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { error, value } = registrationSchema.validate(req.body, { abortEarly: false });
        if (error) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid registration data',
                details: error.details.map(detail => detail.message)
            });
            return;
        }

        // Check for existing user
        const existingUser = await User.findOne({
            $or: [{ email: value.email }, { phoneNumber: value.phoneNumber }]
        });

        if (existingUser) {
            res.status(httpStatus.CONFLICT).json({
                status: 'error',
                message: 'User already exists'
            });
            return;
        }

        // Validate email domain
        const [domain] = value.email.split('@')[1];
        try {
            await dns.resolve(domain, 'MX');
        } catch (err) {
            res.status(httpStatus.BAD_REQUEST).json({
                status: 'error',
                message: 'Invalid email domain'
            });
            return;
        }

        req.body = value;
        next();
    } catch (error) {
        next(error);
    }
};