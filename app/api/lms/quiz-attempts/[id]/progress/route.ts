import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT - Update progress (answers, current question index)
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        const { answers, currentQuestionIndex, timeRemaining } = body;

        const attempt = await QuizAttempt.findById(id);
        if (!attempt) {
            return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
        }

        if (attempt.status !== 'in_progress') {
            return NextResponse.json({ error: 'Cannot update completed attempt' }, { status: 400 });
        }

        // Update fields
        if (answers !== undefined) {
            attempt.answers = new Map(Object.entries(answers));
        }
        if (currentQuestionIndex !== undefined) {
            attempt.currentQuestionIndex = currentQuestionIndex;
        }
        if (timeRemaining !== undefined) {
            attempt.timeRemaining = timeRemaining;
        }

        await attempt.save();

        return NextResponse.json({
            success: true,
            savedAt: new Date()
        });
    } catch (error) {
        console.error('Error saving progress:', error);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
}
