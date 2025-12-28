import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryLending: any;

try {
    LibraryLending = mongoose.models.LibraryLending || require('@/models/LibraryLending').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// POST /api/library-lending/[id]/renew - Renew lending
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid lending ID' }, { status: 400 });
        }

        const body = await request.json();
        const { newDueDate } = body;

        if (!newDueDate) {
            return NextResponse.json({ success: false, message: 'New due date is required' }, { status: 400 });
        }

        const lending = await LibraryLending.findById(id);

        if (!lending) {
            return NextResponse.json({ success: false, message: 'Lending not found' }, { status: 404 });
        }

        if (lending.status === 'returned') {
            return NextResponse.json({ success: false, message: 'Cannot renew returned items' }, { status: 400 });
        }

        // Add to renewal history
        lending.renewalHistory.push({
            renewedBy: body.renewedBy, // Should come from auth context
            renewedAt: new Date(),
            previousDueDate: lending.dueDate,
            newDueDate: new Date(newDueDate)
        });

        // Update due date and renewal count
        lending.dueDate = new Date(newDueDate);
        lending.renewalCount += 1;

        // Reset status if was overdue
        if (lending.status === 'overdue') {
            lending.status = 'active';
        }

        await lending.save();

        const updatedLending = await LibraryLending.findById(id).populate('borrower', 'firstName lastName').populate('site', 'siteName').populate('renewalHistory.renewedBy', 'firstName lastName').lean();

        return NextResponse.json({
            success: true,
            lending: updatedLending
        });
    } catch (error: any) {
        console.error('Error renewing lending:', error);
        return NextResponse.json({ success: false, message: 'Failed to renew lending', error: error.message }, { status: 500 });
    }
}
