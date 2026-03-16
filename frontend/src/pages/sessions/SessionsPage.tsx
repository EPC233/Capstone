import { useState, useEffect, useCallback } from 'react';
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

export default function SessionsPage() {
    const navigate = useNavigate();
    
    // State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Filter & search state
    const [filterType, setFilterType] = useState<string | null>(null);
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

    // Filtered sessions
    const filteredSessions = sessions.filter((s) => {
        const matchesType = !filterType || s.session_type === filterType;
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
            !query ||
            s.name.toLowerCase().includes(query) ||
            (s.description && s.description.toLowerCase().includes(query));
        return matchesType && matchesSearch;
    });

    // Get session type label
    function getSessionTypeLabel(type?: string) {
        if (!type) return null;
        const found = SESSION_TYPES.find((t) => t.value === type);
        return found ? found.label : type;
    }

    // Render session card
    function renderSessionCard(session: Session) {
        return (
            <Card 
                key={session.id} 
                shadow="sm" 
                padding="md" 
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/sessions/${session.id}`)}
            >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap="xs" style={{ flex: 1 }}>
                        <Group gap="sm">
                            <Text fw={600} size="lg">
                                {session.name}
                            </Text>
                            {session.session_type && (
                                <Badge color="blue" variant="light">
                                    {getSessionTypeLabel(session.session_type)}
                                </Badge>
                            )}
                        </Group>
                        {session.description && (
                            <Text size="sm" c="dimmed">
                                {session.description}
                            </Text>
                        )}
                        <Group gap="xs">
                            <IconCalendar size={14} color="gray" />
                            <Text size="xs" c="dimmed">
                                {formatDate(session.created_at)}
                            </Text>
                        </Group>
                        <Group gap="xs">
                            {session.sets?.length > 0 && (
                                <Badge size="sm" variant="outline">
                                    {session.sets.length} set(s)
                                </Badge>
                            )}
                            {session.graph_images?.length > 0 && (
                                <Badge size="sm" variant="outline">
                                    {session.graph_images.length} graph(s)
                                </Badge>
                            )}
                        </Group>
                    </Stack>
                    <Group gap="xs" align="center">
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                            }}
                            loading={actionLoading === session.id}
                            title="Delete session"
                        >
                            <IconTrash size={18} />
                        </ActionIcon>
                        <IconChevronRight size={20} color="gray" />
                    </Group>
                </Group>
            </Card>
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
            <Container size="md" py="xl" px={{ base: 'sm', sm: 'md' }}>
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

                    {/* Search & Filter */}
                    <Group gap="sm" align="flex-end">
                        <TextInput
                            leftSection={<IconSearch size={16} />}
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            style={{ flex: 1, maxWidth: 350 }}
                        />
                        <Select
                            placeholder="All types"
                            data={SESSION_TYPES}
                            value={filterType}
                            onChange={setFilterType}
                            clearable
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

                    {/* Sessions List */}
                    <Stack gap="sm">
                        {filteredSessions.length === 0 ? (
                            <Card shadow="sm" padding="xl" withBorder>
                                <Stack align="center" gap="md">
                                    <Text c="dimmed" ta="center">
                                        {sessions.length === 0
                                            ? "You don't have any sessions yet."
                                            : 'No sessions match the selected filter.'}
                                    </Text>
                                    {sessions.length === 0 && (
                                        <Button
                                            leftSection={<IconPlus size={16} />}
                                            onClick={openCreateModal}
                                        >
                                            Create Your First Session
                                        </Button>
                                    )}
                                </Stack>
                            </Card>
                        ) : (
                            filteredSessions.map(renderSessionCard)
                        )}
                    </Stack>
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
