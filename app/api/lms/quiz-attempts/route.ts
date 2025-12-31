import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import connectToDatabase from '@/lib/db/mongodb';

// POST - Create or resume a quiz attempt
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { quizId, userId, schoolSiteId, action } = body;

        if (!quizId || !userId) {
            return NextResponse.json({ error: 'quizId and userId are required' }, { status: 400 });
        }

        // Get quiz details
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Check if quiz is available
        if (!quiz.isPublished) {
            return NextResponse.json({ error: 'Quiz is not published yet' }, { status: 403 });
        }
        if (quiz.isActive === false) {
            return NextResponse.json({ error: 'Quiz has been deactivated' }, { status: 403 });
        }

        // Check date restrictions
        const now = new Date();
        if (quiz.startDate && now < quiz.startDate) {
            return NextResponse.json({ error: 'Quiz has not started yet' }, { status: 403 });
        }
        if (quiz.endDate && now > quiz.endDate) {
            return NextResponse.json({ error: 'Quiz deadline has passed' }, { status: 403 });
        }

        // Check for existing in-progress attempt
        const existingAttempt = await QuizAttempt.findOne({
            quizId,
            userId,
            status: 'in_progress',
            isActive: true
        });

        if (existingAttempt) {
            // Resume existing attempt - update time remaining based on elapsed time
            const elapsedSeconds = Math.floor((now.getTime() - existingAttempt.startedAt.getTime()) / 1000);
            const originalTimeLimit = (quiz.timeLimit || 30) * 60;
            const timeRemaining = Math.max(0, originalTimeLimit - elapsedSeconds);

            if (timeRemaining <= 0) {
                // Auto-submit due to timeout
                existingAttempt.status = 'timed_out';
                existingAttempt.submittedAt = now;
                await existingAttempt.save();
                return NextResponse.json({ error: 'Quiz time has expired', expired: true }, { status: 403 });
            }

            // Return existing attempt with updated time
            return NextResponse.json({
                ...existingAttempt.toObject(),
                timeRemaining,
                answers: Object.fromEntries(existingAttempt.answers || new Map()),
                isResumed: true
            });
        }

        // Check max attempts
        const attemptCount = await QuizAttempt.countDocuments({
            quizId,
            userId,
            status: { $in: ['submitted', 'auto_submitted', 'timed_out', 'violation_terminated'] },
            isActive: true
        });

        if (attemptCount >= quiz.maxAttempts) {
            return NextResponse.json({ error: `Maximum attempts (${quiz.maxAttempts}) reached` }, { status: 403 });
        }

        // Get the highest attempt number to avoid duplicate key errors
        const lastAttempt = await QuizAttempt.findOne({ quizId, userId }).sort({ attemptNumber: -1 }).select('attemptNumber').lean();
        const nextAttemptNumber = (lastAttempt?.attemptNumber || 0) + 1;

        // Create new attempt
        const timeLimit = (quiz.timeLimit || 30) * 60; // Convert to seconds

        // Get questions and optionally shuffle
        let questions = await QuizQuestion.find({ quizId, isActive: true }).sort({ sortOrder: 1, questionNumber: 1 }).select('_id').lean();

        let questionOrder: string[] | undefined;
        if (quiz.shuffleQuestions) {
            const shuffled = [...questions].sort(() => Math.random() - 0.5);
            questionOrder = shuffled.map((q) => q._id.toString());
        }

        const newAttempt = await QuizAttempt.create({
            quizId,
            userId,
            schoolSiteId: schoolSiteId || quiz.schoolSiteId,
            attemptNumber: nextAttemptNumber,
            status: 'in_progress',
            startedAt: now,
            timeRemaining: timeLimit,
            questionOrder,
            answers: new Map(),
            violations: [],
            currentQuestionIndex: 0,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
        });

        return NextResponse.json(
            {
                ...newAttempt.toObject(),
                answers: {},
                isNew: true
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating quiz attempt:', error);
        return NextResponse.json({ error: 'Failed to create quiz attempt' }, { status: 500 });
    }
}

