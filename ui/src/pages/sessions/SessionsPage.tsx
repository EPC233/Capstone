import { Container, Title, Text } from '@mantine/core';

export default function SessionsPage() {
    return (
        <Container size="md" py="xl">
            <Title order={1} mb="md">
                Sessions
            </Title>
            <Text c="dimmed">
                View and manage your sessions here.
            </Text>
        </Container>
    );
}
