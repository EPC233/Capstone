import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Stack,
    Text,
    TextInput,
    PasswordInput,
    Button,
    Alert,
    Group,
    Anchor,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const { isAuthenticated, API_URL, login } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // If already authenticated, redirect to home
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    password,
                }),
            });

            if (!response.ok) {
                let errorMessage = 'Login failed';
                try {
                    const errorData = (await response.json()) as {
                        detail?: string;
                    };
                    errorMessage = errorData.detail || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = (await response.json()) as { access_token: string };

            // Use auth context to login (updates state)
            await login(data.access_token);

            setSuccess(true);

            // Reset form
            setUsername('');
            setPassword('');

            // Redirect to home after authentication is confirmed
            setTimeout(() => {
                navigate('/');
            }, 500);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container size="md" py="xl">
            <Paper p="xl" withBorder>
                <Stack gap="xl">
                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            {error && (
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="red"
                                    title="Error"
                                >
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert color="green" title="Success">
                                    Login successful! Redirecting...
                                </Alert>
                            )}
                            <TextInput
                                label="Username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) =>
                                    setUsername(e.currentTarget.value)
                                }
                                required
                                disabled={loading}
                                autoFocus
                            />
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.currentTarget.value)
                                }
                                required
                                disabled={loading}
                            />
                            <Button type="submit" loading={loading} fullWidth>
                                Login
                            </Button>
                            <Group justify="space-between">
                                <Text size="sm">
                                    Don&apos;t have an account?{' '}
                                    <Anchor component={Link} to="/register">
                                        Register
                                    </Anchor>
                                </Text>
                                <Anchor
                                    component={Link}
                                    to="/reset-password-request"
                                    size="sm"
                                >
                                    Forgot password?
                                </Anchor>
                            </Group>
                        </Stack>
                    </form>
                </Stack>
            </Paper>
        </Container>
    );
}
