import { useState } from 'react';
import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    Badge,
    ActionIcon,
    Divider,
    TextInput,
    Textarea,
    NumberInput,
} from '@mantine/core';
import {
    IconActivity,
    IconPlayerRecord,
    IconPlayerStop,
    IconPlus,
    IconChartLine,
    IconDownload,
    IconEdit,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import type { WorkoutSet } from '../../services/sessions';
import type { UpdateSetData } from '../../services/sessions';
import type { SerialStatus } from '../../services/livedata';
import type { AccelDataPoint } from '../../services/livedata';
import LiveAccelChart from './LiveAccelChart';
import { formatDate, formatFileSize, getDownloadUrl } from './sessionUtils';

export interface SetComparison {
    hoveredSetName: string;
    avgRomDiff: number | null;       // cm, positive = active is higher
    avgRestTopDiff: number | null;    // seconds
    avgRestBottomDiff: number | null; // seconds
    avgVelUpDiff: number | null;      // m/s (concentric peak)
    avgVelDownDiff: number | null;    // m/s (eccentric peak)
}

interface ActiveSetCardProps {
    serialStatus: SerialStatus;
    lastSet: WorkoutSet | null;
    liveAz: number | null;
    actionLoading: string | null;
    analysisLoading: Record<number, boolean>;
    comparison: SetComparison | null;
    onToggleRecording: () => void;
    onCreateNewSet: () => void;
    onAnalyze: (dataId: number) => void;
    onLiveData: (point: AccelDataPoint) => void;
    onUpdateSet?: (setId: number, data: UpdateSetData) => Promise<void>;
}

function ComparisonIndicator({ diff, unit, label }: { diff: number | null; unit: string; label: string }) {
    const color = diff != null && diff > 0 ? 'green' : diff != null && diff < 0 ? 'red' : 'dimmed';
    const sign = diff != null && diff > 0 ? '+' : '';
    return (
        <Group gap={4}>
            <Text size="sm" c="dimmed">{label}:</Text>
            <Text size="sm" fw={600} c={color}>
                {diff != null ? `${sign}${diff.toFixed(2)} ${unit}` : '—'}
            </Text>
        </Group>
    );
}

export default function ActiveSetCard({
    serialStatus,
    lastSet,
    liveAz,
    actionLoading,
    analysisLoading,
    comparison,
    onToggleRecording,
    onCreateNewSet,
    onAnalyze,
    onLiveData,
    onUpdateSet,
}: ActiveSetCardProps) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editWeight, setEditWeight] = useState<number | string>('');
    const [saving, setSaving] = useState(false);

    function startEditing() {
        if (!lastSet) return;
        setEditName(lastSet.name ?? '');
        setEditDescription(lastSet.description ?? '');
        setEditWeight(lastSet.weight_kg ?? '');
        setEditing(true);
    }

    function cancelEditing() {
        setEditing(false);
    }

    async function saveEdit() {
        if (!lastSet || !onUpdateSet) return;
        try {
            setSaving(true);
            await onUpdateSet(lastSet.id, {
                name: editName.trim() || null,
                description: editDescription.trim() || null,
                weight_kg: editWeight === '' ? null : Number(editWeight),
            });
            setEditing(false);
        } finally {
            setSaving(false);
        }
    }
    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <IconActivity size={20} />
                        <Title order={4}>Active Set</Title>
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
                                serialStatus.recording ? (
                                    <IconPlayerStop size={16} />
                                ) : (
                                    <IconPlayerRecord size={16} />
                                )
                            }
                            size="compact-sm"
                            onClick={onToggleRecording}
                            loading={actionLoading === 'record'}
                            disabled={!serialStatus.connected}
                        >
                            {serialStatus.recording ? 'Stop' : 'Record'}
                        </Button>
                        <Button
                            color="green"
                            leftSection={<IconPlus size={16} />}
                            size="compact-sm"
                            onClick={onCreateNewSet}
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
                            onData={onLiveData}
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
                    editing ? (
                        <Stack gap="sm">
                            <TextInput
                                label="Name"
                                placeholder="e.g. Warm-up set"
                                value={editName}
                                onChange={(e) => setEditName(e.currentTarget.value)}
                            />
                            <Textarea
                                label="Description"
                                placeholder="Notes about this set"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.currentTarget.value)}
                                autosize
                                minRows={2}
                                maxRows={4}
                            />
                            <NumberInput
                                label="Weight (kg)"
                                placeholder="0"
                                value={editWeight}
                                onChange={setEditWeight}
                                min={0}
                                decimalScale={2}
                            />
                            <Group justify="flex-end" gap="xs">
                                <Button
                                    variant="subtle"
                                    size="compact-sm"
                                    leftSection={<IconX size={14} />}
                                    onClick={cancelEditing}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="compact-sm"
                                    leftSection={<IconCheck size={14} />}
                                    onClick={saveEdit}
                                    loading={saving}
                                >
                                    Save
                                </Button>
                            </Group>
                        </Stack>
                    ) : (
                        <>
                        <Group justify="space-between" align="center">
                            <Stack gap={4}>
                                <Text fw={500}>
                                    {lastSet.name || `Set ${lastSet.set_number}`}
                                </Text>
                                {lastSet.weight_kg != null && (
                                    <Text size="sm" c="blue">
                                        {lastSet.weight_kg} kg
                                    </Text>
                                )}
                                <Text size="sm" c="dimmed">
                                    {lastSet.accelerometer_data
                                        ? `${formatFileSize(lastSet.accelerometer_data.file_size)} · `
                                        : 'Empty · '}
                                    {formatDate(lastSet.created_at)}
                                </Text>
                                {lastSet.description && (
                                    <Text size="sm">{lastSet.description}</Text>
                                )}
                            </Stack>
                            <Group gap="xs">
                                {onUpdateSet && (
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={startEditing}
                                        title="Edit set"
                                    >
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                )}
                            </Group>
                        </Group>
                        <div style={{ visibility: comparison ? 'visible' : 'hidden' }}>
                            <Divider label={comparison ? `vs ${comparison.hoveredSetName}` : '\u00A0'} labelPosition="center" />
                            <Stack gap={4}>
                                <ComparisonIndicator diff={comparison?.avgRomDiff ?? null} unit="cm" label="Avg ROM" />
                                <ComparisonIndicator diff={comparison?.avgRestTopDiff ?? null} unit="s" label="Avg Rest (Top)" />
                                <ComparisonIndicator diff={comparison?.avgRestBottomDiff ?? null} unit="s" label="Avg Rest (Bottom)" />
                                <ComparisonIndicator diff={comparison?.avgVelUpDiff ?? null} unit="m/s" label="Peak Vel Up" />
                                <ComparisonIndicator diff={comparison?.avgVelDownDiff ?? null} unit="m/s" label="Peak Vel Down" />
                            </Stack>
                        </div>
                        </>
                    )
                ) : (
                    <Text c="dimmed" ta="center" py="md">
                        No sets recorded yet.
                    </Text>
                )}
            </Stack>
        </Card>
    );
}
