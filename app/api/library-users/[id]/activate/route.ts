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

// POST /api/library-users/[id]/activate - Activate a library user
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library user ID' }, { status: 400 });
        }

        const libraryUser = await LibraryUser.findById(id);

        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found' }, { status: 404 });
        }

        // Clear suspension data and activate
        libraryUser.status = 'active';
        libraryUser.suspensionReason = undefined;
        libraryUser.suspensionDate = undefined;

        await libraryUser.save();

        const populatedLibraryUser = await LibraryUser.findById(id).populate('user', 'firstName lastName email').populate('site', 'siteName code').lean();

        return NextResponse.json({
            success: true,
            message: 'Library user activated successfully',
            libraryUser: populatedLibraryUser
        });
    } catch (error: any) {
        console.error('Error activating library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to activate library user', error: error.message }, { status: 500 });
    }
}
