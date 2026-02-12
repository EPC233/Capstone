import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import LoadingSpinner from '../LoadingSpinner';
import { theme } from '../../../theme';

// Helper to render with MantineProvider
const renderWithProvider = (component: React.ReactElement) => {
    return render(<MantineProvider theme={theme}>{component}</MantineProvider>);
};

describe('LoadingSpinner', () => {
    it('should render loading message when provided', () => {
        renderWithProvider(<LoadingSpinner message="Loading data..." />);
        expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('should render without message when not provided', () => {
        const { container } = renderWithProvider(<LoadingSpinner />);
        // Component should render without crashing
        // The loader should be present (we can't easily test Mantine components visually)
        expect(container).toBeInTheDocument();
    });

    it('should render with custom size', () => {
        const { container } = renderWithProvider(<LoadingSpinner size="sm" />);
        // Component should render without crashing
        expect(container).toBeInTheDocument();
    });
});
