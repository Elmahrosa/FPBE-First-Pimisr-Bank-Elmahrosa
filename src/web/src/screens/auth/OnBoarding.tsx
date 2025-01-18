/**
 * @fileoverview Enhanced onboarding screen component for FPBE mobile banking application
 * Implements accessible, performant, and secure onboarding flow with Pi Network integration
 * @version 2024.1
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, SafeAreaView, useWindowDimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useAnalytics } from '@analytics/react-native';

// Internal components
import OnboardingCarousel from '../../components/auth/OnboardingCarousel';
import Button from '../../components/common/Button';
import ErrorBoundary from '../../components/common/ErrorBoundary';

/**
 * Props interface for the Onboarding screen
 */
interface OnboardingScreenProps {
  navigation: any;
  isNewUser?: boolean;
  initialSlide?: number;
  onComplete?: (success: boolean) => void;
}

/**
 * Enhanced onboarding screen component with accessibility and analytics
 */
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
  isNewUser = true,
  initialSlide = 0,
  onComplete
}) => {
  // Hooks initialization
  const { theme } = useTheme();
  const analytics = useAnalytics();
  const { width: screenWidth } = useWindowDimensions();
  const [currentSlide, setCurrentSlide] = useState(initialSlide);

  // Track screen view
  React.useEffect(() => {
    analytics.track('Onboarding_Screen_View', {
      isNewUser,
      initialSlide,
      screenWidth
    });
  }, []);

  // Memoized carousel content
  const carouselContent = useMemo(() => ({
    slides: [
      {
        title: 'Welcome to FPBE Banking',
        description: 'Experience the future of banking with traditional services and Pi Network integration',
        image: 'onboarding1'
      },
      {
        title: 'Secure Transactions',
        description: 'Manage your fiat and Pi cryptocurrency transactions with bank-grade security',
        image: 'onboarding2'
      },
      {
        title: 'Mine Pi Network',
        description: 'Earn Pi cryptocurrency while managing your traditional banking needs',
        image: 'onboarding3'
      }
    ]
  }), []);

  // Handle slide changes
  const handleSlideChange = useCallback((index: number) => {
    setCurrentSlide(index);
    analytics.track('Onboarding_Slide_Change', {
      slideIndex: index,
      slideTitle: carouselContent.slides[index].title
    });
  }, [carouselContent.slides]);

  // Handle onboarding completion
  const handleComplete = useCallback(() => {
    analytics.track('Onboarding_Complete', {
      totalSlides: carouselContent.slides.length,
      timeSpent: Date.now() - analytics.sessionStart
    });
    onComplete?.(true);
    navigation.navigate('Login');
  }, [navigation, onComplete]);

  // Handle skip onboarding
  const handleSkip = useCallback(() => {
    analytics.track('Onboarding_Skipped', {
      currentSlide,
      totalSlides: carouselContent.slides.length
    });
    onComplete?.(false);
    navigation.navigate('Login');
  }, [currentSlide, navigation, onComplete]);

  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <OnboardingCarousel
          onSlideChange={handleSlideChange}
          initialSlide={initialSlide}
          autoPlay={false}
        />
        
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            variant="primary"
            size="large"
            fullWidth
            onPress={handleComplete}
            accessibilityLabel="Complete onboarding and proceed to login"
            testID="onboarding-complete-button"
          />
          
          {isNewUser && (
            <Button
              title="Skip Introduction"
              variant="outline"
              size="medium"
              fullWidth
              onPress={handleSkip}
              style={styles.skipButton}
              accessibilityLabel="Skip onboarding and go to login"
              testID="onboarding-skip-button"
            />
          )}
        </View>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginTop: 'auto'
  },
  skipButton: {
    marginTop: 12
  }
});

export default OnboardingScreen;