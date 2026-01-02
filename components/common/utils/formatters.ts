/**
 * Formatting Utilities
 * Consistent formatting across the application
 */

/**
 * Format a date with various options
 */
export function formatDate(date: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
    const d = new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Format time
 */
export function formatTime(date: Date | string | number, options: Intl.DateTimeFormatOptions = {}): string {
    const d = new Date(date);

    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'GHS', options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat('en-GH', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
    }).format(amount);
}

/**
 * Format number with locale
 */
export function formatNumber(num: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat('en-US', options).format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    const intervals: [number, string, string][] = [
        [31536000, 'year', 'years'],
        [2592000, 'month', 'months'],
        [86400, 'day', 'days'],
        [3600, 'hour', 'hours'],
        [60, 'minute', 'minutes'],
        [1, 'second', 'seconds']
    ];

    for (const [seconds, singular, plural] of intervals) {
        const count = Math.floor(diffInSeconds / seconds);
        if (count >= 1) {
            return `${count} ${count === 1 ? singular : plural} ago`;
        }
    }

    return 'just now';
}

/**
 * Format duration (in seconds) to human-readable string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format grade/score
 */
export function formatGrade(score: number, maxScore: number = 100): string {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Format name (First Last or Last, First)
 */
export function formatName(firstName: string, lastName: string, format: 'first-last' | 'last-first' = 'first-last'): string {
    if (format === 'last-first') {
        return `${lastName}, ${firstName}`;
    }
    return `${firstName} ${lastName}`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}
