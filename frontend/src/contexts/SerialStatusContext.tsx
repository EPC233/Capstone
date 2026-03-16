import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getSerialStatus, type SerialStatus } from '../services/livedata';
import { useAuth } from './AuthContext';

interface SerialStatusContextValue {
    status: SerialStatus;
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
    refreshStatus: async () => {},
});

export function useSerialStatus() {
    return useContext(SerialStatusContext);
}

const POLL_INTERVAL_MS = 500;

export function SerialStatusProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [status, setStatus] = useState<SerialStatus>(defaultStatus);

    const refreshStatus = useCallback(async () => {
        try {
            const data = await getSerialStatus();
            setStatus(data);
        } catch {
            // If the request fails, assume disconnected
            setStatus(defaultStatus);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            setStatus(defaultStatus);
            return;
        }

        // Fetch immediately
        refreshStatus();

        // Poll periodically
        const interval = setInterval(refreshStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [isAuthenticated, refreshStatus]);

    return (
        <SerialStatusContext.Provider value={{ status, refreshStatus }}>
            {children}
        </SerialStatusContext.Provider>
    );
}
