import { Link, useNavigate } from 'react-router-dom';
import {
    Group,
    Button,
    Text,
    Container,
    Menu,
    Avatar,
    UnstyledButton,
    Stack,
    Box,
    Burger,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconLogout, IconUser, IconChevronDown } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../hooks/useSidebar';

interface NavLink {
    label: string;
    path: string;
}

export default function Navbar() {
    const { isAuthenticated, userInfo, logout } = useAuth();
    const navigate = useNavigate();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { drawerOpened, openDrawer, closeDrawer } = useSidebar();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    // Don't show navbar if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Determine available links based on user role
    const links: NavLink[] = [];

    // All authenticated users can see dashboard (content varies by role)
    links.push({ label: 'Dashboard', path: '/dashboard' });

    // User menu content (reusable for both desktop and mobile)
    const renderUserMenu = () => (
        <Menu
            shadow="md"
            width={200}
            position="bottom-end"
            withArrow
            offset={5}
            zIndex={1001}
        >
            <Menu.Target>
                <UnstyledButton style={{ minWidth: 0 }}>
                    <Group
                        gap={isMobile ? 'xs' : 'sm'}
                        wrap="nowrap"
                        style={{ minWidth: 0 }}
                    >
                        <Avatar
                            color="primary"
                            radius="xl"
                            size="sm"
                            style={{ flexShrink: 0 }}
                        >
                            {userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        {!isMobile && (
                            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
                                <Group gap="xs" align="center" wrap="nowrap">
                                    <Text
                                        size="sm"
                                        fw={500}
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {userInfo?.username || 'User'}
                                    </Text>
                                </Group>
                                <Text
                                    size="xs"
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {userInfo?.role?.name || 'user'}
                                </Text>
                            </Stack>
                        )}
                        {!isMobile && (
                            <IconChevronDown
                                size={16}
                                style={{ flexShrink: 0 }}
                            />
                        )}
                    </Group>
                </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>
                    Profile
                </Menu.Item>
                <Menu.Item
                    leftSection={<IconLogout size={14} />}
                    color="red"
                    onClick={handleLogout}
                >
                    Logout
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );

    return (
        <Box
            style={{
                position: 'fixed',
                backgroundColor: 'var(--mantine-color-white)',
                top: 0,
                left: 0,
                right: 0,
                width: '100%',
                zIndex: 1000,
                borderBottom: '1px solid var(--mantine-color-gray-2)',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
        >
            <Container
                size="xl"
                py={{ base: 'sm', sm: 'md' }}
                px={{ base: 'sm', sm: 'md' }}
            >
                <Group
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    gap="md"
                >
                    {/* Mobile: Burger menu (replaces logo) | Desktop: Logo */}
                    {isMobile ? (
                        <Burger
                            opened={drawerOpened}
                            onClick={drawerOpened ? closeDrawer : openDrawer}
                            size="sm"
                            style={{ flexShrink: 0 }}
                        />
                    ) : (
                        <Text
                            fw={700}
                            size="lg"
                            component={Link}
                            to="/"
                            c="pink.6"
                            style={{ textDecoration: 'none', flexShrink: 0 }}
                        >
                            Logo
                        </Text>
                    )}

                    {/* User menu (always visible) */}
                    <Box style={{ flexShrink: 0, minWidth: 0 }}>
                        {isMobile ? (
                            renderUserMenu()
                        ) : (
                            /* Desktop: Navigation Links and User Menu */
                            <Group gap="md" wrap="wrap">
                                {links.map((link) => (
                                    <Button
                                        key={link.path}
                                        component={Link}
                                        to={link.path}
                                        variant="subtle"
                                        size="sm"
                                    >
                                        {link.label}
                                    </Button>
                                ))}
                                {renderUserMenu()}
                            </Group>
                        )}
                    </Box>
                </Group>
            </Container>
        </Box>
    );
}
