import { NextRequest, NextResponse } from 'next/server';
import QuizQuestion from '@/models/lms/QuizQuestion';
import Quiz from '@/models/lms/Quiz';
import connectToDatabase from '@/lib/db/mongodb';

// GET - List quiz questions
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const quizId = searchParams.get('quizId');
        const schoolSiteId = searchParams.get('schoolSiteId');

        if (!quizId) {
            return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
        }

        const query: Record<string, unknown> = { quizId, isActive: true };
        if (schoolSiteId) query.schoolSiteId = schoolSiteId;

        const questions = await QuizQuestion.find(query).sort({ sortOrder: 1, questionNumber: 1 }).lean();

        return NextResponse.json({ questions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }
}

// POST - Create a new question
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { quizId, schoolSiteId, questionNumber, questionText, questionType, questionOptions, matchingPairs, correctOptions, correctText, points, isRequired, explanation, imageUrl, audioUrl, sortOrder } = body;

        // Validation
        if (!quizId || !schoolSiteId || !questionText || !questionType) {
            return NextResponse.json({ error: 'Quiz ID, school site, question text, and question type are required' }, { status: 400 });
        }

        // Verify quiz exists
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Get next question number if not provided
        let qNumber = questionNumber;
        if (!qNumber) {
            const lastQuestion = await QuizQuestion.findOne({ quizId }).sort({ questionNumber: -1 }).select('questionNumber');
            qNumber = (lastQuestion?.questionNumber || 0) + 1;
        }

        const question = await QuizQuestion.create({
            quizId,
            schoolSiteId,
            questionNumber: qNumber,
            questionText,
            questionType,
            questionOptions: questionOptions || [],
            matchingPairs: matchingPairs || [],
            correctOptions: correctOptions || [],
            correctText,
            points: points || 1,
            isRequired: isRequired !== false,
            explanation,
            imageUrl,
            audioUrl,
            sortOrder: sortOrder || qNumber
        });

        // Update quiz total marks
        const allQuestions = await QuizQuestion.find({ quizId, isActive: true });
        const totalMarks = allQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
        await Quiz.findByIdAndUpdate(quizId, { totalMarks });

        return NextResponse.json({ question }, { status: 201 });
    } catch (error) {
        console.error('Error creating question:', error);
        return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
    }
}
