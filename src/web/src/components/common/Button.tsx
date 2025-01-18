/**
 * @fileoverview Enterprise-grade Button component for FPBE mobile banking application
 * Implements design system specifications with comprehensive accessibility support
 * @version 1.0.0
 */

import React from 'react'; // v18.0+
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // v6.0+
import { Theme } from '../../styles/theme';
import { shared } from '../../styles/colors';

/**
 * Props interface for the Button component
 */
interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
  hapticFeedback?: boolean;
  pressableDelay?: number;
}

/**
 * Memoized Button component with platform-specific optimizations
 */
export const Button = React.memo<ButtonProps>(({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  testID,
  hapticFeedback = true,
  pressableDelay = 0,
}) => {
  const theme = useTheme() as Theme;

  // Get variant-specific styles
  const getVariantStyles = (): ViewStyle => {
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: shared.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: shared.secondary,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: shared.primary,
      },
      error: {
        backgroundColor: shared.error,
        borderWidth: 0,
      },
      success: {
        backgroundColor: shared.success,
        borderWidth: 0,
      },
    };

    return variantStyles[variant];
  };

  // Get size-specific styles
  const getSizeStyles = (): ViewStyle => {
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        height: 32,
        paddingHorizontal: theme.spacing.SM,
        minWidth: 80,
      },
      medium: {
        height: 40,
        paddingHorizontal: theme.spacing.MD,
        minWidth: 120,
      },
      large: {
        height: 48,
        paddingHorizontal: theme.spacing.LG,
        minWidth: 160,
      },
    };

    return sizeStyles[size];
  };

  // Get text color based on variant
  const getTextColor = (): string => {
    if (disabled) return theme.colors.text.tertiary;
    if (variant === 'outline') return shared.primary;
    return theme.colors.background.primary;
  };

  // Get text size based on button size
  const getTextSize = (): number => {
    const textSizes = {
      small: theme.typography.fontSize.sm,
      medium: theme.typography.fontSize.md,
      large: theme.typography.fontSize.lg,
    };
    return textSizes[size];
  };

  // Handle platform-specific press feedback
  const handlePress = () => {
    if (disabled || loading) return;

    if (hapticFeedback && Platform.OS === 'ios') {
      // Implement haptic feedback for iOS
      // Note: Requires react-native-haptic-feedback library
    }

    onPress();
  };

  const buttonStyles = [
    styles.container,
    getVariantStyles(),
    getSizeStyles(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    {
      color: getTextColor(),
      fontSize: getTextSize(),
      fontFamily: theme.typography.platform[Platform.OS].fontFamily,
      fontWeight: theme.typography.fontWeight.medium,
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={0.7}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      testID={testID}
      delayPressIn={pressableDelay}
    >
      {loading ? (
        <ActivityIndicator
          color={getTextColor()}
          size={size === 'small' ? 'small' : 'large'}
        />
      ) : (
        <Text style={textStyles} numberOfLines={1}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
});

Button.displayName = 'Button';

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
    marginHorizontal: 8,
  },
});

export default Button;