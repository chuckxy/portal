'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Chip } from 'primereact/chip';
import { Panel } from 'primereact/panel';
import { TabView, TabPanel } from 'primereact/tabview';
import { Chart } from 'primereact/chart';
import { Skeleton } from 'primereact/skeleton';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Badge } from 'primereact/badge';
import { OverlayPanel } from 'primereact/overlaypanel';
import { useAuth } from '@/context/AuthContext';
import { format, formatDistanceToNow, subDays, startOfDay, endOfDay } from 'date-fns';

// -------------------- TYPES --------------------
interface ActivityLog {
    _id: string;
    timestamp: string;
    userId?: string;
    userName?: string;
    userCategory?: string;
    schoolId: string;
    schoolName?: string;
    schoolSiteId?: string;
    schoolSiteName?: string;
    actionCategory: string;
    actionType: string;
    actionDescription: string;
    entity: {
        entityType: string;
        entityId?: string;
        entityName?: string;
    };
    previousState?: Array<{
        fieldName: string;
        previousValue?: any;
        newValue?: any;
    }>;
    clientInfo: {
        ipAddress?: string;
        deviceType?: string;
        browser?: string;
        os?: string;
    };
    outcome: string;
    errorMessage?: string;
    executionTimeMs?: number;
    metadata?: Record<string, any>;
}

interface Statistics {
    totalLogs: number;
    byActionCategory: Record<string, number>;
    byOutcome: Record<string, number>;
    byEntityType: Record<string, number>;
    topUsers: Array<{ userId: string; userName: string; count: number }>;
    recentErrors: ActivityLog[];
}

interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}

// -------------------- FILTER OPTIONS --------------------
const actionCategoryOptions = [
    { label: 'All Categories', value: '' },
    { label: 'Authentication', value: 'authentication' },
    { label: 'CRUD Operations', value: 'crud' },
    { label: 'Permissions', value: 'permission' },
    { label: 'Sensitive Actions', value: 'sensitive' },
    { label: 'System', value: 'system' },
    { label: 'Audit', value: 'audit' }
];

const actionTypeOptions = [
    { label: 'All Types', value: '' },
    // Authentication
    { label: 'Login', value: 'login' },
    { label: 'Logout', value: 'logout' },
    { label: 'Login Failed', value: 'login_failed' },
    { label: 'Password Change', value: 'password_change' },
    // CRUD
    { label: 'Create', value: 'create' },
    { label: 'Read', value: 'read' },
    { label: 'Update', value: 'update' },
    { label: 'Delete', value: 'delete' },
    { label: 'Bulk Create', value: 'bulk_create' },
    { label: 'Bulk Update', value: 'bulk_update' },
    { label: 'Bulk Delete', value: 'bulk_delete' },
    // Permission
    { label: 'Role Change', value: 'role_change' },
    { label: 'Permission Grant', value: 'permission_grant' },
    { label: 'Permission Revoke', value: 'permission_revoke' },
    { label: 'Access Denied', value: 'access_denied' },
    // Sensitive
    { label: 'School Delete', value: 'school_delete' },
    { label: 'Data Export', value: 'data_export' },
    { label: 'Data Import', value: 'data_import' },
    { label: 'Config Change', value: 'config_change' },
    { label: 'Payment Process', value: 'payment_process' },
    { label: 'Payment Reversal', value: 'payment_reversal' }
];

const outcomeOptions = [
    { label: 'All Outcomes', value: '' },
    { label: 'Success', value: 'success' },
    { label: 'Failure', value: 'failure' },
    { label: 'Error', value: 'error' },
    { label: 'Pending', value: 'pending' }
];

