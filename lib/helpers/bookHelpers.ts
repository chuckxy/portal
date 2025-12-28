/**
 * Utility functions for book operations
 */

/**
 * Shorten string to specified length with ellipsis
 */
export function shortenString(str: string | undefined, maxLength: number = 40): string {
    if (!str) return '';
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

/**
 * Format date to locale string
 */
export function formatBookDate(dateString: string | undefined): string {
    if (!dateString) return 'Unknown';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch {
        return dateString;
    }
}

/**
 * Get placeholder image URL
 */
export function getPlaceholderImage(text: string = 'No Image'): string {
    return `https://placehold.jp/3d4070/ffffff/100x150.png?text=${encodeURIComponent(text)}`;
}

/**
 * Get Internet Archive thumbnail URL
 */
export function getArchiveThumbnail(identifier: string): string {
    return `https://archive.org/services/img/${identifier}`;
}
