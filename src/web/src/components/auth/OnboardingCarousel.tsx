/**
 * @fileoverview Enhanced onboarding carousel component for FPBE mobile banking application
 * Implements accessible, performant, and responsive carousel with gesture support
 * @version 2024.1
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  AccessibilityInfo,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { haptics } from 'react-native-haptic-feedback';
import analytics from '@segment/analytics-react-native';
import { useTheme } from '../../hooks/useTheme';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Slide content with accessibility descriptions
const SLIDES = [
  {
    image: 'onboarding1',
    title: 'Welcome to FPBE Banking',
    description: 'Experience the future of banking with traditional services and Pi Network integration',
    accessibilityLabel: 'Welcome slide showing FPBE Banking app interface'
  },
  {
    image: 'onboarding2',
    title: 'Secure Transactions',
    description: 'Manage your fiat and Pi cryptocurrency transactions with bank-grade security',
    accessibilityLabel: 'Slide showing secure transaction features'
  },
  {
    image: 'onboarding3',
    title: 'Mine Pi Network',
    description: 'Earn Pi cryptocurrency while managing your traditional banking needs',
    accessibilityLabel: 'Slide demonstrating Pi Network mining feature'
  }
];

interface OnboardingCarouselProps {
  onSlideChange?: (index: number) => void;
  initialSlide?: number;
  autoPlay?: boolean;
}

/**
 * Custom hook for handling carousel gestures and animations
 */
const useCarouselGestures = (
  slideWidth: number,
  currentIndex: number,
  totalSlides: number
) => {
  const position = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        return Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        position.stopAnimation();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position }],
        { useNativeDriver: true }
      ),
      onPanResponderRelease: (_, { dx, vx }) => {
        const swipeThreshold = slideWidth * 0.3;
        const velocity = Math.abs(vx);
        
        if (Math.abs(dx) > swipeThreshold || velocity > 0.3) {
          const direction = dx > 0 ? -1 : 1;
          const newIndex = Math.max(0, Math.min(totalSlides - 1, currentIndex + direction));
          
          if (newIndex !== currentIndex) {
            haptics.trigger('impactLight');
          }
          
          Animated.spring(position, {
            toValue: 0,
            velocity,
            tension: 50,
            friction: 7,
            useNativeDriver: true
          }).start();
        } else {
          Animated.spring(position, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  return { position, panResponder };
};

/**
 * Custom hook for managing carousel auto-play functionality
 */
const useCarouselAutoPlay = (
  enabled: boolean,
  interval: number,
  totalSlides: number
) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (enabled) {
      timeoutRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, interval);
    }

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [enabled, interval, totalSlides]);

  return currentSlide;
};

/**
 * Enhanced onboarding carousel component with accessibility and performance optimizations
 */
const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  onSlideChange,
  initialSlide = 0,
  autoPlay = false
}) => {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialSlide);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Initialize gesture handling
  const { position, panResponder } = useCarouselGestures(
    windowWidth,
    currentIndex,
    SLIDES.length
  );

  // Initialize auto-play if enabled
  const autoPlayIndex = useCarouselAutoPlay(autoPlay, 5000, SLIDES.length);

  // Check screen reader status
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle slide changes
  const handleSlideChange = useCallback((index: number) => {
    setCurrentIndex(index);
    onSlideChange?.(index);
    
    // Track analytics
    analytics.track('Onboarding_Slide_View', {
      slideIndex: index,
      slideTitle: SLIDES[index].title
    });
  }, [onSlideChange]);

  // Update current index when auto-playing
  useEffect(() => {
    if (autoPlay) {
      handleSlideChange(autoPlayIndex);
    }
  }, [autoPlay, autoPlayIndex, handleSlideChange]);

  const renderPagination = () => (
    <View style={styles.pagination} accessibilityRole="tablist">
      {SLIDES.map((_, index) => (
        <View
          key={`dot-${index}`}
          style={[
            styles.paginationDot,
            {
              backgroundColor: index === currentIndex
                ? theme.colors.semantic.action.primary
                : theme.colors.semantic.action.disabled
            }
          ]}
          accessibilityRole="tab"
          accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}
          accessibilityState={{ selected: index === currentIndex }}
        />
      ))}
    </View>
  );

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.slideContainer,
            {
              transform: [{ translateX: position }]
            }
          ]}
          {...(isScreenReaderEnabled ? {} : panResponder.panHandlers)}
        >
          {SLIDES.map((slide, index) => (
            <View
              key={`slide-${index}`}
              style={[styles.slide, { width: windowWidth }]}
              accessibilityRole="region"
              accessibilityLabel={slide.accessibilityLabel}
            >
              <Image
                source={{ uri: slide.image }}
                style={styles.image}
                accessibilityRole="image"
                accessibilityLabel={`${slide.title} illustration`}
              />
              <Text
                style={[styles.title, { color: theme.colors.text.primary }]}
                accessibilityRole="header"
              >
                {slide.title}
              </Text>
              <Text
                style={[styles.description, { color: theme.colors.text.secondary }]}
                accessibilityRole="text"
              >
                {slide.description}
              </Text>
            </View>
          ))}
        </Animated.View>
        {renderPagination()}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden'
  },
  slideContainer: {
    flexDirection: 'row'
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System'
    })
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'Roboto',
      default: 'System'
    })
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4
  }
});

export default OnboardingCarousel;