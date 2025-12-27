import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ExamScore from '@/models/ExamScore';
import Person from '@/models/Person';
import School from '@/models/School';
import SchoolSite from '@/models/SchoolSite';
import SiteClass from '@/models/SiteClass';
import Subject from '@/models/Subject';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// GET - Get single exam score by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const examScore = await ExamScore.findById(id)
            .populate('student', 'firstName lastName studentInfo')
            .populate('school', 'name')
            .populate('site', 'name')
            .populate('class', 'className studentCount')
            .populate('scores.subject', 'name code')
            .populate('promotedTo', 'className')
            .populate('recordedBy', 'firstName lastName')
            .populate('modificationHistory.modifiedBy', 'firstName lastName');

        if (!examScore) {
            return NextResponse.json({ error: 'Exam score not found' }, { status: 404 });
        }

        return NextResponse.json(examScore);
    } catch (error: any) {
        console.error('Error fetching exam score:', error);
        return NextResponse.json({ error: 'Failed to fetch exam score', details: error.message }, { status: 500 });
    }
}

// PUT - Update exam score
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        // Find existing record
        const existingScore = await ExamScore.findById(id);
        if (!existingScore) {
            return NextResponse.json({ error: 'Exam score not found' }, { status: 404 });
        }

        // Prevent editing published records without unpublishing first
        if (existingScore.isPublished && body.isPublished !== false) {
            return NextResponse.json({ error: 'Cannot edit published exam scores. Please unpublish first.' }, { status: 403 });
        }

        // Extract ObjectId references from populated fields
        if (body.student && typeof body.student === 'object') {
            body.student = body.student._id || body.student;
        }
        if (body.school && typeof body.school === 'object') {
            body.school = body.school._id || body.school;
        }
        if (body.site && typeof body.site === 'object') {
            body.site = body.site._id || body.site;
        }
        if (body.class && typeof body.class === 'object') {
            body.class = body.class._id || body.class;
        }
        if (body.promotedTo && typeof body.promotedTo === 'object') {
            body.promotedTo = body.promotedTo._id || body.promotedTo;
        }
        if (body.recordedBy && typeof body.recordedBy === 'object') {
            body.recordedBy = body.recordedBy._id || body.recordedBy;
        }

        // Extract subject references from scores
        if (body.scores && Array.isArray(body.scores)) {
            body.scores = body.scores.map((score: any) => ({
                ...score,
                subject: typeof score.subject === 'object' ? score.subject._id || score.subject : score.subject
            }));
        }

        // Check for duplicate if key fields are being changed
        const studentId = body.student || existingScore.student;
        const year = body.academicYear || existingScore.academicYear;
        const term = body.academicTerm || existingScore.academicTerm;

        const duplicate = await ExamScore.findOne({
            _id: { $ne: id }, // Exclude current record
            student: studentId,
            academicYear: year,
            academicTerm: term
        });

        if (duplicate) {
            return NextResponse.json({ error: 'An exam score record already exists for this student, academic year, and term combination.' }, { status: 409 });
        }

        // Calculate overall average and total marks
        if (body.scores && body.scores.length > 0) {
            const totalScore = body.scores.reduce((sum: number, score: any) => sum + (score.totalScore || 0), 0);
            body.overallAverage = totalScore / body.scores.length;
            body.totalMarks = totalScore;
        }

        // Track modifications - store only essential fields to avoid circular reference
        const beforeSnapshot = {
            overallAverage: existingScore.overallAverage,
            totalMarks: existingScore.totalMarks,
            attendance: existingScore.attendance,
            conduct: existingScore.conduct,
            interest: existingScore.interest,
            formMasterComment: existingScore.formMasterComment,
            headmasterComment: existingScore.headmasterComment,
            promoted: existingScore.promoted,
            isPublished: existingScore.isPublished
        };

        const afterSnapshot = {
            overallAverage: body.overallAverage,
            totalMarks: body.totalMarks,
            attendance: body.attendance,
            conduct: body.conduct,
            interest: body.interest,
            formMasterComment: body.formMasterComment,
            headmasterComment: body.headmasterComment,
            promoted: body.promoted,
            isPublished: body.isPublished
        };

        body.modificationHistory = [
            ...(existingScore.modificationHistory || []),
            {
                modifiedBy: body.modifiedBy || body.recordedBy,
                modifiedAt: new Date(),
                changes: {
                    before: beforeSnapshot,
                    after: afterSnapshot
                }
            }
        ];

        // Update
        const updatedScore = await ExamScore.findByIdAndUpdate(id, body, { new: true, runValidators: true })
            .populate('student', 'firstName lastName studentInfo')
            .populate('school', 'name')
            .populate('site', 'name')
            .populate('class', 'className studentCount')
            .populate('scores.subject', 'name code')
            .populate('promotedTo', 'className')
            .populate('recordedBy', 'firstName lastName')
            .populate('modificationHistory.modifiedBy', 'firstName lastName');

        return NextResponse.json(updatedScore);
    } catch (error: any) {
        console.error('Error updating exam score:', error);
        return NextResponse.json({ error: 'Failed to update exam score', details: error.message }, { status: 500 });
    }
}

// DELETE - Delete exam score (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const examScore = await ExamScore.findById(id);
        if (!examScore) {
            return NextResponse.json({ error: 'Exam score not found' }, { status: 404 });
        }

        // Prevent deleting published records
        if (examScore.isPublished) {
            return NextResponse.json({ error: 'Cannot delete published exam scores. Please unpublish first.' }, { status: 403 });
        }

        await ExamScore.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Exam score deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting exam score:', error);
        return NextResponse.json({ error: 'Failed to delete exam score', details: error.message }, { status: 500 });
    }
}
