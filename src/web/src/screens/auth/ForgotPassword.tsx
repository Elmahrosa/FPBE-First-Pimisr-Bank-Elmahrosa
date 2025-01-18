/**
 * @fileoverview Secure password reset screen component for FPBE mobile banking application
 * Implements comprehensive security controls, rate limiting, and validation
 * @version 2024.1
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import validator from 'validator';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { resetPassword } from '../../api/auth.api';
import { useTheme } from '@react-navigation/native';
import { Theme } from '../../styles/theme';
import { SPACING } from '../../styles/spacing';
import { shared } from '../../styles/colors';
import { COMPONENT_DIMENSIONS } from '../../styles/dimensions';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 3600000, // 1 hour
  BLOCK_DURATION_MS: 3600000 // 1 hour
};

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPassword: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const theme = useTheme() as Theme;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  // Reset rate limiting after window expires
  useEffect(() => {
    const now = Date.now();
    if (lastAttemptTime && (now - lastAttemptTime) >= RATE_LIMIT.WINDOW_MS) {
      setAttempts(0);
      setLastAttemptTime(0);
    }
  }, [lastAttemptTime]);

  /**
   * Validates email format and domain
   * @param email Email to validate
   * @returns Boolean indicating if email is valid
   */
  const validateEmail = useCallback((email: string): boolean => {
    if (!validator.isEmail(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Additional security checks for email domain
    const domain = email.split('@')[1];
    if (!domain || domain.split('.').length < 2) {
      setError('Invalid email domain');
      return false;
    }

    return true;
  }, []);

  /**
   * Handles email input changes with validation
   * @param text New email value
   */
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text.trim());
    setError(null);
  }, []);

  /**
   * Handles password reset request with rate limiting and security controls
   */
  const handleResetPassword = useCallback(async () => {
    try {
      // Check rate limiting
      const now = Date.now();
      if (attempts >= RATE_LIMIT.MAX_ATTEMPTS) {
        const timeRemaining = Math.ceil((RATE_LIMIT.BLOCK_DURATION_MS - (now - lastAttemptTime)) / 60000);
        setError(`Too many attempts. Please try again in ${timeRemaining} minutes`);
        return;
      }

      if (!validateEmail(email)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      // Get device fingerprint for security tracking
      const deviceId = await localStorage.getItem('deviceId') || 'unknown';

      // Call reset password API with security headers
      await resetPassword({
        email,
        deviceId,
        timestamp: new Date().toISOString(),
        securityVersion: '2024.1'
      });

      // Update rate limiting counters
      setAttempts(prev => prev + 1);
      setLastAttemptTime(now);

      // Show success message
      Alert.alert(
        'Password Reset Requested',
        'If an account exists for this email, you will receive password reset instructions.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.status === 429) {
        setError('Too many requests. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
      console.error('Password reset error:', {
        error: error.message,
        email: email.replace(/./g, '*'), // Log masked email for security
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  }, [email, attempts, lastAttemptTime, navigation, validateEmail]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      testID="forgot-password-screen"
    >
      <View style={styles.form}>
        <Input
          value={email}
          onChangeText={handleEmailChange}
          type="email"
          label="Email Address"
          placeholder="Enter your email address"
          error={error}
          disabled={isLoading}
          testID="email-input"
          maxLength={100}
          customValidation={validateEmail}
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Reset Password"
            onPress={handleResetPassword}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={!email || isLoading || attempts >= RATE_LIMIT.MAX_ATTEMPTS}
            fullWidth
            testID="reset-button"
            accessibilityLabel="Reset password button"
          />

          <Button
            title="Back to Login"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            size="large"
            disabled={isLoading}
            fullWidth
            testID="back-button"
            accessibilityLabel="Back to login button"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme => theme.colors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.LG,
    justifyContent: 'center',
    minHeight: COMPONENT_DIMENSIONS.CARD_HEIGHT,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  buttonContainer: {
    marginTop: SPACING.LG,
    gap: SPACING.MD,
  },
});

export default ForgotPassword;