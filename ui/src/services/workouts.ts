import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface WorkoutSession {
    id: number;
    user_id: number;
    name: string;
    description?: string;
    workout_type?: string;
    created_at: string;
    updated_at: string;
    accelerometer_data: AccelerometerData[];
    graph_images: GraphImage[];
}

export interface AccelerometerData {
    id: number;
    workout_session_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    description?: string;
    created_at: string;
}

export interface GraphImage {
    id: number;
    workout_session_id: number;
    file_name: string;
    file_path: string;
    file_size?: number;
    image_type?: string;
    description?: string;
    created_at: string;
}

export interface CreateWorkoutData {
    name: string;
    description?: string;
    workout_type?: string;
}

export interface UpdateWorkoutData {
    name?: string;
    description?: string;
    workout_type?: string;
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
 * Get all workout sessions for the current user
 */
export async function getWorkouts(): Promise<WorkoutSession[]> {
    const response = await api.get<WorkoutSession[]>('/workouts');
    return response.data;
}

/**
 * Get a specific workout session by ID
 */
export async function getWorkout(workoutId: number): Promise<WorkoutSession> {
    const response = await api.get<WorkoutSession>(`/workouts/${workoutId}`);
    return response.data;
}

/**
 * Create a new workout session
 */
export async function createWorkout(
    data: CreateWorkoutData
): Promise<WorkoutSession> {
    const response = await api.post<WorkoutSession>('/workouts', data);
    return response.data;
}

/**
 * Update a workout session
 */
export async function updateWorkout(
    workoutId: number,
    data: UpdateWorkoutData
): Promise<WorkoutSession> {
    const response = await api.put<WorkoutSession>(
        `/workouts/${workoutId}`,
        data
    );
    return response.data;
}

/**
 * Delete a workout session
 */
export async function deleteWorkout(workoutId: number): Promise<void> {
    await api.delete(`/workouts/${workoutId}`);
}

/**
 * Upload accelerometer CSV data for a workout
 */
export async function uploadAccelerometerData(
    workoutId: number,
    file: File,
    description?: string
): Promise<AccelerometerData> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
        formData.append('description', description);
    }

    const response = await api.post<AccelerometerData>(
        `/workouts/${workoutId}/accelerometer`,
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
 * Upload a graph image for a workout
 */
export async function uploadGraphImage(
    workoutId: number,
    file: File,
    description?: string
): Promise<GraphImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
        formData.append('description', description);
    }

    const response = await api.post<GraphImage>(
        `/workouts/${workoutId}/graph`,
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
    await api.delete(`/workouts/accelerometer/${dataId}`);
}

/**
 * Delete graph image
 */
export async function deleteGraphImage(imageId: number): Promise<void> {
    await api.delete(`/workouts/graph/${imageId}`);
}
