import { useContext } from 'react';
import { SidebarContext } from '../contexts/sidebarContext';

/**
 * Hook to access sidebar context
 * @throws {Error} If used outside of SidebarProvider
 */
export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
