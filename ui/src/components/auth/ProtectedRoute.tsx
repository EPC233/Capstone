import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: string;
    requiredAnyRole?: string[];
}

/**
 * ProtectedRoute - Requires authentication to access
 *
 * Usage:
 * <ProtectedRoute>
 *   <YourComponent />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({
    children,
    requiredRole,
    requiredAnyRole,
}: ProtectedRouteProps) {
    const { isAuthenticated, userInfo, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner message="Loading..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check for specific role requirement
    if (requiredRole && userInfo?.role?.name !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Check for any of the required roles
    if (
        requiredAnyRole &&
        !requiredAnyRole.includes(userInfo?.role?.name || '')
    ) {
        return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
}
