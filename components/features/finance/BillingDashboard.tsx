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
import { TabView, TabPanel } from 'primereact/tabview';
import { Panel } from 'primereact/panel';
import { Badge } from 'primereact/badge';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { getAcademicYears } from '@/lib/utils/utilFunctions';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * FINANCE OFFICER DASHBOARD - BILLING MODEL ALIGNED
 *
 * This dashboard provides operational financial visibility for finance officers.
 * ALL metrics are derived exclusively from the StudentBilling collection.
 *
 * Features:
 * - Student-level billing summaries
 * - Outstanding balances per student
 * - Term/semester billing totals
 * - Additional charges breakdown
 * - Arrears carried forward tracking
 * - Debtors list (sortable and filterable)
 * - Aging analysis (30/60/90+ days)
 */

interface BillingSummary {
    totalExpectedRevenue: number;
    totalBilled: number;
    totalArrears: number;
    additionalCharges: number;
    totalCollections: number;
    totalOutstanding: number;
    totalOverpaid: number;
    collectionRate: number;
    collectionGrowth: number;
    studentsBilled: number;
    defaultersCount: number;
    criticalDebtorsCount: number;
    currency: string;
}

interface CashFlow {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    dailyCollections: {
        canteenTotal: number;
        busTotal: number;
        total: number;
    };
}

interface AgingBucket {
    _id: string;
    totalAmount: number;
    count: number;
}

interface Debtor {
    studentId: string;
    studentName: string;
    studentCode: string;
    className: string;
    totalBilled: number;
    totalPaid: number;
    currentBalance: number;
    balanceBroughtForward: number;
    billGeneratedDate: string;
    paymentDueDate: string;
    paymentRatio: number;
}

interface ChargeBreakdown {
    _id: string;
    totalAmount: number;
    count: number;
}

interface SiteBreakdown {
    _id: string;
    siteName: string;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    arrears: number;
    studentCount: number;
    defaultersCount: number;
    collectionRate: number;
}

interface ClassBreakdown {
    _id: string;
    className: string;
    level: string;
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    studentCount: number;
    collectionRate: number;
}

interface School {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    description: string;
    siteName?: string;
}

interface BillingAnalyticsData {
    summary: BillingSummary;
    cashFlow: CashFlow;
    expenditures: {
        total: number;
        paid: number;
        pending: number;
        approved: number;
    };
    statusDistribution: Record<string, { count: number; amount: number }>;
    chargesBreakdown: ChargeBreakdown[];
    bySite: SiteBreakdown[];
    byClass: ClassBreakdown[];
    agingAnalysis: AgingBucket[];
    topDebtors: Debtor[];
    recentActivity: any[];
    filters: any;
}

