'use client';

import React, { useState, useMemo } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { ProgressBar } from 'primereact/progressbar';

import { GradingControlsProps, QuestionAnswerDetail, AttemptStatus, GradingStatus, attemptStatusConfig, gradingStatusConfig, questionTypeDisplayConfig } from '@/lib/lms/quiz-review-types';

/**
 * GradingControls - Comprehensive grading interface for instructors
 *
 * Features:
 * - Manual grading for subjective questions
 * - Score override capability with justification
 * - Recalculation preview before saving
 * - Bulk actions (grade all as correct, etc.)
 * - Finalize grading workflow
 */
const GradingControls: React.FC<GradingControlsProps> = ({ attemptData, pendingChanges, viewConfig, onScoreChange, onBulkGrade, onRecalculate, onFinalizeGrading, onStatusChange, isSaving }) => {
    const [finalizeDialog, setFinalizeDialog] = useState(false);
    const [finalizeNotes, setFinalizeNotes] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState<QuestionAnswerDetail[]>([]);
    const [bulkAction, setBulkAction] = useState<string | null>(null);

    // Calculate grading statistics
    const gradingStats = useMemo(() => {
        const questions = attemptData.questions;
        const totalQuestions = questions.length;
        const autoGraded = questions.filter((q) => q.autoGraded).length;
        const needsManualGrading = questions.filter((q) => !q.autoGraded && q.marksAwarded === 0).length;
        const manuallyGraded = questions.filter((q) => !q.autoGraded && q.marksAwarded > 0).length;

        // Calculate scores
        const currentScore = questions.reduce((sum, q) => sum + q.marksAwarded, 0);
        const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
        const scorePercentage = maxScore > 0 ? (currentScore / maxScore) * 100 : 0;

        // Calculate pending changes impact
        let pendingScoreChange = 0;
        Object.entries(pendingChanges.scores || {}).forEach(([questionId, newScore]) => {
            const question = questions.find((q) => q.questionId === questionId);
            if (question) {
                pendingScoreChange += newScore - question.marksAwarded;
            }
        });

        const projectedScore = currentScore + pendingScoreChange;
        const projectedPercentage = maxScore > 0 ? (projectedScore / maxScore) * 100 : 0;

        return {
            totalQuestions,
            autoGraded,
            needsManualGrading,
            manuallyGraded,
            gradingProgress: ((autoGraded + manuallyGraded) / totalQuestions) * 100,
            currentScore,
            maxScore,
            scorePercentage,
            pendingScoreChange,
            projectedScore,
            projectedPercentage,
            hasPendingChanges: Object.keys(pendingChanges.scores || {}).length > 0 || Object.keys(pendingChanges.feedback || {}).length > 0
        };
    }, [attemptData.questions, pendingChanges]);

    // Get questions that need manual grading
    const questionsNeedingGrading = useMemo(() => {
        return attemptData.questions.filter((q) => !q.autoGraded || q.questionType === 'free_text');
    }, [attemptData.questions]);

    // Status change options
    const statusOptions = Object.entries(attemptStatusConfig)
        .filter(([status]) => status !== 'in_progress')
        .map(([value, config]) => ({
            value,
            label: config.label,
            icon: config.icon
        }));

    // Bulk action options
    const bulkActionOptions = [
        { label: 'Award Full Marks', value: 'full_marks' },
        { label: 'Award Half Marks', value: 'half_marks' },
        { label: 'Award Zero', value: 'zero' },
        { label: 'Clear Pending Changes', value: 'clear' }
    ];

    // Handle bulk action
    const handleBulkAction = () => {
        if (!bulkAction || selectedQuestions.length === 0) return;

        confirmDialog({
            message: `Apply "${bulkActionOptions.find((o) => o.value === bulkAction)?.label}" to ${selectedQuestions.length} questions?`,
            header: 'Confirm Bulk Action',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-warning',
            accept: () => {
                onBulkGrade?.(
                    selectedQuestions.map((q) => q.questionId),
                    bulkAction
                );
                setSelectedQuestions([]);
                setBulkAction(null);
            }
        });
    };

    // Handle finalize grading
    const handleFinalizeGrading = () => {
        onFinalizeGrading?.(finalizeNotes);
        setFinalizeDialog(false);
        setFinalizeNotes('');
    };

    // Score template for DataTable
    const scoreBodyTemplate = (question: QuestionAnswerDetail) => {
        const pendingScore = pendingChanges.scores?.[question.questionId];
        const hasPendingChange = pendingScore !== undefined && pendingScore !== question.marksAwarded;

        return (
            <div className="flex align-items-center gap-2">
                <InputNumber
                    value={pendingScore ?? question.marksAwarded}
                    onValueChange={(e) => onScoreChange?.(question.questionId, e.value ?? 0)}
                    min={0}
                    max={question.points}
                    minFractionDigits={1}
                    maxFractionDigits={1}
                    className="w-5rem"
                    inputClassName={hasPendingChange ? 'bg-yellow-100' : ''}
                />
                <span className="text-500">/ {question.points}</span>
                {hasPendingChange && <Tag value="Modified" severity="warning" className="ml-2" />}
            </div>
        );
    };

    // Question type template
    const typeBodyTemplate = (question: QuestionAnswerDetail) => {
        const config = questionTypeDisplayConfig[question.questionType];
        return (
            <div className="flex align-items-center gap-2">
                <i className={`${config.icon} text-500`}></i>
                <span>{config.label}</span>
            </div>
        );
    };

    // Status template
    const statusBodyTemplate = (question: QuestionAnswerDetail) => {
        if (question.autoGraded) {
            return <Tag value="Auto" severity="info" icon="pi pi-bolt" />;
        } else if (question.marksAwarded > 0 || pendingChanges.scores?.[question.questionId]) {
            return <Tag value="Graded" severity="success" icon="pi pi-check" />;
        } else {
            return <Tag value="Pending" severity="warning" icon="pi pi-clock" />;
        }
    };

    // Correctness template
    const correctnessBodyTemplate = (question: QuestionAnswerDetail) => {
        if (question.isCorrect === true) {
            return <Tag value="Correct" severity="success" />;
        } else if (question.isCorrect === 'partial') {
            return <Tag value="Partial" severity="warning" />;
        } else {
            return <Tag value="Incorrect" severity="danger" />;
        }
    };

    return (
        <div className="grading-controls">
            <ConfirmDialog />

            {/* Grading Overview */}
            <Card className="mb-4">
                <div className="flex flex-column md:flex-row justify-content-between gap-4">
                    {/* Score Summary */}
                    <div className="flex-1">
                        <h4 className="m-0 mb-3 text-700">Score Summary</h4>
                        <div className="flex align-items-baseline gap-2 mb-2">
                            <span className="text-4xl font-bold text-900">{gradingStats.currentScore.toFixed(1)}</span>
                            <span className="text-xl text-500">/ {gradingStats.maxScore}</span>
                            <span className="text-lg text-600">({gradingStats.scorePercentage.toFixed(1)}%)</span>
                        </div>

                        {gradingStats.hasPendingChanges && (
                            <div className="flex align-items-center gap-2 p-2 bg-yellow-50 border-round mb-2">
                                <i className="pi pi-arrow-right text-yellow-700"></i>
                                <span className="text-yellow-800">
                                    Projected: <strong>{gradingStats.projectedScore.toFixed(1)}</strong> / {gradingStats.maxScore}({gradingStats.projectedPercentage.toFixed(1)}%)
                                </span>
                                {gradingStats.pendingScoreChange !== 0 && (
                                    <Tag value={`${gradingStats.pendingScoreChange > 0 ? '+' : ''}${gradingStats.pendingScoreChange.toFixed(1)}`} severity={gradingStats.pendingScoreChange > 0 ? 'success' : 'danger'} />
                                )}
                            </div>
                        )}

                        <Tag value={attemptData.passed ? 'Passed' : 'Failed'} severity={attemptData.passed ? 'success' : 'danger'} className="mr-2" />
                        <span className="text-500">Pass mark: {attemptData.passingScore}%</span>
                    </div>

                    {/* Grading Progress */}
                    <div className="flex-1">
                        <h4 className="m-0 mb-3 text-700">Grading Progress</h4>
                        <ProgressBar value={gradingStats.gradingProgress} className="mb-3" showValue={false} />
                        <div className="grid text-sm">
                            <div className="col-4">
                                <div className="text-center p-2 surface-100 border-round">
                                    <div className="text-2xl font-bold text-blue-600">{gradingStats.autoGraded}</div>
                                    <div className="text-500">Auto-graded</div>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="text-center p-2 surface-100 border-round">
                                    <div className="text-2xl font-bold text-green-600">{gradingStats.manuallyGraded}</div>
                                    <div className="text-500">Manually graded</div>
                                </div>
                            </div>
                            <div className="col-4">
                                <div className="text-center p-2 surface-100 border-round">
                                    <div className="text-2xl font-bold text-orange-600">{gradingStats.needsManualGrading}</div>
                                    <div className="text-500">Needs grading</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attempt Status */}
                    <div className="flex-1">
                        <h4 className="m-0 mb-3 text-700">Attempt Status</h4>
                        <div className="mb-3">
                            <Tag value={attemptStatusConfig[attemptData.status]?.label || attemptData.status} severity={attemptStatusConfig[attemptData.status]?.severity} icon={attemptStatusConfig[attemptData.status]?.icon} className="text-lg" />
                        </div>
                        {viewConfig.canEditScores && <Dropdown value={attemptData.status} options={statusOptions} onChange={(e) => onStatusChange?.(e.value)} placeholder="Change Status" className="w-full" optionLabel="label" optionValue="value" />}
                    </div>
                </div>
            </Card>

            {/* Manual Grading Section */}
            {questionsNeedingGrading.length > 0 && viewConfig.canEditScores && (
                <Card title="Questions Requiring Manual Grading" className="mb-4">
                    {/* Bulk Actions Toolbar */}
                    <div className="flex flex-wrap align-items-center gap-3 mb-4 p-3 surface-100 border-round">
                        <span className="text-700 font-semibold">Bulk Actions:</span>
                        <Dropdown value={bulkAction} options={bulkActionOptions} onChange={(e) => setBulkAction(e.value)} placeholder="Select Action" className="w-12rem" />
                        <Button label="Apply to Selected" icon="pi pi-check" className="p-button-sm" onClick={handleBulkAction} disabled={!bulkAction || selectedQuestions.length === 0} />
                        <span className="text-500 ml-auto">
                            {selectedQuestions.length} of {questionsNeedingGrading.length} selected
                        </span>
                    </div>

                    {/* Questions Table */}
                    <DataTable
                        value={questionsNeedingGrading}
                        selection={selectedQuestions}
                        onSelectionChange={(e) => setSelectedQuestions(e.value as QuestionAnswerDetail[])}
                        selectionMode="multiple"
                        dataKey="questionId"
                        responsiveLayout="scroll"
                        stripedRows
                        className="p-datatable-sm"
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                        <Column field="questionNumber" header="#" style={{ width: '60px' }} body={(q) => <strong>Q{q.questionNumber}</strong>} />
                        <Column field="questionText" header="Question" body={(q) => <div className="max-w-30rem">{q.questionText.length > 80 ? `${q.questionText.substring(0, 80)}...` : q.questionText}</div>} />
                        <Column field="questionType" header="Type" body={typeBodyTemplate} style={{ width: '140px' }} />
                        <Column header="Status" body={statusBodyTemplate} style={{ width: '100px' }} />
                        <Column header="Correctness" body={correctnessBodyTemplate} style={{ width: '100px' }} />
                        <Column header="Score" body={scoreBodyTemplate} style={{ width: '180px' }} />
                    </DataTable>
                </Card>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-content-between align-items-center gap-3 p-3 surface-100 border-round">
                <div className="flex align-items-center gap-2">{gradingStats.hasPendingChanges && <Message severity="warn" text={`${Object.keys(pendingChanges.scores || {}).length} unsaved score changes`} />}</div>

                <div className="flex gap-2">
                    <Button label="Recalculate Scores" icon="pi pi-refresh" className="p-button-outlined" onClick={onRecalculate} disabled={isSaving} />

                    {viewConfig.canFinalizeGrading && (
                        <Button
                            label="Finalize Grading"
                            icon="pi pi-lock"
                            className="p-button-success"
                            onClick={() => setFinalizeDialog(true)}
                            disabled={gradingStats.needsManualGrading > 0 || isSaving}
                            tooltip={gradingStats.needsManualGrading > 0 ? 'Grade all questions before finalizing' : ''}
                        />
                    )}
                </div>
            </div>

            {/* Finalize Grading Dialog */}
            <Dialog
                visible={finalizeDialog}
                onHide={() => setFinalizeDialog(false)}
                header="Finalize Grading"
                style={{ width: '500px' }}
                modal
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-outlined" onClick={() => setFinalizeDialog(false)} />
                        <Button label="Finalize & Lock" icon="pi pi-lock" className="p-button-success" onClick={handleFinalizeGrading} loading={isSaving} />
                    </div>
                }
            >
                <Message severity="warn" className="w-full mb-4" text="Once finalized, scores can only be changed by an administrator." />

                <div className="surface-100 p-3 border-round mb-4">
                    <div className="flex justify-content-between mb-2">
                        <span>Final Score:</span>
                        <strong>
                            {gradingStats.projectedScore.toFixed(1)} / {gradingStats.maxScore}
                        </strong>
                    </div>
                    <div className="flex justify-content-between mb-2">
                        <span>Percentage:</span>
                        <strong>{gradingStats.projectedPercentage.toFixed(1)}%</strong>
                    </div>
                    <div className="flex justify-content-between">
                        <span>Result:</span>
                        <Tag value={gradingStats.projectedPercentage >= attemptData.passingScore ? 'Pass' : 'Fail'} severity={gradingStats.projectedPercentage >= attemptData.passingScore ? 'success' : 'danger'} />
                    </div>
                </div>

                <div className="field">
                    <label className="block mb-2 font-semibold">Grading Notes (Optional)</label>
                    <InputTextarea value={finalizeNotes} onChange={(e) => setFinalizeNotes(e.target.value)} rows={3} className="w-full" placeholder="Add any notes about the grading process..." />
                </div>
            </Dialog>
        </div>
    );
};

export default GradingControls;
