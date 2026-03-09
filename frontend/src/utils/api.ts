/**
 * API utility functions for making authenticated requests
 */

import type { User, UserCreate, UserProfileUpdate } from '../types/api.js';

/**
 * Get authentication headers for API requests
 * @param includeContentType - Whether to include Content-Type header (default: true)
 * @returns Headers object with Content-Type (if requested) and Authorization
 */
export function getAuthHeaders(
    includeContentType = true
): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {
        ...(includeContentType && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
    };

    return headers;
}

/**
 * Get the API base URL from environment or default to localhost
 * Includes /api prefix for all API routes
 */
export function getApiUrl(): string {
    const baseUrl =
        (import.meta.env.VITE_API_URL as string | undefined) !== undefined
            ? (import.meta.env.VITE_API_URL as string)
            : 'http://localhost:8000';
    // Ensure /api is appended to the base URL
    return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
}

interface ErrorResponse {
    detail?: string;
}

/**
 * Handle API response errors consistently
 * @param response - Fetch response object
 * @returns Parsed JSON response
 * @throws {Error} If response is not ok
 */
async function handleResponse<T = unknown>(
    response: Response
): Promise<T | null> {
    if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
            const errorData = (await response.json()) as ErrorResponse;
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // If response is not JSON, use status text
        }

        // Log more details for debugging
        if (response.status === 401 || response.status === 403) {
            console.error('Authentication error:', {
                status: response.status,
                statusText: response.statusText,
                message: errorMessage,
                hasToken: !!localStorage.getItem('auth_token'),
            });
        }

        // Check for authentication errors and redirect to login
        if (
            response.status === 401 ||
            response.status === 403 ||
            errorMessage.includes('Could not validate credentials') ||
            errorMessage.includes('Not authenticated')
        ) {
            // Clear auth token
            localStorage.removeItem('auth_token');
            localStorage.removeItem('token_type');

            // Redirect to login page
            // Only redirect if we're not already on the login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        throw new Error(errorMessage);
    }

    // Handle 204 No Content responses (common for DELETE requests)
    if (response.status === 204) {
        return null;
    }

    return response.json() as Promise<T>;
}

// ============================================================================
// USER API Functions
// ============================================================================

/**
 * Register a new user
 * @param userData - User data including username, email, password
 * @param apiUrl - Base API URL
 * @returns Created user object
 */
export async function createUser(
    userData: UserCreate,
    apiUrl = getApiUrl()
): Promise<User> {
    const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
    });
    return handleResponse<User>(response) as Promise<User>;
}

/**
 * Update a user's profile fields
 * @param userId - User ID
 * @param profileData - Profile data (first_name, last_name, avatar_url)
 * @param apiUrl - Base API URL
 * @returns Updated user object
 */
export async function updateUserProfile(
    userId: number,
    profileData: UserProfileUpdate,
    apiUrl = getApiUrl()
): Promise<User> {
    const response = await fetch(`${apiUrl}/auth/users/${userId}/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
    });
    return handleResponse<User>(response) as Promise<User>;
}
