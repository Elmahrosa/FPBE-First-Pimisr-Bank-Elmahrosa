/**
 * @fileoverview Enhanced header component for FPBE mobile banking application
 * Implements secure navigation, real-time notifications, and accessibility features
 * @version 2024.1
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { useTheme } from 'native-base'; // v3.4.0
import { useNavigation } from '@react-navigation/native'; // v6.0.0
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import analytics from '../../services/analytics.service';

// Interface for component props with accessibility support
interface HeaderProps {
  title: string;
  showBack?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Enhanced header component with security features and accessibility support
 */
const Header = memo(({
  title,
  showBack = false,
  showNotifications = true,
  showProfile = true,
  accessibilityLabel,
  testID = 'header-component'
}: HeaderProps) => {
  // Hooks
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { user, validateSession, handleLogout } = useAuth();
  const { unreadCount, refreshNotifications } = useNotifications();
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Check screen reader status for accessibility
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(
      screenReaderEnabled => setIsScreenReaderEnabled(screenReaderEnabled)
    );
  }, []);

  // Subscribe to notification updates
  useEffect(() => {
    const unsubscribe = refreshNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  /**
   * Secure back navigation with session validation
   */
  const handleSecureBackPress = useCallback(async () => {
    try {
      const isValid = await validateSession();
      if (!isValid) {
        await handleLogout();
        return;
      }

      analytics.trackEvent('HEADER_BACK_PRESSED', {
        screen: navigation.getCurrentRoute()?.name
      });

      navigation.goBack();
    } catch (error) {
      console.error('Navigation error:', error);
      await handleLogout();
    }
  }, [navigation, validateSession, handleLogout]);

  /**
   * Secure notification navigation with validation
   */
  const handleSecureNotificationPress = useCallback(async () => {
    try {
      const isValid = await validateSession();
      if (!isValid) {
        await handleLogout();
        return;
      }

      analytics.trackEvent('NOTIFICATION_PRESSED', {
        unreadCount
      });

      navigation.navigate('Notifications');
    } catch (error) {
      console.error('Notification navigation error:', error);
      await handleLogout();
    }
  }, [navigation, unreadCount, validateSession, handleLogout]);

  /**
   * Secure profile navigation with validation
   */
  const handleSecureProfilePress = useCallback(async () => {
    try {
      const isValid = await validateSession();
      if (!isValid) {
        await handleLogout();
        return;
      }

      analytics.trackEvent('PROFILE_PRESSED', {
        userId: user?.id
      });

      navigation.navigate('Profile');
    } catch (error) {
      console.error('Profile navigation error:', error);
      await handleLogout();
    }
  }, [navigation, user, validateSession, handleLogout]);

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.primary[700] }]}
      testID={testID}
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel || `${title} header`}
    >
      {showBack && (
        <TouchableOpacity
          onPress={handleSecureBackPress}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Navigates to the previous screen"
          testID="header-back-button"
        >
          <Text style={[styles.backText, { color: colors.white }]}>←</Text>
        </TouchableOpacity>
      )}

      <Text 
        style={[styles.title, { color: colors.white }]}
        accessibilityRole="header"
        accessibilityLabel={title}
        numberOfLines={1}
        testID="header-title"
      >
        {title}
      </Text>

      <View style={styles.rightContainer}>
        {showNotifications && (
          <TouchableOpacity
            onPress={handleSecureNotificationPress}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={`Notifications, ${unreadCount} unread`}
            accessibilityHint="Opens notification center"
            testID="header-notifications-button"
          >
            <Text style={[styles.icon, { color: colors.white }]}>🔔</Text>
            {unreadCount > 0 && (
              <View 
                style={[styles.badge, { backgroundColor: colors.error[500] }]}
                accessibilityLabel={`${unreadCount} unread notifications`}
              >
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {showProfile && (
          <TouchableOpacity
            onPress={handleSecureProfilePress}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Profile settings"
            accessibilityHint="Opens user profile and settings"
            testID="header-profile-button"
          >
            <Text style={[styles.icon, { color: colors.white }]}>👤</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  backText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 16,
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Header;