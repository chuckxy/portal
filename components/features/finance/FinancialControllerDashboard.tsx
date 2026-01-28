'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { Chart } from 'primereact/chart';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { Skeleton } from 'primereact/skeleton';
import { SelectButton } from 'primereact/selectbutton';
import { useReactToPrint } from 'react-to-print';
import FinancialStandingsPrintReport from '@/components/print/FinancialStandingsPrintReport';
import { getAcademicYears } from '@/lib/utils/utilFunctions';
import { useAuth } from '@/context/AuthContext';

interface FinancialSummary {
    // Income
    totalFeesExpected: number;
    totalFeesReceived: number;
    totalDailyCollections: number;
    totalScholarships: number;
    totalIncome: number;

    // Expenses
    totalExpenditures: number;
    pendingExpenditures: number;
    approvedExpenditures: number;

    // Receivables
    totalOutstanding: number;
    criticalDebtors: number;
    overdueAmount: number;

    // Cash Position
    netCashFlow: number;
    cashAtHand: number;
    bankBalance: number;

    // Period Comparisons
    incomeGrowth: number;
    expenseGrowth: number;
}

interface RecentTransaction {
    _id: string;
    type: 'payment' | 'expenditure' | 'daily_collection';
    date: Date;
    amount: number;
    description: string;
    status?: string;
    student?: string;
    category?: string;
}

interface School {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    description: string;
}

