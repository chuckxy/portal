'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { DataView } from 'primereact/dataview';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { useAuth } from '@/context/AuthContext';
import { SecureQuizInterface, QuizResults, Violation } from '@/components/quiz';

// Types
interface Quiz {
    _id: string;
    title: string;
    description?: string;
    totalMarks: number;
    passingMarks: number;
    timeLimit?: number;
    maxAttempts: number;
    isPublished: boolean;
    subjectId?: { name: string; code: string };
    lessonId?: { title: string };
    questionCount?: number;
}

// Loading component
const LoadingState = () => (
    <div className="surface-ground min-h-screen flex align-items-center justify-content-center">
        <div className="text-center">
            <ProgressSpinner style={{ width: '50px', height: '50px' }} />
            <p className="text-600 mt-3">Preparing secure quiz environment...</p>
        </div>
    </div>
);

// Error state component
const ErrorState = ({ message, onBack }: { message: string; onBack: () => void }) => (
    <div className="surface-ground min-h-screen flex align-items-center justify-content-center p-4">
        <Card className="w-full max-w-30rem text-center shadow-4">
            <i className="pi pi-exclamation-triangle text-5xl text-red-500 mb-3"></i>
            <h3 className="text-900 mb-2">Unable to Load Quiz</h3>
            <p className="text-600 mb-4">{message}</p>
            <Button label="Go Back" icon="pi pi-arrow-left" onClick={onBack} />
        </Card>
    </div>
);

// Quiz Selection Component
const QuizSelection = ({ onSelectQuiz }: { onSelectQuiz: (quizId: string) => void }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await fetch('/api/lms/quizzes?isPublished=true&limit=50');
                if (response.ok) {
                    const data = await response.json();
                    setQuizzes(Array.isArray(data) ? data : data.quizzes || []);
                }
            } catch (error) {
                console.error('Failed to load quizzes:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchQuizzes();
    }, []);

    const quizTemplate = (quiz: Quiz) => (
        <div className="col-12 md:col-6 lg:col-4 p-2">
            <Card className="h-full shadow-2 hover:shadow-4 transition-all transition-duration-200">
                <div className="flex flex-column h-full">
                    {/* Header */}
                    <div className="flex justify-content-between align-items-start mb-3">
                        <div className="flex-1">
                            <h4 className="text-900 font-semibold m-0 mb-1 line-clamp-2">{quiz.title}</h4>
                            {quiz.subjectId && <Tag value={quiz.subjectId.name} severity="info" className="text-xs" />}
                        </div>
                        <Badge value={`${quiz.timeLimit || 30} min`} severity="warning" />
                    </div>

                    {/* Description */}
                    {quiz.description && <p className="text-600 text-sm line-clamp-2 mb-3">{quiz.description}</p>}

                    {/* Stats */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        <div className="flex align-items-center gap-1 text-sm text-500">
                            <i className="pi pi-question-circle"></i>
                            <span>{quiz.questionCount || '?'} questions</span>
                        </div>
                        <div className="flex align-items-center gap-1 text-sm text-500">
                            <i className="pi pi-star"></i>
                            <span>{quiz.totalMarks} marks</span>
                        </div>
                        <div className="flex align-items-center gap-1 text-sm text-500">
                            <i className="pi pi-replay"></i>
                            <span>
                                {quiz.maxAttempts} attempt{quiz.maxAttempts > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Pass Mark */}
                    <div className="text-sm text-500 mb-3">
                        Pass:{' '}
                        <span className="font-semibold text-green-600">
                            {quiz.passingMarks}/{quiz.totalMarks}
                        </span>
                    </div>

                    {/* Action */}
                    <div className="mt-auto">
                        <Button label="Take Quiz" icon="pi pi-play" className="w-full p-button-success" onClick={() => onSelectQuiz(quiz._id)} />
                    </div>
                </div>
            </Card>
        </div>
    );

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="surface-ground min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-900 font-bold m-0 mb-2">
                        <i className="pi pi-question-circle mr-2 text-primary"></i>
                        Available Quizzes
                    </h2>
                    <p className="text-600 m-0">Select a quiz to begin your assessment</p>
                </div>

                {/* Quiz Grid */}
                {quizzes.length > 0 ? (
                    <DataView value={quizzes} itemTemplate={quizTemplate} layout="grid" paginator rows={9} />
                ) : (
                    <Card className="text-center p-6">
                        <i className="pi pi-inbox text-5xl text-300 mb-3"></i>
                        <h4 className="text-600 mb-2">No Quizzes Available</h4>
                        <p className="text-500">There are no published quizzes at this time.</p>
                    </Card>
                )}
            </div>
        </div>
    );
};

// Main quiz content component
const QuizContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();

    const [quizId, setQuizId] = useState<string | null>(searchParams.get('quizId'));
    const returnUrl = searchParams.get('returnUrl') || '/lms/quizzes';

    const [showResults, setShowResults] = React.useState(false);
    const [results, setResults] = React.useState<{
        score: number;
        totalMarks: number;
        passingScore?: number;
        violations: Violation[];
    } | null>(null);

    // Handle quiz selection
    const handleSelectQuiz = (selectedQuizId: string) => {
        setQuizId(selectedQuizId);
        // Update URL without navigation
        window.history.pushState({}, '', `/lms/quizzes/take?quizId=${selectedQuizId}`);
    };

    // Handle quiz completion
    const handleComplete = (result: { score: number; violations: Violation[] }) => {
        setResults({
            score: result.score,
            totalMarks: 100,
            violations: result.violations
        });
        setShowResults(true);
    };

    // Handle exit
    const handleExit = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
        }
        router.push(returnUrl);
    };

    // Handle retry
    const handleRetry = () => {
        setShowResults(false);
        setResults(null);
        window.location.reload();
    };

    // Auth loading
    if (authLoading) {
        return <LoadingState />;
    }

    // Not authenticated
    if (!user) {
        return <ErrorState message="Please log in to take this quiz." onBack={() => router.push('/login')} />;
    }

    // No quiz ID - show selection
    if (!quizId) {
        return <QuizSelection onSelectQuiz={handleSelectQuiz} />;
    }

    // Show results
    if (showResults && results) {
        return <QuizResults score={results.score} totalMarks={results.totalMarks} passingScore={results.passingScore} violations={results.violations} onRetry={handleRetry} onExit={handleExit} />;
    }

    // Render secure quiz interface
    return <SecureQuizInterface quizId={quizId} userId={user.id} onComplete={handleComplete} onExit={handleExit} />;
};

// Page component with Suspense boundary
const TakeQuizPage = () => {
    return (
        <Suspense fallback={<LoadingState />}>
            <QuizContent />
        </Suspense>
    );
};

export default TakeQuizPage;
