import { Container, Stack, Box } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useAuth } from '../../contexts/AuthContext';
import PageHeader from '../ui/PageHeader';
import BreadcrumbsNav from '../navigation/BreadcrumbsNav';
import UserSidebar, {
    USER_SIDEBAR_WIDTH,
    USER_SIDEBAR_COLLAPSED_WIDTH,
} from './UserSidebar';
import { useSidebar } from '../../hooks/useSidebar';
import type { MenuItem } from '../ui/PageHeader';

interface BreadcrumbItem {
    title: string;
    href: string;
}

interface UserPageLayoutProps {
    breadcrumbs?: BreadcrumbItem[];
    title: string | React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
    badge?: React.ReactNode;
    icon?: React.ReactNode | React.ComponentType<{ size?: number }>;
    children?: React.ReactNode;
    content: React.ReactNode;
    wrapContent?: boolean;
    forceUserSidebar?: boolean;
    headerBackgroundColor?: string;
    menuItems?: MenuItem[];
    headerContent?: React.ReactNode;
}

/**
 * Reusable layout component for user pages
 */
export default function UserPageLayout({
    breadcrumbs,
    title,
    description,
    actions,
    badge,
    icon,
    children,
    content,
    wrapContent = true,
    forceUserSidebar = false,
    headerBackgroundColor,
    menuItems,
    headerContent,
}: UserPageLayoutProps) {
    const { userInfo } = useAuth();
    const isMobile = useMediaQuery('(max-width: 768px)');
    // Check user role
    const effectiveRole = userInfo?.role?.name;
    const shouldShowSidebar = forceUserSidebar || effectiveRole === 'user';
    const { collapsed: sidebarCollapsed } = useSidebar();

    // Calculate sidebar width for margin calculations (only on desktop)
    const sidebarWidth =
        shouldShowSidebar && !isMobile
            ? sidebarCollapsed
                ? USER_SIDEBAR_COLLAPSED_WIDTH
                : USER_SIDEBAR_WIDTH
            : 0;

    // Layout wrapper styles - handles sidebar margins (only on desktop)
    const layoutWrapperStyles: React.CSSProperties = {
        marginLeft: shouldShowSidebar && !isMobile ? `${sidebarWidth}px` : 0,
        width:
            shouldShowSidebar && !isMobile
                ? `calc(100% - ${sidebarWidth}px)`
                : '100%',
        transition: 'margin-left 0.2s ease, width 0.2s ease',
    };

    return (
        <>
            {shouldShowSidebar && <UserSidebar />}
            {breadcrumbs && <BreadcrumbsNav items={breadcrumbs} />}
            <Box style={layoutWrapperStyles}>
                <PageHeader
                    title={title}
                    description={description}
                    actions={actions}
                    badge={badge}
                    icon={icon}
                    headerBackgroundColor={headerBackgroundColor}
                    menuItems={menuItems}
                    headerContent={headerContent}
                >
                    {children}
                </PageHeader>
            </Box>
            <Box style={layoutWrapperStyles}>
                <Container size="md" py="xl" px={{ base: 'sm', sm: 'md' }}>
                    {wrapContent ? <Stack gap="xl">{content}</Stack> : content}
                </Container>
            </Box>
        </>
    );
}
