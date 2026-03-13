
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

