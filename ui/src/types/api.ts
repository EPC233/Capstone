export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  email_verified: boolean;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface UserUpdate {
  username?: string | null;
  email?: string | null;
  password?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface UserProfileUpdate {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

// ============================================================================
// FRIEND TYPES
// ============================================================================

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendUser {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface FriendshipResponse {
  id: number;
  requester: FriendUser;
  addressee: FriendUser;
  status: FriendshipStatus;
  created_at: string;
}

export interface FriendListResponse {
  id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  friendship_id: number;
}

export interface FriendRequest {
  addressee_id: number;
}

export interface FriendRequestResponse {
  friendship_id: number;
  accept: boolean;
}

