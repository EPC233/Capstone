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
    Tooltip,
} from '@mantine/core';
import { IconUsb, IconBluetooth, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react';
import { useSerialStatus } from '../../contexts/SerialStatusContext';
import { connectSerial, disconnectSerial } from '../../services/livedata';
import { connectBle, disconnectBle, bluetoothUnsupportedReason } from '../../services/bluetooth';

export default function SerialStatusCard() {
    const { status, bleConnected, bleSupported, refreshStatus } = useSerialStatus();
    const bleUnsupportedReason = bleSupported ? null : bluetoothUnsupportedReason();
    const [loading, setLoading] = useState(false);
    const [bleLoading, setBleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleToggleUsb() {
        try {
            setLoading(true);
            setError(null);
            if (status.connected && !bleConnected) {
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

    async function handleToggleBle() {
        try {
            setBleLoading(true);
            setError(null);
            if (bleConnected) {
                await disconnectBle();
            } else {
                await connectBle();
            }
            await refreshStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bluetooth connection failed');
        } finally {
            setBleLoading(false);
        }
    }

    const connectedViaBle = status.connected && bleConnected;
    const connectedViaUsb = status.connected && !bleConnected;

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
                        {connectedViaBle ? 'Bluetooth' : connectedViaUsb ? 'USB' : 'Disconnected'}
                    </Badge>
                </Group>
                <Group gap="sm">
                    <ThemeIcon
                        size="lg"
                        variant="light"
                        color={status.connected ? 'green' : 'gray'}
                    >
                        {connectedViaBle ? <IconBluetooth size={20} /> : <IconUsb size={20} />}
                    </ThemeIcon>
                    <div>
                        <Text size="sm" fw={500}>
                            {status.connected
                                ? `${connectedViaBle ? 'BLE' : 'Port'}: ${status.port ?? 'unknown'}`
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
                <Group grow>
                    <Button
                        variant={connectedViaUsb ? 'light' : 'filled'}
                        color={connectedViaUsb ? 'red' : 'green'}
                        leftSection={
                            connectedViaUsb
                                ? <IconPlugConnectedX size={16} />
                                : <IconPlugConnected size={16} />
                        }
                        onClick={handleToggleUsb}
                        loading={loading}
                        disabled={status.recording || bleConnected}
                    >
                        {connectedViaUsb ? 'Disconnect' : 'USB'}
                    </Button>
                    <Tooltip
                        label={bleUnsupportedReason}
                        disabled={bleSupported}
                        multiline
                        w={250}
                    >
                        <Button
                            variant={connectedViaBle ? 'light' : 'filled'}
                            color={connectedViaBle ? 'red' : 'blue'}
                            leftSection={<IconBluetooth size={16} />}
                            onClick={handleToggleBle}
                            loading={bleLoading}
                            disabled={!bleSupported || status.recording || connectedViaUsb}
                        >
                            {connectedViaBle ? 'Disconnect' : 'Bluetooth'}
                        </Button>
                    </Tooltip>
                </Group>
            </Stack>
        </Card>
    );
}
