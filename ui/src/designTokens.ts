/**
 * Design Tokens - Centralized color system
 *
 * This file serves as the single source of truth for all colors in the application.
 * It separates module colors (reserved for module-specific UI) from app UI colors
 * (for buttons, links, and interactive elements) to prevent conflicts.
 *
 * Usage:
 * - Module colors: Use getAllModuleColors() in ColorPicker component
 * - App colors: Used in theme.js for button and input styling
 * - Semantic colors: For status indicators, alerts, etc.
 * - Neutral colors: For backgrounds, borders, text
 *
 * Current usage:
 * - theme.js: Uses designTokens.app.primary/secondary and their hover/dark variants for Mantine theme
 * - ColorPicker.tsx: Uses getAllModuleColors() for preset color palette
 *
 * To change app button colors:
 *   - Primary: Update designTokens.app.primary, primaryHover, primaryDark
 *   - Secondary: Update designTokens.app.secondary, secondaryHover, secondaryDark
 * To add module colors: Add to designTokens.moduleColors object
 */

export const designTokens = {
    // Module Colors - Reserved for module-specific UI
    moduleColors: {
        purple: '#996F9D',
        blue1: '#3C5E96',
        blue2: '#669AC4',
        blue3: '#4F71A3',
        darkBlue: '#32396C',
        mutedPurple: '#746994',
        purple2: '#5F4483',
        darkPurple: '#504468',
        gray: '#515251',
    },

    // App UI Colors - For buttons, links, and interactive elements
    app: {
        primary: '#009EB1', // Cyan-blue - main action buttons
        primaryHover: '#008BA3', // Darker cyan-blue for hover
        primaryDark: '#007A8E', // Darkest cyan-blue for active states
        secondary: '#B44985', // Pink-magenta - secondary actions
        secondaryHover: '#9D3D75', // Darker pink-magenta for hover
        secondaryDark: '#863165', // Darkest pink-magenta for active states
        link: '#1e40af', // Dark blue - hyperlinks
        linkHover: '#1e3a8a', // Darker blue for link hover
        danger: '#DC2626', // Red - destructive actions
        warning: '#F59E0B', // Orange - warnings
        success: '#10B981', // Emerald - success states
    },

    // Semantic Colors - For status, feedback, etc.
    semantic: {
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },

    // Neutral Colors - For backgrounds, borders, text
    neutral: {
        white: '#FFFFFF',
        gray50: '#F9FAFB',
        gray100: '#F3F4F6',
        gray200: '#E5E7EB',
        gray300: '#D1D5DB',
        gray400: '#9CA3AF',
        gray500: '#6B7280',
        gray600: '#4B5563',
        gray700: '#374151',
        gray800: '#1F2937',
        gray900: '#111827',
        black: '#000000',
    },

    // UI Component Colors
    ui: {
        menuButtonBackground: '#F3F4F6', // Light gray for three-dot menu buttons
        menuButtonHover: '#E5E7EB', // Slightly darker gray for hover
    },

    // Surface Colors - For backgrounds and surfaces
    surface: {
        background: '#f9f7f5', // Match mobile app background
        white: '#FFFFFF',
        lightGray: '#F3F4F6',
    },

    // Role Badge Colors - Matching mobile app
    roles: {
        admin: '#996F9D', // violet (matches module purple)
        manager: '#FF9800', // orange
        owner: '#F44336', // red
        moderator: '#2196F3', // blue
        member: '#9E9E9E', // gray
        user: '#9E9E9E', // gray
        textOnColored: '#FFFFFF', // white text for colored backgrounds
    },

    // Spacing Tokens - Matching mobile app (in rem for web)
    spacing: {
        xs: '0.5rem', // 8px
        sm: '0.75rem', // 12px
        md: '1rem', // 16px
        lg: '1.5rem', // 24px
        xl: '2rem', // 32px
        xxl: '2.5rem', // 40px
        xxxl: '3rem', // 48px
    },

    // Typography Scale
    typography: {
        fontSize: {
            xs: '0.75rem', // 12px
            sm: '0.875rem', // 14px
            md: '1rem', // 16px
            lg: '1.125rem', // 18px
            xl: '1.25rem', // 20px
            '2xl': '1.5rem', // 24px
            '3xl': '2rem', // 32px
            '4xl': '2.5rem', // 40px
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        },
    },
} as const;

/**
 * Get module color by index (for cycling through colors)
 * @param index - Index of the color
 * @returns Hex color code
 */
export function getModuleColor(index: number): string {
    const colors = Object.values(designTokens.moduleColors);
    const color = colors[index % colors.length];
    if (!color) {
        throw new Error('Module color not found');
    }
    return color;
}

/**
 * Check if a color is a module color
 * @param color - Hex color code to check
 * @returns True if the color is a module color
 */
export function isModuleColor(color: string): boolean {
    return (Object.values(designTokens.moduleColors) as string[]).includes(
        color
    );
}

/**
 * Get all module colors as an array
 * @returns Array of hex color codes
 */
export function getAllModuleColors(): string[] {
    return Object.values(designTokens.moduleColors);
}

/**
 * Convert hex color to rgba string
 * @param hex - Hex color code (with or without #)
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color string
 */
export function hexToRgba(hex: string, alpha = 1): string {
    const hexClean = hex.replace('#', '');
    const r = parseInt(hexClean.substr(0, 2), 16);
    const g = parseInt(hexClean.substr(2, 2), 16);
    const b = parseInt(hexClean.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
