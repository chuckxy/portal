import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import connectToDatabase from '@/lib/db/mongodb';
import mongoose from 'mongoose';

// GET - Fetch detailed attempt data for review
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();

        const { id: attemptId } = await params;
        const searchParams = request.nextUrl.searchParams;
        const role = searchParams.get('role') || 'student';
        const userId = searchParams.get('userId');

        if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
            return NextResponse.json({ error: 'Valid attemptId is required' }, { status: 400 });
        }

        // Fetch attempt with populated references
        const attempt = await QuizAttempt.findById(attemptId)
            .populate('userId', 'firstName lastName email photoLink')
            .populate('gradedBy', 'firstName lastName email photoLink')
            .populate({
                path: 'quizId',
                select: 'title description quizType totalMarks passingMarks timeLimit maxAttempts showCorrectAnswers showCorrectAnswersAfter subjectId',
                populate: {
                    path: 'subjectId',
                    select: 'name code'
                }
            })
            .lean();

        if (!attempt) {
            return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
        }

        // Role-based access check
        const isOwnAttempt = userId && attempt.userId._id.toString() === userId;
        if (role === 'student' && !isOwnAttempt) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch questions for this quiz
        const questions = await QuizQuestion.find({
            quizId: attempt.quizId._id,
            isActive: true
        })
            .sort({ sortOrder: 1, questionNumber: 1 })
            .lean();

        // Build question answer details
        const quiz = attempt.quizId as any;
        const showCorrectAnswers = role !== 'student' || (quiz.showCorrectAnswers && quiz.showCorrectAnswersAfter === 'after_submission');

        const questionDetails = questions.map((q: any) => {
            const studentAnswer = attempt.answers?.get?.(q._id.toString()) || attempt.answers?.[q._id.toString()] || [];

            // Calculate if answer is correct (basic logic - can be expanded)
            let isCorrect: boolean | 'partial' = false;
            let marksAwarded = 0;

            if (q.questionType === 'free_text' || q.questionType === 'matching_text') {
                // Subjective - needs manual grading
                marksAwarded = 0; // Default, can be overridden
                isCorrect = false;
            } else if (q.questionType === 'single_choice_radio' || q.questionType === 'single_choice_dropdown') {
                const correctOption = q.questionOptions?.find((opt: any) => opt.isCorrect);
                if (correctOption && studentAnswer.includes(correctOption.id)) {
                    isCorrect = true;
                    marksAwarded = q.points;
                }
            } else if (q.questionType === 'multiple_choice') {
                const correctOptions = q.questionOptions?.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id) || [];
                const studentSet = new Set(studentAnswer);
                const correctSet = new Set(correctOptions);

                if (correctOptions.length === studentAnswer.length && correctOptions.every((id: string) => studentSet.has(id))) {
                    isCorrect = true;
                    marksAwarded = q.points;
                } else if (studentAnswer.some((id: string) => correctSet.has(id))) {
                    isCorrect = 'partial';
                    const correctCount = studentAnswer.filter((id: string) => correctSet.has(id)).length;
                    const incorrectCount = studentAnswer.filter((id: string) => !correctSet.has(id)).length;
                    marksAwarded = Math.max(0, (correctCount / correctOptions.length) * q.points - incorrectCount * 0.25 * q.points);
                }
            } else if (q.questionType === 'fill_blanks') {
                if (q.correctText && studentAnswer[0]?.toLowerCase().trim() === q.correctText.toLowerCase().trim()) {
                    isCorrect = true;
                    marksAwarded = q.points;
                }
            }

            return {
                questionId: q._id.toString(),
                questionNumber: q.questionNumber,
                questionText: q.questionText,
                questionType: q.questionType,
                questionOptions: q.questionOptions || [],
                matchingPairs: q.matchingPairs || [],
                imageUrl: q.imageUrl,
                points: q.points,
                studentAnswer: Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer],
                correctOptions: showCorrectAnswers ? q.correctOptions || q.questionOptions?.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id) : undefined,
                correctText: showCorrectAnswers ? q.correctText : undefined,
                explanation: showCorrectAnswers ? q.explanation : undefined,
                marksAwarded,
                isCorrect,
                autoGraded: !['free_text', 'matching_text'].includes(q.questionType)
            };
        });

        // Calculate totals
        const totalScore = questionDetails.reduce((sum: number, q: any) => sum + q.marksAwarded, 0);
        const totalMarks = quiz.totalMarks || questions.reduce((sum: number, q: any) => sum + q.points, 0);

        // Calculate time spent
        const startTime = new Date(attempt.startedAt).getTime();
        const endTime = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : Date.now();
        const timeSpent = Math.floor((endTime - startTime) / 1000);
        const timeAllocated = (quiz.timeLimit || 30) * 60;

        // Build response based on role
        const responseData: any = {
            _id: attempt._id.toString(),
            attemptNumber: attempt.attemptNumber,
            status: attempt.status,
            gradingStatus: attempt.gradedAt ? 'manually_graded' : questionDetails.some((q: any) => !q.autoGraded) ? 'pending' : 'auto_graded',

            quiz: {
                _id: quiz._id.toString(),
                title: quiz.title,
                description: quiz.description,
                quizType: quiz.quizType,
                totalMarks: totalMarks,
                passingMarks: quiz.passingMarks,
                timeLimit: quiz.timeLimit,
                maxAttempts: quiz.maxAttempts,
                showCorrectAnswers: quiz.showCorrectAnswers,
                showCorrectAnswersAfter: quiz.showCorrectAnswersAfter
            },

            student: {
                _id: attempt.userId._id.toString(),
                firstName: (attempt.userId as any).firstName,
                lastName: (attempt.userId as any).lastName,
                email: role !== 'student' ? (attempt.userId as any).email : undefined,
                photoLink: (attempt.userId as any).photoLink
            },

            subject: quiz.subjectId
                ? {
                      _id: quiz.subjectId._id?.toString(),
                      name: quiz.subjectId.name,
                      code: quiz.subjectId.code
                  }
                : undefined,

            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            timeAllocated,
            timeSpent,
            timeRemaining: attempt.timeRemaining,

            score: attempt.score ?? totalScore,
            totalMarks,
            percentage: attempt.percentage ?? Math.round((totalScore / totalMarks) * 100),
            passed: attempt.passed ?? totalScore >= quiz.passingMarks,
            passingMarks: quiz.passingMarks,

            gradedAt: attempt.gradedAt,
            gradedBy: attempt.gradedBy,
            overallFeedback: attempt.feedback,

            questions: questionDetails,

            // Audit trail placeholder - would need separate collection
            auditTrail: [],

            createdAt: attempt.createdAt,
            updatedAt: attempt.updatedAt
        };

        // Add integrity data only for instructors/admins
        if (role !== 'student') {
            responseData.violations = attempt.violations || [];
            responseData.ipAddress = attempt.ipAddress;
            responseData.userAgent = attempt.userAgent;
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error fetching attempt review data:', error);
        return NextResponse.json({ error: 'Failed to fetch attempt data' }, { status: 500 });
    }
}

