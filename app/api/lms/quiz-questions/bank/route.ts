import { NextRequest, NextResponse } from 'next/server';
import QuizQuestion from '@/models/lms/QuizQuestion';
import Quiz from '@/models/lms/Quiz';
import connectToDatabase from '@/lib/db/mongodb';

/**
 * GET /api/lms/quiz-questions/bank
 * Fetches all questions from published quizzes for the question bank
 * This allows users to select existing questions to add to new quizzes
 */
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const schoolSiteId = searchParams.get('schoolSiteId');
        const subjectId = searchParams.get('subjectId');
        const questionType = searchParams.get('questionType');
        const searchTerm = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '500');
        const skip = parseInt(searchParams.get('skip') || '0');

        // Build quiz filter to get IDs of relevant quizzes
        const quizFilter: Record<string, unknown> = { isActive: true };
        if (schoolSiteId) quizFilter.schoolSiteId = schoolSiteId;
        if (subjectId) quizFilter.subjectId = subjectId;

        // Get quiz IDs
        const quizzes = await Quiz.find(quizFilter).select('_id').lean();
        const quizIds = quizzes.map((q) => q._id);

        // Build question filter
        const questionFilter: Record<string, unknown> = {
            quizId: { $in: quizIds },
            isActive: true
        };

        if (questionType) {
            questionFilter.questionType = questionType;
        }

        if (searchTerm) {
            questionFilter.questionText = { $regex: searchTerm, $options: 'i' };
        }

        // Fetch questions with pagination
        const questions = await QuizQuestion.find(questionFilter).populate('quizId', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

        // Get total count for pagination
        const totalCount = await QuizQuestion.countDocuments(questionFilter);

        // Group questions by type for summary
        const typeSummary = await QuizQuestion.aggregate([{ $match: questionFilter }, { $group: { _id: '$questionType', count: { $sum: 1 } } }]);

        return NextResponse.json({
            questions,
            totalCount,
            typeSummary: typeSummary.reduce((acc, curr) => {
                acc[curr._id] = curr.count;
                return acc;
            }, {} as Record<string, number>),
            pagination: {
                skip,
                limit,
                hasMore: skip + questions.length < totalCount
            }
        });
    } catch (error) {
        console.error('Error fetching question bank:', error);
        return NextResponse.json({ error: 'Failed to fetch question bank' }, { status: 500 });
    }
}
