import { createTheme } from '@mantine/core';
import { designTokens, hexToRgba } from './designTokens.js';

export const theme = createTheme({
    // Modern color scheme - using primary for app buttons
    // This ensures buttons don't clash with module colors
    // Primary color values come from designTokens.app
    primaryColor: 'primary',

    // Custom color palette for a modern, professional look
    colors: {
        // Primary color palette - aliased from cyan for semantic naming
        // Use color="primary" in components
        primary: [
            '#ECFEFF', // 0 - lightest
            '#CFFAFE', // 1
            '#A5F3FC', // 2
            '#67E8F9', // 3
            '#22D3EE', // 4
            designTokens.app.primaryHover, // 5 - #008BA3 - primary hover
            designTokens.app.primary, // 6 - #009EB1 - primary
            designTokens.app.primaryDark, // 7 - #007A8E - primary dark
            '#0E7490', // 8
            '#155E75', // 9 - darkest
        ],
        // Secondary color palette - aliased from pink for semantic naming
        // Use color="secondary" in components
        secondary: [
            '#FDF2F8', // 0 - lightest
            '#FCE7F3', // 1
            '#FBCFE8', // 2
            '#F9A8D4', // 3
            '#F472B6', // 4
            designTokens.app.secondaryHover, // 5 - #9D3D75 - secondary hover
            designTokens.app.secondary, // 6 - #B44985 - secondary
            designTokens.app.secondaryDark, // 7 - #863165 - secondary dark
            '#6B1F4F', // 8
            '#4A1538', // 9 - darkest
        ],
        // Cyan palette for app buttons and primary actions (kept for backward compatibility)
        // Generated from designTokens.app.primary colors
        cyan: [
            '#ECFEFF', // 0 - lightest
            '#CFFAFE', // 1
            '#A5F3FC', // 2
            '#67E8F9', // 3
            '#22D3EE', // 4
            designTokens.app.primaryHover, // 5 - #008BA3 - primary hover
            designTokens.app.primary, // 6 - #009EB1 - primary
            designTokens.app.primaryDark, // 7 - #007A8E - primary dark
            '#0E7490', // 8
            '#155E75', // 9 - darkest
        ],
        // Pink palette for secondary actions (kept for backward compatibility)
        // Generated from designTokens.app.secondary colors
        pink: [
            '#FDF2F8', // 0 - lightest
            '#FCE7F3', // 1
            '#FBCFE8', // 2
            '#F9A8D4', // 3
            '#F472B6', // 4
            designTokens.app.secondaryHover, // 5 - #9D3D75 - secondary hover
            designTokens.app.secondary, // 6 - #B44985 - secondary
            designTokens.app.secondaryDark, // 7 - #863165 - secondary dark
            '#6B1F4F', // 8
            '#4A1538', // 9 - darkest
        ],
        // Keep indigo for other uses (not primary or secondary)
        indigo: [
            '#eef2ff',
            '#e0e7ff',
            '#c7d2fe',
            '#a5b4fc',
            '#818cf8',
            '#6366f1',
            '#4f46e5',
            '#4338ca',
            '#3730a3',
            '#312e81',
        ],
    },

    // Modern typography with system font stack
    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontFamilyMonospace:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

    // Typography scale
    headings: {
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontWeight: '600',
        sizes: {
            h1: { fontSize: '2.5rem', lineHeight: '1.2', fontWeight: '700' },
            h2: { fontSize: '2rem', lineHeight: '1.3', fontWeight: '600' },
            h3: { fontSize: '1.75rem', lineHeight: '1.4', fontWeight: '600' },
            h4: { fontSize: '1.5rem', lineHeight: '1.4', fontWeight: '600' },
            h5: { fontSize: '1.25rem', lineHeight: '1.5', fontWeight: '600' },
            h6: { fontSize: '1rem', lineHeight: '1.5', fontWeight: '600' },
        },
    },

    // Default radius for rounded corners
    defaultRadius: 'md',

    // Spacing scale
    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },

    // Shadows for depth
    shadows: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    },

    // Component-specific styling
    components: {
        Card: {
            defaultProps: {
                withBorder: true,
                shadow: 'sm',
                padding: 'lg',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-white)',
                    borderColor: 'var(--mantine-color-gray-2)',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    '&:hover': {
                        boxShadow: 'var(--mantine-shadow-md)',
                    },
                },
            },
        },
        Paper: {
            defaultProps: {
                withBorder: true,
                shadow: 'xs',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-white)',
                    borderColor: 'var(--mantine-color-gray-2)',
                },
            },
        },
        Button: {
            defaultProps: {
                radius: 'md',
            },
            styles: {
                root: {
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
            },
            // @ts-expect-error - Mantine theme variants typing is incomplete
            variants: {
                light: (_theme: unknown, params: { color?: string }) => {
                    // For colored buttons (like green), use darker shades for better visibility
                    if (params.color && params.color !== 'gray') {
                        const colorVar = `--mantine-color-${params.color}`;
                        return {
                            root: {
                                backgroundColor: `var(${colorVar}-0)`,
                                border: `1px solid var(${colorVar}-6)`,
                                color: `var(${colorVar}-9)`,
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                fontWeight: 600,
                                '&:hover': {
                                    backgroundColor: `var(${colorVar}-1)`,
                                    borderColor: `var(${colorVar}-7)`,
                                    color: `var(${colorVar}-9)`,
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                },
                            },
                        };
                    }
                    // Default light variant for non-colored buttons
                    return {
                        root: {
                            backgroundColor: 'var(--mantine-color-white)',
                            border: '1px solid var(--mantine-color-gray-3)',
                            color: 'var(--mantine-color-gray-8)',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-gray-0)',
                                borderColor: 'var(--mantine-color-gray-4)',
                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                            },
                        },
                    };
                },
            },
        },
        Input: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-gray-3)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-cyan-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(designTokens.app.primary, 0.1)}`,
                    },
                },
            },
        },
        TextInput: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-gray-3)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-cyan-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(designTokens.app.primary, 0.1)}`,
                    },
                },
            },
        },
        Textarea: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-gray-3)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-cyan-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(designTokens.app.primary, 0.1)}`,
                    },
                },
            },
        },
        Select: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-gray-3)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-cyan-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(designTokens.app.primary, 0.1)}`,
                    },
                },
            },
        },
        Modal: {
            defaultProps: {
                radius: 'md',
                shadow: 'xl',
            },
            styles: {
                content: {
                    boxShadow:
                        '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                },
                header: {
                    borderBottom: '1px solid var(--mantine-color-gray-2)',
                },
            },
        },
        Table: {
            styles: {
                root: {
                    '& thead tr th': {
                        fontWeight: 600,
                        color: 'var(--mantine-color-gray-7)',
                        borderBottom: '2px solid var(--mantine-color-gray-2)',
                    },
                    '& tbody tr': {
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-gray-0)',
                        },
                    },
                },
            },
        },
        Badge: {
            defaultProps: {
                radius: 'md',
            },
        },
        Tabs: {
            styles: {
                tab: {
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                },
            },
        },
        Anchor: {
            styles: {
                root: {
                    color: designTokens.app.link,
                    textDecoration: 'underline',
                    '&:hover': {
                        color: designTokens.app.linkHover,
                        textDecoration: 'underline',
                    },
                },
            },
        },
        ActionIcon: {
            defaultProps: {
                color: 'gray',
            },
            // @ts-expect-error - Mantine theme variants typing is incomplete
            variants: {
                light: () => {
                    // Always use gray background for light variant ActionIcon (three-dot buttons)
                    // Override CSS variables that Mantine sets for primary color
                    // Set color to gray to prevent primary color from being used
                    return {
                        root: {
                            '--ai-bg': designTokens.ui.menuButtonBackground,
                            '--ai-hover': designTokens.ui.menuButtonHover,
                            '--ai-color': 'var(--mantine-color-gray-7)',
                            backgroundColor:
                                designTokens.ui.menuButtonBackground,
                            color: 'var(--mantine-color-gray-7)',
                            border: 'none',
                            '&:hover': {
                                '--ai-bg': designTokens.ui.menuButtonHover,
                                backgroundColor:
                                    designTokens.ui.menuButtonHover,
                                color: 'var(--mantine-color-gray-8)',
                            },
                        },
                    };
                },
            },
        },
    },
});
