import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Group,
  Anchor,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterPage() {
  const { isAuthenticated, API_URL } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
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

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password format (min 6 chars + at least one number)
    if (password.length < 6 || !/\d/.test(password)) {
      setError("Password must be at least 6 characters and contain a number");
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Registration failed";
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

      setSuccess(true);

      // Redirect to login after successful registration
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
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
                <Alert
                  icon={<IconCheck size={16} />}
                  color="green"
                  title="Success"
                >
                  Account created successfully! Redirecting to login...
                </Alert>
              )}
              <TextInput
                label="Username"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.currentTarget.value)}
                required
                disabled={loading || success}
                autoFocus
              />
              <TextInput
                label="Email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                disabled={loading || success}
              />
              <Group grow>
                <TextInput
                  label="First Name"
                  placeholder="Optional"
                  value={firstName}
                  onChange={(e) => setFirstName(e.currentTarget.value)}
                  disabled={loading || success}
                />
                <TextInput
                  label="Last Name"
                  placeholder="Optional"
                  value={lastName}
                  onChange={(e) => setLastName(e.currentTarget.value)}
                  disabled={loading || success}
                />
              </Group>
              <PasswordInput
                label="Password"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                disabled={loading || success}
              />
              <PasswordInput
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                required
                disabled={loading || success}
              />
              <Button
                type="submit"
                loading={loading}
                disabled={success}
                fullWidth
              >
                Create Account
              </Button>
              <Text size="sm" ta="center">
                Already have an account?{" "}
                <Anchor component={Link} to="/login">
                  Login
                </Anchor>
              </Text>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
}
