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

// GET /api/library-lending/[id] - Fetch single lending
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id)
            .populate('borrower', 'firstName lastName email contact')
            .populate('site', 'siteName code')
            .populate('issuedBy', 'firstName lastName')
            .populate('items.book', 'title isbn author coverImagePath')
            .populate('items.receivedBy', 'firstName lastName')
            .populate('renewalHistory.renewedBy', 'firstName lastName');

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        // Convert to object with virtuals
        const lendingObj = lending.toObject();
        lendingObj.isOverdue = lending.status === 'active' && new Date() > lending.dueDate;
        if (lending.status === 'active' || lending.status === 'overdue') {
            const now = new Date();
            if (now > lending.dueDate) {
                const diffTime = Math.abs(now.getTime() - lending.dueDate.getTime());
                lendingObj.daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                lendingObj.daysOverdue = 0;
            }
        } else {
            lendingObj.daysOverdue = 0;
        }

        return NextResponse.json(lendingObj);
    } catch (error: any) {
        console.error('Error fetching lending:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch lending', error: error.message }, { status: 500 });
    }
}

// DELETE /api/library-lending/[id] - Delete lending (admin only, with safety checks)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id);

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        // Safety check: only allow deletion if fully returned and no unpaid fines
        if (lending.status !== 'returned') {
            return NextResponse.json({ success: false, message: 'Cannot delete active lending. All items must be returned first.' }, { status: 400 });
        }

        const unpaidFines = lending.fines.filter((f: any) => !f.isPaid);
        if (unpaidFines.length > 0) {
            return NextResponse.json({ success: false, message: 'Cannot delete lending with unpaid fines' }, { status: 400 });
        }

        // Remove from library user's borrowing history
        const libraryUser = await LibraryUser.findOne({
            user: lending.borrower,
            site: lending.site
        });

        if (libraryUser) {
            libraryUser.borrowingHistory = libraryUser.borrowingHistory.filter((bid: any) => bid.toString() !== id);
            await libraryUser.save();
        }

        await LibraryLending.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Lending deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting lending:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete lending', error: error.message }, { status: 500 });
    }
}
