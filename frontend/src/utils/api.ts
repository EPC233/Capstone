/**
 * Shared API utility functions — single source of truth for auth headers,
 * base URL resolution, and response handling across all frontend services.
 */

export function getAuthHeaders(
    includeContentType = true
): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
        ...(includeContentType && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

export function getApiUrl(): string {
    const baseUrl =
        (import.meta.env.VITE_API_URL as string | undefined) !== undefined
            ? (import.meta.env.VITE_API_URL as string)
            : 'http://localhost:8000';
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

export async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
            const errorData = (await response.json()) as { detail?: string };
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // If response body is not JSON, use status text
        }

        if (response.status === 401 || response.status === 403) {
            console.error('Authentication error:', {
                status: response.status,
                message: errorMessage,
            });

            localStorage.removeItem('auth_token');
            localStorage.removeItem('token_type');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null as T;
    }

    return response.json() as Promise<T>;
}
