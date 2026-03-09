import { Box } from '@mantine/core';
import Navbar from '../navigation/Navbar';

interface LayoutProps {
    children: React.ReactNode;
}

/**
 * Layout component that wraps pages with the navbar
 */
export default function Layout({ children }: LayoutProps) {
    return (
        <Box>
            <Navbar />
            {children}
        </Box>
    );
}
