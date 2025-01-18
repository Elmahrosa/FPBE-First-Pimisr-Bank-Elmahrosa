/**
 * @fileoverview Enhanced registration screen component for FPBE mobile banking application
 * Implements secure user onboarding with comprehensive validation, KYC integration,
 * and biometric preparation.
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import zxcvbn from 'zxcvbn';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { validateInput, validatePassword } from '../../utils/validation.utils';
import { KYCStatus } from '../../types/auth.types';
import { shared } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';

// Initialize FingerprintJS for device fingerprinting
const fpPromise = FingerprintJS.load();

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  deviceFingerprint: string;
  kycStatus: KYCStatus;
  biometricEnabled: boolean;
}

const Register: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    deviceFingerprint: '',
    kycStatus: KYCStatus.PENDING,
    biometricEnabled: false
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [passwordStrength, setPasswordStrength] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Generate device fingerprint on component mount
  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const fp = await fpPromise;
        const result = await fp.get();
        setFormData(prev => ({ ...prev, deviceFingerprint: result.visitorId }));
      } catch (error) {
        console.error('Failed to generate device fingerprint:', error);
      }
    };
    generateFingerprint();
  }, []);

  // Check biometric availability
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          // Implementation would depend on react-native-biometrics library
          setFormData(prev => ({ ...prev, biometricEnabled: true }));
        } catch (error) {
          console.error('Biometric check failed:', error);
        }
      }
    };
    checkBiometricAvailability();
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    // Email validation
    const emailValidation = validateInput(formData.email, {
      pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
      errorMessages: { pattern: 'Please enter a valid email address' }
    });
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    // Password validation and strength check
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    } else {
      const strength = zxcvbn(formData.password);
      setPasswordStrength(strength.score * 25);
      if (strength.score < 3) {
        newErrors.password = 'Password is too weak. Please choose a stronger password.';
      }
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!/^[a-zA-Z\s]{2,50}$/.test(formData.firstName)) {
      newErrors.firstName = 'Please enter a valid first name';
    }
    if (!/^[a-zA-Z\s]{2,50}$/.test(formData.lastName)) {
      newErrors.lastName = 'Please enter a valid last name';
    }

    // Phone number validation
    const phoneValidation = validateInput(formData.phoneNumber, {
      pattern: /^\+?[1-9]\d{1,14}$/,
      errorMessages: { pattern: 'Please enter a valid phone number' }
    });
    if (!phoneValidation.isValid) {
      newErrors.phoneNumber = phoneValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleRegister = async () => {
    try {
      setIsLoading(true);

      if (!validateForm()) {
        return;
      }

      if (!formData.deviceFingerprint) {
        Alert.alert('Error', 'Device verification failed. Please try again.');
        return;
      }

      // Registration API call would go here
      // await dispatch(registerUser(formData));

      // Navigate to verification or KYC screen based on response
      navigation.navigate('Verification');
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Password strength indicator */}
        <View style={[styles.progressIndicator, { width: `${passwordStrength}%` }]} />

        <Input
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          type="email"
          label="Email Address"
          error={errors.email}
          testID="register-email-input"
        />

        <Input
          value={formData.password}
          onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
          type="password"
          label="Password"
          error={errors.password}
          secureTextEntry
          testID="register-password-input"
        />

        <Input
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
          type="password"
          label="Confirm Password"
          error={errors.confirmPassword}
          secureTextEntry
          testID="register-confirm-password-input"
        />

        <Input
          value={formData.firstName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
          type="text"
          label="First Name"
          error={errors.firstName}
          testID="register-firstname-input"
        />

        <Input
          value={formData.lastName}
          onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
          type="text"
          label="Last Name"
          error={errors.lastName}
          testID="register-lastname-input"
        />

        <Input
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          type="phone"
          label="Phone Number"
          error={errors.phoneNumber}
          testID="register-phone-input"
        />

        <View style={styles.footer}>
          <Button
            title="Register"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            variant="primary"
            size="large"
            fullWidth
            testID="register-submit-button"
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: shared.background,
  },
  form: {
    flex: 1,
    padding: SPACING.LG,
    gap: SPACING.MD,
  },
  progressIndicator: {
    height: 4,
    backgroundColor: shared.primary,
    marginBottom: SPACING.MD,
  },
  footer: {
    marginTop: SPACING.XL,
  },
});

export default Register;