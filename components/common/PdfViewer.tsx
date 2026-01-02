'use client';

import React, { useState } from 'react';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';

export interface PdfViewerProps {
    file: string;
    pageNumber?: number;
    width?: number;
    height?: string;
    showAllPages?: boolean;
    onLoadSuccess?: (data: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    onPageClick?: () => void;
}

// Use Mozilla's PDF.js viewer for reliable cross-browser PDF display
const PdfViewer: React.FC<PdfViewerProps> = ({ file, width, height = '500px', onLoadSuccess, onLoadError, onPageClick }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleLoad = () => {
        setLoading(false);
        onLoadSuccess?.({ numPages: 1 });
    };

    const handleError = () => {
        setLoading(false);
        setError('Failed to load PDF');
        onLoadError?.(new Error('PDF failed to load'));
    };

    // Calculate responsive width
    const calculatedWidth = width || (typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.8, 800) : 600);

    // Build the viewer URL - use Mozilla's PDF.js viewer for reliable rendering
    // This works even when the server sends download headers
    const getViewerUrl = (pdfUrl: string) => {
        // If it's already an absolute URL, encode it for the viewer
        const encodedUrl = encodeURIComponent(pdfUrl);
        // Use Mozilla's hosted PDF.js viewer
        return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}`;
    };

    if (error) {
        return (
            <div className="flex flex-column align-items-center justify-content-center py-8">
                <i className="pi pi-exclamation-triangle text-5xl text-yellow-500 mb-3"></i>
                <p className="text-white mb-2">{error}</p>
                {onPageClick && <Button label="Open Full View" icon="pi pi-expand" className="mt-2" onClick={onPageClick} />}
            </div>
        );
    }

    return (
        <div className="flex flex-column align-items-center" style={{ width: calculatedWidth }}>
            {loading && (
                <div className="flex flex-column align-items-center justify-content-center py-8 absolute" style={{ zIndex: 1 }}>
                    <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                    <p className="text-white mt-3">Loading PDF...</p>
                </div>
            )}
            <iframe
                src={getViewerUrl(file)}
                width="100%"
                height={height}
                style={{
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#404040',
                    opacity: loading ? 0 : 1,
                    transition: 'opacity 0.3s ease'
                }}
                onLoad={handleLoad}
                onError={handleError}
                title="PDF Viewer"
                allow="fullscreen"
            />
            {onPageClick && (
                <div className="mt-2">
                    <Button label="Open Full Screen" icon="pi pi-expand" className="p-button-sm p-button-text text-primary" onClick={onPageClick} />
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
