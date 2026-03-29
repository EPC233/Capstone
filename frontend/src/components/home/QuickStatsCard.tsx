import {
    Card,
    Title,
    Group,
    Stack,
    Text,
    SimpleGrid,
    ThemeIcon,
} from '@mantine/core';
import {
    IconBarbell,
    IconListNumbers,
    IconRepeat,
} from '@tabler/icons-react';
import type { Session } from '../../services/sessions';

const SESSION_TYPE_LABELS: Record<string, string> = {
    bench_press: 'Bench Press',
    deadlift: 'Deadlift',
    squat: 'Squat',
};

interface QuickStatsCardProps {
    sessions: Session[];
}

export default function QuickStatsCard({ sessions }: QuickStatsCardProps) {
    const totalSets = sessions.reduce((sum, s) => sum + (s.sets?.length ?? 0), 0);
    const totalReps = sessions.reduce(
        (sum, s) =>
            sum +
            (s.sets ?? []).reduce(
                (sSum, set) => sSum + (set.rep_details?.length ?? 0),
                0,
            ),
        0,
    );

    // Count by type
    const byType: Record<string, number> = {};
    for (const s of sessions) {
        if (s.session_type) {
            byType[s.session_type] = (byType[s.session_type] ?? 0) + 1;
        }
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Title order={4}>Quick Stats</Title>
                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
                    <Group gap="sm">
                        <ThemeIcon size="lg" variant="light" color="blue">
                            <IconBarbell size={20} />
                        </ThemeIcon>
                        <div>
                            <Text size="xl" fw={700}>{sessions.length}</Text>
                            <Text size="xs" c="dimmed">Sessions</Text>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <ThemeIcon size="lg" variant="light" color="grape">
                            <IconListNumbers size={20} />
                        </ThemeIcon>
                        <div>
                            <Text size="xl" fw={700}>{totalSets}</Text>
                            <Text size="xs" c="dimmed">Total Sets</Text>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <ThemeIcon size="lg" variant="light" color="teal">
                            <IconRepeat size={20} />
                        </ThemeIcon>
                        <div>
                            <Text size="xl" fw={700}>{totalReps}</Text>
                            <Text size="xs" c="dimmed">Total Reps</Text>
                        </div>
                    </Group>
                </SimpleGrid>
                {Object.keys(byType).length > 0 && (
                    <Group gap="lg">
                        {Object.entries(byType).map(([type, count]) => (
                            <Text key={type} size="sm" c="dimmed">
                                {SESSION_TYPE_LABELS[type] ?? type}: <Text span fw={600}>{count}</Text>
                            </Text>
                        ))}
                    </Group>
                )}
            </Stack>
        </Card>
    );
}