export const FinancialControllerDashboard: React.FC = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState<FinancialSummary>({
        totalFeesExpected: 0,
        totalFeesReceived: 0,
        totalDailyCollections: 0,
        totalScholarships: 0,
        totalIncome: 0,
        totalExpenditures: 0,
        pendingExpenditures: 0,
        approvedExpenditures: 0,
        totalOutstanding: 0,
        criticalDebtors: 0,
        overdueAmount: 0,
        netCashFlow: 0,
        cashAtHand: 0,
        bankBalance: 0,
        incomeGrowth: 0,
        expenseGrowth: 0
    });

    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({
        school: '',
        site: '',
        academicYear: '',
        dateFrom: null as Date | null,
        dateTo: null as Date | null
    });

    const [periodView, setPeriodView] = useState<'today' | 'week' | 'month' | 'term' | 'year'>('month');
    const [chartData, setChartData] = useState<any>(null);
    const [chartOptions, setChartOptions] = useState<any>(null);

    const toast = useRef<Toast>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const periodOptions = [
        { label: 'Today', value: 'today' },
        { label: 'This Week', value: 'week' },
        { label: 'This Month', value: 'month' },
        { label: 'This Term', value: 'term' },
        { label: 'This Year', value: 'year' }
    ];

    useEffect(() => {
        fetchSites();
        fetchFinancialData();
        initializeChart();
    }, [user]);

    useEffect(() => {
        if (filters.site || user?.schoolSite) {
            fetchFinancialData();
        }
    }, [filters.site, filters.academicYear, filters.dateFrom, filters.dateTo, periodView]);

    const fetchSites = async () => {
        try {
            if (!user) return;
            const response = await fetch(`/api/sites?school=${user?.school}`);
            const data = await response.json();
            if (Array.isArray(data.sites)) {
                setSites(data.sites);
                if (data.sites.length > 0 && !filters.site) {
                    setFilters((prev) => ({ ...prev, site: data.sites[0]._id, school: user.school }));
                }
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchFinancialData = async () => {
        if (!user) return;
        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            queryParams.append('site', filters.site ? filters.site : user.schoolSite);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom.toISOString());
            if (filters.dateTo) queryParams.append('dateTo', filters.dateTo.toISOString());
            queryParams.append('period', periodView);

            const response = await fetch(`/api/financial-summary?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch financial data');

            const data = await response.json();
            setSummary(data.summary);
            setRecentTransactions(data.recentTransactions || []);
            updateChartData(data.chartData);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load financial data',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const initializeChart = () => {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        const options = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                }
            }
        };

        setChartOptions(options);
    };

    const updateChartData = (data: any) => {
        if (!data) return;

        const chartData = {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Income',
                    data: data.income || [],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgb(75, 192, 192)',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'Expenses',
                    data: data.expenses || [],
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgb(255, 99, 132)',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        };

        setChartData(chartData);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(amount);
    };

    const getCollectionRate = () => {
        if (summary.totalFeesExpected === 0) return '0';
        return ((summary.totalFeesReceived / summary.totalFeesExpected) * 100).toFixed(1);
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Financial_Standings_Report_${new Date().toISOString().split('T')[0]}`,
        onAfterPrint: () => {
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Report printed successfully',
                life: 3000
            });
        }
    });

    const exportReport = (type: 'pdf' | 'excel') => {
        if (type === 'pdf') {
            handlePrint();
        } else {
            toast.current?.show({
                severity: 'info',
                summary: 'Export',
                detail: `Exporting ${type.toUpperCase()} report...`,
                life: 3000
            });
        }
    };

    // Template functions
    const transactionTypeTemplate = (rowData: RecentTransaction) => {
        const typeMap = {
            payment: { label: 'Fee Payment', severity: 'success', icon: 'pi-money-bill' },
            expenditure: { label: 'Expenditure', severity: 'danger', icon: 'pi-shopping-cart' },
            daily_collection: { label: 'Daily Collection', severity: 'info', icon: 'pi-calendar' }
        };

        const type = typeMap[rowData.type];
        return (
            <div className="flex align-items-center gap-2">
                <i className={`pi ${type.icon}`}></i>
                <Tag value={type.label} severity={type.severity as any} />
            </div>
        );
    };

    const transactionDateTemplate = (rowData: RecentTransaction) => {
        return new Date(rowData.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const transactionAmountTemplate = (rowData: RecentTransaction) => {
        const isIncome = rowData.type === 'payment' || rowData.type === 'daily_collection';
        return (
            <span className={`font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                {isIncome ? '+' : '-'} {formatCurrency(rowData.amount)}
            </span>
        );
    };

    return (
        <>
            <Toast ref={toast} />

            <div className="mb-4">
                <div className="flex flex-wrap justify-content-between align-items-center gap-3">
                    <div>
                        <h2 className="m-0 mb-2">Financial Controller Dashboard</h2>
                        <p className="text-600 m-0">Comprehensive financial overview and control center</p>
                    </div>
                    <div className="flex gap-2">
                        <Button label="Export PDF" icon="pi pi-file-pdf" className="p-button-danger" onClick={() => exportReport('pdf')} />
                        <Button label="Export Excel" icon="pi pi-file-excel" className="p-button-success" onClick={() => exportReport('excel')} />
                        <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchFinancialData} loading={loading} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <div className="grid align-items-end">
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Site</label>
                        <Dropdown
                            value={filters.site}
                            options={sites.map((s) => ({ label: s.description, value: s._id }))}
                            onChange={(e) => setFilters({ ...filters, site: e.value })}
                            placeholder="All Sites"
                            className="w-full"
                            showClear
                            disabled={!filters.school}
                        />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Academic Year</label>
                        <Dropdown value={filters.academicYear} options={getAcademicYears} onChange={(e) => setFilters({ ...filters, academicYear: e.value })} placeholder="Current Year" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-sm font-medium mb-2">Period View</label>
                        <SelectButton value={periodView} options={periodOptions} onChange={(e) => setPeriodView(e.value)} className="w-full" />
                    </div>
                </div>
            </Card>

            {/* Key Financial Metrics - Top Row */}
            <div className="grid mb-3">
                <div className="col-12 lg:col-8">
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <Card className="h-full bg-gradient-to-r from-green-50 to-green-100">
                                <div className="flex justify-content-between align-items-start">
                                    <div className="flex-1">
                                        <div className="flex align-items-center gap-2 mb-2">
                                            <i className="pi pi-arrow-down text-green-600 text-xl"></i>
                                            <span className="text-green-700 font-semibold">TOTAL INCOME</span>
                                        </div>
                                        <div className="text-4xl font-bold text-green-600 mb-2">{formatCurrency(summary.totalIncome)}</div>
                                        <div className="text-sm text-600">
                                            <div className="flex gap-3 mb-1">
                                                <span>Fees: {formatCurrency(summary.totalFeesReceived)}</span>
                                                <span>Daily: {formatCurrency(summary.totalDailyCollections)}</span>
                                            </div>
                                            <div className="flex align-items-center gap-2">
                                                <i className={`pi ${summary.incomeGrowth >= 0 ? 'pi-arrow-up text-green-600' : 'pi-arrow-down text-red-600'}`}></i>
                                                <span className={summary.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>{Math.abs(summary.incomeGrowth).toFixed(1)}% vs last period</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-600 text-white border-round p-3">
                                        <i className="pi pi-wallet text-3xl"></i>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 md:col-6">
                            <Card className="h-full bg-gradient-to-r from-red-50 to-red-100">
                                <div className="flex justify-content-between align-items-start">
                                    <div className="flex-1">
                                        <div className="flex align-items-center gap-2 mb-2">
                                            <i className="pi pi-arrow-up text-red-600 text-xl"></i>
                                            <span className="text-red-700 font-semibold">TOTAL EXPENSES</span>
                                        </div>
                                        <div className="text-4xl font-bold text-red-600 mb-2">{formatCurrency(summary.totalExpenditures)}</div>
                                        <div className="text-sm text-600">
                                            <div className="flex gap-3 mb-1">
                                                <span>Pending: {formatCurrency(summary.pendingExpenditures)}</span>
                                                <span>Approved: {formatCurrency(summary.approvedExpenditures)}</span>
                                            </div>
                                            <div className="flex align-items-center gap-2">
                                                <i className={`pi ${summary.expenseGrowth >= 0 ? 'pi-arrow-up text-red-600' : 'pi-arrow-down text-green-600'}`}></i>
                                                <span className={summary.expenseGrowth >= 0 ? 'text-red-600' : 'text-green-600'}>{Math.abs(summary.expenseGrowth).toFixed(1)}% vs last period</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-red-600 text-white border-round p-3">
                                        <i className="pi pi-shopping-cart text-3xl"></i>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 md:col-6">
                            <Card className="h-full">
                                <div className="flex justify-content-between align-items-start">
                                    <div className="flex-1">
                                        <span className="text-500 text-sm block mb-2">NET CASH FLOW</span>
                                        <div className={`text-3xl font-bold mb-2 ${summary.netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrency(summary.netCashFlow)}</div>
                                        <div className="text-sm text-600">Income - Expenses</div>
                                    </div>
                                    <div className={`${summary.netCashFlow >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'} border-round p-2`}>
                                        <i className="pi pi-chart-line text-2xl"></i>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 md:col-6">
                            <Card className="h-full">
                                <div className="flex justify-content-between align-items-start">
                                    <div className="flex-1">
                                        <span className="text-500 text-sm block mb-2">OUTSTANDING RECEIVABLES</span>
                                        <div className="text-3xl font-bold text-orange-600 mb-2">{formatCurrency(summary.totalOutstanding)}</div>
                                        <div className="flex gap-3 text-sm text-600">
                                            <span>
                                                <i className="pi pi-exclamation-triangle text-red-500"></i> {summary.criticalDebtors} critical
                                            </span>
                                            <span>Overdue: {formatCurrency(summary.overdueAmount)}</span>
                                        </div>
                                    </div>
                                    <div className="bg-orange-100 text-orange-600 border-round p-2">
                                        <i className="pi pi-exclamation-circle text-2xl"></i>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Collection Progress */}
                <div className="col-12 lg:col-4">
                    <Card className="h-full">
                        <h4 className="mt-0 mb-3">Fee Collection Progress</h4>
                        <div className="text-center mb-3">
                            <div className="text-5xl font-bold text-primary mb-2">{getCollectionRate()}%</div>
                            <div className="text-sm text-600">Collection Rate</div>
                        </div>
                        <ProgressBar value={parseFloat(getCollectionRate())} className="h-2rem mb-3" displayValueTemplate={() => `${getCollectionRate()}%`} />
                        <Divider />
                        <div className="grid">
                            <div className="col-6 text-center">
                                <div className="text-600 text-sm mb-1">Expected</div>
                                <div className="font-bold text-lg">{formatCurrency(summary.totalFeesExpected)}</div>
                            </div>
                            <div className="col-6 text-center">
                                <div className="text-600 text-sm mb-1">Collected</div>
                                <div className="font-bold text-lg text-green-600">{formatCurrency(summary.totalFeesReceived)}</div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid mb-3">
                <div className="col-12 md:col-3">
                    <Card>
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Cash at Hand</span>
                                <span className="text-xl font-bold text-purple-600">{formatCurrency(summary.cashAtHand)}</span>
                            </div>
                            <div className="bg-purple-100 text-purple-600 border-round p-2">
                                <i className="pi pi-briefcase text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-3">
                    <Card>
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Bank Balance</span>
                                <span className="text-xl font-bold text-indigo-600">{formatCurrency(summary.bankBalance)}</span>
                            </div>
                            <div className="bg-indigo-100 text-indigo-600 border-round p-2">
                                <i className="pi pi-building text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-3">
                    <Card>
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Scholarships</span>
                                <span className="text-xl font-bold text-cyan-600">{formatCurrency(summary.totalScholarships)}</span>
                            </div>
                            <div className="bg-cyan-100 text-cyan-600 border-round p-2">
                                <i className="pi pi-gift text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-3">
                    <Card>
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Daily Collections</span>
                                <span className="text-xl font-bold text-teal-600">{formatCurrency(summary.totalDailyCollections)}</span>
                            </div>
                            <div className="bg-teal-100 text-teal-600 border-round p-2">
                                <i className="pi pi-calendar text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Charts and Transactions */}
            <div className="grid">
                <div className="col-12 lg:col-8">
                    <Card title="Income vs Expenses Trend">{chartData ? <Chart type="line" data={chartData} options={chartOptions} className="h-30rem" /> : <Skeleton height="30rem" />}</Card>
                </div>

                <div className="col-12 lg:col-4">
                    <Card title="Quick Actions" className="h-full">
                        <div className="flex flex-column gap-2">
                            <Button label="Record Payment" icon="pi pi-plus-circle" className="w-full p-button-success" />
                            <Button label="View Debtors" icon="pi pi-exclamation-triangle" className="w-full p-button-warning" />
                            <Button label="Approve Expenditure" icon="pi pi-check-circle" className="w-full p-button-info" />
                            <Button label="Daily Collection" icon="pi pi-calendar-plus" className="w-full p-button-help" />
                            <Divider />
                            <Button label="Fee Configurations" icon="pi pi-cog" className="w-full p-button-outlined" />
                            <Button label="Manage Scholarships" icon="pi pi-gift" className="w-full p-button-outlined" />
                            <Button label="Budget Planning" icon="pi pi-chart-pie" className="w-full p-button-outlined" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Transactions */}
            <Card title="Recent Transactions" className="mt-3">
                <DataTable value={recentTransactions} loading={loading} paginator rows={10} emptyMessage="No recent transactions" stripedRows>
                    <Column field="date" header="Date/Time" body={transactionDateTemplate} sortable style={{ minWidth: '180px' }} />
                    <Column field="type" header="Type" body={transactionTypeTemplate} sortable style={{ minWidth: '180px' }} />
                    <Column field="description" header="Description" sortable style={{ minWidth: '250px' }} />
                    <Column field="student" header="Student/Vendor" sortable style={{ minWidth: '150px' }} />
                    <Column field="amount" header="Amount" body={transactionAmountTemplate} sortable style={{ minWidth: '150px' }} />
                    <Column field="status" header="Status" body={(rowData) => rowData.status && <Tag value={rowData.status.toUpperCase()} severity={rowData.status === 'confirmed' ? 'success' : 'warning'} />} style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            {/* Alerts and Notifications */}
            <Card title="Financial Alerts" className="mt-3">
                <div className="grid">
                    {summary.criticalDebtors > 0 && (
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 border-red-300 border-round bg-red-50">
                                <div className="flex align-items-center gap-3">
                                    <i className="pi pi-exclamation-triangle text-red-600 text-3xl"></i>
                                    <div>
                                        <div className="font-bold text-red-700">{summary.criticalDebtors} Critical Debtors</div>
                                        <div className="text-sm text-600">Students with less than 25% payment</div>
                                        <Button label="View Details" className="p-button-text p-button-sm text-red-600 p-0 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {summary.pendingExpenditures > 1000 && (
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 border-orange-300 border-round bg-orange-50">
                                <div className="flex align-items-center gap-3">
                                    <i className="pi pi-clock text-orange-600 text-3xl"></i>
                                    <div>
                                        <div className="font-bold text-orange-700">Pending Approvals: {formatCurrency(summary.pendingExpenditures)}</div>
                                        <div className="text-sm text-600">Expenditures awaiting approval</div>
                                        <Button label="Review Now" className="p-button-text p-button-sm text-orange-600 p-0 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {parseFloat(getCollectionRate()) < 70 && (
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 border-yellow-300 border-round bg-yellow-50">
                                <div className="flex align-items-center gap-3">
                                    <i className="pi pi-info-circle text-yellow-600 text-3xl"></i>
                                    <div>
                                        <div className="font-bold text-yellow-700">Low Collection Rate: {getCollectionRate()}%</div>
                                        <div className="text-sm text-600">Below expected collection target</div>
                                        <Button label="Send Reminders" className="p-button-text p-button-sm text-yellow-600 p-0 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {summary.netCashFlow < 0 && (
                        <div className="col-12 md:col-6">
                            <div className="p-3 border-1 border-red-300 border-round bg-red-50">
                                <div className="flex align-items-center gap-3">
                                    <i className="pi pi-minus-circle text-red-600 text-3xl"></i>
                                    <div>
                                        <div className="font-bold text-red-700">Negative Cash Flow: {formatCurrency(summary.netCashFlow)}</div>
                                        <div className="text-sm text-600">Expenses exceed income this period</div>
                                        <Button label="View Analysis" className="p-button-text p-button-sm text-red-600 p-0 mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Hidden Print Report Component */}
            <div style={{ display: 'none' }}>
                <FinancialStandingsPrintReport
                    ref={printRef}
                    summary={summary}
                    schoolName={schools.find((s) => s._id === filters.school)?.name || 'All Schools'}
                    filters={{
                        school: filters.school,
                        site: filters.site,
                        academicYear: filters.academicYear,
                        dateFrom: filters.dateFrom,
                        dateTo: filters.dateTo
                    }}
                    generatedBy="Financial Controller"
                    periodView={periodView}
                />
            </div>
        </>
    );
};

export default FinancialControllerDashboard;
