/**
 * @deprecated This component is obsolete after the Online Books refactor.
 * All functionality is now integrated into AddBooksOnline.tsx component.
 * This file is kept for reference only.
 *
 * See: /docs/ONLINE_BOOKS_REFACTOR.md
 */

'use client';

import React from 'react';
import { Checkbox } from 'primereact/checkbox';
import { BookProvider } from '@/types/book';

interface ProviderSelectorProps {
    selectedProvider: BookProvider;
    onChange: (provider: BookProvider) => void;
}

export function ProviderSelector({ selectedProvider, onChange }: ProviderSelectorProps) {
    const providers: BookProvider[] = ['googleBooks', 'openLibrary', 'dBooks', 'internetArchive', 'libraryOfCongress'];

    return (
        <div className="formgrid grid">
            {providers.map((provider) => (
                <div key={provider} className="field lg:col-2 md:col-12 col-12">
                    <div className="flex align-items-center">
                        <Checkbox inputId={provider} name={provider} value={provider} onChange={() => onChange(provider)} checked={selectedProvider === provider} />
                        <label htmlFor={provider} className="ml-2 cursor-pointer">
                            {provider}
                        </label>
                    </div>
                </div>
            ))}
        </div>
    );
}
