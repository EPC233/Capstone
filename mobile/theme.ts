import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// Design tokens matching web app
export const designTokens = {
    app: {
        primary: '#7b00b0',
        primaryHover: '#7e00b0',
        primaryDark: '#5d00a8',
        secondary: '#B44985',
        secondaryHover: '#9D3D75',
        secondaryDark: '#863165',
        danger: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
    },
    semantic: {
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },
    surface: {
        background: '#f9f7f5', // Match web UI background color
        surface: '#F8F9FA',
        surfaceVariant: '#F1F3F5',
        outline: '#E9ECEF',
        outlineVariant: '#DEE2E6',
        white: '#FFFFFF',
        lightGray: '#F3F4F6',
    },
    text: {
        onSurface: '#212529',
        onSurfaceVariant: '#495057',
        disabled: '#ADB5BD',
        placeholder: '#6C757D',
        white: '#FFFFFF',
        darkGray: '#374151',
    },
    // Role badge colors - matching module colors where applicable
    roles: {
        admin: '#996F9D', // violet (matches module purple)
        manager: '#FF9800', // orange
        owner: '#F44336', // red
        moderator: '#2196F3', // blue
        member: '#9E9E9E', // gray
        user: '#9E9E9E', // gray
        textOnColored: '#FFFFFF', // white text for colored backgrounds
    },
    // Tab bar colors
    tabBar: {
        active: '#cc00ff', // primary
        inactive: '#6C757D', // placeholder
        background: '#484848', // white
        border: '#E9ECEF', // outline
        shadow: '#000000', // black
    },
    // Shadow and overlay colors
    shadow: {
        color: '#000000',
        rgba: {
            light: 'rgba(0, 0, 0, 0.1)',
            medium: 'rgba(0, 0, 0, 0.5)',
        },
    },
    // Theme-specific colors (for Material Design 3 theme)
    theme: {
        onPrimary: '#FFFFFF',
        primaryContainer: '#E0F7FA',
        onPrimaryContainer: '#004D56',
        onSecondary: '#FFFFFF',
        secondaryContainer: '#FCE4EC',
        onSecondaryContainer: '#4A1538',
        tertiary: '#6366F1',
        onTertiary: '#FFFFFF',
        onError: '#FFFFFF',
        errorContainer: '#FEE2E2',
        onErrorContainer: '#7F1D1D',
        inverseSurface: '#212529',
        inverseOnSurface: '#FFFFFF',
        inversePrimary: '#67E8F9',
        elevation: {
            level1: '#FFFFFF',
            level2: '#FFFFFF',
            level3: '#FFFFFF',
            level4: '#FFFFFF',
            level5: '#FFFFFF',
        },
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
    },
};

// Enhanced typography configuration
const fontConfig = {
    web: {
        regular: {
            fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontWeight: '400' as const,
        },
        medium: {
            fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500' as const,
        },
        light: {
            fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontWeight: '300' as const,
        },
        thin: {
            fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
            fontWeight: '100' as const,
        },
    },
    ios: {
        regular: {
            fontFamily: 'System',
            fontWeight: '400' as const,
        },
        medium: {
            fontFamily: 'System',
            fontWeight: '500' as const,
        },
        light: {
            fontFamily: 'System',
            fontWeight: '300' as const,
        },
        thin: {
            fontFamily: 'System',
            fontWeight: '100' as const,
        },
    },
    android: {
        regular: {
            fontFamily: 'sans-serif',
            fontWeight: '400' as const,
        },
        medium: {
            fontFamily: 'sans-serif-medium',
            fontWeight: '500' as const,
        },
        light: {
            fontFamily: 'sans-serif-light',
            fontWeight: '300' as const,
        },
        thin: {
            fontFamily: 'sans-serif-thin',
            fontWeight: '100' as const,
        },
    },
};

export const appTheme: MD3Theme = {
    ...MD3LightTheme,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fonts: configureFonts({ config: fontConfig as any }),
    colors: {
        ...MD3LightTheme.colors,
        primary: designTokens.app.primary,
        onPrimary: designTokens.theme.onPrimary,
        primaryContainer: designTokens.theme.primaryContainer,
        onPrimaryContainer: designTokens.theme.onPrimaryContainer,
        secondary: designTokens.app.secondary,
        onSecondary: designTokens.theme.onSecondary,
        secondaryContainer: designTokens.theme.secondaryContainer,
        onSecondaryContainer: designTokens.theme.onSecondaryContainer,
        tertiary: designTokens.theme.tertiary,
        onTertiary: designTokens.theme.onTertiary,
        error: designTokens.app.danger,
        onError: designTokens.theme.onError,
        errorContainer: designTokens.theme.errorContainer,
        onErrorContainer: designTokens.theme.onErrorContainer,
        background: designTokens.surface.background,
        onBackground: designTokens.text.onSurface,
        surface: designTokens.surface.surface,
        onSurface: designTokens.text.onSurface,
        surfaceVariant: designTokens.surface.surfaceVariant,
        onSurfaceVariant: designTokens.text.onSurfaceVariant,
        outline: designTokens.surface.outline,
        outlineVariant: designTokens.surface.outlineVariant,
        shadow: designTokens.shadow.rgba.light,
        scrim: designTokens.shadow.rgba.medium,
        inverseSurface: designTokens.theme.inverseSurface,
        inverseOnSurface: designTokens.theme.inverseOnSurface,
        inversePrimary: designTokens.theme.inversePrimary,
        elevation: {
            level0: 'transparent',
            level1: designTokens.theme.elevation.level1,
            level2: designTokens.theme.elevation.level2,
            level3: designTokens.theme.elevation.level3,
            level4: designTokens.theme.elevation.level4,
            level5: designTokens.theme.elevation.level5,
        },
    },
    roundness: 12,
};

export default appTheme;
