import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TextInput,
    PasswordInput,
    Button,
    Stack,
    Alert,
    Modal,
    Text,
    Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from './contexts/AuthContext';
import type { Token } from './types/api';

interface LoginFormProps {
    API_URL: string;
    onLoginSuccess?: (data: Token) => void;
}

export default function LoginForm({ API_URL, onLoginSuccess }: LoginFormProps) {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [opened, { open, close }] = useDisclosure(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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

            const data = (await response.json()) as Token;

            // Use auth context to login (updates state)
            await login(data.access_token);

            setSuccess(true);

            // Reset form
            setUsername('');
            setPassword('');

            // Call success callback if provided
            if (onLoginSuccess) {
                onLoginSuccess(data);
            }

            // Close modal and redirect
            setTimeout(() => {
                close();
                setSuccess(false);
                navigate('/');
            }, 1500);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Button onClick={open} variant="light">
                Login
            </Button>

            <Modal opened={opened} onClose={close} title="Login" centered>
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
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            required
                            disabled={loading}
                            autoFocus
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            required
                            disabled={loading}
                        />
                        <Button type="submit" loading={loading} fullWidth>
                            Login
                        </Button>
                        <Text size="sm" ta="center">
                            Don&apos;t have an account?{' '}
                            <Anchor
                                component="button"
                                type="button"
                                onClick={() => {
                                    close();
                                    // You can trigger register form here
                                }}
                            >
                                Register
                            </Anchor>
                        </Text>
                        <Text size="sm" ta="center">
                            <Anchor
                                component="button"
                                type="button"
                                onClick={() => {
                                    close();
                                    // You can trigger password reset form here
                                }}
                            >
                                Forgot password?
                            </Anchor>
                        </Text>
                    </Stack>
                </form>
            </Modal>
        </>
    );
}
