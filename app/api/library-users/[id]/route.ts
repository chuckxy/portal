import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryUser: any;
let Person: any;
let SchoolSite: any;

try {
    LibraryUser = mongoose.models.LibraryUser || require('@/models/LibraryUser').default;
    Person = mongoose.models.Person || require('@/models/Person').default;
    SchoolSite = mongoose.models.SchoolSite || require('@/models/SchoolSite').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/library-users/[id] - Fetch a single library user
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library user ID' }, { status: 400 });
        }

        const libraryUser = await LibraryUser.findById(id).populate('user', 'firstName lastName email contact personCategory').populate('site', 'siteName code description').populate('currentBorrowings').populate('borrowingHistory').lean();

        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            libraryUser
        });
    } catch (error: any) {
        console.error('Error fetching library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch library user', error: error.message }, { status: 500 });
    }
}

// PUT /api/library-users/[id] - Update a library user
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library user ID' }, { status: 400 });
        }

        const body = await request.json();

        // Fields that can be updated
        const updateFields: any = {};

        if (body.status) updateFields.status = body.status;
        if (body.membershipType) updateFields.membershipType = body.membershipType;
        if (body.borrowingLimit !== undefined) updateFields.borrowingLimit = body.borrowingLimit;
        if (body.borrowingPeriodDays !== undefined) updateFields.borrowingPeriodDays = body.borrowingPeriodDays;
        if (body.notes !== undefined) updateFields.notes = body.notes;
        if (body.expiryDate !== undefined) updateFields.expiryDate = body.expiryDate;
        if (body.overdueFines !== undefined) updateFields.overdueFines = body.overdueFines;

        // Update user or site if provided and different
        if (body.user && mongoose.Types.ObjectId.isValid(body.user)) {
            const userExists = await Person.findById(body.user);
            if (!userExists) {
                return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
            }
            updateFields.user = body.user;
        }

        if (body.site && mongoose.Types.ObjectId.isValid(body.site)) {
            const siteExists = await SchoolSite.findById(body.site);
            if (!siteExists) {
                return NextResponse.json({ success: false, message: 'Site not found' }, { status: 404 });
            }
            updateFields.site = body.site;
        }

        const libraryUser = await LibraryUser.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true }).populate('user', 'firstName lastName email contact').populate('site', 'siteName code').lean();

        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            libraryUser
        });
    } catch (error: any) {
        console.error('Error updating library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to update library user', error: error.message }, { status: 500 });
    }
}

// DELETE /api/library-users/[id] - Delete a library user
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library user ID' }, { status: 400 });
        }

        // Check if user has active borrowings
        const libraryUser = await LibraryUser.findById(id);

        if (!libraryUser) {
            return NextResponse.json({ success: false, message: 'Library user not found' }, { status: 404 });
        }

        if (libraryUser.activeBorrowingsCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete library user with active borrowings. Please return all items first.'
                },
                { status: 400 }
            );
        }

        if (libraryUser.overdueFines > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete library user with outstanding fines. Please clear all fines first.'
                },
                { status: 400 }
            );
        }

        await LibraryUser.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Library user deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting library user:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete library user', error: error.message }, { status: 500 });
    }
}
