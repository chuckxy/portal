'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabView, TabPanel } from 'primereact/tabview';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Message } from 'primereact/message';

import { AttemptReviewData, ReviewerRole, ReviewViewConfig, QuizAttemptReviewProps, getReviewViewConfig } from '@/lib/services/lms/quiz-review-types';

import AttemptSummaryPanel from './AttemptSummaryPanel';
import IntegrityLogPanel from './IntegrityLogPanel';
import QuestionReviewPanel from './QuestionReviewPanel';
import GradingControls from './GradingControls';
import AuditTrailPanel from './AuditTrailPanel';

/**
 * QuizAttemptReview - Main component for reviewing quiz attempts
 *
 * Provides a comprehensive view of a student's quiz attempt including:
 * - Attempt summary and scoring
 * - Integrity/behavior logs (instructor/admin only)
 * - Question-by-question review with answers
 * - Grading controls for subjective questions
 * - Audit trail of changes
 *
 * Role-based access control:
 * - Student: Limited view, no integrity logs or grading controls
 * - Instructor: Full grading capabilities, integrity logs
 * - Admin: Full access including audit trail and grade approval
 */
const QuizAttemptReview: React.FC<QuizAttemptReviewProps> = ({ attemptId, role, currentUserId, onClose, onGradeUpdated }) => {
    const toast = useRef<Toast>(null);

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attemptData, setAttemptData] = useState<AttemptReviewData | null>(null);
    const [viewConfig, setViewConfig] = useState<ReviewViewConfig>(getReviewViewConfig(role));
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

    // Pending changes for batch save
    const [pendingScoreChanges, setPendingScoreChanges] = useState<Map<string, { score: number; justification: string }>>(new Map());
    const [pendingFeedbackChanges, setPendingFeedbackChanges] = useState<Map<string, string>>(new Map());

    // Fetch attempt data
    useEffect(() => {
        const fetchAttemptData = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await fetch(`/api/lms/quiz-attempts/${attemptId}/review?role=${role}&userId=${currentUserId}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch attempt data');
                }

                const data = await response.json();
                setAttemptData(data);

                // Update view config based on whether this is the user's own attempt
                const isOwnAttempt = data.student._id === currentUserId;
                setViewConfig(getReviewViewConfig(role, isOwnAttempt));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                showToast('error', 'Error', err instanceof Error ? err.message : 'Failed to load attempt data');
            } finally {
                setLoading(false);
            }
        };

        if (attemptId) {
            fetchAttemptData();
        }
    }, [attemptId, role, currentUserId]);

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 4000 });
    };

    // Handle score override for a question
    const handleScoreOverride = (questionId: string, newScore: number, justification: string) => {
        setPendingScoreChanges((prev) => {
            const updated = new Map(prev);
            updated.set(questionId, { score: newScore, justification });
            return updated;
        });
        setHasUnsavedChanges(true);
    };

    // Handle feedback update for a question
    const handleFeedbackUpdate = (questionId: string, feedback: string) => {
        setPendingFeedbackChanges((prev) => {
            const updated = new Map(prev);
            updated.set(questionId, feedback);
            return updated;
        });
        setHasUnsavedChanges(true);
    };

    // Save all pending changes
    const handleSaveGrades = async () => {
        if (!attemptData) return;

        confirmDialog({
            message: 'Are you sure you want to save all grade changes? This action will be recorded in the audit trail.',
            header: 'Confirm Save',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-success',
            accept: async () => {
                try {
                    setSaving(true);

                    // Calculate new total score
                    let newTotalScore = attemptData.score;

                    // Apply pending score changes
                    for (const [questionId, change] of pendingScoreChanges) {
                        const question = attemptData.questions.find((q) => q.questionId === questionId);
                        if (question) {
                            newTotalScore = newTotalScore - question.marksAwarded + change.score;
                        }
                    }

                    // Update total score
                    const response = await fetch(`/api/lms/quiz-attempts/${attemptId}/review`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'update_score',
                            newScore: newTotalScore,
                            justification: 'Batch grade update',
                            gradedBy: currentUserId
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to save grades');
                    }

                    // Update overall feedback if changed
                    const overallFeedback = pendingFeedbackChanges.get('overall');
                    if (overallFeedback) {
                        await fetch(`/api/lms/quiz-attempts/${attemptId}/review`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'update_feedback',
                                feedback: overallFeedback,
                                gradedBy: currentUserId
                            })
                        });
                    }

                    // Clear pending changes
                    setPendingScoreChanges(new Map());
                    setPendingFeedbackChanges(new Map());
                    setHasUnsavedChanges(false);

                    showToast('success', 'Saved', 'Grades have been saved successfully');
                    onGradeUpdated?.(attemptId);

                    // Refresh data
                    const refreshResponse = await fetch(`/api/lms/quiz-attempts/${attemptId}/review?role=${role}&userId=${currentUserId}`);
                    if (refreshResponse.ok) {
                        const refreshedData = await refreshResponse.json();
                        setAttemptData(refreshedData);
                    }
                } catch (err) {
                    showToast('error', 'Error', 'Failed to save grades');
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    // Recalculate scores based on pending changes
    const handleRecalculate = () => {
        if (!attemptData) return;

        let newTotal = 0;
        attemptData.questions.forEach((q) => {
            const pendingChange = pendingScoreChanges.get(q.questionId);
            newTotal += pendingChange ? pendingChange.score : q.marksAwarded;
        });

        showToast('info', 'Preview', `Recalculated total: ${newTotal.toFixed(1)} / ${attemptData.totalMarks}`);
    };

    // Handle close with unsaved changes warning
    const handleClose = () => {
        if (hasUnsavedChanges) {
            confirmDialog({
                message: 'You have unsaved changes. Are you sure you want to close without saving?',
                header: 'Unsaved Changes',
                icon: 'pi pi-exclamation-triangle',
                acceptClassName: 'p-button-danger',
                acceptLabel: 'Discard Changes',
                rejectLabel: 'Continue Editing',
                accept: () => {
                    onClose?.();
                }
            });
        } else {
            onClose?.();
        }
    };

    // Render loading state
    if (loading) {
        return (
            <div className="flex flex-column align-items-center justify-content-center p-8">
                <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                <p className="mt-3 text-600">Loading attempt data...</p>
            </div>
        );
    }

    // Render error state
    if (error || !attemptData) {
        return (
            <div className="p-4">
                <Message severity="error" text={error || 'Failed to load attempt data'} className="w-full mb-3" />
                <Button label="Close" icon="pi pi-times" onClick={onClose} className="p-button-outlined" />
            </div>
        );
    }

    return (
        <div className="quiz-attempt-review">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header */}
            <div className="surface-card border-round-lg shadow-1 mb-4">
                <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center p-4 gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-900 m-0 mb-2">Quiz Attempt Review</h2>
                        <p className="text-600 m-0">
                            {attemptData.quiz.title} • Attempt #{attemptData.attemptNumber}
                        </p>
                    </div>
                    <div className="flex align-items-center gap-2">
                        {hasUnsavedChanges && (
                            <span className="text-orange-500 text-sm flex align-items-center gap-1">
                                <i className="pi pi-exclamation-circle"></i>
                                Unsaved changes
                            </span>
                        )}
                        {viewConfig.canEditScores && <Button label="Save Grades" icon="pi pi-save" className="p-button-success" onClick={handleSaveGrades} loading={saving} disabled={!hasUnsavedChanges} />}
                        <Button label="Close" icon="pi pi-times" className="p-button-outlined p-button-secondary" onClick={handleClose} />
                    </div>
                </div>
            </div>

            {/* Summary Panel - Always visible */}
            <AttemptSummaryPanel data={attemptData} viewConfig={viewConfig} />

            {/* Tabbed Content */}
            <Card className="mt-4">
                <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
                    {/* Questions Tab */}
                    <TabPanel
                        header={
                            <span className="flex align-items-center gap-2">
                                <i className="pi pi-list"></i>
                                <span>Questions ({attemptData.questions.length})</span>
                            </span>
                        }
                    >
                        <QuestionReviewPanel
                            questions={attemptData.questions}
                            viewConfig={viewConfig}
                            onScoreOverride={viewConfig.canEditScores ? handleScoreOverride : undefined}
                            onFeedbackUpdate={viewConfig.canAddFeedback ? handleFeedbackUpdate : undefined}
                            expandedQuestionId={expandedQuestionId}
                            onExpandQuestion={setExpandedQuestionId}
                        />
                    </TabPanel>

                    {/* Integrity Log Tab - Only for instructors/admins */}
                    {viewConfig.showIntegrityLog && (
                        <TabPanel
                            header={
                                <span className="flex align-items-center gap-2">
                                    <i className="pi pi-shield"></i>
                                    <span>Integrity Log</span>
                                    {attemptData.violations.length > 0 && <span className="bg-orange-100 text-orange-700 border-round px-2 py-1 text-xs font-bold">{attemptData.violations.length}</span>}
                                </span>
                            }
                        >
                            <IntegrityLogPanel violations={attemptData.violations} ipAddress={attemptData.ipAddress} userAgent={attemptData.userAgent} attemptStatus={attemptData.status} />
                        </TabPanel>
                    )}

                    {/* Grading Controls Tab - Only for instructors/admins */}
                    {viewConfig.showGradingControls && (
                        <TabPanel
                            header={
                                <span className="flex align-items-center gap-2">
                                    <i className="pi pi-pencil"></i>
                                    <span>Grading</span>
                                </span>
                            }
                        >
                            <GradingControls
                                attemptData={attemptData}
                                pendingChanges={{
                                    scores: Object.fromEntries([...pendingScoreChanges].map(([k, v]) => [k, v.score])),
                                    feedback: Object.fromEntries(pendingFeedbackChanges)
                                }}
                                viewConfig={viewConfig}
                                onScoreChange={(questionId, newScore) => {
                                    setPendingScoreChanges((prev) => new Map(prev).set(questionId, { score: newScore, justification: '' }));
                                    setHasUnsavedChanges(true);
                                }}
                                onRecalculate={handleRecalculate}
                                onFinalizeGrading={async (notes) => {
                                    await handleSaveGrades();
                                }}
                                onStatusChange={(status) => {
                                    // Handle status change
                                }}
                                isSaving={saving}
                            />
                        </TabPanel>
                    )}

                    {/* Audit Trail Tab - Only for admins */}
                    {viewConfig.showAuditTrail && (
                        <TabPanel
                            header={
                                <span className="flex align-items-center gap-2">
                                    <i className="pi pi-history"></i>
                                    <span>Audit Trail</span>
                                </span>
                            }
                        >
                            <AuditTrailPanel auditEntries={attemptData.auditTrail} viewConfig={viewConfig} />
                        </TabPanel>
                    )}
                </TabView>
            </Card>

            <style jsx global>{`
                .quiz-attempt-review .p-tabview-panels {
                    padding: 1.5rem 0 0 0;
                }

                .quiz-attempt-review .p-tabview-nav {
                    background: transparent;
                    border: none;
                }

                .quiz-attempt-review .p-tabview-nav-link {
                    background: transparent !important;
                    border: none !important;
                    border-bottom: 2px solid transparent !important;
                }

                .quiz-attempt-review .p-tabview-nav-link:not(.p-disabled):hover {
                    border-bottom-color: var(--primary-color) !important;
                }

                .quiz-attempt-review .p-highlight .p-tabview-nav-link {
                    border-bottom-color: var(--primary-color) !important;
                }
            `}</style>
        </div>
    );
};

export default QuizAttemptReview;
