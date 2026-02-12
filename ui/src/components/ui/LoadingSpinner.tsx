import { Box, Loader, Stack, Text } from '@mantine/core';

interface LoadingSpinnerProps {
    message?: string;
    size?: string;
}

/**
 * Reusable loading spinner component that centers vertically and horizontally on the screen
 * @param props - Component props
 * @param props.message - Optional message to display below the spinner
 * @param props.size - Size of the loader (default: 'lg')
 */
export default function LoadingSpinner({
    message,
    size = 'lg',
}: LoadingSpinnerProps) {
    return (
        <Box
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Stack gap="md" align="center">
                <Loader size={size} />
                {message && <Text>{message}</Text>}
            </Stack>
        </Box>
    );
}
