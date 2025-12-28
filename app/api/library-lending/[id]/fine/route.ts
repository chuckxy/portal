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

// POST /api/library-lending/[id]/fine - Add fine to lending
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const body = await request.json();
        const { reason, amount, notes } = body;

        if (!reason || !amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Reason and valid amount are required' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id);

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        // Add fine
        lending.fines.push({
            reason,
            amount,
            isPaid: false,
            notes
        });

        // Recalculate total fines
        lending.calculateTotalFines();

        await lending.save();

        // Update library user's overdue fines
        const libraryUser = await LibraryUser.findOne({
            user: lending.borrower,
            site: lending.site
        });

        if (libraryUser) {
            libraryUser.overdueFines += amount;
            await libraryUser.save();
        }

        const updatedLending = await LibraryLending.findById(id).populate('borrower', 'firstName lastName').populate('site', 'siteName').lean();

        return NextResponse.json({
            success: true,
            lending: updatedLending
        });
    } catch (error: any) {
        console.error('Error adding fine:', error);
        return NextResponse.json({ success: false, message: 'Failed to add fine', error: error.message }, { status: 500 });
    }
}
