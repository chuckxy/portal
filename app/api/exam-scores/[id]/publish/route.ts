import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ExamScore from '@/models/ExamScore';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// PATCH - Publish exam score
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        const examScore = await ExamScore.findById(id);
        if (!examScore) {
            return NextResponse.json({ error: 'Exam score not found' }, { status: 404 });
        }

        // Validation before publishing
        if (!examScore.student || !examScore.class || !examScore.academicYear || !examScore.academicTerm) {
            return NextResponse.json({ error: 'Missing required fields. Cannot publish incomplete exam score.' }, { status: 400 });
        }

        if (examScore.scores.length === 0) {
            return NextResponse.json({ error: 'At least one subject score is required to publish.' }, { status: 400 });
        }

        if (examScore.overallAverage === 0) {
            return NextResponse.json({ error: 'Overall average cannot be zero. Please enter valid scores.' }, { status: 400 });
        }

        if (!examScore.formMasterComment || examScore.formMasterComment.trim() === '') {
            return NextResponse.json({ error: 'Form Master comment is required before publishing.' }, { status: 400 });
        }

        // Publish
        examScore.isPublished = true;
        examScore.publishedAt = new Date();
        await examScore.save();

        // Add to modification history
        examScore.modificationHistory.push({
            modifiedBy: examScore.recordedBy,
            modifiedAt: new Date(),
            changes: { action: 'published' }
        });
        await examScore.save();

        // Populate and return
        await examScore.populate([
            { path: 'student', select: 'firstName lastName studentInfo' },
            { path: 'school', select: 'name' },
            { path: 'site', select: 'name' },
            { path: 'class', select: 'className studentCount' },
            { path: 'scores.subject', select: 'name code' },
            { path: 'promotedTo', select: 'className' },
            { path: 'recordedBy', select: 'firstName lastName' }
        ]);

        return NextResponse.json(examScore);
    } catch (error: any) {
        console.error('Error publishing exam score:', error);
        return NextResponse.json({ error: 'Failed to publish exam score', details: error.message }, { status: 500 });
    }
}
