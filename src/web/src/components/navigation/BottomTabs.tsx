/**
 * @fileoverview Bottom tab navigation component for FPBE mobile banking application
 * Implements accessible, performant navigation with platform-specific optimizations
 * @version 1.0.0
 */

import React, { useCallback, memo } from 'react'; // v18.0.0
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native'; // v0.71+
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'; // v6.0.0
import { useTheme } from '@react-navigation/native'; // v6.0.0
import { TAB_ROUTES } from '../../constants/navigation.constants';
import type { Theme } from '../../styles/theme';
import { MaterialIcons } from '@expo/vector-icons'; // v13.0.0

/**
 * Props interface for tab bar icons with accessibility support
 */
interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
  accessibilityLabel: string;
}

/**
 * Memoized tab icon component to prevent unnecessary re-renders
 */
const TabIcon = memo(({ routeName, iconProps }: { routeName: string; iconProps: TabBarIconProps }) => {
  const iconName = React.useMemo(() => {
    switch (routeName) {
      case TAB_ROUTES.DASHBOARD:
        return 'dashboard';
      case TAB_ROUTES.ACCOUNTS:
        return 'account-balance';
      case TAB_ROUTES.PI_WALLET:
        return 'account-balance-wallet';
      case TAB_ROUTES.CARDS:
        return 'credit-card';
      case TAB_ROUTES.SETTINGS:
        return 'settings';
      default:
        return 'error';
    }
  }, [routeName]);

  return (
    <MaterialIcons
      name={iconName}
      size={iconProps.size}
      color={iconProps.color}
      accessibilityLabel={iconProps.accessibilityLabel}
    />
  );
});

TabIcon.displayName = 'TabIcon';

/**
 * Bottom tabs navigation component with accessibility and performance optimizations
 */
const BottomTabs = memo(({ state, descriptors, navigation }: BottomTabBarProps) => {
  const theme = useTheme() as Theme;

  /**
   * Memoized tab press handler to prevent unnecessary re-renders
   */
  const handleTabPress = useCallback((routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }, [navigation]);

  /**
   * Memoized tab long press handler for accessibility
   */
  const handleTabLongPress = useCallback((routeName: string) => {
    navigation.emit({
      type: 'tabLongPress',
      target: routeName,
    });
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const label = options.tabBarLabel ?? options.title ?? route.name;
        const accessibilityLabel = options.tabBarAccessibilityLabel ?? `${label} tab`;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: isFocused }}
            testID={`tab-${route.name}`}
            onPress={() => handleTabPress(route.name, isFocused)}
            onLongPress={() => handleTabLongPress(route.name)}
            style={styles.tab}
          >
            <TabIcon
              routeName={route.name}
              iconProps={{
                focused: isFocused,
                color: isFocused ? theme.colors.semantic.navigation.active : theme.colors.semantic.navigation.inactive,
                size: 24,
                accessibilityLabel,
              }}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? theme.colors.semantic.navigation.active : theme.colors.semantic.navigation.inactive,
                  fontFamily: theme.typography.platform[Platform.OS].fontFamily,
                },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {isFocused && <View style={[styles.focusIndicator, { backgroundColor: theme.colors.semantic.navigation.active }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

BottomTabs.displayName = 'BottomTabs';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: Platform.select({ ios: 80, android: 60 }),
    borderTopWidth: 1,
    borderTopColor: Platform.select({ ios: 'rgba(0,0,0,0.1)', android: 'transparent' }),
    paddingBottom: Platform.select({ ios: 20, android: 0 }),
    elevation: Platform.select({ ios: 0, android: 8 }),
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 48,
    minWidth: 48,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  focusIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '50%',
    borderRadius: 1,
  },
});

export default BottomTabs;