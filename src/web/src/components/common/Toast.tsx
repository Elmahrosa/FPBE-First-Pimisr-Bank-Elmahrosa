import React, { useRef, useEffect, useCallback } from 'react';
import { Animated, View, Text, StyleSheet, Platform } from 'react-native'; // v0.71+
import type { Theme } from '../../styles/theme';

/**
 * Props interface for the Toast component
 */
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss?: () => void;
  position?: 'top' | 'bottom';
  accessibilityLabel?: string;
  testID?: string;
  customIcon?: React.ReactNode;
  onPress?: () => void;
}

/**
 * Style configuration for different toast types
 */
interface ToastStyleProps {
  success: {
    backgroundColor: string;
    textColor: string;
    icon: string;
    shadowColor: string;
  };
  error: {
    backgroundColor: string;
    textColor: string;
    icon: string;
    shadowColor: string;
  };
  warning: {
    backgroundColor: string;
    textColor: string;
    icon: string;
    shadowColor: string;
  };
  info: {
    backgroundColor: string;
    textColor: string;
    icon: string;
    shadowColor: string;
  };
}

/**
 * Custom hook for managing toast animation
 */
const useToastAnimation = (duration: number, onDismiss?: () => void) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const animate = useCallback(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        delay: duration - 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && onDismiss) {
        onDismiss();
      }
    });
  }, [opacity, duration, onDismiss]);

  useEffect(() => {
    animate();
    return () => {
      opacity.stopAnimation();
    };
  }, [animate]);

  return opacity;
};

/**
 * Toast component for displaying temporary notification messages
 */
const Toast: React.FC<ToastProps> = React.memo(({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
  position = 'top',
  accessibilityLabel,
  testID,
  customIcon,
  onPress,
}) => {
  const opacity = useToastAnimation(duration, onDismiss);

  const getToastStyle = (theme: Theme, toastType: ToastProps['type']) => {
    const toastStyles: ToastStyleProps = {
      success: {
        backgroundColor: theme.colors.semantic.feedback.success,
        textColor: theme.colors.text.primary,
        icon: '✓',
        shadowColor: theme.colors.semantic.feedback.success,
      },
      error: {
        backgroundColor: theme.colors.semantic.feedback.error,
        textColor: theme.colors.text.primary,
        icon: '✕',
        shadowColor: theme.colors.semantic.feedback.error,
      },
      warning: {
        backgroundColor: theme.colors.semantic.feedback.warning,
        textColor: theme.colors.text.primary,
        icon: '!',
        shadowColor: theme.colors.semantic.feedback.warning,
      },
      info: {
        backgroundColor: theme.colors.semantic.feedback.info,
        textColor: theme.colors.text.primary,
        icon: 'i',
        shadowColor: theme.colors.semantic.feedback.info,
      },
    };

    return toastStyles[toastType];
  };

  const renderIcon = (theme: Theme, toastType: ToastProps['type']) => {
    if (customIcon) return customIcon;
    const style = getToastStyle(theme, toastType);
    return (
      <Text
        style={[styles.icon, { color: style.textColor }]}
        accessibilityRole="image"
        accessibilityLabel={`${toastType} icon`}
      >
        {style.icon}
      </Text>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        position === 'bottom' ? { bottom: 0 } : { top: 0 },
        { opacity },
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel || `${type} notification: ${message}`}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.toast,
          Platform.select({
            ios: {
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            },
            android: {
              elevation: 6,
            },
          }),
        ]}
        onTouchEnd={onPress}
      >
        {renderIcon}
        <Text
          style={[
            styles.message,
            {
              fontFamily: Platform.select({
                ios: 'SF Pro Text',
                android: 'Roboto',
                default: 'System',
              }),
            },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: 16,
    zIndex: 1000,
    accessibilityRole: 'alert',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: 'white',
  },
  message: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    fontSize: 16,
    lineHeight: 20,
  },
  icon: {
    width: 24,
    height: 24,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
  },
});

Toast.displayName = 'Toast';

export default Toast;