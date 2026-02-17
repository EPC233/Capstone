export interface Role {
    id: number;
    name: string;
    description?: string | null;
}

export interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    role: Role;
    created_at: string; // ISO datetime string
    updated_at: string; // ISO datetime string
}

export interface Token {
    access_token: string;
    token_type: string;
}

export interface UserCreate {
    username: string;
    email: string;
    password: string;
    role?: string;
    first_name?: string | null;
    last_name?: string | null;
}

export interface UserUpdate {
    username?: string | null;
    email?: string | null;
    password?: string | null;
    role?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export interface UserProfileUpdate {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
}
