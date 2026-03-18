import {
    Title,
    Stack,
    Group,
    Button,
    Badge,
    ActionIcon,
    TextInput,
    Textarea,
    Select,
} from '@mantine/core';
import {
    IconArrowLeft,
    IconTrash,
    IconEdit,
    IconCheck,
    IconX,
} from '@tabler/icons-react';
import type { Session, UpdateSessionData } from '../../services/sessions';
import { SESSION_TYPES, SESSION_TYPE_OPTIONS } from './sessionUtils';

interface SessionHeaderProps {
    session: Session;
    editing: boolean;
    editData: UpdateSessionData;
    editLoading: boolean;
    actionLoading: string | null;
    onNavigateBack: () => void;
    onStartEditing: () => void;
    onCancelEditing: () => void;
    onSaveEdit: () => void;
    onEditDataChange: (data: UpdateSessionData) => void;
    onDeleteSession: () => void;
}

export default function SessionHeader({
    session,
    editing,
    editData,
    editLoading,
    actionLoading,
    onNavigateBack,
    onStartEditing,
    onCancelEditing,
    onSaveEdit,
    onEditDataChange,
    onDeleteSession,
}: SessionHeaderProps) {
    return (
        <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
                <Button
                    leftSection={<IconArrowLeft size={16} />}
                    variant="subtle"
                    onClick={onNavigateBack}
                    p={0}
                >
                    Back to Sessions
                </Button>
                {editing ? (
                    <Stack gap="sm">
                        <TextInput
                            label="Session Name"
                            value={editData.name || ''}
                            onChange={(e) =>
                                onEditDataChange({ ...editData, name: e.currentTarget.value })
                            }
                            required
                            style={{ minWidth: 300 }}
                        />
                        <Select
                            label="Session Type"
                            placeholder="Select type"
                            data={SESSION_TYPE_OPTIONS}
                            value={editData.session_type || null}
                            onChange={(value) =>
                                onEditDataChange({ ...editData, session_type: value || '' })
                            }
                            clearable
                            style={{ minWidth: 300 }}
                        />
                        <Textarea
                            label="Description"
                            placeholder="Optional description..."
                            value={editData.description || ''}
                            onChange={(e) =>
                                onEditDataChange({ ...editData, description: e.currentTarget.value })
                            }
                            minRows={2}
                            style={{ minWidth: 300 }}
                        />
                        <Group gap="xs">
                            <Button
                                size="sm"
                                leftSection={<IconCheck size={16} />}
                                onClick={onSaveEdit}
                                loading={editLoading}
                            >
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="subtle"
                                leftSection={<IconX size={16} />}
                                onClick={onCancelEditing}
                            >
                                Cancel
                            </Button>
                        </Group>
                    </Stack>
                ) : (
                    <Group gap="md" align="center">
                        <Title order={1}>{session.name}</Title>
                        {session.session_type && (
                            <Badge color="blue" size="lg">
                                {SESSION_TYPES[session.session_type] || session.session_type}
                            </Badge>
                        )}
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={onStartEditing}
                            title="Edit session"
                        >
                            <IconEdit size={18} />
                        </ActionIcon>
                    </Group>
                )}
            </Stack>
            <Button
                color="red"
                variant="outline"
                leftSection={<IconTrash size={16} />}
                onClick={onDeleteSession}
                loading={actionLoading === 'session'}
            >
                Delete Session
            </Button>
        </Group>
    );
}
