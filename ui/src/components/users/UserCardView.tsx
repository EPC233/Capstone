import {
    SimpleGrid,
    Card,
    Group,
    Stack,
    Text,
    Badge,
    Avatar,
    Box,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconUser } from '@tabler/icons-react';
import { getAvatarUrl, getRoleBadgeColor } from '../../utils/userUtils';
import { designTokens } from '../../designTokens';
import type { User } from '../../types/api';

interface UserCardViewProps {
    users: User[];
    userGroups: Record<number, string[]>;
    API_URL: string;
    onUserClick: (user: User) => void;
}

/**
 * Card view for users list
 */
export default function UserCardView({
    users,
    userGroups,
    API_URL,
    onUserClick,
}: UserCardViewProps) {
    const isMobile = useMediaQuery('(max-width: 420px)');
    const isNarrow = useMediaQuery('(max-width: 400px)');

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
            {users.map((user) => {
                const avatarUrl = getAvatarUrl(user.avatar_url, API_URL);
                return (
                    <Card
                        key={user.id}
                        shadow="sm"
                        padding={0}
                        radius="md"
                        withBorder
                        style={{ cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => onUserClick(user)}
                    >
                        {isMobile ? (
                            // Mobile: Stack vertically
                            <Stack gap={0}>
                                <Box
                                    style={{
                                        width: '100%',
                                        height: isNarrow ? '170px' : '200px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl || undefined}
                                        size="100%"
                                        radius={0}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 0,
                                        }}
                                    >
                                        <IconUser size={isNarrow ? 60 : 80} />
                                    </Avatar>
                                </Box>
                                <Stack gap="sm" p="md">
                                    <Group
                                        justify="space-between"
                                        align="flex-start"
                                        wrap="wrap"
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <Text
                                                fw={500}
                                                size={isNarrow ? 'md' : 'lg'}
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {user.username}
                                            </Text>
                                            <Text
                                                size="sm"
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {user.email}
                                            </Text>
                                        </div>
                                        <Badge
                                            style={{
                                                backgroundColor:
                                                    getRoleBadgeColor(
                                                        user.role?.name ||
                                                            'user'
                                                    ),
                                                color: designTokens.roles
                                                    .textOnColored,
                                                flexShrink: 0,
                                            }}
                                            variant="light"
                                        >
                                            {user.role?.name || 'user'}
                                        </Badge>
                                    </Group>
                                    {(userGroups[user.id] || []).length > 0 && (
                                        <Group gap="xs" wrap="wrap">
                                            {(userGroups[user.id] || []).map(
                                                (groupName, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        color="indigo"
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {groupName}
                                                    </Badge>
                                                )
                                            )}
                                        </Group>
                                    )}
                                    {(!user.email_verified ||
                                        !user.is_active) && (
                                        <Group gap="xs" wrap="wrap">
                                            {!user.email_verified && (
                                                <Badge
                                                    color="orange"
                                                    variant="light"
                                                    size="sm"
                                                >
                                                    Unverified
                                                </Badge>
                                            )}
                                            {!user.is_active && (
                                                <Badge
                                                    color="red"
                                                    variant="light"
                                                    size="sm"
                                                >
                                                    Disabled
                                                </Badge>
                                            )}
                                        </Group>
                                    )}
                                </Stack>
                            </Stack>
                        ) : (
                            // Desktop: Horizontal layout
                            <Group
                                gap={0}
                                align="stretch"
                                style={{ height: '100%' }}
                            >
                                <Box
                                    style={{
                                        width: '100px',
                                        height: '100%',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Avatar
                                        src={avatarUrl || undefined}
                                        size="100%"
                                        radius={0}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 0,
                                        }}
                                    >
                                        <IconUser size={80} />
                                    </Avatar>
                                </Box>
                                <Stack
                                    gap="sm"
                                    p="md"
                                    style={{ flex: 1, minWidth: 0 }}
                                >
                                    <Group
                                        justify="space-between"
                                        align="flex-start"
                                        wrap="wrap"
                                    >
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <Text fw={500} size="lg">
                                                {user.username}
                                            </Text>
                                            <Text
                                                size="sm"
                                                style={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {user.email}
                                            </Text>
                                        </div>
                                        <Badge
                                            style={{
                                                backgroundColor:
                                                    getRoleBadgeColor(
                                                        user.role?.name ||
                                                            'user'
                                                    ),
                                                color: designTokens.roles
                                                    .textOnColored,
                                                flexShrink: 0,
                                            }}
                                            variant="light"
                                        >
                                            {user.role?.name || 'user'}
                                        </Badge>
                                    </Group>
                                    {(userGroups[user.id] || []).length > 0 && (
                                        <Group gap="xs" wrap="wrap">
                                            {(userGroups[user.id] || []).map(
                                                (groupName, idx) => (
                                                    <Badge
                                                        key={idx}
                                                        color="indigo"
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {groupName}
                                                    </Badge>
                                                )
                                            )}
                                        </Group>
                                    )}
                                    {(!user.email_verified ||
                                        !user.is_active) && (
                                        <Group gap="xs" wrap="wrap">
                                            {!user.email_verified && (
                                                <Badge
                                                    color="orange"
                                                    variant="light"
                                                    size="sm"
                                                >
                                                    Unverified
                                                </Badge>
                                            )}
                                            {!user.is_active && (
                                                <Badge
                                                    color="red"
                                                    variant="light"
                                                    size="sm"
                                                >
                                                    Disabled
                                                </Badge>
                                            )}
                                        </Group>
                                    )}
                                </Stack>
                            </Group>
                        )}
                    </Card>
                );
            })}
        </SimpleGrid>
    );
}
