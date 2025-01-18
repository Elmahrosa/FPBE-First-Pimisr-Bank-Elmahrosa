import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, AccessibilityInfo } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SecurityLogger } from '@fpbe/security-logger'; // ^1.0.0

// Internal imports
import { useBiometric } from '../../hooks/useBiometric';
import { BiometricType } from '../../services/biometric.service';

// Security logger instance
const securityLogger = new SecurityLogger({
  component: 'BiometricSetup',
  securityLevel: 'HIGH',
});

interface BiometricSetupScreenProps {
  navigation: NavigationProp<RootStackParamList>;
}

interface BiometricSetupState {
  isLoading: boolean;
  error: BiometricError | null;
  attempts: number;
  isAccessibilityEnabled: boolean;
}

/**
 * BiometricSetup screen component for secure biometric authentication setup
 * Implements OWASP MASVS security guidelines and WCAG 2.1 accessibility standards
 */
const BiometricSetup: React.FC<BiometricSetupScreenProps> = ({ navigation }) => {
  // Hooks
  const isFocused = useIsFocused();
  const {
    isBiometricAvailable,
    biometricType,
    authenticateWithBiometric,
    validateDeviceIntegrity,
  } = useBiometric();

  // Local state
  const [state, setState] = useState<BiometricSetupState>({
    isLoading: false,
    error: null,
    attempts: 0,
    isAccessibilityEnabled: false,
  });

  /**
   * Updates state with security logging
   */
  const updateState = useCallback((updates: Partial<BiometricSetupState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      securityLogger.debug('State updated', { prevState: prev, newState });
      return newState;
    });
  }, []);

  /**
   * Handles successful biometric setup with security validation
   */
  const handleSetupSuccess = useCallback(async () => {
    try {
      updateState({ isLoading: true });
      
      // Log security event
      securityLogger.info('Biometric setup successful', {
        biometricType,
        devicePlatform: Platform.OS,
      });

      // Navigate to next screen
      navigation.navigate('BiometricConfirmation');
    } catch (error) {
      securityLogger.error('Biometric setup error', { error });
      updateState({
        error: {
          code: 'SETUP_ERROR',
          message: 'Failed to complete biometric setup',
          technical: error.message,
        },
      });
    } finally {
      updateState({ isLoading: false });
    }
  }, [biometricType, navigation]);

  /**
   * Initiates biometric authentication with security checks
   */
  const handleBiometricSetup = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });

      // Validate device integrity
      const isDeviceSecure = await validateDeviceIntegrity();
      if (!isDeviceSecure) {
        throw new Error('Device integrity check failed');
      }

      // Attempt biometric authentication
      const authResult = await authenticateWithBiometric();
      if (authResult) {
        await handleSetupSuccess();
      } else {
        updateState({
          error: {
            code: 'AUTH_FAILED',
            message: 'Biometric authentication failed',
            technical: 'User verification failed',
          },
          attempts: state.attempts + 1,
        });
      }
    } catch (error) {
      securityLogger.error('Biometric setup error', { error });
      updateState({
        error: {
          code: 'SETUP_ERROR',
          message: 'Unable to setup biometric authentication',
          technical: error.message,
        },
      });
    } finally {
      updateState({ isLoading: false });
    }
  }, [authenticateWithBiometric, handleSetupSuccess, state.attempts]);

  /**
   * Checks accessibility settings on mount
   */
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      updateState({ isAccessibilityEnabled: enabled });
    });
  }, []);

  /**
   * Reset state when screen loses focus
   */
  useEffect(() => {
    if (!isFocused) {
      updateState({
        isLoading: false,
        error: null,
        attempts: 0,
      });
    }
  }, [isFocused]);

  /**
   * Renders biometric type specific instructions
   */
  const renderBiometricInstructions = useCallback(() => {
    switch (biometricType) {
      case BiometricType.FACE_ID:
        return 'Position your face in front of the camera to set up Face ID';
      case BiometricType.TOUCH_ID:
        return 'Place your finger on the home button to set up Touch ID';
      case BiometricType.FINGERPRINT:
        return 'Place your finger on the fingerprint sensor to complete setup';
      default:
        return 'Biometric authentication is not available on this device';
    }
  }, [biometricType]);

  return (
    <View style={styles.container} accessibilityRole="main">
      <Text 
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Biometric Setup"
      >
        Set Up {biometricType === BiometricType.FACE_ID ? 'Face ID' : 'Fingerprint'}
      </Text>

      <Text
        style={styles.description}
        accessibilityLabel={renderBiometricInstructions()}
      >
        {renderBiometricInstructions()}
      </Text>

      {state.error && (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLabel={state.error.message}
        >
          {state.error.message}
        </Text>
      )}

      <View style={styles.buttonContainer}>
        {isBiometricAvailable && (
          <TouchableOpacity
            onPress={handleBiometricSetup}
            disabled={state.isLoading}
            accessibilityRole="button"
            accessibilityLabel="Start biometric setup"
            accessibilityState={{ disabled: state.isLoading }}
            style={[styles.button, state.isLoading && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {state.isLoading ? 'Setting up...' : 'Set Up Now'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate('PinSetup')}
          accessibilityRole="button"
          accessibilityLabel="Skip biometric setup"
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Set Up Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    accessibilityRole: 'main',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1E3A8A',
    accessibilityRole: 'header',
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#374151',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 16,
    minHeight: 44,
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E3A8A',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: '#1E3A8A',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BiometricSetup;