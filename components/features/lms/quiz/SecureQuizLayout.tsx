'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useSecureQuiz, ViolationType } from './SecureQuizContext';

// ============================================================================
// SECURE QUIZ LAYOUT - Main wrapper with security event handlers
// ============================================================================

interface SecureQuizLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const SecureQuizLayout: React.FC<SecureQuizLayoutProps> = ({ children, className = '' }) => {
    const { state, recordViolation, enterFullscreen } = useSecureQuiz();
    const containerRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);

    // ========================================================================
    // FULLSCREEN DETECTION
    // ========================================================================

    const handleFullscreenChange = useCallback(() => {
        const isFullscreen = !!document.fullscreenElement;

        if (!isFullscreen && state.config && !state.quizCompleted && hasInitialized.current) {
            recordViolation('fullscreen_exit', 'User exited fullscreen mode');
        }
    }, [state.config, state.quizCompleted, recordViolation]);

    // ========================================================================
    // VISIBILITY & FOCUS DETECTION
    // ========================================================================

    const handleVisibilityChange = useCallback(() => {
        if (document.hidden && state.config && !state.quizCompleted) {
            recordViolation('visibility_hidden', 'Page was hidden or minimized');
        }
    }, [state.config, state.quizCompleted, recordViolation]);

    const handleWindowBlur = useCallback(() => {
        if (state.config && !state.quizCompleted) {
            recordViolation('focus_lost', 'Browser window lost focus');
        }
    }, [state.config, state.quizCompleted, recordViolation]);

    // ========================================================================
    // COPY/PASTE/RIGHT-CLICK PREVENTION
    // ========================================================================

    const handleCopy = useCallback(
        (e: ClipboardEvent) => {
            if (state.config && !state.quizCompleted) {
                e.preventDefault();
                recordViolation('copy_attempt', 'Attempted to copy content');
            }
        },
        [state.config, state.quizCompleted, recordViolation]
    );

    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            if (state.config && !state.quizCompleted) {
                e.preventDefault();
                recordViolation('paste_attempt', 'Attempted to paste content');
            }
        },
        [state.config, state.quizCompleted, recordViolation]
    );

    const handleContextMenu = useCallback(
        (e: MouseEvent) => {
            if (state.config && !state.quizCompleted) {
                e.preventDefault();
                recordViolation('right_click', 'Attempted to open context menu');
            }
        },
        [state.config, state.quizCompleted, recordViolation]
    );

    // ========================================================================
    // KEYBOARD SHORTCUTS PREVENTION
    // ========================================================================

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!state.config || state.quizCompleted) return;

            // Prevent common keyboard shortcuts
            const blockedCombinations = [
                // Developer tools
                { key: 'F12', ctrl: false, shift: false },
                { key: 'I', ctrl: true, shift: true }, // Ctrl+Shift+I
                { key: 'J', ctrl: true, shift: true }, // Ctrl+Shift+J
                { key: 'C', ctrl: true, shift: true }, // Ctrl+Shift+C
                // Copy/Paste
                { key: 'c', ctrl: true, shift: false },
                { key: 'v', ctrl: true, shift: false },
                { key: 'x', ctrl: true, shift: false },
                // Print
                { key: 'p', ctrl: true, shift: false },
                // Save
                { key: 's', ctrl: true, shift: false },
                // Find
                { key: 'f', ctrl: true, shift: false },
                // View source
                { key: 'u', ctrl: true, shift: false }
            ];

            const isBlocked = blockedCombinations.some((combo) => {
                return e.key.toLowerCase() === combo.key.toLowerCase() && e.ctrlKey === combo.ctrl && e.shiftKey === combo.shift;
            });

            if (isBlocked) {
                e.preventDefault();
                e.stopPropagation();

                // Special handling for dev tools
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()))) {
                    recordViolation('dev_tools', 'Attempted to open developer tools');
                }
            }

            // Prevent Escape key from exiting fullscreen (browser may still exit)
            if (e.key === 'Escape') {
                e.preventDefault();
            }
        },
        [state.config, state.quizCompleted, recordViolation]
    );

    // ========================================================================
    // PRINT SCREEN DETECTION (Limited capability)
    // ========================================================================

    const handlePrintScreen = useCallback(
        (e: KeyboardEvent) => {
            if (!state.config || state.quizCompleted) return;

            if (e.key === 'PrintScreen') {
                recordViolation('screenshot_attempt', 'PrintScreen key detected');
                // Note: Cannot actually prevent screenshot, only log it
            }
        },
        [state.config, state.quizCompleted, recordViolation]
    );

    // ========================================================================
    // BEFOREUNLOAD - Warn before leaving
    // ========================================================================

    const handleBeforeUnload = useCallback(
        (e: BeforeUnloadEvent) => {
            if (state.config && !state.quizCompleted) {
                e.preventDefault();
                e.returnValue = 'You have a quiz in progress. Are you sure you want to leave?';
                return e.returnValue;
            }
        },
        [state.config, state.quizCompleted]
    );

    // ========================================================================
    // SETUP EFFECTS
    // ========================================================================

    useEffect(() => {
        if (!state.config || state.quizCompleted) return;

        // Add event listeners
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handlePrintScreen);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Mark as initialized after a short delay to avoid triggering on mount
        setTimeout(() => {
            hasInitialized.current = true;
        }, 1000);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handlePrintScreen);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [state.config, state.quizCompleted, handleFullscreenChange, handleVisibilityChange, handleWindowBlur, handleCopy, handlePaste, handleContextMenu, handleKeyDown, handlePrintScreen, handleBeforeUnload]);

    // ========================================================================
    // CSS STYLES FOR SECURITY
    // ========================================================================

    const secureStyles: React.CSSProperties & { [key: string]: string } = {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        WebkitTouchCallout: 'none'
    };

    return (
        <div ref={containerRef} className={`secure-quiz-layout ${className}`} style={secureStyles} onDragStart={(e) => e.preventDefault()}>
            {children}
        </div>
    );
};

