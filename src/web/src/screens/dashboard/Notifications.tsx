/**
 * @fileoverview Notifications screen component for FPBE mobile banking application
 * Implements real-time notification management with offline support and accessibility
 * @version 2024.1
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';
import { useTheme } from '../../hooks/useTheme';

// Notification item props interface
interface NotificationItemProps {
  notification: {
    id: string;
    type: 'TRANSACTION' | 'MINING' | 'SYSTEM' | 'BALANCE' | 'CARD' | 'EXCHANGE';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    data?: any;
  };
  onPress: (notification: any) => void;
  theme: any;
}

/**
 * Individual notification item component with accessibility support
 */
const NotificationItem = memo(({ notification, onPress, theme }: NotificationItemProps) => {
  const formattedTime = new Date(notification.timestamp).toLocaleString();
  const isHighPriority = notification.priority === 'HIGH';

  const accessibilityLabel = `${notification.read ? 'Read' : 'Unread'} ${notification.type.toLowerCase()} notification: ${notification.title}. ${notification.message}. Received ${formattedTime}`;

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { borderBottomColor: theme.colors.border },
        notification.read && styles.readNotification
      ]}
      onPress={() => onPress(notification)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: !notification.read }}
      accessibilityHint="Double tap to mark as read"
      accessible={true}
    >
      {!notification.read && (
        <View 
          style={[
            styles.unreadIndicator, 
            { backgroundColor: isHighPriority ? theme.colors.semantic.feedback.error : theme.colors.primary }
          ]} 
        />
      )}
      <View style={styles.contentContainer}>
        <Text 
          style={[
            styles.title,
            { color: theme.colors.text.primary }
          ]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>
        <Text 
          style={[
            styles.message,
            { color: theme.colors.text.secondary }
          ]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
        <Text 
          style={[
            styles.timestamp,
            { color: theme.colors.text.tertiary }
          ]}
        >
          {formattedTime}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

NotificationItem.displayName = 'NotificationItem';

/**
 * Main notifications screen component with real-time updates
 */
const Notifications: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    loadMore,
    refreshNotifications,
    error: notificationError
  } = useNotifications();

  const { theme } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Handle real-time updates
  useEffect(() => {
    if (unreadCount > 0) {
      AccessibilityInfo.announceForAccessibility(
        `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
      );
    }
  }, [unreadCount]);

  // Handle notification press
  const handleNotificationPress = useCallback(async (notification: any) => {
    try {
      if (!notification.read) {
        await markAsRead(notification.id);
        setToastMessage('Notification marked as read');
      }
    } catch (error) {
      setToastMessage('Failed to mark notification as read');
    }
  }, [markAsRead]);

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } catch (error) {
      setToastMessage('Failed to refresh notifications');
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications]);

  // Handle infinite scroll
  const handleEndReached = useCallback(() => {
    loadMore();
  }, [loadMore]);

  // Render empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text 
        style={[styles.emptyText, { color: theme.colors.text.secondary }]}
        accessibilityRole="text"
      >
        No notifications yet
      </Text>
    </View>
  ), [theme]);

  // Render error state
  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <Text 
        style={[styles.errorText, { color: theme.colors.semantic.feedback.error }]}
        accessibilityRole="alert"
      >
        {notificationError}
      </Text>
    </View>
  ), [notificationError, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {notificationError ? (
        renderError()
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={handleNotificationPress}
              theme={theme}
            />
          )}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              accessibilityLabel="Pull to refresh notifications"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={!notifications.length && styles.emptyList}
          accessibilityRole="list"
          accessibilityLabel="Notifications list"
        />
      )}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="info"
          duration={3000}
          onDismiss={() => setToastMessage(null)}
          position="bottom"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readNotification: {
    opacity: 0.7,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    ...Platform.select({
      ios: { fontFamily: 'SF Pro Display' },
      android: { fontFamily: 'Roboto' },
    }),
  },
  message: {
    fontSize: 14,
    marginBottom: 4,
    ...Platform.select({
      ios: { fontFamily: 'SF Pro Text' },
      android: { fontFamily: 'Roboto' },
    }),
  },
  timestamp: {
    fontSize: 12,
    ...Platform.select({
      ios: { fontFamily: 'SF Pro Text' },
      android: { fontFamily: 'Roboto' },
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyList: {
    flex: 1,
  },
});

export default memo(Notifications);