const entityTypeOptions = [
    { label: 'All Entities', value: '' },
    { label: 'Person', value: 'person' },
    { label: 'School', value: 'school' },
    { label: 'School Site', value: 'school_site' },
    { label: 'Faculty', value: 'faculty' },
    { label: 'Department', value: 'department' },
    { label: 'Class', value: 'class' },
    { label: 'Subject', value: 'subject' },
    { label: 'Exam Score', value: 'exam_score' },
    { label: 'Fees Configuration', value: 'fees_configuration' },
    { label: 'Fees Payment', value: 'fees_payment' },
    { label: 'Scholarship', value: 'scholarship' },
    { label: 'Library Item', value: 'library_item' },
    { label: 'Library Lending', value: 'library_lending' },
    { label: 'Timetable', value: 'timetable' },
    { label: 'Expenditure', value: 'expenditure' },
    { label: 'LMS Course', value: 'lms_course' },
    { label: 'Activity Log', value: 'activity_log' }
];

const dateRangePresets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Custom', value: 'custom' }
];

// -------------------- COMPONENT --------------------
const ActivityLogManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);
    const detailsPanelRef = useRef<OverlayPanel>(null);

    // State
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [pagination, setPagination] = useState<PaginationInfo>({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0,
        hasMore: false
    });

    // Filters
    const [dateRangePreset, setDateRangePreset] = useState('7days');
    const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [actionCategory, setActionCategory] = useState('');
    const [actionType, setActionType] = useState('');
    const [outcome, setOutcome] = useState('');
    const [entityType, setEntityType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');

    // Sort
    const [sortField, setSortField] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState<1 | -1>(-1);

    // Detail view
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
    const [detailsVisible, setDetailsVisible] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState(0);

    // -------------------- DATA FETCHING --------------------
    const fetchLogs = useCallback(async () => {
        if (!user?.school) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();

            // Add authentication context
            params.append('school', user.school);
            if (user.personCategory) params.append('userCategory', user.personCategory);

            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());
            params.append('sortField', sortField);
            params.append('sortOrder', sortOrder === 1 ? 'asc' : 'desc');

            if (startDate) params.append('startDate', startOfDay(startDate).toISOString());
            if (endDate) params.append('endDate', endOfDay(endDate).toISOString());
            if (actionCategory) params.append('actionCategory', actionCategory);
            if (actionType) params.append('actionType', actionType);
            if (outcome) params.append('outcome', outcome);
            if (entityType) params.append('entityType', entityType);
            if (searchTerm) params.append('search', searchTerm);
            if (selectedUserId) params.append('userId', selectedUserId);

            const response = await fetch(`/api/activity-logs?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.data || []);
                setPagination(data.pagination);
            } else {
                toastRef.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to fetch logs',
                    life: 5000
                });
            }
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to fetch activity logs',
                life: 5000
            });
        } finally {
            setLoading(false);
        }
    }, [user, pagination.page, pagination.limit, sortField, sortOrder, startDate, endDate, actionCategory, actionType, outcome, entityType, searchTerm, selectedUserId]);

    const fetchStatistics = useCallback(async () => {
        if (!user?.school) return;

        setStatsLoading(true);
        try {
            const params = new URLSearchParams();

            // Add authentication context
            params.append('school', user.school);
            if (user.personCategory) params.append('userCategory', user.personCategory);

            if (startDate) params.append('startDate', startOfDay(startDate).toISOString());
            if (endDate) params.append('endDate', endOfDay(endDate).toISOString());

            const response = await fetch(`/api/activity-logs/statistics?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setStatistics(data.statistics);
            }
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
        } finally {
            setStatsLoading(false);
        }
    }, [user, startDate, endDate]);

    // Initial load
    useEffect(() => {
        fetchLogs();
        fetchStatistics();
    }, []);

    // Refetch when filters change
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [startDate, endDate, actionCategory, actionType, outcome, entityType, selectedUserId, sortField, sortOrder]);

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page === 1) {
                fetchLogs();
            } else {
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Update statistics when date range changes
    useEffect(() => {
        fetchStatistics();
    }, [startDate, endDate]);

    // -------------------- HANDLERS --------------------
    const handleDatePresetChange = (preset: string) => {
        setDateRangePreset(preset);
        const now = new Date();

        switch (preset) {
            case 'today':
                setStartDate(startOfDay(now));
                setEndDate(endOfDay(now));
                break;
            case 'yesterday':
                const yesterday = subDays(now, 1);
                setStartDate(startOfDay(yesterday));
                setEndDate(endOfDay(yesterday));
                break;
            case '7days':
                setStartDate(subDays(now, 7));
                setEndDate(now);
                break;
            case '30days':
                setStartDate(subDays(now, 30));
                setEndDate(now);
                break;
            case 'thisMonth':
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setEndDate(now);
                break;
            case 'custom':
                // Keep current dates
                break;
        }
    };

    const handlePageChange = (event: DataTablePageEvent) => {
        setPagination((prev) => ({
            ...prev,
            page: (event.page || 0) + 1,
            limit: event.rows || 25
        }));
        setTimeout(fetchLogs, 0);
    };

    const handleSort = (event: DataTableSortEvent) => {
        setSortField(event.sortField as string);
        setSortOrder(event.sortOrder as 1 | -1);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const body: any = {
                school: user?.school,
                userCategory: user?.personCategory
            };
            if (startDate) body.startDate = startOfDay(startDate).toISOString();
            if (endDate) body.endDate = endOfDay(endDate).toISOString();
            if (actionCategory) body.actionCategory = actionCategory;
            if (actionType) body.actionType = actionType;
            if (outcome) body.outcome = outcome;
            if (entityType) body.entityType = entityType;
            if (searchTerm) body.search = searchTerm;
            if (selectedUserId) body.userId = selectedUserId;

            const response = await fetch('/api/activity-logs/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toastRef.current?.show({
                severity: 'success',
                summary: 'Export Complete',
                detail: 'Activity logs exported successfully',
                life: 3000
            });
        } catch (error) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Export Failed',
                detail: 'Failed to export activity logs',
                life: 5000
            });
        } finally {
            setExporting(false);
        }
    };

    const handleClearFilters = () => {
        setDateRangePreset('7days');
        setStartDate(subDays(new Date(), 7));
        setEndDate(new Date());
        setActionCategory('');
        setActionType('');
        setOutcome('');
        setEntityType('');
        setSearchTerm('');
        setSelectedUserId('');
    };

    const handleViewDetails = (log: ActivityLog) => {
        setSelectedLog(log);
        setDetailsVisible(true);
    };

    // -------------------- COLUMN TEMPLATES --------------------
    const timestampTemplate = (rowData: ActivityLog) => {
        const date = new Date(rowData.timestamp);
        return (
            <div className="flex flex-column">
                <span className="font-semibold text-sm">{format(date, 'MMM dd, yyyy')}</span>
                <span className="text-xs text-500">{format(date, 'HH:mm:ss')}</span>
                <span className="text-xs text-400">{formatDistanceToNow(date, { addSuffix: true })}</span>
            </div>
        );
    };

    const userTemplate = (rowData: ActivityLog) => {
        return (
            <div className="flex flex-column">
                <span className="font-semibold text-sm">{rowData.userName || 'System'}</span>
                {rowData.userCategory && <Chip label={rowData.userCategory} className="text-xs mt-1" style={{ fontSize: '0.7rem', padding: '0 0.5rem' }} />}
            </div>
        );
    };

    const actionTemplate = (rowData: ActivityLog) => {
        const categoryColors: Record<string, string> = {
            authentication: 'info',
            crud: 'primary',
            permission: 'warning',
            sensitive: 'danger',
            system: 'secondary',
            audit: 'help'
        };

        return (
            <div className="flex flex-column gap-1">
                <Tag value={rowData.actionCategory} severity={(categoryColors[rowData.actionCategory] as any) || 'secondary'} className="text-xs" />
                <span className="text-sm">{rowData.actionType.replace(/_/g, ' ')}</span>
            </div>
        );
    };

    const entityTemplate = (rowData: ActivityLog) => {
        return (
            <div className="flex flex-column">
                <span className="font-semibold text-sm">{rowData.entity.entityType.replace(/_/g, ' ')}</span>
                {rowData.entity.entityName && (
                    <span className="text-xs text-500 text-overflow-ellipsis" style={{ maxWidth: '150px' }}>
                        {rowData.entity.entityName}
                    </span>
                )}
            </div>
        );
    };

    const outcomeTemplate = (rowData: ActivityLog) => {
        const severityMap: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
            success: 'success',
            failure: 'warning',
            error: 'danger',
            pending: 'info'
        };

        return (
            <Tag
                value={rowData.outcome}
                severity={severityMap[rowData.outcome] || 'info'}
                icon={rowData.outcome === 'success' ? 'pi pi-check' : rowData.outcome === 'failure' ? 'pi pi-times' : rowData.outcome === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-clock'}
            />
        );
    };

    const clientInfoTemplate = (rowData: ActivityLog) => {
        const { clientInfo } = rowData;
        return (
            <div className="flex flex-column text-xs">
                <span className="text-500">
                    <i className="pi pi-globe mr-1"></i>
                    {clientInfo.ipAddress || 'Unknown'}
                </span>
                {clientInfo.browser && (
                    <span className="text-400">
                        {clientInfo.browser} / {clientInfo.os}
                    </span>
                )}
            </div>
        );
    };

    const actionsTemplate = (rowData: ActivityLog) => {
        return <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-sm" tooltip="View Details" tooltipOptions={{ position: 'left' }} onClick={() => handleViewDetails(rowData)} />;
    };

    // -------------------- STATISTICS CHARTS --------------------
    const renderCategoryChart = () => {
        if (!statistics) return null;

        const data = {
            labels: Object.keys(statistics.byActionCategory),
            datasets: [
                {
                    data: Object.values(statistics.byActionCategory),
                    backgroundColor: [
                        '#3B82F6', // blue
                        '#10B981', // green
                        '#F59E0B', // yellow
                        '#EF4444', // red
                        '#8B5CF6', // purple
                        '#6B7280' // gray
                    ]
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        };

        return <Chart type="doughnut" data={data} options={options} style={{ height: '250px' }} />;
    };

    const renderOutcomeChart = () => {
        if (!statistics) return null;

        const data = {
            labels: Object.keys(statistics.byOutcome),
            datasets: [
                {
                    data: Object.values(statistics.byOutcome),
                    backgroundColor: [
                        '#10B981', // success - green
                        '#F59E0B', // failure - yellow
                        '#EF4444', // error - red
                        '#3B82F6' // pending - blue
                    ]
                }
            ]
        };

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom' as const,
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                }
            }
        };

        return <Chart type="pie" data={data} options={options} style={{ height: '250px' }} />;
    };

    // -------------------- RENDER --------------------
    return (
        <div className="activity-log-management">
            <Toast ref={toastRef} />

            {/* Header */}
            <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-4 gap-3">
                <div>
                    <h2 className="text-2xl font-bold m-0 mb-1">Activity Logs</h2>
                    <p className="text-500 m-0">View and audit all system activities across your school</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        className="p-button-outlined"
                        onClick={() => {
                            fetchLogs();
                            fetchStatistics();
                        }}
                        loading={loading}
                    />
                    <Button label="Export" icon="pi pi-download" className="p-button-success" onClick={handleExport} loading={exporting} disabled={logs.length === 0} />
                </div>
            </div>

            {/* Tabs */}
            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                {/* Logs Tab */}
                <TabPanel header="Activity Logs" leftIcon="pi pi-list mr-2">
                    {/* Filters Card */}
                    <Card className="mb-4">
                        <div className="grid">
                            {/* Date Range */}
                            <div className="col-12 md:col-6 lg:col-3">
                                <label className="block text-sm font-medium mb-2">Date Range</label>
                                <Dropdown value={dateRangePreset} options={dateRangePresets} onChange={(e) => handleDatePresetChange(e.value)} className="w-full" placeholder="Select range" />
                            </div>

                            {dateRangePreset === 'custom' && (
                                <>
                                    <div className="col-12 md:col-6 lg:col-2">
                                        <label className="block text-sm font-medium mb-2">Start Date</label>
                                        <Calendar value={startDate} onChange={(e) => setStartDate(e.value as Date)} className="w-full" showIcon dateFormat="yy-mm-dd" />
                                    </div>
                                    <div className="col-12 md:col-6 lg:col-2">
                                        <label className="block text-sm font-medium mb-2">End Date</label>
                                        <Calendar value={endDate} onChange={(e) => setEndDate(e.value as Date)} className="w-full" showIcon dateFormat="yy-mm-dd" />
                                    </div>
                                </>
                            )}

                            {/* Action Category */}
                            <div className="col-12 md:col-6 lg:col-3">
                                <label className="block text-sm font-medium mb-2">Category</label>
                                <Dropdown value={actionCategory} options={actionCategoryOptions} onChange={(e) => setActionCategory(e.value)} className="w-full" placeholder="All categories" />
                            </div>

                            {/* Action Type */}
                            <div className="col-12 md:col-6 lg:col-3">
                                <label className="block text-sm font-medium mb-2">Action Type</label>
                                <Dropdown value={actionType} options={actionTypeOptions} onChange={(e) => setActionType(e.value)} className="w-full" placeholder="All types" filter />
                            </div>

                            {/* Outcome */}
                            <div className="col-12 md:col-6 lg:col-2">
                                <label className="block text-sm font-medium mb-2">Outcome</label>
                                <Dropdown value={outcome} options={outcomeOptions} onChange={(e) => setOutcome(e.value)} className="w-full" placeholder="All outcomes" />
                            </div>

                            {/* Entity Type */}
                            <div className="col-12 md:col-6 lg:col-3">
                                <label className="block text-sm font-medium mb-2">Entity Type</label>
                                <Dropdown value={entityType} options={entityTypeOptions} onChange={(e) => setEntityType(e.value)} className="w-full" placeholder="All entities" filter />
                            </div>

                            {/* Search */}
                            <div className="col-12 md:col-6 lg:col-4">
                                <label className="block text-sm font-medium mb-2">Search</label>
                                <span className="p-input-icon-left w-full">
                                    <i className="pi pi-search" />
                                    <InputText value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search in descriptions..." className="w-full" />
                                </span>
                            </div>

                            {/* Clear Filters */}
                            <div className="col-12 md:col-6 lg:col-2 flex align-items-end">
                                <Button label="Clear Filters" icon="pi pi-filter-slash" className="p-button-text w-full" onClick={handleClearFilters} />
                            </div>
                        </div>
                    </Card>

                    {/* Results Summary */}
                    <div className="flex justify-content-between align-items-center mb-3">
                        <span className="text-500">
                            Showing {logs.length} of {pagination.total} logs
                        </span>
                        {loading && <ProgressBar mode="indeterminate" style={{ height: '4px', width: '200px' }} />}
                    </div>

                    {/* Data Table */}
                    <DataTable
                        value={logs}
                        loading={loading}
                        paginator
                        lazy
                        first={(pagination.page - 1) * pagination.limit}
                        rows={pagination.limit}
                        totalRecords={pagination.total}
                        onPage={handlePageChange}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        sortField={sortField}
                        sortOrder={sortOrder}
                        onSort={handleSort}
                        emptyMessage="No activity logs found"
                        className="p-datatable-sm"
                        responsiveLayout="stack"
                        breakpoint="960px"
                        stripedRows
                        showGridlines
                        size="small"
                    >
                        <Column field="timestamp" header="Timestamp" body={timestampTemplate} sortable style={{ minWidth: '140px' }} />
                        <Column field="userName" header="User" body={userTemplate} style={{ minWidth: '120px' }} />
                        <Column field="actionCategory" header="Action" body={actionTemplate} sortable style={{ minWidth: '130px' }} />
                        <Column
                            field="actionDescription"
                            header="Description"
                            style={{ minWidth: '200px' }}
                            body={(row) => (
                                <span
                                    className="text-sm"
                                    style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {row.actionDescription}
                                </span>
                            )}
                        />
                        <Column field="entity.entityType" header="Entity" body={entityTemplate} style={{ minWidth: '120px' }} />
                        <Column field="outcome" header="Outcome" body={outcomeTemplate} sortable style={{ minWidth: '100px' }} />
                        <Column field="clientInfo" header="Client" body={clientInfoTemplate} style={{ minWidth: '130px' }} />
                        <Column body={actionsTemplate} style={{ width: '60px' }} />
                    </DataTable>
                </TabPanel>

                {/* Statistics Tab */}
                <TabPanel header="Statistics" leftIcon="pi pi-chart-bar mr-2">
                    {statsLoading ? (
                        <div className="grid">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="col-12 md:col-6 lg:col-3">
                                    <Skeleton height="150px" className="mb-2" />
                                </div>
                            ))}
                        </div>
                    ) : statistics ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid mb-4">
                                <div className="col-12 md:col-6 lg:col-3">
                                    <Card className="h-full">
                                        <div className="flex align-items-center justify-content-between">
                                            <div>
                                                <span className="block text-500 font-medium mb-2">Total Logs</span>
                                                <div className="text-3xl font-bold text-primary">{statistics.totalLogs.toLocaleString()}</div>
                                            </div>
                                            <div className="flex align-items-center justify-content-center bg-blue-100 border-round" style={{ width: '4rem', height: '4rem' }}>
                                                <i className="pi pi-list text-blue-500 text-2xl"></i>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6 lg:col-3">
                                    <Card className="h-full">
                                        <div className="flex align-items-center justify-content-between">
                                            <div>
                                                <span className="block text-500 font-medium mb-2">Success Rate</span>
                                                <div className="text-3xl font-bold text-green-500">{statistics.totalLogs > 0 ? (((statistics.byOutcome.success || 0) / statistics.totalLogs) * 100).toFixed(1) : 0}%</div>
                                            </div>
                                            <div className="flex align-items-center justify-content-center bg-green-100 border-round" style={{ width: '4rem', height: '4rem' }}>
                                                <i className="pi pi-check-circle text-green-500 text-2xl"></i>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6 lg:col-3">
                                    <Card className="h-full">
                                        <div className="flex align-items-center justify-content-between">
                                            <div>
                                                <span className="block text-500 font-medium mb-2">Errors</span>
                                                <div className="text-3xl font-bold text-red-500">{((statistics.byOutcome.error || 0) + (statistics.byOutcome.failure || 0)).toLocaleString()}</div>
                                            </div>
                                            <div className="flex align-items-center justify-content-center bg-red-100 border-round" style={{ width: '4rem', height: '4rem' }}>
                                                <i className="pi pi-exclamation-triangle text-red-500 text-2xl"></i>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6 lg:col-3">
                                    <Card className="h-full">
                                        <div className="flex align-items-center justify-content-between">
                                            <div>
                                                <span className="block text-500 font-medium mb-2">Active Users</span>
                                                <div className="text-3xl font-bold text-purple-500">{statistics.topUsers.length}</div>
                                            </div>
                                            <div className="flex align-items-center justify-content-center bg-purple-100 border-round" style={{ width: '4rem', height: '4rem' }}>
                                                <i className="pi pi-users text-purple-500 text-2xl"></i>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <Card title="Actions by Category" className="h-full">
                                        {renderCategoryChart()}
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6">
                                    <Card title="Outcomes Distribution" className="h-full">
                                        {renderOutcomeChart()}
                                    </Card>
                                </div>
                            </div>

                            {/* Top Users & Recent Errors */}
                            <div className="grid mt-4">
                                <div className="col-12 md:col-6">
                                    <Card title="Most Active Users">
                                        <ul className="list-none p-0 m-0">
                                            {statistics.topUsers.map((user, index) => (
                                                <li key={user.userId} className="flex align-items-center justify-content-between py-2 border-bottom-1 surface-border">
                                                    <div className="flex align-items-center gap-2">
                                                        <Badge value={index + 1} severity={index < 3 ? 'success' : 'info'} />
                                                        <span className="font-medium">{user.userName}</span>
                                                    </div>
                                                    <span className="text-500">{user.count.toLocaleString()} actions</span>
                                                </li>
                                            ))}
                                            {statistics.topUsers.length === 0 && <li className="text-500 text-center py-3">No user activity recorded</li>}
                                        </ul>
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6">
                                    <Card title="Recent Errors">
                                        <ul className="list-none p-0 m-0">
                                            {statistics.recentErrors.slice(0, 5).map((error) => (
                                                <li key={error._id} className="py-2 border-bottom-1 surface-border cursor-pointer hover:surface-100" onClick={() => handleViewDetails(error)}>
                                                    <div className="flex align-items-center justify-content-between">
                                                        <div className="flex flex-column">
                                                            <span className="font-medium text-sm">{error.actionDescription}</span>
                                                            <span className="text-xs text-500">{format(new Date(error.timestamp), 'MMM dd, HH:mm')}</span>
                                                        </div>
                                                        <Tag value={error.outcome} severity="danger" />
                                                    </div>
                                                    {error.errorMessage && <p className="text-xs text-red-500 mt-1 mb-0 text-overflow-ellipsis">{error.errorMessage}</p>}
                                                </li>
                                            ))}
                                            {statistics.recentErrors.length === 0 && (
                                                <li className="text-500 text-center py-3">
                                                    <i className="pi pi-check-circle text-green-500 mr-2"></i>
                                                    No recent errors
                                                </li>
                                            )}
                                        </ul>
                                    </Card>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-5">
                            <i className="pi pi-chart-bar text-4xl text-300 mb-3"></i>
                            <p className="text-500">No statistics available</p>
                        </div>
                    )}
                </TabPanel>
            </TabView>

            {/* Log Details Dialog */}
            <Dialog visible={detailsVisible} onHide={() => setDetailsVisible(false)} header="Activity Log Details" style={{ width: '90vw', maxWidth: '800px' }} breakpoints={{ '960px': '95vw' }} modal dismissableMask>
                {selectedLog && (
                    <div className="log-details">
                        {/* Basic Info */}
                        <Panel header="Basic Information" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-3">
                                        <label className="block text-500 text-sm mb-1">Timestamp</label>
                                        <span className="font-semibold">{format(new Date(selectedLog.timestamp), 'PPpp')}</span>
                                    </div>
                                    <div className="mb-3">
                                        <label className="block text-500 text-sm mb-1">User</label>
                                        <span className="font-semibold">
                                            {selectedLog.userName || 'System'}
                                            {selectedLog.userCategory && <Chip label={selectedLog.userCategory} className="ml-2 text-xs" />}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <label className="block text-500 text-sm mb-1">School Site</label>
                                        <span className="font-semibold">{selectedLog.schoolSiteName || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-3">
                                        <label className="block text-500 text-sm mb-1">Action</label>
                                        <div className="flex gap-2 align-items-center">
                                            <Tag value={selectedLog.actionCategory} />
                                            <span className="font-semibold">{selectedLog.actionType.replace(/_/g, ' ')}</span>
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="block text-500 text-sm mb-1">Outcome</label>
                                        <Tag value={selectedLog.outcome} severity={selectedLog.outcome === 'success' ? 'success' : selectedLog.outcome === 'failure' ? 'warning' : selectedLog.outcome === 'error' ? 'danger' : 'info'} />
                                    </div>
                                    {selectedLog.executionTimeMs !== undefined && (
                                        <div className="mb-3">
                                            <label className="block text-500 text-sm mb-1">Execution Time</label>
                                            <span className="font-semibold">{selectedLog.executionTimeMs}ms</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Panel>

                        {/* Description */}
                        <Panel header="Description" className="mb-3">
                            <p className="m-0">{selectedLog.actionDescription}</p>
                        </Panel>

                        {/* Entity */}
                        <Panel header="Entity Affected" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <label className="block text-500 text-sm mb-1">Type</label>
                                    <span className="font-semibold">{selectedLog.entity.entityType.replace(/_/g, ' ')}</span>
                                </div>
                                {selectedLog.entity.entityId && (
                                    <div className="col-12 md:col-4">
                                        <label className="block text-500 text-sm mb-1">ID</label>
                                        <code className="text-sm bg-gray-100 px-2 py-1 border-round">{selectedLog.entity.entityId}</code>
                                    </div>
                                )}
                                {selectedLog.entity.entityName && (
                                    <div className="col-12 md:col-4">
                                        <label className="block text-500 text-sm mb-1">Name</label>
                                        <span className="font-semibold">{selectedLog.entity.entityName}</span>
                                    </div>
                                )}
                            </div>
                        </Panel>

                        {/* Client Info */}
                        <Panel header="Client Information" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <div className="mb-2">
                                        <label className="block text-500 text-sm mb-1">IP Address</label>
                                        <code className="text-sm">{selectedLog.clientInfo.ipAddress || 'Unknown'}</code>
                                    </div>
                                    <div className="mb-2">
                                        <label className="block text-500 text-sm mb-1">Device Type</label>
                                        <span>{selectedLog.clientInfo.deviceType || 'Unknown'}</span>
                                    </div>
                                </div>
                                <div className="col-12 md:col-6">
                                    <div className="mb-2">
                                        <label className="block text-500 text-sm mb-1">Browser</label>
                                        <span>{selectedLog.clientInfo.browser || 'Unknown'}</span>
                                    </div>
                                    <div className="mb-2">
                                        <label className="block text-500 text-sm mb-1">Operating System</label>
                                        <span>{selectedLog.clientInfo.os || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        {/* State Changes */}
                        {selectedLog.previousState && selectedLog.previousState.length > 0 && (
                            <Panel header="Changes Made" className="mb-3">
                                <DataTable value={selectedLog.previousState} size="small">
                                    <Column field="fieldName" header="Field" />
                                    <Column field="previousValue" header="Previous Value" body={(row) => <code className="text-xs">{JSON.stringify(row.previousValue)}</code>} />
                                    <Column field="newValue" header="New Value" body={(row) => <code className="text-xs">{JSON.stringify(row.newValue)}</code>} />
                                </DataTable>
                            </Panel>
                        )}

                        {/* Error Info */}
                        {selectedLog.errorMessage && (
                            <Panel header="Error Details" className="mb-3">
                                <div className="bg-red-50 p-3 border-round">
                                    <p className="text-red-700 font-semibold m-0 mb-2">{selectedLog.errorMessage}</p>
                                    {selectedLog.metadata?.errorStack && <pre className="text-xs text-red-600 m-0 overflow-auto">{selectedLog.metadata.errorStack}</pre>}
                                </div>
                            </Panel>
                        )}

                        {/* Metadata */}
                        {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                            <Panel header="Additional Metadata" toggleable collapsed>
                                <pre className="text-xs bg-gray-100 p-3 border-round overflow-auto m-0">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                            </Panel>
                        )}
                    </div>
                )}
            </Dialog>

            {/* Custom Styles */}
            <style jsx global>{`
                .activity-log-management .p-datatable .p-datatable-tbody > tr > td {
                    padding: 0.5rem;
                }

                .activity-log-management .p-tag {
                    font-size: 0.75rem;
                }

                @media (max-width: 960px) {
                    .activity-log-management .p-datatable-responsive-stack .p-datatable-tbody > tr > td {
                        padding: 0.75rem;
                        border-bottom: 1px solid var(--surface-border);
                    }

                    .activity-log-management .p-datatable-responsive-stack .p-datatable-tbody > tr > td:last-child {
                        border-bottom: 2px solid var(--surface-border);
                    }
                }
            `}</style>
        </div>
    );
};

export default ActivityLogManagement;
