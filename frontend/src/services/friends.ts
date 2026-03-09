/**
 * Friends API service for managing friendships
 */

import type {
    FriendListResponse,
    FriendshipResponse,
    User,
} from '../types/api';
import { getApiUrl } from '../utils/api';

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
            const errorData = await response.json() as { detail?: string };
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // Use status text if no JSON body
        }
        throw new Error(errorMessage);
    }
    if (response.status === 204) {
        return null as T;
    }
    return response.json() as Promise<T>;
}

// ============================================================================
// FRIENDS API
// ============================================================================

/**
 * Get list of accepted friends
 */
export async function getFriends(): Promise<FriendListResponse[]> {
    const response = await fetch(`${getApiUrl()}/friends`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<FriendListResponse[]>(response);
}

/**
 * Get pending friend requests received by current user
 */
export async function getPendingRequests(): Promise<FriendshipResponse[]> {
    const response = await fetch(`${getApiUrl()}/friends/requests/pending`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<FriendshipResponse[]>(response);
}

/**
 * Get friend requests sent by current user
 */
export async function getSentRequests(): Promise<FriendshipResponse[]> {
    const response = await fetch(`${getApiUrl()}/friends/requests/sent`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<FriendshipResponse[]>(response);
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(addresseeId: number): Promise<FriendshipResponse> {
    const response = await fetch(`${getApiUrl()}/friends/request`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ addressee_id: addresseeId }),
    });
    return handleResponse<FriendshipResponse>(response);
}

/**
 * Respond to a friend request (accept or reject)
 */
export async function respondToFriendRequest(
    friendshipId: number,
    accept: boolean
): Promise<FriendshipResponse> {
    const response = await fetch(`${getApiUrl()}/friends/respond`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ friendship_id: friendshipId, accept }),
    });
    return handleResponse<FriendshipResponse>(response);
}

/**
 * Remove a friend or cancel a friend request
 */
export async function removeFriend(friendshipId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

// ============================================================================
// USER SEARCH API
// ============================================================================

/**
 * Search for users by username
 */
export async function searchUsers(query: string): Promise<User[]> {
    if (!query || query.length < 2) {
        return [];
    }
    const response = await fetch(`${getApiUrl()}/auth/users/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<User[]>(response);
}
