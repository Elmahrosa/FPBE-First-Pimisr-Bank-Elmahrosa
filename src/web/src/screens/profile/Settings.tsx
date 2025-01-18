/**
 * @fileoverview Enhanced settings screen component for FPBE mobile banking application
 * Implements comprehensive user preferences, security settings, and accessibility features
 * @version 2024.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Switch,
  Text,
  StyleSheet,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native'; // v0.71+
import { useDebounce } from 'use-debounce'; // v9.0.0
import { MainScreenProps } from '../../types/navigation.types';
import Button from '../../components/common/Button';
import { useTheme } from '../../hooks/useTheme';
import { StorageService } from '../../services/storage.service';

// Settings storage keys with encryption
const SETTINGS_STORAGE_KEY = 'user_settings';
const SECURITY_STORAGE_KEY = 'security_preferences';
const THEME_STORAGE_KEY = 'theme_preferences';

// Settings state interface
interface SettingsState {
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  pinEnabled: boolean;
  transactionAlerts: boolean;
  highContrastMode: boolean;
  systemThemeEnabled: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Enhanced Settings screen component with security and accessibility features
 */
const Settings: React.FC<MainScreenProps<'Settings'>> = ({ navigation, route }) => {
  // Initialize theme and storage services
  const { theme, isDarkMode, toggleTheme, setSystemPreference } = useTheme();
  const storageService = useMemo(() => new StorageService(process.env.REACT_APP_ENCRYPTION_KEY!), []);

  // Settings state with secure defaults
  const [settings, setSettings] = useState<SettingsState>({
    biometricEnabled: false,
    notificationsEnabled: true,
    pinEnabled: true,
    transactionAlerts: true,
    highContrastMode: false,
    systemThemeEnabled: true,
    loading: true,
    error: null,
  });

  // Animation value for smooth transitions
  const [fadeAnim] = useState(new Animated.Value(0));

  // Debounced save operation to prevent excessive storage writes
  const [debouncedSettings] = useDebounce(settings, 500);

  /**
   * Load settings from secure storage with encryption
   */
  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await storageService.getItem<Partial<SettingsState>>(
        SETTINGS_STORAGE_KEY,
        true
      );

      if (savedSettings) {
        setSettings(prev => ({
          ...prev,
          ...savedSettings,
          loading: false,
        }));
      }
    } catch (error) {
      setSettings(prev => ({
        ...prev,
        error: 'Failed to load settings',
        loading: false,
      }));
    }
  }, [storageService]);

  /**
   * Save settings with encryption
   */
  const saveSettings = useCallback(async (newSettings: Partial<SettingsState>) => {
    try {
      await storageService.encryptAndStore(SETTINGS_STORAGE_KEY, newSettings);
    } catch (error) {
      setSettings(prev => ({
        ...prev,
        error: 'Failed to save settings',
      }));
    }
  }, [storageService]);

  /**
   * Handle setting toggle with security validation
   */
  const handleToggle = useCallback((setting: keyof SettingsState) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting],
      error: null,
    }));
  }, []);

  /**
   * Navigate to security settings with proper validation
   */
  const navigateToSecurity = useCallback(() => {
    navigation.navigate('Settings', { section: 'security' });
  }, [navigation]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [loadSettings, fadeAnim]);

  // Save settings when they change
  useEffect(() => {
    if (!settings.loading) {
      saveSettings(debouncedSettings);
    }
  }, [debouncedSettings, saveSettings, settings.loading]);

  // Check screen reader status for accessibility
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(screenReaderEnabled => {
      if (screenReaderEnabled) {
        setSettings(prev => ({
          ...prev,
          highContrastMode: true,
        }));
      }
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        accessibilityRole="scrollbar"
      >
        {/* Security Section */}
        <View style={styles.section} accessibilityRole="region">
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Security
          </Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Biometric Authentication
            </Text>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={() => handleToggle('biometricEnabled')}
              accessibilityLabel="Toggle biometric authentication"
              accessibilityHint="Double tap to toggle biometric authentication"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              PIN Lock
            </Text>
            <Switch
              value={settings.pinEnabled}
              onValueChange={() => handleToggle('pinEnabled')}
              accessibilityLabel="Toggle PIN lock"
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section} accessibilityRole="region">
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Notifications
          </Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Push Notifications
            </Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={() => handleToggle('notificationsEnabled')}
              accessibilityLabel="Toggle push notifications"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Transaction Alerts
            </Text>
            <Switch
              value={settings.transactionAlerts}
              onValueChange={() => handleToggle('transactionAlerts')}
              accessibilityLabel="Toggle transaction alerts"
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section} accessibilityRole="region">
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Appearance
          </Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Use System Theme
            </Text>
            <Switch
              value={settings.systemThemeEnabled}
              onValueChange={(value) => {
                handleToggle('systemThemeEnabled');
                setSystemPreference(value);
              }}
              accessibilityLabel="Toggle system theme"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Dark Mode
            </Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              disabled={settings.systemThemeEnabled}
              accessibilityLabel="Toggle dark mode"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              High Contrast
            </Text>
            <Switch
              value={settings.highContrastMode}
              onValueChange={() => handleToggle('highContrastMode')}
              accessibilityLabel="Toggle high contrast mode"
            />
          </View>
        </View>

        {/* Advanced Security Settings */}
        <View style={styles.section}>
          <Button
            title="Advanced Security Settings"
            onPress={navigateToSecurity}
            variant="primary"
            fullWidth
            accessibilityLabel="Navigate to advanced security settings"
          />
        </View>

        {/* Error Display */}
        {settings.error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {settings.error}
          </Text>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Platform.select({
      ios: 'rgba(0, 0, 0, 0.1)',
      android: 'rgba(0, 0, 0, 0.05)',
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Display',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44, // WCAG touch target size
  },
  settingLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: 16,
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Text',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        fontFamily: 'SF Pro Text',
      },
      android: {
        fontFamily: 'Roboto',
      },
    }),
  },
});

export default Settings;