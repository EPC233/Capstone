/**
 * Live data / serial service — talks to the backend serial API
 * and provides a WebSocket wrapper for live accelerometer streaming.
 */

import { getApiUrl } from '../utils/api';

// ---- Types ----------------------------------------------------------------

export interface SerialPort {
    device: string;
    description: string;
    manufacturer: string;
    is_arduino: boolean;
}

export interface SerialStatus {
    connected: boolean;
    port: string | null;
    recording: boolean;
    recording_samples: number;
}

export interface ConnectResult {
    status: string;
    port?: string;
    detail?: string;
}

export interface RecordingStopResult {
    status: string;
    sample_count?: number;
    duration_seconds?: number;
    saved_to_session?: number;
    accelerometer_data_id?: number;
    detail?: string;
    save_error?: string;
}

export interface AccelDataPoint {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
    qw: number;
    qx: number;
    qy: number;
    qz: number;
    ax_world: number;
    ay_world: number;
    az_world: number;
    index: number;
    timestamp: number;
}

// ---- Helpers --------------------------------------------------------------

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
            const errorData = (await response.json()) as { detail?: string };
            errorMessage = errorData.detail || errorMessage;
        } catch {
            // ignore
        }
        throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
}

// ---- REST API calls -------------------------------------------------------

const API = getApiUrl();

export async function getSerialPorts(): Promise<SerialPort[]> {
    const res = await fetch(`${API}/serial/ports`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<SerialPort[]>(res);
}

export async function getSerialStatus(): Promise<SerialStatus> {
    const res = await fetch(`${API}/serial/status`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<SerialStatus>(res);
}

export async function connectSerial(
    port?: string,
    baud = 115200,
): Promise<ConnectResult> {
    const params = new URLSearchParams();
    if (port) params.set('port', port);
    params.set('baud', String(baud));

    const res = await fetch(`${API}/serial/connect?${params.toString()}`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse<ConnectResult>(res);
}

export async function disconnectSerial(): Promise<ConnectResult> {
    const res = await fetch(`${API}/serial/disconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse<ConnectResult>(res);
}

export async function startRecording(): Promise<{ status: string }> {
    const res = await fetch(`${API}/serial/record/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    return handleResponse<{ status: string }>(res);
}

export async function stopRecording(
    sessionId?: number,
): Promise<RecordingStopResult> {
    const params = new URLSearchParams();
    if (sessionId !== undefined) params.set('session_id', String(sessionId));

    const res = await fetch(
        `${API}/serial/record/stop?${params.toString()}`,
        {
            method: 'POST',
            headers: getAuthHeaders(),
        },
    );
    return handleResponse<RecordingStopResult>(res);
}

// ---- WebSocket live stream ------------------------------------------------

/**
 * Open a WebSocket connection with the live data endpoint.
 *
 * Returns an object with helpers:
 *  - `onData(cb)` — register a callback for each data point
 *  - `close()` — close the connection
 */
export function createLiveDataSocket(): {
    onData: (cb: (point: AccelDataPoint) => void) => void;
    onClose: (cb: () => void) => void;
    onError: (cb: (err: Event) => void) => void;
    close: () => void;
    isOpen: () => boolean;
} {
    // Derive ws:// or wss:// from the current API url
    const base = API.replace(/^http/, 'ws');
    const token = localStorage.getItem('auth_token') || '';
    const url = `${base}/serial/ws?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    let dataCb: ((p: AccelDataPoint) => void) | null = null;
    let closeCb: (() => void) | null = null;
    let errorCb: ((e: Event) => void) | null = null;

    ws.onmessage = (event) => {
        if (dataCb) {
            try {
                const point = JSON.parse(event.data as string) as AccelDataPoint;
                dataCb(point);
            } catch {
                // ignore parse errors
            }
        }
    };

    ws.onclose = () => {
        if (closeCb) closeCb();
    };

    ws.onerror = (e) => {
        if (errorCb) errorCb(e);
    };

    return {
        onData: (cb) => {
            dataCb = cb;
        },
        onClose: (cb) => {
            closeCb = cb;
        },
        onError: (cb) => {
            errorCb = cb;
        },
        close: () => ws.close(),
        isOpen: () => ws.readyState === WebSocket.OPEN,
    };
}
