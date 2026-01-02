'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ViolationType = 'fullscreen_exit' | 'tab_switch' | 'focus_lost' | 'visibility_hidden' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'dev_tools' | 'screenshot_attempt';

export interface Violation {
    id: string;
    type: ViolationType;
    timestamp: Date;
    details?: string;
}

export interface QuizQuestion {
    _id: string;
    questionNumber: number;
    questionText: string;
    questionType: 'single_choice_radio' | 'single_choice_dropdown' | 'multiple_choice' | 'fill_blanks' | 'matching' | 'matching_text' | 'free_text' | 'picture_choice';
    questionOptions: { id: string; text: string; imageUrl?: string; isCorrect?: boolean; matchingValue?: string }[];
    correctOptions: string[];
    points: number;
    quizId: string;
    imageUrl?: string;
}

export interface QuizConfig {
    quizId: string;
    title: string;
    description?: string;
    totalQuestions: number;
    totalMarks: number;
    timeLimit: number; // in seconds
    passingScore?: number;
    allowBackNavigation: boolean;
    maxViolations: number;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    showQuestionNumbers: boolean;
    autoSubmitOnTimeout: boolean;
    autoSubmitOnMaxViolations: boolean;
    warningThresholds: number[]; // e.g., [1, 2] warns at 1st and 2nd violation
}

export interface QuizAttempt {
    attemptId: string;
    quizId: string;
    userId: string;
    startedAt: Date;
    answers: Map<string, string[]>;
    violations: Violation[];
    currentQuestionIndex: number;
    timeRemaining: number;
    status: 'in_progress' | 'submitted' | 'auto_submitted' | 'timed_out' | 'violation_terminated';
    score?: number;
    submittedAt?: Date;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SecureQuizState {
    // Quiz Configuration
    config: QuizConfig | null;
    questions: QuizQuestion[];

    // Attempt State
    attempt: QuizAttempt | null;
    currentQuestionIndex: number;
    answers: Map<string, string[]>;

    // Security State
    isFullscreen: boolean;
    violations: Violation[];
    violationCount: number;
    isLocked: boolean;
    showViolationWarning: boolean;
    currentViolation: Violation | null;

    // Time State
    timeRemaining: number;
    serverTimeOffset: number;

    // UI State
    isLoading: boolean;
    isSubmitting: boolean;
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
    showSubmitConfirm: boolean;
    showTimeWarning: boolean;
    quizCompleted: boolean;
    finalScore: number | null;

    // Error State
    error: string | null;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

type SecureQuizAction =
    | { type: 'INIT_QUIZ'; payload: { config: QuizConfig; questions: QuizQuestion[]; attempt: QuizAttempt } }
    | { type: 'SET_CURRENT_QUESTION'; payload: number }
    | { type: 'SET_ANSWER'; payload: { questionId: string; answers: string[] } }
    | { type: 'ADD_VIOLATION'; payload: Violation }
    | { type: 'DISMISS_VIOLATION_WARNING' }
    | { type: 'SET_FULLSCREEN'; payload: boolean }
    | { type: 'SET_LOCKED'; payload: boolean }
    | { type: 'UPDATE_TIME'; payload: number }
    | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
    | { type: 'SET_LAST_SAVED'; payload: Date }
    | { type: 'SHOW_SUBMIT_CONFIRM'; payload: boolean }
    | { type: 'SHOW_TIME_WARNING'; payload: boolean }
    | { type: 'SET_SUBMITTING'; payload: boolean }
    | { type: 'QUIZ_COMPLETED'; payload: { score: number; status: QuizAttempt['status'] } }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'SET_LOADING'; payload: boolean };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: SecureQuizState = {
    config: null,
    questions: [],
    attempt: null,
    currentQuestionIndex: 0,
    answers: new Map(),
    isFullscreen: false,
    violations: [],
    violationCount: 0,
    isLocked: false,
    showViolationWarning: false,
    currentViolation: null,
    timeRemaining: 0,
    serverTimeOffset: 0,
    isLoading: true,
    isSubmitting: false,
    saveStatus: 'idle',
    lastSavedAt: null,
    showSubmitConfirm: false,
    showTimeWarning: false,
    quizCompleted: false,
    finalScore: null,
    error: null
};

// ============================================================================
// REDUCER
// ============================================================================

function secureQuizReducer(state: SecureQuizState, action: SecureQuizAction): SecureQuizState {
    switch (action.type) {
        case 'INIT_QUIZ':
            return {
                ...state,
                config: action.payload.config,
                questions: action.payload.questions,
                attempt: action.payload.attempt,
                answers: action.payload.attempt.answers,
                violations: action.payload.attempt.violations,
                violationCount: action.payload.attempt.violations.length,
                currentQuestionIndex: action.payload.attempt.currentQuestionIndex,
                timeRemaining: action.payload.attempt.timeRemaining,
                isLoading: false,
                error: null
            };

        case 'SET_CURRENT_QUESTION':
            return {
                ...state,
                currentQuestionIndex: action.payload
            };

        case 'SET_ANSWER': {
            const newAnswers = new Map(state.answers);
            newAnswers.set(action.payload.questionId, action.payload.answers);
            return {
                ...state,
                answers: newAnswers,
                saveStatus: 'saving'
            };
        }

        case 'ADD_VIOLATION': {
            const newViolations = [...state.violations, action.payload];
            const newViolationCount = newViolations.length;
            const shouldLock = state.config?.autoSubmitOnMaxViolations && newViolationCount >= (state.config?.maxViolations || 3);

            return {
                ...state,
                violations: newViolations,
                violationCount: newViolationCount,
                currentViolation: action.payload,
                showViolationWarning: true,
                isLocked: shouldLock
            };
        }

        case 'DISMISS_VIOLATION_WARNING':
            return {
                ...state,
                showViolationWarning: false,
                currentViolation: null
            };

        case 'SET_FULLSCREEN':
            return {
                ...state,
                isFullscreen: action.payload
            };

        case 'SET_LOCKED':
            return {
                ...state,
                isLocked: action.payload
            };

        case 'UPDATE_TIME':
            return {
                ...state,
                timeRemaining: action.payload,
                showTimeWarning: action.payload <= 60 && action.payload > 0
            };

        case 'SET_SAVE_STATUS':
            return {
                ...state,
                saveStatus: action.payload
            };

        case 'SET_LAST_SAVED':
            return {
                ...state,
                lastSavedAt: action.payload,
                saveStatus: 'saved'
            };

        case 'SHOW_SUBMIT_CONFIRM':
            return {
                ...state,
                showSubmitConfirm: action.payload
            };

        case 'SHOW_TIME_WARNING':
            return {
                ...state,
                showTimeWarning: action.payload
            };

        case 'SET_SUBMITTING':
            return {
                ...state,
                isSubmitting: action.payload
            };

        case 'QUIZ_COMPLETED':
            return {
                ...state,
                quizCompleted: true,
                finalScore: action.payload.score,
                isSubmitting: false,
                attempt: state.attempt
                    ? {
                          ...state.attempt,
                          status: action.payload.status,
                          score: action.payload.score,
                          submittedAt: new Date()
                      }
                    : null
            };

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
                isLoading: false
            };

        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload
            };

