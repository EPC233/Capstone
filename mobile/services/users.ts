import apiClient from './api';
import { User } from '../types';

export interface UpdateUserProfileData {
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    child_name?: string | null;
    child_sex_assigned_at_birth?: string | null;
    child_dob?: string | null;
    avatar_url?: string | null;
}

/**
 * Update current user's profile
 */
export async function updateUserProfile(
    userId: number,
    data: UpdateUserProfileData
): Promise<User> {
    const response = await apiClient.patch<User>(`/api/users/${userId}`, data);
    return response.data;
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
}
