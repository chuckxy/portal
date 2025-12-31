'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import { useSecureQuiz, SaveStatus } from './SecureQuizContext';

// ============================================================================
// QUIZ HEADER
// ============================================================================

interface QuizHeaderProps {
    onSubmit: () => void;
    onExit?: () => void;
}

export const QuizHeader: React.FC<QuizHeaderProps> = ({ onSubmit, onExit }) => {
    const { state, formatTime, getAnsweredCount } = useSecureQuiz();
    const { config, questions, timeRemaining, violationCount, isSubmitting } = state;

    if (!config) return null;

    const progressPercent = questions.length > 0 ? Math.round((getAnsweredCount() / questions.length) * 100) : 0;

    const isTimeCritical = timeRemaining <= 60;
    const isTimeWarning = timeRemaining <= 300 && timeRemaining > 60;

    return (
        <div className="quiz-header surface-card shadow-2 border-round-lg p-3">
            <div className="flex flex-column lg:flex-row justify-content-between align-items-start lg:align-items-center gap-3">
                {/* Left Section - Quiz Info */}
                <div className="flex align-items-center gap-3">
                    <div className="flex flex-column">
                        <h3 className="m-0 text-900 font-semibold text-lg">{config.title}</h3>
                        <span className="text-500 text-sm">
                            {getAnsweredCount()} of {questions.length} answered
                        </span>
                    </div>
                </div>

                {/* Center Section - Timer */}
                <div className="flex align-items-center gap-4">
                    <QuizTimer timeRemaining={timeRemaining} formatTime={formatTime} isCritical={isTimeCritical} isWarning={isTimeWarning} />

                    <ViolationCounter count={violationCount} max={config.maxViolations} />
                </div>

                {/* Right Section - Actions */}
                <div className="flex align-items-center gap-2">
                    <AutoSaveIndicator status={state.saveStatus} lastSaved={state.lastSavedAt} />

                    <Button label="Submit Quiz" icon="pi pi-send" onClick={onSubmit} className="p-button-success" disabled={isSubmitting} loading={isSubmitting} />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
                <div className="flex justify-content-between align-items-center mb-1">
                    <span className="text-sm text-500">Progress</span>
                    <span className="text-sm font-semibold text-primary">{progressPercent}%</span>
                </div>
                <ProgressBar value={progressPercent} showValue={false} style={{ height: '8px' }} className="border-round" />
            </div>
        </div>
    );
};

// ============================================================================
// QUIZ TIMER
// ============================================================================

