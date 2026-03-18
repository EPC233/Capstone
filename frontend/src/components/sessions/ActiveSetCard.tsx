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
} from '@mantine/core';
import {
    IconActivity,
    IconPlayerRecord,
    IconPlayerStop,
    IconPlus,
    IconChartLine,
    IconDownload,
} from '@tabler/icons-react';
import type { WorkoutSet } from '../../services/sessions';
import type { SerialStatus } from '../../services/livedata';
import type { AccelDataPoint } from '../../services/livedata';
import LiveAccelChart from './LiveAccelChart';
import { formatDate, formatFileSize, getDownloadUrl } from './sessionUtils';

interface ActiveSetCardProps {
    serialStatus: SerialStatus;
    lastSet: WorkoutSet | null;
    liveAz: number | null;
    actionLoading: string | null;
    analysisLoading: Record<number, boolean>;
    onToggleRecording: () => void;
    onCreateNewSet: () => void;
    onAnalyze: (dataId: number) => void;
    onLiveData: (point: AccelDataPoint) => void;
}

export default function ActiveSetCard({
    serialStatus,
    lastSet,
    liveAz,
    actionLoading,
    analysisLoading,
    onToggleRecording,
    onCreateNewSet,
    onAnalyze,
    onLiveData,
}: ActiveSetCardProps) {
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
                                        onClick={() => onAnalyze(lastSet.accelerometer_data!.id)}
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
    );
}
