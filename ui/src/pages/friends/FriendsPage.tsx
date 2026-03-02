import { useState, useEffect, useCallback } from 'react';
import {
    Container,
    Title,
    Stack,
    Text,
    Box,
    Tabs,
    Card,
    Group,
    Avatar,
    Button,
    TextInput,
    Loader,
    Alert,
    Badge,
    ActionIcon,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
    IconSearch,
    IconUserPlus,
    IconCheck,
    IconX,
    IconUsers,
    IconMailbox,
    IconSend,
    IconAlertCircle,
    IconTrash,
} from '@tabler/icons-react';
import type { FriendListResponse, FriendshipResponse, User } from '../../types/api';
import {
    getFriends,
    getPendingRequests,
    getSentRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers,
} from '../../services/friends';

export default function FriendsPage() {
    // State
    const [friends, setFriends] = useState<FriendListResponse[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendshipResponse[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendshipResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [debouncedSearch] = useDebouncedValue(searchQuery, 300);

    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px',
    };

    // Load friends data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [friendsData, pendingData, sentData] = await Promise.all([
                getFriends(),
                getPendingRequests(),
                getSentRequests(),
            ]);
            setFriends(friendsData);
            setPendingRequests(pendingData);
            setSentRequests(sentData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load friends');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Search users
    useEffect(() => {
        async function performSearch() {
            if (!debouncedSearch || debouncedSearch.length < 2) {
                setSearchResults([]);
                return;
            }
            try {
                setSearchLoading(true);
                const results = await searchUsers(debouncedSearch);
                // Filter out users who are already friends or have pending requests
                const friendIds = new Set(friends.map((f) => f.id));
                const pendingIds = new Set([
                    ...pendingRequests.map((r) => r.requester.id),
                    ...sentRequests.map((r) => r.addressee.id),
                ]);
                const filtered = results.filter(
                    (user) => !friendIds.has(user.id) && !pendingIds.has(user.id)
                );
                setSearchResults(filtered);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setSearchLoading(false);
            }
        }
        performSearch();
    }, [debouncedSearch, friends, pendingRequests, sentRequests]);

    // Handle send friend request
    async function handleSendRequest(userId: number) {
        try {
            setActionLoading(userId);
            await sendFriendRequest(userId);
            setSearchQuery('');
            setSearchResults([]);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send friend request');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle respond to request
    async function handleRespondToRequest(friendshipId: number, accept: boolean) {
        try {
            setActionLoading(friendshipId);
            await respondToFriendRequest(friendshipId, accept);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to respond to request');
        } finally {
            setActionLoading(null);
        }
    }

    // Handle remove friend
    async function handleRemoveFriend(friendshipId: number) {
        try {
            setActionLoading(friendshipId);
            await removeFriend(friendshipId);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove friend');
        } finally {
            setActionLoading(null);
        }
    }

    // Get display name for user
    function getDisplayName(user: { username: string; first_name?: string | null; last_name?: string | null }) {
        if (user.first_name || user.last_name) {
            return `${user.first_name || ''} ${user.last_name || ''}`.trim();
        }
        return user.username;
    }

    // Render friend card
    function renderFriendCard(friend: FriendListResponse) {
        return (
            <Card key={friend.id} shadow="sm" padding="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar color="blue" radius="xl" size="md">
                            {friend.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text fw={500}>{getDisplayName(friend)}</Text>
                            <Text size="sm" c="dimmed">
                                @{friend.username}
                            </Text>
                        </Stack>
                    </Group>
                    <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => handleRemoveFriend(friend.friendship_id)}
                        loading={actionLoading === friend.friendship_id}
                        title="Remove friend"
                    >
                        <IconTrash size={18} />
                    </ActionIcon>
                </Group>
            </Card>
        );
    }

    // Render pending request card
    function renderPendingRequestCard(request: FriendshipResponse) {
        return (
            <Card key={request.id} shadow="sm" padding="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar color="blue" radius="xl" size="md">
                            {request.requester.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text fw={500}>{getDisplayName(request.requester)}</Text>
                            <Text size="sm" c="dimmed">
                                @{request.requester.username}
                            </Text>
                        </Stack>
                    </Group>
                    <Group gap="xs">
                        <Button
                            size="xs"
                            color="green"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => handleRespondToRequest(request.id, true)}
                            loading={actionLoading === request.id}
                        >
                            Accept
                        </Button>
                        <Button
                            size="xs"
                            color="red"
                            variant="outline"
                            leftSection={<IconX size={14} />}
                            onClick={() => handleRespondToRequest(request.id, false)}
                            loading={actionLoading === request.id}
                        >
                            Decline
                        </Button>
                    </Group>
                </Group>
            </Card>
        );
    }

    // Render sent request card
    function renderSentRequestCard(request: FriendshipResponse) {
        return (
            <Card key={request.id} shadow="sm" padding="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar color="gray" radius="xl" size="md">
                            {request.addressee.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text fw={500}>{getDisplayName(request.addressee)}</Text>
                            <Text size="sm" c="dimmed">
                                @{request.addressee.username}
                            </Text>
                        </Stack>
                    </Group>
                    <Group gap="xs">
                        <Badge color="yellow">Pending</Badge>
                        <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => handleRemoveFriend(request.id)}
                            loading={actionLoading === request.id}
                            title="Cancel request"
                        >
                            <IconX size={18} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Card>
        );
    }

    // Render search result card
    function renderSearchResultCard(user: User) {
        return (
            <Card key={user.id} shadow="sm" padding="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar color="gray" radius="xl" size="md">
                            {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Stack gap={0}>
                            <Text fw={500}>{getDisplayName(user)}</Text>
                            <Text size="sm" c="dimmed">
                                @{user.username}
                            </Text>
                        </Stack>
                    </Group>
                    <Button
                        size="xs"
                        leftSection={<IconUserPlus size={14} />}
                        onClick={() => handleSendRequest(user.id)}
                        loading={actionLoading === user.id}
                    >
                        Add Friend
                    </Button>
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
                        <Text c="dimmed">Loading friends...</Text>
                    </Stack>
                </Container>
            </Box>
        );
    }

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="md" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    <Title order={1}>Friends</Title>

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

                    {/* Search Section */}
                    <Card shadow="sm" padding="lg" withBorder>
                        <Stack gap="md">
                            <Title order={4}>Find Friends</Title>
                            <TextInput
                                placeholder="Search by username..."
                                leftSection={<IconSearch size={16} />}
                                rightSection={searchLoading ? <Loader size="xs" /> : null}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            />
                            {searchResults.length > 0 && (
                                <Stack gap="sm">
                                    {searchResults.map(renderSearchResultCard)}
                                </Stack>
                            )}
                            {debouncedSearch.length >= 2 && searchResults.length === 0 && !searchLoading && (
                                <Text c="dimmed" ta="center">
                                    No users found matching "{debouncedSearch}"
                                </Text>
                            )}
                        </Stack>
                    </Card>

                    {/* Tabs */}
                    <Tabs defaultValue="friends">
                        <Tabs.List>
                            <Tabs.Tab
                                value="friends"
                                leftSection={<IconUsers size={16} />}
                            >
                                Friends ({friends.length})
                            </Tabs.Tab>
                            <Tabs.Tab
                                value="pending"
                                leftSection={<IconMailbox size={16} />}
                            >
                                Requests
                                {pendingRequests.length > 0 && (
                                    <Badge size="xs" color="red" ml="xs">
                                        {pendingRequests.length}
                                    </Badge>
                                )}
                            </Tabs.Tab>
                            <Tabs.Tab
                                value="sent"
                                leftSection={<IconSend size={16} />}
                            >
                                Sent ({sentRequests.length})
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="friends" pt="md">
                            <Stack gap="sm">
                                {friends.length === 0 ? (
                                    <Text c="dimmed" ta="center" py="xl">
                                        You don't have any friends yet. Search for users above to add friends!
                                    </Text>
                                ) : (
                                    friends.map(renderFriendCard)
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="pending" pt="md">
                            <Stack gap="sm">
                                {pendingRequests.length === 0 ? (
                                    <Text c="dimmed" ta="center" py="xl">
                                        No pending friend requests.
                                    </Text>
                                ) : (
                                    pendingRequests.map(renderPendingRequestCard)
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="sent" pt="md">
                            <Stack gap="sm">
                                {sentRequests.length === 0 ? (
                                    <Text c="dimmed" ta="center" py="xl">
                                        No sent friend requests.
                                    </Text>
                                ) : (
                                    sentRequests.map(renderSentRequestCard)
                                )}
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Container>
        </Box>
    );
}
