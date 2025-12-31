import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import CourseModule from '@/models/lms/CourseModule';
import mongoose from 'mongoose';

/**
 * GET /api/lms/course-modules
 * Fetch course modules with filtering options
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const schoolSiteId = searchParams.get('schoolSiteId');
        const subjectId = searchParams.get('subjectId');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        // Build query
        const query: any = {};

        if (schoolSiteId) {
            query.schoolSiteId = new mongoose.Types.ObjectId(schoolSiteId);
        }

        if (subjectId) {
            query.subjectId = new mongoose.Types.ObjectId(subjectId);
        }

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;

        const [modules, total] = await Promise.all([
            CourseModule.find(query).populate('addedBy', 'firstName lastName photoLink').populate('schoolSiteId', 'siteName').populate('subjectId', 'name code').sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            CourseModule.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            modules,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching course modules:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/course-modules
 * Create a new course module
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { moduleName, moduleDescription, subjectId, schoolSiteId, addedBy, moduleFee, currency, status, estimatedDuration, sortOrder, prerequisites, learningObjectives, thumbnailPath } = body;

        // Validation
        if (!moduleName || !moduleDescription || !subjectId || !schoolSiteId || !addedBy) {
            return NextResponse.json({ success: false, error: 'Missing required fields: moduleName, moduleDescription, subjectId, schoolSiteId, addedBy' }, { status: 400 });
        }

        const newModule = new CourseModule({
            moduleName,
            moduleDescription,
            subjectId: new mongoose.Types.ObjectId(subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            addedBy: new mongoose.Types.ObjectId(addedBy),
            moduleFee: moduleFee || 0,
            currency: currency || 'GHS',
            status: status || 'draft',
            estimatedDuration,
            sortOrder: sortOrder || 0,
            prerequisites: prerequisites?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
            learningObjectives: learningObjectives || [],
            thumbnailPath,
            isActive: true
        });

        await newModule.save();

        // Populate the response
        const populatedModule = await CourseModule.findById(newModule._id).populate('addedBy', 'firstName lastName photoLink').populate('schoolSiteId', 'siteName').populate('subjectId', 'name code').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Course module created successfully',
                module: populatedModule
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating course module:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