        default:
            return state;
    }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface SecureQuizContextValue {
    state: SecureQuizState;
    dispatch: React.Dispatch<SecureQuizAction>;

    // Quiz Actions
    initializeQuiz: (config: QuizConfig, questions: QuizQuestion[], attempt: QuizAttempt) => void;
    setAnswer: (questionId: string, answers: string[]) => void;
    goToQuestion: (index: number) => void;
    goToNextQuestion: () => void;
    goToPreviousQuestion: () => void;
    submitQuiz: () => Promise<void>;

    // Security Actions
    enterFullscreen: () => Promise<boolean>;
    exitFullscreen: () => void;
    recordViolation: (type: ViolationType, details?: string) => void;
    dismissViolationWarning: () => void;

    // Utility
    getAnsweredCount: () => number;
    getUnansweredQuestions: () => number[];
    isQuestionAnswered: (questionId: string) => boolean;
    formatTime: (seconds: number) => string;
}

const SecureQuizContext = createContext<SecureQuizContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface SecureQuizProviderProps {
    children: React.ReactNode;
    userId: string;
    onSaveProgress: (answers: Map<string, string[]>, currentIndex: number) => Promise<void>;
    onSubmitQuiz: (answers: Map<string, string[]>, violations: Violation[]) => Promise<{ score: number }>;
    onViolationRecorded?: (violation: Violation) => void;
}

