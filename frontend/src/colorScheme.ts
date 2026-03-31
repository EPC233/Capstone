/**
 * Structure:
 *   brand     - Primary/secondary action colors (buttons, links, accents)
 *   semantic  - Status colors (error, warning, success, info)
 *   module    - Module-specific colors for data visualization
 *   light     - Light mode surface/text/border colors
 *   dark      - Dark mode surface/text/border colors
 */

export const colorScheme = {
    // ─── Brand Colors ──────────────────────────────────────────────
    brand: {
        primary: '#009EB1',
        primaryHover: '#008BA3',
        primaryDark: '#007A8E',
        secondary: '#B44985',
        secondaryHover: '#9D3D75',
        secondaryDark: '#863165',
        link: '#1e40af',
        linkHover: '#1e3a8a',
    },

    // ─── Semantic / Status Colors ──────────────────────────────────
    semantic: {
        error: '#DC2626',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
    },

    // ─── Module Colors (data vis / category coding) ────────────────
    module: {
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

    // ─── Light Mode Palette ────────────────────────────────────────
    light: {
        background: '#f9f7f5',
        surface: '#FFFFFF',
        surfaceAlt: '#F3F4F6',
        border: '#E5E7EB',
        borderSubtle: '#F3F4F6',
        text: '#111827',
        textSecondary: '#4B5563',
        textMuted: '#6B7280',
        textDisabled: '#9CA3AF',
        navBackground: '#FFFFFF',
        navBorder: '#E5E7EB',
        cardBackground: '#FFFFFF',
        cardBorder: '#E5E7EB',
        menuButtonBg: '#F3F4F6',
        menuButtonHover: '#E5E7EB',
        shadow: 'rgba(0, 0, 0, 0.1)',
        shadowSubtle: 'rgba(0, 0, 0, 0.05)',
    },

    // ─── Dark Mode Palette ─────────────────────────────────────────
    dark: {
        background: '#1a1b1e',
        surface: '#25262b',
        surfaceAlt: '#2c2e33',
        border: '#373A40',
        borderSubtle: '#2c2e33',
        text: '#C1C2C5',
        textSecondary: '#909296',
        textMuted: '#5c5f66',
        textDisabled: '#5c5f66',
        navBackground: '#25262b',
        navBorder: '#373A40',
        cardBackground: '#25262b',
        cardBorder: '#373A40',
        menuButtonBg: '#2c2e33',
        menuButtonHover: '#373A40',
        shadow: 'rgba(0, 0, 0, 0.3)',
        shadowSubtle: 'rgba(0, 0, 0, 0.2)',
    },

    // ─── Mantine Primary Palette (10 shades for the primary color) ─
    // These map to Mantine's color[0]–color[9] slots
    primaryShades: [
        '#ECFEFF', // 0 - lightest
        '#CFFAFE', // 1
        '#A5F3FC', // 2
        '#67E8F9', // 3
        '#22D3EE', // 4
        '#008BA3', // 5 - hover
        '#009EB1', // 6 - primary (Mantine default shade)
        '#007A8E', // 7 - dark
        '#0E7490', // 8
        '#155E75', // 9 - darkest
    ] as const,

    secondaryShades: [
        '#FDF2F8', // 0 - lightest
        '#FCE7F3', // 1
        '#FBCFE8', // 2
        '#F9A8D4', // 3
        '#F472B6', // 4
        '#9D3D75', // 5 - hover
        '#B44985', // 6 - primary
        '#863165', // 7 - dark
        '#6B1F4F', // 8
        '#4A1538', // 9 - darkest
    ] as const,
} as const;

// ─── Utility Types ────────────────────────────────────────────────
export type ColorMode = 'light' | 'dark';
export type ModeColors = typeof colorScheme.light | typeof colorScheme.dark;

/** Get the surface/text palette for a given mode */
export function getModeColors(mode: ColorMode) {
    return colorScheme[mode];
}

/** Get a module color by index, cycling through the palette */
export function getModuleColor(index: number): string {
    const colors = Object.values(colorScheme.module);
    return colors[index % colors.length]!;
}

/** Get all module colors as an array */
export function getAllModuleColors(): string[] {
    return Object.values(colorScheme.module);
}

/** Convert hex to rgba */
export function hexToRgba(hex: string, alpha = 1): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
