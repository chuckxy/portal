'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from 'primereact/card';
import { DataTable, DataTableExpandedRows } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Badge } from 'primereact/badge';
import { Toolbar } from 'primereact/toolbar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';

import { QuizAttemptReview } from '@/components/quiz-review';
import { ReviewerRole, attemptStatusConfig, gradingStatusConfig } from '@/lib/lms/quiz-review-types';
import { useAuth } from '@/context/AuthContext';
import { PersonCategory } from '@/models/Person';

interface QuizAttemptListItem {
    _id: string;
    attemptNumber: number;
    status: string;
    gradingStatus: string;
    score: number;
    totalMarks: number;
    percentage: number;
    passed: boolean;
    startedAt: string;
    submittedAt?: string;
    timeSpent: number;
    violationCount: number;
    student: {
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
        photoLink?: string;
    };
    quiz: {
        _id: string;
        title: string;
        quizType: string;
    };
    subject?: {
        _id: string;
        name: string;
        code: string;
    };
}

interface StudentQuizGroup {
    groupId: string; // composite key: studentId_quizId
    studentId: string;
    quizId: string;
    student: {
        _id: string;
        firstName: string;
        lastName: string;
        email?: string;
        photoLink?: string;
    };
    quiz: {
        _id: string;
        title: string;
        quizType: string;
    };
    totalAttempts: number;
    passedAttempts: number;
    failedAttempts: number;
    pendingGrading: number;
    totalViolations: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    lastAttemptDate: string;
    passed: boolean;
    attempts: QuizAttemptListItem[];
}

interface QuizOption {
    _id: string;
    title: string;
}

