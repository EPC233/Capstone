import React, { useRef, useCallback } from 'react';
import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Badge,
    ActionIcon,
    Table,
    Divider,
    ScrollArea,
} from '@mantine/core';
import {
    IconBarbell,
    IconChartLine,
    IconDownload,
    IconTrash,
    IconPlayerRecord,
    IconPlayerStop,
    IconX,
} from '@tabler/icons-react';
import type { WorkoutSet, AnalysisResult } from '../../services/sessions';
import type { SerialStatus } from '../../services/livedata';
import SetAnalysisPanel from './SetAnalysisPanel';
import { formatDate, getDownloadUrl } from './sessionUtils';

interface SetDetailsCardProps {
    sets: WorkoutSet[];
    serialStatus: SerialStatus;
    recordingSetId: number | null;
    activeSetId: number | null;
    actionLoading: string | null;
    analyses: Record<number, AnalysisResult>;
    analysisOpen: Record<number, boolean>;
    analysisLoading: Record<number, boolean>;
    minRomCm: Record<number, number>;
    restSensitivity: Record<number, number>;
    weightKg: Record<number, number>;
    onRecordToSet: (setId: number) => void;
    onSelectSet: (setId: number | null) => void;
    onAnalyze: (dataId: number) => void;
    onReanalyze: (dataId: number) => void;
    onDeleteSet: (setId: number) => void;
    onMinRomCmChange: (dataId: number, value: number) => void;
    onRestSensitivityChange: (dataId: number, value: number) => void;
    onWeightKgChange: (dataId: number, value: number) => void;
    onCloseAllAnalysis?: () => void;
    onSetHover?: (setId: number) => void;
    onSetHoverEnd?: () => void;
}

export default function SetDetailsCard({
    sets,
    serialStatus,
    recordingSetId,
    activeSetId,
    actionLoading,
    analyses,
    analysisOpen,
    analysisLoading,
    minRomCm,
    restSensitivity,
    weightKg,
    onRecordToSet,
    onSelectSet,
    onAnalyze,
    onReanalyze,
    onDeleteSet,
    onMinRomCmChange,
    onRestSensitivityChange,
    onWeightKgChange,
    onCloseAllAnalysis,
    onSetHover,
    onSetHoverEnd,
}: SetDetailsCardProps) {
    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleClick = useCallback((setId: number) => {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        clickTimer.current = setTimeout(() => {
            onSelectSet(activeSetId === setId ? null : setId);
            clickTimer.current = null;
        }, 200);
    }, [activeSetId, onSelectSet]);

    const handleDoubleClick = useCallback((dataId: number | undefined) => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
        }
        if (dataId) onAnalyze(dataId);
    }, [onAnalyze]);

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <IconBarbell size={20} />
                        <Title order={4}>Set Details</Title>
                    </Group>
                    <Group gap="xs">
                        {Object.values(analysisOpen).some(Boolean) && (
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={onCloseAllAnalysis}
                                title="Close all analysis panels"
                            >
                                <IconX size={16} />
                            </ActionIcon>
                        )}
                        <Badge>{sets.length || 0} set(s)</Badge>
                    </Group>
                </Group>
                <Divider />
                {sets.length > 0 ? (
                    <ScrollArea type="auto">
                    <Table striped highlightOnHover style={{ minWidth: 650 }}>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Set</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Weight</Table.Th>
                                <Table.Th>Description</Table.Th>
                                <Table.Th>Created</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {[...sets]
                                .sort((a, b) => a.set_number - b.set_number)
                                .map((s: WorkoutSet, index: number, sortedSets: WorkoutSet[]) => {
                                    const accel = s.accelerometer_data;
                                    const dataId = accel?.id;
                                    const isLast = index === sortedSets.length - 1;
                                    return (
                                        <React.Fragment key={s.id}>
                                            <Table.Tr
                                                onClick={() => handleClick(s.id)}
                                                onDoubleClick={() => handleDoubleClick(dataId)}
                                                onMouseEnter={() => onSetHover?.(s.id)}
                                                onMouseLeave={() => onSetHoverEnd?.()}
                                                style={{
                                                    cursor: 'pointer',
                                                    background:
                                                        activeSetId === s.id && !isLast
                                                            ? 'var(--mantine-color-blue-light)'
                                                            : undefined,
                                                }}
                                            >
                                                <Table.Td>
                                                    <Text fw={500}>
                                                        {s.name || `Set ${s.set_number}`}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={
                                                            s.status === 'complete'
                                                                ? 'green'
                                                                : s.status === 'recording'
                                                                  ? 'red'
                                                                  : 'gray'
                                                        }
                                                        size="sm"
                                                        variant="light"
                                                    >
                                                        {s.status}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    {s.weight_kg != null ? `${s.weight_kg} kg` : '-'}
                                                </Table.Td>
                                                <Table.Td>{s.description || '-'}</Table.Td>
                                                <Table.Td>{formatDate(s.created_at)}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs" onClick={(e) => e.stopPropagation()}>
                                                        <ActionIcon
                                                            color={
                                                                serialStatus.recording &&
                                                                recordingSetId === s.id
                                                                    ? 'gray'
                                                                    : 'red'
                                                            }
                                                            variant={
                                                                serialStatus.recording &&
                                                                recordingSetId === s.id
                                                                    ? 'light'
                                                                    : 'subtle'
                                                            }
                                                            onClick={() => onRecordToSet(s.id)}
                                                            loading={
                                                                actionLoading === 'record' &&
                                                                (recordingSetId === s.id ||
                                                                    (!serialStatus.recording &&
                                                                        recordingSetId === null))
                                                            }
                                                            disabled={
                                                                !serialStatus.connected ||
                                                                (serialStatus.recording &&
                                                                    recordingSetId !== s.id)
                                                            }
                                                            title={
                                                                serialStatus.recording &&
                                                                recordingSetId === s.id
                                                                    ? 'Stop recording'
                                                                    : 'Record to this set'
                                                            }
                                                        >
                                                            {serialStatus.recording &&
                                                            recordingSetId === s.id ? (
                                                                <IconPlayerStop size={16} />
                                                            ) : (
                                                                <IconPlayerRecord size={16} />
                                                            )}
                                                        </ActionIcon>
                                                        {accel && dataId && (
                                                            <>
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="grape"
                                                                    onClick={() => onAnalyze(dataId)}
                                                                    loading={
                                                                        analysisLoading[dataId] ?? false
                                                                    }
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
                                                            onClick={() => onDeleteSet(s.id)}
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
                                                    <Table.Td colSpan={7} p={0}>
                                                        <SetAnalysisPanel
                                                            dataId={dataId}
                                                            analysis={analyses[dataId]!}
                                                            isOpen={analysisOpen[dataId] ?? false}
                                                            isLoading={analysisLoading[dataId] ?? false}
                                                            minRomCm={minRomCm[dataId] ?? 15.0}
                                                            restSensitivity={
                                                                restSensitivity[dataId] ?? 1.0
                                                            }
                                                            weightKg={weightKg[dataId] ?? s.weight_kg ?? 0}
                                                            onMinRomCmChange={onMinRomCmChange}
                                                            onRestSensitivityChange={
                                                                onRestSensitivityChange
                                                            }
                                                            onWeightKgChange={onWeightKgChange}
                                                            onReanalyze={onReanalyze}
                                                        />
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                        </Table.Tbody>
                    </Table>
                    </ScrollArea>
                ) : (
                    <Text c="dimmed" ta="center" py="md">
                        No sets recorded yet.
                    </Text>
                )}
            </Stack>
        </Card>
    );
}
