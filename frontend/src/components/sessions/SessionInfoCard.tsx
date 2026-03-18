import {
    Title,
    Text,
    Stack,
    Card,
    Group,
} from '@mantine/core';
import { IconClipboardText, IconCalendar } from '@tabler/icons-react';
import type { Session } from '../../services/sessions';
import { formatDate } from './sessionUtils';

interface SessionInfoCardProps {
    session: Session;
    editing: boolean;
}

export default function SessionInfoCard({ session, editing }: SessionInfoCardProps) {
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
            </Stack>
        </Card>
    );
}
