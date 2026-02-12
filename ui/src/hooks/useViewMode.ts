import { useState, useEffect, useRef } from 'react';

const VIEW_MODE_STORAGE_KEY = 'view_mode_preference';

export type ViewMode = 'table' | 'card';

/**
 * Custom hook for managing view mode (table/card) with localStorage persistence
 * @param isActive - Whether the component is currently active/visible
 * @returns [viewMode, setViewMode] tuple
 */
export function useViewMode(
    isActive = true
): [ViewMode, (mode: ViewMode) => void] {
    // Get default view mode from localStorage or default to 'card'
    const getDefaultViewMode = (): ViewMode => {
        const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
        return stored && ['table', 'card'].includes(stored)
            ? (stored as ViewMode)
            : 'card';
    };

    const [viewMode, setViewMode] = useState<ViewMode>(getDefaultViewMode);
    const prevIsActiveRef = useRef(isActive);

    // Sync viewMode from localStorage when component becomes active
    useEffect(() => {
        // Only sync when isActive changes from false to true
        if (isActive && !prevIsActiveRef.current) {
            const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
            if (
                stored &&
                ['table', 'card'].includes(stored) &&
                stored !== viewMode
            ) {
                setViewMode(stored as ViewMode);
            }
        }
        prevIsActiveRef.current = isActive;
    }, [isActive, viewMode]);

    // Save view mode to localStorage when it changes
    useEffect(() => {
        localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    }, [viewMode]);

    return [viewMode, setViewMode];
}
