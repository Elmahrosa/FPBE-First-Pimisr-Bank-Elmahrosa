/**
 * @fileoverview Secure PIN entry component implementing OWASP MASVS standards
 * Features randomized keypad, attempt limiting, and accessibility support
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.0+
import {
  View,
  Text,
  StyleSheet,
  Vibration,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // v6.0+
import Button from '../common/Button';
import { Theme } from '../../styles/theme';
import { clearSensitiveData, maskPinDisplay } from '@security/utils'; // v1.0+

interface PinPadProps {
  pinLength: number;
  verificationMode: boolean;
  correctPin?: string;
  onComplete: (pin: string) => void;
  onError: (message: string) => void;
  maxAttempts?: number;
  timeoutDuration?: number;
  enableHaptic?: boolean;
  securityLevel?: 'high' | 'medium';
  onTimeout?: () => void;
  testID?: string;
}

const PinPad: React.FC<PinPadProps> = ({
  pinLength = 6,
  verificationMode = false,
  correctPin,
  onComplete,
  onError,
  maxAttempts = 3,
  timeoutDuration = 30000,
  enableHaptic = true,
  securityLevel = 'high',
  onTimeout,
  testID,
}) => {
  const theme = useTheme() as Theme;
  const [pin, setPin] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [keypadLayout, setKeypadLayout] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastInputTime = useRef<number>(Date.now());

  // Generate cryptographically secure random keypad layout
  const randomizeKeypad = useCallback((): number[] => {
    const array = Array.from({ length: 10 }, (_, i) => i);
    for (let i = array.length - 1; i > 0; i--) {
      // Use crypto-secure random number generation
      const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }, []);

  // Initialize keypad and check accessibility settings
  useEffect(() => {
    setKeypadLayout(randomizeKeypad());
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    return () => cleanupSensitiveData();
  }, []);

  // Cleanup sensitive data from memory
  const cleanupSensitiveData = useCallback(() => {
    setPin('');
    setAttempts(0);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    clearSensitiveData();
  }, []);

  // Handle PIN input with security measures
  const handlePinInput = useCallback((digit: string) => {
    if (isLocked) return;

    const currentTime = Date.now();
    if (currentTime - lastInputTime.current < 100) {
      // Prevent rapid input attempts
      return;
    }
    lastInputTime.current = currentTime;

    if (enableHaptic) {
      Vibration.vibrate(10);
    }

    setPin(prevPin => {
      const newPin = prevPin + digit;
      
      if (newPin.length === pinLength) {
        if (verificationMode && correctPin) {
          if (newPin === correctPin) {
            onComplete(newPin);
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            
            if (newAttempts >= maxAttempts) {
              setIsLocked(true);
              timeoutRef.current = setTimeout(() => {
                setIsLocked(false);
                setAttempts(0);
                onTimeout?.();
              }, timeoutDuration);
              onError('Maximum attempts exceeded. Please try again later.');
            } else {
              onError(`Invalid PIN. ${maxAttempts - newAttempts} attempts remaining.`);
            }
            return '';
          }
        } else {
          onComplete(newPin);
        }
        return '';
      }
      return newPin;
    });

    // Randomize keypad after each input if high security is enabled
    if (securityLevel === 'high') {
      setKeypadLayout(randomizeKeypad());
    }
  }, [isLocked, pinLength, verificationMode, correctPin, attempts, maxAttempts]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (isLocked) return;
    setPin(prevPin => prevPin.slice(0, -1));
    setError(null);
  }, [isLocked]);

  return (
    <View style={styles.container} testID={testID}>
      {/* PIN display */}
      <View 
        style={styles.pinDisplay}
        accessibilityLabel={`PIN entry: ${pin.length} digits entered`}
        accessibilityRole="text"
      >
        {Array.from({ length: pinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              { backgroundColor: pin.length > index ? theme.colors.primary : theme.colors.border }
            ]}
          />
        ))}
      </View>

      {/* Error display */}
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}

      {/* Keypad */}
      <View style={styles.keypad} accessibilityRole="keypad">
        {keypadLayout.map((digit) => (
          <Button
            key={digit}
            title={digit.toString()}
            onPress={() => handlePinInput(digit.toString())}
            disabled={isLocked || pin.length === pinLength}
            style={styles.key}
            variant="secondary"
            size="large"
            accessibilityLabel={`Enter ${digit}`}
            hapticFeedback={enableHaptic}
            testID={`pin-key-${digit}`}
          />
        ))}
        <Button
          title="←"
          onPress={handleBackspace}
          disabled={isLocked || pin.length === 0}
          style={styles.key}
          variant="outline"
          size="large"
          accessibilityLabel="Delete last digit"
          hapticFeedback={enableHaptic}
          testID="pin-key-backspace"
        />
      </View>
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
  pinDisplay: {
    flexDirection: 'row',
    marginBottom: 30,
    justifyContent: 'center',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.5%',
    minHeight: 44, // WCAG touch target size
  },
  errorText: {
    color: 'error',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default PinPad;