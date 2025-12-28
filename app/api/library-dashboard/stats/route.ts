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

        // Get site filter from query params
        const { searchParams } = new URL(request.url);
        const siteId = searchParams.get('site');

        // Get current date for time-based queries
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

        // Build site filter for siteInventory
        const siteInventoryMatch = siteId ? { 'siteInventory.site': new mongoose.Types.ObjectId(siteId) } : {};

        // Total books (sum of all quantities for the specified site)
        const totalBooksAgg = await LibraryItem.aggregate([
            { $match: { isActive: true, ...siteInventoryMatch } },
            { $unwind: '$siteInventory' },
            ...(siteId ? [{ $match: { 'siteInventory.site': new mongoose.Types.ObjectId(siteId) } }] : []),
            {
                $group: {
                    _id: null,
                    totalBooks: { $sum: { $ifNull: ['$siteInventory.quantity', 0] } }
                }
            }
        ]);
        const totalBooks = totalBooksAgg[0]?.totalBooks || 0;

        // Calculate available books (sum of availableQuantity for the specified site)
        const availabilityAgg = await LibraryItem.aggregate([
            { $match: { isActive: true, ...siteInventoryMatch } },
            { $unwind: '$siteInventory' },
            ...(siteId ? [{ $match: { 'siteInventory.site': new mongoose.Types.ObjectId(siteId) } }] : []),
            {
                $group: {
                    _id: null,
                    totalAvailable: { $sum: { $ifNull: ['$siteInventory.availableQuantity', 0] } }
                }
            }
        ]);

        const availableBooks = availabilityAgg[0]?.totalAvailable || 0;

        // Build site filter for lending
        const lendingFilter = siteId ? { site: new mongoose.Types.ObjectId(siteId) } : {};

        // Active borrowings - count total books currently borrowed (not yet returned) for the site
        const borrowedBooksAgg = await LibraryLending.aggregate([
            {
                $match: {
                    status: { $in: ['active', 'overdue', 'partially_returned'] },
                    ...lendingFilter
                }
            },
            { $unwind: '$items' },
            {
                $project: {
                    unreturned: { $subtract: ['$items.quantityIssued', '$items.quantityReturned'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBorrowed: { $sum: '$unreturned' }
                }
            }
        ]);
        const borrowedBooks = borrowedBooksAgg[0]?.totalBorrowed || 0;

        // Overdue books - count books past due date and not fully returned for the site
        const overdueBooksAgg = await LibraryLending.aggregate([
            {
                $match: {
                    status: { $in: ['active', 'overdue', 'partially_returned'] },
                    dueDate: { $lt: new Date() },
                    ...lendingFilter
                }
            },
            { $unwind: '$items' },
            {
                $project: {
                    unreturned: { $subtract: ['$items.quantityIssued', '$items.quantityReturned'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOverdue: { $sum: '$unreturned' }
                }
            }
        ]);
        const overdueBooks = overdueBooksAgg[0]?.totalOverdue || 0;

        // Active users - count unique borrowers with active or recent loans at this site
        const activeUsersAgg = await LibraryLending.aggregate([
            {
                $match: {
                    $or: [{ status: { $in: ['active', 'overdue', 'partially_returned'] } }, { issuedDate: { $gte: startOfMonth } }],
                    ...lendingFilter
                }
            },
            {
                $group: {
                    _id: '$borrower'
                }
            },
            {
                $count: 'total'
            }
        ]);
        const activeUsers = activeUsersAgg[0]?.total || 0;

        // New acquisitions this month - count unique books added this month at this site
        const newAcquisitionsFilter = siteId
            ? {
                  createdAt: { $gte: startOfMonth },
                  'siteInventory.site': new mongoose.Types.ObjectId(siteId)
              }
            : { createdAt: { $gte: startOfMonth } };
        const newAcquisitions = await LibraryItem.countDocuments(newAcquisitionsFilter);

        // Online books added this month - books from external providers added this month at this site
        const onlineBooksFilter = siteId
            ? {
                  provider: { $in: ['Google Books', 'Open Library', 'DBooks', 'IArchive'] },
                  createdAt: { $gte: startOfMonth },
                  'siteInventory.site': new mongoose.Types.ObjectId(siteId)
              }
            : {
                  provider: { $in: ['Google Books', 'Open Library', 'DBooks', 'IArchive'] },
                  createdAt: { $gte: startOfMonth }
              };
        const onlineBooksAdded = await LibraryItem.countDocuments(onlineBooksFilter);

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
