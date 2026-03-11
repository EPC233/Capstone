import { getApiUrl } from '../utils/api';

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

function getAuthHeaders(includeContentType = true): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return {
        ...(includeContentType && { 'Content-Type': 'application/json' }),
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

/**
 * Get all sessions for the current user
 */
export async function getSessions(): Promise<Session[]> {
    const response = await fetch(`${getApiUrl()}/sessions`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<Session[]>(response);
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: number): Promise<Session> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<Session>(response);
}

/**
 * Create a new session
 */
export async function createSession(data: CreateSessionData): Promise<Session> {
    const response = await fetch(`${getApiUrl()}/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Session>(response);
}

/**
 * Update a session
 */
export async function updateSession(
    sessionId: number,
    data: UpdateSessionData
): Promise<Session> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Session>(response);
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
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

    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}/accelerometer`, {
        method: 'POST',
        headers: getAuthHeaders(false), // No Content-Type for FormData
        body: formData,
    });
    return handleResponse<AccelerometerData>(response);
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

    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}/graph`, {
        method: 'POST',
        headers: getAuthHeaders(false), // No Content-Type for FormData
        body: formData,
    });
    return handleResponse<GraphImage>(response);
}

/**
 * Delete accelerometer data
 */
export async function deleteAccelerometerData(dataId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/accelerometer/${dataId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

/**
 * Delete graph image
 */
export async function deleteGraphImage(imageId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/graph/${imageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

// ---- Analysis types & API ----

export interface PhaseInfo {
    start_sample: number;
    end_sample: number;
    duration_seconds: number;
    peak_velocity: number;
    avg_velocity: number;
    peak_accel: number;
    avg_accel: number;
    avg_watts: number | null;
}

export interface RepInfo {
    rep_number: number;
    start_sample: number;
    end_sample: number;
    duration_seconds: number;
    rom_meters: number;
    rom_cm: number;
    peak_velocity: number;
    avg_velocity: number;
    peak_accel: number;
    concentric: PhaseInfo | null;
    eccentric: PhaseInfo | null;
    avg_watts: number | null;
}

export interface AnalysisChart {
    time_samples: number[];
    z_accel: number[];
    velocity: number[];
    position: number[];
    ax_world: number[];
    ay_world: number[];
    az_world: number[];
}

export interface AnalysisResult {
    total_samples: number;
    sample_rate: number;
    duration_seconds: number;
    rep_count: number;
    reps: RepInfo[];
    chart: AnalysisChart;
    rep_boundaries: { start: number; end: number }[];
}

/**
 * Analyze an accelerometer CSV file and get rep detection + chart data
 */
export async function analyzeAccelerometerData(
    dataId: number,
    params?: {
        sample_rate?: number;
        threshold?: number;
        smooth_window?: number;
        min_rep_samples?: number;
        min_rom_cm?: number;
        rest_sensitivity?: number;
        weight_kg?: number;
    },
): Promise<AnalysisResult> {
    const qp = new URLSearchParams();
    if (params?.sample_rate !== undefined) qp.set('sample_rate', String(params.sample_rate));
    if (params?.threshold !== undefined) qp.set('threshold', String(params.threshold));
    if (params?.smooth_window !== undefined) qp.set('smooth_window', String(params.smooth_window));
    if (params?.min_rep_samples !== undefined) qp.set('min_rep_samples', String(params.min_rep_samples));
    if (params?.min_rom_cm !== undefined) qp.set('min_rom_cm', String(params.min_rom_cm));
    if (params?.rest_sensitivity !== undefined) qp.set('rest_sensitivity', String(params.rest_sensitivity));
    if (params?.weight_kg !== undefined) qp.set('weight_kg', String(params.weight_kg));
    const qs = qp.toString() ? `?${qp.toString()}` : '';

    const response = await fetch(`${getApiUrl()}/sessions/accelerometer/${dataId}/analyze${qs}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<AnalysisResult>(response);
}
