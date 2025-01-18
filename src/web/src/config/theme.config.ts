/**
 * @fileoverview Theme configuration for FPBE mobile banking application
 * Implements WCAG 2.1 AA compliant theming with automatic light/dark mode switching
 * Version: 1.0.0
 */

import { Appearance } from 'react-native'; // v0.71+
import { light, dark, shared } from '../styles/colors';
import { COMPONENT_DIMENSIONS, SCREEN_BREAKPOINTS } from '../styles/dimensions';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from '../styles/fonts';
import { SPACING } from '../styles/spacing';

// Theme version for cache invalidation
export const THEME_VERSION = '1.0.0';

// Maximum number of cached theme objects
export const THEME_CACHE_SIZE = 2;

/**
 * Complete theme interface defining the entire theme structure
 */
export interface Theme {
  readonly colors: {
    readonly background: typeof light.background;
    readonly text: typeof light.text;
    readonly border: string;
    readonly semantic: typeof shared;
  };
  readonly typography: {
    readonly families: typeof fontFamilies;
    readonly sizes: typeof fontSizes;
    readonly weights: typeof fontWeights;
    readonly lineHeights: typeof lineHeights;
  };
  readonly spacing: typeof SPACING;
  readonly dimensions: {
    readonly components: typeof COMPONENT_DIMENSIONS;
    readonly breakpoints: typeof SCREEN_BREAKPOINTS;
  };
  readonly accessibility: {
    readonly minimumTouchTarget: number;
    readonly focusRingColor: string;
    readonly focusRingWidth: number;
  };
}

// Theme cache for performance optimization
const themeCache = new Map<string, Theme>();

/**
 * Default theme configuration with light mode colors
 */
export const DEFAULT_THEME: Theme = {
  colors: {
    background: light.background,
    text: light.text,
    border: light.border,
    semantic: shared,
  },
  typography: {
    families: fontFamilies,
    sizes: fontSizes,
    weights: fontWeights,
    lineHeights: lineHeights,
  },
  spacing: SPACING,
  dimensions: {
    components: COMPONENT_DIMENSIONS,
    breakpoints: SCREEN_BREAKPOINTS,
  },
  accessibility: {
    minimumTouchTarget: COMPONENT_DIMENSIONS.TOUCH_TARGET.MIN,
    focusRingColor: shared.primary,
    focusRingWidth: 2,
  },
};

/**
 * Returns the complete theme object based on current color scheme
 * Implements caching for performance optimization
 * 
 * @param colorScheme - 'light' | 'dark' color scheme
 * @param cache - Whether to use theme caching (default: true)
 * @returns Complete theme object with all necessary styling properties
 */
export const getTheme = (
  colorScheme: string = Appearance.getColorScheme() || 'light',
  cache: boolean = true
): Theme => {
  // Check cache first if enabled
  if (cache && themeCache.has(colorScheme)) {
    return themeCache.get(colorScheme)!;
  }

  // Determine color palette based on scheme
  const isDark = colorScheme === 'dark';
  const colors = isDark ? dark : light;

  // Construct new theme
  const theme: Theme = {
    ...DEFAULT_THEME,
    colors: {
      background: colors.background,
      text: colors.text,
      border: colors.border,
      semantic: {
        ...shared,
        // Adjust semantic colors for dark mode if needed
        ...(isDark && {
          primary: shared.secondary, // Use brighter primary in dark mode
          secondary: shared.primary,
        }),
      },
    },
  };

  // Cache theme if enabled
  if (cache) {
    // Clear cache if it exceeds size limit
    if (themeCache.size >= THEME_CACHE_SIZE) {
      themeCache.clear();
    }
    themeCache.set(colorScheme, theme);
  }

  return theme;
};

/**
 * Export default theme instance
 * Uses system color scheme by default
 */
export const theme = getTheme();