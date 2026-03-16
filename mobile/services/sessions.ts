import api from './api';

export interface AccelerometerData {
    id: number;
    set_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    description?: string;
    created_at: string;
}

export interface WorkoutSet {
    id: number;
    session_id: number;
    set_number: number;
    weight_kg?: number | null;
    status: string;
    accelerometer_data: AccelerometerData | null;
    created_at: string;
    updated_at: string;
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

export interface Session {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    session_type?: string;
    created_at: string;
    updated_at: string;
    sets: WorkoutSet[];
    graph_images: GraphImage[];
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
 * Create a new set for a session
 */
export async function createSet(
    sessionId: number,
    data?: { weight_kg?: number | null }
): Promise<WorkoutSet> {
    const response = await api.post<WorkoutSet>(`/sessions/${sessionId}/sets`, data ?? {});
    return response.data;
}

/**
 * Delete a set
 */
export async function deleteSet(setId: number): Promise<void> {
    await api.delete(`/sessions/sets/${setId}`);
}

/**
 * Upload accelerometer CSV data for a set
 */
export async function uploadAccelerometerData(
    setId: number,
    file: File | Blob,
    fileName: string,
    description?: string
): Promise<WorkoutSet> {
    const formData = new FormData();
    formData.append('file', file, fileName);
    if (description) {
        formData.append('description', description);
    }

    const response = await api.post<WorkoutSet>(
        `/sessions/sets/${setId}/accelerometer`,
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
    file: File | Blob,
    fileName: string,
    description?: string
): Promise<GraphImage> {
    const formData = new FormData();
    formData.append('file', file, fileName);
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
