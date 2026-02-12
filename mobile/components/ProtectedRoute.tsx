import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    requireRole?: 'user' | 'admin';
}

export default function ProtectedRoute({
    children,
    requireRole = 'user',
}: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Only redirect if we're sure we're not loading and user is not set
        // Add a small delay to avoid race conditions with login
        if (!loading) {
            const timer = setTimeout(() => {
                if (!user) {
                    if (__DEV__) {
                        console.log(
                            'ProtectedRoute: No user, redirecting to login'
                        );
                    }
                    router.replace('/(auth)/login');
                }
                // Allow admins to access user routes for testing/development
                // In production, you may want to block admins by uncommenting:
                // else if (requireRole === 'user' && user.role.name === 'admin') {
                //     if (__DEV__) {
                //         console.log('ProtectedRoute: Admin user blocked from user route');
                //     }
                //     router.replace('/(auth)/login');
                // }
            }, 200); // Small delay to allow state updates

            return () => clearTimeout(timer);
        }
    }, [user, loading, requireRole, router]);

    // Show loading state while checking auth
    if (loading) {
        return null;
    }

    // Don't render if no user (will redirect)
    if (!user) {
        return null;
    }

    // Allow all authenticated users (including admins) to access user routes
    // This allows admins to test the mobile app
    // In production, you may want to block admins by uncommenting:
    // if (requireRole === 'user' && user.role.name === 'admin') {
    //     return null;
    // }

    return <>{children}</>;
}
