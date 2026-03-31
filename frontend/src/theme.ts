import { createTheme } from '@mantine/core';
import { colorScheme, hexToRgba } from './colorScheme.js';

export const theme = createTheme({
    primaryColor: 'primary',

    colors: {
        primary: [...colorScheme.primaryShades] as unknown as [string, string, string, string, string, string, string, string, string, string],
        secondary: [...colorScheme.secondaryShades] as unknown as [string, string, string, string, string, string, string, string, string, string],
        cyan: [...colorScheme.primaryShades] as unknown as [string, string, string, string, string, string, string, string, string, string],
        pink: [...colorScheme.secondaryShades] as unknown as [string, string, string, string, string, string, string, string, string, string],
        indigo: [
            '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8',
            '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
        ],
    },

    fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontFamilyMonospace:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

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

    defaultRadius: 'md',

    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },

    shadows: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    },

    components: {
        Card: {
            defaultProps: {
                withBorder: true,
                shadow: 'sm',
                padding: 'lg',
            },
            styles: {
                root: {
                    backgroundColor: 'var(--mantine-color-body)',
                    borderColor: 'var(--mantine-color-default-border)',
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
                    backgroundColor: 'var(--mantine-color-body)',
                    borderColor: 'var(--mantine-color-default-border)',
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
        },
        Input: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-default-border)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-primary-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(colorScheme.brand.primary, 0.1)}`,
                    },
                },
            },
        },
        TextInput: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-default-border)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-primary-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(colorScheme.brand.primary, 0.1)}`,
                    },
                },
            },
        },
        Textarea: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-default-border)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-primary-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(colorScheme.brand.primary, 0.1)}`,
                    },
                },
            },
        },
        Select: {
            styles: {
                input: {
                    borderColor: 'var(--mantine-color-default-border)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    '&:focus': {
                        borderColor: 'var(--mantine-color-primary-6)',
                        boxShadow: `0 0 0 3px ${hexToRgba(colorScheme.brand.primary, 0.1)}`,
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
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                },
            },
        },
        Table: {
            styles: {
                root: {
                    '& thead tr th': {
                        fontWeight: 600,
                        color: 'var(--mantine-color-dimmed)',
                        borderBottom: '2px solid var(--mantine-color-default-border)',
                    },
                    '& tbody tr': {
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                            backgroundColor: 'var(--mantine-color-default-hover)',
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
                    color: 'var(--mantine-color-primary-6)',
                    textDecoration: 'underline',
                    '&:hover': {
                        color: 'var(--mantine-color-primary-8)',
                        textDecoration: 'underline',
                    },
                },
            },
        },
        ActionIcon: {
            defaultProps: {
                color: 'gray',
            },
        },
    },
});
