import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DASHBOARD_TAB_STORAGE_KEY = 'dashboard_last_tab';

type DashboardSection = 'courses' | 'users' | 'groups';

interface DashboardInfo {
    title: string;
    description: string;
}

interface BreadcrumbItem {
    title: string;
    href: string;
}

/**
 * Hook to manage dashboard section state based on URL path
 * @param role - User role ('admin', 'user')
 * @returns { activeSection, setActiveSection, handleSectionChange }
 */
export function useDashboardSection(role: string) {
    const location = useLocation();
    const navigate = useNavigate();

    // Get active section from URL path
    const getActiveSection = (): DashboardSection | null => {
        const path = location.pathname;

        // Extract section from path like /dashboard/courses, /dashboard/users, etc.
        if (path.startsWith('/dashboard/courses')) return 'courses';
        if (path.startsWith('/dashboard/users')) return 'users';
        if (path.startsWith('/dashboard/groups')) return 'groups';

        // If just /dashboard, redirect to /dashboard/courses
        if (path === '/dashboard') {
            return null; // Will trigger redirect
        }

        // Fallback to stored preference
        const storedTab = localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
        if (storedTab && ['courses', 'users', 'groups'].includes(storedTab)) {
            return storedTab as DashboardSection;
        }
        return 'courses';
    };

    const activeSectionFromPath = getActiveSection();
    const [activeSection, setActiveSection] = useState<DashboardSection>(
        activeSectionFromPath || 'courses'
    );

    // Sync with URL path changes
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/dashboard/courses')) {
            setActiveSection('courses');
        } else if (path.startsWith('/dashboard/users')) {
            setActiveSection('users');
        } else if (path.startsWith('/dashboard/groups')) {
            setActiveSection('groups');
        }
    }, [location.pathname]);

    // Save section to localStorage when it changes
    useEffect(() => {
        if (activeSection && role === 'admin') {
            localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, activeSection);
        }
    }, [activeSection, role]);

    const handleSectionChange = (section: DashboardSection) => {
        setActiveSection(section);
        // Navigate to the new section route
        navigate(`/dashboard/${section}`);
    };

    return {
        activeSection,
        setActiveSection,
        handleSectionChange,
        activeSectionFromPath,
    };
}

/**
 * Get dashboard title and description based on role and section
 * @param role - User role
 * @param activeSection - Current active section
 * @returns { title, description }
 */
export function getDashboardInfo(
    role: string,
    activeSection: string | null
): DashboardInfo {
    // For admin users on section pages, show section name as title
    if (
        role === 'admin' &&
        activeSection &&
        ['courses', 'users', 'groups'].includes(activeSection)
    ) {
        const sectionLabels: Record<string, string> = {
            courses: 'Courses',
            users: 'Users',
            groups: 'Groups',
        };
        const sectionDescriptions: Record<string, string> = {
            courses: 'Manage all courses, modules, and course content.',
            users: 'Manage user accounts, roles, and permissions.',
            groups: 'Manage groups and group memberships.',
        };
        return {
            title: sectionLabels[activeSection] ?? 'Dashboard',
            description: sectionDescriptions[activeSection] ?? '',
        };
    }

    // Default dashboard titles for other cases
    switch (role) {
        case 'admin':
            return {
                title: 'Admin Dashboard',
                description:
                    'Welcome to the admin dashboard! You have full access to manage users, groups, and system settings.',
            };
        default:
            return {
                title: 'User Dashboard',
                description:
                    'Welcome to your dashboard! Here you can view your groups and courses.',
            };
    }
}

/**
 * Get breadcrumbs for dashboard section pages
 * @param role - User role
 * @param activeSection - Current active section
 * @returns Breadcrumb items or null
 */
export function getDashboardBreadcrumbs(
    role: string,
    activeSection: string | null
): BreadcrumbItem[] | null {
    // Only show breadcrumbs for admin users on section pages
    if (role !== 'admin') {
        return null;
    }

    const sectionLabels: Record<string, string> = {
        courses: 'Courses',
        users: 'Users',
        groups: 'Groups',
    };

    // Only show breadcrumbs if we're on a specific section page (not just /dashboard)
    if (
        activeSection &&
        ['courses', 'users', 'groups'].includes(activeSection)
    ) {
        return [
            { title: 'Dashboard', href: '#' }, // No link for Dashboard
            { title: sectionLabels[activeSection] ?? 'Section', href: '#' }, // No link for current section
        ];
    }

    return null;
}
