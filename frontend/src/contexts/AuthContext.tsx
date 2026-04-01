import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import { getApiUrl, getAuthHeaders } from '../utils/api';
import type { User } from '../types/api';

interface AuthContextValue {
    isAuthenticated: boolean;
    userInfo: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    checkAuthentication: () => Promise<void>;
    API_URL: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = getApiUrl();

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    async function checkAuthentication() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setIsAuthenticated(false);
            setUserInfo(null);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: getAuthHeaders(false),
            });

            if (response.ok) {
                const user = (await response.json()) as User;
                setIsAuthenticated(true);
                setUserInfo(user);
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('token_type');
                setIsAuthenticated(false);
                setUserInfo(null);

                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        } catch (error) {
            console.error('Error checking authentication:', error);
            if (
                error instanceof Error &&
                error.message.includes('Failed to fetch')
            ) {
                console.warn(
                    'Backend server appears to be unavailable. Please ensure the backend is running.'
                );
            } else {
                setIsAuthenticated(false);
                setUserInfo(null);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        checkAuthentication();
    }, []);

    async function login(token: string) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token_type', 'bearer');
        setIsAuthenticated(true);
        await checkAuthentication();
    }

    function logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('token_type');
        setIsAuthenticated(false);
        setUserInfo(null);
    }

    const value: AuthContextValue = {
        isAuthenticated,
        userInfo,
        loading,
        login,
        logout,
        checkAuthentication,
        API_URL,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
