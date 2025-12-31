import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import Chapter from '@/models/lms/Chapter';
import CourseModule from '@/models/lms/CourseModule';
import mongoose from 'mongoose';

/**
 * GET /api/lms/chapters
 * Fetch chapters with filtering options
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const moduleId = searchParams.get('moduleId');
        const schoolSiteId = searchParams.get('schoolSiteId');
        const subjectId = searchParams.get('subjectId');
        const isActive = searchParams.get('isActive');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        // Build query
        const query: any = {};

        if (moduleId) {
            query.moduleId = new mongoose.Types.ObjectId(moduleId);
        }

        if (schoolSiteId) {
            query.schoolSiteId = new mongoose.Types.ObjectId(schoolSiteId);
        }

        if (subjectId) {
            query.subjectId = new mongoose.Types.ObjectId(subjectId);
        }

        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;

        const [chapters, total] = await Promise.all([
            Chapter.find(query).populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').sort({ hierarchyOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Chapter.countDocuments(query)
        ]);

        // Transform to expected format for frontend
        const transformedChapters = chapters.map((chapter: any) => ({
            ...chapter,
            chapterDescription: chapter.description,
            sortOrder: chapter.hierarchyOrder,
            status: chapter.isActive ? 'published' : 'archived',
            isFree: false
        }));

        return NextResponse.json({
            success: true,
            chapters: transformedChapters,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching chapters:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/chapters
 * Create a new chapter
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { chapterName, chapterDescription, moduleId, subjectId, schoolSiteId, addedBy, sortOrder, estimatedDuration, status } = body;

        // Validation
        if (!chapterName || !moduleId || !subjectId || !schoolSiteId || !addedBy) {
            return NextResponse.json({ success: false, error: 'Missing required fields: chapterName, moduleId, subjectId, schoolSiteId, addedBy' }, { status: 400 });
        }

        const newChapter = new Chapter({
            chapterName,
            description: chapterDescription,
            moduleId: new mongoose.Types.ObjectId(moduleId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            addedBy: new mongoose.Types.ObjectId(addedBy),
            hierarchyOrder: sortOrder || 0,
            estimatedDuration,
            isActive: status !== 'archived'
        });

        await newChapter.save();

        // Populate the response
        const populatedChapter = await Chapter.findById(newChapter._id).populate('moduleId', 'moduleName').populate('addedBy', 'firstName lastName photoLink').lean();

        // Transform for frontend
        const transformedChapter = {
            ...populatedChapter,
            chapterDescription: (populatedChapter as any)?.description,
            sortOrder: (populatedChapter as any)?.hierarchyOrder,
            status: (populatedChapter as any)?.isActive ? 'draft' : 'archived',
            isFree: false
        };

        return NextResponse.json(
            {
                success: true,
                message: 'Chapter created successfully',
                chapter: transformedChapter
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating chapter:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
