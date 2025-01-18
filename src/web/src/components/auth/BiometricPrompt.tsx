/**
 * @fileoverview Enterprise-grade BiometricPrompt component for FPBE mobile banking application
 * Implements secure biometric authentication with comprehensive accessibility support
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native'; // v0.71+
import { useTranslation } from 'react-i18next'; // v12.0.0
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'; // v2.0.0

// Internal imports
import { useBiometric } from '../../hooks/useBiometric';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { useTheme } from '@react-navigation/native';
import { Theme } from '../../styles/theme';

interface BiometricPromptProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
  testID?: string;
}

/**
 * BiometricPrompt component that renders an accessible modal for biometric authentication
 * Implements WCAG 2.1 accessibility guidelines and security best practices
 */
export const BiometricPrompt = memo<BiometricPromptProps>(({
  visible,
  onSuccess,
  onCancel,
  onError,
  testID = 'biometric-prompt',
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as Theme;
  const {
    isBiometricAvailable,
    isLoading,
    error,
    biometricType,
    authenticateWithBiometric,
  } = useBiometric();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  /**
   * Handles biometric authentication with security logging and haptic feedback
   */
  const handleAuthenticate = useCallback(async () => {
    try {
      // Initial haptic feedback
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });

      if (!isBiometricAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const result = await authenticateWithBiometric();

      if (result) {
        // Success haptic feedback
        ReactNativeHapticFeedback.trigger('notificationSuccess', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
        onSuccess();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      // Error haptic feedback
      ReactNativeHapticFeedback.trigger('notificationError', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      onError(err.message);
    }
  }, [isBiometricAvailable, authenticateWithBiometric, onSuccess, onError]);

  // Handle animations
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: theme.animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim, theme.animation.duration.normal]);

  // Get biometric type specific content
  const getBiometricContent = useCallback(() => {
    switch (biometricType) {
      case 'FACE_ID':
        return {
          title: t('auth.biometric.faceId.title'),
          message: t('auth.biometric.faceId.message'),
          icon: '👤',
        };
      case 'TOUCH_ID':
      case 'FINGERPRINT':
        return {
          title: t('auth.biometric.fingerprint.title'),
          message: t('auth.biometric.fingerprint.message'),
          icon: '👆',
        };
      default:
        return {
          title: t('auth.biometric.default.title'),
          message: t('auth.biometric.default.message'),
          icon: '🔒',
        };
    }
  }, [biometricType, t]);

  const content = getBiometricContent();

  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={content.title}
      testID={testID}
      size="small"
      accessibilityLabel={t('auth.biometric.modal.accessibility')}
      accessibilityHint={t('auth.biometric.modal.hint')}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={[styles.icon, { color: theme.colors.text.primary }]}>
          {content.icon}
        </Text>
        
        <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
          {content.message}
        </Text>

        {error && (
          <Text
            style={[styles.error, { color: theme.colors.semantic.feedback.error }]}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={t('common.cancel')}
            onPress={onCancel}
            variant="outline"
            size="medium"
            testID={`${testID}-cancel`}
          />
          <Button
            title={t('auth.biometric.authenticate')}
            onPress={handleAuthenticate}
            variant="primary"
            size="medium"
            loading={isLoading}
            disabled={!isBiometricAvailable || isLoading}
            testID={`${testID}-authenticate`}
          />
        </View>
      </Animated.View>
    </Modal>
  );
});

BiometricPrompt.displayName = 'BiometricPrompt';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Text',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  error: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Text',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
});

export default BiometricPrompt;