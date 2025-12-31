'use client';

import React from 'react';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { ProgressBar } from 'primereact/progressbar';
import { Tooltip } from 'primereact/tooltip';

import { AttemptSummaryPanelProps, attemptStatusConfig } from '@/lib/lms/quiz-review-types';

/**
 * AttemptSummaryPanel - Displays key information about the quiz attempt
 *
 * Shows:
 * - Student identity
 * - Quiz/course information
 * - Score and pass/fail status
 * - Time information
 * - Attempt metadata
 */
const AttemptSummaryPanel: React.FC<AttemptSummaryPanelProps> = ({ data, viewConfig }) => {
    const statusConfig = attemptStatusConfig[data.status];

    // Format duration
    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }
        return `${minutes}m ${secs}s`;
    };

    // Format date
    const formatDateTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate time usage percentage
    const timeUsagePercent = Math.min(100, Math.round((data.timeSpent / data.timeAllocated) * 100));

    return (
        <div className="grid">
            {/* Student & Quiz Info */}
            <div className="col-12 lg:col-4">
                <Card className="h-full">
                    <div className="flex flex-column align-items-center text-center">
                        <Avatar
                            image={data.student.photoLink}
                            icon={!data.student.photoLink ? 'pi pi-user' : undefined}
                            size="xlarge"
                            shape="circle"
                            className="mb-3"
                            style={{ backgroundColor: 'var(--primary-color)', color: 'white', width: '80px', height: '80px' }}
                        />
                        <h3 className="text-xl font-semibold text-900 m-0 mb-1">
                            {data.student.firstName} {data.student.lastName}
                        </h3>
                        {viewConfig.showOtherStudentData && data.student.email && <p className="text-500 text-sm m-0 mb-3">{data.student.email}</p>}

                        <Divider className="w-full" />

                        <div className="w-full text-left">
                            <div className="flex justify-content-between mb-2">
                                <span className="text-600">Quiz</span>
                                <span className="font-medium text-900">{data.quiz.title}</span>
                            </div>
                            {data.subject && (
                                <div className="flex justify-content-between mb-2">
                                    <span className="text-600">Subject</span>
                                    <span className="font-medium text-900">{data.subject.name}</span>
                                </div>
                            )}
                            <div className="flex justify-content-between mb-2">
                                <span className="text-600">Type</span>
                                <Tag value={data.quiz.quizType} className="capitalize" />
                            </div>
                            <div className="flex justify-content-between">
                                <span className="text-600">Attempt</span>
                                <span className="font-medium text-900">
                                    #{data.attemptNumber} of {data.quiz.maxAttempts}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Score & Status */}
            <div className="col-12 lg:col-4">
                <Card className="h-full">
                    <div className="text-center">
                        {/* Score Display */}
                        <div className="relative inline-flex align-items-center justify-content-center mb-3">
                            <div className={`flex align-items-center justify-content-center border-circle ${data.passed ? 'bg-green-100' : 'bg-red-100'}`} style={{ width: '120px', height: '120px' }}>
                                <div>
                                    <div className={`text-3xl font-bold ${data.passed ? 'text-green-600' : 'text-red-600'}`}>{data.score.toFixed(1)}</div>
                                    <div className="text-500 text-sm">/ {data.totalMarks}</div>
                                </div>
                            </div>
                        </div>

                        {/* Percentage */}
                        <div className="mb-3">
                            <div className="text-4xl font-bold text-900 mb-1">{data.percentage}%</div>
                            <Tag value={data.passed ? 'PASSED' : 'NOT PASSED'} severity={data.passed ? 'success' : 'danger'} className="px-3" />
                        </div>

                        {/* Pass threshold info */}
                        <div className="text-sm text-600">
                            Passing: {data.passingMarks} marks ({Math.round((data.passingMarks / data.totalMarks) * 100)}%)
                        </div>

                        <Divider />

                        {/* Status */}
                        <div className="flex align-items-center justify-content-center gap-2">
                            <i className={statusConfig.icon}></i>
                            <Tag value={statusConfig.label} severity={statusConfig.severity} />
                        </div>

                        {/* Grading info */}
                        {data.gradedAt && data.gradedBy && (
                            <div className="mt-3 text-sm text-600">
                                <div>
                                    Graded by: {data.gradedBy.firstName} {data.gradedBy.lastName}
                                </div>
                                <div>on {formatDateTime(data.gradedAt)}</div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Time & Metadata */}
            <div className="col-12 lg:col-4">
                <Card className="h-full">
                    <h4 className="text-lg font-semibold text-900 mt-0 mb-4">
                        <i className="pi pi-clock mr-2"></i>
                        Time Information
                    </h4>

                    <div className="mb-4">
                        <div className="flex justify-content-between mb-2">
                            <span className="text-600">Started</span>
                            <span className="font-medium text-900">{formatDateTime(data.startedAt)}</span>
                        </div>
                        {data.submittedAt && (
                            <div className="flex justify-content-between mb-2">
                                <span className="text-600">Submitted</span>
                                <span className="font-medium text-900">{formatDateTime(data.submittedAt)}</span>
                            </div>
                        )}
                    </div>

                    <Divider />

                    {/* Time spent vs allocated */}
                    <div className="mb-3">
                        <div className="flex justify-content-between mb-2">
                            <span className="text-600">Time Spent</span>
                            <span className="font-bold text-900">{formatDuration(data.timeSpent)}</span>
                        </div>
                        <div className="flex justify-content-between mb-2">
                            <span className="text-600">Time Allowed</span>
                            <span className="text-900">{formatDuration(data.timeAllocated)}</span>
                        </div>
                    </div>

                    {/* Time usage bar */}
                    <div className="mb-3">
                        <Tooltip target=".time-usage-bar" content={`Used ${timeUsagePercent}% of allocated time`} />
                        <ProgressBar
                            value={timeUsagePercent}
                            showValue={false}
                            className="time-usage-bar"
                            style={{ height: '8px' }}
                            color={timeUsagePercent > 90 ? 'var(--red-500)' : timeUsagePercent > 75 ? 'var(--orange-500)' : 'var(--green-500)'}
                        />
                        <div className="text-center text-sm text-500 mt-1">{timeUsagePercent}% of time used</div>
                    </div>

                    {/* Additional stats */}
                    <Divider />
                    <div className="grid">
                        <div className="col-6 text-center">
                            <div className="text-2xl font-bold text-primary">{data.questions.length}</div>
                            <div className="text-sm text-600">Questions</div>
                        </div>
                        <div className="col-6 text-center">
                            <div className="text-2xl font-bold text-primary">{data.questions.filter((q) => q.studentAnswer.length > 0).length}</div>
                            <div className="text-sm text-600">Answered</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Overall Feedback (if exists) */}
            {data.overallFeedback && (
                <div className="col-12">
                    <Card>
                        <h4 className="text-lg font-semibold text-900 mt-0 mb-3">
                            <i className="pi pi-comment mr-2"></i>
                            Instructor Feedback
                        </h4>
                        <div className="surface-100 border-round p-3">
                            <p className="m-0 line-height-3 text-700">{data.overallFeedback}</p>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AttemptSummaryPanel;
