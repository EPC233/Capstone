import { Box } from '@mantine/core';
import Navbar from '../navigation/Navbar';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <Box>
            <Navbar />
            {children}
        </Box>
    );
}
