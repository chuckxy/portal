/**
 * @deprecated This component is obsolete after the Online Books refactor.
 * All functionality is now integrated into AddBooksOnline.tsx component.
 * This file is kept for reference only.
 * 
 * See: /docs/ONLINE_BOOKS_REFACTOR.md
 */

'use client';

import React from 'react';
import { Carousel } from 'primereact/carousel';
import { Paginator } from 'primereact/paginator';
import { ProgressSpinner } from 'primereact/progressspinner';

interface BookGridProps {
    books: any[];
    onRead: (book: any) => void;
    onAddToLibrary: (book: any) => void;
    isLoadingMore: boolean;
    currentPage: number;
    rowsPerPage: number;
    totalBooks: number;
    onPageChange: (event: { first: number; rows: number; page: number }) => void;
    addingBookId?: string;
}

export function BookGrid({ books, onRead, onAddToLibrary, isLoadingMore, currentPage, rowsPerPage, totalBooks, onPageChange, addingBookId }: BookGridProps) {
    const responsiveOptions = [
        {
            breakpoint: '1199px',
            numVisible: 3,
            numScroll: 3
        },
        {
            breakpoint: '991px',
            numVisible: 2,
            numScroll: 2
        },
        {
            breakpoint: '767px',
            numVisible: 1,
            numScroll: 1
        }
    ];

    const bookTemplate = (book: any) => {
        // This would need to be replaced with actual implementation
        return null;
    };

    const footer = (
        <>
            <div className="grid align-items-center">
                <div className="col-12 md:col-3 text-center md:text-left">
                    {isLoadingMore ? (
                        <div className="flex align-items-center gap-2">
                            <ProgressSpinner style={{ width: '24px', height: '24px' }} strokeWidth="4" />
                            <span>Loading more...</span>
                        </div>
                    ) : (
                        <span className="font-semibold">{totalBooks} books found</span>
                    )}
                </div>
                <div className="col-12 md:col-9">
                    <Paginator first={currentPage * rowsPerPage} rows={rowsPerPage} totalRecords={totalBooks} onPageChange={onPageChange} template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport" />
                </div>
            </div>
        </>
    );

    if (books.length === 0) {
        return (
            <div className="text-center p-5">
                <i className="pi pi-search text-4xl text-400 mb-3"></i>
                <p className="text-xl text-600">No books found. Try a different search.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <Carousel value={books} numScroll={5} numVisible={5} responsiveOptions={responsiveOptions} itemTemplate={bookTemplate} footer={footer} showNavigators={false} showIndicators={false} />
        </div>
    );
}
