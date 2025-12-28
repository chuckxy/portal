import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryLending: any;
let LibraryItem: any;
let LibraryUser: any;

try {
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// POST /api/library-lending/[id]/return - Return items
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const body = await request.json();
        const { itemIndex, quantity, condition, notes } = body;

        if (itemIndex === undefined || !quantity || quantity <= 0) {
            return NextResponse.json({ success: false, message: 'Missing or invalid required fields' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id);

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        if (itemIndex < 0 || itemIndex >= lending.items.length) {
            return NextResponse.json({ success: false, message: 'Invalid item index' }, { status: 400 });
        }

        const item = lending.items[itemIndex];

        // Validate quantity to return
        const remaining = item.quantityIssued - item.quantityReturned;
        if (quantity > remaining) {
            return NextResponse.json({ success: false, message: `Cannot return more than ${remaining} items` }, { status: 400 });
        }

        // Update item return info
        item.quantityReturned += quantity;
        item.condition = condition || item.condition;
        item.returnNotes = notes;
        item.dateReturned = new Date();
        item.receivedBy = body.receivedBy; // Should come from auth context

        // Increase available quantity in library item
        const libraryItem = await LibraryItem.findById(item.book);
        if (libraryItem) {
            const siteInventory = libraryItem.siteInventory.find((inv: any) => inv.site.toString() === lending.site.toString());
            if (siteInventory) {
                siteInventory.availableQuantity += quantity;
                await libraryItem.save();
            }
        }

        // Check if all items are returned
        lending.checkAllReturned();

        // If all items returned, update library user
        if (lending.status === 'returned') {
            const libraryUser = await LibraryUser.findOne({
                user: lending.borrower,
                site: lending.site
            });
            if (libraryUser) {
                libraryUser.currentBorrowings = libraryUser.currentBorrowings.filter((bid: any) => bid.toString() !== id);
                libraryUser.activeBorrowingsCount = Math.max(0, libraryUser.activeBorrowingsCount - 1);
                await libraryUser.save();
            }
        }

        await lending.save();

        const updatedLending = await LibraryLending.findById(id).populate('borrower', 'firstName lastName').populate('site', 'siteName').populate('items.book', 'title').lean();

        return NextResponse.json({
            success: true,
            lending: updatedLending
        });
    } catch (error: any) {
        console.error('Error returning item:', error);
        return NextResponse.json({ success: false, message: 'Failed to return item', error: error.message }, { status: 500 });
    }
}
