import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get a specific quiz attempt
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const attempt = await QuizAttempt.findById(id).populate('quizId', 'title description totalMarks passingMarks timeLimit').populate('userId', 'firstName lastName email').lean();

        if (!attempt) {
            return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
        }

        return NextResponse.json(attempt);
    } catch (error) {
        console.error('Error fetching quiz attempt:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz attempt' }, { status: 500 });
    }
}

// PUT - Update quiz attempt (save progress)
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

        return NextResponse.json({ success: true, savedAt: new Date() });
    } catch (error) {
        console.error('Error updating quiz attempt:', error);
        return NextResponse.json({ error: 'Failed to update quiz attempt' }, { status: 500 });
    }
}
