/**
 * @fileoverview Enhanced QR code scanner component for secure payment processing
 * Implements comprehensive security measures and error handling for QR-based transactions
 * @version 2024.1
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'; // v18.0+
import { StyleSheet, View, Alert, Platform, ActivityIndicator, Vibration } from 'react-native'; // v0.71+
import { Camera, RNCamera } from 'react-native-camera'; // ^4.2.1
import { check, PERMISSIONS, RESULTS, request, openSettings } from 'react-native-permissions'; // ^3.8.0
import { handleError, logSecurityEvent } from '../../services/error.service';

// QR code validation options interface
interface QRValidationOptions {
    allowedTypes: Array<'BANK_TRANSFER' | 'PI_PAYMENT'>;
    maxAmount?: number;
    requireSignature: boolean;
    validityPeriod: number; // in milliseconds
}

// Props interface with enhanced security options
interface QRScannerProps {
    onScan: (data: QRData) => void;
    onError?: (error: Error) => void;
    style?: StyleProp<ViewStyle>;
    validationOptions?: QRValidationOptions;
}

// Enhanced QR data structure with validation
interface QRData {
    type: 'BANK_TRANSFER' | 'PI_PAYMENT';
    recipient: string;
    amount?: string;
    timestamp: number;
    signature: string;
}

// Default validation options with security measures
const DEFAULT_VALIDATION_OPTIONS: QRValidationOptions = {
    allowedTypes: ['BANK_TRANSFER', 'PI_PAYMENT'],
    maxAmount: 10000, // $10,000 limit
    requireSignature: true,
    validityPeriod: 5 * 60 * 1000 // 5 minutes
};

/**
 * Enhanced QR Scanner component with security features
 */
const QRScanner: React.FC<QRScannerProps> = ({
    onScan,
    onError,
    style,
    validationOptions = DEFAULT_VALIDATION_OPTIONS
}) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef<RNCamera | null>(null);

    // Check and request camera permissions with enhanced error handling
    const checkCameraPermission = useCallback(async () => {
        try {
            const permission = Platform.select({
                ios: PERMISSIONS.IOS.CAMERA,
                android: PERMISSIONS.ANDROID.CAMERA,
                default: PERMISSIONS.ANDROID.CAMERA
            });

            const result = await check(permission);

            switch (result) {
                case RESULTS.GRANTED:
                    setHasPermission(true);
                    break;
                case RESULTS.DENIED:
                    const requestResult = await request(permission);
                    setHasPermission(requestResult === RESULTS.GRANTED);
                    break;
                case RESULTS.BLOCKED:
                    Alert.alert(
                        'Camera Permission Required',
                        'Please enable camera access in your device settings to scan QR codes.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Open Settings', onPress: openSettings }
                        ]
                    );
                    setHasPermission(false);
                    break;
                default:
                    setHasPermission(false);
                    throw new Error('Camera permission check failed');
            }
        } catch (error) {
            await handleError(error as Error, {
                errorType: 'RUNTIME_ERROR',
                metadata: { component: 'QRScanner', action: 'checkPermission' }
            });
            setHasPermission(false);
            onError?.(error as Error);
        }
    }, [onError]);

    // Validate QR data with comprehensive security checks
    const validateQRData = useCallback((data: string): QRData | null => {
        try {
            const parsedData = JSON.parse(data);
            
            // Validate required fields
            if (!parsedData.type || !parsedData.recipient || !parsedData.timestamp || !parsedData.signature) {
                throw new Error('Invalid QR code format');
            }

            // Validate payment type
            if (!validationOptions.allowedTypes.includes(parsedData.type)) {
                throw new Error('Unsupported payment type');
            }

            // Validate timestamp
            const currentTime = Date.now();
            if (currentTime - parsedData.timestamp > validationOptions.validityPeriod) {
                throw new Error('QR code has expired');
            }

            // Validate amount if present
            if (parsedData.amount) {
                const amount = parseFloat(parsedData.amount);
                if (isNaN(amount) || amount <= 0 || (validationOptions.maxAmount && amount > validationOptions.maxAmount)) {
                    throw new Error('Invalid payment amount');
                }
            }

            // Validate signature if required
            if (validationOptions.requireSignature && !verifySignature(parsedData)) {
                throw new Error('Invalid QR code signature');
            }

            return parsedData as QRData;
        } catch (error) {
            logSecurityEvent('QR_VALIDATION_FAILED', {
                error: error.message,
                rawData: data
            });
            return null;
        }
    }, [validationOptions]);

    // Verify QR code signature
    const verifySignature = (data: Partial<QRData>): boolean => {
        // Implement signature verification logic here
        // This is a placeholder - actual implementation would use cryptographic verification
        return true;
    };

    // Handle successful QR code scan
    const handleQRCodeScanned = useCallback(async ({ data }: { data: string }) => {
        if (!isScanning || isProcessing) return;

        setIsProcessing(true);
        Vibration.vibrate(100); // Haptic feedback

        try {
            const validatedData = validateQRData(data);
            if (!validatedData) {
                throw new Error('Invalid QR code data');
            }

            setIsScanning(false);
            onScan(validatedData);
        } catch (error) {
            await handleError(error as Error, {
                errorType: 'VALIDATION_ERROR',
                metadata: { component: 'QRScanner', action: 'scanQR' }
            });
            onError?.(error as Error);
            
            // Resume scanning after error
            setTimeout(() => setIsScanning(true), 1000);
        } finally {
            setIsProcessing(false);
        }
    }, [isScanning, isProcessing, validateQRData, onScan, onError]);

    // Initialize camera permissions
    useEffect(() => {
        checkCameraPermission();
    }, [checkCameraPermission]);

    // Render loading state
    if (hasPermission === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1E3A8A" />
            </View>
        );
    }

    // Render permission denied state
    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Alert.alert(
                    'Camera Access Denied',
                    'Please enable camera access in your device settings to use the QR scanner.'
                );
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <RNCamera
                ref={cameraRef}
                style={styles.camera}
                type={RNCamera.Constants.Type.back}
                captureAudio={false}
                androidCameraPermissionOptions={null}
                onBarCodeRead={handleQRCodeScanned}
                barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
            >
                <View style={styles.overlay}>
                    <View style={styles.marker} />
                </View>
                {isProcessing && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                )}
            </RNCamera>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden'
    },
    camera: {
        flex: 1
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        backgroundColor: 'transparent'
    },
    marker: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: '#00FF00',
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -140,
        marginLeft: -140
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    }
});

export default QRScanner;