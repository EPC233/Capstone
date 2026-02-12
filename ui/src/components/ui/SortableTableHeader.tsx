import { Table, Group, Text } from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import type { SortDirection } from '../../hooks/useTableSort';

interface SortableTableHeaderProps {
    column: string;
    sortColumn: string | null;
    sortDirection: SortDirection;
    onSort: (column: string) => void;
    children: React.ReactNode;
}

/**
 * Sortable table header cell
 * @param column - Column key for sorting
 * @param sortColumn - Currently sorted column
 * @param sortDirection - Current sort direction
 * @param onSort - Sort handler function
 * @param children - Header content
 */
export default function SortableTableHeader({
    column,
    sortColumn,
    sortDirection,
    onSort,
    children,
}: SortableTableHeaderProps) {
    const isSorted = sortColumn === column;
    const isAscending = sortDirection === 'asc';

    return (
        <Table.Th
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => onSort(column)}
        >
            <Group gap="xs" justify="space-between">
                <Text fw={isSorted ? 600 : 400}>{children}</Text>
                {isSorted &&
                    (isAscending ? (
                        <IconChevronUp size={16} />
                    ) : (
                        <IconChevronDown size={16} />
                    ))}
            </Group>
        </Table.Th>
    );
}
