/**
 * @fileoverview QR Payment screen component for FPBE mobile banking application
 * Implements secure QR code scanning for both traditional and Pi Network payments
 * @version 2024.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QRScanner from '../../components/payments/QRScanner';
import { createTransaction } from '../../api/transaction.api';
import { ErrorService } from '@fpbe/error-service';
import { SecurityService } from '@fpbe/security-service';
import analytics from '../../services/analytics.service';

// QR payment data structure with enhanced validation
interface QRPaymentData {
    type: 'BANK_TRANSFER' | 'PI_PAYMENT';
    recipientId: string;
    amount: number;
    currency: string;
    signature: string;
    timestamp: number;
    metadata?: {
        merchantName?: string;
        reference?: string;
        piWalletAddress?: string;
    };
}

// Transaction validation constants
const TRANSACTION_LIMITS = {
    BANK_TRANSFER: 50000,
    PI_PAYMENT: 1000
};

const QR_CODE_VALIDITY_PERIOD = 5 * 60 * 1000; // 5 minutes

/**
 * QR Payment screen component with enhanced security features
 */
const QRPayment: React.FC = () => {
    const navigation = useNavigation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanEnabled, setScanEnabled] = useState(true);

    // Initialize analytics tracking
    useEffect(() => {
        analytics.trackScreen('QR_PAYMENT_SCREEN');
        return () => setScanEnabled(false);
    }, []);

    /**
     * Validates QR payment data with comprehensive security checks
     */
    const validateQRData = useCallback(async (data: QRPaymentData): Promise<boolean> => {
        try {
            // Validate timestamp to prevent replay attacks
            const currentTime = Date.now();
            if (currentTime - data.timestamp > QR_CODE_VALIDITY_PERIOD) {
                throw new Error('QR code has expired');
            }

            // Validate transaction limits
            const limit = data.type === 'PI_PAYMENT' 
                ? TRANSACTION_LIMITS.PI_PAYMENT 
                : TRANSACTION_LIMITS.BANK_TRANSFER;

            if (data.amount <= 0 || data.amount > limit) {
                throw new Error(`Invalid payment amount. Maximum limit is ${limit} ${data.currency}`);
            }

            // Verify QR code signature
            const isValid = await SecurityService.verifySignature({
                payload: {
                    type: data.type,
                    recipientId: data.recipientId,
                    amount: data.amount,
                    currency: data.currency,
                    timestamp: data.timestamp
                },
                signature: data.signature
            });

            if (!isValid) {
                throw new Error('Invalid QR code signature');
            }

            return true;
        } catch (error) {
            await ErrorService.handleError(error as Error, {
                errorType: 'VALIDATION_ERROR',
                metadata: { component: 'QRPayment', action: 'validateQRData' }
            });
            return false;
        }
    }, []);

    /**
     * Handles successful QR code scan with validation and processing
     */
    const handleScan = useCallback(async (qrData: string) => {
        if (!scanEnabled || isProcessing) return;

        setIsProcessing(true);
        setScanEnabled(false);

        try {
            const parsedData: QRPaymentData = JSON.parse(qrData);
            
            // Validate QR data
            const isValid = await validateQRData(parsedData);
            if (!isValid) {
                throw new Error('Invalid QR code data');
            }

            // Create transaction
            const transaction = await createTransaction({
                type: parsedData.type === 'PI_PAYMENT' ? 'PI_EXCHANGE' : 'QR_PAYMENT',
                amount: parsedData.amount,
                currency: parsedData.currency,
                toAccountId: parsedData.recipientId,
                metadata: {
                    qrTimestamp: parsedData.timestamp,
                    ...parsedData.metadata
                }
            });

            // Track successful scan
            await analytics.trackEvent('QR_PAYMENT_SCAN_SUCCESS', {
                paymentType: parsedData.type,
                amount: parsedData.amount,
                currency: parsedData.currency
            });

            // Navigate to confirmation
            navigation.navigate('TransactionConfirmation', { 
                transactionId: transaction.id 
            });
        } catch (error) {
            await ErrorService.handleError(error as Error, {
                errorType: 'TRANSACTION_ERROR',
                metadata: { component: 'QRPayment', action: 'handleScan' }
            });

            Alert.alert(
                'Payment Error',
                'Unable to process QR payment. Please try again.',
                [{ text: 'OK', onPress: () => setScanEnabled(true) }]
            );
        } finally {
            setIsProcessing(false);
        }
    }, [navigation, scanEnabled, isProcessing, validateQRData]);

    /**
     * Handles QR scanning errors with logging
     */
    const handleError = useCallback(async (error: Error) => {
        await ErrorService.handleError(error, {
            errorType: 'RUNTIME_ERROR',
            metadata: { component: 'QRPayment', action: 'handleError' }
        });

        Alert.alert(
            'Scanner Error',
            'Unable to access camera. Please check permissions and try again.',
            [{ text: 'OK', onPress: () => setScanEnabled(true) }]
        );
    }, []);

    return (
        <View style={styles.container}>
            <QRScanner
                onScan={handleScan}
                onError={handleError}
                style={styles.scanner}
                validationOptions={{
                    allowedTypes: ['BANK_TRANSFER', 'PI_PAYMENT'],
                    requireSignature: true,
                    validityPeriod: QR_CODE_VALIDITY_PERIOD
                }}
            />
            {isProcessing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#1E3A8A" />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000'
    },
    scanner: {
        flex: 1
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default QRPayment;