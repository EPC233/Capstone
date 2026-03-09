import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Stack,
    Box,
    Card,
    TextInput,
    Button,
    Group,
    Alert,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

export default function EditProfilePage() {
    const { userInfo, checkAuthentication, API_URL } = useAuth();
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState(userInfo?.first_name || '');
    const [lastName, setLastName] = useState(userInfo?.last_name || '');
    const [avatarUrl, setAvatarUrl] = useState(userInfo?.avatar_url || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px', // Account for navbar height
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/auth/me/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    first_name: firstName || null,
                    last_name: lastName || null,
                    avatar_url: avatarUrl || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to update profile');
            }

            // Refresh user info in context
            await checkAuthentication();
            setSuccess(true);

            // Navigate back to profile after short delay
            setTimeout(() => {
                navigate('/profile');
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="sm" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    <Title order={1}>Edit Profile</Title>

                    {error && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Error"
                            color="red"
                            variant="light"
                        >
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert
                            icon={<IconCheck size={16} />}
                            title="Success"
                            color="green"
                            variant="light"
                        >
                            Profile updated successfully!
                        </Alert>
                    )}

                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <form onSubmit={handleSubmit}>
                            <Stack gap="md">
                                <TextInput
                                    label="Username"
                                    value={userInfo?.username || ''}
                                    disabled
                                    description="Username cannot be changed"
                                />

                                <TextInput
                                    label="Email"
                                    value={userInfo?.email || ''}
                                    disabled
                                    description="Email cannot be changed"
                                />

                                <TextInput
                                    label="First Name"
                                    placeholder="Enter your first name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.currentTarget.value)}
                                />

                                <TextInput
                                    label="Last Name"
                                    placeholder="Enter your last name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.currentTarget.value)}
                                />

                                <TextInput
                                    label="Avatar URL"
                                    placeholder="https://example.com/avatar.jpg"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.currentTarget.value)}
                                    description="URL to your profile picture"
                                />

                                <Group justify="flex-end" mt="md">
                                    <Button
                                        variant="subtle"
                                        onClick={() => navigate('/profile')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={loading}>
                                        Save Changes
                                    </Button>
                                </Group>
                            </Stack>
                        </form>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
}
