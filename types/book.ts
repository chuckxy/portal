/**
 * Simplified Book Types - Direct provider handling
 */

export type BookProvider = 'googleBooks' | 'openLibrary' | 'dBooks' | 'internetArchive' | 'libraryOfCongress';

/**
 * Search parameters
 */
export interface SearchParams {
    query: string;
    searchBy?: 'title' | 'author' | 'isbn' | 'subject' | 'publisher';
    filterValue?: string;
    startIndex?: number;
    maxResults?: number;
    dateRange?: [Date, Date];
    mediaType?: string;
    allowDownload?: boolean;
    googleFilter?: string | null;
}
