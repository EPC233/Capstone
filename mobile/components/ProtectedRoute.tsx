import { useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
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
            }, 200); // Small delay to allow state updates

            return () => clearTimeout(timer);
        }
    }, [user, loading, router]);

    // Show loading state while checking auth
    if (loading) {
        return null;
    }

    // Don't render if no user (will redirect)
    if (!user) {
        return null;
    }

    return <>{children}</>;
}
