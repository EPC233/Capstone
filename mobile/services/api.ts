import { Platform } from 'react-native';
import { getItem, removeItem } from '../utils/storage';

/**
 * Get the correct API URL based on platform
 *
 * Priority:
 * 1. If EXPO_PUBLIC_API_URL is set to an IP address (not localhost), use it for ALL platforms
 *    - This works for physical iOS and Android devices
 * 2. Platform-specific defaults for emulators/simulators:
 *    - Android emulator: 10.0.2.2 (special IP that maps to host's localhost)
 *    - iOS simulator: localhost (works directly)
 *    - Web: localhost
 *
 * For physical devices, set EXPO_PUBLIC_API_URL in mobile/.env:
 *   EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
 *
 * Find your IP: Run ./scripts/find-ip.sh or check System Preferences → Network
 */
function getApiUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;

    // Priority 1: If EXPO_PUBLIC_API_URL is set to an IP (not localhost),
    // use it for ALL platforms (iOS, Android, web) - this is for physical devices
    if (
        envUrl &&
        !envUrl.includes('localhost') &&
        !envUrl.includes('127.0.0.1')
    ) {
        return envUrl;
    }

    // Priority 2: Platform-specific defaults for emulators/simulators
    if (Platform.OS === 'android') {
        // Android emulator: Use 10.0.2.2 to access host machine's localhost
        return 'http://10.0.2.2:8000';
    }

    // iOS simulator and web can use localhost directly
    // Note: Physical iOS devices will use EXPO_PUBLIC_API_URL (checked above)
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
        return 'http://localhost:8000';
    }

    // Fallback
    return envUrl || 'http://localhost:8000';
}

let API_URL = getApiUrl();

// Ensure API URL doesn't already have /api suffix (we add it per-request)
// But if it does, remove it since we add /api to each endpoint
if (API_URL.endsWith('/api')) {
    API_URL = API_URL.replace(/\/api$/, '');
}

// Log API URL for debugging (remove in production)
if (__DEV__) {
    console.log('═══════════════════════════════════════');
    console.log('📱 Mobile App API Configuration');
    console.log('═══════════════════════════════════════');
    console.log('Platform:', Platform.OS);
    console.log('API URL:', API_URL);
    console.log(
        'EXPO_PUBLIC_API_URL:',
        process.env.EXPO_PUBLIC_API_URL || 'Not set (using default)'
    );
    console.log('═══════════════════════════════════════');

    // Check if this is a physical device scenario
    const isPhysicalDevice =
        Platform.OS !== 'web' &&
        API_URL.includes('10.0.2.2') === false &&
        API_URL.includes('localhost') === false;

    if (isPhysicalDevice) {
        console.log('✅ Physical device detected - using IP address');
        console.log('💡 Test connection: Open this URL in your phone browser:');
        console.log(`   ${API_URL}/api/health`);
        console.log('   If it loads, networking is working!');
    } else if (Platform.OS === 'android' && API_URL.includes('10.0.2.2')) {
        console.log('✅ Android emulator detected');
    } else if (Platform.OS === 'ios' && API_URL.includes('localhost')) {
        console.log('✅ iOS simulator detected');
    } else if (Platform.OS === 'web') {
        console.log('✅ Web platform detected');
    }

    if (
        !process.env.EXPO_PUBLIC_API_URL ||
        process.env.EXPO_PUBLIC_API_URL.includes('localhost')
    ) {
        if (Platform.OS !== 'web') {
            console.log('⚠️  WARNING: Using emulator/simulator defaults');
            console.log('💡 For physical devices, create mobile/.env with:');
            console.log('   EXPO_PUBLIC_API_URL=http://YOUR_IP:8000');
            console.log('   Find your IP: Run ./scripts/find-ip.sh');
            console.log('   Then restart Expo: npm start');
        }
    }
    console.log('═══════════════════════════════════════');
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public data?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Request configuration options
 */
interface RequestConfig extends RequestInit {
    timeout?: number;
}

/**
 * Create a fetch request with timeout using AbortController
 */
async function fetchWithTimeout(
    url: string,
    options: RequestConfig = {}
): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new ApiError(
                'Request timed out. Please check your network connection.'
            );
        }
        throw error;
    }
}

