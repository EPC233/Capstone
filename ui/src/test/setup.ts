import '@testing-library/jest-dom';
import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock window.matchMedia for Mantine components
beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

// Cleanup after each test
afterEach(() => {
    cleanup();
});
