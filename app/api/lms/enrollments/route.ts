import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db/mongodb';
import LMSEnrollment from '@/models/lms/LMSEnrollment';
import Subject from '@/models/Subject';
import Person from '@/models/Person';

/**
 * GET /api/lms/enrollments
 * Fetch enrollments with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const personId = searchParams.get('personId');
        const subjectId = searchParams.get('subjectId');
        const schoolSiteId = searchParams.get('schoolSiteId');
        const status = searchParams.get('status');
        const academicYear = searchParams.get('academicYear');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const skip = (page - 1) * limit;

        const query: any = { isActive: true };

        if (personId) query.personId = new mongoose.Types.ObjectId(personId);
        if (subjectId) query.subjectId = new mongoose.Types.ObjectId(subjectId);
        if (schoolSiteId) query.schoolSiteId = new mongoose.Types.ObjectId(schoolSiteId);
        if (status) query.status = status;
        if (academicYear) query.academicYear = academicYear;

        const [enrollments, total] = await Promise.all([
            LMSEnrollment.find(query).populate('subjectId', 'name code').populate('personId', 'firstName lastName email photoLink studentNo').populate('enrolledBy', 'firstName lastName').sort({ enrollmentDate: -1 }).skip(skip).limit(limit).lean(),
            LMSEnrollment.countDocuments(query)
        ]);

        return NextResponse.json({
            success: true,
            enrollments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Error fetching enrollments:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/lms/enrollments
 * Create a new enrollment
 */
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { personId, subjectId, schoolSiteId, enrolledBy, expiryDate, notes, enrollmentSource = 'manual' } = body;

        // Validation
        if (!personId || !subjectId || !schoolSiteId || !enrolledBy) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: personId, subjectId, schoolSiteId, enrolledBy'
                },
                { status: 400 }
            );
        }

        // Check if enrollment already exists
        const existing = await LMSEnrollment.findOne({
            personId: new mongoose.Types.ObjectId(personId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            isActive: true
        });

        if (existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Student is already enrolled in this course'
                },
                { status: 400 }
            );
        }

        const newEnrollment = new LMSEnrollment({
            personId: new mongoose.Types.ObjectId(personId),
            subjectId: new mongoose.Types.ObjectId(subjectId),
            schoolSiteId: new mongoose.Types.ObjectId(schoolSiteId),
            enrolledBy: new mongoose.Types.ObjectId(enrolledBy),
            enrollmentDate: new Date(),
            expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            status: 'enrolled',
            progressPercentage: 0,
            totalTimeSpent: 0,
            enrollmentSource,
            notes,
            isActive: true
        });

        await newEnrollment.save();

        const populatedEnrollment = await LMSEnrollment.findById(newEnrollment._id).populate('subjectId', 'name code').populate('personId', 'firstName lastName email photoLink studentNo').populate('enrolledBy', 'firstName lastName').lean();

        return NextResponse.json(
            {
                success: true,
                message: 'Enrollment created successfully',
                enrollment: populatedEnrollment
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error creating enrollment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