const QuizReviewPage = () => {
    const toast = useRef<Toast>(null);

    // State
    const [loading, setLoading] = useState(true);
    const [attempts, setAttempts] = useState<QuizAttemptListItem[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptListItem | null>(null);
    const [reviewDialogVisible, setReviewDialogVisible] = useState(false);
    const [expandedRows, setExpandedRows] = useState<DataTableExpandedRows | undefined>(undefined);

    // Filters
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [gradingStatusFilter, setGradingStatusFilter] = useState<string | null>(null);
    const [quizFilter, setQuizFilter] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<Date[] | null>(null);

    // Quiz options for filter
    const [quizOptions, setQuizOptions] = useState<QuizOption[]>([]);

    // Current user role (would come from auth context in real app)
    const [currentUserRole, setCurrentUserRole] = useState<PersonCategory>('teacher');
    const [currentUserId, setCurrentUserId] = useState('current-user-id');
    const { user } = useAuth();

    // Status filter options
    const statusOptions = Object.entries(attemptStatusConfig)
        .filter(([status]) => status !== 'in_progress')
        .map(([value, config]) => ({
            value,
            label: config.label
        }));

    // Grading status filter options
    const gradingStatusOptions = Object.entries(gradingStatusConfig).map(([value, config]) => ({
        value,
        label: config.label
    }));

    // Group attempts by student + quiz combination
    const studentQuizGroups = useMemo((): StudentQuizGroup[] => {
        const groupMap = new Map<string, StudentQuizGroup>();

        attempts.forEach((attempt) => {
            const studentId = attempt.student._id;
            const quizId = attempt.quiz._id;
            const groupId = `${studentId}_${quizId}`;

            if (!groupMap.has(groupId)) {
                groupMap.set(groupId, {
                    groupId,
                    studentId,
                    quizId,
                    student: attempt.student,
                    quiz: attempt.quiz,
                    totalAttempts: 0,
                    passedAttempts: 0,
                    failedAttempts: 0,
                    pendingGrading: 0,
                    totalViolations: 0,
                    bestScore: 0,
                    latestScore: 0,
                    averageScore: 0,
                    lastAttemptDate: attempt.startedAt,
                    passed: false,
                    attempts: []
                });
            }

            const group = groupMap.get(groupId)!;
            group.attempts.push(attempt);
            group.totalAttempts++;
            group.totalViolations += attempt.violationCount;
            group.bestScore = Math.max(group.bestScore, attempt.percentage);
            group.latestScore = attempt.percentage;

            if (attempt.passed) {
                group.passedAttempts++;
                group.passed = true;
            } else {
                group.failedAttempts++;
            }

            if (attempt.gradingStatus === 'pending') {
                group.pendingGrading++;
            }

            if (new Date(attempt.startedAt) > new Date(group.lastAttemptDate)) {
                group.lastAttemptDate = attempt.startedAt;
            }
        });

        // Calculate averages and sort attempts
        groupMap.forEach((group) => {
            const totalScore = group.attempts.reduce((sum, a) => sum + a.percentage, 0);
            group.averageScore = group.totalAttempts > 0 ? totalScore / group.totalAttempts : 0;
            // Sort attempts by date descending
            group.attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        });

        // Convert to array and sort by last attempt date descending
        return Array.from(groupMap.values()).sort((a, b) => new Date(b.lastAttemptDate).getTime() - new Date(a.lastAttemptDate).getTime());
    }, [attempts]);

    // Get unique students count
    const uniqueStudentsCount = useMemo(() => {
        return new Set(studentQuizGroups.map((g) => g.studentId)).size;
    }, [studentQuizGroups]);

    // Fetch quiz attempts
    const fetchAttempts = async () => {
        if (!user) return; // Wait for user to be loaded

        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('limit', '500'); // Fetch more for grouping

            // If current user is a student, only fetch their own attempts
            if (user.personCategory === 'student') {
                params.append('userId', user._id);
            }

            if (globalFilter) params.append('search', globalFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (gradingStatusFilter) params.append('gradingStatus', gradingStatusFilter);
            if (quizFilter) params.append('quizId', quizFilter);
            if (dateRange?.[0]) params.append('startDate', dateRange[0].toISOString());
            if (dateRange?.[1]) params.append('endDate', dateRange[1].toISOString());
            console.log(params);
            const response = await fetch(`/api/lms/quiz-attempts?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setAttempts(data.data);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to fetch quiz attempts',
                    life: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching attempts:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to fetch quiz attempts',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch quiz options for filter
    const fetchQuizOptions = async () => {
        try {
            const response = await fetch('/api/lms/quizzes?limit=100');
            const data = await response.json();
            if (data.success) {
                setQuizOptions(
                    data.data.map((quiz: any) => ({
                        _id: quiz._id,
                        title: quiz.title
                    }))
                );
            }
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchAttempts();
            fetchQuizOptions();
        }
    }, [user, statusFilter, gradingStatusFilter, quizFilter, dateRange]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (globalFilter !== undefined && user) {
                fetchAttempts();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [globalFilter, user]);
    useEffect(() => {
        if (user) {
            setCurrentUserId(user._id);

            setCurrentUserRole(user.personCategory);
        }
    }, [user]);

    // Open review dialog
    const openReviewDialog = (attempt: QuizAttemptListItem) => {
        setSelectedAttempt(attempt);
        setReviewDialogVisible(true);
    };

    // Handle grade updated
    const handleGradeUpdated = (attemptId: string) => {
        fetchAttempts();
        toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Grades updated successfully',
            life: 3000
        });
    };

    // Clear filters
    const clearFilters = () => {
        setGlobalFilter('');
        setStatusFilter(null);
        setGradingStatusFilter(null);
        setQuizFilter(null);
        setDateRange(null);
    };

    // Student column template
    const studentBodyTemplate = (rowData: StudentQuizGroup) => (
        <div className="flex align-items-center gap-3">
            <Avatar image={rowData.student.photoLink} icon={!rowData.student.photoLink ? 'pi pi-user' : undefined} size="large" shape="circle" className="bg-primary" />
            <div>
                <div className="font-semibold">
                    {rowData.student.firstName} {rowData.student.lastName}
                </div>
                {rowData.student.email && <small className="text-500">{rowData.student.email}</small>}
            </div>
        </div>
    );

    // Quiz column template
    const quizBodyTemplate = (rowData: StudentQuizGroup) => (
        <div className="flex align-items-center gap-2">
            <i className="pi pi-book text-primary"></i>
            <div>
                <div className="font-semibold">{rowData.quiz.title}</div>
                <small className="text-500">{rowData.quiz.quizType}</small>
            </div>
        </div>
    );

    // Attempts stats template
    const attemptsStatsTemplate = (rowData: StudentQuizGroup) => (
        <div className="flex gap-2">
            <div className="text-center">
                <div className="text-lg font-bold text-primary">{rowData.totalAttempts}</div>
                <small className="text-500">Attempts</small>
            </div>
            <Divider layout="vertical" />
            <div className="text-center">
                <div className="text-lg font-bold text-green-600">{rowData.passedAttempts}</div>
                <small className="text-500">Passed</small>
            </div>
            <Divider layout="vertical" />
            <div className="text-center">
                <div className="text-lg font-bold text-red-600">{rowData.failedAttempts}</div>
                <small className="text-500">Failed</small>
            </div>
        </div>
    );

    // Score template
    const scoreBodyTemplate = (rowData: StudentQuizGroup) => (
        <div className="flex flex-column gap-1">
            <div className="flex align-items-center gap-2">
                <span className="text-500 text-sm">Best:</span>
                <span className="font-bold text-green-600">{rowData.bestScore.toFixed(1)}%</span>
            </div>
            <div className="flex align-items-center gap-2">
                <span className="text-500 text-sm">Avg:</span>
                <span className="font-medium">{rowData.averageScore.toFixed(1)}%</span>
            </div>
        </div>
    );

    // Status template
    const statusBodyTemplate = (rowData: StudentQuizGroup) => <Tag value={rowData.passed ? 'Passed' : 'Not Passed'} severity={rowData.passed ? 'success' : 'danger'} icon={rowData.passed ? 'pi pi-check' : 'pi pi-times'} />;

    // Grading status template
    const gradingBodyTemplate = (rowData: StudentQuizGroup) => (
        <div>{rowData.pendingGrading > 0 ? <Tag value={`${rowData.pendingGrading} pending`} severity="warning" icon="pi pi-clock" /> : <Tag value="Graded" severity="success" icon="pi pi-check" />}</div>
    );

    // Violations template
    const violationsBodyTemplate = (rowData: StudentQuizGroup) => <Badge value={rowData.totalViolations} severity={rowData.totalViolations > 5 ? 'danger' : rowData.totalViolations > 0 ? 'warning' : 'success'} />;

    // Last activity template
    const lastActivityBodyTemplate = (rowData: StudentQuizGroup) => (
        <div>
            <div>{new Date(rowData.lastAttemptDate).toLocaleDateString()}</div>
            <small className="text-500">{new Date(rowData.lastAttemptDate).toLocaleTimeString()}</small>
        </div>
    );

    // Expanded row content - shows all attempts for this student+quiz combination
    const rowExpansionTemplate = (data: StudentQuizGroup) => (
        <div className="p-3 surface-100">
            <div className="flex justify-content-between align-items-center mb-3">
                <h5 className="m-0 flex align-items-center gap-2">
                    <i className="pi pi-list text-primary"></i>
                    Attempts History
                </h5>
                <div className="flex gap-3">
                    <div className="flex align-items-center gap-2">
                        <span className="text-500">Best Score:</span>
                        <Badge value={`${data.bestScore.toFixed(1)}%`} severity="success" />
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="text-500">Average:</span>
                        <Badge value={`${data.averageScore.toFixed(1)}%`} />
                    </div>
                </div>
            </div>
            <DataTable value={data.attempts} responsiveLayout="scroll" className="p-datatable-sm" stripedRows size="small">
                <Column field="attemptNumber" header="Attempt #" body={(row) => <Badge value={`#${row.attemptNumber}`} className="text-sm" />} style={{ width: '100px' }} />
                <Column
                    header="Score"
                    body={(row) => (
                        <div className="flex align-items-center gap-2">
                            <span className="font-bold">
                                {row.score.toFixed(1)}/{row.totalMarks}
                            </span>
                            <span className="text-500">({row.percentage.toFixed(1)}%)</span>
                            <Tag value={row.passed ? 'Pass' : 'Fail'} severity={row.passed ? 'success' : 'danger'} className="text-xs" />
                        </div>
                    )}
                    style={{ width: '200px' }}
                />
                <Column
                    field="status"
                    header="Status"
                    body={(row) => {
                        const config = attemptStatusConfig[row.status as keyof typeof attemptStatusConfig];
                        return <Tag value={config?.label || row.status} severity={config?.severity || 'info'} icon={config?.icon} className="text-xs" />;
                    }}
                    style={{ width: '120px' }}
                />
                <Column
                    field="gradingStatus"
                    header="Grading"
                    body={(row) => {
                        const config = gradingStatusConfig[row.gradingStatus as keyof typeof gradingStatusConfig];
                        return <Tag value={config?.label || row.gradingStatus} severity={config?.severity || 'info'} icon={config?.icon} className="text-xs" />;
                    }}
                    style={{ width: '120px' }}
                />
                <Column header="Violations" body={(row) => <Badge value={row.violationCount} severity={row.violationCount > 0 ? 'warning' : 'success'} />} style={{ width: '90px' }} />
                <Column
                    header="Time Spent"
                    body={(row) => {
                        const mins = Math.floor(row.timeSpent / 60);
                        const secs = row.timeSpent % 60;
                        return (
                            <span>
                                {mins}m {secs}s
                            </span>
                        );
                    }}
                    style={{ width: '100px' }}
                />
                <Column
                    field="startedAt"
                    header="Date"
                    body={(row) => (
                        <div>
                            <div className="text-sm">{new Date(row.startedAt).toLocaleDateString()}</div>
                            <small className="text-500">{new Date(row.startedAt).toLocaleTimeString()}</small>
                        </div>
                    )}
                    style={{ width: '130px' }}
                />
                <Column
                    header="Actions"
                    body={(row) => <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-sm" tooltip="Review Attempt" tooltipOptions={{ position: 'top' }} onClick={() => openReviewDialog(row)} />}
                    style={{ width: '70px' }}
                />
            </DataTable>
        </div>
    );

    // Toolbar templates
    const leftToolbarTemplate = () => (
        <div className="flex flex-wrap gap-2 align-items-center">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search students..." className="w-14rem" />
            </span>
            <Dropdown value={quizFilter} options={quizOptions} optionLabel="title" optionValue="_id" onChange={(e) => setQuizFilter(e.value)} placeholder="All Quizzes" className="w-12rem" showClear />
            <Dropdown value={statusFilter} options={statusOptions} optionLabel="label" optionValue="value" onChange={(e) => setStatusFilter(e.value)} placeholder="All Statuses" className="w-10rem" showClear />
            <Dropdown value={gradingStatusFilter} options={gradingStatusOptions} optionLabel="label" optionValue="value" onChange={(e) => setGradingStatusFilter(e.value)} placeholder="All Grading" className="w-10rem" showClear />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <Calendar value={dateRange} onChange={(e) => setDateRange(e.value as Date[])} selectionMode="range" readOnlyInput placeholder="Date Range" className="w-14rem" showButtonBar />
            <Button icon="pi pi-filter-slash" className="p-button-outlined" tooltip="Clear Filters" onClick={clearFilters} disabled={!globalFilter && !statusFilter && !gradingStatusFilter && !quizFilter && !dateRange} />
            <Button icon="pi pi-refresh" className="p-button-outlined" tooltip="Refresh" onClick={fetchAttempts} />
        </div>
    );

    return (
        <div className="quiz-review-page">
            <Toast ref={toast} />

            <Card>
                <div className="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="m-0 mb-1">Quiz Attempt Reviews</h2>
                        <p className="m-0 text-500">Review and grade student quiz attempts grouped by student and quiz</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-users text-primary"></i>
                            <Badge value={`${uniqueStudentsCount} students`} severity="info" />
                        </div>
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-book text-primary"></i>
                            <Badge value={`${studentQuizGroups.length} groups`} />
                        </div>
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-list text-primary"></i>
                            <Badge value={`${attempts.length} attempts`} />
                        </div>
                    </div>
                </div>

                <Toolbar className="mb-4" start={leftToolbarTemplate} end={rightToolbarTemplate} />

                {loading && attempts.length === 0 ? (
                    <div className="flex justify-content-center align-items-center p-5">
                        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                    </div>
                ) : (
                    <DataTable
                        value={studentQuizGroups}
                        expandedRows={expandedRows}
                        onRowToggle={(e) => setExpandedRows(e.data as DataTableExpandedRows)}
                        rowExpansionTemplate={rowExpansionTemplate}
                        dataKey="groupId"
                        loading={loading}
                        emptyMessage="No quiz attempts found"
                        responsiveLayout="scroll"
                        stripedRows
                        className="p-datatable-sm"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                    >
                        <Column expander style={{ width: '3rem' }} />
                        <Column header="Student" body={studentBodyTemplate} style={{ minWidth: '200px' }} />
                        <Column header="Quiz" body={quizBodyTemplate} style={{ minWidth: '180px' }} />
                        <Column header="Attempts" body={attemptsStatsTemplate} style={{ minWidth: '180px' }} />
                        <Column header="Scores" body={scoreBodyTemplate} style={{ width: '120px' }} />
                        <Column header="Status" body={statusBodyTemplate} style={{ width: '110px' }} />
                        <Column header="Grading" body={gradingBodyTemplate} style={{ width: '110px' }} />
                        <Column header="Violations" body={violationsBodyTemplate} style={{ width: '90px' }} />
                        <Column header="Last Activity" body={lastActivityBodyTemplate} style={{ width: '130px' }} />
                    </DataTable>
                )}
            </Card>

            {/* Review Dialog */}
            <Dialog
                visible={reviewDialogVisible}
                onHide={() => setReviewDialogVisible(false)}
                header={selectedAttempt ? `Review: ${selectedAttempt.student.firstName} ${selectedAttempt.student.lastName} - ${selectedAttempt.quiz.title}` : 'Quiz Attempt Review'}
                style={{ width: '95vw', maxWidth: '1400px' }}
                maximizable
                modal
                className="quiz-review-dialog"
            >
                {selectedAttempt && <QuizAttemptReview attemptId={selectedAttempt._id} role={currentUserRole} currentUserId={currentUserId} onClose={() => setReviewDialogVisible(false)} onGradeUpdated={handleGradeUpdated} />}
            </Dialog>
        </div>
    );
};

export default QuizReviewPage;
