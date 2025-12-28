import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryUser: any;

try {
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// POST /api/library-users/[id]/suspend - Suspend a library user
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library user ID' }, { status: 400 });
        }

        const body = await request.json();

        if (!body.suspensionReason || body.suspensionReason.trim() === '') {
            return NextResponse.json({ success: false, message: 'Suspension reason is required' }, { status: 400 });
        }

        const libraryUser = await LibraryUser.findById(id);

        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found' }, { status: 404 });
        }

        // Update status to suspended
        libraryUser.status = 'suspended';
        libraryUser.suspensionReason = body.suspensionReason;
        libraryUser.suspensionDate = body.suspensionDate || new Date();

        await libraryUser.save();

        const populatedLibraryUser = await LibraryUser.findById(id).populate('user', 'firstName lastName email').populate('site', 'siteName code').lean();

        return NextResponse.json({
            success: true,
            message: 'Library user suspended successfully',
            libraryUser: populatedLibraryUser
        });
    } catch (error: any) {
        console.error('Error suspending library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to suspend library user', error: error.message }, { status: 500 });
    }
}
