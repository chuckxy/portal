'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Message } from 'primereact/message';
import { Chart } from 'primereact/chart';
import { Divider } from 'primereact/divider';
import { Panel } from 'primereact/panel';
import { TabView, TabPanel } from 'primereact/tabview';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface FinancialData {
    totalRevenue: number;
    pendingPayments: number;
    collectedThisTerm: number;
    collectedThisMonth: number;
    currency: string;
}

interface EnrollmentData {
    totalStudents: number;
    totalTeachers: number;
    totalStaff: number;
    studentsByLevel: any[];
    enrollmentTrend: any[];
}

interface AcademicData {
    totalClasses: number;
    totalSubjects: number;
    averageClassSize: number;
    teacherStudentRatio: string;
    averagePerformance: number;
}

interface SiteData {
    _id: string;
    name: string;
    location: string;
    students: number;
    teachers: number;
    classes: number;
}

interface DashboardData {
    proprietor: {
        _id: string;
        fullName: string;
        email?: string;
        phone?: string;
        photoLink?: string;
        school: any;
    };
    financial: FinancialData;
    enrollment: EnrollmentData;
    academic: AcademicData;
    sites: SiteData[];
    recentPayments: any[];
    pendingMatters: any[];
    statistics: {
        totalDepartments: number;
        totalFaculties: number;
        activeSchoolSites: number;
    };
}

