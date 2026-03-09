import { useNavigate } from 'react-router-dom';
import {
    Container,
    Title,
    Stack,
    Text,
    Box,
    Button,
} from '@mantine/core';
import { designTokens } from '../../designTokens';

export default function HomePage() {
    const navigate = useNavigate();

    // Layout wrapper styles
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: 0,
        width: '100%',
        marginTop: '100px', // Account for navbar height
    };

    return (
        <Box style={layoutWrapperStyles}>
            <Container size="md" py="xl" px={{ base: 'sm', sm: 'md' }}>
                <Stack gap="xl" align="center">
                    <Title
                        order={1}
                        style={{
                            textAlign: 'center',
                            color: 'var(--mantine-color-blue-6)',
                            fontSize: '2.5rem',
                        }}
                    >
                        Fitness Tracker
                    </Title>
                    <Text
                        size="lg"
                        style={{
                            textAlign: 'center',
                            color: 'var(--mantine-color-gray-7)',
                            maxWidth: '600px',
                        }}
                    >
                        Track your sessions and accelerometer data.
                    </Text>
                    <Button
                        size="lg"
                        onClick={() => navigate('/sessions')}
                        style={{
                            marginTop: designTokens.spacing.sm,
                        }}
                    >
                        View My Sessions
                    </Button>
                </Stack>
            </Container>
        </Box>
    );
}
