/**
 * @fileoverview Enterprise-grade Modal component for FPBE mobile banking application
 * Implements WCAG 2.1 compliant accessibility features with animations and responsive design
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useRef, memo } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
  Platform,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native'; // v0.71+
import { useTheme } from '@react-navigation/native'; // v6.0+
import { useFocusTrap } from 'focus-trap-react'; // v10.0.0
import Button from './Button';
import { Theme } from '../../styles/theme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  animationType?: 'slide' | 'fade';
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
  footerContent?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  initialFocusRef?: React.RefObject<any>;
  returnFocusRef?: React.RefObject<any>;
  onAnimationComplete?: () => void;
}

const Modal = memo<ModalProps>(({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdropPress = true,
  animationType = 'slide',
  headerStyle,
  contentStyle,
  footerStyle,
  footerContent,
  testID,
  accessibilityLabel,
  accessibilityHint,
  initialFocusRef,
  returnFocusRef,
  onAnimationComplete,
}) => {
  const theme = useTheme() as Theme;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const modalRef = useRef<View>(null);

  // Focus trap setup
  const focusTrapOptions = {
    initialFocus: initialFocusRef,
    returnFocus: returnFocusRef,
    escapeDeactivates: true,
    allowOutsideClick: true,
  };
  const { activate, deactivate } = useFocusTrap(focusTrapOptions);

  // Handle Android back button
  useEffect(() => {
    const handleBackPress = () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
  }, [visible, onClose]);

  // Animation sequences
  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
    ]).start(() => onAnimationComplete?.());
  }, [fadeAnim, slideAnim, theme.animation.duration.normal, onAnimationComplete]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: theme.animation.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, theme.animation.duration.normal]);

  // Visibility effect
  useEffect(() => {
    if (visible) {
      activate();
      animateIn();
    } else {
      deactivate();
      animateOut();
    }
  }, [visible, activate, deactivate, animateIn, animateOut]);

  // Calculate modal dimensions
  const getModalWidth = () => {
    const { width } = Dimensions.get('window');
    const maxWidths = {
      small: Math.min(400, width * 0.8),
      medium: Math.min(600, width * 0.9),
      large: Math.min(800, width * 0.95),
    };
    return maxWidths[size];
  };

  const modalStyles = [
    styles.modalContent,
    {
      width: getModalWidth(),
      backgroundColor: theme.colors.background.primary,
      borderRadius: theme.dimensions.components.MODAL_WIDTH.SMALL,
    },
    animationType === 'slide' && {
      transform: [{ translateY: slideAnim }],
    },
  ];

  return (
    <RNModal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      animationType="none"
      testID={testID}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim },
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          onPress={closeOnBackdropPress ? onClose : undefined}
          activeOpacity={1}
        >
          <Animated.View
            ref={modalRef}
            style={modalStyles}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel || `${title} modal`}
            accessibilityHint={accessibilityHint}
          >
            <View style={[styles.header, headerStyle]}>
              <Text
                style={[styles.title, { color: theme.colors.text.primary }]}
                accessibilityRole="header"
              >
                {title}
              </Text>
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="Close modal"
                  accessibilityRole="button"
                >
                  <Text style={{ color: theme.colors.text.secondary }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={[styles.content, contentStyle]}>
              {children}
            </View>

            {(footerContent || onClose) && (
              <View style={[styles.footer, footerStyle]}>
                {footerContent || (
                  <Button
                    title="Close"
                    onPress={onClose}
                    variant="secondary"
                    size="medium"
                  />
                )}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </RNModal>
  );
});

Modal.displayName = 'Modal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  content: {
    padding: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
});

export default Modal;