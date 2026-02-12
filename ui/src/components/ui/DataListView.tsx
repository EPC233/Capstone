import { Stack, Alert, Text } from '@mantine/core';
import type { ViewMode } from '../../hooks/useViewMode';

interface DataListViewProps {
    tableView: React.ReactNode;
    cardView: React.ReactNode;
    viewMode: ViewMode;
    emptyMessage?: string;
    error?: string | null;
    onErrorClose?: (() => void) | null;
    loading?: boolean;
    dataLength?: number;
}

/**
 * Generic wrapper component for table/card view switching
 * Handles empty states, error display, and conditional rendering
 * @param tableView - Table view content
 * @param cardView - Card view content
 * @param viewMode - Current view mode ('table' or 'card')
 * @param emptyMessage - Message to show when data is empty
 * @param error - Error message to display
 * @param onErrorClose - Callback when error alert is closed
 * @param loading - Whether data is currently loading
 * @param dataLength - Number of items in the data array
 */
export default function DataListView({
    tableView,
    cardView,
    viewMode,
    emptyMessage = 'No items found.',
    error = null,
    onErrorClose = null,
    loading = false,
    dataLength = 0,
}: DataListViewProps) {
    return (
        <Stack gap="xl">
            {error && (
                <Alert
                    color="red"
                    title="Error"
                    onClose={onErrorClose || undefined}
                >
                    {error}
                </Alert>
            )}

            {dataLength === 0 && !loading ? (
                <Text ta="center" py="xl">
                    {emptyMessage}
                </Text>
            ) : viewMode === 'card' ? (
                cardView
            ) : (
                tableView
            )}
        </Stack>
    );
}
