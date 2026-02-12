import { Container, Alert } from '@mantine/core';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export interface UsePageStateOptions {
    data: unknown;
    loading: boolean;
    error: string | null;
    notFoundMessage?: string;
    notFoundTitle?: string;
    layoutComponent?: React.ComponentType<{ children: React.ReactNode }>;
    layoutProps?: Record<string, unknown>;
}

export interface UsePageStateReturn {
    component: React.ReactNode | null;
    shouldRenderContent: boolean;
}

/**
 * Custom hook for handling common page state patterns (loading, error, not found)
 * Returns a component to render if the page is in a special state, or null if ready to render content
 * @param options - Configuration options
 * @returns { component, shouldRenderContent }
 */
export function usePageState({
    data,
    loading,
    error,
    notFoundMessage = 'Not Found',
    notFoundTitle,
    layoutComponent,
    layoutProps = {},
}: UsePageStateOptions): UsePageStateReturn {
    // Show loading spinner if loading and no data yet
    if (loading && !data) {
        return { component: <LoadingSpinner />, shouldRenderContent: false };
    }

    // Show error if there's an error and no data
    if (error && !data) {
        const errorContent = (
            <Container size="md" py="xl">
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            </Container>
        );

        if (layoutComponent) {
            const Layout = layoutComponent;
            return {
                component: <Layout {...layoutProps}>{errorContent}</Layout>,
                shouldRenderContent: false,
            };
        }

        return { component: errorContent, shouldRenderContent: false };
    }

    // Show not found if no data and not loading
    if (!data && !loading) {
        const title = notFoundTitle || notFoundMessage;
        const notFoundContent = (
            <Container size="md" py="xl">
                <Alert color="primary" title={title}>
                    The requested item could not be found.
                </Alert>
            </Container>
        );

        if (layoutComponent) {
            const Layout = layoutComponent;
            return {
                component: <Layout {...layoutProps}>{notFoundContent}</Layout>,
                shouldRenderContent: false,
            };
        }

        return { component: notFoundContent, shouldRenderContent: false };
    }

    // Ready to render content
    return { component: null, shouldRenderContent: true };
}
