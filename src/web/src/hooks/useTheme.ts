/**
 * @fileoverview Enhanced theme management hook for FPBE mobile banking application
 * Implements WCAG 2.1 AA compliant theming with system preference detection,
 * persistence, and performance optimizations
 * @version 2024.1
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.0.0
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native'; // v0.71+
import { validate } from 'wcag-color-validator'; // v1.0.0
import { Theme } from '../styles/theme';
import { getTheme } from '../config/theme.config';
import { StorageService } from '../services/storage.service';

// Constants for theme management
const THEME_STORAGE_KEY = 'fpbe_theme_preference';
const THEME_TRANSITION_DURATION = 300;
const THEME_STORAGE_VERSION = '1.0';

/**
 * Interface defining the return type of the useTheme hook
 */
export interface UseThemeReturn {
    theme: Theme;
    colorScheme: ColorSchemeName;
    isDarkMode: boolean;
    isLoading: boolean;
    error: Error | null;
    toggleTheme: () => Promise<void>;
    setSystemPreference: (override: boolean) => void;
    resetTheme: () => Promise<void>;
}

/**
 * Interface for internal theme state management
 */
interface ThemeState {
    currentTheme: Theme;
    isSystemPreferred: boolean;
    lastUpdated: Date;
    error: Error | null;
}

/**
 * Enhanced custom hook for theme management with performance optimization
 * and accessibility support
 */
export default function useTheme(): UseThemeReturn {
    // Initialize theme state with loading indicator
    const [state, setState] = useState<ThemeState>({
        currentTheme: getTheme('light'),
        isSystemPreferred: true,
        lastUpdated: new Date(),
        error: null
    });
    const [isLoading, setIsLoading] = useState(true);

    // Get system color scheme
    const systemColorScheme = useColorScheme();

    // Initialize storage service
    const storage = useMemo(() => new StorageService(process.env.REACT_APP_ENCRYPTION_KEY!), []);

    /**
     * Load saved theme preference from secure storage
     */
    const loadThemePreference = useCallback(async () => {
        try {
            const savedPreference = await storage.getItem<{
                theme: string;
                isSystemPreferred: boolean;
                version: string;
            }>(THEME_STORAGE_KEY);

            if (savedPreference?.version === THEME_STORAGE_VERSION) {
                const theme = getTheme(
                    savedPreference.isSystemPreferred ? systemColorScheme : savedPreference.theme
                );
                setState(prev => ({
                    ...prev,
                    currentTheme: theme,
                    isSystemPreferred: savedPreference.isSystemPreferred
                }));
            }
        } catch (error) {
            setState(prev => ({ ...prev, error: error as Error }));
        } finally {
            setIsLoading(false);
        }
    }, [systemColorScheme, storage]);

    /**
     * Handle system theme changes with transition animation
     */
    useEffect(() => {
        if (state.isSystemPreferred && systemColorScheme) {
            const newTheme = getTheme(systemColorScheme);
            
            // Validate WCAG compliance
            const isCompliant = validate(
                newTheme.colors.text.primary,
                newTheme.colors.background.primary
            ).isCompliant;

            if (!isCompliant) {
                setState(prev => ({
                    ...prev,
                    error: new Error('Theme contrast ratio does not meet WCAG 2.1 AA standards')
                }));
                return;
            }

            // Apply theme with transition
            requestAnimationFrame(() => {
                setState(prev => ({
                    ...prev,
                    currentTheme: newTheme,
                    lastUpdated: new Date()
                }));
            });
        }
    }, [systemColorScheme, state.isSystemPreferred]);

    /**
     * Toggle between light and dark themes
     */
    const toggleTheme = useCallback(async () => {
        try {
            const newColorScheme = state.currentTheme.colors === getTheme('light').colors
                ? 'dark'
                : 'light';
            
            const newTheme = getTheme(newColorScheme);

            // Validate WCAG compliance
            const isCompliant = validate(
                newTheme.colors.text.primary,
                newTheme.colors.background.primary
            ).isCompliant;

            if (!isCompliant) {
                throw new Error('Theme contrast ratio does not meet WCAG 2.1 AA standards');
            }

            // Save preference
            await storage.setItem(THEME_STORAGE_KEY, {
                theme: newColorScheme,
                isSystemPreferred: false,
                version: THEME_STORAGE_VERSION
            });

            // Apply theme with transition
            setState(prev => ({
                ...prev,
                currentTheme: newTheme,
                isSystemPreferred: false,
                lastUpdated: new Date()
            }));
        } catch (error) {
            setState(prev => ({ ...prev, error: error as Error }));
        }
    }, [state.currentTheme, storage]);

    /**
     * Set system preference override
     */
    const setSystemPreference = useCallback(async (override: boolean) => {
        try {
            await storage.setItem(THEME_STORAGE_KEY, {
                theme: systemColorScheme || 'light',
                isSystemPreferred: override,
                version: THEME_STORAGE_VERSION
            });

            setState(prev => ({
                ...prev,
                isSystemPreferred: override,
                lastUpdated: new Date()
            }));
        } catch (error) {
            setState(prev => ({ ...prev, error: error as Error }));
        }
    }, [systemColorScheme, storage]);

    /**
     * Reset theme to system default
     */
    const resetTheme = useCallback(async () => {
        try {
            await storage.removeItem(THEME_STORAGE_KEY);
            setState(prev => ({
                ...prev,
                currentTheme: getTheme(systemColorScheme),
                isSystemPreferred: true,
                lastUpdated: new Date()
            }));
        } catch (error) {
            setState(prev => ({ ...prev, error: error as Error }));
        }
    }, [systemColorScheme, storage]);

    // Load theme preference on mount
    useEffect(() => {
        loadThemePreference();
    }, [loadThemePreference]);

    // Return theme state and controls
    return {
        theme: state.currentTheme,
        colorScheme: state.isSystemPreferred ? systemColorScheme : state.currentTheme.colors === getTheme('dark').colors ? 'dark' : 'light',
        isDarkMode: state.currentTheme.colors === getTheme('dark').colors,
        isLoading,
        error: state.error,
        toggleTheme,
        setSystemPreference,
        resetTheme
    };
}