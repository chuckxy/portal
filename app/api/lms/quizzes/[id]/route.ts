import { NextRequest, NextResponse } from 'next/server';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Fetch a single quiz with questions
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const quiz = await Quiz.findById(id)
            .populate('subjectId', 'name code')
            .populate('moduleId', 'title')
            .populate('chapterId', 'title')
            .populate('lessonId', 'title')
            .populate('addedBy', 'firstName lastName photoLink')
            .populate('questionCount')
            .populate('attemptCount')
            .lean();

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Also fetch questions
        const questions = await QuizQuestion.find({ quizId: id, isActive: true }).sort({ sortOrder: 1, questionNumber: 1 }).lean();

        return NextResponse.json({ quiz, questions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
    }
}

// PUT - Update quiz
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();

        const { title, description, quizType, startDate, endDate, totalMarks, passingMarks, timeLimit, maxAttempts, shuffleQuestions, shuffleOptions, showCorrectAnswers, showCorrectAnswersAfter, isPublished } = body;

        const existingQuiz = await Quiz.findById(id);
        if (!existingQuiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (quizType !== undefined) updateData.quizType = quizType;
        if (startDate !== undefined) updateData.startDate = startDate;
        if (endDate !== undefined) updateData.endDate = endDate;
        if (totalMarks !== undefined) updateData.totalMarks = totalMarks;
        if (passingMarks !== undefined) updateData.passingMarks = passingMarks;
        if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
        if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
        if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
        if (shuffleOptions !== undefined) updateData.shuffleOptions = shuffleOptions;
        if (showCorrectAnswers !== undefined) updateData.showCorrectAnswers = showCorrectAnswers;
        if (showCorrectAnswersAfter !== undefined) updateData.showCorrectAnswersAfter = showCorrectAnswersAfter;
        if (isPublished !== undefined) {
            updateData.isPublished = isPublished;
            if (isPublished && !existingQuiz.publishedAt) {
                updateData.publishedAt = new Date();
            }
        }

        const quiz = await Quiz.findByIdAndUpdate(id, updateData, { new: true })
            .populate('subjectId', 'name code')
            .populate('moduleId', 'title')
            .populate('chapterId', 'title')
            .populate('lessonId', 'title')
            .populate('addedBy', 'firstName lastName photoLink')
            .lean();

        return NextResponse.json({ quiz }, { status: 200 });
    } catch (error) {
        console.error('Error updating quiz:', error);
        return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
    }
}

// DELETE - Soft delete quiz
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        const quiz = await Quiz.findById(id);
        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        if (hardDelete) {
            // Also delete all questions
            await QuizQuestion.deleteMany({ quizId: id });
            await Quiz.findByIdAndDelete(id);
        } else {
            await Quiz.findByIdAndUpdate(id, { isActive: false });
            // Soft delete questions too
            await QuizQuestion.updateMany({ quizId: id }, { isActive: false });
        }

        return NextResponse.json({ message: 'Quiz deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
    }
}
