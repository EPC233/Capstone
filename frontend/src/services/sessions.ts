import { getApiUrl, getAuthHeaders, handleResponse } from '../utils/api';

// ---- Types -----------------------------------------------------------------

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
    name?: string | null;
    description?: string | null;
    weight_kg?: number | null;
    status: string; // "empty" | "recording" | "complete"
    accelerometer_data: AccelerometerData | null;
    rep_details: RepInfo[];
    graph_images: GraphImage[];
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

export interface CreateSetData {
    weight_kg?: number | null;
}

export interface UpdateSetData {
    name?: string | null;
    description?: string | null;
    weight_kg?: number | null;
}

// ---- Session CRUD ----------------------------------------------------------

export async function getSessions(): Promise<Session[]> {
    const response = await fetch(`${getApiUrl()}/sessions`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<Session[]>(response);
}

export async function getSession(sessionId: number): Promise<Session> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<Session>(response);
}

export async function createSession(data: CreateSessionData): Promise<Session> {
    const response = await fetch(`${getApiUrl()}/sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<Session>(response);
}

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

export async function deleteSession(sessionId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

// ---- Set CRUD --------------------------------------------------------------

export async function createSet(
    sessionId: number,
    data?: CreateSetData,
): Promise<WorkoutSet> {
    const response = await fetch(`${getApiUrl()}/sessions/${sessionId}/sets`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data ?? {}),
    });
    return handleResponse<WorkoutSet>(response);
}

export async function deleteSet(setId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/sets/${setId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

export async function updateSet(
    setId: number,
    data: UpdateSetData,
): Promise<WorkoutSet> {
    const response = await fetch(`${getApiUrl()}/sessions/sets/${setId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    return handleResponse<WorkoutSet>(response);
}

// ---- Accelerometer data (attached to a Set) --------------------------------

export async function uploadAccelerometerData(
    setId: number,
    file: File,
    description?: string
): Promise<WorkoutSet> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
        formData.append('description', description);
    }

    const response = await fetch(`${getApiUrl()}/sessions/sets/${setId}/accelerometer`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        body: formData,
    });
    return handleResponse<WorkoutSet>(response);
}

export async function deleteAccelerometerData(dataId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/accelerometer/${dataId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

// ---- Graph images ----------------------------------------------------------

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
        headers: getAuthHeaders(false),
        body: formData,
    });
    return handleResponse<GraphImage>(response);
}

export async function deleteGraphImage(imageId: number): Promise<void> {
    const response = await fetch(`${getApiUrl()}/sessions/graph/${imageId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    await handleResponse<void>(response);
}

// ---- Analysis types & API --------------------------------------------------

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
    rest_at_top_seconds: number | null;
    rest_at_bottom_seconds: number | null;
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
    chart_image_url?: string;
}

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
