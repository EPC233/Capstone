import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Title,
    Stack,
    TextInput,
    Select,
    Group,
    Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { createSession, type CreateSessionData } from '../../services/sessions';

const SESSION_TYPES = [
    { value: 'bench_press', label: 'Bench Press' },
    { value: 'deadlift', label: 'Deadlift' },
    { value: 'squat', label: 'Squat' },
];

interface QuickCreateSessionCardProps {
    onCreated?: () => void;
}

export default function QuickCreateSessionCard({ onCreated }: QuickCreateSessionCardProps) {
    const navigate = useNavigate();
    const [data, setData] = useState<CreateSessionData>({ name: '', session_type: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCreate() {
        if (!data.name.trim()) {
            setError('Name is required');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const session = await createSession({
                name: data.name.trim(),
                session_type: data.session_type || undefined,
            });
            setData({ name: '', session_type: '' });
            onCreated?.();
            navigate(`/sessions/${session.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card shadow="sm" padding="lg" withBorder>
            <Stack gap="md">
                <Title order={4}>Quick Start</Title>
                <TextInput
                    placeholder="Session name"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.currentTarget.value })}
                    error={error}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                />
                <Select
                    placeholder="Session type"
                    data={SESSION_TYPES}
                    value={data.session_type ?? null}
                    onChange={(val) => setData({ ...data, session_type: val || '' })}
                    clearable
                />
                <Group justify="flex-end">
                    <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={handleCreate}
                        loading={loading}
                    >
                        Create & Open
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}
