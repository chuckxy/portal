import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// Import necessary models
let LibraryItem: any;

try {
    LibraryItem = mongoose.models.LibraryItem || require('@/models/LibraryItem').default;
} catch (error) {
    console.error('Error loading models:', error);
}

// GET /api/library-items/[id] - Fetch a single library item
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library item ID' }, { status: 400 });
        }

        const libraryItem = await LibraryItem.findById(id)
            .populate('siteInventory.site', 'siteName code description')
            .populate('siteInventory.school', 'name')
            .populate('siteInventory.stockAdjustments.adjustedBy', 'firstName lastName')
            .populate('reviews.user', 'firstName lastName');

        if (!libraryItem) {
            return NextResponse.json({ success: false, message: 'Library item not found' }, { status: 404 });
        }

        const itemObj = libraryItem.toObject();
        // Calculate virtuals
        itemObj.totalQuantity = libraryItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        itemObj.totalAvailable = libraryItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.availableQuantity || 0), 0);

        return NextResponse.json({
            success: true,
            libraryItem: itemObj
        });
    } catch (error: any) {
        console.error('Error fetching library item:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch library item', error: error.message }, { status: 500 });
    }
}

// PUT /api/library-items/[id] - Update a library item
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library item ID' }, { status: 400 });
        }

        const body = await request.json();

        // Check if ISBN is being changed and if it's already in use
        if (body.isbn) {
            const existingItem = await LibraryItem.findOne({
                isbn: body.isbn,
                _id: { $ne: id }
            });

            if (existingItem) {
                return NextResponse.json({ success: false, message: 'An item with this ISBN already exists' }, { status: 400 });
            }
        }

        // Update fields
        const updateFields: any = {};

        if (body.title) updateFields.title = body.title;
        if (body.subtitle !== undefined) updateFields.subtitle = body.subtitle;
        if (body.itemType) updateFields.itemType = body.itemType;
        if (body.authors !== undefined) updateFields.authors = body.authors;
        if (body.category !== undefined) updateFields.category = body.category;
        if (body.isbn !== undefined) updateFields.isbn = body.isbn;
        if (body.lccn !== undefined) updateFields.lccn = body.lccn;
        if (body.publisher !== undefined) updateFields.publisher = body.publisher;
        if (body.publicationDate !== undefined) updateFields.publicationDate = body.publicationDate;
        if (body.edition !== undefined) updateFields.edition = body.edition;
        if (body.language) updateFields.language = body.language;
        if (body.pages !== undefined) updateFields.pages = body.pages;
        if (body.classification !== undefined) updateFields.classification = body.classification;
        if (body.description !== undefined) updateFields.description = body.description;
        if (body.subjects !== undefined) updateFields.subjects = body.subjects;
        if (body.coverImagePath !== undefined) updateFields.coverImagePath = body.coverImagePath;
        if (body.eBookLink !== undefined) updateFields.eBookLink = body.eBookLink;
        if (body.provider !== undefined) updateFields.provider = body.provider;
        if (body.isActive !== undefined) updateFields.isActive = body.isActive;

        const libraryItem = await LibraryItem.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true }).populate('siteInventory.site', 'siteName code').populate('siteInventory.school', 'name');

        if (!libraryItem) {
            return NextResponse.json({ success: false, message: 'Library item not found' }, { status: 404 });
        }

        const itemObj = libraryItem.toObject();
        // Calculate virtuals
        itemObj.totalQuantity = libraryItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0);
        itemObj.totalAvailable = libraryItem.siteInventory.reduce((sum: number, inv: any) => sum + (inv.availableQuantity || 0), 0);

        return NextResponse.json({
            success: true,
            libraryItem: itemObj
        });
    } catch (error: any) {
        console.error('Error updating library item:', error);
        return NextResponse.json({ success: false, message: 'Failed to update library item', error: error.message }, { status: 500 });
    }
}

// DELETE /api/library-items/[id] - Delete a library item
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await context.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: 'Invalid library item ID' }, { status: 400 });
        }

        const libraryItem = await LibraryItem.findById(id);

        if (!libraryItem) {
            return NextResponse.json({ success: false, message: 'Library item not found' }, { status: 404 });
        }

        // Check if any copies are currently borrowed (availableQuantity < quantity)
        const hasBorrowedCopies = libraryItem.siteInventory.some((inv: any) => inv.availableQuantity < inv.quantity);

        if (hasBorrowedCopies) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Cannot delete item with copies currently on loan. Please wait for all copies to be returned.'
                },
                { status: 400 }
            );
        }

        await LibraryItem.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Library item deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting library item:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete library item', error: error.message }, { status: 500 });
    }
}
