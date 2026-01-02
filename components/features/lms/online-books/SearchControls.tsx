/**
 * @deprecated This component is obsolete after the Online Books refactor.
 * All functionality is now integrated into AddBooksOnline.tsx component.
 * This file is kept for reference only.
 *
 * See: /docs/ONLINE_BOOKS_REFACTOR.md
 */

'use client';

import React from 'react';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { BookProvider } from '@/types/book';

type SearchBy = 'title' | 'author' | 'isbn' | 'subject' | 'publisher';

interface SearchControlsProps {
    searchText: string;
    onSearchTextChange: (value: string) => void;
    filterValue: string;
    onFilterValueChange: (value: string) => void;
    searchBy: SearchBy | '';
    onSearchByChange: (value: SearchBy) => void;
    allowFilter: boolean;
    onAllowFilterChange: (value: boolean) => void;
    onSearch: () => void;
    isLoading: boolean;
    provider: BookProvider;
}

export function SearchControls({ searchText, onSearchTextChange, filterValue, onFilterValueChange, searchBy, onSearchByChange, allowFilter, onAllowFilterChange, onSearch, isLoading, provider }: SearchControlsProps) {
    // Show/hide specific options based on provider
    const showAdvancedSearch = provider === 'googleBooks' || provider === 'openLibrary';

    const searchOptions: Array<{ id: SearchBy; label: string }> = [
        { id: 'title', label: 'Title' },
        { id: 'author', label: 'Author' },
        { id: 'isbn', label: 'ISBN' },
        { id: 'subject', label: 'Subject' },
        { id: 'publisher', label: 'Publisher' }
    ];

    return (
        <div className="formgrid grid">
            {/* Search Text */}
            <div className="field lg:col-3 md:col-12 col-12">
                <label htmlFor="searchText" className="font-semibold">
                    Search Text
                </label>
                <InputText id="searchText" value={searchText} onChange={(e) => onSearchTextChange(e.target.value)} placeholder="Enter search query" className="w-full" autoComplete="off" />
            </div>

            {/* Filter Value */}
            {showAdvancedSearch && (
                <div className="field lg:col-3 md:col-12 col-12">
                    <label htmlFor="filterValue" className="font-semibold">
                        Filter Value {searchBy && `(${searchBy})`}
                    </label>
                    <InputText id="filterValue" value={filterValue} onChange={(e) => onFilterValueChange(e.target.value)} placeholder={`Filter by ${searchBy || 'field'}`} className="w-full" autoComplete="off" disabled={!allowFilter} />
                </div>
            )}

            {/* Search By Options */}
            {showAdvancedSearch && (
                <>
                    {searchOptions.map((option) => (
                        <div key={option.id} className="field lg:col-1 md:col-6 col-6">
                            <div className="flex align-items-center lg:mt-5">
                                <Checkbox inputId={option.id} value={option.id} onChange={(e) => onSearchByChange(e.value)} checked={searchBy === option.id} disabled={!allowFilter} />
                                <label htmlFor={option.id} className="ml-2 cursor-pointer">
                                    {option.label}
                                </label>
                            </div>
                        </div>
                    ))}

                    {/* Allow Filter Toggle */}
                    <div className="field lg:col-2 md:col-6 col-6">
                        <div className="flex align-items-center lg:mt-5">
                            <Checkbox inputId="allowFilter" checked={allowFilter} onChange={(e) => onAllowFilterChange(e.checked || false)} />
                            <label htmlFor="allowFilter" className="ml-2 cursor-pointer">
                                Enable Filters
                            </label>
                        </div>
                    </div>
                </>
            )}

            {/* Search Button */}
            <div className="field lg:col-2 md:col-12 col-12">
                <label className="font-semibold opacity-0">Search</label>
                <Button icon="pi pi-search" label="Search" onClick={onSearch} loading={isLoading} disabled={isLoading || !searchText} className="w-full" />
            </div>
        </div>
    );
}