/**
 * Main API client function
 * Handles authentication, base URL, and error handling
 */
async function apiRequest<T>(
    endpoint: string,
    options: RequestConfig = {}
): Promise<T> {
    // Ensure /api prefix is added to all requests
    const url = endpoint.startsWith('/api')
        ? `${API_URL}${endpoint}`
        : `${API_URL}/api${endpoint}`;

    // Get auth token
    const token = await getItem('auth_token');

    // Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        if (__DEV__) {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
        }

        const response = await fetchWithTimeout(url, {
            ...options,
            headers,
            timeout: options.timeout || 30000,
        });

        if (__DEV__) {
            console.log(
                `📡 API Response: ${response.status} ${response.statusText}`
            );
        }

        // Handle 401 Unauthorized - clear token
        if (response.status === 401) {
            await removeItem('auth_token');
            // Navigation will be handled by AuthContext
            throw new ApiError('Unauthorized', 401);
        }

        // Check if response is ok
        if (!response.ok) {
            let errorData: unknown;
            try {
                errorData = await response.json();
            } catch {
                errorData = await response.text();
            }

            if (__DEV__) {
                console.error('❌ API Error:', response.status, errorData);
            }

            throw new ApiError(
                `Request failed: ${response.statusText}`,
                response.status,
                errorData
            );
        }

        // Parse JSON response
        const data = await response.json();
        return data as T;
    } catch (error) {
        // Enhanced error logging for connection issues
        if (__DEV__) {
            if (error instanceof Error) {
                if (
                    error.message.includes('timeout') ||
                    error.message.includes('timed out')
                ) {
                    console.error('⏱️  CONNECTION TIMEOUT');
                    console.error('This usually means:');
                    console.error(`  1. Cannot reach ${API_URL}`);
                    console.error('  2. Backend is not running');
                    console.error('  3. Wrong IP address in .env file');
                    console.error('  4. Firewall blocking port 8000');
                    console.error('  5. Phone and computer not on same WiFi');
                } else if (
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Network')
                ) {
                    console.error('🌐 NETWORK ERROR');
                    console.error('This usually means:');
                    console.error(`  1. Cannot connect to ${API_URL}`);
                    console.error(
                        '  2. Check your .env file has the correct IP'
                    );
                    console.error(
                        '  3. Test in phone browser:',
                        `${API_URL}/api/health`
                    );
                    console.error(
                        '  4. Ensure backend is running on port 8000'
                    );
                }
            }
        }

        // Re-throw ApiError as-is
        if (error instanceof ApiError) {
            throw error;
        }
        // Wrap other errors
        throw new ApiError(
            error instanceof Error ? error.message : 'Unknown error'
        );
    }
}

/**
 * API client methods matching axios interface for easy migration
 */
export const apiClient = {
    get: <T>(url: string, config?: RequestConfig): Promise<{ data: T }> => {
        return apiRequest<T>(url, { ...config, method: 'GET' }).then(
            (data) => ({ data })
        );
    },

    post: <T>(
        url: string,
        data?: unknown,
        config?: RequestConfig
    ): Promise<{ data: T }> => {
        return apiRequest<T>(url, {
            ...config,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }).then((data) => ({ data }));
    },

    patch: <T>(
        url: string,
        data?: unknown,
        config?: RequestConfig
    ): Promise<{ data: T }> => {
        return apiRequest<T>(url, {
            ...config,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }).then((data) => ({ data }));
    },

    put: <T>(
        url: string,
        data?: unknown,
        config?: RequestConfig
    ): Promise<{ data: T }> => {
        return apiRequest<T>(url, {
            ...config,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }).then((data) => ({ data }));
    },

    delete: <T>(url: string, config?: RequestConfig): Promise<{ data: T }> => {
        return apiRequest<T>(url, { ...config, method: 'DELETE' }).then(
            (data) => ({ data })
        );
    },
};

export default apiClient;
export { API_URL };
