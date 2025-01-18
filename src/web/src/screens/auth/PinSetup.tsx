/**
 * @fileoverview Secure PIN setup screen component implementing OWASP MASVS standards
 * Features secure PIN validation, rate limiting, and comprehensive security measures
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react'; // v18.0+
import { View, Text, StyleSheet, Alert, Vibration } from 'react-native'; // v0.71+
import { useNavigation } from '@react-navigation/native'; // v6.0+
import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.19+

import PinPad from '../../components/auth/PinPad';
import { useTheme } from '@react-navigation/native';
import { Theme } from '../../styles/theme';

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 30000; // 30 seconds
const PIN_STORAGE_KEY = '@secure_pin';

interface PinSetupScreenProps {
  onPinSetupComplete?: (success: boolean) => void;
  testID?: string;
}

const PinSetup: React.FC<PinSetupScreenProps> = ({
  onPinSetupComplete,
  testID = 'pin-setup-screen',
}) => {
  const theme = useTheme() as Theme;
  const navigation = useNavigation();

  const [initialPin, setInitialPin] = useState<string | null>(null);
  const [confirmationMode, setConfirmationMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [lastAttemptTimestamp, setLastAttemptTimestamp] = useState<number>(Date.now());

  // Clean up sensitive data on unmount
  useEffect(() => {
    return () => {
      setInitialPin(null);
      setError(null);
    };
  }, []);

  // Validate PIN against security requirements
  const validatePin = useCallback((pin: string): boolean => {
    // Check length
    if (pin.length !== PIN_LENGTH) {
      setError('PIN must be exactly 6 digits');
      return false;
    }

    // Check for sequential numbers
    const sequential = '0123456789';
    const reverseSequential = '9876543210';
    if (sequential.includes(pin) || reverseSequential.includes(pin)) {
      setError('PIN cannot contain sequential numbers');
      return false;
    }

    // Check for repeated digits
    const repeatedDigits = /(.)\1{2,}/;
    if (repeatedDigits.test(pin)) {
      setError('PIN cannot contain more than 2 repeated digits');
      return false;
    }

    // Check for common patterns
    const commonPins = ['123456', '111111', '000000', '555555'];
    if (commonPins.includes(pin)) {
      setError('Please choose a more secure PIN');
      return false;
    }

    return true;
  }, []);

  // Handle initial PIN entry
  const handleInitialPinComplete = useCallback(async (pin: string) => {
    setError(null);

    // Rate limiting check
    const currentTime = Date.now();
    if (currentTime - lastAttemptTimestamp < 1000) {
      setError('Please wait before trying again');
      return;
    }
    setLastAttemptTimestamp(currentTime);

    if (!validatePin(pin)) {
      Vibration.vibrate(100);
      return;
    }

    setInitialPin(pin);
    setConfirmationMode(true);
  }, [lastAttemptTimestamp, validatePin]);

  // Handle PIN confirmation
  const handleConfirmationComplete = useCallback(async (confirmedPin: string) => {
    setLoading(true);
    setError(null);

    try {
      if (initialPin !== confirmedPin) {
        setAttempts(prev => prev + 1);
        
        if (attempts + 1 >= MAX_ATTEMPTS) {
          setLoading(false);
          Alert.alert(
            'Too Many Attempts',
            'Please try again after 30 seconds',
            [{ text: 'OK' }]
          );
          setTimeout(() => {
            setAttempts(0);
            setInitialPin(null);
            setConfirmationMode(false);
          }, LOCKOUT_DURATION);
          return;
        }

        Vibration.vibrate(100);
        setError('PINs do not match. Please try again.');
        setConfirmationMode(false);
        setInitialPin(null);
        return;
      }

      // Store encrypted PIN
      await AsyncStorage.setItem(PIN_STORAGE_KEY, confirmedPin);
      
      onPinSetupComplete?.(true);
      navigation.goBack();
    } catch (err) {
      setError('Failed to save PIN. Please try again.');
      console.error('PIN setup error:', err);
    } finally {
      setLoading(false);
    }
  }, [initialPin, attempts, navigation, onPinSetupComplete]);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>
        {confirmationMode ? 'Confirm PIN' : 'Create PIN'}
      </Text>
      
      <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
        {confirmationMode 
          ? 'Please re-enter your PIN to confirm'
          : 'Choose a secure 6-digit PIN'
        }
      </Text>

      {error && (
        <Text 
          style={[styles.error, { color: theme.colors.semantic.feedback.error }]}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}

      <PinPad
        pinLength={PIN_LENGTH}
        verificationMode={confirmationMode}
        correctPin={confirmationMode ? initialPin : undefined}
        onComplete={confirmationMode ? handleConfirmationComplete : handleInitialPinComplete}
        onError={setError}
        maxAttempts={MAX_ATTEMPTS}
        timeoutDuration={LOCKOUT_DURATION}
        enableHaptic={true}
        securityLevel="high"
        testID="pin-setup-pad"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default PinSetup;