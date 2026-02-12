import { Container, Paper, Stack, Title, Text, Button } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconAlertCircle } from '@tabler/icons-react';
import { Alert } from '@mantine/core';

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <Container size="md" py="xl">
            <Paper p="xl" withBorder>
                <Stack gap="md">
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        title="Access Denied"
                    >
                        You don&apos;t have permission to access this page.
                    </Alert>
                    <Title order={2}>Unauthorized</Title>
                    <Text>
                    </Text>
                    <Button onClick={() => navigate('/')} fullWidth>
                        Go to Home
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
}
