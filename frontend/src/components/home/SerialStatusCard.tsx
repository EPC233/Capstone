import { useState } from 'react';
import {
    Card,
    Title,
    Stack,
    Text,
    Group,
    Badge,
    Button,
    ThemeIcon,
} from '@mantine/core';
import { IconUsb, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react';
import { useSerialStatus } from '../../contexts/SerialStatusContext';
import { connectSerial, disconnectSerial } from '../../services/livedata';

export default function SerialStatusCard() {
    const { status, refreshStatus } = useSerialStatus();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleToggle() {
        try {
            setLoading(true);
            setError(null);
            if (status.connected) {
                await disconnectSerial();
            } else {
                await connectSerial();
            }
            await refreshStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Title order={4}>Sensor Status</Title>
                    <Badge
                        color={status.connected ? 'green' : 'gray'}
                        variant="light"
                        size="lg"
                    >
                        {status.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                </Group>
                <Group gap="sm">
                    <ThemeIcon
                        size="lg"
                        variant="light"
                        color={status.connected ? 'green' : 'gray'}
                    >
                        <IconUsb size={20} />
                    </ThemeIcon>
                    <div>
                        <Text size="sm" fw={500}>
                            {status.connected
                                ? `Port: ${status.port ?? 'unknown'}`
                                : 'No sensor detected'}
                        </Text>
                        {status.recording && (
                            <Text size="xs" c="red" fw={500}>
                                Recording ({status.recording_samples} samples)
                            </Text>
                        )}
                    </div>
                </Group>
                {error && (
                    <Text size="xs" c="red">{error}</Text>
                )}
                <Button
                    variant={status.connected ? 'light' : 'filled'}
                    color={status.connected ? 'red' : 'green'}
                    leftSection={
                        status.connected
                            ? <IconPlugConnectedX size={16} />
                            : <IconPlugConnected size={16} />
                    }
                    onClick={handleToggle}
                    loading={loading}
                    disabled={status.recording}
                >
                    {status.connected ? 'Disconnect' : 'Connect Sensor'}
                </Button>
            </Stack>
        </Card>
    );
}
