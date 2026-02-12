import { Box, Stack, Group, NavLink, ActionIcon, Tooltip } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    IconBook,
    IconUsers,
    IconUsersGroup,
    IconChevronLeft,
    IconChevronRight,
} from '@tabler/icons-react';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../contexts/AuthContext';

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

interface NavItem {
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    value: string;
}

const navItems: NavItem[] = [
    {
        label: 'Courses',
        icon: IconBook,
        value: 'courses',
    },
    {
        label: 'Users',
        icon: IconUsers,
        value: 'users',
    },
    {
        label: 'Groups',
        icon: IconUsersGroup,
        value: 'groups',
    },
];

interface AdminSidebarProps {
    contentOnly?: boolean;
}

export default function AdminSidebar({
    contentOnly = false,
}: AdminSidebarProps) {
    const { collapsed, setCollapsed, closeDrawer } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();
    const { userInfo } = useAuth();
    const isAdmin = userInfo?.role?.name === 'admin';
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Desktop: Don't show sidebar if not admin
    if (!isMobile && !isAdmin) {
        return null;
    }

    // Determine active section based on current route
    const getCurrentSection = (): string => {
        const path = location.pathname;
        if (path.startsWith('/dashboard/courses')) return 'courses';
        if (path.startsWith('/dashboard/groups')) return 'groups';
        if (path.startsWith('/dashboard/users')) return 'users';
        if (path === '/dashboard' || path === '/') {
            // Default to courses if just /dashboard or homepage
            return 'courses';
        }
        return 'courses';
    };

    const currentSection = getCurrentSection();

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    // Render navigation content (reusable for both sidebar and drawer)
    const renderNavContent = (showLabels = true) => {
        const handleNavClickInternal = (item: NavItem) => {
            navigate(`/dashboard/${item.value}`);
            if (isMobile) {
                closeDrawer();
            }
        };

        return (
            <Stack gap={0} p="xs" style={{ flex: 1 }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.value;

                    const navLink = (
                        <NavLink
                            key={item.value}
                            label={showLabels ? item.label : undefined}
                            leftSection={<Icon size={20} />}
                            active={isActive}
                            onClick={() => handleNavClickInternal(item)}
                            style={{
                                borderRadius: 'var(--mantine-radius-md)',
                                marginBottom: '4px',
                            }}
                            variant="subtle"
                        />
                    );

                    if (!showLabels) {
                        return (
                            <Tooltip
                                key={item.value}
                                label={item.label}
                                position="right"
                            >
                                <div>{navLink}</div>
                            </Tooltip>
                        );
                    }

                    return navLink;
                })}
            </Stack>
        );
    };

    // If contentOnly mode, just render the navigation content
    if (contentOnly) {
        if (!isAdmin) {
            return null;
        }
        // Render just the content (used in unified mobile drawer)
        return renderNavContent(true);
    }

    // Mobile: Don't render drawer here - Layout handles the unified drawer
    if (isMobile) {
        return null;
    }

    // Desktop: Render as fixed sidebar
    return (
        <Box
            style={{
                position: 'fixed',
                left: 0,
                top: '70px', // Below navbar
                height: 'calc(100vh - 70px)',
                width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
                backgroundColor: 'var(--mantine-color-white)',
                borderRight: '1px solid var(--mantine-color-gray-2)',
                transition: 'width 0.2s ease',
                zIndex: 100,
                overflow: 'hidden',
            }}
        >
            <Stack gap={0} h="100%">
                {/* Collapse Toggle */}
                <Group
                    justify={collapsed ? 'center' : 'flex-end'}
                    p="sm"
                    style={{
                        borderBottom: '1px solid var(--mantine-color-gray-2)',
                    }}
                >
                    <Tooltip
                        label={
                            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        position="right"
                    >
                        <ActionIcon
                            variant="subtle"
                            onClick={toggleCollapsed}
                            size="sm"
                        >
                            {collapsed ? (
                                <IconChevronRight size={16} />
                            ) : (
                                <IconChevronLeft size={16} />
                            )}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {/* Navigation Items */}
                {renderNavContent(!collapsed)}
            </Stack>
        </Box>
    );
}
