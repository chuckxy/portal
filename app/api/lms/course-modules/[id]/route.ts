import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import CourseModule from '@/models/lms/CourseModule';
import mongoose from 'mongoose';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/course-modules/[id]
 * Fetch a single course module by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid module ID' }, { status: 400 });
        }

        const courseModule = await CourseModule.findById(id).populate('addedBy', 'firstName lastName photoLink').populate('schoolSiteId', 'siteName').populate('subjectId', 'name code').populate('prerequisites', 'moduleName').lean();

        if (!courseModule) {
            return NextResponse.json({ success: false, error: 'Course module not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            module: courseModule
        });
    } catch (error: any) {
        console.error('Error fetching course module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/course-modules/[id]
 * Update a course module
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid module ID' }, { status: 400 });
        }

        const body = await request.json();
        const { moduleName, moduleDescription, subjectId, moduleFee, currency, status, estimatedDuration, sortOrder, prerequisites, learningObjectives, thumbnailPath, isActive } = body;

        // Build update object
        const updateData: any = {};

        if (moduleName !== undefined) updateData.moduleName = moduleName;
        if (moduleDescription !== undefined) updateData.moduleDescription = moduleDescription;
        if (subjectId !== undefined) updateData.subjectId = new mongoose.Types.ObjectId(subjectId);
        if (moduleFee !== undefined) updateData.moduleFee = moduleFee;
        if (currency !== undefined) updateData.currency = currency;
        if (status !== undefined) updateData.status = status;
        if (estimatedDuration !== undefined) updateData.estimatedDuration = estimatedDuration;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        if (prerequisites !== undefined) {
            updateData.prerequisites = prerequisites.map((id: string) => new mongoose.Types.ObjectId(id));
        }
        if (learningObjectives !== undefined) updateData.learningObjectives = learningObjectives;
        if (thumbnailPath !== undefined) updateData.thumbnailPath = thumbnailPath;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedModule = await CourseModule.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('addedBy', 'firstName lastName photoLink')
            .populate('schoolSiteId', 'siteName')
            .populate('subjectId', 'name code')
            .lean();

        if (!updatedModule) {
            return NextResponse.json({ success: false, error: 'Course module not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Course module updated successfully',
            module: updatedModule
        });
    } catch (error: any) {
        console.error('Error updating course module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/course-modules/[id]
 * Delete a course module (soft delete by setting isActive to false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid module ID' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (hardDelete) {
            // Hard delete - permanently remove
            const deletedModule = await CourseModule.findByIdAndDelete(id);

            if (!deletedModule) {
                return NextResponse.json({ success: false, error: 'Course module not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Course module permanently deleted'
            });
        } else {
            // Soft delete - mark as inactive
            const updatedModule = await CourseModule.findByIdAndUpdate(id, { $set: { isActive: false, status: 'archived' } }, { new: true });

            if (!updatedModule) {
                return NextResponse.json({ success: false, error: 'Course module not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Course module archived successfully'
            });
        }
    } catch (error: any) {
        console.error('Error deleting course module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
