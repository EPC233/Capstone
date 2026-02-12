import { Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import ViewModeToggle from '../ui/ViewModeToggle';

interface UserListHeaderProps {
    viewMode: 'table' | 'card';
    setViewMode: (mode: 'table' | 'card') => void;
    onCreateClick: () => void;
}

/**
 * Header component for user list with view toggle and create button
 */
export default function UserListHeader({
    viewMode,
    setViewMode,
    onCreateClick,
}: UserListHeaderProps) {
    return (
        <Group justify="flex-end" align="center" mb="md">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <Button
                leftSection={<IconPlus size={16} />}
                onClick={onCreateClick}
            >
                Create User
            </Button>
        </Group>
    );
}
