import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

let LibraryLending: any;

try {
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
} catch (error) {
    console.error('Error loading models:', error);
}

/**
 * GET /api/library-dashboard/top-books
 * Get most borrowed books
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site');
        const siteFilter = siteId ? { site: new mongoose.Types.ObjectId(siteId) } : {};

        const topBooks = await LibraryLending.aggregate([
            { $match: siteFilter },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.book',
                    count: { $sum: '$items.quantityIssued' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'libraryitems',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'bookDetails'
                }
            },
            { $unwind: '$bookDetails' },
            {
                $project: {
                    title: '$bookDetails.title',
                    isbn: '$bookDetails.isbn',
                    count: 1
                }
            }
        ]);

        return NextResponse.json(topBooks);
    } catch (error: any) {
        console.error('Error fetching top books:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch top books' }, { status: 500 });
    }
}
