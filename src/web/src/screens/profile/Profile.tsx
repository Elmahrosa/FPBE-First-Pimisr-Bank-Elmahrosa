/**
 * @fileoverview Profile screen component for FPBE mobile banking application
 * Implements secure profile management with biometric authentication and KYC integration
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useBiometrics from '@react-native-community/biometrics';

// Internal imports
import { User, UserProfile, KYCStatus } from '../../types/auth.types';
import Button from '../../components/common/Button';
import { MainNavigationProp } from '../../navigation/types';
import { shared, light, dark } from '../../styles/colors';
import { SPACING } from '../../styles/spacing';
import { fontSizes, fontWeights } from '../../styles/fonts';

interface ProfileScreenProps {
  navigation: MainNavigationProp;
}

interface ProfileState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const Profile: React.FC<ProfileScreenProps> = () => {
  const navigation = useNavigation<MainNavigationProp>();
  const dispatch = useDispatch();
  const biometrics = useBiometrics();

  // Redux selectors
  const user = useSelector((state: any) => state.auth.user as User);
  const theme = useSelector((state: any) => state.settings.theme);

  // Local state
  const [state, setState] = React.useState<ProfileState>({
    isLoading: false,
    isRefreshing: false,
    error: null,
  });

  // Memoized theme colors
  const colors = useMemo(() => {
    return theme === 'dark' ? dark : light;
  }, [theme]);

  // Handle KYC verification with biometric authentication
  const handleKYCVerification = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const biometricAuth = await biometrics.simplePrompt({
        promptMessage: 'Authenticate to proceed with KYC verification',
        cancelButtonText: 'Cancel',
      });

      if (biometricAuth.success) {
        navigation.navigate('Settings', {
          section: 'profile',
          screen: 'KYCVerification',
        });
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Biometric authentication failed' }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigation, biometrics]);

  // Handle profile editing with security checks
  const handleEditProfile = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const biometricAuth = await biometrics.simplePrompt({
        promptMessage: 'Authenticate to edit profile',
        cancelButtonText: 'Cancel',
      });

      if (biometricAuth.success) {
        navigation.navigate('Settings', {
          section: 'profile',
          screen: 'EditProfile',
        });
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Authentication failed' }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [navigation, biometrics]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true }));
      // Dispatch refresh profile action
      await dispatch({ type: 'REFRESH_PROFILE' });
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [dispatch]);

  // Render KYC status badge
  const renderKYCStatus = useMemo(() => {
    const statusColors = {
      [KYCStatus.PENDING]: shared.warning,
      [KYCStatus.IN_PROGRESS]: shared.secondary,
      [KYCStatus.VERIFIED]: shared.success,
      [KYCStatus.REJECTED]: shared.error,
    };

    return (
      <View 
        style={[
          styles.kycStatus,
          { backgroundColor: statusColors[user.kycStatus] }
        ]}
        accessibilityRole="text"
        accessibilityLabel={`KYC Status: ${user.kycStatus}`}
      >
        <Text style={styles.kycStatusText}>{user.kycStatus}</Text>
      </View>
    );
  }, [user.kycStatus]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
      refreshControl={
        <RefreshControl
          refreshing={state.isRefreshing}
          onRefresh={handleRefresh}
          tintColor={shared.primary}
        />
      }
      accessibilityRole="scrollview"
      accessibilityLabel="Profile Screen"
    >
      <View style={styles.header}>
        <Text 
          style={[styles.title, { color: colors.text.primary }]}
          accessibilityRole="header"
        >
          Profile
        </Text>
      </View>

      <View style={styles.section}>
        <Text 
          style={[styles.sectionTitle, { color: colors.text.secondary }]}
          accessibilityRole="header"
        >
          Personal Information
        </Text>
        <View style={styles.infoContainer}>
          <Text style={[styles.label, { color: colors.text.secondary }]}>Name</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>
            {`${user.profile.firstName} ${user.profile.lastName}`}
          </Text>
          
          <Text style={[styles.label, { color: colors.text.secondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>
            {user.email}
          </Text>
          
          <Text style={[styles.label, { color: colors.text.secondary }]}>Phone</Text>
          <Text style={[styles.value, { color: colors.text.primary }]}>
            {user.phoneNumber}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text 
          style={[styles.sectionTitle, { color: colors.text.secondary }]}
          accessibilityRole="header"
        >
          KYC Verification
        </Text>
        {renderKYCStatus}
        {user.kycStatus !== KYCStatus.VERIFIED && (
          <Button
            title="Complete KYC Verification"
            onPress={handleKYCVerification}
            variant="primary"
            loading={state.isLoading}
            disabled={state.isLoading}
            accessibilityLabel="Start KYC verification process"
            testID="kyc-verification-button"
          />
        )}
      </View>

      <View style={styles.section}>
        <Button
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="outline"
          loading={state.isLoading}
          disabled={state.isLoading}
          accessibilityLabel="Edit profile information"
          testID="edit-profile-button"
        />
      </View>

      {state.error && (
        <Text 
          style={[styles.error, { color: shared.error }]}
          accessibilityRole="alert"
        >
          {state.error}
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.MD,
  },
  header: {
    marginBottom: SPACING.LG,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: SPACING.SM,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    marginBottom: SPACING.SM,
  },
  infoContainer: {
    backgroundColor: Platform.select({
      ios: 'rgba(0,0,0,0.02)',
      android: 'rgba(0,0,0,0.05)',
    }),
    borderRadius: 8,
    padding: SPACING.MD,
  },
  label: {
    fontSize: fontSizes.sm,
    marginBottom: SPACING.XXS,
  },
  value: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    marginBottom: SPACING.SM,
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    padding: SPACING.SM,
    borderRadius: 8,
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
  kycStatusText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  error: {
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
});

export default Profile;