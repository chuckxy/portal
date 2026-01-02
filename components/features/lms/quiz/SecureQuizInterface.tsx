'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { ProgressSpinner } from 'primereact/progressspinner';
import { SecureQuizProvider, useSecureQuiz, QuizConfig, QuizQuestion, QuizAttempt, Violation } from './SecureQuizContext';
import { SecureQuizLayout, FullscreenPrompt, QuizLockedOverlay } from './SecureQuizLayout';
import { QuizHeader, QuestionNavigator } from './QuizHeader';
import { ViolationWarningModal, SubmitConfirmDialog, TimeWarningDialog } from './ViolationWarningModal';
import { DisplayQuestions, QuizQuestionData } from './QuestionTypes';

// ============================================================================
// TYPES
// ============================================================================

interface SecureQuizInterfaceProps {
    quizId: string;
    userId: string;
    onComplete?: (result: { score: number; violations: Violation[] }) => void;
    onExit?: () => void;
}

// ============================================================================
// MAIN COMPONENT WRAPPER
// ============================================================================

export const SecureQuizInterface: React.FC<SecureQuizInterfaceProps> = ({ quizId, userId, onComplete, onExit }) => {
    const [isReady, setIsReady] = useState(false);
    const [config, setConfig] = useState<QuizConfig | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    // ========================================================================
    // LOAD QUIZ DATA
    // ========================================================================

    useEffect(() => {
        const loadQuizData = async () => {
            try {
                // Fetch quiz configuration and questions together
                const configRes = await fetch(`/api/lms/quizzes/${quizId}`);
                if (!configRes.ok) throw new Error('Failed to load quiz');
                const { quiz: quizData, questions: questionsData } = await configRes.json();

                if (!quizData) throw new Error('Quiz not found');

                // Create or resume attempt
                const attemptRes = await fetch(`/api/lms/quiz-attempts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId, userId, action: 'start_or_resume' })
                });

                if (!attemptRes.ok) {
                    const errorData = await attemptRes.json();
                    throw new Error(errorData.error || 'Failed to create quiz attempt');
                }
                const attemptData = await attemptRes.json();

                // Build config
                const quizConfig: QuizConfig = {
                    quizId: quizData._id,
                    title: quizData.title || 'Quiz',
                    description: quizData.description,
                    totalQuestions: questionsData?.length || 0,
                    totalMarks: quizData.totalMarks || questionsData?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0,
                    timeLimit: (quizData.timeLimit || 30) * 60, // Convert to seconds
                    passingScore: quizData.passingMarks,
                    allowBackNavigation: quizData.allowBackNavigation ?? true,
                    maxViolations: quizData.maxViolations || 3,
                    shuffleQuestions: quizData.shuffleQuestions ?? false,
                    shuffleOptions: quizData.shuffleOptions ?? false,
                    showQuestionNumbers: quizData.showQuestionNumbers ?? true,
                    autoSubmitOnTimeout: quizData.autoSubmitOnTimeout ?? true,
                    autoSubmitOnMaxViolations: quizData.autoSubmitOnMaxViolations ?? true,
                    warningThresholds: quizData.warningThresholds || [1, 2]
                };

                // Build attempt state
                const quizAttempt: QuizAttempt = {
                    attemptId: attemptData._id,
                    quizId: quizData._id,
                    userId,
                    startedAt: new Date(attemptData.startedAt || Date.now()),
                    answers: new Map(Object.entries(attemptData.answers || {})),
                    violations: attemptData.violations || [],
                    currentQuestionIndex: attemptData.currentQuestionIndex || 0,
                    timeRemaining: attemptData.timeRemaining || quizConfig.timeLimit,
                    status: attemptData.status || 'in_progress'
                };

                // Process questions - map to expected format
                let processedQuestions = (questionsData || []).map((q: any) => ({
                    _id: q._id,
                    questionNumber: q.questionNumber || q.sortOrder || 1,
                    questionText: q.questionText,
                    questionType: mapQuestionType(q.questionType),
                    questionOptions: (q.questionOptions || q.options || []).map((opt: any, idx: number) => ({
                        id: opt.id || opt._id || `opt_${idx}`,
                        text: opt.text || opt.optionText || '',
                        imageUrl: opt.imageUrl,
                        matchingValue: opt.matchingValue
                    })),
                    correctOptions: q.correctOptions || [],
                    points: q.points || 1,
                    quizId: q.quizId,
                    imageUrl: q.imageUrl
                }));

                // Optionally shuffle questions
                if (quizConfig.shuffleQuestions && !attemptData.questionOrder) {
                    processedQuestions = [...processedQuestions].sort(() => Math.random() - 0.5);
                }

                setConfig(quizConfig);
                setQuestions(processedQuestions);
                setAttempt(quizAttempt);
                setIsReady(true);
            } catch (error) {
                console.error('Error loading quiz:', error);
                setLoadError(error instanceof Error ? error.message : 'Failed to load quiz');
            }
        };

        loadQuizData();
    }, [quizId, userId]);

    // Helper to map question types
    const mapQuestionType = (type: string): QuizQuestion['questionType'] => {
        const typeMap: Record<string, QuizQuestion['questionType']> = {
            singleChoiceRadioButton: 'single_choice_radio',
            singleChoiceDropDown: 'single_choice_dropdown',
            multipleChoice: 'multiple_choice',
            pictureChoice: 'picture_choice',
            blanksFill: 'fill_blanks',
            matching: 'matching',
            matchingText: 'matching_text',
            freeText: 'free_text',
            // Already mapped types
            single_choice_radio: 'single_choice_radio',
            single_choice_dropdown: 'single_choice_dropdown',
            multiple_choice: 'multiple_choice',
            picture_choice: 'picture_choice',
            fill_blanks: 'fill_blanks',
            matching_text: 'matching_text',
            free_text: 'free_text'
        };
        return typeMap[type] || 'single_choice_radio';
    };

    // ========================================================================
    // CALLBACKS
    // ========================================================================

    const handleSaveProgress = useCallback(
        async (answers: Map<string, string[]>, currentIndex: number) => {
            try {
                await fetch(`/api/lms/quiz-attempts/${attempt?.attemptId}/progress`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        answers: Object.fromEntries(answers),
                        currentQuestionIndex: currentIndex,
                        timeRemaining: config?.timeLimit // Will be updated by context
                    })
                });
            } catch (error) {
                console.error('Failed to save progress:', error);
                throw error;
            }
        },
        [attempt?.attemptId, config?.timeLimit]
    );

    const handleSubmitQuiz = useCallback(
        async (answers: Map<string, string[]>, violations: Violation[]) => {
            try {
                const response = await fetch(`/api/lms/quiz-attempts/${attempt?.attemptId}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        answers: Object.fromEntries(answers),
                        violations
                    })
                });

                if (!response.ok) throw new Error('Failed to submit quiz');

                const result = await response.json();
                onComplete?.({ score: result.score, violations });
                return result;
            } catch (error) {
                console.error('Failed to submit quiz:', error);
                throw error;
            }
        },
        [attempt?.attemptId, onComplete]
    );

    const handleViolationRecorded = useCallback(
        async (violation: Violation) => {
            try {
                await fetch(`/api/lms/quiz-attempts/${attempt?.attemptId}/violation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(violation)
                });
            } catch (error) {
                console.error('Failed to record violation:', error);
            }
        },
        [attempt?.attemptId]
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    if (loadError) {
        return (
            <div className="flex flex-column align-items-center justify-content-center min-h-screen p-4">
                <Card className="w-full max-w-30rem text-center">
                    <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-3"></i>
                    <h3 className="text-900 mb-2">Unable to Load Quiz</h3>
                    <p className="text-600 mb-4">{loadError}</p>
                    <Button label="Go Back" icon="pi pi-arrow-left" onClick={onExit} />
                </Card>
            </div>
        );
    }

    if (!isReady || !config || !attempt) {
        return (
            <div className="flex flex-column align-items-center justify-content-center min-h-screen">
                <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                <p className="text-600 mt-3">Loading quiz...</p>
            </div>
        );
    }

    return (
        <SecureQuizProvider userId={userId} onSaveProgress={handleSaveProgress} onSubmitQuiz={handleSubmitQuiz} onViolationRecorded={handleViolationRecorded}>
            <QuizContent config={config} questions={questions} attempt={attempt} onExit={onExit} />
        </SecureQuizProvider>
    );
};

// ============================================================================
// INNER QUIZ CONTENT (Uses context)
// ============================================================================

interface QuizContentProps {
    config: QuizConfig;
    questions: QuizQuestion[];
    attempt: QuizAttempt;
    onExit?: () => void;
}

const QuizContent: React.FC<QuizContentProps> = ({ config, questions, attempt, onExit }) => {
    const { state, initializeQuiz, setAnswer, submitQuiz, enterFullscreen, getUnansweredQuestions } = useSecureQuiz();

    const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showTimeWarning, setShowTimeWarning] = useState(false);
    const [timeWarningShown, setTimeWarningShown] = useState(false);

    // Initialize quiz on mount
    useEffect(() => {
        initializeQuiz(config, questions, attempt);
    }, [config, questions, attempt, initializeQuiz]);

    // Show time warning at 1 minute
    useEffect(() => {
        if (state.timeRemaining <= 60 && state.timeRemaining > 0 && !timeWarningShown && !state.quizCompleted) {
            setShowTimeWarning(true);
            setTimeWarningShown(true);
        }
    }, [state.timeRemaining, timeWarningShown, state.quizCompleted]);

    // ========================================================================
    // HANDLERS
    // ========================================================================

    const handleEnterFullscreen = async () => {
        const success = await enterFullscreen();
        if (success) {
            setShowFullscreenPrompt(false);
        }
    };

    const handleSubmitClick = () => {
        setShowSubmitConfirm(true);
    };

    const handleConfirmSubmit = async () => {
        setShowSubmitConfirm(false);
        await submitQuiz();
    };

    const handleAnswerChange = (questionId: string, answers: string[]) => {
        setAnswer(questionId, answers);
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    // Show loading state
    if (state.isLoading) {
        return (
            <div className="flex flex-column align-items-center justify-content-center min-h-screen">
                <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                <p className="text-600 mt-3">Preparing quiz...</p>
            </div>
        );
    }

    // Show fullscreen prompt
    if (showFullscreenPrompt && !state.quizCompleted) {
        return <FullscreenPrompt onEnterFullscreen={handleEnterFullscreen} quizTitle={config.title} />;
    }

    // Show locked overlay if quiz is completed or locked
    if (state.quizCompleted) {
        return <QuizLockedOverlay reason="submitted" />;
    }

    if (state.isLocked) {
        return <QuizLockedOverlay reason="violations" violationCount={state.violationCount} maxViolations={config.maxViolations} />;
    }

    // Calculate answered questions count
    const answeredCount = Array.from(state.answers.entries()).filter(([_, answers]) => answers.length > 0 && answers.some((a) => a !== '')).length;

    return (
        <SecureQuizLayout className="min-h-screen bg-surface-ground">
            {/* Main Container */}
            <div className="flex flex-column min-h-screen">
                {/* Header */}
                <div className="flex-shrink-0 p-3 surface-card shadow-1">
                    <QuizHeader onSubmit={handleSubmitClick} onExit={onExit} />
                </div>

                {/* Content Area */}
                <div className="flex-grow-1 overflow-auto p-3">
                    <div className="max-w-4xl mx-auto">
                        {/* Quiz Info Header */}
                        <div className="surface-card border-round-lg shadow-1 p-4 mb-4">
                            <div className="flex justify-content-between align-items-center">
                                <div>
                                    <h3 className="text-900 m-0">{config.title}</h3>
                                    {config.description && <p className="text-500 mt-1 mb-0">{config.description}</p>}
                                </div>
                                <div className="flex align-items-center gap-3">
                                    <div className="text-center">
                                        <div className="text-sm text-500">Answered</div>
                                        <div className="text-xl font-bold text-primary">
                                            {answeredCount} / {state.questions.length}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-500">Total Marks</div>
                                        <div className="text-xl font-bold text-900">{config.totalMarks}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Questions - Using DisplayQuestions (one question per screen) */}
                        <div className="surface-card border-round-lg shadow-1 p-4">
                            <DisplayQuestions
                                questions={state.questions as QuizQuestionData[]}
                                currentAnswers={state.answers}
                                onAnswerChange={handleAnswerChange}
                                showAllQuestions={false}
                                allowBackNavigation={config.allowBackNavigation}
                                onSubmit={handleSubmitClick}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <ViolationWarningModal onRequestFullscreen={handleEnterFullscreen} />

            <SubmitConfirmDialog visible={showSubmitConfirm} onHide={() => setShowSubmitConfirm(false)} onConfirm={handleConfirmSubmit} unansweredCount={getUnansweredQuestions().length} isSubmitting={state.isSubmitting} />

            <TimeWarningDialog visible={showTimeWarning} onHide={() => setShowTimeWarning(false)} timeRemaining={state.timeRemaining} />
        </SecureQuizLayout>
    );
};

// ============================================================================
// QUIZ RESULTS COMPONENT
// ============================================================================

interface QuizResultsProps {
    score: number;
    totalMarks: number;
    passingScore?: number;
    violations: Violation[];
    onRetry?: () => void;
    onExit?: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ score, totalMarks, passingScore, violations, onRetry, onExit }) => {
    const percentage = Math.round((score / totalMarks) * 100);
    const passed = passingScore ? percentage >= passingScore : true;

    return (
        <div className="flex align-items-center justify-content-center min-h-screen bg-surface-ground p-4">
            <Card className="w-full max-w-30rem text-center shadow-4">
                {/* Score Circle */}
                <div className={`w-8rem h-8rem border-circle flex align-items-center justify-content-center mx-auto mb-4 ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div>
                        <div className={`text-4xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{percentage}%</div>
                        <div className="text-sm text-500">
                            {score}/{totalMarks}
                        </div>
                    </div>
                </div>

                {/* Result Message */}
                <h2 className={`m-0 mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>{passed ? 'Congratulations!' : 'Keep Practicing'}</h2>
                <p className="text-600 mb-4">{passed ? 'You have successfully passed this quiz.' : `You need ${passingScore}% to pass. Don't give up!`}</p>

                {/* Violations Summary */}
                {violations.length > 0 && (
                    <div className="bg-yellow-50 border-round-lg p-3 mb-4 text-left">
                        <h4 className="text-yellow-800 m-0 mb-2 flex align-items-center gap-2">
                            <i className="pi pi-exclamation-triangle"></i>
                            Integrity Report
                        </h4>
                        <p className="text-yellow-700 text-sm m-0">
                            {violations.length} violation{violations.length !== 1 ? 's' : ''} recorded during this attempt. This information has been logged and may be reviewed by your instructor.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 justify-content-center">
                    {onRetry && <Button label="Try Again" icon="pi pi-refresh" onClick={onRetry} className="p-button-outlined" />}
                    <Button label="Exit" icon="pi pi-sign-out" onClick={onExit} className={passed ? 'p-button-success' : 'p-button-secondary'} />
                </div>
            </Card>
        </div>
    );
};

export default SecureQuizInterface;
