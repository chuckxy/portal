import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Chapter from '@/models/lms/Chapter';
import CourseModule from '@/models/lms/CourseModule';
import mongoose from 'mongoose';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/chapters/[id]
 * Fetch a single chapter by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter ID' }, { status: 400 });
        }

        const chapter = await Chapter.findById(id).populate('moduleId', 'moduleName moduleDescription').populate('addedBy', 'firstName lastName photoLink').populate('schoolSiteId', 'siteName').lean();

        if (!chapter) {
            return NextResponse.json({ success: false, error: 'Chapter not found' }, { status: 404 });
        }

        // Transform for frontend
        const transformedChapter = {
            ...chapter,
            chapterDescription: (chapter as any).description,
            sortOrder: (chapter as any).hierarchyOrder,
            status: (chapter as any).isActive ? 'published' : 'archived',
            isFree: false
        };

        return NextResponse.json({ success: true, chapter: transformedChapter });
    } catch (error: any) {
        console.error('Error fetching chapter:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/chapters/[id]
 * Update a chapter
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter ID' }, { status: 400 });
        }

        const body = await request.json();
        const { chapterName, chapterDescription, sortOrder, estimatedDuration, status, isFree, isActive } = body;

        // Build update object - map frontend fields to model fields
        const updateData: any = {};

        if (chapterName !== undefined) updateData.chapterName = chapterName;
        if (chapterDescription !== undefined) updateData.description = chapterDescription;
        if (sortOrder !== undefined) updateData.hierarchyOrder = sortOrder;
        if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
        if (status !== undefined) updateData.isActive = status !== 'archived';
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedChapter = await Chapter.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').lean();

        if (!updatedChapter) {
            return NextResponse.json({ success: false, error: 'Chapter not found' }, { status: 404 });
        }

        // Transform for frontend
        const transformedChapter = {
            ...updatedChapter,
            chapterDescription: (updatedChapter as any).description,
            sortOrder: (updatedChapter as any).hierarchyOrder,
            status: (updatedChapter as any).isActive ? 'published' : 'archived',
            isFree: false
        };

        return NextResponse.json({
            success: true,
            message: 'Chapter updated successfully',
            chapter: transformedChapter
        });
    } catch (error: any) {
        console.error('Error updating chapter:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/chapters/[id]
 * Delete a chapter
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter ID' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (hardDelete) {
            const deletedChapter = await Chapter.findByIdAndDelete(id);

            if (!deletedChapter) {
                return NextResponse.json({ success: false, error: 'Chapter not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, message: 'Chapter permanently deleted' });
        } else {
            const updatedChapter = await Chapter.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });

            if (!updatedChapter) {
                return NextResponse.json({ success: false, error: 'Chapter not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, message: 'Chapter archived successfully' });
        }
    } catch (error: any) {
        console.error('Error deleting chapter:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
