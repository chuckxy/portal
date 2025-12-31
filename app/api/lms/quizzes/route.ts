import { NextRequest, NextResponse } from 'next/server';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import UserQuizAttempt from '@/models/lms/UserQuizAttempt';
import Subject from '@/models/Subject';
import CourseModule from '@/models/lms/CourseModule';
import Chapter from '@/models/lms/Chapter';
import Lesson from '@/models/lms/Lesson';
import SchoolSite from '@/models/SchoolSite';
import Person from '@/models/Person';
import connectToDatabase from '@/lib/db/mongodb';

// Ensure models are registered for population
const _models = { Quiz, QuizQuestion, UserQuizAttempt, Subject, CourseModule, Chapter, Lesson, SchoolSite, Person };
void _models; // Prevent unused variable warning

// GET - List quizzes with filters
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);
        const subjectId = searchParams.get('subjectId');
        const moduleId = searchParams.get('moduleId');
        const chapterId = searchParams.get('chapterId');
        const lessonId = searchParams.get('lessonId');
        const schoolSiteId = searchParams.get('schoolSiteId');
        const quizType = searchParams.get('quizType');
        const isPublished = searchParams.get('isPublished');

        const query: Record<string, unknown> = { isActive: true };

        if (subjectId) query.subjectId = subjectId;
        if (moduleId) query.moduleId = moduleId;
        if (chapterId) query.chapterId = chapterId;
        if (lessonId) query.lessonId = lessonId;
        if (schoolSiteId) query.schoolSiteId = schoolSiteId;
        if (quizType) query.quizType = quizType;
        if (isPublished !== null && isPublished !== undefined) {
            query.isPublished = isPublished === 'true';
        }

        const quizzes = await Quiz.find(query)
            .populate('subjectId', 'name code')
            .populate('moduleId', 'title')
            .populate('chapterId', 'title')
            .populate('lessonId', 'title')
            .populate('addedBy', 'firstName lastName photoLink')
            .populate('questionCount')
            .populate('attemptCount')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ quizzes }, { status: 200 });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}

// POST - Create a new quiz
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const {
            title,
            description,
            subjectId,
            moduleId,
            chapterId,
            lessonId,
            schoolSiteId,
            addedBy,
            quizType,
            startDate,
            endDate,
            totalMarks,
            passingMarks,
            timeLimit,
            maxAttempts,
            shuffleQuestions,
            shuffleOptions,
            showCorrectAnswers,
            showCorrectAnswersAfter,
            isPublished
        } = body;

        // Validation
        if (!title || !subjectId || !moduleId || !chapterId || !lessonId || !schoolSiteId || !addedBy) {
            return NextResponse.json({ error: 'Title, subject, module, chapter, lesson, school site, and creator are required' }, { status: 400 });
        }

        if (!quizType || !['lesson', 'chapter', 'module', 'course'].includes(quizType)) {
            return NextResponse.json({ error: 'Valid quiz type is required' }, { status: 400 });
        }

        const quiz = await Quiz.create({
            title,
            description,
            subjectId,
            moduleId,
            chapterId,
            lessonId,
            schoolSiteId,
            addedBy,
            quizType,
            startDate,
            endDate,
            totalMarks: totalMarks || 0,
            passingMarks: passingMarks || 0,
            timeLimit,
            maxAttempts: maxAttempts || 1,
            shuffleQuestions: shuffleQuestions || false,
            shuffleOptions: shuffleOptions || false,
            showCorrectAnswers: showCorrectAnswers !== false,
            showCorrectAnswersAfter: showCorrectAnswersAfter || 'after_submission',
            isPublished: isPublished || false,
            publishedAt: isPublished ? new Date() : undefined
        });

        const populatedQuiz = await Quiz.findById(quiz._id).populate('subjectId', 'name code').populate('moduleId', 'title').populate('chapterId', 'title').populate('lessonId', 'title').populate('addedBy', 'firstName lastName photoLink').lean();

        return NextResponse.json({ quiz: populatedQuiz }, { status: 201 });
    } catch (error) {
        console.error('Error creating quiz:', error);
        return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 });
    }
}
