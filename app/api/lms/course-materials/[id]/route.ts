import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import CourseMaterial from '@/models/lms/CourseMaterial';
import Lesson from '@/models/lms/Lesson';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/lms/course-materials/[id]
 * Get a single course material by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid material ID' }, { status: 400 });
        }

        const material = await CourseMaterial.findById(id).populate('lessonId', 'lessonTitle').populate('chapterId', 'chapterName').populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').lean();

        if (!material) {
            return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, material });
    } catch (error: any) {
        console.error('Error fetching material:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/lms/course-materials/[id]
 * Update a course material by ID
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid material ID' }, { status: 400 });
        }

        const { materialTitle, materialDescription, materialType, materialURL, fileSize, duration, pageCount, sortOrder, isDownloadable, isActive, isPrimary, lessonId } = body;

        const updateData: any = {};

        if (materialTitle !== undefined) updateData.materialTitle = materialTitle;
        if (materialDescription !== undefined) updateData.materialDescription = materialDescription;
        if (materialType !== undefined) updateData.materialType = materialType;
        if (materialURL !== undefined) updateData.materialURL = materialURL;
        if (fileSize !== undefined) updateData.fileSize = fileSize;
        if (duration !== undefined) updateData.duration = duration;
        if (pageCount !== undefined) updateData.pageCount = pageCount;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
        if (isDownloadable !== undefined) updateData.isDownloadable = isDownloadable;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedMaterial = await CourseMaterial.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true }).populate('lessonId', 'lessonTitle').populate('addedBy', 'firstName lastName photoLink').lean();

        if (!updatedMaterial) {
            return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
        }

        // Handle primary content update (setting lesson's contentUrl and contentType directly)
        if (isPrimary !== undefined && lessonId) {
            if (isPrimary) {
                // Set this material's content as the lesson's primary content
                await Lesson.findByIdAndUpdate(lessonId, {
                    contentType:
                        (updatedMaterial as any).materialType === 'video' || (updatedMaterial as any).materialType === 'video_link'
                            ? 'video'
                            : (updatedMaterial as any).materialType === 'pdf' || (updatedMaterial as any).materialType === 'pdf_link'
                            ? 'pdf'
                            : (updatedMaterial as any).materialType === 'image' || (updatedMaterial as any).materialType === 'image_link'
                            ? 'image'
                            : 'html',
                    contentUrl: (updatedMaterial as any).materialURL
                });
                // Remove from attached materials if it was there
                await Lesson.findByIdAndUpdate(lessonId, {
                    $pull: { attachedMaterialIds: id }
                });
            } else {
                // Add to attached materials
                await Lesson.findByIdAndUpdate(lessonId, {
                    $addToSet: { attachedMaterialIds: id }
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Material updated successfully',
            material: updatedMaterial
        });
    } catch (error: any) {
        console.error('Error updating material:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/lms/course-materials/[id]
 * Delete (or archive) a course material
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, error: 'Invalid material ID' }, { status: 400 });
        }

        const material = await CourseMaterial.findById(id);
        if (!material) {
            return NextResponse.json({ success: false, error: 'Material not found' }, { status: 404 });
        }

        // Remove from lesson references (attached materials only, primaryMaterialId removed from schema)
        await Lesson.updateMany({ attachedMaterialIds: id }, { $pull: { attachedMaterialIds: id } });

        if (hardDelete) {
            await CourseMaterial.findByIdAndDelete(id);
            return NextResponse.json({
                success: true,
                message: 'Material permanently deleted'
            });
        }

        // Soft delete
        await CourseMaterial.findByIdAndUpdate(id, { isActive: false });
        return NextResponse.json({
            success: true,
            message: 'Material archived successfully'
        });
    } catch (error: any) {
        console.error('Error deleting material:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
