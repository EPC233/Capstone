import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Stack,
    Text,
    Box,
    Button,
    SimpleGrid,
    Loader,
} from '@mantine/core';
import { getSessions, type Session } from '../../services/sessions';
import QuickStatsCard from '../../components/home/QuickStatsCard';
import RecentSessionsCard from '../../components/home/RecentSessionsCard';
import SerialStatusCard from '../../components/home/SerialStatusCard';
import QuickCreateSessionCard from '../../components/home/QuickCreateSessionCard';
import { colorScheme } from '../../colorScheme';

export default function HomePage() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSessions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getSessions();
            setSessions(data);
        } catch {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px',
    };

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="lg" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl">
                    <Title
                        order={1}
                        style={{
                            textAlign: 'center',
                            color: colorScheme.brand.primary,
                            fontSize: '2.5rem',
                        }}
                    >
                        Fitness Tracker
                    </Title>
                    <Text size="lg" c="dimmed" ta="center">
                        Track your sessions and accelerometer data.
                    </Text>

                    {loading ? (
                        <Stack align="center" py="xl">
                            <Loader size="lg" />
                        </Stack>
                    ) : (
                        <>
                            <QuickStatsCard sessions={sessions} />

                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                                <RecentSessionsCard sessions={sessions} />
                                <Stack gap="lg">
                                    <SerialStatusCard />
                                    <QuickCreateSessionCard onCreated={loadSessions} />
                                </Stack>
                            </SimpleGrid>
                        </>
                    )}

                    <Button
                        size="lg"
                        variant="light"
                        fullWidth
                        onClick={() => navigate('/sessions')}
                    >
                        View All Sessions
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}
