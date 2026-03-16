import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Box,
    Stack,
    Card,
    Group,
    Button,
    Loader,
    Alert,
    Badge,
    ActionIcon,
    Table,
    Anchor,
    Divider,
    Collapse,
    Slider,
    Tooltip,
    NumberInput,
    TextInput,
    Textarea,
    Select,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconTrash,
    IconAlertCircle,
    IconCalendar,
    IconBarbell,
    IconPhoto,
    IconDownload,
    IconChartLine,
    IconRefresh,
    IconEdit,
    IconCheck,
    IconX,
    IconActivity,
    IconPlus,
    IconPlayerRecord,
    IconPlayerStop,
    IconClipboardText,
} from '@tabler/icons-react';
import {
    getSession,
    updateSession,
    deleteSession,
    createSet,
    deleteSet,
    deleteGraphImage,
    analyzeAccelerometerData,
    type Session,
    type WorkoutSet,
    type GraphImage,
    type AnalysisResult,
    type UpdateSessionData,
} from '../../services/sessions';
import { getApiUrl } from '../../utils/api';
import AccelAnalysisChart from '../../components/sessions/AccelAnalysisChart';
import LiveAccelChart from '../../components/sessions/LiveAccelChart';
import { useSerialStatus } from '../../contexts/SerialStatusContext';
import {
    startRecording,
    stopRecording,
    type AccelDataPoint,
} from '../../services/livedata';

const SESSION_TYPES: Record<string, string> = {
    bench_press: 'Bench Press',
    deadlift: 'Deadlift',
    squat: 'Squat',
};

const SESSION_TYPE_OPTIONS = [
    { value: 'bench_press', label: 'Bench Press' },
    { value: 'deadlift', label: 'Deadlift' },
    { value: 'squat', label: 'Squat' },
];

