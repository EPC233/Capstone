import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import { useRouter } from 'expo-router';
import apiClient, { ApiError } from '../services/api';
import { User, Token } from '../types';
import { getItem, setItem, removeItem } from '../utils/storage';

interface AuthContextValue {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (
        username: string,
        email: string,
        password: string
    ) => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Check for existing token on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const storedToken = await getItem('auth_token');
            if (storedToken) {
                setToken(storedToken);
                // Fetch user info
                if (__DEV__) {
                    console.log('Checking auth with stored token...');
                }
                const response = await apiClient.get<User>('/api/auth/me');
                if (__DEV__) {
                    console.log('Auth check successful, user:', response.data);
                }
                setUser(response.data);
            } else {
                if (__DEV__) {
                    console.log('No stored token found');
                }
            }
        } catch (error) {
            // Token invalid or expired
            if (__DEV__) {
                if (error instanceof Error) {
                    console.log('Auth check failed:', error.message);
                } else {
                    console.log('Auth check failed:', error);
                }
            }
            await removeItem('auth_token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        try {
            const trimmedUsername = username.trim();
            if (__DEV__) {
                console.log('Attempting login for username:', trimmedUsername);
                console.log(
                    'API URL:',
                    process.env.EXPO_PUBLIC_API_URL || 'Using default'
                );
                console.log('Password length:', password.length);
            }
            const response = await apiClient.post<Token>(
                '/api/auth/login',
                {
                    username: trimmedUsername,
                    password: password,
                },
                {
                    timeout: 30000, // 30 second timeout
                }
            );

            const { access_token } = response.data;
            await setItem('auth_token', access_token);
            setToken(access_token);

            // Fetch user info - IMPORTANT: Wait for this to complete before navigating
            const userResponse = await apiClient.get<User>('/api/auth/me');
            const userData = userResponse.data;

            if (__DEV__) {
                console.log('Login successful, user:', userData);
            }

            // Set user state first
            setUser(userData);

            // Wait a tick to ensure state is updated before navigation
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Redirect to home
            router.replace('/(tabs)/home');
        } catch (error) {
            // Better error handling with detailed logging
            let errorMessage = 'Login failed';

            if (__DEV__) {
                console.error('═══════════════════════════════════════');
                console.error('❌ Login Error Details:');
                if (error instanceof Error) {
                    console.error('Error type:', error.name);
                    console.error('Error message:', error.message);
                    if (
                        error.message?.includes('timeout') ||
                        error.message?.includes('timed out')
                    ) {
                        console.error('⏱️  TIMEOUT ERROR');
                        console.error('This usually means:');
                        console.error(
                            '  1. Backend is not accessible from your device'
                        );
                        console.error('  2. Wrong IP address in .env file');
                        console.error('  3. Firewall blocking port 8000');
                        console.error(
                            '  4. Phone and computer not on same WiFi'
                        );
                        console.error('  5. Backend not running');
                    }
                } else {
                    console.error('Error:', error);
                }
                console.error('═══════════════════════════════════════');
            }

            // Handle ApiError with status and data
            if (error instanceof ApiError) {
                if (error.status) {
                    const errorData = error.data as
                        | { detail?: string; message?: string }
                        | undefined;
                    errorMessage =
                        errorData?.detail ||
                        errorData?.message ||
                        `Server error: ${error.status}`;
                } else if (
                    error.message?.includes('timeout') ||
                    error.message?.includes('timed out')
                ) {
                    errorMessage =
                        'Connection timed out. Please check:\n\n' +
                        '1. Your phone and computer are on the same WiFi network\n' +
                        '2. Backend is running on port 8000\n' +
                        '3. Firewall allows connections on port 8000\n' +
                        '4. Correct IP address in mobile/.env file\n\n' +
                        'See PHYSICAL_DEVICE_SETUP.md for help.';
                } else {
                    errorMessage = error.message || 'Login failed';
                }
            } else if (error instanceof Error) {
                // Network or other errors
                if (
                    error.message?.includes('timeout') ||
                    error.message?.includes('timed out')
                ) {
                    errorMessage =
                        'Connection timed out. Please check:\n\n' +
                        '1. Your phone and computer are on the same WiFi network\n' +
                        '2. Backend is running on port 8000\n' +
                        '3. Firewall allows connections on port 8000\n' +
                        '4. Correct IP address in mobile/.env file\n\n' +
                        'See PHYSICAL_DEVICE_SETUP.md for help.';
                } else if (
                    error.message?.includes('Failed to fetch') ||
                    error.message?.includes('Network')
                ) {
                    errorMessage =
                        'Cannot connect to server. Please check:\n\n' +
                        '1. Backend is running: curl http://localhost:8000/api/health\n' +
                        '2. Correct IP in mobile/.env: EXPO_PUBLIC_API_URL=http://YOUR_IP:8000\n' +
                        '3. Restart Expo after changing .env\n' +
                        '4. Test in phone browser: http://YOUR_IP:8000/docs';
                } else {
                    errorMessage = error.message || 'Login failed';
                }
            } else {
                errorMessage = 'Login failed';
            }

            throw new Error(errorMessage);
        }
    };

    const register = async (
        username: string,
        email: string,
        password: string
    ) => {
        try {
            await apiClient.post('/api/auth/register', {
                username,
                email,
                password,
            });
            // After registration, login
            await login(username, password);
        } catch (error) {
            if (error instanceof ApiError && error.data) {
                const errorData = error.data as { detail?: string };
                throw new Error(errorData.detail || 'Registration failed');
            }
            throw new Error('Registration failed');
        }
    };

    const logout = async () => {
        await removeItem('auth_token');
        setToken(null);
        setUser(null);
        router.replace('/(auth)/login');
    };

    const refreshUser = async () => {
        try {
            const response = await apiClient.get<User>('/api/auth/me');
            setUser(response.data);
        } catch (error) {
            if (__DEV__) {
                console.error('Failed to refresh user:', error);
            }
            // If refresh fails, user might be logged out
            await removeItem('auth_token');
            setToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                logout,
                register,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
