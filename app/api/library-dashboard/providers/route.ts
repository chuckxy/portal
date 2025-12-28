import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

let LibraryItem: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
} catch (error) {
    console.error('Error loading models:', error);
}

/**
 * GET /api/library-dashboard/providers
 * Get distribution of books by external provider
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site');
        const siteFilter = siteId ? { 'siteInventory.site': new mongoose.Types.ObjectId(siteId) } : {};

        const providers = await LibraryItem.aggregate([
            {
                $match: {
                    provider: { $in: ['Google Books', 'Open Library', 'DBooks', 'IArchive'] },
                    ...siteFilter
                }
            },
            {
                $group: {
                    _id: '$provider',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: '$_id',
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Add local/physical books as a category
        const localCount = await LibraryItem.countDocuments({
            provider: 'Local User Add',
            ...siteFilter
        });

        if (localCount > 0) {
            providers.push({ name: 'Local User Add', count: localCount });
        }

        return NextResponse.json(providers);
    } catch (error: any) {
        console.error('Error fetching providers:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch providers' }, { status: 500 });
    }
}
