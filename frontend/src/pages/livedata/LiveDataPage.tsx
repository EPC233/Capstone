import { useState, useEffect, useRef, useCallback } from 'react';
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
    Paper,
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
} from '@tabler/icons-react';
import {
    getSerialPorts,
    getSerialStatus,
    connectSerial,
    disconnectSerial,
    startRecording,
    stopRecording,
    createLiveDataSocket,
    type SerialPort,
    type SerialStatus,
    type AccelDataPoint,
} from '../../services/livedata';
import { getSessions, type Session } from '../../services/sessions';

// How many samples to keep in the chart buffer
const MAX_CHART_POINTS = 300;

export default function LiveDataPage() {
    // Connection state
    const [ports, setPorts] = useState<SerialPort[]>([]);
    const [selectedPort, setSelectedPort] = useState<string | null>(null);
    const [status, setStatus] = useState<SerialStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Live data
    const [latestPoint, setLatestPoint] = useState<AccelDataPoint | null>(null);
    const [sampleCount, setSampleCount] = useState(0);
    const chartBuffer = useRef<AccelDataPoint[]>([]);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const socketRef = useRef<ReturnType<typeof createLiveDataSocket> | null>(null);
    const animFrameRef = useRef<number>(0);

    // Recording
    const [sessions, setSessions] = useState<Session[]>([]);
    const [saveSessionId, setSaveSessionId] = useState<string | null>(null);
    const [recordingSamples, setRecordingSamples] = useState(0);

    // ---- Fetch ports & status on mount ----
    const refreshStatus = useCallback(async () => {
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
    }, [selectedPort]);

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

    // ---- WebSocket management ----
    const openSocket = useCallback(() => {
        if (socketRef.current) return;
        const sock = createLiveDataSocket();
        socketRef.current = sock;
        sock.onData((point) => {
            setLatestPoint(point);
            setSampleCount((c) => c + 1);
            chartBuffer.current.push(point);
            if (chartBuffer.current.length > MAX_CHART_POINTS) {
                chartBuffer.current = chartBuffer.current.slice(-MAX_CHART_POINTS);
            }
        });
        sock.onClose(() => {
            socketRef.current = null;
        });
        sock.onError(() => {
            socketRef.current = null;
        });
    }, []);

    const closeSocket = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    // Open/close socket when connection status changes
    useEffect(() => {
        if (status?.connected) {
            openSocket();
        } else {
            closeSocket();
        }
        return () => closeSocket();
    }, [status?.connected, openSocket, closeSocket]);

    // ---- Canvas chart rendering ----
    useEffect(() => {
        const draw = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const W = rect.width;
            const H = rect.height;

            // Background
            ctx.fillStyle = '#1a1b1e';
            ctx.fillRect(0, 0, W, H);

            const buf = chartBuffer.current;
            if (buf.length < 2) {
                ctx.fillStyle = '#666';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Waiting for data…', W / 2, H / 2);
                animFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            // We'll plot az_world (primary), ax_world, ay_world
            const channels: { key: keyof AccelDataPoint; color: string; label: string }[] = [
                { key: 'az_world', color: '#40c057', label: 'Z (vertical)' },
                { key: 'ax_world', color: '#228be6', label: 'X' },
                { key: 'ay_world', color: '#fa5252', label: 'Y' },
            ];

            // Auto-scale Y
            let minVal = Infinity;
            let maxVal = -Infinity;
            for (const p of buf) {
                for (const ch of channels) {
                    const v = p[ch.key] as number;
                    if (v < minVal) minVal = v;
                    if (v > maxVal) maxVal = v;
                }
            }
            const yPad = Math.max(Math.abs(maxVal - minVal) * 0.15, 0.5);
            minVal -= yPad;
            maxVal += yPad;

            const xStep = W / (MAX_CHART_POINTS - 1);
            const startIdx = MAX_CHART_POINTS - buf.length;

            // Grid
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5;
            // Zero line
            const zeroY = H - ((0 - minVal) / (maxVal - minVal)) * H;
            ctx.beginPath();
            ctx.moveTo(0, zeroY);
            ctx.lineTo(W, zeroY);
            ctx.stroke();

            // Y-axis labels
            ctx.fillStyle = '#888';
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${maxVal.toFixed(1)} m/s²`, 4, 14);
            ctx.fillText(`${minVal.toFixed(1)} m/s²`, 4, H - 4);
            ctx.fillText('0', 4, zeroY - 4);

            // Draw each channel
            for (const ch of channels) {
                ctx.strokeStyle = ch.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < buf.length; i++) {
                    const x = (startIdx + i) * xStep;
                    const point = buf[i];
                    if (!point) continue;
                    const v = point[ch.key] as number;
                    const y = H - ((v - minVal) / (maxVal - minVal)) * H;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // Legend
            let lx = W - 140;
            const ly = 14;
            for (const ch of channels) {
                ctx.fillStyle = ch.color;
                ctx.fillRect(lx, ly - 8, 12, 3);
                ctx.fillStyle = '#ccc';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(ch.label, lx + 16, ly);
                lx += 0; // stack vertically
            }
            // Redo legend vertically
            ctx.clearRect(W - 130, 2, 128, channels.length * 16 + 4);
            ctx.fillStyle = 'rgba(26,27,30,0.85)';
            ctx.fillRect(W - 130, 2, 128, channels.length * 16 + 4);
            for (let ci = 0; ci < channels.length; ci++) {
                const ch = channels[ci];
                if (!ch) continue;
                const yPos = 16 + ci * 16;
                ctx.fillStyle = ch.color;
                ctx.fillRect(W - 124, yPos - 6, 14, 3);
                ctx.fillStyle = '#ccc';
                ctx.font = '11px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(ch.label, W - 106, yPos);
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    // Periodically update recording sample count
    useEffect(() => {
        if (!status?.recording) return;
        const interval = setInterval(async () => {
            try {
                const s = await getSerialStatus();
                setRecordingSamples(s.recording_samples);
            } catch {
                // ignore
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [status?.recording]);

    // ---- Actions ----
    const handleConnect = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await connectSerial(selectedPort || undefined);
            if (res.status === 'connected' || res.status === 'already_connected') {
                setSuccess(`Connected to ${res.port}`);
                chartBuffer.current = [];
                setSampleCount(0);
            } else {
                setError(res.detail || 'Connection failed');
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
        closeSocket();
        try {
            await disconnectSerial();
            setSuccess('Disconnected');
            chartBuffer.current = [];
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
            await startRecording();
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
    const connected = status?.connected ?? false;
    const recording = status?.recording ?? false;

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
                            Connect to the Arduino, view real-time accelerometer data, and record sessions.
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
                        {connected ? `Connected (${status?.port})` : 'Disconnected'}
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

                        <Group gap="sm">
                            {!connected ? (
                                <Button
                                    onClick={handleConnect}
                                    loading={loading}
                                    leftSection={<IconPlugConnected size={16} />}
                                    color="green"
                                >
                                    Connect
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
                        <Paper
                            radius="md"
                            style={{
                                overflow: 'hidden',
                                background: '#1a1b1e',
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                style={{
                                    width: '100%',
                                    height: 300,
                                    display: 'block',
                                }}
                            />
                        </Paper>
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
                            <strong>Getting started:</strong> Plug the Arduino into this computer
                            via USB, select the serial port above (or leave blank to auto-detect),
                            then click <em>Connect</em>. Live data will stream automatically once connected.
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
