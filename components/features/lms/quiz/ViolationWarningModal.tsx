'use client';

import React from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { useSecureQuiz, VIOLATION_MESSAGES, ViolationType } from './SecureQuizContext';

// ============================================================================
// VIOLATION WARNING MODAL
// ============================================================================

interface ViolationWarningModalProps {
    onRequestFullscreen?: () => void;
}

export const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({ onRequestFullscreen }) => {
    const { state, dismissViolationWarning, enterFullscreen } = useSecureQuiz();
    const { showViolationWarning, currentViolation, violationCount, config, isLocked } = state;

    if (!showViolationWarning || !currentViolation || !config) return null;

    const violationInfo = VIOLATION_MESSAGES[currentViolation.type];
    const remainingViolations = config.maxViolations - violationCount;
    const isLastWarning = remainingViolations <= 1;
    const willAutoSubmit = remainingViolations <= 0 && config.autoSubmitOnMaxViolations;

    const handleDismiss = async () => {
        // If fullscreen violation, try to re-enter fullscreen
        if (currentViolation.type === 'fullscreen_exit') {
            await enterFullscreen();
        }
        dismissViolationWarning();
        onRequestFullscreen?.();
    };

    const getSeverityColor = () => {
        if (willAutoSubmit) return 'bg-red-600';
        if (isLastWarning) return 'bg-orange-500';
        return 'bg-yellow-500';
    };

    const getSeverityIcon = () => {
        if (willAutoSubmit) return 'pi-ban';
        if (isLastWarning) return 'pi-exclamation-triangle';
        return 'pi-info-circle';
    };

    const header = (
        <div className={`flex align-items-center gap-3 p-3 ${getSeverityColor()} text-white border-round-top`}>
            <i className={`pi ${getSeverityIcon()} text-2xl`}></i>
            <div>
                <h4 className="m-0 font-semibold">{violationInfo.title}</h4>
                <span className="text-sm opacity-90">
                    Violation {violationCount} of {config.maxViolations}
                </span>
            </div>
        </div>
    );

    const footer = (
        <div className="flex justify-content-end gap-2">
            {!willAutoSubmit && (
                <Button
                    label={currentViolation.type === 'fullscreen_exit' ? 'Return to Fullscreen' : 'I Understand'}
                    icon={currentViolation.type === 'fullscreen_exit' ? 'pi pi-expand' : 'pi pi-check'}
                    onClick={handleDismiss}
                    className="p-button-primary"
                    disabled={isLocked}
                    autoFocus
                />
            )}
        </div>
    );

    return (
        <Dialog
            visible={showViolationWarning}
            onHide={() => {}} // Prevent closing by clicking outside
            header={header}
            footer={footer}
            closable={false}
            modal
            blockScroll
            draggable={false}
            resizable={false}
            className="violation-modal"
            style={{ width: '450px' }}
            pt={{
                header: { className: 'p-0' },
                content: { className: 'p-4' }
            }}
        >
            <div className="flex flex-column gap-3">
                {/* Main Message */}
                <p className="text-700 line-height-3 m-0">{violationInfo.message}</p>

                {/* Violation Status */}
                <div className={`p-3 border-round ${willAutoSubmit ? 'bg-red-100' : isLastWarning ? 'bg-orange-100' : 'bg-blue-100'}`}>
                    {willAutoSubmit ? (
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-exclamation-circle text-red-600"></i>
                            <span className="text-red-700 font-semibold">Maximum violations reached. Your quiz is being submitted automatically.</span>
                        </div>
                    ) : isLastWarning ? (
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-exclamation-triangle text-orange-600"></i>
                            <span className="text-orange-700 font-semibold">Warning: This is your final warning. One more violation will auto-submit your quiz.</span>
                        </div>
                    ) : (
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-info-circle text-blue-600"></i>
                            <span className="text-blue-700">
                                You have <strong>{remainingViolations}</strong> warning{remainingViolations !== 1 ? 's' : ''} remaining before automatic submission.
                            </span>
                        </div>
                    )}
                </div>

                {/* Policy Reminder */}
                <div className="text-sm text-500 border-top-1 surface-border pt-3">
                    <strong>Academic Integrity Policy:</strong> All violations are logged and may be reviewed by your instructor. Please ensure you complete this assessment honestly and without external assistance.
                </div>
            </div>
        </Dialog>
    );
};

// ============================================================================
// CONFIRMATION DIALOGS
// ============================================================================

