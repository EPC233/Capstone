/**
 * Construct full avatar URL from relative or absolute URL
 * @param avatarUrl - Avatar URL (can be relative or absolute)
 * @param apiUrl - Base API URL
 * @returns Full avatar URL or null
 */
export function getAvatarUrl(
    avatarUrl: string | null | undefined,
    apiUrl: string
): string | null {
    if (!avatarUrl) return null;
    // If it's already a full URL (starts with http), return as is
    if (avatarUrl.startsWith('http')) {
        return avatarUrl;
    }
    // Otherwise, construct full URL from API base
    return `${apiUrl.replace('/api', '')}${avatarUrl}`;
}
