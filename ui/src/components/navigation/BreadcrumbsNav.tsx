import { Box, Container, Breadcrumbs, Anchor, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconHome } from '@tabler/icons-react';
import { useSidebar } from '../../hooks/useSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../layout/AdminSidebar';
import {
    USER_SIDEBAR_WIDTH,
    USER_SIDEBAR_COLLAPSED_WIDTH,
} from '../layout/UserSidebar';

export interface BreadcrumbItem {
    title: string;
    href: string;
}

interface BreadcrumbsNavProps {
    items: BreadcrumbItem[];
}

/**
 * Reusable breadcrumbs component positioned above PageHeader
 */
export default function BreadcrumbsNav({ items }: BreadcrumbsNavProps) {
    const navigate = useNavigate();
    const { userInfo } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');
    // Only use sidebar state if effective user is actually an admin or user
    // Must call hooks before any early returns
    const { collapsed } = useSidebar();

    // Hide breadcrumbs on mobile
    if (isMobile) {
        return null;
    }

    // Check user role
    const effectiveRole = userInfo?.role?.name;
    const shouldShowAdminSidebar = effectiveRole === 'admin';
    const shouldShowUserSidebar = effectiveRole === 'user';

    // Calculate styles based on effective user role
    const boxStyles: React.CSSProperties = {
        marginTop: '70px',
        backgroundColor: 'white',
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        height: '47px',
    };

    const breadcrumbsStyles: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
    };

    // Apply sidebar-related styles based on role (desktop only - mobile returns early)
    if (shouldShowAdminSidebar) {
        const sidebarWidth = collapsed
            ? SIDEBAR_COLLAPSED_WIDTH
            : SIDEBAR_WIDTH;
        boxStyles.marginLeft = `${sidebarWidth}px`;
        boxStyles.width = `calc(100% - ${sidebarWidth}px)`;
        boxStyles.transition = 'margin-left 0.2s ease, width 0.2s ease';
    } else if (shouldShowUserSidebar) {
        const sidebarWidth = collapsed
            ? USER_SIDEBAR_COLLAPSED_WIDTH
            : USER_SIDEBAR_WIDTH;
        boxStyles.marginLeft = `${sidebarWidth}px`;
        boxStyles.width = `calc(100% - ${sidebarWidth}px)`;
        boxStyles.transition = 'margin-left 0.2s ease, width 0.2s ease';
    } else {
        // Explicitly set to 0 and 100% for users without sidebars
        boxStyles.marginLeft = 0;
        boxStyles.width = '100%';
    }

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <Box style={boxStyles}>
            <Container
                size="md"
                px={{ base: 'sm', sm: 'md' }}
                style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Breadcrumbs
                    separator={
                        <IconChevronRight
                            size={16}
                            style={{
                                color: 'var(--mantine-color-gray-5)',
                                margin: '0 4px',
                            }}
                        />
                    }
                    style={breadcrumbsStyles}
                >
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        const isDashboard = item.title === 'Dashboard';
                        const isClickable =
                            item.href && item.href !== '#' && !isDashboard;

                        // For Dashboard, show only the home icon and make it clickable
                        if (isDashboard) {
                            return (
                                <Anchor
                                    key={index}
                                    onClick={() => navigate('/')}
                                    style={{
                                        cursor: 'pointer',
                                        color: 'var(--mantine-color-gray-6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'color 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color =
                                            'var(--mantine-color-blue-6)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color =
                                            'var(--mantine-color-gray-6)';
                                    }}
                                >
                                    <IconHome size={18} />
                                </Anchor>
                            );
                        }

                        if (isLast || !isClickable) {
                            return (
                                <Text
                                    key={index}
                                    size="sm"
                                    fw={isLast ? 600 : 400}
                                    c={
                                        isLast
                                            ? 'var(--mantine-color-gray-9)'
                                            : 'var(--mantine-color-gray-7)'
                                    }
                                >
                                    {item.title}
                                </Text>
                            );
                        }

                        return (
                            <Anchor
                                key={index}
                                onClick={() => navigate(item.href)}
                                size="sm"
                                style={{
                                    cursor: 'pointer',
                                    color: 'var(--mantine-color-blue-6)',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color =
                                        'var(--mantine-color-blue-7)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color =
                                        'var(--mantine-color-blue-6)';
                                }}
                            >
                                {item.title}
                            </Anchor>
                        );
                    })}
                </Breadcrumbs>
            </Container>
        </Box>
    );
}
