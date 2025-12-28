'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Dialog } from 'primereact/dialog';
import { Chart } from 'primereact/chart';
import { ProgressBar } from 'primereact/progressbar';
import { Panel } from 'primereact/panel';
import { TabView, TabPanel } from 'primereact/tabview';
import { Timeline } from 'primereact/timeline';
import { useRouter } from 'next/navigation';
import AcademicTranscript from './AcademicTranscript';

interface StudentDashboardProps {
    studentId: string;
}

interface DashboardData {
    student: any;
    academicInfo: any;
    guardian: any;
    performance: any;
    attendance: any;
    recentExamScores: any[];
    allExamScores: any[];
    financial?: {
        accountBalance: number;
        totalFeesRequired: number;
        totalFeesPaid: number;
        outstandingBalance: number;
        percentagePaid: number;
        paymentDeadline?: Date;
        daysOverdue?: number;
        lastPaymentDate?: Date;
        lastPaymentAmount?: number;
        paymentHistory: any[];
        scholarships: any[];
        feeBreakdown: any[];
    };
}

export default function StudentDashboard({ studentId }: StudentDashboardProps) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedExamScore, setSelectedExamScore] = useState<any>(null);
    const [showDetailDialog, setShowDetailDialog] = useState(false);
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (studentId) {
            loadDashboardData();
        } else {
            setError('Student ID is required');
            setLoading(false);
        }
    }, [studentId]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!studentId || studentId === 'undefined') {
                setError('Invalid student ID');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/students/dashboard?studentId=${studentId}`);
            const data = await response.json();

            if (data.success) {
                setDashboardData(data.data);
            } else {
                setError(data.message || 'Failed to load dashboard data');
            }
        } catch (err: any) {
            console.error('Error loading dashboard:', err);
            setError('An error occurred while loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (examScore: any) => {
        setSelectedExamScore(examScore);
        setShowDetailDialog(true);
    };

    const getGradeColor = (grade: string) => {
        const colors: any = {
            A: 'success',
            B: 'info',
            C: 'warning',
            D: 'warning',
            E: 'danger',
            F: 'danger'
        };
        return colors[grade] || 'info';
    };

    const getConductColor = (conduct: string) => {
        const colors: any = {
            excellent: 'success',
            very_good: 'info',
            good: 'primary',
            satisfactory: 'warning',
            needs_improvement: 'danger'
        };
        return colors[conduct] || 'info';
    };

    const getConductLabel = (conduct: string) => {
        return conduct?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A';
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(amount);
    };

    const getPaymentStatusSeverity = (percentagePaid: number) => {
        if (percentagePaid >= 75) return 'success';
        if (percentagePaid >= 50) return 'info';
        if (percentagePaid >= 25) return 'warning';
        return 'danger';
    };

    const gradeTemplate = (rowData: any) => {
        return <Tag value={rowData.grade} severity={getGradeColor(rowData.grade)} />;
    };

    const termTemplate = (rowData: any) => {
        return (
            <div>
                <div className="font-semibold">{rowData.academicYear}</div>
                <small className="text-500">Term {rowData.academicTerm}</small>
            </div>
        );
    };

    const averageTemplate = (rowData: any) => {
        return (
            <div className="flex align-items-center gap-2">
                <span className="font-bold text-xl">{rowData.overallAverage?.toFixed(1)}%</span>
                {rowData.overallPosition && <Tag value={`#${rowData.overallPosition}`} severity="info" />}
            </div>
        );
    };

    const actionTemplate = (rowData: any) => {
        return <Button label="View Details" icon="pi pi-eye" size="small" outlined onClick={() => handleViewDetails(rowData)} />;
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <Skeleton width="100%" height="150px" className="mb-3" />
                        <Skeleton width="100%" height="200px" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="error" text={error} />
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="warn" text="No dashboard data available" />
                </div>
            </div>
        );
    }

    // Prepare chart data
    const gradeChartData = {
        labels: Object.keys(dashboardData.performance.gradeDistribution),
        datasets: [
            {
                label: 'Grade Distribution',
                data: Object.values(dashboardData.performance.gradeDistribution),
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f59e0b', '#ef4444', '#dc2626']
            }
        ]
    };

    const performanceTrendData = {
        labels: dashboardData.recentExamScores.map((s: any) => `${s.academicYear} T${s.academicTerm}`).reverse(),
        datasets: [
            {
                label: 'Overall Average',
                data: dashboardData.recentExamScores.map((s: any) => s.overallAverage).reverse(),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    return (
        <div className="grid">
            {/* Welcome Section */}
            <div className="col-12">
                <Card>
                    <div className="flex align-items-center gap-4">
                        {dashboardData.student.photoLink ? (
                            <img src={dashboardData.student.photoLink} alt={dashboardData.student.fullName} className="w-6rem h-6rem border-circle border-3 border-white" />
                        ) : (
                            <div className="w-6rem h-6rem border-circle bg-white-alpha-30 flex align-items-center justify-content-center">
                                <i className="pi pi-user text-5xl"></i>
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="m-0 mb-2">{dashboardData.student.fullName}</h2>
                            <div className="flex flex-wrap gap-3 align-items-center">
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-id-card"></i>
                                    <span>ID: {dashboardData.student.studentId || 'N/A'}</span>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-building"></i>
                                    <span>{dashboardData.academicInfo.currentClass?.name || 'No Class'}</span>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-calendar"></i>
                                    <span>
                                        {dashboardData.academicInfo.currentAcademicYear} - Term {dashboardData.academicInfo.currentAcademicTerm}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tab Navigation */}
            <div className="col-12">
                <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
                    {/* Overview Tab */}
                    <TabPanel header="Dashboard Overview" leftIcon="pi pi-home mr-2">
                        <div className="grid">
                            {/* Statistics Cards */}
                            <div className="col-12 lg:col-3 md:col-6">
                                <Card className="surface-card shadow-2">
                                    <div className="flex align-items-center gap-3">
                                        <div className="flex align-items-center justify-content-center bg-blue-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                            <i className="pi pi-chart-line text-blue-600 text-2xl"></i>
                                        </div>
                                        <div>
                                            <div className="text-500 text-sm mb-1">Overall Average</div>
                                            <div className="text-900 font-bold text-2xl">{dashboardData.performance.overallAverage}%</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="col-12 lg:col-3 md:col-6">
                                <Card className="surface-card shadow-2">
                                    <div className="flex align-items-center gap-3">
                                        <div className="flex align-items-center justify-content-center bg-green-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                            <i className="pi pi-check-circle text-green-600 text-2xl"></i>
                                        </div>
                                        <div>
                                            <div className="text-500 text-sm mb-1">Attendance Rate</div>
                                            <div className="text-900 font-bold text-2xl">{dashboardData.attendance.attendanceRate}%</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="col-12 lg:col-3 md:col-6">
                                <Card className="surface-card shadow-2">
                                    <div className="flex align-items-center gap-3">
                                        <div className="flex align-items-center justify-content-center bg-purple-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                            <i className="pi pi-book text-purple-600 text-2xl"></i>
                                        </div>
                                        <div>
                                            <div className="text-500 text-sm mb-1">Subjects</div>
                                            <div className="text-900 font-bold text-2xl">{dashboardData.academicInfo.subjects.length}</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="col-12 lg:col-3 md:col-6">
                                <Card className="surface-card shadow-2">
                                    <div className="flex align-items-center gap-3">
                                        <div className="flex align-items-center justify-content-center bg-orange-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                            <i className="pi pi-file text-orange-600 text-2xl"></i>
                                        </div>
                                        <div>
                                            <div className="text-500 text-sm mb-1">Exam Records</div>
                                            <div className="text-900 font-bold text-2xl">{dashboardData.performance.totalExamsRecorded}</div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Current Term Performance */}
                            {dashboardData.performance.currentTermScore && (
                                <div className="col-12 lg:col-6">
                                    <Card title="Current Term Performance" subTitle={`${dashboardData.academicInfo.currentAcademicYear} - Term ${dashboardData.academicInfo.currentAcademicTerm}`}>
                                        <div className="grid">
                                            <div className="col-6">
                                                <div className="text-center p-3 border-round bg-blue-50">
                                                    <div className="text-blue-600 font-bold text-4xl mb-2">{dashboardData.performance.currentTermScore.overallAverage.toFixed(1)}%</div>
                                                    <div className="text-500">Average Score</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="text-center p-3 border-round bg-purple-50">
                                                    <div className="text-purple-600 font-bold text-4xl mb-2">#{dashboardData.performance.currentTermScore.overallPosition || 'N/A'}</div>
                                                    <div className="text-500">Class Position</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="text-center p-3">
                                                    <div className="font-semibold mb-1">Conduct</div>
                                                    <Tag value={getConductLabel(dashboardData.performance.currentTermScore.conduct)} severity={getConductColor(dashboardData.performance.currentTermScore.conduct)} />
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="text-center p-3">
                                                    <div className="font-semibold mb-1">Interest</div>
                                                    <Tag value={getConductLabel(dashboardData.performance.currentTermScore.interest)} severity={getConductColor(dashboardData.performance.currentTermScore.interest)} />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Performance Trend Chart */}
                            <div className="col-12 lg:col-6">
                                <Card title="Performance Trend" subTitle="Last 5 exam records">
                                    {dashboardData.recentExamScores.length > 0 ? <Chart type="line" data={performanceTrendData} /> : <Message severity="info" text="No exam records available yet" />}
                                </Card>
                            </div>

                            {/* Grade Distribution */}
                            <div className="col-12 lg:col-6">
                                <Card title="Grade Distribution" subTitle="All subjects across all terms">
                                    <Chart type="bar" data={gradeChartData} />
                                </Card>
                            </div>

                            {/* Subject Performance */}
                            <div className="col-12 lg:col-6">
                                <Card title="Subject Performance" subTitle="Average scores per subject">
                                    {dashboardData.performance.subjectStats.length > 0 ? (
                                        <div className="flex flex-column gap-3">
                                            {dashboardData.performance.subjectStats.map((stat: any) => (
                                                <div key={stat.subject._id} className="p-3 border-round surface-100">
                                                    <div className="flex justify-content-between align-items-center mb-2">
                                                        <div>
                                                            <div className="font-semibold text-900">{stat.subject.name}</div>
                                                            <small className="text-500">{stat.subject.code}</small>
                                                        </div>
                                                        <Tag value={stat.mostFrequentGrade} severity={getGradeColor(stat.mostFrequentGrade)} />
                                                    </div>
                                                    <div className="flex align-items-center gap-2">
                                                        <ProgressBar value={parseFloat(stat.averageScore)} style={{ flex: 1 }} />
                                                        <span className="font-bold">{stat.averageScore}%</span>
                                                    </div>
                                                    <small className="text-500">{stat.examsCount} exam(s) recorded</small>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <Message severity="info" text="No subject performance data available" />
                                    )}
                                </Card>
                            </div>

                            {/* Financial Information */}
                            {dashboardData.financial && (
                                <>
                                    <div className="col-12">
                                        <Divider align="left">
                                            <div className="inline-flex align-items-center">
                                                <i className="pi pi-wallet mr-2"></i>
                                                <span className="font-bold">Financial Information</span>
                                            </div>
                                        </Divider>
                                    </div>

                                    {/* Financial Statistics Cards */}
                                    <div className="col-12 lg:col-3 md:col-6">
                                        <Card className="surface-card shadow-2">
                                            <div className="flex align-items-center gap-3">
                                                <div className="flex align-items-center justify-content-center bg-indigo-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                                    <i className="pi pi-money-bill text-indigo-600 text-2xl"></i>
                                                </div>
                                                <div>
                                                    <div className="text-500 text-sm mb-1">Total Fees Required</div>
                                                    <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.totalFeesRequired)}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="col-12 lg:col-3 md:col-6">
                                        <Card className="surface-card shadow-2">
                                            <div className="flex align-items-center gap-3">
                                                <div className="flex align-items-center justify-content-center bg-green-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                                                    <i className="pi pi-check-circle text-green-600 text-2xl"></i>
                                                </div>
                                                <div>
                                                    <div className="text-500 text-sm mb-1">Amount Paid</div>
                                                    <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.totalFeesPaid)}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="col-12 lg:col-3 md:col-6">
                                        <Card className={`surface-card shadow-2 ${dashboardData.financial.outstandingBalance > 0 ? 'border-left-3 border-orange-500' : ''}`}>
                                            <div className="flex align-items-center gap-3">
                                                <div
                                                    className={`flex align-items-center justify-content-center border-circle ${dashboardData.financial.outstandingBalance > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}
                                                    style={{ width: '3rem', height: '3rem' }}
                                                >
                                                    <i className={`pi pi-exclamation-triangle ${dashboardData.financial.outstandingBalance > 0 ? 'text-orange-600' : 'text-gray-600'} text-2xl`}></i>
                                                </div>
                                                <div>
                                                    <div className="text-500 text-sm mb-1">Outstanding Balance</div>
                                                    <div className={`font-bold text-xl ${dashboardData.financial.outstandingBalance > 0 ? 'text-orange-600' : 'text-gray-600'}`}>{formatCurrency(dashboardData.financial.outstandingBalance)}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="col-12 lg:col-3 md:col-6">
                                        <Card className="surface-card shadow-2">
                                            <div className="flex align-items-center gap-3">
                                                <div
                                                    className={`flex align-items-center justify-content-center border-circle ${
                                                        getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'success'
                                                            ? 'bg-green-100'
                                                            : getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'warning'
                                                            ? 'bg-yellow-100'
                                                            : 'bg-red-100'
                                                    }`}
                                                    style={{ width: '3rem', height: '3rem' }}
                                                >
                                                    <i
                                                        className={`pi pi-percentage ${
                                                            getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'success'
                                                                ? 'text-green-600'
                                                                : getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'warning'
                                                                ? 'text-yellow-600'
                                                                : 'text-red-600'
                                                        } text-2xl`}
                                                    ></i>
                                                </div>
                                                <div>
                                                    <div className="text-500 text-sm mb-1">Payment Progress</div>
                                                    <div className="text-900 font-bold text-xl">{dashboardData.financial.percentagePaid.toFixed(1)}%</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Payment Progress Bar */}
                                    <div className="col-12">
                                        <Card>
                                            <div className="flex justify-content-between align-items-center mb-3">
                                                <div>
                                                    <h5 className="m-0 mb-1">Fee Payment Status</h5>
                                                    <span className="text-500">
                                                        {dashboardData.academicInfo.currentAcademicYear} - Term {dashboardData.academicInfo.currentAcademicTerm}
                                                    </span>
                                                </div>
                                                {dashboardData.financial.daysOverdue && dashboardData.financial.daysOverdue > 0 && <Tag severity="danger" icon="pi pi-clock" value={`${dashboardData.financial.daysOverdue} days overdue`} />}
                                            </div>
                                            <ProgressBar
                                                value={dashboardData.financial.percentagePaid}
                                                color={
                                                    getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'success' ? '#22C55E' : getPaymentStatusSeverity(dashboardData.financial.percentagePaid) === 'warning' ? '#EAB308' : '#EF4444'
                                                }
                                            />
                                            <div className="flex justify-content-between mt-2">
                                                <small className="text-500">Paid: {formatCurrency(dashboardData.financial.totalFeesPaid)}</small>
                                                <small className="text-500">Remaining: {formatCurrency(dashboardData.financial.outstandingBalance)}</small>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Overdue Warning */}
                                    {dashboardData.financial.daysOverdue && dashboardData.financial.daysOverdue > 0 && (
                                        <div className="col-12">
                                            <Message severity="warn" text={`Your payment is ${dashboardData.financial.daysOverdue} days overdue. Please contact the finance office or make payment as soon as possible.`} />
                                        </div>
                                    )}

                                    {/* Payment Deadline Info */}
                                    {dashboardData.financial.paymentDeadline && !dashboardData.financial.daysOverdue && (
                                        <div className="col-12">
                                            <Message severity="info" text={`Payment deadline: ${new Date(dashboardData.financial.paymentDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`} />
                                        </div>
                                    )}

                                    {/* Last Payment Info */}
                                    {dashboardData.financial.lastPaymentDate && (
                                        <div className="col-12 lg:col-6">
                                            <Card title="Last Payment" className="h-full">
                                                <div className="flex flex-column gap-2">
                                                    <div className="flex justify-content-between">
                                                        <span className="text-500">Date:</span>
                                                        <span className="font-semibold">{new Date(dashboardData.financial.lastPaymentDate).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                    <div className="flex justify-content-between">
                                                        <span className="text-500">Amount:</span>
                                                        <span className="font-semibold text-green-600">{formatCurrency(dashboardData.financial.lastPaymentAmount || 0)}</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Fee Breakdown */}
                                    {dashboardData.financial.feeBreakdown && dashboardData.financial.feeBreakdown.length > 0 && (
                                        <div className="col-12 lg:col-6">
                                            <Card title="Fee Breakdown" className="h-full">
                                                <div className="flex flex-column gap-2">
                                                    {dashboardData.financial.feeBreakdown.map((fee: any, index: number) => (
                                                        <div key={index} className="flex justify-content-between p-2 surface-100 border-round">
                                                            <span className="text-700">{fee.determinant?.name || 'Unknown Fee'}</span>
                                                            <span className="font-semibold">{formatCurrency(fee.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <Divider className="my-2" />
                                                    <div className="flex justify-content-between">
                                                        <span className="font-bold">Total:</span>
                                                        <span className="font-bold text-xl">{formatCurrency(dashboardData.financial.totalFeesRequired)}</span>
                                                    </div>
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Active Scholarships */}
                                    {dashboardData.financial.scholarships && dashboardData.financial.scholarships.length > 0 && (
                                        <div className="col-12">
                                            <Card title="Active Scholarships">
                                                <div className="grid">
                                                    {dashboardData.financial.scholarships.map((scholarship: any) => (
                                                        <div key={scholarship._id} className="col-12 md:col-6 lg:col-4">
                                                            <div className="p-3 surface-100 border-round">
                                                                <div className="flex align-items-start gap-3">
                                                                    <div className="flex align-items-center justify-content-center bg-green-500 text-white border-circle" style={{ width: '2.5rem', height: '2.5rem' }}>
                                                                        <i className="pi pi-gift text-xl"></i>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="font-semibold text-900 mb-1">{scholarship.scholarshipBody?.name || 'Scholarship'}</div>
                                                                        <div className="text-green-600 font-bold mb-2">{formatCurrency(scholarship.totalGranted)}</div>
                                                                        <div className="flex justify-content-between text-sm">
                                                                            <span className="text-500">Year: {scholarship.academicYear}</span>
                                                                            <Tag value={scholarship.status} severity={scholarship.status === 'active' ? 'success' : 'warning'} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </Card>
                                        </div>
                                    )}

                                    {/* Payment History */}
                                    {dashboardData.financial.paymentHistory && dashboardData.financial.paymentHistory.length > 0 && (
                                        <div className="col-12">
                                            <Card title="Payment History" subTitle="Recent fee payments">
                                                <DataTable value={dashboardData.financial.paymentHistory} paginator rows={5} emptyMessage="No payment history available">
                                                    <Column field="paymentDate" header="Date" body={(rowData) => new Date(rowData.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
                                                    <Column field="amountPaid" header="Amount" body={(rowData) => formatCurrency(rowData.amountPaid)} />
                                                    <Column field="paymentMethod" header="Method" body={(rowData) => <Tag value={rowData.paymentMethod || 'N/A'} />} />
                                                    <Column field="receiptNumber" header="Receipt No." body={(rowData) => rowData.receiptNumber || 'N/A'} />
                                                    <Column field="academicYear" header="Academic Period" body={(rowData) => `${rowData.academicYear} - Term ${rowData.academicTerm}`} />
                                                    <Column field="remarks" header="Remarks" body={(rowData) => rowData.remarks || '-'} />
                                                </DataTable>
                                            </Card>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Attendance Summary */}
                            <div className="col-12 lg:col-4">
                                <Card title="Attendance Summary" subTitle="All recorded terms">
                                    <div className="flex flex-column gap-3">
                                        <div className="flex justify-content-between align-items-center p-3 border-round bg-green-50">
                                            <div>
                                                <i className="pi pi-check-circle text-green-600 mr-2"></i>
                                                <span className="font-semibold">Present</span>
                                            </div>
                                            <span className="font-bold text-xl text-green-600">{dashboardData.attendance.totalPresent}</span>
                                        </div>
                                        <div className="flex justify-content-between align-items-center p-3 border-round bg-red-50">
                                            <div>
                                                <i className="pi pi-times-circle text-red-600 mr-2"></i>
                                                <span className="font-semibold">Absent</span>
                                            </div>
                                            <span className="font-bold text-xl text-red-600">{dashboardData.attendance.totalAbsent}</span>
                                        </div>
                                        <div className="flex justify-content-between align-items-center p-3 border-round bg-yellow-50">
                                            <div>
                                                <i className="pi pi-clock text-yellow-600 mr-2"></i>
                                                <span className="font-semibold">Late</span>
                                            </div>
                                            <span className="font-bold text-xl text-yellow-600">{dashboardData.attendance.totalLate}</span>
                                        </div>
                                        <Divider />
                                        <div className="flex justify-content-between align-items-center">
                                            <span className="font-semibold">Total Days</span>
                                            <span className="font-bold text-xl">{dashboardData.attendance.totalDays}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Guardian Information */}
                            {dashboardData.guardian && (
                                <div className="col-12 lg:col-4">
                                    <Card title="Guardian Information">
                                        <div className="flex flex-column gap-3">
                                            <div>
                                                <div className="text-500 text-sm mb-1">Name</div>
                                                <div className="font-semibold">{dashboardData.guardian.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-500 text-sm mb-1">Relationship</div>
                                                <div className="font-semibold">{getConductLabel(dashboardData.guardian.relationship)}</div>
                                            </div>
                                            {dashboardData.guardian.phone && (
                                                <div>
                                                    <div className="text-500 text-sm mb-1">Phone</div>
                                                    <div className="font-semibold">
                                                        <i className="pi pi-phone mr-2"></i>
                                                        {dashboardData.guardian.phone}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Account Balance */}
                            <div className="col-12 lg:col-4">
                                <Card title="Account Balance">
                                    <div className="text-center p-4">
                                        <div className="text-500 mb-2">Current Balance</div>
                                        <div className={`font-bold text-4xl ${dashboardData.student.accountBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>${Math.abs(dashboardData.student.accountBalance).toFixed(2)}</div>
                                        {dashboardData.student.accountBalance < 0 && <Tag value="Outstanding" severity="danger" className="mt-2" />}
                                    </div>
                                </Card>
                            </div>

                            {/* All Exam Records */}
                            <div className="col-12">
                                <Card title="Exam Records" subTitle="All academic years and terms">
                                    {dashboardData.allExamScores.length > 0 ? (
                                        <DataTable value={dashboardData.allExamScores} paginator rows={10} dataKey="_id" stripedRows>
                                            <Column field="academicYear" header="Term" body={termTemplate} sortable />
                                            <Column field="class.className" header="Class" />
                                            <Column field="overallAverage" header="Average & Position" body={averageTemplate} sortable />
                                            <Column field="conduct" header="Conduct" body={(row) => <Tag value={getConductLabel(row.conduct)} severity={getConductColor(row.conduct)} />} />
                                            <Column field="interest" header="Interest" body={(row) => <Tag value={getConductLabel(row.interest)} severity={getConductColor(row.interest)} />} />
                                            <Column header="Actions" body={actionTemplate} />
                                        </DataTable>
                                    ) : (
                                        <Message severity="info" text="No exam records available yet" />
                                    )}
                                </Card>
                            </div>
                        </div>
                    </TabPanel>

                    {/* Academic Transcript Tab */}
                    <TabPanel header="Academic Transcript" leftIcon="pi pi-file-edit mr-2">
                        <AcademicTranscript studentId={studentId} />
                    </TabPanel>
                </TabView>
            </div>

            {/* Exam Details Dialog */}
            <Dialog header={`Exam Details - ${selectedExamScore?.academicYear} Term ${selectedExamScore?.academicTerm}`} visible={showDetailDialog} style={{ width: '90vw', maxWidth: '1000px' }} onHide={() => setShowDetailDialog(false)} maximizable>
                {selectedExamScore && (
                    <div className="grid">
                        <div className="col-12">
                            <div className="grid">
                                <div className="col-6 md:col-3">
                                    <div className="text-center p-3 border-round surface-100">
                                        <div className="font-bold text-2xl text-blue-600 mb-1">{selectedExamScore.overallAverage?.toFixed(1)}%</div>
                                        <div className="text-500 text-sm">Overall Average</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-3">
                                    <div className="text-center p-3 border-round surface-100">
                                        <div className="font-bold text-2xl text-purple-600 mb-1">#{selectedExamScore.overallPosition || 'N/A'}</div>
                                        <div className="text-500 text-sm">Position</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-3">
                                    <div className="text-center p-3 border-round surface-100">
                                        <div className="font-bold text-2xl text-green-600 mb-1">{selectedExamScore.attendance?.present || 0}</div>
                                        <div className="text-500 text-sm">Days Present</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-3">
                                    <div className="text-center p-3 border-round surface-100">
                                        <div className="font-bold text-2xl text-red-600 mb-1">{selectedExamScore.attendance?.absent || 0}</div>
                                        <div className="text-500 text-sm">Days Absent</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12">
                            <h3>Subject Scores</h3>
                            <DataTable value={selectedExamScore.scores} dataKey="subject._id">
                                <Column
                                    field="subject.name"
                                    header="Subject"
                                    body={(row) => (
                                        <div>
                                            <div className="font-semibold">{row.subject?.name}</div>
                                            <small className="text-500">{row.subject?.code}</small>
                                        </div>
                                    )}
                                />
                                <Column field="classScore" header="Class Score" body={(row) => `${row.classScore}%`} />
                                <Column field="examScore" header="Exam Score" body={(row) => `${row.examScore}%`} />
                                <Column field="totalScore" header="Total Score" body={(row) => `${row.totalScore}%`} />
                                <Column field="grade" header="Grade" body={gradeTemplate} />
                                <Column field="position" header="Position" body={(row) => (row.position ? `#${row.position}` : 'N/A')} />
                            </DataTable>
                        </div>

                        {selectedExamScore.formMasterComment && (
                            <div className="col-12">
                                <Panel header="Form Master's Comment">
                                    <p>{selectedExamScore.formMasterComment}</p>
                                </Panel>
                            </div>
                        )}

                        {selectedExamScore.headmasterComment && (
                            <div className="col-12">
                                <Panel header="Headmaster's Comment">
                                    <p>{selectedExamScore.headmasterComment}</p>
                                </Panel>
                            </div>
                        )}

                        {selectedExamScore.nextTermBegins && (
                            <div className="col-12">
                                <Message severity="info" text={`Next term begins: ${new Date(selectedExamScore.nextTermBegins).toLocaleDateString()}`} />
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
}
