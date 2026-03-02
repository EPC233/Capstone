import { Container, Title, Text } from '@mantine/core';

export default function WorkoutsPage() {
    return (
        <Container size="md" py="xl">
            <Title order={1} mb="md">
                Workouts
            </Title>
            <Text c="dimmed">
                View and manage your workout sessions here.
            </Text>
        </Container>
    );
}
