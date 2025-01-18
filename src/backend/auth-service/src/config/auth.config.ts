import dotenv from 'dotenv'; // ^16.0.0

// Load environment variables
dotenv.config();

// Type definitions for strict typing
type JWTAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
type BiometricLevel = 'WEAK' | 'NORMAL' | 'STRONG';

// Interface for JWT configuration
interface IJWTConfig {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    algorithm: JWTAlgorithm;
    clockTolerance: number;
    audience: string[];
}

// Interface for authentication methods configuration
interface IAuthMethodsConfig {
    maxLoginAttempts: number;
    lockoutDuration: number;
    pinLength: number;
    otpExpiry: number;
    biometricEnabled: boolean;
    deviceBindingRequired: boolean;
    biometricStrength: BiometricLevel;
    otpLength: number;
    otpAlgorithm: string;
}

// Interface for security settings
interface ISecurityConfig {
    passwordMinLength: number;
    passwordRequireSpecialChar: boolean;
    passwordRequireNumber: boolean;
    passwordRequireUppercase: boolean;
    sessionTimeout: number;
    passwordHistory: number;
    passwordExpiryDays: number;
    securityQuestions: number;
}

/**
 * Validates that all required environment variables are present and correctly formatted
 * @throws Error if required variables are missing or invalid
 */
function validateEnvironmentVariables(): void {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Check for sufficient entropy in JWT_SECRET
    const entropyCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{32,}$/;
    if (!entropyCheck.test(process.env.JWT_SECRET)) {
        throw new Error('JWT_SECRET does not meet complexity requirements');
    }
}

// Validate environment variables on initialization
validateEnvironmentVariables();

// JWT Configuration
const jwt: IJWTConfig = {
    secret: process.env.JWT_SECRET!,
    accessTokenExpiry: '15m',      // 15 minutes for access token
    refreshTokenExpiry: '7d',      // 7 days for refresh token
    issuer: 'FPBE-auth',
    algorithm: 'HS256',
    clockTolerance: 30,            // 30 seconds clock tolerance
    audience: ['mobile-app', 'web-app']
};

// Authentication Methods Configuration
const authMethods: IAuthMethodsConfig = {
    maxLoginAttempts: 5,           // Maximum failed login attempts before lockout
    lockoutDuration: 15,           // Account lockout duration in minutes
    pinLength: 6,                  // Length of PIN for PIN-based authentication
    otpExpiry: 5,                  // OTP expiry in minutes
    biometricEnabled: true,        // Enable biometric authentication
    deviceBindingRequired: true,   // Require device binding for enhanced security
    biometricStrength: 'STRONG',   // Required biometric strength level
    otpLength: 6,                  // Length of OTP code
    otpAlgorithm: 'SHA1'          // Algorithm for OTP generation
};

// Security Configuration
const security: ISecurityConfig = {
    passwordMinLength: 12,         // Minimum password length
    passwordRequireSpecialChar: true,  // Require special characters in password
    passwordRequireNumber: true,       // Require numbers in password
    passwordRequireUppercase: true,    // Require uppercase letters in password
    sessionTimeout: 30,               // Session timeout in minutes
    passwordHistory: 5,              // Number of previous passwords to remember
    passwordExpiryDays: 90,         // Password expiry in days
    securityQuestions: 3            // Number of security questions required
};

// Export configuration object
export const authConfig = {
    jwt,
    authMethods,
    security
};

// Export interfaces for type checking
export type {
    IJWTConfig,
    IAuthMethodsConfig,
    ISecurityConfig,
    JWTAlgorithm,
    BiometricLevel
};