// ============================================================================
// FULLSCREEN PROMPT OVERLAY
// ============================================================================

interface FullscreenPromptProps {
    onEnterFullscreen: () => void;
    quizTitle: string;
    instructions?: string[];
}

export const FullscreenPrompt: React.FC<FullscreenPromptProps> = ({ onEnterFullscreen, quizTitle, instructions }) => {
    const defaultInstructions = [
        'This quiz requires fullscreen mode for academic integrity',
        'Tab switching and window changes will be monitored',
        'Copy, paste, and right-click are disabled',
        'Your progress is auto-saved every few seconds',
        'Violations may result in automatic submission'
    ];

    const displayInstructions = instructions || defaultInstructions;

    return (
        <div className="fullscreen-prompt fixed top-0 left-0 w-full h-full flex align-items-center justify-content-center bg-black-alpha-90 z-5">
            <div className="surface-card border-round-xl shadow-8 p-5 max-w-30rem w-full mx-3">
                <div className="text-center mb-4">
                    <i className="pi pi-lock text-5xl text-primary mb-3"></i>
                    <h2 className="text-900 m-0 mb-2">{quizTitle}</h2>
                    <p className="text-600 m-0">Secure Assessment Mode</p>
                </div>

                <div className="bg-yellow-50 border-round-lg p-3 mb-4">
                    <h4 className="text-yellow-800 m-0 mb-2 flex align-items-center gap-2">
                        <i className="pi pi-info-circle"></i>
                        Before You Begin
                    </h4>
                    <ul className="list-none p-0 m-0">
                        {displayInstructions.map((instruction, index) => (
                            <li key={index} className="flex align-items-start gap-2 text-yellow-900 mb-2">
                                <i className="pi pi-check text-xs mt-1"></i>
                                <span className="text-sm">{instruction}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-blue-50 border-round-lg p-3 mb-4">
                    <p className="text-blue-800 text-sm m-0">
                        <strong>Academic Integrity:</strong> By proceeding, you agree to complete this assessment honestly and without unauthorized assistance. All activity is logged.
                    </p>
                </div>

                <button
                    onClick={onEnterFullscreen}
                    className="w-full p-3 bg-primary text-white border-none border-round-lg cursor-pointer 
                             font-semibold text-lg flex align-items-center justify-content-center gap-2
                             hover:bg-primary-600 transition-colors transition-duration-150"
                >
                    <i className="pi pi-expand"></i>
                    Enter Fullscreen & Start Quiz
                </button>

                <p className="text-center text-500 text-xs mt-3 mb-0">Press ESC to exit fullscreen (this will be recorded as a violation)</p>
            </div>
        </div>
    );
};

// ============================================================================
// QUIZ LOCKED OVERLAY
// ============================================================================

interface QuizLockedOverlayProps {
    reason: 'violations' | 'time' | 'submitted';
    violationCount?: number;
    maxViolations?: number;
}

export const QuizLockedOverlay: React.FC<QuizLockedOverlayProps> = ({ reason, violationCount, maxViolations }) => {
    const getContent = () => {
        switch (reason) {
            case 'violations':
                return {
                    icon: 'pi-ban',
                    iconColor: 'text-red-500',
                    title: 'Quiz Auto-Submitted',
                    message: `You have exceeded the maximum allowed violations (${violationCount}/${maxViolations}). Your quiz has been automatically submitted.`,
                    bgColor: 'bg-red-50'
                };
            case 'time':
                return {
                    icon: 'pi-clock',
                    iconColor: 'text-orange-500',
                    title: 'Time Expired',
                    message: 'Your quiz time has expired. Your answers have been automatically submitted.',
                    bgColor: 'bg-orange-50'
                };
            case 'submitted':
                return {
                    icon: 'pi-check-circle',
                    iconColor: 'text-green-500',
                    title: 'Quiz Submitted',
                    message: 'Your quiz has been successfully submitted. You may now close this window.',
                    bgColor: 'bg-green-50'
                };
        }
    };

    const content = getContent();

    return (
        <div className="quiz-locked-overlay fixed top-0 left-0 w-full h-full flex align-items-center justify-content-center bg-black-alpha-80 z-5">
            <div className={`surface-card border-round-xl shadow-8 p-5 max-w-25rem w-full mx-3 text-center ${content.bgColor}`}>
                <i className={`pi ${content.icon} text-6xl ${content.iconColor} mb-3`}></i>
                <h2 className="text-900 m-0 mb-2">{content.title}</h2>
                <p className="text-700 m-0">{content.message}</p>
            </div>
        </div>
    );
};

export default SecureQuizLayout;