// PATCH - Update grades/feedback
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectToDatabase();

        const { id: attemptId } = await params;
        const body = await request.json();
        const { action, questionId, newScore, feedback, justification, gradedBy } = body;

        if (!attemptId || !mongoose.Types.ObjectId.isValid(attemptId)) {
            return NextResponse.json({ error: 'Valid attemptId is required' }, { status: 400 });
        }

        const attempt = await QuizAttempt.findById(attemptId);
        if (!attempt) {
            return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
        }

        switch (action) {
            case 'update_score':
                if (typeof newScore !== 'number' || newScore < 0) {
                    return NextResponse.json({ error: 'Valid score is required' }, { status: 400 });
                }
                if (!justification || justification.trim().length < 10) {
                    return NextResponse.json({ error: 'Justification (min 10 chars) is required for score changes' }, { status: 400 });
                }

                attempt.score = newScore;
                attempt.gradedAt = new Date();
                attempt.gradedBy = gradedBy;

                // Recalculate percentage and pass status
                const quiz = await Quiz.findById(attempt.quizId).select('totalMarks passingMarks').lean();
                if (quiz) {
                    attempt.totalMarks = quiz.totalMarks;
                    attempt.percentage = Math.round((newScore / quiz.totalMarks) * 100);
                    attempt.passed = newScore >= quiz.passingMarks;
                }
                break;

            case 'update_feedback':
                if (!feedback) {
                    return NextResponse.json({ error: 'Feedback is required' }, { status: 400 });
                }
                attempt.feedback = feedback;
                attempt.gradedAt = new Date();
                attempt.gradedBy = gradedBy;
                break;

            case 'finalize_grading':
                attempt.gradedAt = new Date();
                attempt.gradedBy = gradedBy;
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        await attempt.save();

        return NextResponse.json({
            success: true,
            score: attempt.score,
            percentage: attempt.percentage,
            passed: attempt.passed,
            feedback: attempt.feedback,
            gradedAt: attempt.gradedAt
        });
    } catch (error) {
        console.error('Error updating attempt:', error);
        return NextResponse.json({ error: 'Failed to update attempt' }, { status: 500 });
    }
}
