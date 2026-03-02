
export interface User {
    id: number;
    username: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
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
    avatar_url?: string | null;
}