import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Table,
    Divider,
} from '@mantine/core';
import { IconClipboardText, IconCalendar } from '@tabler/icons-react';
import type { Session, WorkoutSet } from '../../services/sessions';
import { formatDate } from './sessionUtils';

interface SessionInfoCardProps {
    session: Session;
    editing: boolean;
}

function avg(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function fmt(value: number | null, decimals = 1, suffix = ''): string {
    if (value == null) return '-';
    return `${value.toFixed(decimals)}${suffix}`;
}

function SetSummaryRow({ s }: { s: WorkoutSet }) {
    const reps = s.rep_details ?? [];
    const repCount = reps.length;

    const avgRom = avg(reps.map((r) => r.rom_cm));
    const restTops = reps
        .map((r) => r.rest_at_top_seconds)
        .filter((v): v is number => v != null);
    const restBottoms = reps
        .map((r) => r.rest_at_bottom_seconds)
        .filter((v): v is number => v != null);
    const avgRestTop = avg(restTops);
    const avgRestBottom = avg(restBottoms);
    const watts = reps
        .map((r) => r.avg_watts)
        .filter((v): v is number => v != null);
    const avgPower = avg(watts);
    const peakVelUp = avg(
        reps.map((r) => r.concentric?.peak_velocity).filter((v): v is number => v != null),
    );
    const peakVelDown = avg(
        reps.map((r) => r.eccentric?.peak_velocity).filter((v): v is number => v != null),
    );

    return (
        <Table.Tr>
            <Table.Td>
                <Text size="sm" fw={500}>{s.name || `Set ${s.set_number}`}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{s.weight_kg != null ? `${s.weight_kg} kg` : '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{repCount || '-'}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(avgRom, 1, ' cm')}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(peakVelUp, 2, ' m/s')}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(peakVelDown, 2, ' m/s')}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(avgRestTop, 2, 's')}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(avgRestBottom, 2, 's')}</Text>
            </Table.Td>
            <Table.Td>
                <Text size="sm">{fmt(avgPower, 1, ' W')}</Text>
            </Table.Td>
        </Table.Tr>
    );
}

export default function SessionInfoCard({ session, editing }: SessionInfoCardProps) {
    const sets = [...(session.sets || [])].sort((a, b) => a.set_number - b.set_number);
    const setsWithReps = sets.filter((s) => (s.rep_details?.length ?? 0) > 0);

    return (
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

                {setsWithReps.length > 0 && (
                    <>
                        <Divider />
                        <Title order={5}>Set Summary</Title>
                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Set</Table.Th>
                                    <Table.Th>Weight</Table.Th>
                                    <Table.Th>Reps</Table.Th>
                                    <Table.Th>Avg ROM</Table.Th>
                                    <Table.Th>Peak Vel Up</Table.Th>
                                    <Table.Th>Peak Vel Down</Table.Th>
                                    <Table.Th>Avg Rest (Top)</Table.Th>
                                    <Table.Th>Avg Rest (Bottom)</Table.Th>
                                    <Table.Th>Avg Power</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {setsWithReps.map((s) => (
                                    <SetSummaryRow key={s.id} s={s} />
                                ))}
                            </Table.Tbody>
                        </Table>
                    </>
                )}
            </Stack>
        </Card>
    );
}
