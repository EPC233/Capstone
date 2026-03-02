import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Text,
    Box,
    Stack,
    Card,
    Group,
    Button,
    Loader,
    Alert,
    Badge,
    ActionIcon,
    Table,
    Anchor,
    Divider,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconTrash,
    IconAlertCircle,
    IconCalendar,
    IconFile,
    IconPhoto,
    IconDownload,
} from '@tabler/icons-react';
import {
    getSession,
    deleteSession,
    deleteAccelerometerData,
    deleteGraphImage,
    type Session,
    type AccelerometerData,
    type GraphImage,
} from '../../services/sessions';
import { getApiUrl } from '../../utils/api';

const SESSION_TYPES: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    weightlifting: 'Weightlifting',
    yoga: 'Yoga',
    other: 'Other',
};

export default function SessionDetailPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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

    // Handle delete accelerometer data
    async function handleDeleteAccelerometerData(dataId: number) {
        try {
            setActionLoading(`accel-${dataId}`);
            await deleteAccelerometerData(dataId);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete data');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle delete graph image
    async function handleDeleteGraphImage(imageId: number) {
        try {
            setActionLoading(`graph-${imageId}`);
            await deleteGraphImage(imageId);
            await loadSession();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete image');
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

    // Format file size
    function formatFileSize(bytes?: number) {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // Get download URL
    function getDownloadUrl(filePath: string) {
        // Extract relative path from the file_path
        const relativePath = filePath.replace('/app/uploads/', '');
        return `${getApiUrl().replace('/api', '')}/uploads/${relativePath}`;
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
                    {/* Back button and header */}
                    <Group justify="space-between" align="flex-start">
                        <Stack gap="xs">
                            <Button
                                leftSection={<IconArrowLeft size={16} />}
                                variant="subtle"
                                onClick={() => navigate('/sessions')}
                                p={0}
                            >
                                Back to Sessions
                            </Button>
                            <Group gap="md" align="center">
                                <Title order={1}>{session.name}</Title>
                                {session.session_type && (
                                    <Badge color="blue" size="lg">
                                        {SESSION_TYPES[session.session_type] || session.session_type}
                                    </Badge>
                                )}
                            </Group>
                        </Stack>
                        <Button
                            color="red"
                            variant="outline"
                            leftSection={<IconTrash size={16} />}
                            onClick={handleDeleteSession}
                            loading={actionLoading === 'session'}
                        >
                            Delete Session
                        </Button>
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

                    {/* Session Info */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Title order={4}>Session Details</Title>
                            {session.description && (
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
                        </Stack>
                    </Card>

                    {/* Accelerometer Data */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconFile size={20} />
                                    <Title order={4}>Accelerometer Data</Title>
                                </Group>
                                <Badge>{session.accelerometer_data?.length || 0} file(s)</Badge>
                            </Group>
                            <Divider />
                            {session.accelerometer_data?.length > 0 ? (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>File Name</Table.Th>
                                            <Table.Th>Size</Table.Th>
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Uploaded</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {session.accelerometer_data.map((data: AccelerometerData) => (
                                            <Table.Tr key={data.id}>
                                                <Table.Td>
                                                    <Anchor
                                                        href={getDownloadUrl(data.file_path)}
                                                        target="_blank"
                                                    >
                                                        {data.file_name}
                                                    </Anchor>
                                                </Table.Td>
                                                <Table.Td>{formatFileSize(data.file_size)}</Table.Td>
                                                <Table.Td>{data.description || '-'}</Table.Td>
                                                <Table.Td>{formatDate(data.created_at)}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <ActionIcon
                                                            component="a"
                                                            href={getDownloadUrl(data.file_path)}
                                                            target="_blank"
                                                            variant="subtle"
                                                            color="blue"
                                                            title="Download"
                                                        >
                                                            <IconDownload size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleDeleteAccelerometerData(data.id)}
                                                            loading={actionLoading === `accel-${data.id}`}
                                                            title="Delete"
                                                        >
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">
                                    No accelerometer data uploaded yet.
                                </Text>
                            )}
                        </Stack>
                    </Card>

                    {/* Graph Images */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Group gap="sm">
                                    <IconPhoto size={20} />
                                    <Title order={4}>Graph Images</Title>
                                </Group>
                                <Badge>{session.graph_images?.length || 0} image(s)</Badge>
                            </Group>
                            <Divider />
                            {session.graph_images?.length > 0 ? (
                                <Table striped highlightOnHover>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>File Name</Table.Th>
                                            <Table.Th>Type</Table.Th>
                                            <Table.Th>Size</Table.Th>
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Uploaded</Table.Th>
                                            <Table.Th>Actions</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {session.graph_images.map((image: GraphImage) => (
                                            <Table.Tr key={image.id}>
                                                <Table.Td>
                                                    <Anchor
                                                        href={getDownloadUrl(image.file_path)}
                                                        target="_blank"
                                                    >
                                                        {image.file_name}
                                                    </Anchor>
                                                </Table.Td>
                                                <Table.Td>{image.image_type || '-'}</Table.Td>
                                                <Table.Td>{formatFileSize(image.file_size)}</Table.Td>
                                                <Table.Td>{image.description || '-'}</Table.Td>
                                                <Table.Td>{formatDate(image.created_at)}</Table.Td>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <ActionIcon
                                                            component="a"
                                                            href={getDownloadUrl(image.file_path)}
                                                            target="_blank"
                                                            variant="subtle"
                                                            color="blue"
                                                            title="Download"
                                                        >
                                                            <IconDownload size={16} />
                                                        </ActionIcon>
                                                        <ActionIcon
                                                            color="red"
                                                            variant="subtle"
                                                            onClick={() => handleDeleteGraphImage(image.id)}
                                                            loading={actionLoading === `graph-${image.id}`}
                                                            title="Delete"
                                                        >
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            ) : (
                                <Text c="dimmed" ta="center" py="md">
                                    No graph images uploaded yet.
                                </Text>
                            )}
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}
