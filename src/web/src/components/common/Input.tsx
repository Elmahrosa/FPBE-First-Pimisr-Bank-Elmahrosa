/**
 * @fileoverview Reusable input component for FPBE mobile banking application
 * Implements secure input handling with validation, accessibility, and theming
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TextInput, View, Text, StyleSheet, Platform, AccessibilityInfo } from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // v6.0+
import debounce from 'lodash/debounce'; // v4.17+
import { Theme } from '../../styles/theme';
import { validateInput } from '../../utils/validation.utils';
import { SPACING } from '../../styles/spacing';

/**
 * Props interface for the Input component with enhanced validation and security features
 */
interface InputProps {
  value: string;
  onChangeText: (text: string, isValid: boolean) => void;
  type?: 'text' | 'email' | 'password' | 'pin' | 'phone';
  label?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  allowCopy?: boolean;
  customValidation?: (value: string) => { isValid: boolean; error?: string };
  placeholder?: string;
  maxLength?: number;
  testID?: string;
}

/**
 * Enhanced input component with comprehensive validation and security features
 */
const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  type = 'text',
  label,
  error,
  disabled = false,
  secureTextEntry = false,
  allowCopy = true,
  customValidation,
  placeholder,
  maxLength,
  testID,
}) => {
  const theme = useTheme() as Theme;
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(error);

  /**
   * Memoized keyboard type based on input type
   */
  const keyboardType = useMemo(() => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'pin':
        return 'numeric';
      default:
        return 'default';
    }
  }, [type]);

  /**
   * Debounced validation handler with security checks
   */
  const validateInputDebounced = useCallback(
    debounce((text: string) => {
      let validationResult = { isValid: true, error: undefined };

      // Apply type-specific validation
      if (type === 'email') {
        validationResult = validateInput(text, {
          pattern: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
          errorMessages: { pattern: 'Please enter a valid email address' }
        });
      } else if (type === 'phone') {
        validationResult = validateInput(text, {
          pattern: /^\+?[1-9]\d{1,14}$/,
          errorMessages: { pattern: 'Please enter a valid phone number' }
        });
      } else if (type === 'pin') {
        validationResult = validateInput(text, {
          pattern: /^\d{6}$/,
          errorMessages: { pattern: 'PIN must be exactly 6 digits' }
        });
      }

      // Apply custom validation if provided
      if (customValidation) {
        const customResult = customValidation(text);
        if (!customResult.isValid) {
          validationResult = customResult;
        }
      }

      setLocalError(validationResult.error);
      onChangeText(text, validationResult.isValid);
    }, 300),
    [type, customValidation, onChangeText]
  );

  /**
   * Handle accessibility announcements for errors
   */
  useEffect(() => {
    if (localError) {
      AccessibilityInfo.announceForAccessibility(localError);
    }
  }, [localError]);

  /**
   * Styles based on input state
   */
  const inputStyles = [
    styles.input,
    isFocused && styles.inputFocused,
    localError && styles.inputError,
    disabled && styles.inputDisabled,
  ];

  return (
    <View style={styles.container} testID={testID}>
      {label && (
        <Text
          style={[styles.label, disabled && styles.inputDisabled]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      
      <TextInput
        value={value}
        onChangeText={validateInputDebounced}
        style={inputStyles}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        editable={!disabled}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        maxLength={maxLength}
        textContentType={type === 'password' ? 'oneTimeCode' : undefined}
        autoCapitalize={type === 'email' ? 'none' : 'sentences'}
        autoCorrect={false}
        autoComplete={type === 'password' ? 'off' : undefined}
        contextMenuHidden={!allowCopy}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        accessible={true}
        accessibilityLabel={label}
        accessibilityHint={placeholder}
        accessibilityState={{
          disabled,
          invalid: !!localError,
        }}
      />

      {localError && (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLive="polite"
        >
          {localError}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.XS,
    width: '100%',
  },
  label: {
    marginBottom: SPACING.XXS,
    color: theme => theme.colors.text.primary,
    fontSize: theme => theme.typography.fontSize.sm,
    fontFamily: theme => theme.typography.fontFamily.regular,
  },
  input: {
    height: 48,
    paddingHorizontal: SPACING.SM,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: theme => theme.typography.fontSize.md,
    color: theme => theme.colors.text.primary,
    backgroundColor: theme => theme.colors.background.surface,
    borderColor: theme => theme.colors.border.default,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputFocused: {
    borderColor: theme => theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme => theme.colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  inputError: {
    borderColor: theme => theme.colors.error,
  },
  inputDisabled: {
    backgroundColor: theme => theme.colors.background.disabled,
    opacity: 0.7,
  },
  error: {
    marginTop: SPACING.XXS,
    color: theme => theme.colors.error,
    fontSize: theme => theme.typography.fontSize.sm,
    fontFamily: theme => theme.typography.fontFamily.regular,
  },
});

export default Input;