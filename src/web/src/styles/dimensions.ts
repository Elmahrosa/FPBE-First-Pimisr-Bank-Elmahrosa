// react-native v0.71+
import { Dimensions } from 'react-native';

// Interfaces for type safety
export interface IScreenBreakpoints {
  MOBILE_SMALL: number;
  MOBILE_LARGE: number;
  TABLET: number;
  DESKTOP: number;
}

export interface IComponentDimensions {
  BUTTON_HEIGHT: {
    SMALL: number;
    MEDIUM: number;
    LARGE: number;
  };
  INPUT_HEIGHT: number;
  CARD_HEIGHT: number;
  HEADER_HEIGHT: number;
  BOTTOM_TAB_HEIGHT: number;
  MODAL_WIDTH: {
    SMALL: string;
    MEDIUM: string;
    LARGE: string;
  };
  ICON_SIZE: {
    SMALL: number;
    MEDIUM: number;
    LARGE: number;
  };
  TOUCH_TARGET: {
    MIN: number;
    RECOMMENDED: number;
  };
}

// Screen breakpoints following standard device sizes
export const SCREEN_BREAKPOINTS: IScreenBreakpoints = {
  MOBILE_SMALL: 320, // Small mobile devices
  MOBILE_LARGE: 375, // Large mobile devices
  TABLET: 768, // Tablets and small laptops
  DESKTOP: 1024, // Desktop and large screens
};

// Component dimensions following accessibility guidelines and UI consistency
export const COMPONENT_DIMENSIONS: IComponentDimensions = {
  BUTTON_HEIGHT: {
    SMALL: 32, // Small action buttons
    MEDIUM: 44, // Standard buttons (meets WCAG touch target size)
    LARGE: 56, // Large/prominent buttons
  },
  INPUT_HEIGHT: 48, // Standard input height (meets WCAG touch target size)
  CARD_HEIGHT: 200, // Standard card component height
  HEADER_HEIGHT: 56, // App header height
  BOTTOM_TAB_HEIGHT: 64, // Bottom navigation height
  MODAL_WIDTH: {
    SMALL: '80%', // Small modal dialogs
    MEDIUM: '90%', // Medium modal dialogs
    LARGE: '95%', // Large modal dialogs
  },
  ICON_SIZE: {
    SMALL: 16, // Small icons
    MEDIUM: 24, // Standard icons
    LARGE: 32, // Large icons
  },
  TOUCH_TARGET: {
    MIN: 44, // Minimum touch target size (WCAG 2.1 compliance)
    RECOMMENDED: 48, // Recommended touch target size for better accessibility
  },
};

// Current device screen dimensions
export const SCREEN_DIMENSIONS = {
  WIDTH: Dimensions.get('window').width,
  HEIGHT: Dimensions.get('window').height,
};

/**
 * Checks if the current screen width is small mobile size
 * @returns {boolean} True if screen width is less than or equal to MOBILE_LARGE breakpoint
 */
export const isSmallScreen = (): boolean => {
  return SCREEN_DIMENSIONS.WIDTH <= SCREEN_BREAKPOINTS.MOBILE_LARGE;
};

/**
 * Checks if the current screen width is tablet size or larger
 * @returns {boolean} True if screen width is greater than or equal to TABLET breakpoint
 */
export const isTabletOrLarger = (): boolean => {
  return SCREEN_DIMENSIONS.WIDTH >= SCREEN_BREAKPOINTS.TABLET;
};