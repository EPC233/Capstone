import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Text,
    Box,
    Stack,
    Button,
    Loader,
    Alert,
} from '@mantine/core';
import { IconArrowLeft, IconAlertCircle } from '@tabler/icons-react';
import {
    getSession,
    updateSession,
    deleteSession,
    createSet,
    deleteSet,
    updateSet,
    analyzeAccelerometerData,
    type Session,
    type WorkoutSet,
    type RepInfo,
    type AnalysisResult,
    type UpdateSessionData,
    type UpdateSetData,
} from '../../services/sessions';
import { useSerialStatus } from '../../contexts/SerialStatusContext';
import {
    startRecording,
    stopRecording,
    type AccelDataPoint,
} from '../../services/livedata';
import {
    isBleConnected,
    startBleRecording,
    stopBleRecording,
} from '../../services/bluetooth';
import SessionHeader from '../../components/sessions/SessionHeader';
import SessionInfoCard from '../../components/sessions/SessionInfoCard';
import ActiveSetCard, { type SetComparison } from '../../components/sessions/ActiveSetCard';
import SetDetailsCard from '../../components/sessions/SetDetailsCard';


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

    // Track user-selected active set (null = default to most recent)
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);

    // Track which set is being hovered in SetDetailsCard for comparison
    const [hoveredSetId, setHoveredSetId] = useState<number | null>(null);

    // Stable callback for LiveAccelChart – updates liveAz on each data point
    const handleLiveData = useMemo(
        () => (point: AccelDataPoint) => setLiveAz(point.az_world),
        [],
    );

    // Reset liveAz when recording stops
    useEffect(() => {
        if (!serialStatus.recording) setLiveAz(null);
    }, [serialStatus.recording]);

    // Derive active set: user-selected or most recent by set_number
    const lastSet: WorkoutSet | null = session?.sets?.length
        ? (selectedSetId != null
            ? session.sets.find((s) => s.id === selectedSetId) ?? null
            : [...session.sets].sort((a, b) => b.set_number - a.set_number)[0] ?? null)
        : null;

    // Compute comparison between active set and hovered set
    const setComparison: SetComparison | null = useMemo(() => {
        if (!hoveredSetId || !lastSet || hoveredSetId === lastSet.id) return null;
        const hoveredSet = session?.sets?.find((s) => s.id === hoveredSetId);
        if (!hoveredSet) return null;

        function avgField(reps: WorkoutSet['rep_details'], getter: (r: RepInfo) => number | null | undefined): number | null {
            if (!reps?.length) return null;
            const vals = reps.map(getter).filter((v): v is number => v != null);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }

        const activeReps = lastSet!.rep_details ?? [];
        const hoveredReps = hoveredSet.rep_details ?? [];

        const activeAvgRom = avgField(activeReps, (r) => r.rom_cm);
        const hoveredAvgRom = avgField(hoveredReps, (r) => r.rom_cm);
        const activeAvgRestTop = avgField(activeReps, (r) => r.rest_at_top_seconds);
        const hoveredAvgRestTop = avgField(hoveredReps, (r) => r.rest_at_top_seconds);
        const activeAvgRestBottom = avgField(activeReps, (r) => r.rest_at_bottom_seconds);
        const hoveredAvgRestBottom = avgField(hoveredReps, (r) => r.rest_at_bottom_seconds);
        const activeAvgVelUp = avgField(activeReps, (r) => r.concentric?.peak_velocity);
        const hoveredAvgVelUp = avgField(hoveredReps, (r) => r.concentric?.peak_velocity);
        const activeAvgVelDown = avgField(activeReps, (r) => r.eccentric?.peak_velocity);
        const hoveredAvgVelDown = avgField(hoveredReps, (r) => r.eccentric?.peak_velocity);

        function diff(a: number | null, b: number | null): number | null {
            return a != null && b != null ? a - b : null;
        }

        return {
            hoveredSetName: hoveredSet.name || `Set ${hoveredSet.set_number}`,
            avgRomDiff: diff(activeAvgRom, hoveredAvgRom),
            avgRestTopDiff: diff(activeAvgRestTop, hoveredAvgRestTop),
            avgRestBottomDiff: diff(activeAvgRestBottom, hoveredAvgRestBottom),
            avgVelUpDiff: diff(activeAvgVelUp, hoveredAvgVelUp),
            avgVelDownDiff: diff(activeAvgVelDown, hoveredAvgVelDown),
        };
    }, [hoveredSetId, lastSet, session?.sets]);

    // Handle toggle recording (start / stop)
    async function handleToggleRecording() {
        if (!session) return;
        try {
            setActionLoading('record');
            setError(null);

            if (serialStatus.recording) {
                // ── Stop recording ──
                if (isBleConnected()) {
                    await stopBleRecording(session.id, recordingSetId ?? undefined);
                } else {
                    await stopRecording(session.id, recordingSetId ?? undefined);
                }
                setRecordingSetId(null);
                await loadSession();
            } else {
                // ── Start recording ──
                if (isBleConnected()) {
                    startBleRecording();
                } else {
                    await startRecording();
                }
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
                if (isBleConnected()) {
                    await stopBleRecording(session.id, recordingSetId ?? undefined);
                } else {
                    await stopRecording(session.id, recordingSetId ?? undefined);
                }
                setRecordingSetId(null);
                await loadSession();
            } else {
                // Start recording, remembering which set to target on stop
                setRecordingSetId(setId);
                if (isBleConnected()) {
                    startBleRecording();
                } else {
                    await startRecording();
                }
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

    // Handle update set (name, description, weight)
    async function handleUpdateSet(setId: number, data: UpdateSetData) {
        try {
            setError(null);
            await updateSet(setId, data);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update set');
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

    // Look up the set that owns a given accelerometer data ID
    function findSetByDataId(dataId: number): WorkoutSet | undefined {
        return session?.sets?.find((s) => s.accelerometer_data?.id === dataId);
    }

    // Update local session rep_details for a set after analysis (avoids full reload)
    function updateSetRepDetails(dataId: number, reps: RepInfo[]) {
        setSession((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                sets: prev.sets?.map((s) =>
                    s.accelerometer_data?.id === dataId ? { ...s, rep_details: reps } : s,
                ),
            };
        });
    }

    // Handle analyze accelerometer data
    async function handleAnalyze(dataId: number) {
        // Toggle visibility if already loaded
        if (analyses[dataId]) {
            setAnalysisOpen((prev) => ({ ...prev, [dataId]: !prev[dataId] }));
            return;
        }

        // Seed weight from the set's weight_kg if not already set by the user
        const setWeight = findSetByDataId(dataId)?.weight_kg ?? 0;
        if (weightKg[dataId] === undefined && setWeight) {
            setWeightKg((prev) => ({ ...prev, [dataId]: setWeight }));
        }

        try {
            setAnalysisLoading((prev) => ({ ...prev, [dataId]: true }));
            setError(null);
            const romThreshold = minRomCm[dataId] ?? 15.0;
            const restSens = restSensitivity[dataId] ?? 1.2;
            const weight = weightKg[dataId] ?? setWeight;
            const result = await analyzeAccelerometerData(dataId, { min_rom_cm: romThreshold, rest_sensitivity: restSens, weight_kg: weight });
            setAnalyses((prev) => ({ ...prev, [dataId]: result }));
            setAnalysisOpen((prev) => ({ ...prev, [dataId]: true }));
            updateSetRepDetails(dataId, result.reps);
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
            const romThreshold = minRomCm[dataId] ?? 15.0;
            const restSens = restSensitivity[dataId] ?? 1.2;
            const setWeight = findSetByDataId(dataId)?.weight_kg ?? 0;
            const weight = weightKg[dataId] ?? setWeight;
            const result = await analyzeAccelerometerData(dataId, { min_rom_cm: romThreshold, rest_sensitivity: restSens, weight_kg: weight });
            setAnalyses((prev) => ({ ...prev, [dataId]: result }));
            updateSetRepDetails(dataId, result.reps);
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

    // Callbacks for analysis parameter changes
    function handleMinRomCmChange(dataId: number, value: number) {
        setMinRomCm((prev) => ({ ...prev, [dataId]: value }));
    }
    function handleRestSensitivityChange(dataId: number, value: number) {
        setRestSensitivity((prev) => ({ ...prev, [dataId]: value }));
    }
    function handleWeightKgChange(dataId: number, value: number) {
        setWeightKg((prev) => ({ ...prev, [dataId]: value }));
    }
    function handleCloseAllAnalysis() {
        setAnalysisOpen((prev) => {
            const next: Record<number, boolean> = {};
            for (const key of Object.keys(prev)) next[Number(key)] = false;
            return next;
        });
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
                    <SessionHeader
                        session={session}
                        editing={editing}
                        editData={editData}
                        editLoading={editLoading}
                        actionLoading={actionLoading}
                        onNavigateBack={() => navigate('/sessions')}
                        onStartEditing={startEditing}
                        onCancelEditing={cancelEditing}
                        onSaveEdit={handleSaveEdit}
                        onEditDataChange={setEditData}
                        onDeleteSession={handleDeleteSession}
                    />

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

                    <SessionInfoCard session={session} editing={editing} />

                    <ActiveSetCard
                        serialStatus={serialStatus}
                        lastSet={lastSet}
                        liveAz={liveAz}
                        actionLoading={actionLoading}
                        comparison={setComparison}
                        onToggleRecording={handleToggleRecording}
                        onCreateNewSet={handleCreateNewSet}
                        onLiveData={handleLiveData}
                        onUpdateSet={handleUpdateSet}
                    />

                    <SetDetailsCard
                        sets={session.sets || []}
                        serialStatus={serialStatus}
                        recordingSetId={recordingSetId}
                        activeSetId={lastSet?.id ?? null}
                        actionLoading={actionLoading}
                        analyses={analyses}
                        analysisOpen={analysisOpen}
                        analysisLoading={analysisLoading}
                        minRomCm={minRomCm}
                        restSensitivity={restSensitivity}
                        weightKg={weightKg}
                        onRecordToSet={handleRecordToSet}
                        onSelectSet={setSelectedSetId}
                        onAnalyze={handleAnalyze}
                        onReanalyze={handleReanalyze}
                        onDeleteSet={handleDeleteSet}
                        onMinRomCmChange={handleMinRomCmChange}
                        onRestSensitivityChange={handleRestSensitivityChange}
                        onWeightKgChange={handleWeightKgChange}
                        onCloseAllAnalysis={handleCloseAllAnalysis}
                        onSetHover={setHoveredSetId}
                        onSetHoverEnd={() => setHoveredSetId(null)}
                    />
                </Stack>
            </Container>
        </Box>
    );
}
