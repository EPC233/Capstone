import { getApiUrl } from '../../utils/api';

export const SESSION_TYPES: Record<string, string> = {
    bench_press: 'Bench Press',
    deadlift: 'Deadlift',
    squat: 'Squat',
};

export const SESSION_TYPE_OPTIONS = [
    { value: 'bench_press', label: 'Bench Press' },
    { value: 'deadlift', label: 'Deadlift' },
    { value: 'squat', label: 'Squat' },
];

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDownloadUrl(filePath: string): string {
    const relativePath = filePath.replace('/app/uploads/', '');
    return `${getApiUrl().replace('/api', '')}/uploads/${relativePath}`;
}
