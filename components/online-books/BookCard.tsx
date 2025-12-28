/**
 * @deprecated This component is obsolete after the Online Books refactor.
 * All functionality is now integrated into AddBooksOnline.tsx component.
 * This file is kept for reference only.
 *
 * See: /docs/ONLINE_BOOKS_REFACTOR.md
 */

'use client';

import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Tooltip } from 'primereact/tooltip';
import { getPlaceholderImage, shortenString } from '@/lib/helpers/bookHelpers';

interface BookCardProps {
    book: any;
    onRead: (book: any) => void;
    onAddToLibrary: (book: any) => void;
    isAdding?: boolean;
}

export function BookCard({ book, onRead, onAddToLibrary, isAdding = false }: BookCardProps) {
    const coverImage = book.coverImage || getPlaceholderImage('No Cover');
    const author = book.authors[0] || 'Unknown Author';
    const tooltipText = `${book.title} by ${author}`;
    // Sanitize book ID for use in CSS class name (remove special characters)
    const sanitizedId = book.id.replace(/[^a-zA-Z0-9-_]/g, '-');

    return (
        <div className="border-1 surface-border border-round m-2 text-center py-3 px-1">
            <Tooltip target={`.book-cover-${sanitizedId}`} position="top" />
            <div className="mb-3">
                <img
                    src={coverImage}
                    alt={book.title}
                    className={`book-cover-${sanitizedId} w-6 shadow-2`}
                    style={{ width: '80px', maxWidth: '120px', height: '150px', objectFit: 'cover' }}
                    data-pr-tooltip={tooltipText}
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getPlaceholderImage('No Cover');
                    }}
                />
            </div>

            <div className="mb-3">
                <h6 className="mb-1 font-semibold">{shortenString(book.title, 30)}</h6>
                <Tag value={shortenString(author, 20)} severity="success" />
            </div>

            {book.accessType && (
                <div className="mb-2">
                    <Tag value={book.accessType.toUpperCase()} severity="info" />
                </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 justify-content-center">
                <Button
                    icon={book.isReadable ? 'pi pi-arrow-up-right' : 'pi pi-lock'}
                    className={`p-button-rounded ${book.isReadable ? 'p-button-primary' : 'p-button-secondary'}`}
                    onClick={() => onRead(book)}
                    disabled={!book.isReadable}
                    tooltip={book.isReadable ? 'Read Online' : 'Not Available'}
                    tooltipOptions={{ position: 'top' }}
                />
                <Button icon="pi pi-plus" className="p-button-success p-button-rounded" onClick={() => onAddToLibrary(book)} disabled={isAdding} loading={isAdding} tooltip="Add to Library" tooltipOptions={{ position: 'top' }} />
            </div>
        </div>
    );
}
