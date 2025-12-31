import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import CourseMaterial from '@/models/lms/CourseMaterial';
import Lesson from '@/models/lms/Lesson';

/**
 * GET /api/lms/course-materials
 * Fetch course materials with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const lessonId = searchParams.get('lessonId');
        const chapterId = searchParams.get('chapterId');
        const moduleId = searchParams.get('moduleId');
        const subjectId = searchParams.get('subjectId');
        const schoolSiteId = searchParams.get('schoolSiteId');
        const materialType = searchParams.get('materialType');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const query: any = { isActive: true };

        if (lessonId) query.lessonId = new mongoose.Types.ObjectId(lessonId);
        if (chapterId) query.chapterId = new mongoose.Types.ObjectId(chapterId);
        if (moduleId) query.moduleId = new mongoose.Types.ObjectId(moduleId);
        if (subjectId) query.subjectId = new mongoose.Types.ObjectId(subjectId);
        if (schoolSiteId) query.schoolSiteId = new mongoose.Types.ObjectId(schoolSiteId);
        if (materialType) query.materialType = materialType;

        const [materials, total] = await Promise.all([
            CourseMaterial.find(query).populate('lessonId', 'lessonTitle').populate('addedBy', 'firstName lastName photoLink').sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            CourseMaterial.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            materials,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching course materials:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/course-materials
 * Create a new course material
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const {
            lessonId,
            chapterId,
            moduleId,
            subjectId,
            schoolSiteId,
            addedBy,
            materialTitle,
            materialDescription,
            materialType,
            materialURL,
            fileSize,
            duration,
            pageCount,
            sortOrder,
            isDownloadable,
            isPrimary // If true, set as primary material for the lesson
        } = body;

        // Validation
        if (!materialTitle || !lessonId || !chapterId || !moduleId || !subjectId || !schoolSiteId || !addedBy || !materialType || !materialURL) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: materialTitle, lessonId, chapterId, moduleId, subjectId, schoolSiteId, addedBy, materialType, materialURL'
                },
                { status: 400 }
            );
        }

        const newMaterial = new CourseMaterial({
            lessonId: new mongoose.Types.ObjectId(lessonId),
            chapterId: new mongoose.Types.ObjectId(chapterId),
            moduleId: new mongoose.Types.ObjectId(moduleId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            addedBy: new mongoose.Types.ObjectId(addedBy),
            materialTitle,
            materialDescription,
            materialType,
            materialURL,
            fileSize: fileSize || 0,
            duration: duration || 0,
            pageCount: pageCount || 0,
            sortOrder: sortOrder || 0,
            isDownloadable: isDownloadable !== false,
            isActive: true,
            uploadDate: new Date()
        });

        await newMaterial.save();

        // If this should be the primary material, update the lesson's contentUrl and contentType directly
        if (isPrimary) {
            await Lesson.findByIdAndUpdate(lessonId, {
                contentType:
                    materialType === 'video' || materialType === 'video_link'
                        ? 'video'
                        : materialType === 'pdf' || materialType === 'pdf_link'
                        ? 'pdf'
                        : materialType === 'image' || materialType === 'image_link'
                        ? 'image'
                        : materialType === 'link' || materialType === 'web_page'
                        ? 'link'
                        : 'video',
                contentUrl: materialURL
            });
        } else {
            // Add to attached materials
            await Lesson.findByIdAndUpdate(lessonId, {
                $addToSet: { attachedMaterialIds: newMaterial._id }
            });
        }

        const populatedMaterial = await CourseMaterial.findById(newMaterial._id).populate('lessonId', 'lessonTitle').populate('addedBy', 'firstName lastName photoLink').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Course material created successfully',
                material: populatedMaterial
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating course material:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
