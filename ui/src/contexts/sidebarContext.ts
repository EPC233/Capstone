/**
 * Sidebar Context definition
 * Separated from provider component for Fast Refresh compatibility
 */

import { createContext } from 'react';

export interface SidebarContextType {
    drawerOpened: boolean;
    openDrawer: () => void;
    closeDrawer: () => void;
    toggleDrawer: () => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(
    undefined
);
