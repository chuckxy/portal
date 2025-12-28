import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryLending: any;
let LibraryUser: any;

try {
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// POST /api/library-lending/[id]/fine/[fineIndex]/pay - Mark fine as paid
export async function POST(request: NextRequest, context: { params: Promise<{ id: string; fineIndex: string }> }) {
    try {
        await connectDB();
        const { id, fineIndex } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const fineIdx = parseInt(fineIndex);
        if (isNaN(fineIdx) || fineIdx < 0) {
            return NextResponse.json({ success: false, message: 'Invalid fine index' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id);

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        if (fineIdx >= lending.fines.length) {
            return NextResponse.json({ success: false, message: 'Fine not found' }, { status: 404 });
        }

        const fine = lending.fines[fineIdx];

        if (fine.isPaid) {
            return NextResponse.json({ success: false, message: 'Fine already paid' }, { status: 400 });
        }

        // Mark fine as paid
        fine.isPaid = true;
        fine.paidDate = new Date();

        await lending.save();

        // Update library user's overdue fines
        const libraryUser = await LibraryUser.findOne({
            user: lending.borrower,
            site: lending.site
        });

        if (libraryUser) {
            libraryUser.overdueFines = Math.max(0, libraryUser.overdueFines - fine.amount);
            await libraryUser.save();
        }

        const updatedLending = await LibraryLending.findById(id).populate('borrower', 'firstName lastName').populate('site', 'siteName').lean();

        return NextResponse.json({
            success: true,
            lending: updatedLending
        });
    } catch (error: any) {
        console.error('Error marking fine as paid:', error);
        return NextResponse.json({ success: false, message: 'Failed to mark fine as paid', error: error.message }, { status: 500 });
    }
}
