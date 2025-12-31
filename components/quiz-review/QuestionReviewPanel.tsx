'use client';

import React, { useState } from 'react';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Divider } from 'primereact/divider';
import { Badge } from 'primereact/badge';
import { Card } from 'primereact/card';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';

import { QuestionReviewPanelProps, QuestionAnswerDetail, questionTypeDisplayConfig } from '@/lib/lms/quiz-review-types';

/**
 * QuestionReviewPanel - Displays question-by-question review of the attempt
 *
 * For each question shows:
 * - Question text and type
 * - Student's answer(s)
 * - Correct answer(s) (if permitted)
 * - Marks awarded
 * - Option for instructor feedback and score override
 */
const QuestionReviewPanel: React.FC<QuestionReviewPanelProps> = ({ questions, viewConfig, onScoreOverride, onFeedbackUpdate, expandedQuestionId, onExpandQuestion }) => {
    const [scoreOverrideDialog, setScoreOverrideDialog] = useState<{
        visible: boolean;
        question: QuestionAnswerDetail | null;
        newScore: number;
        justification: string;
    }>({
        visible: false,
        question: null,
        newScore: 0,
        justification: ''
    });

    const [feedbackDialog, setFeedbackDialog] = useState<{
        visible: boolean;
        question: QuestionAnswerDetail | null;
        feedback: string;
    }>({
        visible: false,
        question: null,
        feedback: ''
    });

    // Get correctness status color
    const getCorrectnessTag = (isCorrect: boolean | 'partial') => {
        if (isCorrect === true) {
            return <Tag value="Correct" severity="success" icon="pi pi-check" />;
        } else if (isCorrect === 'partial') {
            return <Tag value="Partial" severity="warning" icon="pi pi-minus" />;
        } else {
            return <Tag value="Incorrect" severity="danger" icon="pi pi-times" />;
        }
    };

    // Render student's answer based on question type
    const renderStudentAnswer = (question: QuestionAnswerDetail) => {
        const { questionType, studentAnswer, questionOptions, matchingPairs } = question;

        if (!studentAnswer || studentAnswer.length === 0 || (studentAnswer.length === 1 && !studentAnswer[0])) {
            return <div className="text-500 italic p-3 surface-100 border-round">No answer provided</div>;
        }

        switch (questionType) {
            case 'single_choice_radio':
            case 'single_choice_dropdown':
            case 'multiple_choice':
            case 'picture_choice': {
                const selectedOptions = questionOptions.filter((opt) => studentAnswer.includes(opt.id));
                return (
                    <div className="flex flex-column gap-2">
                        {selectedOptions.map((opt) => (
                            <div key={opt.id} className={`p-3 border-round border-1 ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                <div className="flex align-items-center gap-2">
                                    <Badge value={opt.optionLabel} severity={opt.isCorrect ? 'success' : 'danger'} />
                                    <span className="font-medium">{opt.text}</span>
                                    {opt.isCorrect && viewConfig.showCorrectAnswers && <i className="pi pi-check-circle text-green-600 ml-auto"></i>}
                                </div>
                                {opt.imageUrl && <img src={opt.imageUrl} alt={opt.text} className="mt-2 max-w-15rem border-round" />}
                            </div>
                        ))}
                    </div>
                );
            }

            case 'fill_blanks':
            case 'free_text':
                return (
                    <div className="surface-100 p-3 border-round">
                        <p className="m-0 line-height-3 text-900 white-space-pre-wrap">{studentAnswer[0]}</p>
                    </div>
                );

            case 'matching':
            case 'matching_text':
                // For matching, studentAnswer would be like ["1:A", "2:B", ...]
                return (
                    <div className="flex flex-column gap-2">
                        {studentAnswer.map((match, idx) => {
                            const [leftId, rightValue] = match.split(':');
                            const leftItem = matchingPairs?.find((p) => p.id === leftId);
                            return (
                                <div key={idx} className="flex align-items-center gap-3 p-2 surface-100 border-round">
                                    <span className="font-medium">{leftItem?.left || `Item ${leftId}`}</span>
                                    <i className="pi pi-arrow-right text-500"></i>
                                    <span>{rightValue || leftItem?.right}</span>
                                </div>
                            );
                        })}
                    </div>
                );

            default:
                return (
                    <div className="surface-100 p-3 border-round">
                        <code>{JSON.stringify(studentAnswer)}</code>
                    </div>
                );
        }
    };

    // Render correct answer (for instructors or when permitted)
    const renderCorrectAnswer = (question: QuestionAnswerDetail) => {
        if (!viewConfig.showCorrectAnswers) return null;

        const { questionType, questionOptions, correctOptions, correctText, matchingPairs } = question;

        switch (questionType) {
            case 'single_choice_radio':
            case 'single_choice_dropdown':
            case 'multiple_choice':
            case 'picture_choice': {
                const correctOpts = questionOptions.filter((opt) => opt.isCorrect);
                return (
                    <div className="flex flex-column gap-2">
                        {correctOpts.map((opt) => (
                            <div key={opt.id} className="p-3 border-round border-1 border-green-300 bg-green-50">
                                <div className="flex align-items-center gap-2">
                                    <Badge value={opt.optionLabel} severity="success" />
                                    <span className="font-medium">{opt.text}</span>
                                    <i className="pi pi-check-circle text-green-600 ml-auto"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }

            case 'fill_blanks':
                return (
                    <div className="p-3 border-round border-1 border-green-300 bg-green-50">
                        <span className="font-medium">{correctText}</span>
                    </div>
                );

            case 'free_text':
                return correctText ? (
                    <div className="p-3 border-round border-1 border-green-300 bg-green-50">
                        <h5 className="m-0 mb-2 text-green-800">Model Answer / Key Points:</h5>
                        <p className="m-0 text-700 white-space-pre-wrap">{correctText}</p>
                    </div>
                ) : (
                    <Message severity="info" text="Subjective question - no model answer defined" />
                );

            case 'matching':
            case 'matching_text':
                return (
                    <div className="flex flex-column gap-2">
                        {matchingPairs?.map((pair) => (
                            <div key={pair.id} className="flex align-items-center gap-3 p-2 border-round border-1 border-green-300 bg-green-50">
                                <span className="font-medium">{pair.left}</span>
                                <i className="pi pi-arrow-right text-green-600"></i>
                                <span>{pair.right}</span>
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    // Handle score override submission
    const handleScoreOverrideSubmit = () => {
        if (scoreOverrideDialog.question && onScoreOverride) {
            onScoreOverride(scoreOverrideDialog.question.questionId, scoreOverrideDialog.newScore, scoreOverrideDialog.justification);
        }
        setScoreOverrideDialog({ visible: false, question: null, newScore: 0, justification: '' });
    };

    // Handle feedback submission
    const handleFeedbackSubmit = () => {
        if (feedbackDialog.question && onFeedbackUpdate) {
            onFeedbackUpdate(feedbackDialog.question.questionId, feedbackDialog.feedback);
        }
        setFeedbackDialog({ visible: false, question: null, feedback: '' });
    };

    // Open score override dialog
    const openScoreOverride = (question: QuestionAnswerDetail) => {
        setScoreOverrideDialog({
            visible: true,
            question,
            newScore: question.marksAwarded,
            justification: ''
        });
    };

    // Open feedback dialog
    const openFeedbackDialog = (question: QuestionAnswerDetail) => {
        setFeedbackDialog({
            visible: true,
            question,
            feedback: question.instructorFeedback || ''
        });
    };

    // Question header template for accordion
    const questionHeader = (question: QuestionAnswerDetail, index: number) => {
        const typeConfig = questionTypeDisplayConfig[question.questionType];
        return (
            <div className="flex align-items-center justify-content-between w-full pr-3">
                <div className="flex align-items-center gap-3">
                    <Badge value={question.questionNumber} size="large" severity={question.isCorrect === true ? 'success' : question.isCorrect === 'partial' ? 'warning' : 'danger'} />
                    <div>
                        <div className="flex align-items-center gap-2 mb-1">
                            <i className={`${typeConfig.icon} text-500`}></i>
                            <span className="text-sm text-500">{typeConfig.label}</span>
                        </div>
                        <span className="text-900 font-medium">{question.questionText.length > 80 ? `${question.questionText.substring(0, 80)}...` : question.questionText}</span>
                    </div>
                </div>
                <div className="flex align-items-center gap-3">
                    {getCorrectnessTag(question.isCorrect)}
                    <div className="text-right">
                        <div className="font-bold text-lg text-900">
                            {question.marksAwarded.toFixed(1)} / {question.points}
                        </div>
                        <div className="text-xs text-500">marks</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="question-review-panel">
            {/* Summary Stats */}
            <div className="grid mb-4">
                <div className="col-6 md:col-3">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-green-600">{questions.filter((q) => q.isCorrect === true).length}</div>
                        <div className="text-sm text-600">Correct</div>
                    </Card>
                </div>
                <div className="col-6 md:col-3">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-orange-600">{questions.filter((q) => q.isCorrect === 'partial').length}</div>
                        <div className="text-sm text-600">Partial</div>
                    </Card>
                </div>
                <div className="col-6 md:col-3">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-red-600">{questions.filter((q) => q.isCorrect === false).length}</div>
                        <div className="text-sm text-600">Incorrect</div>
                    </Card>
                </div>
                <div className="col-6 md:col-3">
                    <Card className="text-center">
                        <div className="text-3xl font-bold text-500">{questions.filter((q) => !q.studentAnswer || q.studentAnswer.length === 0).length}</div>
                        <div className="text-sm text-600">Unanswered</div>
                    </Card>
                </div>
            </div>

            {/* Question Accordion */}
            <Accordion
                multiple
                activeIndex={expandedQuestionId ? [questions.findIndex((q) => q.questionId === expandedQuestionId)] : []}
                onTabChange={(e) => {
                    const index = Array.isArray(e.index) ? e.index[e.index.length - 1] : e.index;
                    onExpandQuestion?.(index !== undefined ? questions[index]?.questionId : null);
                }}
            >
                {questions.map((question, index) => (
                    <AccordionTab
                        key={question.questionId}
                        header={questionHeader(question, index)}
                        headerClassName={`${question.isCorrect === true ? 'border-left-3 border-green-500' : question.isCorrect === 'partial' ? 'border-left-3 border-orange-500' : 'border-left-3 border-red-500'}`}
                    >
                        <div className="p-3">
                            {/* Question Image */}
                            {question.imageUrl && (
                                <div className="mb-4">
                                    <img src={question.imageUrl} alt="Question" className="max-w-full border-round shadow-1" style={{ maxHeight: '300px' }} />
                                </div>
                            )}

                            {/* Full Question Text */}
                            <div className="mb-4">
                                <h4 className="m-0 mb-2 text-700">Question</h4>
                                <p className="m-0 text-900 line-height-3 text-lg">{question.questionText}</p>
                            </div>

                            <div className="grid">
                                {/* Student Answer */}
                                <div className={viewConfig.showCorrectAnswers ? 'col-12 lg:col-6' : 'col-12'}>
                                    <h4 className="m-0 mb-2 text-700">
                                        <i className="pi pi-user mr-2"></i>
                                        Student&apos;s Answer
                                    </h4>
                                    {renderStudentAnswer(question)}
                                </div>

                                {/* Correct Answer */}
                                {viewConfig.showCorrectAnswers && (
                                    <div className="col-12 lg:col-6">
                                        <h4 className="m-0 mb-2 text-green-700">
                                            <i className="pi pi-check mr-2"></i>
                                            Correct Answer
                                        </h4>
                                        {renderCorrectAnswer(question)}
                                    </div>
                                )}
                            </div>

                            {/* Explanation */}
                            {viewConfig.showCorrectAnswers && question.explanation && (
                                <div className="mt-4">
                                    <h4 className="m-0 mb-2 text-700">
                                        <i className="pi pi-info-circle mr-2"></i>
                                        Explanation
                                    </h4>
                                    <div className="surface-100 p-3 border-round">
                                        <p className="m-0 text-700 line-height-3">{question.explanation}</p>
                                    </div>
                                </div>
                            )}

                            {/* Instructor Feedback */}
                            {question.instructorFeedback && (
                                <div className="mt-4">
                                    <h4 className="m-0 mb-2 text-blue-700">
                                        <i className="pi pi-comment mr-2"></i>
                                        Instructor Feedback
                                    </h4>
                                    <div className="surface-100 p-3 border-round border-left-3 border-blue-500">
                                        <p className="m-0 text-700 line-height-3">{question.instructorFeedback}</p>
                                        {question.feedbackAddedBy && question.feedbackAddedAt && (
                                            <p className="m-0 mt-2 text-xs text-500">
                                                — {question.feedbackAddedBy.firstName} {question.feedbackAddedBy.lastName},{new Date(question.feedbackAddedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Divider />

                            {/* Grading Section */}
                            <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3">
                                <div className="flex align-items-center gap-4">
                                    <div>
                                        <span className="text-600">Points:</span>
                                        <span className="ml-2 text-xl font-bold text-900">
                                            {question.marksAwarded.toFixed(1)} / {question.points}
                                        </span>
                                    </div>
                                    <Tag value={question.autoGraded ? 'Auto-Graded' : 'Needs Manual Grading'} severity={question.autoGraded ? 'success' : 'warning'} icon={question.autoGraded ? 'pi pi-bolt' : 'pi pi-pencil'} />
                                </div>

                                {/* Grading Actions */}
                                {viewConfig.canEditScores && (
                                    <div className="flex gap-2">
                                        <Button label="Override Score" icon="pi pi-calculator" className="p-button-outlined p-button-sm" onClick={() => openScoreOverride(question)} />
                                        <Button label={question.instructorFeedback ? 'Edit Feedback' : 'Add Feedback'} icon="pi pi-comment" className="p-button-outlined p-button-sm p-button-info" onClick={() => openFeedbackDialog(question)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </AccordionTab>
                ))}
            </Accordion>

            {/* Score Override Dialog */}
            <Dialog
                visible={scoreOverrideDialog.visible}
                onHide={() => setScoreOverrideDialog({ visible: false, question: null, newScore: 0, justification: '' })}
                header="Override Score"
                style={{ width: '500px' }}
                modal
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-outlined" onClick={() => setScoreOverrideDialog({ visible: false, question: null, newScore: 0, justification: '' })} />
                        <Button label="Apply Override" icon="pi pi-check" onClick={handleScoreOverrideSubmit} disabled={!scoreOverrideDialog.justification || scoreOverrideDialog.justification.length < 10} />
                    </div>
                }
            >
                {scoreOverrideDialog.question && (
                    <div>
                        <Message severity="warn" className="w-full mb-4" text="Score overrides are recorded in the audit trail. Please provide a clear justification." />

                        <div className="field mb-4">
                            <label className="block mb-2 font-semibold">New Score</label>
                            <div className="flex align-items-center gap-3">
                                <InputNumber
                                    value={scoreOverrideDialog.newScore}
                                    onValueChange={(e) =>
                                        setScoreOverrideDialog((prev) => ({
                                            ...prev,
                                            newScore: e.value ?? 0
                                        }))
                                    }
                                    min={0}
                                    max={scoreOverrideDialog.question.points}
                                    minFractionDigits={1}
                                    maxFractionDigits={1}
                                    className="w-6rem"
                                />
                                <span className="text-600">/ {scoreOverrideDialog.question.points} points</span>
                            </div>
                            <small className="text-500">Current: {scoreOverrideDialog.question.marksAwarded.toFixed(1)} points</small>
                        </div>

                        <div className="field">
                            <label className="block mb-2 font-semibold">
                                Justification <span className="text-red-500">*</span>
                            </label>
                            <InputTextarea
                                value={scoreOverrideDialog.justification}
                                onChange={(e) =>
                                    setScoreOverrideDialog((prev) => ({
                                        ...prev,
                                        justification: e.target.value
                                    }))
                                }
                                rows={3}
                                className="w-full"
                                placeholder="Explain the reason for this score change (min. 10 characters)"
                            />
                            <small className={scoreOverrideDialog.justification.length < 10 ? 'text-red-500' : 'text-500'}>{scoreOverrideDialog.justification.length}/10 characters minimum</small>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Feedback Dialog */}
            <Dialog
                visible={feedbackDialog.visible}
                onHide={() => setFeedbackDialog({ visible: false, question: null, feedback: '' })}
                header={feedbackDialog.question?.instructorFeedback ? 'Edit Feedback' : 'Add Feedback'}
                style={{ width: '600px' }}
                modal
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-outlined" onClick={() => setFeedbackDialog({ visible: false, question: null, feedback: '' })} />
                        <Button label="Save Feedback" icon="pi pi-check" onClick={handleFeedbackSubmit} />
                    </div>
                }
            >
                {feedbackDialog.question && (
                    <div>
                        <div className="surface-100 p-3 border-round mb-4">
                            <p className="m-0 text-700 font-medium">
                                Q{feedbackDialog.question.questionNumber}: {feedbackDialog.question.questionText.substring(0, 100)}...
                            </p>
                        </div>

                        <div className="field">
                            <label className="block mb-2 font-semibold">Feedback for Student</label>
                            <InputTextarea
                                value={feedbackDialog.feedback}
                                onChange={(e) =>
                                    setFeedbackDialog((prev) => ({
                                        ...prev,
                                        feedback: e.target.value
                                    }))
                                }
                                rows={5}
                                className="w-full"
                                placeholder="Provide constructive feedback on the student's answer..."
                            />
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default QuestionReviewPanel;
