'use client';

import React, { useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Fieldset } from 'primereact/fieldset';
import { Divider } from 'primereact/divider';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Carousel } from 'primereact/carousel';
import { Paginator } from 'primereact/paginator';
import { Tooltip } from 'primereact/tooltip';
import { Tag } from 'primereact/tag';
import { BookProvider } from '@/types/book';
import { getPlaceholderImage, shortenString, getArchiveThumbnail } from '@/lib/helpers/bookHelpers';
import { useAuth } from '@/context/AuthContext';

export default function AddBooksOnline() {
    const { user } = useAuth();
    // State
    const [provider, setProvider] = useState<BookProvider>('googleBooks');
    const [searchText, setSearchText] = useState('');
    const [filterValue, setFilterValue] = useState('');
    const [searchBy, setSearchBy] = useState<'title' | 'author' | 'isbn' | 'subject' | 'publisher' | ''>('');
    const [allowFilter, setAllowFilter] = useState(false);
    const [googleFilter, setGoogleFilter] = useState<string | null>(null);
    const [books, setBooks] = useState<any[]>([]);
    const [unfilteredBooks, setUnfilteredBooks] = useState<any[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [page, setPage] = useState(0);
    const [first, setFirst] = useState(0);
    const [rows] = useState(10);
    const [isLoading, setIsLoading] = useState(false);
    const [workerBusy, setWorkerBusy] = useState(false);
    const [addingBookId, setAddingBookId] = useState<string | undefined>();
    const [fullSearchValue, setFullSearchValue] = useState('');
    const toast = useRef<Toast>(null);

    // Helper functions
    const showMessage = (summary: string, detail: string, severity: 'success' | 'info' | 'warn' | 'error') => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const getGoogleSearchPrefix = (field: string): string => {
        const map: Record<string, string> = {
            title: 'intitle',
            author: 'inauthor',
            isbn: 'isbn',
            subject: 'subject',
            publisher: 'inpublisher'
        };
        return map[field] || '';
    };

    const getOpenLibraryField = (field: string): string => {
        const map: Record<string, string> = {
            title: 'title',
            author: 'author',
            isbn: 'isbn',
            subject: 'subject',
            publisher: 'publisher'
        };
        return map[field] || 'q';
    };

    // URL builders
    const getGoogleBooksUrl = (): string => {
        const params: any = {
            maxResults: 20,
            startIndex,
            q: searchText
        };

        // Only add API key if it exists and is not the placeholder
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
        if (apiKey && apiKey.length > 0) {
            params.key = apiKey;
        }

        if (googleFilter) params.filter = googleFilter;

        if (allowFilter && filterValue) {
            const prefix = getGoogleSearchPrefix(searchBy);
            params.q = `${prefix}:${filterValue}`;
        }

        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        return `https://www.googleapis.com/books/v1/volumes?${queryString}`;
    };

    const getOpenLibraryUrl = (): string | null => {
        if (allowFilter && !filterValue) return null;
        if (!allowFilter && !searchText) return null;

        const params: any = {
            limit: 40,
            offset: startIndex,
            fields: 'title,author_name,publish_date,isbn,cover_i,ebook_access,publishers,subject,lccn,key'
        };

        if (allowFilter && filterValue) {
            const fieldKey = getOpenLibraryField(searchBy);
            params[fieldKey] = filterValue;
        } else {
            params.q = searchText;
        }

        const queryString = Object.entries(params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        return `https://openlibrary.org/search.json?${queryString}`;
    };

    const getInternetArchiveUrl = (): string => {
        return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchText)}&rows=20&page=${startIndex}&output=json`;
    };

    const getLibraryOfCongressUrl = (): string => {
        return `https://www.loc.gov/search/?q=${encodeURIComponent(searchText)}&fo=json&at=results,pagination&c=20&sp=${startIndex}`;
    };

    const getSearchUrl = (): string | null => {
        if (!searchText && !filterValue) {
            showMessage('Empty Search', 'No value was found for searching query', 'error');
            return null;
        }

        switch (provider) {
            case 'googleBooks':
                return getGoogleBooksUrl();
            case 'openLibrary':
                return getOpenLibraryUrl();
            case 'dBooks':
                return `https://www.dbooks.org/api/search/${encodeURIComponent(searchText)}`;
            case 'internetArchive':
                return getInternetArchiveUrl();
            case 'libraryOfCongress':
                return getLibraryOfCongressUrl();
            default:
                return null;
        }
    };

    // Search functionality
    const performSearch = async () => {
        if (!searchText.trim() && (!allowFilter || !filterValue)) {
            showMessage('Empty Search', 'Please enter a search term', 'warn');
            return;
        }

        setIsLoading(true);
        setStartIndex(0);
        setPage(0);
        setFirst(0);

        const url = getSearchUrl();
        if (!url) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error (${response.status}): ${response.statusText || errorText}`);
            }

            const data = await response.json();
            const { books: newBooks, total } = extractBooksFromResponse(data);

            setBooks(newBooks);
            setUnfilteredBooks(newBooks);
            setTotalResults(total);

            if (newBooks.length === 0) {
                showMessage('No Results', 'No books found for your search', 'info');
            }
        } catch (error: any) {
            console.error('Search error:', error);
            showMessage('Search Failed', error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const extractBooksFromResponse = (data: any): { books: any[]; total: number } => {
        switch (provider) {
            case 'googleBooks':
                return {
                    books: data.items || [],
                    total: data.totalItems || 0
                };
            case 'openLibrary':
                return {
                    books: data.docs || [],
                    total: data.numFound || 0
                };
            case 'dBooks':
                return {
                    books: data.books || [],
                    total: parseInt(data.total) || 0
                };
            case 'internetArchive':
                return {
                    books: data.response?.docs || [],
                    total: data.response?.numFound || 0
                };
            case 'libraryOfCongress':
                return {
                    books: data.results || [],
                    total: data.pagination?.total || 0
                };
            default:
                return { books: [], total: 0 };
        }
    };

    // Local search
    const searchLoadedBooks = (value: string) => {
        setFullSearchValue(value);

        if (!value.trim()) {
            setBooks(unfilteredBooks);
            return;
        }

        const lowerValue = value.toLowerCase();
        const filtered = unfilteredBooks.filter((book) => {
            const searchIn = JSON.stringify(book).toLowerCase();
            return searchIn.includes(lowerValue);
        });

        setBooks(filtered);
        setFirst(0);
        setPage(0);
    };

    // Load more books from API
    const loadMoreBooks = async () => {
        if (workerBusy || books.length >= totalResults) return;

        setWorkerBusy(true);

        // Calculate next start index based on current books length
        const nextStartIndex = books.length;

        try {
            // Temporarily update startIndex to get the correct URL
            const currentStartIndex = startIndex;
            setStartIndex(nextStartIndex);

            const url = getSearchUrl();
            if (!url) {
                setStartIndex(currentStartIndex); // Restore if URL generation fails
                setWorkerBusy(false);
                return;
            }

            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error (${response.status}): ${response.statusText || errorText}`);
            }

            const data = await response.json();
            const { books: newBooks } = extractBooksFromResponse(data);

            if (newBooks.length > 0) {
                const combinedBooks = [...unfilteredBooks, ...newBooks];
                setBooks(combinedBooks);
                setUnfilteredBooks(combinedBooks);
            } else {
                // No more results, update totalResults to match current length
                setTotalResults(books.length);
            }
        } catch (error: any) {
            console.error('Load more error:', error);
            showMessage('Load Failed', 'Failed to load more books', 'error');
        } finally {
            setWorkerBusy(false);
        }
    };

    // Pagination
    const onPageChange = (event: any) => {
        setFirst(event.first);
        setPage(event.page);

        // Load more if approaching end (within 2 pages of the end)
        const totalNeeded = (event.page + 3) * event.rows;
        if (totalNeeded > books.length && books.length < totalResults && !workerBusy) {
            loadMoreBooks();
        }
    };

    // Book templates
    const googleBooksTemplate = (book: any) => {
        const volumeInfo = book.volumeInfo || {};
        const sanitizedId = book.id?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'unknown';

        return (
            <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
                <Tooltip target={`.book-${sanitizedId}`} position="top" />
                <div className="mb-3">
                    <img
                        src={volumeInfo.imageLinks?.thumbnail || getPlaceholderImage()}
                        alt={volumeInfo.title}
                        className={`book-${sanitizedId} w-6 shadow-2`}
                        style={{ width: '80px', maxWidth: '120px', height: '150px', objectFit: 'cover' }}
                        data-pr-tooltip={`${volumeInfo.title} by ${volumeInfo.authors?.[0] || 'Unknown'}`}
                        onError={(e) => ((e.target as HTMLImageElement).src = getPlaceholderImage())}
                    />
                </div>
                <div>
                    <h6 className="mb-1">{shortenString(volumeInfo.title, 30)}</h6>
                    {volumeInfo.authors && <Tag value={shortenString(volumeInfo.authors[0], 20)} severity="success" />}
                </div>
                <div className="mt-4 flex gap-2 justify-content-center">
                    <Button
                        icon={book.accessInfo?.publicDomain ? 'pi pi-arrow-up-right' : 'pi pi-lock'}
                        className={`p-button-rounded ${book.accessInfo?.publicDomain ? 'p-button-primary' : 'p-button-secondary'}`}
                        onClick={() => readGoogleBook(book)}
                    />
                    <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => addGoogleBookToLibrary(book)} loading={addingBookId === book.id} />
                </div>
            </div>
        );
    };

    const openLibraryTemplate = (book: any) => {
        const bookId = book.isbn?.[0] || book.lccn?.[0] || book.key;
        const sanitizedId = bookId?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'unknown';

        return (
            <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
                <Tooltip target={`.book-${sanitizedId}`} position="top" />
                <div className="mb-3">
                    <img
                        src={book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : getPlaceholderImage()}
                        alt={book.title}
                        className={`book-${sanitizedId} w-6 shadow-2`}
                        style={{ width: '80px', height: '150px', objectFit: 'cover' }}
                        data-pr-tooltip={`${book.title} by ${book.author_name?.[0] || 'Unknown'}`}
                        onError={(e) => ((e.target as HTMLImageElement).src = getPlaceholderImage())}
                    />
                </div>
                <div>
                    <h6 className="mb-1">{shortenString(book.title, 30)}</h6>
                    {book.author_name && <Tag value={shortenString(book.author_name[0], 20)} severity="success" />}
                </div>
                <div className="mt-4 flex gap-2 justify-content-center">
                    <Button
                        icon={book.ebook_access === 'borrowable' || book.ebook_access === 'public' ? 'pi pi-arrow-up-right' : 'pi pi-lock'}
                        className={`p-button-rounded ${book.ebook_access === 'borrowable' ? 'p-button-success' : 'p-button-warning'}`}
                        onClick={() => readOpenLibraryBook(book)}
                    />
                    <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => addOpenLibraryBookToLibrary(book)} loading={addingBookId === bookId} />
                </div>
            </div>
        );
    };

    const dBooksTemplate = (book: any) => {
        const sanitizedId = book.id?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'unknown';

        return (
            <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
                <Tooltip target={`.book-${sanitizedId}`} position="top" />
                <div className="mb-3">
                    <a href={`${book.url}`} target="_blank" rel="noopener noreferrer">
                        <img
                            src={book.image || getPlaceholderImage()}
                            alt={book.title}
                            className={`book-${sanitizedId} w-6 shadow-2`}
                            style={{ width: '80px', height: '150px', objectFit: 'cover' }}
                            data-pr-tooltip={`${book.title} by ${book.authors}`}
                            onError={(e) => ((e.target as HTMLImageElement).src = getPlaceholderImage())}
                        />
                    </a>
                </div>
                <div>
                    <h6 className="mb-1">{shortenString(book.title, 30)}</h6>
                    <Tag value={shortenString(book.authors, 20)} severity="success" />
                </div>
                <div className="mt-4 flex gap-2 justify-content-center">
                    <Button icon="pi pi-arrow-down" className="p-button-rounded" onClick={() => downloadDBook(book)} />
                    <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => addDBookToLibrary(book)} loading={addingBookId === book.id} />
                </div>
            </div>
        );
    };

    const internetArchiveTemplate = (book: any) => {
        const sanitizedId = book.identifier?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'unknown';
        const mediaType = book.mediatype || 'texts';
        const viewType = mediaType === 'texts' ? 'stream' : 'details';

        return (
            <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
                <Tooltip target={`.book-${sanitizedId}`} position="top" />
                <div className="mb-3">
                    <a href={`https://archive.org/${viewType}/${book.identifier}`} target="_blank" rel="noopener noreferrer">
                        <img
                            src={getArchiveThumbnail(book.identifier)}
                            alt={book.title}
                            className={`book-${sanitizedId} w-6 shadow-2`}
                            style={{ width: '80px', height: '150px', objectFit: 'cover' }}
                            data-pr-tooltip={`${book.title} by ${book.creator || book.contributor || 'Unknown'}`}
                            onError={(e) => ((e.target as HTMLImageElement).src = getPlaceholderImage())}
                        />
                    </a>
                </div>
                <div>
                    <h6 className="mb-1">{shortenString(book.title, 30)}</h6>
                    <Tag value={shortenString((book.creator || book.contributor || 'Unknown').toString(), 20)} severity="success" />
                </div>
                <div className="mt-4 flex gap-2 justify-content-center">
                    <Button icon="pi pi-arrow-up-right" className="p-button-rounded" onClick={() => window.open(`https://archive.org/${viewType}/${book.identifier}`, '_blank')} />
                    <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => addInternetArchiveBookToLibrary(book)} loading={addingBookId === book.identifier} />
                </div>
            </div>
        );
    };

    const libraryOfCongressTemplate = (book: any) => {
        const sanitizedId = book.id?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'unknown';

        return (
            <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
                <Tooltip target={`.book-${sanitizedId}`} position="top" />
                <div className="mb-3">
                    <a href={book.url} target="_blank" rel="noopener noreferrer">
                        <img
                            src={book.image_url?.[0] || getPlaceholderImage()}
                            alt={book.title}
                            className={`book-${sanitizedId} w-6 shadow-2`}
                            style={{ width: '80px', height: '150px', objectFit: 'cover' }}
                            data-pr-tooltip={`${book.title} by ${book.contributor?.[0] || 'Unknown'}`}
                            onError={(e) => ((e.target as HTMLImageElement).src = getPlaceholderImage())}
                        />
                    </a>
                </div>
                <div>
                    <h6 className="mb-1">{shortenString(book.title, 30)}</h6>
                    {book.contributor && <Tag value={shortenString(book.contributor[0], 20)} severity="success" />}
                </div>
                <div className="mt-4 flex gap-2 justify-content-center">
                    <Button icon={book.url ? 'pi pi-arrow-up-right' : 'pi pi-lock'} className="p-button-rounded" onClick={() => book.url && window.open(book.url, '_blank')} disabled={!book.url} />
                    <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => addLibraryOfCongressBookToLibrary(book)} loading={addingBookId === book.id} />
                </div>
            </div>
        );
    };

    // Get current template based on provider
    const getCurrentTemplate = () => {
        switch (provider) {
            case 'googleBooks':
                return googleBooksTemplate;
            case 'openLibrary':
                return openLibraryTemplate;
            case 'dBooks':
                return dBooksTemplate;
            case 'internetArchive':
                return internetArchiveTemplate;
            case 'libraryOfCongress':
                return libraryOfCongressTemplate;
            default:
                return googleBooksTemplate;
        }
    };

    // Read book functions
    const readGoogleBook = (book: any) => {
        if (book.accessInfo?.publicDomain && book.selfLink) {
            window.open(book.accessInfo.webReaderLink || book.selfLink, '_blank');
        } else {
            showMessage('Not Available', 'This book is not available for online reading', 'warn');
        }
    };

    const readOpenLibraryBook = async (book: any) => {
        if (!book.isbn) {
            showMessage('Not Available', 'No available link detected', 'warn');
            return;
        }

        try {
            const queryData = book.isbn ? `ISBN:${book.isbn[0]}` : `LCCN:${book.lccn[0]}`;
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${queryData}&format=json&jscmd=data`);
            const data = await response.json();
            const primaryKey = Object.keys(data)[0];
            const bookData = data[primaryKey];

            if (bookData && bookData.url) {
                window.open(bookData.url, '_blank');
            } else {
                showMessage('Not Available', 'No available link detected', 'warn');
            }
        } catch (error) {
            console.error(error);
            showMessage('Error', 'Failed to open book', 'error');
        }
    };

    const downloadDBook = async (book: any) => {
        try {
            const response = await fetch(`https://www.dbooks.org/api/book/${book.id}`);
            const data = await response.json();
            if (data.download) {
                window.location.href = data.download;
            }
        } catch (error) {
            console.error(error);
            showMessage('Error', 'Failed to download book', 'error');
        }
    };
    // Add to library functions
    const saveBookToLibrary = async (bookData: any) => {
        // Add siteInventory for new items
        const dataToSave = { ...bookData };
        if (user?.school && user?.schoolSite) {
            dataToSave.siteInventory = [
                {
                    school: user.school,
                    site: user.schoolSite,
                    quantity: 1,
                    availableQuantity: 1,
                    dateAdded: new Date(),
                    stockAdjustments: [
                        {
                            adjustmentType: 'addition',
                            quantity: 1,
                            remarks: 'Initial inventory - imported from online source',
                            adjustedBy: user.id,
                            date: new Date()
                        }
                    ]
                }
            ];
        }
        const response = await fetch('/api/library-items/add-online', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookData: dataToSave })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save book');
        }

        return response.json();
    };

    const addGoogleBookToLibrary = async (book: any) => {
        setAddingBookId(book.id);
        try {
            const bookDetails = await (await fetch(book.selfLink)).json();
            const volumeInfo = bookDetails.volumeInfo;

            const bookData = {
                provider: 'Google Books',
                isbn: volumeInfo.industryIdentifiers?.[0]?.identifier || book.id,
                title: volumeInfo.title,
                subtitle: volumeInfo.subtitle,
                authors: volumeInfo.authors || [],
                publisher: volumeInfo.publisher,
                publishedDate: volumeInfo.publishedDate,
                subject: volumeInfo.categories?.[0] || '',
                coverImage: volumeInfo.imageLinks?.thumbnail,
                url: book.selfLink
            };

            await saveBookToLibrary(bookData);
            showMessage('Success', 'Book added to library from Google Books', 'success');
        } catch (error: any) {
            console.error(error);
            showMessage('Error', error.message || 'Failed to add book', 'error');
        } finally {
            setAddingBookId(undefined);
        }
    };

    const addOpenLibraryBookToLibrary = async (book: any) => {
        const bookId = book.isbn?.[0] || book.lccn?.[0];
        if (!bookId) return;

        setAddingBookId(bookId);
        try {
            const queryData = book.isbn ? `ISBN:${book.isbn[0]}` : `LCCN:${book.lccn[0]}`;
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=${queryData}&format=json&jscmd=data`);
            const data = await response.json();
            const primaryKey = Object.keys(data)[0];
            const bookData = data[primaryKey];

            const saveData = {
                provider: 'Open Library',
                isbn: book.isbn?.[0] || primaryKey,
                lccn: book.lccn?.[0],
                title: book.title,
                subtitle: bookData?.subtitle,
                authors: bookData?.authors?.map((a: any) => a.name) || book.author_name || [],
                publisher: bookData?.publishers?.[0]?.name || book.publisher?.[0],
                publishedDate: bookData?.publish_date || book.publish_date?.[0],
                subject: book.subject?.[0] || '',
                coverImage: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : undefined,
                url: bookData?.url || `https://openlibrary.org${book.key}`
            };

            await saveBookToLibrary(saveData);
            showMessage('Success', 'Book added to library from Open Library', 'success');
        } catch (error: any) {
            console.error(error);
            showMessage('Error', error.message || 'Failed to add book', 'error');
        } finally {
            setAddingBookId(undefined);
        }
    };

    const addDBookToLibrary = async (book: any) => {
        setAddingBookId(book.id);
        try {
            const response = await fetch(`https://www.dbooks.org/api/book/${book.id}`);
            const bookDetails = await response.json();

            const bookData = {
                provider: 'DBooks',
                isbn: book.id,
                title: book.title,
                subtitle: bookDetails.subtitle,
                authors: bookDetails.authors?.split(',').map((a: string) => a.trim()) || [],
                publisher: bookDetails.publisher,
                publishedDate: bookDetails.year,
                subject: '',
                coverImage: bookDetails.image,
                url: bookDetails.url
            };

            await saveBookToLibrary(bookData);
            showMessage('Success', 'Book added to library from DBooks', 'success');
        } catch (error: any) {
            console.error(error);
            showMessage('Error', error.message || 'Failed to add book', 'error');
        } finally {
            setAddingBookId(undefined);
        }
    };

    const addInternetArchiveBookToLibrary = async (book: any) => {
        setAddingBookId(book.identifier);
        try {
            const response = await fetch(`https://archive.org/metadata/${book.identifier}`);
            const metadata = await response.json();
            const meta = metadata.metadata;

            const bookData = {
                provider: 'Internet Archive',
                isbn: meta.isbn?.[0] || metadata.uniq,
                lccn: meta.lccn?.[0],
                title: book.title,
                subtitle: book.description,
                authors: Array.isArray(book.creator) ? book.creator : book.creator ? [book.creator] : Array.isArray(book.contributor) ? book.contributor : book.contributor ? [book.contributor] : [],
                publisher: meta.publisher,
                publishedDate: book.publicdate,
                subject: book.subject?.[0] || '',
                coverImage: getArchiveThumbnail(book.identifier),
                url: `https://archive.org/details/${book.identifier}`
            };

            await saveBookToLibrary(bookData);
            showMessage('Success', 'Book added to library from Internet Archive', 'success');
        } catch (error: any) {
            console.error(error);
            showMessage('Error', error.message || 'Failed to add book', 'error');
        } finally {
            setAddingBookId(undefined);
        }
    };

    const addLibraryOfCongressBookToLibrary = async (book: any) => {
        setAddingBookId(book.id);
        try {
            const bookData = {
                provider: 'Library of Congress',
                isbn: '',
                lccn: '',
                title: book.title,
                subtitle: '',
                authors: book.contributor || [],
                publisher: '',
                publishedDate: book.date,
                subject: book.subject?.[0] || '',
                coverImage: book.image_url?.[0],
                url: book.url
            };

            await saveBookToLibrary(bookData);
            showMessage('Success', 'Book added to library from Library of Congress', 'success');
        } catch (error: any) {
            console.error(error);
            showMessage('Error', error.message || 'Failed to add book', 'error');
        } finally {
            setAddingBookId(undefined);
        }
    };

    const responsiveOptions = [
        { breakpoint: '1199px', numVisible: 3, numScroll: 3 },
        { breakpoint: '991px', numVisible: 2, numScroll: 2 },
        { breakpoint: '767px', numVisible: 1, numScroll: 1 }
    ];

    const showAdvancedOptions = provider === 'googleBooks' || provider === 'openLibrary';

    const footer = (
        <div className="grid align-items-center">
            <div className="col-12 md:col-3">{workerBusy ? <ProgressSpinner style={{ width: '24px', height: '24px' }} /> : <span className="font-semibold">{books.length} books scanned</span>}</div>
            <div className="col-12 md:col-9">
                <Paginator first={first} rows={rows} totalRecords={books.length} onPageChange={onPageChange} />
            </div>
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toast} position="bottom-right" />

            <div className="mb-4">
                <h2 className="text-3xl font-bold text-900 mb-2">Add Books from Online Sources</h2>
                <p className="text-600 text-lg">Search and import books from multiple online providers</p>
            </div>

            <Card>
                {/* Provider Selection */}
                <Fieldset legend="Select Provider">
                    <div className="formgrid grid">
                        <div className="field lg:col-2 md:col-12 col-12">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="googleBooks"
                                    value="googleBooks"
                                    onChange={() => {
                                        setProvider('googleBooks');
                                        setBooks([]);
                                        setUnfilteredBooks([]);
                                        setTotalResults(0);
                                    }}
                                    checked={provider === 'googleBooks'}
                                />
                                <label htmlFor="googleBooks" className="ml-2 cursor-pointer">
                                    Google Books
                                </label>
                            </div>
                        </div>
                        <div className="field lg:col-2 md:col-12 col-12">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="openLibrary"
                                    value="openLibrary"
                                    onChange={() => {
                                        setProvider('openLibrary');
                                        setBooks([]);
                                        setUnfilteredBooks([]);
                                        setTotalResults(0);
                                    }}
                                    checked={provider === 'openLibrary'}
                                />
                                <label htmlFor="openLibrary" className="ml-2 cursor-pointer">
                                    Open Library
                                </label>
                            </div>
                        </div>
                        <div className="field lg:col-2 md:col-12 col-12">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="dBooks"
                                    value="dBooks"
                                    onChange={() => {
                                        setProvider('dBooks');
                                        setBooks([]);
                                        setUnfilteredBooks([]);
                                        setTotalResults(0);
                                    }}
                                    checked={provider === 'dBooks'}
                                />
                                <label htmlFor="dBooks" className="ml-2 cursor-pointer">
                                    DBooks
                                </label>
                            </div>
                        </div>
                        <div className="field lg:col-2 md:col-12 col-12">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="internetArchive"
                                    value="internetArchive"
                                    onChange={() => {
                                        setProvider('internetArchive');
                                        setBooks([]);
                                        setUnfilteredBooks([]);
                                        setTotalResults(0);
                                    }}
                                    checked={provider === 'internetArchive'}
                                />
                                <label htmlFor="internetArchive" className="ml-2 cursor-pointer">
                                    Internet Archive
                                </label>
                            </div>
                        </div>
                        <div className="field lg:col-2 md:col-12 col-12">
                            <div className="flex align-items-center">
                                <Checkbox
                                    inputId="libraryOfCongress"
                                    value="libraryOfCongress"
                                    onChange={() => {
                                        setProvider('libraryOfCongress');
                                        setBooks([]);
                                        setUnfilteredBooks([]);
                                        setTotalResults(0);
                                    }}
                                    checked={provider === 'libraryOfCongress'}
                                />
                                <label htmlFor="libraryOfCongress" className="ml-2 cursor-pointer">
                                    Library of Congress
                                </label>
                            </div>
                        </div>
                    </div>
                </Fieldset>

                <Divider />

                {/* Search Controls */}
                <Fieldset legend="Search Options">
                    <div className="formgrid grid">
                        <div className="field lg:col-3 md:col-12 col-12">
                            <label htmlFor="searchText" className="font-semibold">
                                Search Text
                            </label>
                            <InputText id="searchText" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Enter search query" className="w-full" />
                        </div>

                        {showAdvancedOptions && (
                            <>
                                <div className="field lg:col-3 md:col-12 col-12">
                                    <label htmlFor="filterValue" className="font-semibold">
                                        Filter Value {searchBy && `(${searchBy})`}
                                    </label>
                                    <InputText id="filterValue" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={`Filter by ${searchBy || 'field'}`} className="w-full" disabled={!allowFilter} />
                                </div>

                                <div className="field lg:col-1 md:col-6 col-6">
                                    <div className="flex align-items-center lg:mt-5">
                                        <Checkbox inputId="title" checked={searchBy === 'title'} onChange={() => setSearchBy('title')} disabled={!allowFilter} />
                                        <label htmlFor="title" className="ml-2">
                                            Title
                                        </label>
                                    </div>
                                </div>
                                <div className="field lg:col-1 md:col-6 col-6">
                                    <div className="flex align-items-center lg:mt-5">
                                        <Checkbox inputId="author" checked={searchBy === 'author'} onChange={() => setSearchBy('author')} disabled={!allowFilter} />
                                        <label htmlFor="author" className="ml-2">
                                            Author
                                        </label>
                                    </div>
                                </div>
                                <div className="field lg:col-1 md:col-6 col-6">
                                    <div className="flex align-items-center lg:mt-5">
                                        <Checkbox inputId="isbn" checked={searchBy === 'isbn'} onChange={() => setSearchBy('isbn')} disabled={!allowFilter} />
                                        <label htmlFor="isbn" className="ml-2">
                                            ISBN
                                        </label>
                                    </div>
                                </div>
                                <div className="field lg:col-1 md:col-6 col-6">
                                    <div className="flex align-items-center lg:mt-5">
                                        <Checkbox inputId="allowFilter" checked={allowFilter} onChange={(e) => setAllowFilter(e.checked || false)} />
                                        <label htmlFor="allowFilter" className="ml-2">
                                            Enable Filters
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="field lg:col-2 md:col-12 col-12">
                            <label className="font-semibold opacity-0">Search</label>
                            <Button icon="pi pi-search" label="Search" onClick={performSearch} loading={isLoading} disabled={isLoading} className="w-full" />
                        </div>
                    </div>
                </Fieldset>

                {/* Local Search */}
                {books.length > 0 && (
                    <>
                        <Divider />
                        <div className="flex flex-row-reverse mb-3">
                            <span className="p-input-icon-left">
                                <i className="pi pi-search" />
                                <InputText value={fullSearchValue} onChange={(e) => searchLoadedBooks(e.target.value)} placeholder="Filter loaded books..." />
                            </span>
                        </div>
                    </>
                )}

                {/* Books Grid */}
                {isLoading && (
                    <div className="flex justify-content-center p-5">
                        <ProgressSpinner />
                    </div>
                )}

                {!isLoading && books.length > 0 && (
                    <Carousel value={books.slice(first, first + rows)} numScroll={5} numVisible={5} responsiveOptions={responsiveOptions} itemTemplate={getCurrentTemplate()} footer={footer} showNavigators={false} showIndicators={false} />
                )}

                {!isLoading && books.length === 0 && searchText && (
                    <div className="text-center p-5">
                        <i className="pi pi-search text-4xl text-400 mb-3"></i>
                        <p className="text-xl text-600">No books found. Try a different search.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
