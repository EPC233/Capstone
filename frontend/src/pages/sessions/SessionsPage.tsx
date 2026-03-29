import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Box,
    Stack,
    Card,
    Group,
    Button,
    TextInput,
    Textarea,
    Select,
    Modal,
    Loader,
    Alert,
    Badge,
    ActionIcon,
    SimpleGrid,
    Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    IconPlus,
    IconTrash,
    IconAlertCircle,
    IconCalendar,
    IconChevronRight,
    IconSearch,
} from '@tabler/icons-react';
import {
    getSessions,
    createSession,
    deleteSession,
    type Session,
    type CreateSessionData,
} from '../../services/sessions';

const SESSION_TYPES = [
    { value: 'bench_press', label: 'Bench Press' },
    { value: 'deadlift', label: 'Deadlift' },
    { value: 'squat', label: 'Squat' },
];

type SortOption = 'date_desc' | 'date_asc' | 'name_asc';

const SORT_OPTIONS = [
    { value: 'date_desc', label: 'Date (Newest)' },
    { value: 'date_asc', label: 'Date (Oldest)' },
    { value: 'name_asc', label: 'Name (A–Z)' },
];

function sortSessions(list: Session[], sort: SortOption): Session[] {
    return [...list].sort((a, b) => {
        switch (sort) {
            case 'date_asc':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'date_desc':
            default:
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });
}

export default function SessionsPage() {
    const navigate = useNavigate();
    
    // State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Sort & search state
    const [sortBy, setSortBy] = useState<SortOption>('date_desc');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [newSession, setNewSession] = useState<CreateSessionData>({
        name: '',
        description: '',
        session_type: '',
    });

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px',
    };

    // Load sessions
    const loadSessions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSessions();
            setSessions(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Handle create session
    async function handleCreateSession() {
        if (!newSession.name.trim()) {
            setError('Session name is required');
            return;
        }

        try {
            setCreateLoading(true);
            setError(null);
            await createSession({
                name: newSession.name.trim(),
                description: newSession.description?.trim() || undefined,
                session_type: newSession.session_type || undefined,
            });
            closeCreateModal();
            setNewSession({ name: '', description: '', session_type: '' });
            await loadSessions();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create session');
        } finally {
            setCreateLoading(false);
        }
    }

    // Handle delete session
    async function handleDeleteSession(sessionId: number) {
        try {
            setActionLoading(sessionId);
            await deleteSession(sessionId);
            await loadSessions();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete session');
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

    // Search-filtered then sorted sessions, grouped by type
    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const matched = sessions.filter((s) => {
            if (!query) return true;
            return (
                s.name.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query))
            );
        });
        return sortSessions(matched, sortBy);
    }, [sessions, searchQuery, sortBy]);

    const sessionsByType = useMemo(() => {
        const grouped: Record<string, Session[]> = {};
        for (const t of SESSION_TYPES) {
            grouped[t.value] = filtered.filter((s) => s.session_type === t.value);
        }
        return grouped;
    }, [filtered]);

    // Render a compact session card (no type badge since column gives context)
    function renderSessionCard(session: Session) {
        return (
            <Card 
                key={session.id} 
                shadow="sm" 
                padding="sm" 
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/sessions/${session.id}`)}
            >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm" truncate>
                            {session.name}
                        </Text>
                        {session.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                                {session.description}
                            </Text>
                        )}
                        <Group gap="xs">
                            <IconCalendar size={12} color="gray" />
                            <Text size="xs" c="dimmed">
                                {formatDate(session.created_at)}
                            </Text>
                        </Group>
                        <Group gap="xs">
                            {session.sets?.length > 0 && (
                                <Badge size="xs" variant="outline">
                                    {session.sets.length} set(s)
                                </Badge>
                            )}
                        </Group>
                    </Stack>
                    <Group gap={4} align="center" wrap="nowrap">
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                            }}
                            loading={actionLoading === session.id}
                            title="Delete session"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                        <IconChevronRight size={16} color="gray" />
                    </Group>
                </Group>
            </Card>
        );
    }

    // Format a date string to just the date portion for grouping
    function formatDateLabel(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    // Render a column for one session type, with date separators
    function renderTypeColumn(typeValue: string, label: string) {
        const list = sessionsByType[typeValue] ?? [];

        // Group sessions by date label
        const grouped: { date: string; sessions: Session[] }[] = [];
        for (const s of list) {
            const dateLabel = formatDateLabel(s.created_at);
            const last = grouped[grouped.length - 1];
            if (last && last.date === dateLabel) {
                last.sessions.push(s);
            } else {
                grouped.push({ date: dateLabel, sessions: [s] });
            }
        }
        const needsSeparators = grouped.length > 1;

        return (
            <Stack gap="sm" key={typeValue}>
                <Group justify="space-between" align="center">
                    <Title order={4}>{label}</Title>
                    <Badge size="sm" variant="light">{list.length}</Badge>
                </Group>
                {list.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        No sessions
                    </Text>
                ) : (
                    <Stack gap="xs">
                        {grouped.map((g, i) => (
                            <Stack gap="xs" key={g.date}>
                                {needsSeparators && (
                                    <Divider
                                        label={g.date}
                                        labelPosition="center"
                                        mt={i > 0 ? 'xs' : 0}
                                    />
                                )}
                                {g.sessions.map(renderSessionCard)}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Stack>
        );
    }

    if (loading) {
        return (
            <Box style={layoutWrapperStyles}>
                <Container size="md" py="xl">
                    <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text c="dimmed">Loading sessions...</Text>
                    </Stack>
                </Container>
            </Box>
        );
    }

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="xl" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    {/* Header */}
                    <Group justify="space-between" align="center">
                        <Title order={1}>Sessions</Title>
                        <Button
                            leftSection={<IconPlus size={16} />}
                            onClick={openCreateModal}
                        >
                            New Session
                        </Button>
                    </Group>

                    {/* Search & Sort */}
                    <Group gap="sm" align="flex-end">
                        <TextInput
                            leftSection={<IconSearch size={16} />}
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            style={{ flex: 1, maxWidth: 350 }}
                        />
                        <Select
                            placeholder="Sort by"
                            data={SORT_OPTIONS}
                            value={sortBy}
                            onChange={(val) => setSortBy((val as SortOption) || 'date_desc')}
                            style={{ maxWidth: 200 }}
                        />
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

                    {sessions.length === 0 ? (
                        <Card shadow="sm" padding="xl" withBorder>
                            <Stack align="center" gap="md">
                                <Text c="dimmed" ta="center">
                                    You don't have any sessions yet.
                                </Text>
                                <Button
                                    leftSection={<IconPlus size={16} />}
                                    onClick={openCreateModal}
                                >
                                    Create Your First Session
                                </Button>
                            </Stack>
                        </Card>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                            {SESSION_TYPES.map((t) => renderTypeColumn(t.value, t.label))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Container>

            {/* Create Session Modal */}
            <Modal
                opened={createModalOpened}
                onClose={closeCreateModal}
                title="Create New Session"
                centered
            >
                <Stack gap="md">
                    <TextInput
                        label="Session Name"
                        placeholder="Enter session name"
                        required
                        value={newSession.name}
                        onChange={(e) =>
                            setNewSession({ ...newSession, name: e.currentTarget.value })
                        }
                    />
                    <Select
                        label="Session Type"
                        placeholder="Select type"
                        data={SESSION_TYPES}
                        value={newSession.session_type}
                        onChange={(value) =>
                            setNewSession({ ...newSession, session_type: value || '' })
                        }
                        clearable
                    />
                    <Textarea
                        label="Description"
                        placeholder="Optional description..."
                        value={newSession.description}
                        onChange={(e) =>
                            setNewSession({ ...newSession, description: e.currentTarget.value })
                        }
                        minRows={3}
                    />
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={closeCreateModal}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateSession}
                            loading={createLoading}
                        >
                            Create Session
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}
