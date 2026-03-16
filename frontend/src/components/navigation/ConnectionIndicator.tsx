import { Group, Text } from '@mantine/core';
import { useSerialStatus } from '../../contexts/SerialStatusContext';

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
        color = '#fa5252'; // red
        label = 'Recording';
        shouldBlink = true;
    } else if (status.connected) {
        color = '#12b886';
        label = 'Connected';
        shouldBlink = true;
    } else {
        color = '#adb5bd'; // gray
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
