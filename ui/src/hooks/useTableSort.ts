import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseTableSortOptions {
    defaultSortColumn?: string | null;
    defaultSortDirection?: SortDirection;
}

export interface UseTableSortReturn<T> {
    sortedData: T[];
    sortColumn: string | null;
    sortDirection: SortDirection;
    handleSort: (column: string) => void;
}

/**
 * Hook for managing table sorting state
 * @param data - The data array to sort
 * @param options - Configuration options
 * @returns { sortedData, sortColumn, sortDirection, handleSort }
 */
export function useTableSort<T extends Record<string, unknown>>(
    data: T[],
    options: UseTableSortOptions = {}
): UseTableSortReturn<T> {
    const { defaultSortColumn = null, defaultSortDirection = 'asc' } = options;

    const [sortColumn, setSortColumn] = useState<string | null>(
        defaultSortColumn
    );
    const [sortDirection, setSortDirection] =
        useState<SortDirection>(defaultSortDirection);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            // Toggle direction if clicking the same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column and default to ascending
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            if (!sortColumn) return 0;

            let aValue: unknown = a[sortColumn];
            let bValue: unknown = b[sortColumn];

            // Handle nested properties (e.g., role.name)
            if (sortColumn.includes('.')) {
                const keys = sortColumn.split('.');
                aValue = keys.reduce(
                    (obj: unknown, key: string) =>
                        obj && typeof obj === 'object' && key in obj
                            ? (obj as Record<string, unknown>)[key]
                            : undefined,
                    a
                );
                bValue = keys.reduce(
                    (obj: unknown, key: string) =>
                        obj && typeof obj === 'object' && key in obj
                            ? (obj as Record<string, unknown>)[key]
                            : undefined,
                    b
                );
            }

            // Handle null/undefined values
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            // Convert to strings for comparison if needed
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            // Compare values
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            } else if (
                typeof aValue === 'string' &&
                typeof bValue === 'string'
            ) {
                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [data, sortColumn, sortDirection]);

    return {
        sortedData,
        sortColumn,
        sortDirection,
        handleSort,
    };
}
