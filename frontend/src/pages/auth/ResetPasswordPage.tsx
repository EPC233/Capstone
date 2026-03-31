import { useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Stack,
    Text,
    PasswordInput,
    Button,
    Alert,
    Anchor,
} from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordPage() {
    const { API_URL } = useAuth();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // No token in URL — redirect to forgot password
    if (!token) {
        return <Navigate to="/reset-password-request" replace />;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password }),
            });

            if (!response.ok) {
                let errorMessage = 'Reset failed';
                try {
                    const data = (await response.json()) as { detail?: string };
                    errorMessage = data.detail || errorMessage;
                } catch {
                    errorMessage = `Server error: ${response.status}`;
                }
                throw new Error(errorMessage);
            }

            setSuccess(true);
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
                        Set New Password
                    </Text>

                    {success ? (
                        <Stack gap="md">
                            <Alert
                                icon={<IconCheck size={16} />}
                                color="green"
                                title="Password Reset"
                            >
                                Your password has been reset successfully.
                            </Alert>
                            <Anchor component={Link} to="/login" size="sm">
                                Go to login
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
                                <PasswordInput
                                    label="New Password"
                                    placeholder="At least 6 characters"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.currentTarget.value)
                                    }
                                    required
                                    disabled={loading}
                                    autoFocus
                                />
                                <PasswordInput
                                    label="Confirm Password"
                                    placeholder="Re-enter your new password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.currentTarget.value
                                        )
                                    }
                                    required
                                    disabled={loading}
                                />
                                <Button
                                    type="submit"
                                    loading={loading}
                                    fullWidth
                                >
                                    Reset Password
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
