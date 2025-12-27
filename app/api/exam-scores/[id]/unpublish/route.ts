import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import ExamScore from '@/models/ExamScore';

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

// PATCH - Unpublish exam score
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        await connectDB();
        const { id } = await params;

        // Parse body, handle empty body
        let body: any = {};
        try {
            const text = await request.text();
            if (text) {
                body = JSON.parse(text);
            }
        } catch (parseError) {
            // Body is empty or invalid, use default empty object
            body = {};
        }

        const examScore = await ExamScore.findById(id);
        if (!examScore) {
            return NextResponse.json({ error: 'Exam score not found' }, { status: 404 });
        }

        if (!examScore.isPublished) {
            return NextResponse.json({ error: 'Exam score is not published' }, { status: 400 });
        }

        // Unpublish
        examScore.isPublished = false;
        examScore.publishedAt = undefined;
        await examScore.save();

        // Add to modification history
        examScore.modificationHistory.push({
            modifiedBy: body.modifiedBy,
            modifiedAt: new Date(),
            changes: {
                action: 'unpublished',
                reason: body.reason || 'No reason provided'
            }
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
        console.error('Error unpublishing exam score:', error);
        return NextResponse.json({ error: 'Failed to unpublish exam score', details: error.message }, { status: 500 });
    }
}
