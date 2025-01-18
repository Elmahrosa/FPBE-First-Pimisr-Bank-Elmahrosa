/**
 * @fileoverview Theme system for FPBE mobile banking application
 * Implements a comprehensive design system with support for light/dark modes,
 * platform-specific adjustments, and WCAG 2.1 AA compliance
 */

import { Platform } from 'react-native'; // v0.71+
import { light, dark, shared } from './colors';
import { SPACING } from './spacing';
import { fontFamilies, fontSizes, fontWeights, lineHeights } from './fonts';
import { COMPONENT_DIMENSIONS, SCREEN_BREAKPOINTS } from './dimensions';

// Default theme mode
export const DEFAULT_THEME_MODE = 'light';

// Animation timing constants
export const ANIMATION_DURATION = {
  fast: 200,
  normal: 300,
  slow: 500,
} as const;

// Z-index hierarchy
export const Z_INDEX = {
  modal: 1000,
  overlay: 900,
  dropdown: 800,
  header: 700,
  footer: 600,
} as const;

/**
 * Complete theme interface with all styling properties
 */
export interface Theme {
  colors: {
    background: typeof light.background;
    text: typeof light.text;
    border: string;
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    semantic: {
      action: {
        primary: string;
        secondary: string;
        disabled: string;
      };
      feedback: {
        success: string;
        error: string;
        warning: string;
        info: string;
      };
      navigation: {
        active: string;
        inactive: string;
      };
      status: {
        online: string;
        offline: string;
        pending: string;
      };
    };
    accessibility: {
      contrast: {
        high: string;
        medium: string;
        low: string;
      };
      colorBlind: {
        safe: boolean;
        alternatives: {
          red: string;
          green: string;
          blue: string;
        };
      };
    };
  };
  typography: {
    fontFamily: typeof fontFamilies;
    fontSize: typeof fontSizes;
    fontWeight: typeof fontWeights;
    lineHeight: typeof lineHeights;
    letterSpacing: {
      tight: number;
      normal: number;
      wide: number;
    };
    platform: {
      ios: {
        fontFamily: string;
        scaleFactor: number;
      };
      android: {
        fontFamily: string;
        scaleFactor: number;
      };
    };
  };
  spacing: typeof SPACING;
  dimensions: {
    components: typeof COMPONENT_DIMENSIONS;
    breakpoints: typeof SCREEN_BREAKPOINTS;
    touchTargets: {
      minimum: number;
      comfortable: number;
    };
  };
  animation: {
    duration: typeof ANIMATION_DURATION;
    easing: {
      standard: string;
      accelerate: string;
      decelerate: string;
    };
  };
  elevation: {
    zIndex: typeof Z_INDEX;
    shadows: {
      light: {
        small: object;
        medium: object;
        large: object;
      };
      dark: {
        small: object;
        medium: object;
        large: object;
      };
    };
  };
  rtl: {
    direction: 'ltr' | 'rtl';
    flip: boolean;
  };
}

/**
 * Creates a complete theme object with platform-specific adjustments
 * and accessibility features
 * 
 * @param mode - Theme mode ('light' | 'dark')
 * @param options - Custom theme options for overrides
 * @returns Complete theme object
 */
export const createTheme = (
  mode: 'light' | 'dark' = DEFAULT_THEME_MODE,
  options: Partial<Theme> = {}
): Theme => {
  // Select base color palette
  const colors = mode === 'light' ? light : dark;

  // Platform-specific typography adjustments
  const platformTypography = {
    ios: {
      fontFamily: fontFamilies.primary,
      scaleFactor: 1,
    },
    android: {
      fontFamily: fontFamilies.primary,
      scaleFactor: 1.1,
    },
  };

  // Shadow styles based on platform and theme mode
  const shadowStyles = {
    light: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
      large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 5.46,
        elevation: 9,
      },
    },
    dark: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2.22,
        elevation: 3,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 4.65,
        elevation: 6,
      },
      large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 6.27,
        elevation: 10,
      },
    },
  };

  // Base theme object
  const theme: Theme = {
    colors: {
      ...colors,
      ...shared,
      semantic: {
        action: {
          primary: shared.primary,
          secondary: shared.secondary,
          disabled: mode === 'light' ? '#E5E7EB' : '#374151',
        },
        feedback: {
          success: shared.success,
          error: shared.error,
          warning: shared.warning,
          info: shared.secondary,
        },
        navigation: {
          active: shared.primary,
          inactive: colors.text.tertiary,
        },
        status: {
          online: shared.success,
          offline: shared.error,
          pending: shared.warning,
        },
      },
      accessibility: {
        contrast: {
          high: colors.text.primary,
          medium: colors.text.secondary,
          low: colors.text.tertiary,
        },
        colorBlind: {
          safe: true,
          alternatives: {
            red: '#D55E00',
            green: '#009E73',
            blue: '#0072B2',
          },
        },
      },
    },
    typography: {
      fontFamily: fontFamilies,
      fontSize: fontSizes,
      fontWeight: fontWeights,
      lineHeight: lineHeights,
      letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 0.5,
      },
      platform: platformTypography,
    },
    spacing: SPACING,
    dimensions: {
      components: COMPONENT_DIMENSIONS,
      breakpoints: SCREEN_BREAKPOINTS,
      touchTargets: {
        minimum: 44, // WCAG 2.1 minimum
        comfortable: 48,
      },
    },
    animation: {
      duration: ANIMATION_DURATION,
      easing: {
        standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
        decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      },
    },
    elevation: {
      zIndex: Z_INDEX,
      shadows: shadowStyles,
    },
    rtl: {
      direction: Platform.select({ ios: 'ltr', android: 'ltr' }),
      flip: Platform.select({ ios: false, android: true }),
    },
  };

  // Merge with custom options
  return {
    ...theme,
    ...options,
  };
};

export default createTheme;