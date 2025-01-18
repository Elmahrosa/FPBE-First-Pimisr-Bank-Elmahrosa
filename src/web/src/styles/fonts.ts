import { Platform } from 'react-native'; // v0.71+

/**
 * Platform-specific font families for primary and secondary text
 * iOS: SF Pro Display/Text
 * Android: Roboto
 */
export const fontFamilies = {
  primary: Platform.select({
    ios: 'SF Pro Display',
    android: 'Roboto',
    default: 'System' // Fallback for other platforms
  }),
  secondary: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto',
    default: 'System' // Fallback for other platforms
  })
};

/**
 * Systematic scale of font sizes from 12px to 32px
 * Following 4px increments for smaller sizes and larger increments for headings
 * Compliant with WCAG 2.1 AA readability guidelines
 */
export const fontSizes = {
  xs: 12, // Small labels, captions
  sm: 14, // Secondary text, supporting content
  md: 16, // Primary body text
  lg: 20, // Subheadings, emphasized text
  xl: 24, // Section headings
  xxl: 32  // Main headings
};

/**
 * Cross-platform font weights using numeric values
 * Ensures consistent weight rendering across platforms
 */
export const fontWeights = {
  regular: '400', // Normal text
  medium: '500', // Semi-bold text
  bold: '700'    // Headings and emphasis
};

/**
 * Line height multipliers for optimal readability
 * Based on WCAG 2.1 AA guidelines for text spacing
 */
export const lineHeights = {
  tight: 1.25,   // Headings and compact text
  normal: 1.5,   // Body text (meets WCAG requirements)
  relaxed: 1.75  // Enhanced readability for dense content
};

/**
 * Returns the appropriate platform-specific font family with weight consideration
 * @param weight - The desired font weight ('regular' | 'medium' | 'bold')
 * @returns Platform-specific font family name with appropriate weight
 */
export const getFontFamily = (weight: keyof typeof fontWeights): string => {
  if (Platform.OS === 'ios') {
    // iOS uses weight-specific font names
    switch (weight) {
      case 'bold':
        return 'SF Pro Display-Bold';
      case 'medium':
        return 'SF Pro Display-Medium';
      default:
        return 'SF Pro Display-Regular';
    }
  } else {
    // Android and other platforms use the base font name
    // Weight is handled through the fontWeight style property
    return fontFamilies.primary as string;
  }
};

/**
 * Typography scale object for consistent text styling
 * Combines font sizes, weights, and line heights
 */
export const typography = {
  h1: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight
  },
  h2: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight
  },
  h3: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.tight
  },
  body1: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal
  },
  body2: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal
  },
  caption: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal
  }
};