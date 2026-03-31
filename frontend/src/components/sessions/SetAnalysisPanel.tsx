import {
    Text,
    Group,
    Box,
    Slider,
    Tooltip,
    NumberInput,
    ActionIcon,
    Collapse,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { AnalysisResult } from '../../services/sessions';
import AccelAnalysisChart from './AccelAnalysisChart';

interface SetAnalysisPanelProps {
    dataId: number;
    analysis: AnalysisResult;
    isOpen: boolean;
    isLoading: boolean;
    minRomCm: number;
    restSensitivity: number;
    weightKg: number;
    onMinRomCmChange: (dataId: number, value: number) => void;
    onRestSensitivityChange: (dataId: number, value: number) => void;
    onWeightKgChange: (dataId: number, value: number) => void;
    onReanalyze: (dataId: number) => void;
}

export default function SetAnalysisPanel({
    dataId,
    analysis,
    isOpen,
    isLoading,
    minRomCm,
    restSensitivity,
    weightKg,
    onMinRomCmChange,
    onRestSensitivityChange,
    onWeightKgChange,
    onReanalyze,
}: SetAnalysisPanelProps) {
    return (
        <Collapse in={isOpen}>
            <Box p="md" style={{ background: 'var(--mantine-color-default-hover)' }}>
                <Group mb="sm" align="flex-end">
                    <Box style={{ flex: 1, maxWidth: 300 }}>
                        <Text size="xs" mb={4}>
                            Min ROM threshold (cm)
                        </Text>
                        <Slider
                            value={minRomCm}
                            onChange={(val) => onMinRomCmChange(dataId, val)}
                            min={0}
                            max={20}
                            step={0.5}
                            marks={[
                                { value: 0, label: '0' },
                                { value: 5, label: '5' },
                                { value: 10, label: '10' },
                                { value: 15, label: '15' },
                                { value: 20, label: '20' },
                            ]}
                            label={(val) => `${val} cm`}
                            color="grape"
                            size="sm"
                            styles={{ markLabel: { color: 'var(--mantine-color-text)' } }}
                        />
                    </Box>
                    <Box style={{ flex: 1, maxWidth: 300 }}>
                        <Text size="xs" mb={4}>
                            Rest detection sensitivity
                        </Text>
                        <Slider
                            value={restSensitivity}
                            onChange={(val) => onRestSensitivityChange(dataId, val)}
                            min={0}
                            max={2.0}
                            step={0.1}
                            marks={[
                                { value: 0, label: '0' },
                                { value: 0.5, label: '0.5' },
                                { value: 1, label: '1' },
                                { value: 1.5, label: '1.5' },
                                { value: 2, label: '2' },
                            ]}
                            label={(val) => `${val}`}
                            color="teal"
                            size="sm"
                            styles={{ markLabel: { color: 'var(--mantine-color-text)' } }}
                        />
                    </Box>
                    <Box style={{ width: 120 }}>
                        <Text size="xs" mb={4}>
                            Weight (kg)
                        </Text>
                        <NumberInput
                            value={weightKg}
                            onChange={(val) =>
                                onWeightKgChange(dataId, typeof val === 'number' ? val : 0)
                            }
                            min={0}
                            max={500}
                            step={0.5}
                            decimalScale={1}
                            size="sm"
                            placeholder="0"
                        />
                    </Box>
                    <Tooltip label="Re-analyze with new threshold">
                        <ActionIcon
                            variant="light"
                            color="grape"
                            size="lg"
                            onClick={() => onReanalyze(dataId)}
                            loading={isLoading}
                        >
                            <IconRefresh size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
                <AccelAnalysisChart analysis={analysis} />
            </Box>
        </Collapse>
    );
}
