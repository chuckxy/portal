import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryLending: any;
let LibraryItem: any;
let LibraryUser: any;
let Person: any;
let SchoolSite: any;

try {
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/library-lending - Fetch all lending records
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const site = searchParams.get('site');
        const borrower = searchParams.get('borrower');
        const overdueOnly = searchParams.get('overdueOnly');

        const filter: any = {};

        if (status) filter.status = status;
        if (site) filter.site = site;
        if (borrower) filter.borrower = borrower;
        if (overdueOnly === 'true') {
            filter.status = { $in: ['active', 'overdue'] };
            filter.dueDate = { $lt: new Date() };
        }

        const lendings = await LibraryLending.find(filter)
            .populate('borrower', 'firstName lastName email contact')
            .populate('site', 'siteName code')
            .populate('issuedBy', 'firstName lastName')
            .populate('items.book', 'title isbn coverImagePath')
            .populate('items.receivedBy', 'firstName lastName')
            .populate('renewalHistory.renewedBy', 'firstName lastName')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate virtuals manually
        const lendingsWithVirtuals = lendings.map((lending: any) => {
            // Calculate isOverdue
            lending.isOverdue = lending.status === 'active' && new Date() > new Date(lending.dueDate);
            if (lending.status === 'active' || lending.status === 'overdue') {
                const now = new Date();
                const dueDate = new Date(lending.dueDate);
                if (now > dueDate) {
                    const diffTime = Math.abs(now.getTime() - dueDate.getTime());
                    lending.daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else {
                    lending.daysOverdue = 0;
                }
            } else {
                lending.daysOverdue = 0;
            }
            return lending;
        });

        return NextResponse.json(lendingsWithVirtuals);
    } catch (error: any) {
        console.error('Error fetching lendings:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch lendings', error: error.message }, { status: 500 });
    }
}

// POST /api/library-lending - Create new lending (issue items)
export async function POST(request: NextRequest) {
    try {
        await connectDB();

        const body = await request.json();
        const { borrower, site, dueDate, items, notes } = body;
        console.log(body);
        // Validate required fields
        if (!borrower || !site || !dueDate || !items || items.length === 0) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Check if borrower exists and can borrow
        const libraryUser = await LibraryUser.findOne({ user: borrower, site: site });
        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found for this borrower and site' }, { status: 404 });
        }

        if (!libraryUser.canBorrow) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'User cannot borrow. Check status, borrowing limit, or outstanding fines.'
                },
                { status: 400 }
            );
        }

        // Check borrowing limits
        if (libraryUser.activeBorrowingsCount >= libraryUser.borrowingLimit) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Borrowing limit reached (${libraryUser.borrowingLimit} items)`
                },
                { status: 400 }
            );
        }

        // Validate and check availability for each item
        const lendingItems: any[] = [];
        for (const item of items) {
            const libraryItem = await LibraryItem.findById(item.book);
            if (!libraryItem) {
                return NextResponse.json({ success: false, message: `Book not found: ${item.book}` }, { status: 404 });
            }

            // Find site inventory
            const siteInventory = libraryItem.siteInventory.find((inv: any) => inv.site.toString() === site);

            if (!siteInventory) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Book "${libraryItem.title}" not available at this site`
                    },
                    { status: 400 }
                );
            }

            if (siteInventory.availableQuantity < item.quantity) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Insufficient copies of "${libraryItem.title}". Available: ${siteInventory.availableQuantity}`
                    },
                    { status: 400 }
                );
            }

            lendingItems.push({
                book: item.book,
                quantityIssued: item.quantity,
                quantityReturned: 0,
                condition: 'good'
            });

            // Decrease available quantity
            siteInventory.availableQuantity -= item.quantity;
            await libraryItem.save();
        }

        // Create lending record
        const lending = new LibraryLending({
            borrower,
            site,
            issuedBy: body.issuedBy || borrower, // Should come from auth context
            issuedDate: new Date(),
            dueDate: new Date(dueDate),
            status: 'active',
            items: lendingItems,
            renewalCount: 0,
            renewalHistory: [],
            fines: [],
            totalFines: 0,
            notes
        });

        await lending.save();

        // Update library user
        libraryUser.currentBorrowings.push(lending._id);
        libraryUser.borrowingHistory.push(lending._id);
        libraryUser.totalBorrowings += 1;
        libraryUser.activeBorrowingsCount += 1;
        await libraryUser.save();

        const populatedLending = await LibraryLending.findById(lending._id).populate('borrower', 'firstName lastName').populate('site', 'siteName').populate('items.book', 'title isbn').lean();

        return NextResponse.json({ success: true, lending: populatedLending }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating lending:', error);
        return NextResponse.json({ success: false, message: 'Failed to create lending', error: error.message }, { status: 500 });
    }
}
