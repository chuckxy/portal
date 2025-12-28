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
 * GET /api/library-dashboard/trends
 * Get borrowing and return trends for the last 30 days
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const daysAgo30 = new Date();
        daysAgo30.setDate(daysAgo30.getDate() - 30);

        // Get borrowing trends
        const borrowTrends = await LibraryLending.aggregate([
            {
                $match: {
                    borrowDate: { $gte: daysAgo30 }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$borrowDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Get return trends
        const returnTrends = await LibraryLending.aggregate([
            {
                $match: {
                    returnDate: { $gte: daysAgo30, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$returnDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Create a map of all dates in the last 30 days
        const labels: string[] = [];
        const borrowed: number[] = [];
        const returned: number[] = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

            const borrowCount = borrowTrends.find((t) => t._id === dateStr)?.count || 0;
            const returnCount = returnTrends.find((t) => t._id === dateStr)?.count || 0;

            borrowed.push(borrowCount);
            returned.push(returnCount);
        }

        return NextResponse.json({
            labels,
            borrowed,
            returned
        });
    } catch (error: any) {
        console.error('Error fetching trends:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch trends' }, { status: 500 });
    }
}