export default function ProprietorDashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (user) {
            loadDashboardData();
        } else {
            setError('Proprietor ID is required');
            setLoading(false);
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user.id || user.id === 'undefined') {
                setError('Invalid proprietor ID');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/proprietor/dashboard?proprietorId=${user.id}`);
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

    const formatCurrency = (value: number, currency: string = 'GHS') => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value);
    };

    const getRevenueChartData = () => {
        if (!dashboardData?.enrollment?.enrollmentTrend) return null;

        return {
            labels: dashboardData.enrollment.enrollmentTrend.map((item: any) => item.period),
            datasets: [
                {
                    label: 'Students Enrolled',
                    data: dashboardData.enrollment.enrollmentTrend.map((item: any) => item.count),
                    fill: false,
                    borderColor: '#42A5F5',
                    tension: 0.4
                }
            ]
        };
    };

    const getEnrollmentByLevelChartData = () => {
        if (!dashboardData?.enrollment?.studentsByLevel) return null;

        return {
            labels: dashboardData.enrollment.studentsByLevel.map((item: any) => item.level),
            datasets: [
                {
                    label: 'Students',
                    data: dashboardData.enrollment.studentsByLevel.map((item: any) => item.count),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                }
            ]
        };
    };

    const chartOptions = {
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: {
                labels: {
                    color: '#495057'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: '#495057'
                },
                grid: {
                    color: '#ebedef'
                }
            },
            y: {
                ticks: {
                    color: '#495057'
                },
                grid: {
                    color: '#ebedef'
                }
            }
        }
    };

    const pieChartOptions = {
        plugins: {
            legend: {
                labels: {
                    color: '#495057'
                }
            }
        }
    };

    const amountBodyTemplate = (rowData: any) => {
        return formatCurrency(rowData.amountPaid, rowData.currency || 'GHS');
    };

    const dateBodyTemplate = (rowData: any) => {
        return new Date(rowData.datePaid).toLocaleDateString();
    };

    const statusBodyTemplate = (rowData: any) => {
        const severity = rowData.status === 'confirmed' ? 'success' : rowData.status === 'pending' ? 'warning' : 'danger';
        return <Tag value={rowData.status?.toUpperCase()} severity={severity as any} />;
    };

    const paymentMethodBodyTemplate = (rowData: any) => {
        return <Tag value={rowData.paymentMethod} severity="info" />;
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <Skeleton height="2rem" className="mb-2" />
                        <Skeleton height="10rem" />
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
                    <Message severity="info" text="No dashboard data available" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            {/* Header Section */}
            <div className="col-12">
                <Card>
                    <div className="flex align-items-center justify-content-between mb-3">
                        <div className="flex align-items-center">
                            {dashboardData.proprietor.photoLink && (
                                <img src={dashboardData.proprietor.photoLink} alt={dashboardData.proprietor.fullName} className="border-circle" style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '1rem' }} />
                            )}
                            <div>
                                <h2 className="m-0">{dashboardData.proprietor.fullName}</h2>
                                <p className="text-600 m-0">Proprietor Dashboard</p>
                                <p className="text-500 m-0 mt-1">
                                    <i className="pi pi-building mr-2" />
                                    {dashboardData.proprietor.school?.name}
                                </p>
                            </div>
                        </div>
                        <div>
                            <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={loadDashboardData} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Financial Overview Cards */}
            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-primary">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">Total Revenue</span>
                            <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.totalRevenue, dashboardData.financial.currency)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-blue-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-dollar text-blue-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-green-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">This Term</span>
                            <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.collectedThisTerm, dashboardData.financial.currency)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-green-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-chart-line text-green-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-orange-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">Pending Payments</span>
                            <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.pendingPayments, dashboardData.financial.currency)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-orange-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-exclamation-triangle text-orange-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-cyan-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">This Month</span>
                            <div className="text-900 font-bold text-xl">{formatCurrency(dashboardData.financial.collectedThisMonth, dashboardData.financial.currency)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-cyan-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-calendar text-cyan-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Enrollment Statistics Cards */}
            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-purple-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">Total Students</span>
                            <div className="text-900 font-bold text-xl">{formatNumber(dashboardData.enrollment.totalStudents)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-users text-purple-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-indigo-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">Total Teachers</span>
                            <div className="text-900 font-bold text-xl">{formatNumber(dashboardData.enrollment.totalTeachers)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-indigo-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-briefcase text-indigo-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-teal-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">School Sites</span>
                            <div className="text-900 font-bold text-xl">{formatNumber(dashboardData.statistics.activeSchoolSites)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-teal-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-building text-teal-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="border-left-3 border-pink-500">
                    <div className="flex justify-content-between align-items-center">
                        <div>
                            <span className="block text-500 font-medium mb-2">Total Staff</span>
                            <div className="text-900 font-bold text-xl">{formatNumber(dashboardData.enrollment.totalStaff)}</div>
                        </div>
                        <div className="flex align-items-center justify-content-center bg-pink-100 border-round" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-id-card text-pink-500 text-2xl" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Academic Overview */}
            <div className="col-12 lg:col-6">
                <Card title="Academic Overview">
                    <div className="grid">
                        <div className="col-6">
                            <div className="mb-3">
                                <span className="text-500 font-medium">Total Classes</span>
                                <div className="text-900 font-bold text-2xl mt-2">{formatNumber(dashboardData.academic.totalClasses)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="mb-3">
                                <span className="text-500 font-medium">Total Subjects</span>
                                <div className="text-900 font-bold text-2xl mt-2">{formatNumber(dashboardData.academic.totalSubjects)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="mb-3">
                                <span className="text-500 font-medium">Avg. Class Size</span>
                                <div className="text-900 font-bold text-2xl mt-2">{dashboardData.academic.averageClassSize.toFixed(0)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="mb-3">
                                <span className="text-500 font-medium">Teacher:Student Ratio</span>
                                <div className="text-900 font-bold text-2xl mt-2">{dashboardData.academic.teacherStudentRatio}</div>
                            </div>
                        </div>
                        <div className="col-12">
                            <Divider />
                            <div className="mb-2">
                                <span className="text-500 font-medium">Average Performance</span>
                                <div className="text-900 font-bold text-xl mt-2">{dashboardData.academic.averagePerformance?.toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Enrollment by Level Chart */}
            <div className="col-12 lg:col-6">
                <Card title="Students by Level">
                    {getEnrollmentByLevelChartData() ? (
                        <Chart type="doughnut" data={getEnrollmentByLevelChartData()!} options={pieChartOptions} style={{ position: 'relative', height: '300px' }} />
                    ) : (
                        <Message severity="info" text="No enrollment data available" />
                    )}
                </Card>
            </div>

            {/* Enrollment Trend Chart */}
            <div className="col-12">
                <Card title="Enrollment Trend">
                    {getRevenueChartData() ? <Chart type="line" data={getRevenueChartData()!} options={chartOptions} style={{ position: 'relative', height: '300px' }} /> : <Message severity="info" text="No trend data available" />}
                </Card>
            </div>

            {/* Sites Overview */}
            <div className="col-12">
                <Card title="School Sites Overview">
                    {dashboardData.sites && dashboardData.sites.length > 0 ? (
                        <DataTable value={dashboardData.sites} paginator rows={5} responsiveLayout="scroll">
                            <Column field="name" header="Site Name" sortable />
                            <Column field="location" header="Location" sortable />
                            <Column field="students" header="Students" sortable body={(rowData) => formatNumber(rowData.students)} />
                            <Column field="teachers" header="Teachers" sortable body={(rowData) => formatNumber(rowData.teachers)} />
                            <Column field="classes" header="Classes" sortable body={(rowData) => formatNumber(rowData.classes)} />
                            <Column header="Actions" body={(rowData) => <Button label="View" icon="pi pi-eye" className="p-button-text p-button-sm" onClick={() => router.push(`/sites/${rowData._id}`)} />} />
                        </DataTable>
                    ) : (
                        <Message severity="info" text="No sites available" />
                    )}
                </Card>
            </div>

            {/* Recent Payments */}
            <div className="col-12">
                <Card title="Recent Payments">
                    {dashboardData.recentPayments && dashboardData.recentPayments.length > 0 ? (
                        <DataTable value={dashboardData.recentPayments} paginator rows={10} responsiveLayout="scroll">
                            <Column field="receiptNumber" header="Receipt No." sortable />
                            <Column field="student.fullName" header="Student" sortable />
                            <Column field="datePaid" header="Date" sortable body={dateBodyTemplate} />
                            <Column field="amountPaid" header="Amount" sortable body={amountBodyTemplate} />
                            <Column field="paymentMethod" header="Method" sortable body={paymentMethodBodyTemplate} />
                            <Column field="status" header="Status" sortable body={statusBodyTemplate} />
                        </DataTable>
                    ) : (
                        <Message severity="info" text="No recent payments" />
                    )}
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="col-12">
                <Card title="Quick Actions">
                    <div className="grid">
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="Manage Students" icon="pi pi-users" className="w-full p-button-outlined" onClick={() => router.push('/students')} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="Manage Teachers" icon="pi pi-briefcase" className="w-full p-button-outlined" onClick={() => router.push('/teachers')} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="View Reports" icon="pi pi-chart-bar" className="w-full p-button-outlined" onClick={() => router.push('/reports')} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="School Settings" icon="pi pi-cog" className="w-full p-button-outlined" onClick={() => router.push('/sites')} />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
