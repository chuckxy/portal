import { NextRequest, NextResponse } from 'next/server';
import QuizAttempt from '@/models/lms/QuizAttempt';
import Quiz from '@/models/lms/Quiz';
import QuizQuestion from '@/models/lms/QuizQuestion';
import connectToDatabase from '@/lib/db/mongodb';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST - Submit quiz attempt
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const body = await request.json();

        const { answers, violations, autoSubmit } = body;

        const attempt = await QuizAttempt.findById(id);
        if (!attempt) {
            return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 });
        }

        if (attempt.status !== 'in_progress') {
            return NextResponse.json({ error: 'Quiz already submitted', alreadySubmitted: true }, { status: 400 });
        }

        // Get quiz and questions for grading
        const quiz = await Quiz.findById(attempt.quizId);
        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        const questions = await QuizQuestion.find({
            quizId: attempt.quizId,
            isActive: true
        }).lean();

        // Update answers if provided
        if (answers) {
            attempt.answers = new Map(Object.entries(answers));
        }

        // Add any final violations
        if (violations && Array.isArray(violations)) {
            attempt.violations.push(...violations);
        }

        // Calculate score
        let totalScore = 0;
        const totalMarks = quiz.totalMarks || questions.reduce((sum, q) => sum + (q.points || 1), 0);

        for (const question of questions) {
            const userAnswers = attempt.answers.get(question._id.toString()) || [];
            const correctOptions = question.correctOptions || [];

            switch (question.questionType) {
                case 'single_choice_radio':
                case 'single_choice_dropdown':
                    // Single correct answer
                    if (userAnswers.length > 0 && correctOptions.includes(userAnswers[0])) {
                        totalScore += question.points || 1;
                    }
                    break;

                case 'multiple_choice':
                    // Partial credit for multiple choice
                    if (correctOptions.length > 0) {
                        const correctCount = userAnswers.filter((a) => correctOptions.includes(a)).length;
                        const wrongCount = userAnswers.filter((a) => !correctOptions.includes(a)).length;
                        const questionScore = Math.max(0, ((correctCount - wrongCount) / correctOptions.length) * (question.points || 1));
                        totalScore += questionScore;
                    }
                    break;

                case 'fill_blanks':
                case 'matching':
                    // Check each answer position
                    let correctMatches = 0;
                    for (let i = 0; i < correctOptions.length; i++) {
                        if (userAnswers[i] && userAnswers[i].toLowerCase().trim() === correctOptions[i].toLowerCase().trim()) {
                            correctMatches++;
                        }
                    }
                    if (correctOptions.length > 0) {
                        totalScore += (correctMatches / correctOptions.length) * (question.points || 1);
                    }
                    break;

                case 'matching_text':
                case 'free_text':
                    // These require manual grading - give 0 for now
                    // Could implement basic text matching or leave for instructor
                    break;

                default:
                    break;
            }
        }

        // Round score
        totalScore = Math.round(totalScore * 100) / 100;
        const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
        const passed = quiz.passingMarks ? totalScore >= quiz.passingMarks : percentage >= 50;

        // Determine submission status
        let status: 'submitted' | 'auto_submitted' | 'timed_out' | 'violation_terminated' = 'submitted';
        if (autoSubmit === 'timeout') {
            status = 'timed_out';
        } else if (autoSubmit === 'violations') {
            status = 'violation_terminated';
        } else if (autoSubmit) {
            status = 'auto_submitted';
        }

        // Update attempt
        attempt.status = status;
        attempt.submittedAt = new Date();
        attempt.score = totalScore;
        attempt.totalMarks = totalMarks;
        attempt.percentage = percentage;
        attempt.passed = passed;
        attempt.timeRemaining = 0;

        await attempt.save();

        return NextResponse.json({
            success: true,
            score: totalScore,
            totalMarks,
            percentage,
            passed,
            status,
            submittedAt: attempt.submittedAt
        });
    } catch (error) {
        console.error('Error submitting quiz:', error);
        return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
    }
}
