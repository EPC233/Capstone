import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Container,
    Paper,
    Stack,
    Text,
    TextInput,
    Button,
    Alert,
    Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordPage() {
    const { API_URL } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });

            if (!response.ok) {
                let errorMessage = 'Request failed';
                try {
                    const data = (await response.json()) as { detail?: string };
                    errorMessage = data.detail || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Container
            size="xs"
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Paper p="xl" withBorder w="100%">
                <Stack gap="xl">
                    <Text size="xl" fw={700}>
                        Reset Password
                    </Text>

                    {sent ? (
                        <Stack gap="md">
                            <Alert
                                icon={<IconCheck size={16} />}
                                color="green"
                                title="Check your email"
                            >
                                If an account with that email exists, we've sent a
                                password reset link. Check your inbox and spam folder.
                            </Alert>
                            <Anchor component={Link} to="/login" size="sm">
                                Back to login
                            </Anchor>
                        </Stack>
                    ) : (
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
                                <Text size="sm" c="dimmed">
                                    Enter the email address associated with your
                                    account and we'll send you a link to reset
                                    your password.
                                </Text>
                                <TextInput
                                    label="Email"
                                    placeholder="you@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.currentTarget.value)
                                    }
                                    required
                                    disabled={loading}
                                    autoFocus
                                />
                                <Button
                                    type="submit"
                                    loading={loading}
                                    fullWidth
                                >
                                    Send Reset Link
                                </Button>
                                <Anchor
                                    component={Link}
                                    to="/login"
                                    size="sm"
                                >
                                    Back to login
                                </Anchor>
                            </Stack>
                        </form>
                    )}
                </Stack>
            </Paper>
        </Container>
    );
}