interface QuizTimerProps {
    timeRemaining: number;
    formatTime: (seconds: number) => string;
    isCritical: boolean;
    isWarning: boolean;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({ timeRemaining, formatTime, isCritical, isWarning }) => {
    const [pulse, setPulse] = useState(false);

    // Pulse animation for critical time
    useEffect(() => {
        if (isCritical) {
            const interval = setInterval(() => {
                setPulse((prev) => !prev);
            }, 500);
            return () => clearInterval(interval);
        }
        setPulse(false);
    }, [isCritical]);

    const getTimerClass = () => {
        if (isCritical) return 'bg-red-600 text-white';
        if (isWarning) return 'bg-orange-500 text-white';
        return 'bg-primary-100 text-primary-700';
    };

    return (
        <div className={`quiz-timer flex align-items-center gap-2 px-4 py-2 border-round-lg font-mono ${getTimerClass()} ${pulse ? 'opacity-70' : 'opacity-100'}`} style={{ transition: 'opacity 0.3s ease' }}>
            <i className={`pi ${isCritical ? 'pi-exclamation-triangle' : 'pi-clock'} ${isCritical ? 'animate-pulse' : ''}`}></i>
            <span className="text-xl font-bold">{formatTime(timeRemaining)}</span>
            {isCritical && <span className="text-xs ml-1">remaining</span>}
        </div>
    );
};

// ============================================================================
// VIOLATION COUNTER
// ============================================================================

interface ViolationCounterProps {
    count: number;
    max: number;
}

export const ViolationCounter: React.FC<ViolationCounterProps> = ({ count, max }) => {
    const getSeverity = () => {
        if (count === 0) return 'success';
        if (count >= max - 1) return 'danger';
        if (count >= Math.floor(max / 2)) return 'warning';
        return 'info';
    };

    const getBackgroundClass = () => {
        if (count === 0) return 'bg-green-100 text-green-700';
        if (count >= max - 1) return 'bg-red-100 text-red-700';
        if (count >= Math.floor(max / 2)) return 'bg-orange-100 text-orange-700';
        return 'bg-blue-100 text-blue-700';
    };

    return (
        <>
            <Tooltip target=".violation-counter" position="bottom" />
            <div className={`violation-counter flex align-items-center gap-2 px-3 py-2 border-round-lg ${getBackgroundClass()}`} data-pr-tooltip={`${count} of ${max} allowed violations. ${max - count} remaining before auto-submit.`}>
                <i className="pi pi-shield"></i>
                <span className="font-semibold">
                    {count}/{max}
                </span>
                <span className="text-sm hidden md:inline">violations</span>
            </div>
        </>
    );
};

// ============================================================================
// AUTO-SAVE INDICATOR
// ============================================================================

interface AutoSaveIndicatorProps {
    status: SaveStatus;
    lastSaved: Date | null;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({ status, lastSaved }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: 'pi-spin pi-spinner',
                    text: 'Saving...',
                    className: 'text-blue-600'
                };
            case 'saved':
                return {
                    icon: 'pi-check-circle',
                    text: lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Saved',
                    className: 'text-green-600'
                };
            case 'error':
                return {
                    icon: 'pi-exclamation-circle',
                    text: 'Save failed',
                    className: 'text-red-600'
                };
            default:
                return {
                    icon: 'pi-cloud',
                    text: 'Auto-save enabled',
                    className: 'text-500'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`auto-save-indicator flex align-items-center gap-1 text-sm ${config.className}`}>
            <i className={`pi ${config.icon}`}></i>
            <span className="hidden md:inline">{config.text}</span>
        </div>
    );
};

// ============================================================================
// QUESTION NAVIGATOR
// ============================================================================

interface QuestionNavigatorProps {
    currentIndex: number;
    totalQuestions: number;
    answeredQuestions: Set<string>;
    questions: { _id: string; questionNumber: number }[];
    allowBackNavigation: boolean;
    onNavigate: (index: number) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({ currentIndex, totalQuestions, answeredQuestions, questions, allowBackNavigation, onNavigate }) => {
    return (
        <div className="question-navigator surface-card border-round-lg p-3 shadow-1">
            <h4 className="m-0 mb-3 text-700 text-sm font-semibold uppercase">Questions</h4>
            <div className="flex flex-wrap gap-2">
                {questions.map((question, index) => {
                    const isAnswered = answeredQuestions.has(question._id);
                    const isCurrent = index === currentIndex;
                    const isAccessible = allowBackNavigation || index <= currentIndex;

                    return (
                        <button
                            key={question._id}
                            onClick={() => isAccessible && onNavigate(index)}
                            disabled={!isAccessible}
                            className={`
                                w-2rem h-2rem border-round-lg flex align-items-center justify-content-center
                                text-sm font-semibold cursor-pointer transition-all transition-duration-150
                                border-none
                                ${
                                    isCurrent
                                        ? 'bg-primary text-white shadow-2'
                                        : isAnswered
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : isAccessible
                                        ? 'bg-surface-200 text-700 hover:bg-surface-300'
                                        : 'bg-surface-100 text-400 cursor-not-allowed'
                                }
                            `}
                            title={`Question ${index + 1}${isAnswered ? ' (Answered)' : ''}${!isAccessible ? ' (Locked)' : ''}`}
                        >
                            {index + 1}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 pt-3 border-top-1 surface-border">
                <div className="flex align-items-center gap-1 text-xs">
                    <span className="w-1rem h-1rem border-round bg-primary"></span>
                    <span className="text-500">Current</span>
                </div>
                <div className="flex align-items-center gap-1 text-xs">
                    <span className="w-1rem h-1rem border-round bg-green-100"></span>
                    <span className="text-500">Answered</span>
                </div>
                <div className="flex align-items-center gap-1 text-xs">
                    <span className="w-1rem h-1rem border-round bg-surface-200"></span>
                    <span className="text-500">Unanswered</span>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

export default QuizHeader;
