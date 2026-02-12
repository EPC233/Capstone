/**
 * Simple Sidebar Context Provider for managing mobile drawer state and desktop sidebar collapse
 * Simplified version for starter code
 */

import { useState, ReactNode } from 'react';
import { SidebarContext } from './sidebarContext';

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [drawerOpened, setDrawerOpened] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const openDrawer = () => setDrawerOpened(true);
    const closeDrawer = () => setDrawerOpened(false);
    const toggleDrawer = () => setDrawerOpened((prev) => !prev);

    return (
        <SidebarContext.Provider
            value={{
                drawerOpened,
                openDrawer,
                closeDrawer,
                toggleDrawer,
                collapsed,
                setCollapsed,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}