interface SubmitConfirmDialogProps {
    visible: boolean;
    onHide: () => void;
    onConfirm: () => void;
    unansweredCount: number;
    isSubmitting: boolean;
}

export const SubmitConfirmDialog: React.FC<SubmitConfirmDialogProps> = ({ visible, onHide, onConfirm, unansweredCount, isSubmitting }) => {
    const header = (
        <div className="flex align-items-center gap-2">
            <i className="pi pi-send text-primary text-xl"></i>
            <span>Submit Quiz</span>
        </div>
    );

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Review Answers" icon="pi pi-arrow-left" onClick={onHide} className="p-button-outlined" disabled={isSubmitting} />
            <Button label={isSubmitting ? 'Submitting...' : 'Submit Quiz'} icon={isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-check'} onClick={onConfirm} className="p-button-success" disabled={isSubmitting} autoFocus />
        </div>
    );

    return (
        <Dialog visible={visible} onHide={onHide} header={header} footer={footer} modal blockScroll draggable={false} style={{ width: '400px' }}>
            <div className="flex flex-column gap-3">
                {unansweredCount > 0 ? (
                    <>
                        <div className="p-3 bg-yellow-100 border-round flex align-items-center gap-2">
                            <i className="pi pi-exclamation-triangle text-yellow-600 text-xl"></i>
                            <span className="text-yellow-700">
                                You have <strong>{unansweredCount}</strong> unanswered question{unansweredCount !== 1 ? 's' : ''}.
                            </span>
                        </div>
                        <p className="text-700 m-0">Are you sure you want to submit? Unanswered questions will be marked as incorrect.</p>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-green-100 border-round flex align-items-center gap-2">
                            <i className="pi pi-check-circle text-green-600 text-xl"></i>
                            <span className="text-green-700">All questions have been answered!</span>
                        </div>
                        <p className="text-700 m-0">Once submitted, you cannot change your answers. Are you ready to submit?</p>
                    </>
                )}
            </div>
        </Dialog>
    );
};

// ============================================================================
// TIME WARNING DIALOG
// ============================================================================

interface TimeWarningDialogProps {
    visible: boolean;
    onHide: () => void;
    timeRemaining: number;
}

export const TimeWarningDialog: React.FC<TimeWarningDialogProps> = ({ visible, onHide, timeRemaining }) => {
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={
                <div className="flex align-items-center gap-2 text-orange-600">
                    <i className="pi pi-clock text-xl"></i>
                    <span>Time Running Low</span>
                </div>
            }
            footer={<Button label="Continue Quiz" icon="pi pi-arrow-right" onClick={onHide} className="p-button-warning" autoFocus />}
            modal
            blockScroll
            draggable={false}
            style={{ width: '350px' }}
        >
            <div className="text-center">
                <div className="text-5xl font-bold text-orange-600 mb-3">{formatTime(timeRemaining)}</div>
                <p className="text-700 m-0">You have less than 1 minute remaining. The quiz will auto-submit when time expires.</p>
            </div>
        </Dialog>
    );
};

// ============================================================================
// EXIT CONFIRMATION DIALOG
// ============================================================================

interface ExitConfirmDialogProps {
    visible: boolean;
    onHide: () => void;
    onConfirm: () => void;
}

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({ visible, onHide, onConfirm }) => {
    return (
        <Dialog
            visible={visible}
            onHide={onHide}
            header={
                <div className="flex align-items-center gap-2 text-red-600">
                    <i className="pi pi-exclamation-triangle text-xl"></i>
                    <span>Exit Quiz?</span>
                </div>
            }
            footer={
                <div className="flex justify-content-end gap-2">
                    <Button label="Continue Quiz" icon="pi pi-arrow-left" onClick={onHide} className="p-button-outlined" />
                    <Button label="Exit & Save Progress" icon="pi pi-sign-out" onClick={onConfirm} className="p-button-danger" />
                </div>
            }
            modal
            blockScroll
            draggable={false}
            style={{ width: '400px' }}
        >
            <div className="flex flex-column gap-3">
                <div className="p-3 bg-red-100 border-round">
                    <p className="text-red-700 m-0">
                        <strong>Warning:</strong> If you exit now, your progress will be saved but this will be recorded as a violation.
                    </p>
                </div>
                <p className="text-700 m-0">We recommend completing the quiz in one session. Are you sure you want to exit?</p>
            </div>
        </Dialog>
    );
};

export default ViolationWarningModal;
