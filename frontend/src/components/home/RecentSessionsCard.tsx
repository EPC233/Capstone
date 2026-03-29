import { useNavigate } from 'react-router-dom';
import {
    Card,
    Title,
    Stack,
    Text,
    Group,
    Badge,
    UnstyledButton,
} from '@mantine/core';
import { IconCalendar, IconChevronRight } from '@tabler/icons-react';
import type { Session } from '../../services/sessions';

const SESSION_TYPE_LABELS: Record<string, string> = {
    bench_press: 'Bench Press',
    deadlift: 'Deadlift',
    squat: 'Squat',
};

interface RecentSessionsCardProps {
    sessions: Session[];
    limit?: number;
}

export default function RecentSessionsCard({ sessions, limit = 5 }: RecentSessionsCardProps) {
    const navigate = useNavigate();

    const recent = [...sessions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Group justify="space-between">
                    <Title order={4}>Recent Sessions</Title>
                    <Text
                        size="sm"
                        c="blue"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate('/sessions')}
                    >
                        View all
                    </Text>
                </Group>
                {recent.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        No sessions yet.
                    </Text>
                ) : (
                    <Stack gap="xs">
                        {recent.map((s) => (
                            <UnstyledButton
                                key={s.id}
                                onClick={() => navigate(`/sessions/${s.id}`)}
                                style={{ borderRadius: 'var(--mantine-radius-sm)' }}
                                p="xs"
                                className="mantine-hover"
                            >
                                <Group justify="space-between" wrap="nowrap">
                                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                        <Group gap="xs">
                                            <Text size="sm" fw={600} truncate>
                                                {s.name}
                                            </Text>
                                            {s.session_type && (
                                                <Badge size="xs" variant="light">
                                                    {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap="xs">
                                            <IconCalendar size={12} color="gray" />
                                            <Text size="xs" c="dimmed">
                                                {formatDate(s.created_at)}
                                            </Text>
                                            {s.sets?.length > 0 && (
                                                <Badge size="xs" variant="outline">
                                                    {s.sets.length} set(s)
                                                </Badge>
                                            )}
                                        </Group>
                                    </Stack>
                                    <IconChevronRight size={16} color="gray" />
                                </Group>
                            </UnstyledButton>
                        ))}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
}
