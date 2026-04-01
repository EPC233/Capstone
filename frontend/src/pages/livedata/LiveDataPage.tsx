import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container,
    Title,
    Text,
    Box,
    Stack,
    Card,
    Group,
    Button,
    Select,
    Alert,
    Badge,
} from '@mantine/core';
import {
    IconPlugConnected,
    IconPlugConnectedX,
    IconPlayerRecord,
    IconPlayerStop,
    IconAlertCircle,
    IconRefresh,
    IconActivity,
    IconDeviceFloppy,
    IconBluetooth,
    IconUsb,
} from '@tabler/icons-react';
import LiveAccelChart from '../../components/sessions/LiveAccelChart';
import {
    getSerialPorts,
    getSerialStatus,
    connectSerial,
    disconnectSerial,
    startRecording,
    stopRecording,
    type SerialPort,
    type SerialStatus,
    type AccelDataPoint,
} from '../../services/livedata';
import {
    isBluetoothSupported,
    connectBle,
    disconnectBle,
    startBleRecording,
    stopBleRecording,
    getBleStatus,
    onBleStatusChange,
} from '../../services/bluetooth';
import { getSessions, type Session } from '../../services/sessions';

type ConnectionSource = 'usb' | 'ble';

export default function LiveDataPage() {
    // Connection source toggle
    const [source, setSource] = useState<ConnectionSource>('usb');
    const bleSupported = isBluetoothSupported();

    // Connection state
    const [ports, setPorts] = useState<SerialPort[]>([]);
    const [selectedPort, setSelectedPort] = useState<string | null>(null);
    const [bleStatus, setBleStatus] = useState(getBleStatus);
    const [status, setStatus] = useState<SerialStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Live data
    const [latestPoint, setLatestPoint] = useState<AccelDataPoint | null>(null);
    const [sampleCount, setSampleCount] = useState(0);

    // Recording
    const [sessions, setSessions] = useState<Session[]>([]);
    const [saveSessionId, setSaveSessionId] = useState<string | null>(null);
    const [recordingSamples, setRecordingSamples] = useState(0);

    // Derived state — must be before effects that reference them
    const connected = source === 'ble' ? bleStatus.connected : (status?.connected ?? false);
    const recording = source === 'ble' ? bleStatus.recording : (status?.recording ?? false);

    // Keep BLE status in sync
    useEffect(() => {
        return onBleStatusChange(() => setBleStatus(getBleStatus()));
    }, []);

    // ---- Fetch ports & status on mount ----
    const refreshStatus = useCallback(async () => {
        // When using BLE, derive status from the BLE module
        if (source === 'ble') {
            const ble = getBleStatus();
            setBleStatus(ble);
            setStatus({
                connected: ble.connected,
                port: ble.port ?? 'BLE',
                recording: ble.recording,
                recording_samples: ble.recording_samples,
            });
            return;
        }
        try {
            const [portsData, statusData] = await Promise.all([
                getSerialPorts(),
                getSerialStatus(),
            ]);
            setPorts(portsData);
            setStatus(statusData);
            if (statusData.port && !selectedPort) {
                setSelectedPort(statusData.port);
            }
        } catch {
            // Backend may be unreachable
        }
    }, [selectedPort, source]);

    const refreshSessions = useCallback(async () => {
        try {
            const data = await getSessions();
            setSessions(data);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        refreshStatus();
        refreshSessions();
    }, [refreshStatus, refreshSessions]);

    // Stable callback for LiveAccelChart
    const handleChartData = useMemo(
        () => (point: AccelDataPoint) => {
            setLatestPoint(point);
            setSampleCount((c) => c + 1);
        },
        [],
    );


    // Periodically update recording sample count
    useEffect(() => {
        if (!recording) return;
        const interval = setInterval(async () => {
            try {
                if (source === 'ble') {
                    setRecordingSamples(getBleStatus().recording_samples);
                } else {
                    const s = await getSerialStatus();
                    setRecordingSamples(s.recording_samples);
                }
            } catch {
                // ignore
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [recording, source]);

    // ---- Actions ----
    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            if (source === 'ble') {
                const res = await connectBle();
                setSuccess(`Connected via Bluetooth to ${res.port ?? 'BLE device'}`);
                setSampleCount(0);
            } else {
                const res = await connectSerial(selectedPort || undefined);
                if (res.status === 'connected' || res.status === 'already_connected') {
                    setSuccess(`Connected to ${res.port}`);
                    setSampleCount(0);
                } else {
                    setError(res.detail || 'Connection failed');
                }
            }
            await refreshStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            if (source === 'ble') {
                await disconnectBle();
            } else {
                await disconnectSerial();
            }
            setSuccess('Disconnected');
            setSampleCount(0);
            setLatestPoint(null);
            await refreshStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Disconnect failed');
        } finally {
            setLoading(false);
        }
    };

    const handleStartRecording = async () => {
        setError(null);
        try {
            if (source === 'ble') {
                startBleRecording();
            } else {
                await startRecording();
            }
            setRecordingSamples(0);
            await refreshStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start recording');
        }
    };

    const handleStopRecording = async () => {
        setError(null);
        try {
            const sessionId = saveSessionId ? parseInt(saveSessionId, 10) : undefined;
            if (source === 'ble') {
                const res = await stopBleRecording(sessionId);
                const msg = res.saved_to_session
                    ? `Recorded ${res.sample_count} samples (${res.duration_seconds.toFixed(1)}s) — saved to session #${res.saved_to_session}`
                    : `Recorded ${res.sample_count} samples (${res.duration_seconds.toFixed(1)}s)`;
                setSuccess(msg);
            } else {
                const res = await stopRecording(sessionId);
                if (res.status === 'recording_stopped') {
                    const msg = res.saved_to_session
                        ? `Recorded ${res.sample_count} samples (${res.duration_seconds}s) — saved to session #${res.saved_to_session}`
                        : `Recorded ${res.sample_count} samples (${res.duration_seconds}s)`;
                    setSuccess(msg);
                    if (res.save_error) setError(res.save_error);
                } else {
                    setError(res.detail || 'Failed to stop recording');
                }
            }
            await refreshStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to stop recording');
        }
    };

    const handleRefreshPorts = async () => {
        setError(null);
        try {
            const portsData = await getSerialPorts();
            setPorts(portsData);
        } catch {
            setError('Could not fetch serial ports');
        }
    };

    // ---- Render helpers ----

    const portOptions = ports.map((p) => ({
        value: p.device,
        label: `${p.device}${p.is_arduino ? ' (Arduino)' : ''} — ${p.description}`,
    }));

    const sessionOptions = sessions.map((s) => ({
        value: String(s.id),
        label: `#${s.id} — ${s.name}`,
    }));

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between" align="center">
                    <Box>
                        <Title order={2}>Live Sensor Data</Title>
                        <Text c="dimmed" size="sm">
                            Connect to the Arduino via USB or Bluetooth, view real-time data, and record sessions.
                        </Text>
                    </Box>
                    <Badge
                        size="lg"
                        color={connected ? 'green' : 'gray'}
                        variant="filled"
                        leftSection={
                            connected ? (
                                <IconActivity size={14} />
                            ) : (
                                <IconPlugConnectedX size={14} />
                            )
                        }
                    >
                        {connected
                            ? `${source === 'ble' ? 'BLE' : 'USB'}: ${source === 'ble' ? (bleStatus.port ?? 'BLE') : status?.port}`
                            : 'Disconnected'}
                    </Badge>
                </Group>

                {/* Alerts */}
                {error && (
                    <Alert
                        color="red"
                        icon={<IconAlertCircle size={16} />}
                        withCloseButton
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert
                        color="green"
                        withCloseButton
                        onClose={() => setSuccess(null)}
                    >
                        {success}
                    </Alert>
                )}

                {/* Connection Card */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="md">
                        <Title order={4}>Connection</Title>

                        {/* Source toggle */}
                        <Group gap="sm">
                            <Button
                                variant={source === 'usb' ? 'filled' : 'light'}
                                color="green"
                                leftSection={<IconUsb size={16} />}
                                onClick={() => setSource('usb')}
                                disabled={connected}
                            >
                                USB Serial
                            </Button>
                            <Button
                                variant={source === 'ble' ? 'filled' : 'light'}
                                color="blue"
                                leftSection={<IconBluetooth size={16} />}
                                onClick={() => setSource('ble')}
                                disabled={connected || !bleSupported}
                            >
                                Bluetooth
                            </Button>
                        </Group>

                        {/* USB port selector */}
                        {source === 'usb' && (
                            <Group gap="sm" align="flex-end">
                                <Select
                                    label="Serial Port"
                                    placeholder="Select port or auto-detect"
                                    data={portOptions}
                                    value={selectedPort}
                                    onChange={setSelectedPort}
                                    clearable
                                    style={{ flex: 1 }}
                                    disabled={connected}
                                />
                                <Button
                                    variant="subtle"
                                    size="sm"
                                    onClick={handleRefreshPorts}
                                    disabled={connected}
                                    leftSection={<IconRefresh size={16} />}
                                >
                                    Refresh
                                </Button>
                            </Group>
                        )}

                        {/* BLE info */}
                        {source === 'ble' && !connected && (
                            <Text size="sm" c="dimmed">
                                Click Connect to scan for your Bluetooth sensor.
                                Make sure it's powered on and in range.
                            </Text>
                        )}

                        <Group gap="sm">
                            {!connected ? (
                                <Button
                                    onClick={handleConnect}
                                    loading={loading}
                                    leftSection={
                                        source === 'ble'
                                            ? <IconBluetooth size={16} />
                                            : <IconPlugConnected size={16} />
                                    }
                                    color={source === 'ble' ? 'blue' : 'green'}
                                >
                                    Connect{source === 'ble' ? ' Bluetooth' : ''}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleDisconnect}
                                    loading={loading}
                                    leftSection={<IconPlugConnectedX size={16} />}
                                    color="red"
                                    variant="outline"
                                >
                                    Disconnect
                                </Button>
                            )}
                        </Group>
                    </Stack>
                </Card>

                {/* Recording Card — only show when connected */}
                {connected && (
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Title order={4}>Recording</Title>
                                {recording && (
                                    <Badge color="red" variant="filled" size="lg">
                                        REC — {recordingSamples} samples
                                    </Badge>
                                )}
                            </Group>

                            <Select
                                label="Save to Session (optional)"
                                placeholder="Don't save to a session"
                                data={sessionOptions}
                                value={saveSessionId}
                                onChange={setSaveSessionId}
                                clearable
                                disabled={recording}
                                leftSection={<IconDeviceFloppy size={16} />}
                            />

                            <Group gap="sm">
                                {!recording ? (
                                    <Button
                                        onClick={handleStartRecording}
                                        leftSection={<IconPlayerRecord size={16} />}
                                        color="red"
                                    >
                                        Start Recording
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleStopRecording}
                                        leftSection={<IconPlayerStop size={16} />}
                                        color="yellow"
                                    >
                                        Stop Recording
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    </Card>
                )}

                {/* Live Chart */}
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Stack gap="sm">
                        <Group justify="space-between">
                            <Title order={4}>Live Accelerometer</Title>
                            {connected && (
                                <Text size="xs" c="dimmed">
                                    {sampleCount} samples received
                                </Text>
                            )}
                        </Group>
                        <LiveAccelChart
                            active={connected}
                            height={300}
                            onData={handleChartData}
                        />
                    </Stack>
                </Card>

                {/* Latest values */}
                {connected && latestPoint && (
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="sm">
                            Current Values
                        </Title>
                        <Group gap="xl" wrap="wrap">
                            <ValueDisplay
                                label="X (world)"
                                value={latestPoint.ax_world}
                                unit="m/s²"
                                color="blue"
                            />
                            <ValueDisplay
                                label="Y (world)"
                                value={latestPoint.ay_world}
                                unit="m/s²"
                                color="red"
                            />
                            <ValueDisplay
                                label="Z (world)"
                                value={latestPoint.az_world}
                                unit="m/s²"
                                color="green"
                            />
                        </Group>
                    </Card>
                )}

                {/* Help text when disconnected */}
                {!connected && (
                    <Alert color="blue" variant="light">
                        <Text size="sm">
                            <strong>Getting started:</strong>{' '}
                            {source === 'ble'
                                ? 'Make sure your Bluetooth sensor is powered on and in range, then click Connect Bluetooth. The browser will prompt you to pair with the device.'
                                : 'Plug the Arduino into this computer via USB, select the serial port above (or leave blank to auto-detect), then click Connect.'}{' '}
                            Live data will stream automatically once connected.
                        </Text>
                    </Alert>
                )}
            </Stack>
        </Container>
    );
}

// ---- Small helper component ----

function ValueDisplay({
    label,
    value,
    unit,
    color,
}: {
    label: string;
    value: number;
    unit: string;
    color: string;
}) {
    return (
        <Box style={{ minWidth: 120 }}>
            <Text size="xs" c="dimmed">
                {label}
            </Text>
            <Text size="xl" fw={700} c={color}>
                {value.toFixed(3)}
            </Text>
            <Text size="xs" c="dimmed">
                {unit}
            </Text>
        </Box>
    );
}