export default function SessionDetailPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { status: serialStatus } = useSerialStatus();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Edit state
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState<UpdateSessionData>({});
    const [editLoading, setEditLoading] = useState(false);

    // Analysis state: keyed by accelerometer data ID
    const [analyses, setAnalyses] = useState<Record<number, AnalysisResult>>({});
    const [analysisOpen, setAnalysisOpen] = useState<Record<number, boolean>>({});
    const [analysisLoading, setAnalysisLoading] = useState<Record<number, boolean>>({});
    const [minRomCm, setMinRomCm] = useState<Record<number, number>>({});
    const [restSensitivity, setRestSensitivity] = useState<Record<number, number>>({});
    const [weightKg, setWeightKg] = useState<Record<number, number>>({});

    // Live z-acceleration for recording mode
    const [liveAz, setLiveAz] = useState<number | null>(null);

    // Track which set we are recording into (null = default / active-set behavior)
    const [recordingSetId, setRecordingSetId] = useState<number | null>(null);

    // Stable callback for LiveAccelChart – updates liveAz on each data point
    const handleLiveData = useMemo(
        () => (point: AccelDataPoint) => setLiveAz(point.az_world),
        [],
    );

    // Reset liveAz when recording stops
    useEffect(() => {
        if (!serialStatus.recording) setLiveAz(null);
    }, [serialStatus.recording]);

    // Derive the most recent set (by set_number)
    const lastSet: WorkoutSet | null = session?.sets?.length
        ? [...session.sets].sort((a, b) => b.set_number - a.set_number)[0] ?? null
        : null;

    // Handle toggle recording (start / stop)
    async function handleToggleRecording() {
        if (!session) return;
        try {
            setActionLoading('record');
            setError(null);

            if (serialStatus.recording) {
                // ── Stop recording ──
                // The backend will reuse the last empty set or create a new one
                await stopRecording(session.id, recordingSetId ?? undefined);
                setRecordingSetId(null);
                await loadSession();
            } else {
                // ── Start recording ──
                await startRecording();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Recording failed');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle toggle recording for a specific set (overwrite)
    async function handleRecordToSet(setId: number) {
        if (!session) return;
        try {
            setActionLoading('record');
            setError(null);

            if (serialStatus.recording) {
                // Already recording – stop and save to the tracked set
                await stopRecording(session.id, recordingSetId ?? undefined);
                setRecordingSetId(null);
                await loadSession();
            } else {
                // Start recording, remembering which set to target on stop
                setRecordingSetId(setId);
                await startRecording();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Recording failed');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle create new blank set
    async function handleCreateNewSet() {
        if (!session) return;
        try {
            setActionLoading('new-set');
            setError(null);
            await createSet(session.id);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create new set');
        } finally {
            setActionLoading(null);
        }
    }

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px',
    };

    // Load session
    const loadSession = useCallback(async () => {
        if (!sessionId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await getSession(parseInt(sessionId, 10));
            setSession(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load session');
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    // Start editing
    function startEditing() {
        if (!session) return;
        setEditData({
            name: session.name,
            description: session.description || '',
            session_type: session.session_type || '',
        });
        setEditing(true);
    }

    // Cancel editing
    function cancelEditing() {
        setEditing(false);
        setEditData({});
    }

    // Save edits
    async function handleSaveEdit() {
        if (!session) return;
        if (!editData.name?.trim()) {
            setError('Session name is required');
            return;
        }
        try {
            setEditLoading(true);
            setError(null);
            const updated = await updateSession(session.id, {
                name: editData.name.trim(),
                description: editData.description?.trim() || undefined,
                session_type: editData.session_type || undefined,
            });
            setSession(updated);
            setEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update session');
        } finally {
            setEditLoading(false);
        }
    }

    // Handle delete session
    async function handleDeleteSession() {
        if (!session) return;

        try {
            setActionLoading('session');
            await deleteSession(session.id);
            navigate('/sessions');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete session');
            setActionLoading(null);
        }
    }

    // Handle analyze accelerometer data
    async function handleAnalyze(dataId: number) {
        // Toggle visibility if already loaded
        if (analyses[dataId]) {
            setAnalysisOpen((prev) => ({ ...prev, [dataId]: !prev[dataId] }));
            return;
        }

        try {
            setAnalysisLoading((prev) => ({ ...prev, [dataId]: true }));
            setError(null);
            const romThreshold = minRomCm[dataId] ?? 3.0;
            const restSens = restSensitivity[dataId] ?? 0.5;
            const weight = weightKg[dataId] ?? 0;
            const result = await analyzeAccelerometerData(dataId, { min_rom_cm: romThreshold, rest_sensitivity: restSens, weight_kg: weight });
            setAnalyses((prev) => ({ ...prev, [dataId]: result }));
            setAnalysisOpen((prev) => ({ ...prev, [dataId]: true }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Analysis failed');
        } finally {
            setAnalysisLoading((prev) => ({ ...prev, [dataId]: false }));
        }
    }

    // Re-analyze with updated min_rom_cm
    async function handleReanalyze(dataId: number) {
        try {
            setAnalysisLoading((prev) => ({ ...prev, [dataId]: true }));
            setError(null);
            const romThreshold = minRomCm[dataId] ?? 3.0;
            const restSens = restSensitivity[dataId] ?? 0.5;
            const weight = weightKg[dataId] ?? 0;
            const result = await analyzeAccelerometerData(dataId, { min_rom_cm: romThreshold, rest_sensitivity: restSens, weight_kg: weight });
            setAnalyses((prev) => ({ ...prev, [dataId]: result }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Re-analysis failed');
        } finally {
            setAnalysisLoading((prev) => ({ ...prev, [dataId]: false }));
        }
    }

    // Handle delete set
    async function handleDeleteSet(setId: number) {
        try {
            setActionLoading(`set-${setId}`);
            await deleteSet(setId);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete set');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle delete graph image
    async function handleDeleteGraphImage(imageId: number) {
        try {
            setActionLoading(`graph-${imageId}`);
            await deleteGraphImage(imageId);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete image');
        } finally {
            setActionLoading(null);
        }
    }

    // Format date
    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    // Format file size
    function formatFileSize(bytes?: number) {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Get download URL
    function getDownloadUrl(filePath: string) {
        // Extract relative path from the file_path
        const relativePath = filePath.replace('/app/uploads/', '');
        return `${getApiUrl().replace('/api', '')}/uploads/${relativePath}`;
    }

    if (loading) {
        return (
            <Box style={layoutWrapperStyles}>
                <Container size="md" py="xl">
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text c="dimmed">Loading session...</Text>
                    </Stack>
                </Container>
            </Box>
        );
    }

    if (!session) {
        return (
            <Box style={layoutWrapperStyles}>
                <Container size="md" py="xl">
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="Session not found"
                        color="red"
                    >
                        The requested session could not be found.
                    </Alert>
                    <Button
                        mt="md"
                        leftSection={<IconArrowLeft size={16} />}
                        variant="subtle"
                        onClick={() => navigate('/sessions')}
                    >
                        Back to Sessions
                    </Button>
                </Container>
            </Box>
        );
    }

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="md" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    {/* Back button and header */}
                    <Group justify="space-between" align="flex-start">
                        <Stack gap="xs">
                            <Button
                                leftSection={<IconArrowLeft size={16} />}
                                variant="subtle"
                                onClick={() => navigate('/sessions')}
                                p={0}
                            >
                                Back to Sessions
                            </Button>
                            {editing ? (
                                <Stack gap="sm">
                                    <TextInput
                                        label="Session Name"
                                        value={editData.name || ''}
                                        onChange={(e) =>
                                            setEditData({ ...editData, name: e.currentTarget.value })
                                        }
                                        required
                                        style={{ minWidth: 300 }}
                                    />
                                    <Select
                                        label="Session Type"
                                        placeholder="Select type"
                                        data={SESSION_TYPE_OPTIONS}
                                        value={editData.session_type || null}
                                        onChange={(value) =>
                                            setEditData({ ...editData, session_type: value || '' })
                                        }
                                        clearable
                                        style={{ minWidth: 300 }}
                                    />
                                    <Textarea
                                        label="Description"
                                        placeholder="Optional description..."
                                        value={editData.description || ''}
                                        onChange={(e) =>
                                            setEditData({ ...editData, description: e.currentTarget.value })
                                        }
                                        minRows={2}
                                        style={{ minWidth: 300 }}
                                    />
                                    <Group gap="xs">
                                        <Button
                                            size="sm"
                                            leftSection={<IconCheck size={16} />}
                                            onClick={handleSaveEdit}
                                            loading={editLoading}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="subtle"
                                            leftSection={<IconX size={16} />}
                                            onClick={cancelEditing}
                                        >
                                            Cancel
                                        </Button>
                                    </Group>
                                </Stack>
                            ) : (
                                <Group gap="md" align="center">
                                    <Title order={1}>{session.name}</Title>
                                    {session.session_type && (
                                        <Badge color="blue" size="lg">
                                            {SESSION_TYPES[session.session_type] || session.session_type}
                                        </Badge>
                                    )}
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={startEditing}
                                        title="Edit session"
                                    >
                                        <IconEdit size={18} />
                                    </ActionIcon>
                                </Group>
                            )}
                        </Stack>
                        <Button
                            color="red"
                            variant="outline"
                            leftSection={<IconTrash size={16} />}
                            onClick={handleDeleteSession}
                            loading={actionLoading === 'session'}
                        >
                            Delete Session
                        </Button>
                    </Group>

                    {error && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Error"
                            color="red"
                            withCloseButton
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    {/* Session Info */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconClipboardText size={20} />
                                    <Title order={4}>Session Details</Title>
                                </Group>
                            </Group>
                            {session.description && !editing && (
                                <Text>{session.description}</Text>
                            )}
                            <Group gap="xs">
                                <IconCalendar size={16} color="gray" />
                                <Text size="sm" c="dimmed">
                                    Created: {formatDate(session.created_at)}
                                </Text>
                            </Group>
                            {session.updated_at !== session.created_at && (
                                <Text size="sm" c="dimmed">
                                    Last updated: {formatDate(session.updated_at)}
                                </Text>
                            )}
                        </Stack>
                    </Card>
                    {/* Last Set / Live Z-Accel */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconActivity size={20} />
                                    <Title order={4}>
                                        Active Set
                                    </Title>
                                    {serialStatus.recording && (
                                        <Badge color="red" variant="dot" size="lg">
                                            Live
                                        </Badge>
                                    )}
                                </Group>
                                <Group gap="xs">
                                    <Button
                                        color={serialStatus.recording ? 'gray' : 'red'}
                                        variant={serialStatus.recording ? 'light' : 'filled'}
                                        leftSection={
                                            serialStatus.recording
                                                ? <IconPlayerStop size={16} />
                                                : <IconPlayerRecord size={16} />
                                        }
                                        size="compact-sm"
                                        onClick={handleToggleRecording}
                                        loading={actionLoading === 'record'}
                                        disabled={!serialStatus.connected}
                                    >
                                        {serialStatus.recording ? 'Stop' : 'Record'}
                                    </Button>
                                    <Button
                                        color="green"
                                        leftSection={<IconPlus size={16} />}
                                        size="compact-sm"
                                        onClick={handleCreateNewSet}
                                        loading={actionLoading === 'new-set'}
                                    >
                                        New Set
                                    </Button>
                                </Group>

                            </Group>
                            <Divider />
                            {serialStatus.recording ? (
                                <Stack gap="xs">
                                    <LiveAccelChart
                                        active={serialStatus.recording}
                                        height={200}
                                        onData={handleLiveData}
                                    />
                                    <Group justify="space-between" px="xs">
                                        <Text size="sm" c="dimmed">
                                            {liveAz !== null ? `Z: ${liveAz.toFixed(3)} m/s²` : '—'}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                            {serialStatus.recording_samples} samples recorded
                                        </Text>
                                    </Group>
                                </Stack>
                            ) : lastSet ? (
                                <Group justify="space-between" align="center">
                                    <Stack gap={4}>
                                        <Text fw={500}>Set {lastSet.set_number}</Text>
                                        <Text size="sm" c="dimmed">
                                            {lastSet.accelerometer_data
                                                ? `${formatFileSize(lastSet.accelerometer_data.file_size)} · `
                                                : 'Empty · '}
                                            {formatDate(lastSet.created_at)}
                                        </Text>
                                        {lastSet.accelerometer_data?.description && (
                                            <Text size="sm">{lastSet.accelerometer_data.description}</Text>
                                        )}
                                    </Stack>
                                    <Group gap="xs">
                                        {lastSet.accelerometer_data && (
                                            <>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="grape"
                                                    onClick={() => handleAnalyze(lastSet.accelerometer_data!.id)}
                                                    loading={analysisLoading[lastSet.accelerometer_data.id] ?? false}
                                                    title="Analyze"
                                                >
                                                    <IconChartLine size={16} />
                                                </ActionIcon>
                                                <ActionIcon
                                                    component="a"
                                                    href={getDownloadUrl(lastSet.accelerometer_data.file_path)}
                                                    target="_blank"
                                                    variant="subtle"
                                                    color="blue"
                                                    title="Download"
                                                >
                                                    <IconDownload size={16} />
                                                </ActionIcon>
                                            </>
                                        )}
                                    </Group>
                                </Group>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">
                                    No sets recorded yet.
                                </Text>
                            )}
                        </Stack>
                    </Card>

                    {/* Sets */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconBarbell size={20} />
                                    <Title order={4}>Set Details</Title>
                                </Group>
                                <Badge>{session.sets?.length || 0} set(s)</Badge>
                            </Group>
                            <Divider />
                            {session.sets?.length > 0 ? (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Set</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                            <Table.Th>Size</Table.Th>
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Created</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {[...session.sets]
                                            .sort((a, b) => a.set_number - b.set_number)
                                            .map((s: WorkoutSet) => {
                                            const accel = s.accelerometer_data;
                                            const dataId = accel?.id;
                                            return (
                                            <React.Fragment key={s.id}>
                                            <Table.Tr>
                                                <Table.Td>
                                                    <Text fw={500}>
                                                        Set {s.set_number}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={s.status === 'complete' ? 'green' : s.status === 'recording' ? 'red' : 'gray'}
                                                        size="sm"
                                                        variant="light"
                                                    >
                                                        {s.status}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>{accel ? formatFileSize(accel.file_size) : '-'}</Table.Td>
                                                <Table.Td>{accel?.description || '-'}</Table.Td>
                                                <Table.Td>{formatDate(s.created_at)}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <ActionIcon
                                                            color={serialStatus.recording && recordingSetId === s.id ? 'gray' : 'red'}
                                                            variant={serialStatus.recording && recordingSetId === s.id ? 'light' : 'subtle'}
                                                            onClick={() => handleRecordToSet(s.id)}
                                                            loading={actionLoading === 'record' && (recordingSetId === s.id || (!serialStatus.recording && recordingSetId === null))}
                                                            disabled={!serialStatus.connected || (serialStatus.recording && recordingSetId !== s.id)}
                                                            title={serialStatus.recording && recordingSetId === s.id ? 'Stop recording' : 'Record to this set'}
                                                        >
                                                            {serialStatus.recording && recordingSetId === s.id
                                                                ? <IconPlayerStop size={16} />
                                                                : <IconPlayerRecord size={16} />}
                                                        </ActionIcon>
                                                        {accel && dataId && (
                                                            <>
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="grape"
                                                                    onClick={() => handleAnalyze(dataId)}
                                                                    loading={analysisLoading[dataId] ?? false}
                                                                    title="Analyze"
                                                                >
                                                                    <IconChartLine size={16} />
                                                                </ActionIcon>
                                                                <ActionIcon
                                                                    component="a"
                                                                    href={getDownloadUrl(accel.file_path)}
                                                                    target="_blank"
                                                                    variant="subtle"
                                                                    color="blue"
                                                                    title="Download"
                                                                >
                                                                    <IconDownload size={16} />
                                                                </ActionIcon>
                                                            </>
                                                        )}
                                                        <ActionIcon
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleDeleteSet(s.id)}
                                                            loading={actionLoading === `set-${s.id}`}
                                                            title="Delete"
                                                        >
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                            {/* Inline analysis chart */}
                                            {dataId && analyses[dataId] && (
                                                <Table.Tr key={`analysis-${dataId}`}>
                                                    <Table.Td colSpan={6} p={0}>
                                                        <Collapse in={analysisOpen[dataId] ?? false}>
                                                            <Box p="md" style={{ background: 'var(--mantine-color-gray-1)'}}>
                                                                <Group mb="sm" align="flex-end">
                                                                    <Box style={{ flex: 1, maxWidth: 300 }}>
                                                                        <Text size="xs" c="black" mb={4}>
                                                                            Min ROM threshold (cm)
                                                                        </Text>
                                                                        <Slider
                                                                            value={minRomCm[dataId] ?? 3.0}
                                                                            onChange={(val) =>
                                                                                setMinRomCm((prev) => ({
                                                                                    ...prev,
                                                                                    [dataId]: val,
                                                                                }))
                                                                            }
                                                                            min={0}
                                                                            max={20}
                                                                            step={0.5}
                                                                            marks={[
                                                                                { value: 0, label: '0' },
                                                                                { value: 5, label: '5' },
                                                                                { value: 10, label: '10' },
                                                                                { value: 15, label: '15' },
                                                                                { value: 20, label: '20' },
                                                                            ]}
                                                                            label={(val) => `${val} cm`}
                                                                            color="grape"
                                                                            size="sm"
                                                                            styles={{ markLabel: { color: 'black' } }}
                                                                        />
                                                                    </Box>
                                                                    <Box style={{ flex: 1, maxWidth: 300 }}>
                                                                        <Text size="xs" c="black" mb={4}>
                                                                            Rest detection sensitivity
                                                                        </Text>
                                                                        <Slider
                                                                            value={restSensitivity[dataId] ?? 0.5}
                                                                            onChange={(val) =>
                                                                                setRestSensitivity((prev) => ({
                                                                                    ...prev,
                                                                                    [dataId]: val,
                                                                                }))
                                                                            }
                                                                            min={0.1}
                                                                            max={2.0}
                                                                            step={0.1}
                                                                            marks={[
                                                                                { value: 0.1, label: '0.1' },
                                                                                { value: 0.5, label: '0.5' },
                                                                                { value: 1.0, label: '1.0' },
                                                                                { value: 1.5, label: '1.5' },
                                                                                { value: 2.0, label: '2.0' },
                                                                            ]}
                                                                            label={(val) => `${val}`}
                                                                            color="teal"
                                                                            size="sm"
                                                                            styles={{ markLabel: { color: 'black' } }}
                                                                        />
                                                                    </Box>
                                                                    <Box style={{ width: 120 }}>
                                                                        <Text size="xs" c="black" mb={4}>
                                                                            Weight (kg)
                                                                        </Text>
                                                                        <NumberInput
                                                                            value={weightKg[dataId] ?? 0}
                                                                            onChange={(val) =>
                                                                                setWeightKg((prev) => ({
                                                                                    ...prev,
                                                                                    [dataId]: typeof val === 'number' ? val : 0,
                                                                                }))
                                                                            }
                                                                            min={0}
                                                                            max={500}
                                                                            step={0.5}
                                                                            decimalScale={1}
                                                                            size="sm"
                                                                            placeholder="0"
                                                                        />
                                                                    </Box>
                                                                    <Tooltip label="Re-analyze with new threshold">
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            color="grape"
                                                                            size="lg"
                                                                            onClick={() => handleReanalyze(dataId)}
                                                                            loading={analysisLoading[dataId] ?? false}
                                                                        >
                                                                            <IconRefresh size={18} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                                <AccelAnalysisChart analysis={analyses[dataId]!} />
                                                            </Box>
                                                        </Collapse>
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </React.Fragment>
                                            );
                                        })}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">
                                    No sets recorded yet.
                                </Text>
                            )}
                        </Stack>
                    </Card>

                    {/* Graph Images */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconPhoto size={20} />
                                    <Title order={4}>Graph Images</Title>
                                </Group>
                                <Badge>{session.graph_images?.length || 0} image(s)</Badge>
                            </Group>
                            <Divider />
                            {session.graph_images?.length > 0 ? (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>File Name</Table.Th>
                                            <Table.Th>Type</Table.Th>
                                            <Table.Th>Size</Table.Th>
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Uploaded</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {session.graph_images.map((image: GraphImage) => (
                                            <Table.Tr key={image.id}>
                                                <Table.Td>
                                                    <Anchor
                                                        href={getDownloadUrl(image.file_path)}
                                                        target="_blank"
                                                    >
                                                        {image.file_name}
                                                    </Anchor>
                                                </Table.Td>
                                                <Table.Td>{image.image_type || '-'}</Table.Td>
                                                <Table.Td>{formatFileSize(image.file_size)}</Table.Td>
                                                <Table.Td>{image.description || '-'}</Table.Td>
                                                <Table.Td>{formatDate(image.created_at)}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <ActionIcon
                                                            component="a"
                                                            href={getDownloadUrl(image.file_path)}
                                                            target="_blank"
                                                            variant="subtle"
                                                            color="blue"
                                                            title="Download"
                                                        >
                                                            <IconDownload size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleDeleteGraphImage(image.id)}
                                                            loading={actionLoading === `graph-${image.id}`}
                                                            title="Delete"
                                                        >
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">
                                    No graph images uploaded yet.
                                </Text>
                            )}
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}
