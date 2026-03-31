import { Group, Text } from '@mantine/core';
import { useSerialStatus } from '../../contexts/SerialStatusContext';
import { colorScheme } from '../../colorScheme';

const dotBase: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
};

const blinkKeyframes = `
@keyframes blink-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}
`;

export default function ConnectionIndicator() {
    const { status } = useSerialStatus();

    let color: string;
    let label: string;
    let shouldBlink: boolean;

    if (status.recording) {
        color = colorScheme.semantic.error;
        label = 'Recording';
        shouldBlink = true;
    } else if (status.connected) {
        color = colorScheme.semantic.success;
        label = 'Connected';
        shouldBlink = true;
    } else {
        color = '#9CA3AF';
        label = 'Disconnected';
        shouldBlink = false;
    }

    return (
        <>
            <style>{blinkKeyframes}</style>
            <Group gap={6} wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
                <span
                    style={{
                        ...dotBase,
                        backgroundColor: color,
                        animation: shouldBlink ? 'blink-dot 1.4s ease-in-out infinite' : 'none',
                    }}
                />
                <Text size="xs" c={status.connected ? undefined : 'dimmed'} fw={500}>
                    {label}
                </Text>
            </Group>
        </>
    );
}
