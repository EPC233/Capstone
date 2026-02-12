import { SegmentedControl } from '@mantine/core';
import { IconLayoutGrid, IconTable } from '@tabler/icons-react';
import type { ViewMode } from '../../hooks/useViewMode';

interface ViewModeToggleProps {
    value: ViewMode;
    onChange: (value: ViewMode) => void;
}

/**
 * Reusable view mode toggle component (table/card)
 * @param value - Current view mode ('table' or 'card')
 * @param onChange - Callback when view mode changes
 */
export default function ViewModeToggle({
    value,
    onChange,
}: ViewModeToggleProps) {
    return (
        <SegmentedControl
            value={value}
            onChange={(val) => onChange(val as ViewMode)}
            data={[
                {
                    value: 'table',
                    label: <IconTable size={16} />,
                },
                {
                    value: 'card',
                    label: <IconLayoutGrid size={16} />,
                },
            ]}
        />
    );
}
