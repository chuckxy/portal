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

        const providers = await LibraryItem.aggregate([
            {
                $match: {
                    'digitalContent.hasDigitalVersion': true,
                    'digitalContent.externalProvider': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$digitalContent.externalProvider',
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

        // Add physical books as a category
        const physicalCount = await LibraryItem.countDocuments({
            $or: [{ 'digitalContent.hasDigitalVersion': false }, { 'digitalContent.hasDigitalVersion': { $exists: false } }]
        });

        if (physicalCount > 0) {
            providers.push({ name: 'Physical Books', count: physicalCount });
        }

        return NextResponse.json(providers);
    } catch (error: any) {
        console.error('Error fetching providers:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch providers' }, { status: 500 });
    }
}
