/// <reference types="web-bluetooth" />
/**
 * Web Bluetooth service — connects directly to the IMU-Sensor Arduino
 * via BLE from the browser, parses binary IMU packets, and handles
 * client-side recording with CSV upload to the backend.
 */

import { getApiUrl } from '../utils/api';
import type { AccelDataPoint } from './livedata';

// ---- BLE UUIDs (must match Arduino firmware) --------------------------------
const IMU_SERVICE_UUID = '12345678-1234-5678-1234-56789abcdef0';
const IMU_CHARACTERISTIC_UUID = '12345678-1234-5678-1234-56789abcdef1';

// 56-byte packet: uint32 timestamp + 13 floats
const PACKET_SIZE = 4 + 13 * 4; // 56 bytes

// ---- CSV header matching backend expectations --------------------------------
const CSV_HEADER =
    'timestamp_us,ax,ay,az,gx,gy,gz,qw,qx,qy,qz,ax_world,ay_world,az_world';

// ---- Module state ------------------------------------------------------------
let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let sampleIndex = 0;

// Recording state
let recording = false;
let recordingSamples = 0;
let recordingStartTime = 0;
let csvLines: string[] = [];

// Subscriber callbacks
type DataCallback = (point: AccelDataPoint) => void;
type StatusCallback = () => void;
const dataListeners: Set<DataCallback> = new Set();
const statusListeners: Set<StatusCallback> = new Set();

function notifyStatus() {
    statusListeners.forEach((cb) => cb());
}

// ---- Packet parsing ----------------------------------------------------------

function parsePacket(buffer: DataView): AccelDataPoint {
    let offset = 0;
    const timestamp_us = buffer.getUint32(offset, true);
    offset += 4;

    const readFloat = (): number => {
        const v = buffer.getFloat32(offset, true);
        offset += 4;
        return v;
    };

    const ax = readFloat();
    const ay = readFloat();
    const az = readFloat();
    const gx = readFloat();
    const gy = readFloat();
    const gz = readFloat();
    const qw = readFloat();
    const qx = readFloat();
    const qy = readFloat();
    const qz = readFloat();
    const ax_world = readFloat();
    const ay_world = readFloat();
    const az_world = readFloat();

    sampleIndex++;

    const point: AccelDataPoint = {
        ax,
        ay,
        az,
        gx,
        gy,
        gz,
        qw,
        qx,
        qy,
        qz,
        ax_world,
        ay_world,
        az_world,
        index: sampleIndex,
        timestamp: timestamp_us / 1e6, // convert µs → seconds
    };

    // Buffer CSV line if recording
    if (recording) {
        csvLines.push(
            `${timestamp_us},${ax},${ay},${az},${gx},${gy},${gz},${qw},${qx},${qy},${qz},${ax_world},${ay_world},${az_world}`,
        );
        recordingSamples++;
        notifyStatus();
    }

    return point;
}

// ---- Notification handler ----------------------------------------------------

function handleNotification(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value || value.byteLength < PACKET_SIZE) return;

    const point = parsePacket(new DataView(value.buffer, value.byteOffset, value.byteLength));
    dataListeners.forEach((cb) => cb(point));
}

// ---- Public API --------------------------------------------------------------

/** Check if the browser supports Web Bluetooth */
export function isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Check if currently connected to a BLE device */
export function isBleConnected(): boolean {
    return device?.gatt?.connected === true;
}

/** Get BLE connection status in the same shape as SerialStatus */
export function getBleStatus() {
    return {
        connected: isBleConnected(),
        port: device?.name ?? null,
        recording,
        recording_samples: recordingSamples,
    };
}

/**
 * Scan for and connect to the IMU-Sensor BLE device.
 * This triggers the browser's Bluetooth pairing dialog.
 */
export async function connectBle(): Promise<{ status: string; port?: string }> {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth is not supported in this browser');
    }

    // Request device with the IMU service
    device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [IMU_SERVICE_UUID] }],
    });

    if (!device.gatt) {
        throw new Error('GATT server not available on device');
    }

    // Listen for unexpected disconnects
    device.addEventListener('gattserverdisconnected', () => {
        characteristic = null;
        recording = false;
        notifyStatus();
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(IMU_SERVICE_UUID);
    characteristic = await service.getCharacteristic(IMU_CHARACTERISTIC_UUID);

    // Subscribe to notifications
    await characteristic.startNotifications();
    characteristic.addEventListener(
        'characteristicvaluechanged',
        handleNotification,
    );

    sampleIndex = 0;
    notifyStatus();

    return { status: 'connected', port: device.name ?? 'BLE' };
}

/** Disconnect from the BLE device */
export async function disconnectBle(): Promise<{ status: string }> {
    if (characteristic) {
        try {
            characteristic.removeEventListener(
                'characteristicvaluechanged',
                handleNotification,
            );
            await characteristic.stopNotifications();
        } catch {
            // already disconnected
        }
        characteristic = null;
    }

    if (device?.gatt?.connected) {
        device.gatt.disconnect();
    }
    device = null;
    recording = false;
    recordingSamples = 0;
    notifyStatus();

    return { status: 'disconnected' };
}

/** Start recording BLE data client-side */
export function startBleRecording() {
    if (!isBleConnected()) throw new Error('BLE not connected');
    csvLines = [];
    recordingSamples = 0;
    recordingStartTime = Date.now();
    recording = true;
    notifyStatus();
    return { status: 'recording_started' };
}

/**
 * Stop recording and upload the CSV to the backend.
 * Reuses the backend's existing save logic.
 */
export async function stopBleRecording(
    sessionId?: number,
    setId?: number,
): Promise<{
    status: string;
    sample_count: number;
    duration_seconds: number;
    saved_to_session?: number;
    set_id?: number;
    accelerometer_data_id?: number;
}> {
    recording = false;
    const sampleCount = recordingSamples;
    const duration = (Date.now() - recordingStartTime) / 1000;
    const csv = CSV_HEADER + '\n' + csvLines.join('\n') + '\n';
    csvLines = [];
    recordingSamples = 0;
    notifyStatus();

    // Upload to backend if session specified
    if (sessionId != null) {
        const API = getApiUrl();
        const token = localStorage.getItem('auth_token');
        const params = new URLSearchParams();
        params.set('session_id', String(sessionId));
        if (setId != null) params.set('set_id', String(setId));

        const res = await fetch(`${API}/serial/record/upload?${params.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/csv',
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: csv,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
            throw new Error((err as { detail?: string }).detail || 'Upload failed');
        }

        const result = await res.json();
        return {
            status: 'recording_stopped',
            sample_count: sampleCount,
            duration_seconds: duration,
            ...result,
        };
    }

    return {
        status: 'recording_stopped',
        sample_count: sampleCount,
        duration_seconds: duration,
    };
}

// ---- Subscriber management ---------------------------------------------------

/** Register a callback for each incoming BLE data point */
export function onBleData(cb: DataCallback): () => void {
    dataListeners.add(cb);
    return () => dataListeners.delete(cb);
}

/** Register a callback for BLE status changes */
export function onBleStatusChange(cb: StatusCallback): () => void {
    statusListeners.add(cb);
    return () => statusListeners.delete(cb);
}
