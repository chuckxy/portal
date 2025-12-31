import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Lesson from '@/models/lms/Lesson';
import mongoose from 'mongoose';

/**
 * GET /api/lms/lessons
 * Fetch lessons with filtering options
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const chapterId = searchParams.get('chapterId');
        const moduleId = searchParams.get('moduleId');
        const subjectId = searchParams.get('subjectId');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query
        const query: any = {};

        if (chapterId) {
            query.chapterId = new mongoose.Types.ObjectId(chapterId);
        }

        if (moduleId) {
            query.moduleId = new mongoose.Types.ObjectId(moduleId);
        }

        if (subjectId) {
            query.subjectId = new mongoose.Types.ObjectId(subjectId);
        }

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;

        const [lessons, total] = await Promise.all([
            Lesson.find(query).populate('chapterId', 'chapterName').populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').sort({ hierarchyOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Lesson.countDocuments(query)
        ]);

        // Transform to expected format for frontend
        const transformedLessons = lessons.map((lesson: any) => {
            // Primary lesson content loads directly from lesson schema (contentUrl and contentType)
            // Attached materials are fetched separately from CourseMaterial schema
            return {
                ...lesson,
                lessonName: lesson.lessonTitle,
                sortOrder: lesson.hierarchyOrder,
                duration: lesson.lessonDuration ? lesson.lessonDuration * 60 : 0, // Convert minutes to seconds
                isFree: lesson.isFreePreview,
                allowDownload: lesson.allowDownload || false,
                contentType: lesson.contentType || 'video',
                contentUrl: lesson.contentUrl || '',
                contentHtml: lesson.contentHtml || ''
            };
        });

        return NextResponse.json({
            success: true,
            lessons: transformedLessons,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching lessons:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/lessons
 * Create a new lesson
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { lessonName, lessonDescription, chapterId, moduleId, subjectId, schoolSiteId, addedBy, contentType, contentUrl, contentHtml, duration, sortOrder, status, isFree, allowDownload } = body;

        // Validation
        if (!lessonName || !chapterId || !moduleId || !subjectId || !schoolSiteId || !addedBy) {
            return NextResponse.json({ success: false, error: 'Missing required fields: lessonName, chapterId, moduleId, subjectId, schoolSiteId, addedBy' }, { status: 400 });
        }

        const newLesson = new Lesson({
            lessonTitle: lessonName,
            lessonDescription,
            contentType: contentType || 'video',
            contentUrl: contentUrl || '',
            contentHtml: contentHtml || '',
            chapterId: new mongoose.Types.ObjectId(chapterId),
            moduleId: new mongoose.Types.ObjectId(moduleId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            addedBy: new mongoose.Types.ObjectId(addedBy),
            lessonDuration: duration ? Math.ceil(duration / 60) : 0, // Convert seconds to minutes
            hierarchyOrder: sortOrder || 0,
            status: status || 'draft',
            isFreePreview: isFree || false,
            allowDownload: allowDownload || false,
            isActive: true,
            dateAdded: new Date()
        });

        await newLesson.save();

        // Populate the response
        const populatedLesson = await Lesson.findById(newLesson._id).populate('chapterId', 'chapterName').populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').lean();

        // Transform for frontend
        const transformedLesson = {
            ...populatedLesson,
            lessonName: (populatedLesson as any)?.lessonTitle,
            sortOrder: (populatedLesson as any)?.hierarchyOrder,
            duration: (populatedLesson as any)?.lessonDuration ? (populatedLesson as any).lessonDuration * 60 : 0,
            isFree: (populatedLesson as any)?.isFreePreview,
            allowDownload: (populatedLesson as any)?.allowDownload || false,
            contentType: (populatedLesson as any)?.contentType || 'video',
            contentUrl: (populatedLesson as any)?.contentUrl || '',
            contentHtml: (populatedLesson as any)?.contentHtml || ''
        };

        return NextResponse.json(
            {
                success: true,
                message: 'Lesson created successfully',
                lesson: transformedLesson
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating lesson:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
