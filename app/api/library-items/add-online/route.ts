import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import models
let LibraryItem: any;
let SchoolSite: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

/**
 * POST /api/library-items/add-online
 * Add a book from an online provider to the local library
 */
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const { bookData, siteId } = await request.json();

        if (!bookData) {
            return NextResponse.json({ success: false, message: 'Book data is required' }, { status: 400 });
        }

        // Extract book metadata from provider-specific data
        const isbn = bookData.isbn;
        const title = bookData.title;
        const subtitle = bookData.subtitle;
        const publisher = bookData.publisher;
        const publishedDate = bookData.publishedDate ? new Date(bookData.publishedDate) : undefined;
        const description = bookData.description || '';
        const coverImagePath = bookData.coverImage;
        const lccn = bookData.lccn;

        // Check if book already exists by ISBN
        if (isbn) {
            const existingBook = await LibraryItem.findOne({ isbn });
            if (existingBook) {
                return NextResponse.json(
                    {
                        success: false,
                        message: 'Book already exists in library',
                        bookId: existingBook._id
                    },
                    { status: 409 }
                );
            }
        }

        // Prepare authors array
        const authors = (Array.isArray(bookData.authors) ? bookData.authors : []).map((authorName) => ({
            firstName: authorName.split(' ')[0] || '',
            lastName: authorName.split(' ').slice(1).join(' ') || authorName
        }));

        // Prepare classification
        const classification = {
            deweyDecimal: '',
            libraryOfCongress: lccn || '',
            customCategory: bookData.subject || ''
        };

        // Create new library item
        const newItem = new LibraryItem({
            itemType: 'book',
            title,
            subtitle,
            authors,
            isbn,
            publisher,
            publicationDate: publishedDate,
            edition: '',
            language: 'English', // Default
            description,
            subjects: bookData.subject ? [bookData.subject] : [],
            classification,
            physicalDescription: {
                format: 'Digital',
                pages: undefined
            },
            coverImagePath,
            provider: bookData.provider || 'Other',
            digitalContent: {
                hasDigitalVersion: true,
                digitalFormats: ['online'],
                digitalAccessUrl: bookData.url,
                externalProvider: bookData.provider,
                accessType: 'public'
            },
            siteInventory: bookData.siteInventory || [],
            acquisitionInfo: {
                source: `Online - ${bookData.provider}`,
                dateAcquired: new Date(),
                cost: 0
            },
            isActive: true,
            isPublished: true
        });

        await newItem.save();

        return NextResponse.json(
            {
                success: true,
                message: 'Book added successfully',
                item: newItem
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error adding online book:', error);
        return NextResponse.json({ success: false, message: 'Failed to add book', error: error.message }, { status: 500 });
    }
}