const termOptions = [
    { label: 'All Terms', value: '' },
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

export const BillingDashboard: React.FC = () => {
    const { user } = useAuth();
    console.log(user)
    const router = useRouter();
    const toast = useRef<Toast>(null);

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<BillingAnalyticsData | null>(null);
    const [sites, setSites] = useState<Site[]>([]);

    const [filters, setFilters] = useState({
        school: '',
        site: '',
        academicYear: '',
        academicTerm: '' as string | number
    });

    const [studentSearch, setStudentSearch] = useState('');
    const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
    const [debtorDialogVisible, setDebtorDialogVisible] = useState(false);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    // Chart states
    const [agingChartData, setAgingChartData] = useState<any>(null);
    const [chargesChartData, setChargesChartData] = useState<any>(null);
    const [siteComparisonData, setSiteComparisonData] = useState<any>(null);

    useEffect(() => {
        fetchSites();
        fetchBillingData();
    }, [user]);

    useEffect(() => {
        fetchBillingData();
    }, [filters]);

    useEffect(() => {
        if (data) {
            initializeCharts();
        }
    }, [data]);

    const fetchSites = async () => {
        try {
            if (!user) return;
            const response = await fetch(`/api/sites?school=${user?.school}`);
            const data = await response.json();
            if (Array.isArray(data.sites)) {
                setSites(data.sites);
                if (data.sites.length > 0 && !filters.site) {
                    setFilters((prev) => ({ ...prev, site: data.sites[0]._id }));
                }
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchBillingData = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const queryParams = new URLSearchParams();
            if (filters.site) {
                queryParams.append('schoolSite', filters.site);
            } else if (user.schoolSite) {
                queryParams.append('schoolSite', user.schoolSite);
            }
            if (filters.school) queryParams.append('school', filters.school);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.academicTerm) queryParams.append('academicTerm', filters.academicTerm.toString());
            queryParams.append('dashboardType', 'finance');

            const response = await fetch(`/api/billing-analytics?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch billing data');

            const result = await response.json();
            if (result.success) {
                setData(result.data);
            } else {
                throw new Error(result.error || 'Failed to load data');
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to load billing data',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const initializeCharts = () => {
        if (!data) return;

        // Aging Analysis Pie Chart
        const agingLabels = data.agingAnalysis.map((a) => a._id);
        const agingValues = data.agingAnalysis.map((a) => a.totalAmount);
        setAgingChartData({
            labels: agingLabels,
            datasets: [
                {
                    data: agingValues,
                    backgroundColor: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'],
                    hoverBackgroundColor: ['#16a34a', '#d97706', '#ea580c', '#dc2626']
                }
            ]
        });

        // Charges Breakdown Bar Chart
        const chargeLabels = data.chargesBreakdown.slice(0, 8).map((c) => c._id);
        const chargeValues = data.chargesBreakdown.slice(0, 8).map((c) => c.totalAmount);
        setChargesChartData({
            labels: chargeLabels,
            datasets: [
                {
                    label: 'Amount',
                    data: chargeValues,
                    backgroundColor: '#6366f1'
                }
            ]
        });

        // Site Comparison Chart
        if (data.bySite.length > 0) {
            setSiteComparisonData({
                labels: data.bySite.map((s) => s.siteName || 'Unknown'),
                datasets: [
                    {
                        label: 'Total Billed',
                        data: data.bySite.map((s) => s.totalBilled),
                        backgroundColor: '#3b82f6'
                    },
                    {
                        label: 'Collected',
                        data: data.bySite.map((s) => s.totalPaid),
                        backgroundColor: '#22c55e'
                    },
                    {
                        label: 'Outstanding',
                        data: data.bySite.map((s) => s.totalOutstanding),
                        backgroundColor: '#f59e0b'
                    }
                ]
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: data?.summary?.currency || 'GHS'
        }).format(amount);
    };

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const getStatusSeverity = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
        switch (status) {
            case 'clear':
                return 'success';
            case 'owing':
                return 'warning';
            case 'overpaid':
                return 'info';
            default:
                return 'danger';
        }
    };

    const viewDebtorDetails = (debtor: Debtor) => {
        setSelectedDebtor(debtor);
        setDebtorDialogVisible(true);
    };

    const filteredDebtors = data?.topDebtors.filter((d) => !studentSearch || d.studentName?.toLowerCase().includes(studentSearch.toLowerCase()) || d.studentCode?.toLowerCase().includes(studentSearch.toLowerCase())) || [];

    // Templates
    const balanceTemplate = (rowData: Debtor) => <span className={`font-bold ${rowData.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(rowData.currentBalance)}</span>;

    const paymentRatioTemplate = (rowData: Debtor) => {
        const ratio = rowData.paymentRatio * 100;
        const severity = ratio >= 75 ? 'success' : ratio >= 50 ? 'warning' : 'danger';
        return <Tag value={`${ratio.toFixed(0)}%`} severity={severity} />;
    };

    const actionsTemplate = (rowData: Debtor) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-sm" onClick={() => viewDebtorDetails(rowData)} tooltip="View Details" />
            <Button icon="pi pi-external-link" className="p-button-rounded p-button-text p-button-sm p-button-info" onClick={() => router.push(`/billing?student=${rowData.studentId}`)} tooltip="View Billing" />
        </div>
    );

    const chartOptions = {
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const
            }
        }
    };

    const barChartOptions = {
        ...chartOptions,
        indexAxis: 'y' as const,
        scales: {
            x: {
                beginAtZero: true
            }
        }
    };

    if (loading && !data) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <Skeleton height="3rem" className="mb-3" />
                        <Skeleton height="20rem" />
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <>
            <Toast ref={toast} />

            {/* Header */}
            <div className="flex flex-wrap justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="m-0 mb-2">Finance Officer Dashboard</h2>
                    <p className="text-600 m-0">
                        <i className="pi pi-database mr-2"></i>
                        All metrics sourced from Student Billing records
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button label="Student Billing" icon="pi pi-list" className="p-button-outlined" onClick={() => router.push('/billing')} />
                    <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchBillingData} loading={loading} />
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <div className="grid align-items-end">
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Site/Campus</label>
                        <Dropdown
                            value={filters.site}
                            options={sites.map((s) => ({ label: s.siteName || s.description, value: s._id }))}
                            onChange={(e) => setFilters({ ...filters, site: e.value })}
                            placeholder="All Sites"
                            className="w-full"
                            showClear
                            disabled={!filters.school}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Academic Year</label>
                        <Dropdown value={filters.academicYear} options={getAcademicYears} onChange={(e) => setFilters({ ...filters, academicYear: e.value })} placeholder="Current Year" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Term</label>
                        <Dropdown value={filters.academicTerm} options={termOptions} onChange={(e) => setFilters({ ...filters, academicTerm: e.value })} placeholder="All Terms" className="w-full" />
                    </div>
                </div>
            </Card>

            {/* Key Metrics Cards */}
            <div className="grid mb-3">
                {/* Total Expected Revenue */}
                <div className="col-12 lg:col-3 md:col-6">
                    <Card className="h-full bg-gradient-to-br from-blue-50 to-white">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2 font-medium">EXPECTED REVENUE</span>
                                <div className="text-3xl font-bold text-blue-600">{formatCurrency(data?.summary?.totalExpectedRevenue || 0)}</div>
                                <div className="text-sm text-600 mt-2">{data?.summary?.studentsBilled || 0} students billed</div>
                            </div>
                            <div className="bg-blue-100 text-blue-600 border-round p-2">
                                <i className="pi pi-calculator text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Total Collections */}
                <div className="col-12 lg:col-3 md:col-6">
                    <Card className="h-full bg-gradient-to-br from-green-50 to-white">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2 font-medium">TOTAL COLLECTIONS</span>
                                <div className="text-3xl font-bold text-green-600">{formatCurrency(data?.summary?.totalCollections || 0)}</div>
                                <div className="flex align-items-center gap-2 mt-2">
                                    <i className={`pi ${(data?.summary?.collectionGrowth || 0) >= 0 ? 'pi-arrow-up text-green-600' : 'pi-arrow-down text-red-600'}`}></i>
                                    <span className={`text-sm ${(data?.summary?.collectionGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{Math.abs(data?.summary?.collectionGrowth || 0).toFixed(1)}% vs last period</span>
                                </div>
                            </div>
                            <div className="bg-green-100 text-green-600 border-round p-2">
                                <i className="pi pi-wallet text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Outstanding */}
                <div className="col-12 lg:col-3 md:col-6">
                    <Card className="h-full bg-gradient-to-br from-orange-50 to-white">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2 font-medium">TOTAL OUTSTANDING</span>
                                <div className="text-3xl font-bold text-orange-600">{formatCurrency(data?.summary?.totalOutstanding || 0)}</div>
                                <div className="text-sm text-600 mt-2">
                                    <i className="pi pi-exclamation-triangle text-red-500 mr-1"></i>
                                    {data?.summary?.criticalDebtorsCount || 0} critical debtors
                                </div>
                            </div>
                            <div className="bg-orange-100 text-orange-600 border-round p-2">
                                <i className="pi pi-exclamation-circle text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Arrears */}
                <div className="col-12 lg:col-3 md:col-6">
                    <Card className="h-full bg-gradient-to-br from-purple-50 to-white">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2 font-medium">TOTAL ARREARS (B/F)</span>
                                <div className="text-3xl font-bold text-purple-600">{formatCurrency(data?.summary?.totalArrears || 0)}</div>
                                <div className="text-sm text-600 mt-2">Balance brought forward</div>
                            </div>
                            <div className="bg-purple-100 text-purple-600 border-round p-2">
                                <i className="pi pi-history text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Collection Progress & Cash Flow */}
            <div className="grid mb-3">
                <div className="col-12 lg:col-4">
                    <Card className="h-full">
                        <h4 className="mt-0 mb-3">Collection Progress</h4>
                        <div className="text-center mb-3">
                            <div className="text-5xl font-bold text-primary mb-2">{formatPercent(data?.summary?.collectionRate || 0)}</div>
                            <div className="text-sm text-600">Collection Rate</div>
                        </div>
                        <ProgressBar value={data?.summary?.collectionRate || 0} className="h-2rem mb-3" displayValueTemplate={() => `${(data?.summary?.collectionRate || 0).toFixed(1)}%`} />
                        <Divider />
                        <div className="grid">
                            <div className="col-6 text-center">
                                <div className="text-600 text-sm mb-1">Expected</div>
                                <div className="font-bold">{formatCurrency(data?.summary?.totalExpectedRevenue || 0)}</div>
                            </div>
                            <div className="col-6 text-center">
                                <div className="text-600 text-sm mb-1">Collected</div>
                                <div className="font-bold text-green-600">{formatCurrency(data?.summary?.totalCollections || 0)}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 lg:col-4">
                    <Card className="h-full">
                        <h4 className="mt-0 mb-3">Cash Flow Summary</h4>
                        <div className="mb-3">
                            <div className="flex justify-content-between mb-2">
                                <span className="text-600">Total Income</span>
                                <span className="font-bold text-green-600">{formatCurrency(data?.cashFlow?.totalIncome || 0)}</span>
                            </div>
                            <div className="flex justify-content-between mb-2">
                                <span className="text-600">Total Expenses</span>
                                <span className="font-bold text-red-600">{formatCurrency(data?.cashFlow?.totalExpenses || 0)}</span>
                            </div>
                            <Divider />
                            <div className="flex justify-content-between">
                                <span className="text-900 font-bold">Net Cash Flow</span>
                                <span className={`font-bold text-xl ${(data?.cashFlow?.netCashFlow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(data?.cashFlow?.netCashFlow || 0)}</span>
                            </div>
                        </div>
                        <Divider />
                        <div className="text-sm">
                            <div className="flex justify-content-between mb-1">
                                <span className="text-600">Daily Collections</span>
                                <span>{formatCurrency(data?.cashFlow?.dailyCollections?.total || 0)}</span>
                            </div>
                            <div className="flex justify-content-between mb-1 ml-3">
                                <span className="text-500">Canteen</span>
                                <span>{formatCurrency(data?.cashFlow?.dailyCollections?.canteenTotal || 0)}</span>
                            </div>
                            <div className="flex justify-content-between ml-3">
                                <span className="text-500">Transport</span>
                                <span>{formatCurrency(data?.cashFlow?.dailyCollections?.busTotal || 0)}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 lg:col-4">
                    <Card className="h-full">
                        <h4 className="mt-0 mb-3">Billing Status Distribution</h4>
                        <div className="flex flex-column gap-3">
                            {Object.entries(data?.statusDistribution || {}).map(([status, info]) => (
                                <div key={status} className="flex justify-content-between align-items-center p-2 border-round surface-100">
                                    <div className="flex align-items-center gap-2">
                                        <Tag value={status.toUpperCase()} severity={getStatusSeverity(status)} />
                                        <span className="text-600">{info.count} students</span>
                                    </div>
                                    <span className="font-bold">{formatCurrency(Math.abs(info.amount))}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Tabs for detailed views */}
            <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
                {/* Debtors List Tab */}
                <TabPanel
                    header={
                        <span className="flex align-items-center gap-2">
                            <i className="pi pi-users"></i>
                            <span>Debtors List</span>
                            <Badge value={data?.topDebtors?.length || 0} severity="danger" />
                        </span>
                    }
                >
                    <div className="mb-3">
                        <span className="p-input-icon-left w-full md:w-auto">
                            <i className="pi pi-search" />
                            <InputText value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full md:w-20rem" />
                        </span>
                    </div>

                    <DataTable value={filteredDebtors} paginator rows={10} rowsPerPageOptions={[10, 25, 50]} loading={loading} emptyMessage="No debtors found" stripedRows sortField="currentBalance" sortOrder={-1}>
                        <Column field="studentCode" header="Student ID" sortable style={{ minWidth: '120px' }} />
                        <Column field="studentName" header="Name" sortable style={{ minWidth: '200px' }} />
                        <Column field="className" header="Class" sortable style={{ minWidth: '120px' }} />
                        <Column field="totalBilled" header="Total Billed" body={(r) => formatCurrency(r.totalBilled)} sortable style={{ minWidth: '130px' }} />
                        <Column field="totalPaid" header="Paid" body={(r) => formatCurrency(r.totalPaid)} sortable style={{ minWidth: '120px' }} />
                        <Column field="currentBalance" header="Balance" body={balanceTemplate} sortable style={{ minWidth: '130px' }} />
                        <Column field="paymentRatio" header="% Paid" body={paymentRatioTemplate} sortable style={{ minWidth: '100px' }} />
                        <Column header="Actions" body={actionsTemplate} style={{ minWidth: '100px' }} />
                    </DataTable>
                </TabPanel>

                {/* Aging Analysis Tab */}
                <TabPanel
                    header={
                        <span className="flex align-items-center gap-2">
                            <i className="pi pi-clock"></i>
                            <span>Aging Analysis</span>
                        </span>
                    }
                >
                    <div className="grid">
                        <div className="col-12 lg:col-6">
                            <Panel header="Outstanding by Age">{agingChartData ? <Chart type="doughnut" data={agingChartData} options={chartOptions} className="h-20rem" /> : <Skeleton height="20rem" />}</Panel>
                        </div>
                        <div className="col-12 lg:col-6">
                            <Panel header="Aging Breakdown">
                                <DataTable value={data?.agingAnalysis || []} emptyMessage="No aging data">
                                    <Column field="_id" header="Age Bucket" />
                                    <Column field="count" header="Students" />
                                    <Column field="totalAmount" header="Total Outstanding" body={(r) => formatCurrency(r.totalAmount)} />
                                </DataTable>
                            </Panel>
                        </div>
                    </div>
                </TabPanel>

                {/* Charges Breakdown Tab */}
                <TabPanel
                    header={
                        <span className="flex align-items-center gap-2">
                            <i className="pi pi-money-bill"></i>
                            <span>Charges Breakdown</span>
                        </span>
                    }
                >
                    <div className="grid">
                        <div className="col-12 lg:col-6">
                            <Panel header="Additional Charges by Category">{chargesChartData ? <Chart type="bar" data={chargesChartData} options={barChartOptions} className="h-20rem" /> : <Skeleton height="20rem" />}</Panel>
                        </div>
                        <div className="col-12 lg:col-6">
                            <Panel header="Charges Detail">
                                <DataTable value={data?.chargesBreakdown || []} emptyMessage="No charges data">
                                    <Column field="_id" header="Category" />
                                    <Column field="count" header="Count" />
                                    <Column field="totalAmount" header="Total Amount" body={(r) => formatCurrency(r.totalAmount)} />
                                </DataTable>
                            </Panel>
                        </div>
                    </div>
                </TabPanel>

                {/* By Site Tab */}
                <TabPanel
                    header={
                        <span className="flex align-items-center gap-2">
                            <i className="pi pi-building"></i>
                            <span>By Site/Campus</span>
                        </span>
                    }
                >
                    <div className="grid">
                        <div className="col-12 lg:col-7">
                            <Panel header="Site Comparison">{siteComparisonData ? <Chart type="bar" data={siteComparisonData} options={chartOptions} className="h-20rem" /> : <Skeleton height="20rem" />}</Panel>
                        </div>
                        <div className="col-12 lg:col-5">
                            <Panel header="Site Performance">
                                <DataTable value={data?.bySite || []} emptyMessage="No site data" scrollable scrollHeight="300px">
                                    <Column field="siteName" header="Site" />
                                    <Column
                                        field="collectionRate"
                                        header="Collection Rate"
                                        body={(r) => <Tag value={`${r.collectionRate.toFixed(0)}%`} severity={r.collectionRate >= 70 ? 'success' : r.collectionRate >= 50 ? 'warning' : 'danger'} />}
                                    />
                                    <Column field="studentCount" header="Students" />
                                    <Column field="defaultersCount" header="Defaulters" />
                                </DataTable>
                            </Panel>
                        </div>
                    </div>
                </TabPanel>

                {/* By Class Tab */}
                <TabPanel
                    header={
                        <span className="flex align-items-center gap-2">
                            <i className="pi pi-book"></i>
                            <span>By Class</span>
                        </span>
                    }
                >
                    <DataTable value={data?.byClass || []} paginator rows={10} emptyMessage="No class data" stripedRows sortField="totalOutstanding" sortOrder={-1}>
                        <Column field="className" header="Class" sortable />
                        <Column field="level" header="Level" sortable />
                        <Column field="studentCount" header="Students" sortable />
                        <Column field="totalBilled" header="Total Billed" body={(r) => formatCurrency(r.totalBilled)} sortable />
                        <Column field="totalPaid" header="Collected" body={(r) => formatCurrency(r.totalPaid)} sortable />
                        <Column field="totalOutstanding" header="Outstanding" body={(r) => formatCurrency(r.totalOutstanding)} sortable />
                        <Column
                            field="collectionRate"
                            header="Collection Rate"
                            body={(r) => (
                                <div className="flex align-items-center gap-2">
                                    <ProgressBar value={r.collectionRate} showValue={false} style={{ width: '100px', height: '8px' }} />
                                    <span>{r.collectionRate.toFixed(0)}%</span>
                                </div>
                            )}
                            sortable
                        />
                    </DataTable>
                </TabPanel>
            </TabView>

            {/* Quick Actions */}
            <Card title="Quick Actions" className="mt-3">
                <div className="grid">
                    <div className="col-12 md:col-6 lg:col-3">
                        <Button label="Record Payment" icon="pi pi-plus-circle" className="w-full p-button-success" onClick={() => router.push('/payments')} />
                    </div>
                    <div className="col-12 md:col-6 lg:col-3">
                        <Button label="View All Debtors" icon="pi pi-exclamation-triangle" className="w-full p-button-warning" onClick={() => router.push('/defaulters')} />
                    </div>
                    <div className="col-12 md:col-6 lg:col-3">
                        <Button label="Student Billing" icon="pi pi-file" className="w-full p-button-info" onClick={() => router.push('/billing')} />
                    </div>
                    <div className="col-12 md:col-6 lg:col-3">
                        <Button label="Generate Bills" icon="pi pi-cog" className="w-full p-button-help" onClick={() => router.push('/billing?action=generate')} />
                    </div>
                </div>
            </Card>

            {/* Debtor Details Dialog */}
            <Dialog header="Debtor Details" visible={debtorDialogVisible} onHide={() => setDebtorDialogVisible(false)} style={{ width: '600px' }} modal>
                {selectedDebtor && (
                    <div className="grid">
                        <div className="col-12">
                            <div className="text-xl font-bold mb-2">{selectedDebtor.studentName}</div>
                            <div className="text-600 mb-3">
                                <span className="mr-3">
                                    <i className="pi pi-id-card mr-1"></i> {selectedDebtor.studentCode}
                                </span>
                                <span>
                                    <i className="pi pi-book mr-1"></i> {selectedDebtor.className}
                                </span>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="surface-100 p-3 border-round">
                                <div className="text-500 text-sm mb-1">Total Billed</div>
                                <div className="text-xl font-bold">{formatCurrency(selectedDebtor.totalBilled)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="surface-100 p-3 border-round">
                                <div className="text-500 text-sm mb-1">Total Paid</div>
                                <div className="text-xl font-bold text-green-600">{formatCurrency(selectedDebtor.totalPaid)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="surface-100 p-3 border-round">
                                <div className="text-500 text-sm mb-1">Current Balance</div>
                                <div className="text-xl font-bold text-red-600">{formatCurrency(selectedDebtor.currentBalance)}</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="surface-100 p-3 border-round">
                                <div className="text-500 text-sm mb-1">Arrears (B/F)</div>
                                <div className="text-xl font-bold text-purple-600">{formatCurrency(selectedDebtor.balanceBroughtForward)}</div>
                            </div>
                        </div>
                        <div className="col-12">
                            <Divider />
                            <div className="flex justify-content-between align-items-center">
                                <span>Payment Progress</span>
                                <span className="font-bold">{(selectedDebtor.paymentRatio * 100).toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={selectedDebtor.paymentRatio * 100} className="mt-2" />
                        </div>
                        <div className="col-12">
                            <Divider />
                            <Button
                                label="View Full Billing History"
                                icon="pi pi-external-link"
                                className="w-full"
                                onClick={() => {
                                    setDebtorDialogVisible(false);
                                    router.push(`/billing?student=${selectedDebtor.studentId}`);
                                }}
                            />
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
};

export default BillingDashboard;
