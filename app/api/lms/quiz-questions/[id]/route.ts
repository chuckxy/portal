import { NextRequest, NextResponse } from 'next/server';
import QuizQuestion from '@/models/lms/QuizQuestion';
import Quiz from '@/models/lms/Quiz';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Fetch a single question
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const question = await QuizQuestion.findById(id).lean();

        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        return NextResponse.json({ question }, { status: 200 });
    } catch (error) {
        console.error('Error fetching question:', error);
        return NextResponse.json({ error: 'Failed to fetch question' }, { status: 500 });
    }
}

// PUT - Update question
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();

        const { questionNumber, questionText, questionType, questionOptions, matchingPairs, correctOptions, correctText, points, isRequired, explanation, imageUrl, audioUrl, sortOrder } = body;

        const existingQuestion = await QuizQuestion.findById(id);
        if (!existingQuestion) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};

        if (questionNumber !== undefined) updateData.questionNumber = questionNumber;
        if (questionText !== undefined) updateData.questionText = questionText;
        if (questionType !== undefined) updateData.questionType = questionType;
        if (questionOptions !== undefined) updateData.questionOptions = questionOptions;
        if (matchingPairs !== undefined) updateData.matchingPairs = matchingPairs;
        if (correctOptions !== undefined) updateData.correctOptions = correctOptions;
        if (correctText !== undefined) updateData.correctText = correctText;
        if (points !== undefined) updateData.points = points;
        if (isRequired !== undefined) updateData.isRequired = isRequired;
        if (explanation !== undefined) updateData.explanation = explanation;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (audioUrl !== undefined) updateData.audioUrl = audioUrl;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

        const question = await QuizQuestion.findByIdAndUpdate(id, updateData, { new: true }).lean();

        // Update quiz total marks if points changed
        if (points !== undefined) {
            const allQuestions = await QuizQuestion.find({ quizId: existingQuestion.quizId, isActive: true });
            const totalMarks = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
            await Quiz.findByIdAndUpdate(existingQuestion.quizId, { totalMarks });
        }

        return NextResponse.json({ question }, { status: 200 });
    } catch (error) {
        console.error('Error updating question:', error);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}

// DELETE - Delete question
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        const question = await QuizQuestion.findById(id);
        if (!question) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const quizId = question.quizId;

        if (hardDelete) {
            await QuizQuestion.findByIdAndDelete(id);
        } else {
            await QuizQuestion.findByIdAndUpdate(id, { isActive: false });
        }

        // Update quiz total marks
        const allQuestions = await QuizQuestion.find({ quizId, isActive: true });
        const totalMarks = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
        await Quiz.findByIdAndUpdate(quizId, { totalMarks });

        return NextResponse.json({ message: 'Question deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting question:', error);
        return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
    }
}
