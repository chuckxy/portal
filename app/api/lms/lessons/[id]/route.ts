import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Lesson from '@/models/lms/Lesson';
import Chapter from '@/models/lms/Chapter';
import CourseModule from '@/models/lms/CourseModule';
import CourseMaterial from '@/models/lms/CourseMaterial';
import mongoose from 'mongoose';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/lessons/[id]
 * Fetch a single lesson by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid lesson ID' }, { status: 400 });
        }

        const lesson = await Lesson.findById(id).populate('chapterId', 'chapterName').populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').populate('attachedMaterialIds').lean();

        if (!lesson) {
            return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
        }

        // Transform for frontend
        const transformedLesson = {
            ...lesson,
            lessonName: (lesson as any).lessonTitle,
            sortOrder: (lesson as any).hierarchyOrder,
            duration: (lesson as any).lessonDuration ? (lesson as any).lessonDuration * 60 : 0,
            isFree: (lesson as any).isFreePreview,
            allowDownload: (lesson as any).allowDownload || false,
            contentType: (lesson as any).contentType || 'video',
            contentUrl: (lesson as any).contentUrl || '',
            contentHtml: (lesson as any).contentHtml || ''
        };

        return NextResponse.json({ success: true, lesson: transformedLesson });
    } catch (error: any) {
        console.error('Error fetching lesson:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/lessons/[id]
 * Update a lesson by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid lesson ID' }, { status: 400 });
        }

        const { lessonName, lessonDescription, chapterId, moduleId, subjectId, contentType, contentUrl, contentHtml, duration, sortOrder, status, isFree, allowDownload } = body;

        // Build update object (map frontend fields to model fields)
        const updateData: any = {};

        if (lessonName !== undefined) updateData.lessonTitle = lessonName;
        if (lessonDescription !== undefined) updateData.lessonDescription = lessonDescription;
        if (chapterId !== undefined) updateData.chapterId = new mongoose.Types.ObjectId(chapterId);
        if (moduleId !== undefined) updateData.moduleId = new mongoose.Types.ObjectId(moduleId);
        if (subjectId !== undefined) updateData.subjectId = subjectId ? new mongoose.Types.ObjectId(subjectId) : undefined;
        if (contentType !== undefined) updateData.contentType = contentType;
        if (contentUrl !== undefined) updateData.contentUrl = contentUrl;
        if (contentHtml !== undefined) updateData.contentHtml = contentHtml;
        if (sortOrder !== undefined) updateData.hierarchyOrder = sortOrder;
        if (duration !== undefined) updateData.lessonDuration = Math.ceil(duration / 60); // Seconds to minutes
        if (status !== undefined) updateData.status = status;
        if (isFree !== undefined) updateData.isFreePreview = isFree;
        if (allowDownload !== undefined) updateData.allowDownload = allowDownload;

        updateData.dateModified = new Date();

        const updatedLesson = await Lesson.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
            .populate('chapterId', 'chapterName')
            .populate('moduleId', 'moduleName')
            .populate('addedBy', 'firstName lastName photoLink')
            .lean();

        if (!updatedLesson) {
            return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
        }

        // Transform for frontend
        const transformedLesson = {
            ...updatedLesson,
            lessonName: (updatedLesson as any).lessonTitle,
            sortOrder: (updatedLesson as any).hierarchyOrder,
            duration: (updatedLesson as any).lessonDuration ? (updatedLesson as any).lessonDuration * 60 : 0,
            isFree: (updatedLesson as any).isFreePreview,
            allowDownload: (updatedLesson as any).allowDownload || false,
            contentType: (updatedLesson as any).contentType || 'video',
            contentUrl: (updatedLesson as any).contentUrl || '',
            contentHtml: (updatedLesson as any).contentHtml || ''
        };

        return NextResponse.json({
            success: true,
            message: 'Lesson updated successfully',
            lesson: transformedLesson
        });
    } catch (error: any) {
        console.error('Error updating lesson:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/lessons/[id]
 * Delete a lesson (soft delete or hard delete)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid lesson ID' }, { status: 400 });
        }

        if (hardDelete) {
            // Hard delete - permanently remove
            const deleted = await Lesson.findByIdAndDelete(id);

            if (!deleted) {
                return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Lesson permanently deleted'
            });
        } else {
            // Soft delete - mark as inactive
            const updatedLesson = await Lesson.findByIdAndUpdate(id, { $set: { isActive: false, dateModified: new Date() } }, { new: true }).lean();

            if (!updatedLesson) {
                return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: 'Lesson archived successfully'
            });
        }
    } catch (error: any) {
        console.error('Error deleting lesson:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
