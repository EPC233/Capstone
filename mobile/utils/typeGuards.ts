/**
 * Type guard utilities to ensure proper type conversion
 */

/**
 * Safely convert a value to a boolean
 * Handles strings like "true"/"false", numbers, null, undefined
 */
export function toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim();
        if (lower === 'true' || lower === '1') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === '') {
            return false;
        }
    }
    if (typeof value === 'number') {
        return value !== 0 && !isNaN(value);
    }
    return Boolean(value);
}

/**
 * Ensure a value is a number, returning 0 if invalid
 */
export function toNumber(value: unknown): number {
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}
