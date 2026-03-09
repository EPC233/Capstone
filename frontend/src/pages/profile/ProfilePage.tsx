import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Stack,
    Text,
    Box,
    Card,
    Avatar,
    Group,
    Badge,
    Button,
} from '@mantine/core';
import { IconMail, IconUser, IconEdit } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfilePage() {
    const { userInfo } = useAuth();
    const navigate = useNavigate();

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px', // Account for navbar height
    };

    const fullName = [userInfo?.first_name, userInfo?.last_name]
        .filter(Boolean)
        .join(' ');

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="sm" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    <Group justify="space-between" align="center" wrap="wrap">
                        <Title order={1}>Profile</Title>
                        <Button
                            variant="dark"
                            leftSection={<IconEdit size={16} />}
                            onClick={() => navigate('/profile/edit')}
                        >
                            Edit Profile
                        </Button>
                    </Group>

                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Stack gap="lg">
                            {/* Avatar and Name */}
                            <Group>
                                <Avatar
                                    src={userInfo?.avatar_url}
                                    color="blue"
                                    radius="xl"
                                    size="xl"
                                >
                                    {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                                </Avatar>
                                <Stack gap={4}>
                                    <Text fw={600} size="xl">
                                        {fullName || userInfo?.username}
                                    </Text>
                                    <Text c="dimmed" size="sm">
                                        @{userInfo?.username}
                                    </Text>
                                </Stack>
                            </Group>

                            {/* User Details */}
                            <Stack gap="sm">
                                <Group gap="xs">
                                    <IconUser size={18} color="var(--mantine-color-gray-6)" />
                                    <Text size="sm" c="dimmed">Username:</Text>
                                    <Text size="sm">{userInfo?.username}</Text>
                                </Group>

                                <Group gap="xs">
                                    <IconMail size={18} color="var(--mantine-color-gray-6)" />
                                    <Text size="sm" c="dimmed">Email:</Text>
                                    <Text size="sm">{userInfo?.email}</Text>
                                    {userInfo?.email_verified && (
                                        <Badge size="xs" color="green" variant="light">
                                            Verified
                                        </Badge>
                                    )}
                                </Group>

                                {fullName && (
                                    <Group gap="xs">
                                        <IconUser size={18} color="var(--mantine-color-gray-6)" />
                                        <Text size="sm" c="dimmed">Full Name:</Text>
                                        <Text size="sm">{fullName}</Text>
                                    </Group>
                                )}
                            </Stack>
                        </Stack>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}
