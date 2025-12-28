import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

let LibraryItem: any;
let LibraryLending: any;
let Person: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
} catch (error) {
    console.error('Error loading models:', error);
}

/**
 * GET /api/library-dashboard/stats
 * Get dashboard statistics
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Get current date for time-based queries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

        // Total books
        const totalBooks = await LibraryItem.countDocuments({ isActive: true });

        // Calculate available books (sum of availableQuantity)
        const availabilityAgg = await LibraryItem.aggregate([
            { $match: { isActive: true } },
            {
                $project: {
                    availableQty: {
                        $sum: {
                            $map: {
                                input: '$siteInventory',
                                as: 'inv',
                                in: '$$inv.availableQuantity'
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAvailable: { $sum: '$availableQty' }
                }
            }
        ]);

        const availableBooks = availabilityAgg[0]?.totalAvailable || 0;

        // Active borrowings
        const borrowedBooks = await LibraryLending.countDocuments({
            status: 'active',
            'items.quantityReturned': { $lt: { $getField: 'quantityBorrowed' } }
        });

        // Overdue books
        const overdueBooks = await LibraryLending.countDocuments({
            status: 'active',
            'items.dueDate': { $lt: new Date() },
            'items.quantityReturned': { $lt: { $getField: 'quantityBorrowed' } }
        });

        // Active users (people with borrowing history or active loans)
        const activeUsers = await Person.countDocuments({
            isActive: true,
            $or: [{ 'roles.student': { $exists: true } }, { 'roles.staff': { $exists: true } }]
        });

        // New acquisitions this month
        const newAcquisitions = await LibraryItem.countDocuments({
            'acquisitionInfo.dateAcquired': { $gte: startOfMonth }
        });

        // Online books added (books with external provider)
        const onlineBooksAdded = await LibraryItem.countDocuments({
            'digitalContent.hasDigitalVersion': true,
            'digitalContent.externalProvider': { $exists: true, $ne: null },
            'acquisitionInfo.dateAcquired': { $gte: startOfMonth }
        });

        // Reserved books
        const reservedBooks = 0; // TODO: Implement reservation system

        return NextResponse.json({
            totalBooks,
            availableBooks,
            borrowedBooks,
            overdueBooks,
            activeUsers,
            newAcquisitions,
            onlineBooksAdded,
            reservedBooks
        });
    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to fetch statistics' }, { status: 500 });
    }
}
