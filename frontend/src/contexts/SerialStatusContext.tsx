import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSerialStatus, type SerialStatus } from '../services/livedata';
import {
    getBleStatus,
    onBleStatusChange,
    isBluetoothSupported as checkBleSupport,
} from '../services/bluetooth';
import { useAuth } from './AuthContext';

interface SerialStatusContextValue {
    status: SerialStatus;
    bleConnected: boolean;
    bleSupported: boolean;
    refreshStatus: () => Promise<void>;
}

const defaultStatus: SerialStatus = {
    connected: false,
    port: null,
    recording: false,
    recording_samples: 0,
};

const SerialStatusContext = createContext<SerialStatusContextValue>({
    status: defaultStatus,
    bleConnected: false,
    bleSupported: false,
    refreshStatus: async () => {},
});

export function useSerialStatus() {
    return useContext(SerialStatusContext);
}

const POLL_INTERVAL_MS = 500;

export function SerialStatusProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [status, setStatus] = useState<SerialStatus>(defaultStatus);
    const [bleConnected, setBleConnected] = useState(false);
    const bleSupported = checkBleSupport();

    const mergeStatus = useCallback(() => {
        const ble = getBleStatus();
        if (ble.connected) {
            setBleConnected(true);
            setStatus({
                connected: true,
                port: ble.port ?? 'BLE',
                recording: ble.recording,
                recording_samples: ble.recording_samples,
            });
        } else {
            setBleConnected(false);
        }
    }, []);

    useEffect(() => {
        const unsub = onBleStatusChange(mergeStatus);
        return unsub;
    }, [mergeStatus]);

    const refreshStatus = useCallback(async () => {
        const ble = getBleStatus();
        if (ble.connected) {
            mergeStatus();
            return;
        }
        try {
            const data = await getSerialStatus();
            setStatus(data);
        } catch {
            setStatus(defaultStatus);
        }
    }, [mergeStatus]);

    useEffect(() => {
        if (!isAuthenticated) {
            setStatus(defaultStatus);
            return;
        }

        refreshStatus();

        const interval = setInterval(refreshStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isAuthenticated, refreshStatus]);

    return (
        <SerialStatusContext.Provider value={{ status, bleConnected, bleSupported, refreshStatus }}>
            {children}
        </SerialStatusContext.Provider>
    );
}
