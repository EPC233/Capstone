import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Session {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    session_type?: string;
    created_at: string;
    updated_at: string;
    accelerometer_data: AccelerometerData[];
    graph_images: GraphImage[];
}

export interface AccelerometerData {
    id: number;
    session_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    description?: string;
    created_at: string;
}

export interface GraphImage {
    id: number;
    session_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    image_type?: string;
    description?: string;
    created_at: string;
}

export interface CreateSessionData {
    name: string;
    description?: string;
    session_type?: string;
}

export interface UpdateSessionData {
    name?: string;
    description?: string;
    session_type?: string;
}

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Get all sessions for the current user
 */
export async function getSessions(): Promise<Session[]> {
    const response = await api.get<Session[]>('/sessions');
    return response.data;
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: number): Promise<Session> {
    const response = await api.get<Session>(`/sessions/${sessionId}`);
    return response.data;
}

/**
 * Create a new session
 */
export async function createSession(data: CreateSessionData): Promise<Session> {
    const response = await api.post<Session>('/sessions', data);
    return response.data;
}

/**
 * Update a session
 */
export async function updateSession(
    sessionId: number,
    data: UpdateSessionData
): Promise<Session> {
    const response = await api.put<Session>(`/sessions/${sessionId}`, data);
    return response.data;
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: number): Promise<void> {
    await api.delete(`/sessions/${sessionId}`);
}

/**
 * Upload accelerometer CSV data for a session
 */
export async function uploadAccelerometerData(
    sessionId: number,
    file: File,
    description?: string
): Promise<AccelerometerData> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
        formData.append('description', description);
    }

    const response = await api.post<AccelerometerData>(
        `/sessions/${sessionId}/accelerometer`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
}

/**
 * Upload a graph image for a session
 */
export async function uploadGraphImage(
    sessionId: number,
    file: File,
    description?: string
): Promise<GraphImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
        formData.append('description', description);
    }

    const response = await api.post<GraphImage>(
        `/sessions/${sessionId}/graph`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );
    return response.data;
}

/**
 * Delete accelerometer data
 */
export async function deleteAccelerometerData(dataId: number): Promise<void> {
    await api.delete(`/sessions/accelerometer/${dataId}`);
}

/**
 * Delete graph image
 */
export async function deleteGraphImage(imageId: number): Promise<void> {
    await api.delete(`/sessions/graph/${imageId}`);
}
