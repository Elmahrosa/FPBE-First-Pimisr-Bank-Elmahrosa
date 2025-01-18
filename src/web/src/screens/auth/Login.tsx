/**
 * @fileoverview Enterprise-grade Login screen component for FPBE mobile banking application
 * Implements secure multi-factor authentication with WCAG 2.1 AA compliance
 * @version 2024.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  TextInput,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import BiometricPrompt from '../../components/auth/BiometricPrompt';
import PinPad from '../../components/auth/PinPad';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/common/Button';

interface LoginFormData {
  email: string;
  password: string;
  deviceId: string;
  securityVersion: string;
}

const Login: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const {
    handleLogin,
    handleBiometricLogin,
    loading,
    error,
    securityContext
  } = useAuth();

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    deviceId: '',
    securityVersion: '1.0'
  });
  const [showBiometric, setShowBiometric] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Email validation regex
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Check accessibility settings on mount
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
  }, []);

  // Reset form state when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      setFormData({
        email: '',
        password: '',
        deviceId: '',
        securityVersion: '1.0'
      });
      setShowBiometric(false);
      setShowPinPad(false);
    }
  }, [isFocused]);

  // Form validation
  const validateForm = useCallback(() => {
    if (!formData.email || !EMAIL_REGEX.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    if (!formData.password || formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      AccessibilityInfo.announceForAccessibility(validationError);
      return;
    }

    try {
      await handleLogin({
        ...formData,
        deviceId: securityContext.deviceId || ''
      });
    } catch (error) {
      AccessibilityInfo.announceForAccessibility('Login failed. Please try again.');
    }
  }, [formData, handleLogin, securityContext, validateForm]);

  // Handle biometric authentication
  const handleBiometricAuth = useCallback(async () => {
    try {
      await handleBiometricLogin();
    } catch (error) {
      setShowBiometric(false);
      AccessibilityInfo.announceForAccessibility('Biometric authentication failed. Please try again.');
    }
  }, [handleBiometricLogin]);

  // Memoized styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '600',
      marginBottom: 32,
      textAlign: 'center',
      color: '#1E3A8A',
      ...Platform.select({
        ios: { fontFamily: 'SF Pro Display' },
        android: { fontFamily: 'Roboto' },
      }),
    },
    input: {
      height: 48,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 8,
      paddingHorizontal: 16,
      marginBottom: 16,
      fontSize: 16,
      color: '#333333',
      backgroundColor: '#F9FAFB',
    },
    errorText: {
      color: '#EF4444',
      marginBottom: 16,
      fontSize: 14,
      textAlign: 'center',
    },
    buttonContainer: {
      gap: 16,
      marginTop: 24,
    },
    forgotPassword: {
      marginTop: 16,
      alignItems: 'center',
    },
    forgotPasswordText: {
      color: '#3B82F6',
      fontSize: 14,
    },
  }), []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text 
          style={styles.title}
          accessibilityRole="header"
        >
          Welcome to FPBE Banking
        </Text>

        {error && (
          <Text 
            style={styles.errorText}
            accessibilityRole="alert"
          >
            {error.message}
          </Text>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel="Email input"
          accessibilityHint="Enter your email address"
          testID="login-email-input"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          accessibilityLabel="Password input"
          accessibilityHint="Enter your password"
          testID="login-password-input"
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Login"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            variant="primary"
            size="large"
            fullWidth
            testID="login-submit-button"
            accessibilityLabel="Login button"
          />

          <Button
            title="Login with Biometrics"
            onPress={() => setShowBiometric(true)}
            variant="secondary"
            size="large"
            fullWidth
            testID="login-biometric-button"
            accessibilityLabel="Login with biometrics"
          />

          <Button
            title="Login with PIN"
            onPress={() => setShowPinPad(true)}
            variant="outline"
            size="large"
            fullWidth
            testID="login-pin-button"
            accessibilityLabel="Login with PIN"
          />
        </View>

        <TouchableOpacity 
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
        >
          <Text style={styles.forgotPasswordText}>
            Forgot Password?
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BiometricPrompt
        visible={showBiometric}
        onSuccess={handleBiometricAuth}
        onCancel={() => setShowBiometric(false)}
        onError={(error) => {
          setShowBiometric(false);
          AccessibilityInfo.announceForAccessibility(error);
        }}
        testID="login-biometric-prompt"
      />

      <PinPad
        visible={showPinPad}
        pinLength={6}
        onComplete={async (pin) => {
          setShowPinPad(false);
          try {
            await handleLogin({
              ...formData,
              password: pin,
              deviceId: securityContext.deviceId || ''
            });
          } catch (error) {
            AccessibilityInfo.announceForAccessibility('PIN authentication failed. Please try again.');
          }
        }}
        onCancel={() => setShowPinPad(false)}
        maxAttempts={3}
        testID="login-pin-pad"
      />
    </KeyboardAvoidingView>
  );
};

export default Login;