export const SecureQuizProvider: React.FC<SecureQuizProviderProps> = ({ children, userId, onSaveProgress, onSubmitQuiz, onViolationRecorded }) => {
    const [state, dispatch] = useReducer(secureQuizReducer, initialState);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
    const violationIdRef = useRef(0);

    // ========================================================================
    // QUIZ ACTIONS
    // ========================================================================

    const initializeQuiz = useCallback((config: QuizConfig, questions: QuizQuestion[], attempt: QuizAttempt) => {
        dispatch({ type: 'INIT_QUIZ', payload: { config, questions, attempt } });
    }, []);

    const setAnswer = useCallback((questionId: string, answers: string[]) => {
        dispatch({ type: 'SET_ANSWER', payload: { questionId, answers } });
    }, []);

    const goToQuestion = useCallback(
        (index: number) => {
            if (index >= 0 && index < state.questions.length) {
                dispatch({ type: 'SET_CURRENT_QUESTION', payload: index });
            }
        },
        [state.questions.length]
    );

    const goToNextQuestion = useCallback(() => {
        if (state.currentQuestionIndex < state.questions.length - 1) {
            dispatch({ type: 'SET_CURRENT_QUESTION', payload: state.currentQuestionIndex + 1 });
        }
    }, [state.currentQuestionIndex, state.questions.length]);

    const goToPreviousQuestion = useCallback(() => {
        if (state.config?.allowBackNavigation && state.currentQuestionIndex > 0) {
            dispatch({ type: 'SET_CURRENT_QUESTION', payload: state.currentQuestionIndex - 1 });
        }
    }, [state.config?.allowBackNavigation, state.currentQuestionIndex]);

    const submitQuiz = useCallback(async () => {
        if (state.isSubmitting || state.quizCompleted) return;

        dispatch({ type: 'SET_SUBMITTING', payload: true });

        try {
            const result = await onSubmitQuiz(state.answers, state.violations);
            dispatch({
                type: 'QUIZ_COMPLETED',
                payload: { score: result.score, status: 'submitted' }
            });
        } catch (error) {
            console.error('Error submitting quiz:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Failed to submit quiz. Please try again.' });
            dispatch({ type: 'SET_SUBMITTING', payload: false });
        }
    }, [state.isSubmitting, state.quizCompleted, state.answers, state.violations, onSubmitQuiz]);

    // ========================================================================
    // SECURITY ACTIONS
    // ========================================================================

    const enterFullscreen = useCallback(async (): Promise<boolean> => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if ((elem as any).webkitRequestFullscreen) {
                await (elem as any).webkitRequestFullscreen();
            } else if ((elem as any).msRequestFullscreen) {
                await (elem as any).msRequestFullscreen();
            }
            dispatch({ type: 'SET_FULLSCREEN', payload: true });
            return true;
        } catch (error) {
            console.error('Failed to enter fullscreen:', error);
            return false;
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(console.error);
        }
        dispatch({ type: 'SET_FULLSCREEN', payload: false });
    }, []);

    const recordViolation = useCallback(
        (type: ViolationType, details?: string) => {
            if (state.quizCompleted || state.isLocked) return;

            const violation: Violation = {
                id: `violation_${++violationIdRef.current}_${Date.now()}`,
                type,
                timestamp: new Date(),
                details
            };

            dispatch({ type: 'ADD_VIOLATION', payload: violation });
            onViolationRecorded?.(violation);
        },
        [state.quizCompleted, state.isLocked, onViolationRecorded]
    );

    const dismissViolationWarning = useCallback(() => {
        dispatch({ type: 'DISMISS_VIOLATION_WARNING' });
    }, []);

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    const getAnsweredCount = useCallback(() => {
        return Array.from(state.answers.values()).filter((answers) => answers.length > 0 && answers.some((a) => a !== '')).length;
    }, [state.answers]);

    const getUnansweredQuestions = useCallback(() => {
        return state.questions
            .map((q, index) => {
                const answers = state.answers.get(q._id) || [];
                const isAnswered = answers.length > 0 && answers.some((a) => a !== '');
                return isAnswered ? -1 : index + 1;
            })
            .filter((index) => index !== -1);
    }, [state.questions, state.answers]);

    const isQuestionAnswered = useCallback(
        (questionId: string) => {
            const answers = state.answers.get(questionId) || [];
            return answers.length > 0 && answers.some((a) => a !== '');
        },
        [state.answers]
    );

    const formatTime = useCallback((seconds: number): string => {
        if (seconds < 0) return '00:00';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // ========================================================================
    // TIMER EFFECT
    // ========================================================================

    useEffect(() => {
        if (!state.config || state.quizCompleted || state.isLoading) return;

        timerRef.current = setInterval(() => {
            dispatch({ type: 'UPDATE_TIME', payload: Math.max(0, state.timeRemaining - 1) });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [state.config, state.quizCompleted, state.isLoading, state.timeRemaining]);

    // Auto-submit on timeout
    useEffect(() => {
        if (state.timeRemaining === 0 && state.config?.autoSubmitOnTimeout && !state.quizCompleted) {
            submitQuiz();
        }
    }, [state.timeRemaining, state.config?.autoSubmitOnTimeout, state.quizCompleted, submitQuiz]);

    // ========================================================================
    // AUTO-SAVE EFFECT
    // ========================================================================

    useEffect(() => {
        if (!state.config || state.quizCompleted || state.saveStatus !== 'saving') return;

        // Debounce auto-save
        if (autoSaveRef.current) {
            clearTimeout(autoSaveRef.current);
        }

        autoSaveRef.current = setTimeout(async () => {
            try {
                await onSaveProgress(state.answers, state.currentQuestionIndex);
                dispatch({ type: 'SET_LAST_SAVED', payload: new Date() });
            } catch (error) {
                console.error('Auto-save failed:', error);
                dispatch({ type: 'SET_SAVE_STATUS', payload: 'error' });
            }
        }, 1000);

        return () => {
            if (autoSaveRef.current) {
                clearTimeout(autoSaveRef.current);
            }
        };
    }, [state.saveStatus, state.answers, state.currentQuestionIndex, state.config, state.quizCompleted, onSaveProgress]);

    // ========================================================================
    // AUTO-SUBMIT ON MAX VIOLATIONS
    // ========================================================================

    useEffect(() => {
        if (state.isLocked && state.config?.autoSubmitOnMaxViolations && !state.quizCompleted) {
            // Small delay to show the final warning
            setTimeout(() => {
                submitQuiz();
            }, 2000);
        }
    }, [state.isLocked, state.config?.autoSubmitOnMaxViolations, state.quizCompleted, submitQuiz]);

    // ========================================================================
    // CONTEXT VALUE
    // ========================================================================

    const value: SecureQuizContextValue = {
        state,
        dispatch,
        initializeQuiz,
        setAnswer,
        goToQuestion,
        goToNextQuestion,
        goToPreviousQuestion,
        submitQuiz,
        enterFullscreen,
        exitFullscreen,
        recordViolation,
        dismissViolationWarning,
        getAnsweredCount,
        getUnansweredQuestions,
        isQuestionAnswered,
        formatTime
    };

    return <SecureQuizContext.Provider value={value}>{children}</SecureQuizContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================

export const useSecureQuiz = (): SecureQuizContextValue => {
    const context = useContext(SecureQuizContext);
    if (!context) {
        throw new Error('useSecureQuiz must be used within a SecureQuizProvider');
    }
    return context;
};

// ============================================================================
// VIOLATION MESSAGES
// ============================================================================

export const VIOLATION_MESSAGES: Record<ViolationType, { title: string; message: string }> = {
    fullscreen_exit: {
        title: 'Fullscreen Mode Required',
        message: 'You have exited fullscreen mode. Please return to fullscreen to continue your quiz. This action has been recorded.'
    },
    tab_switch: {
        title: 'Tab Switch Detected',
        message: 'Switching tabs during the quiz is not allowed. Please remain on this page to complete your assessment.'
    },
    focus_lost: {
        title: 'Window Focus Lost',
        message: 'You have navigated away from the quiz window. Please return focus to continue.'
    },
    visibility_hidden: {
        title: 'Page Hidden',
        message: 'The quiz page was hidden or minimized. Please keep this page visible during your assessment.'
    },
    copy_attempt: {
        title: 'Copy Attempt Detected',
        message: 'Copying content is disabled during this assessment for academic integrity purposes.'
    },
    paste_attempt: {
        title: 'Paste Attempt Detected',
        message: 'Pasting content is disabled during this assessment for academic integrity purposes.'
    },
    right_click: {
        title: 'Right-Click Disabled',
        message: 'Right-click menu is disabled during this assessment for academic integrity purposes.'
    },
    dev_tools: {
        title: 'Developer Tools Detected',
        message: 'Opening developer tools during an assessment is not permitted.'
    },
    screenshot_attempt: {
        title: 'Screenshot Attempt',
        message: 'Taking screenshots during the assessment may be considered a violation of academic integrity.'
    }
};

export default SecureQuizContext;