// GET - List quiz attempts (for admin/instructor)
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const searchParams = request.nextUrl.searchParams;
        const quizId = searchParams.get('quizId');
        const userId = searchParams.get('userId');
        const status = searchParams.get('status');
        const gradingStatus = searchParams.get('gradingStatus');
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { isActive: true };

        if (quizId) filter.quizId = quizId;
        if (userId) filter.userId = userId;
        if (status) filter.status = status;
        if (gradingStatus) filter.gradingStatus = gradingStatus;

        // Date range filter
        if (startDate || endDate) {
            filter.startedAt = {};
            if (startDate) (filter.startedAt as Record<string, Date>).$gte = new Date(startDate);
            if (endDate) (filter.startedAt as Record<string, Date>).$lte = new Date(endDate);
        }

        // Get total count
        let totalCount = await QuizAttempt.countDocuments(filter);

        // Build aggregation for search
        let attempts;
        if (search) {
            // Use aggregation for search across populated fields
            const pipeline: any[] = [
                { $match: filter },
                {
                    $lookup: {
                        from: 'people',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'student'
                    }
                },
                { $unwind: '$student' },
                {
                    $lookup: {
                        from: 'quizzes',
                        localField: 'quizId',
                        foreignField: '_id',
                        as: 'quiz'
                    }
                },
                { $unwind: '$quiz' },
                {
                    $match: {
                        $or: [
                            { 'student.firstName': { $regex: search, $options: 'i' } },
                            { 'student.lastName': { $regex: search, $options: 'i' } },
                            { 'student.email': { $regex: search, $options: 'i' } },
                            { 'quiz.title': { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'subjects',
                        localField: 'quiz.subjectId',
                        foreignField: '_id',
                        as: 'subject'
                    }
                },
                { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
                { $sort: { startedAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        attemptNumber: 1,
                        status: 1,
                        gradingStatus: 1,
                        score: 1,
                        totalMarks: 1,
                        percentage: 1,
                        passed: 1,
                        startedAt: 1,
                        submittedAt: 1,
                        timeSpent: 1,
                        violationCount: { $size: { $ifNull: ['$violations', []] } },
                        student: {
                            _id: '$student._id',
                            firstName: '$student.firstName',
                            lastName: '$student.lastName',
                            email: '$student.email'
                        },
                        quiz: {
                            _id: '$quiz._id',
                            title: '$quiz.title',
                            quizType: '$quiz.quizType'
                        },
                        subject: {
                            _id: '$subject._id',
                            name: '$subject.name',
                            code: '$subject.code'
                        }
                    }
                }
            ];

            // Get count after search filter
            const countPipeline = [...pipeline.slice(0, 5), { $count: 'total' }];
            const countResult = await QuizAttempt.aggregate(countPipeline);
            totalCount = countResult[0]?.total || 0;

            attempts = await QuizAttempt.aggregate(pipeline);
        } else {
            // Simple query without search
            const rawAttempts = await QuizAttempt.find(filter).populate('quizId', 'title quizType subjectId totalMarks passingMarks').populate('userId', 'firstName lastName email photoLink').sort({ startedAt: -1 }).skip(skip).limit(limit).lean();

            attempts = rawAttempts.map((attempt: any) => ({
                _id: attempt._id,
                attemptNumber: attempt.attemptNumber,
                status: attempt.status,
                gradingStatus: attempt.gradingStatus || 'pending',
                score: attempt.score || 0,
                totalMarks: attempt.totalMarks || attempt.quizId?.totalMarks || 0,
                percentage: attempt.percentage || 0,
                passed: attempt.passed || false,
                startedAt: attempt.startedAt,
                submittedAt: attempt.submittedAt,
                timeSpent: attempt.timeSpent || 0,
                violationCount: attempt.violations?.length || 0,
                student: {
                    _id: attempt.userId?._id,
                    firstName: attempt.userId?.firstName,
                    lastName: attempt.userId?.lastName,
                    email: attempt.userId?.email
                },
                quiz: {
                    _id: attempt.quizId?._id,
                    title: attempt.quizId?.title,
                    quizType: attempt.quizId?.quizType
                }
            }));
        }

        return NextResponse.json({
            success: true,
            data: attempts,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching quiz attempts:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch quiz attempts' }, { status: 500 });
    }
}
