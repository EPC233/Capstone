import { Box, Drawer } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useLocation } from 'react-router-dom';
import Navbar from '../navigation/Navbar';
import AdminSidebar from './AdminSidebar';
import UserSidebar from './UserSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../hooks/useSidebar';

interface LayoutProps {
    children: React.ReactNode;
}

/**
 * Layout component that wraps pages with the navbar and appropriate sidebar
 * Only shows navbar if user is authenticated
 * Renders sidebars for desktop and a single unified drawer for mobile
 */
export default function Layout({ children }: LayoutProps) {
    const { userInfo, loading } = useAuth();
    const { drawerOpened, closeDrawer } = useSidebar();
    const location = useLocation();
    const isMobile = useMediaQuery('(max-width: 768px)');

    const isUser = userInfo?.role?.name === 'user';
    const isAdmin = userInfo?.role?.name === 'admin';
    const isPreviewRoute = location.pathname.includes('/preview');
    const isHomepage =
        location.pathname === '/' || location.pathname === '/dashboard';

    // Determine which content to show in mobile drawer
    const shouldShowAdminContent = isAdmin;
    const shouldShowUserContent =
        isUser || isPreviewRoute || (isHomepage && !isAdmin);

    return (
        <Box>
            <Navbar />
            {/* Desktop sidebars */}
            <AdminSidebar />
            <UserSidebar />

            {/* Single unified mobile drawer */}
            {isMobile && (
                <Drawer
                    opened={drawerOpened}
                    onClose={closeDrawer}
                    title="Navigation"
                    position="left"
                    size="240px"
                    closeOnClickOutside
                    closeOnEscape
                >
                    {!loading && shouldShowAdminContent && (
                        <AdminSidebar contentOnly />
                    )}
                    {!loading &&
                        shouldShowUserContent &&
                        !shouldShowAdminContent && <UserSidebar contentOnly />}
                </Drawer>
            )}

            {children}
        </Box>
    );
}
