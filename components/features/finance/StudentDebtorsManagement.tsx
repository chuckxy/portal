'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Badge } from 'primereact/badge';
import { TabView, TabPanel } from 'primereact/tabview';
import { Chip } from 'primereact/chip';
import { Avatar } from 'primereact/avatar';
import { InputTextarea } from 'primereact/inputtextarea';
import { useReactToPrint } from 'react-to-print';
import { getAcademicYears } from '@/lib/utils/utilFunctions';
import { TuitionDefaultersPrintReport } from '@/components/print/TuitionDefaultersPrintReport';

interface DebtorStudent {
    _id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    profilePicture?: string;
    contact?: {
        mobilePhone?: string;
        email?: string;
    };
    studentInfo?: {
        guardian?: {
            _id: string;
            firstName: string;
            lastName: string;
            contact?: {
                mobilePhone?: string;
                email?: string;
            };
        };
        currentClass?: {
            _id: string;
            name: string;
        };
        accountBalance: number;
    };
    site: {
        _id: string;
        description: string;
    };
    class: {
        _id: string;
        name: string;
    };
    academicYear: string;
    academicTerm?: number;
    totalFeesRequired: number;
    totalFeesPaid: number;
    outstandingBalance: number;
    percentagePaid: number;
    paymentDeadline?: Date;
    daysOverdue?: number;
    lastPaymentDate?: Date;
    lastPaymentAmount?: number;
    paymentCount: number;
    feeConfiguration?: {
        _id: string;
        configName?: string;
        feeItems: Array<{
            determinant: string;
            description: string;
            amount: number;
        }>;
    };
    payments: Array<{
        _id: string;
        amountPaid: number;
        datePaid: Date;
        paymentMethod: string;
        receiptNumber?: string;
    }>;
}

interface School {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    description: string;
}

interface Class {
    _id: string;
    className: string;
}

interface ReminderNote {
    date: Date;
    note: string;
    contactedBy: string;
    method: 'phone' | 'email' | 'sms' | 'in_person';
}

export const StudentDebtorsManagement: React.FC = () => {
    const [debtors, setDebtors] = useState<DebtorStudent[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [reminderDialogVisible, setReminderDialogVisible] = useState(false);
    const [selectedDebtor, setSelectedDebtor] = useState<DebtorStudent | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const [filters, setFilters] = useState({
        school: '',
        site: '',
        class: '',
        academicYear: '',
        academicTerm: null as number | null,
        minBalance: null as number | null,
        searchQuery: ''
    });

    const [reminderNote, setReminderNote] = useState({
        note: '',
        method: 'phone' as 'phone' | 'email' | 'sms' | 'in_person'
    });

    const [statistics, setStatistics] = useState({
        totalDebtors: 0,
        totalOutstanding: 0,
        criticalDebtors: 0, // > 75% unpaid
        moderateDebtors: 0, // 50-75% unpaid
        minorDebtors: 0, // < 50% unpaid
        overdueDebtors: 0,
        averageDebt: 0
    });

    const toast = useRef<Toast>(null);
    const dt = useRef<DataTable<DebtorStudent[]>>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const academicTerms = [
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    const contactMethods: Array<{ label: string; value: 'phone' | 'email' | 'sms' | 'in_person'; icon: string }> = [
        { label: 'Phone Call', value: 'phone', icon: '📞' },
        { label: 'Email', value: 'email', icon: '📧' },
        { label: 'SMS', value: 'sms', icon: '💬' },
        { label: 'In Person', value: 'in_person', icon: '👤' }
    ];

    // Print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Tuition_Defaulters_Report_${new Date().toISOString().split('T')[0]}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 15mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        `
    });

    useEffect(() => {
        fetchSchools();
        fetchDebtors();
    }, []);

    useEffect(() => {
        if (filters.school) {
            fetchSites(filters.school);
        }
    }, [filters.school]);

    useEffect(() => {
        if (filters.site) {
            fetchClasses(filters.site);
        }
    }, [filters.site]);

    const fetchSchools = async () => {
        try {
            const response = await fetch('/api/school');
            const data = await response.json();
            setSchools(Array.isArray(data) ? data : [data]);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchSites = async (schoolId: string) => {
        try {
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setSites(data.sites || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchClasses = async (siteId: string) => {
        try {
            const response = await fetch(`/api/classes?site=${siteId}`);
            const data = await response.json();
            setClasses(data.classes || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchDebtors = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            if (filters.site) queryParams.append('site', filters.site);
            if (filters.class) queryParams.append('class', filters.class);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.academicTerm) queryParams.append('academicTerm', filters.academicTerm.toString());
            if (filters.minBalance) queryParams.append('minBalance', filters.minBalance.toString());
            if (filters.searchQuery) queryParams.append('search', filters.searchQuery);

            const response = await fetch(`/api/student-debtors?${queryParams.toString()}`);

            if (!response.ok) throw new Error('Failed to fetch debtors');

            const data = await response.json();
            console.log(data);
            setDebtors(data.debtors || []);
            calculateStatistics(data.debtors || []);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load student debtors',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStatistics = (data: DebtorStudent[]) => {
        const totalDebtors = data.length;
        const totalOutstanding = data.reduce((sum, d) => sum + d.outstandingBalance, 0);
        const criticalDebtors = data.filter((d) => d.percentagePaid < 25).length;
        const moderateDebtors = data.filter((d) => d.percentagePaid >= 25 && d.percentagePaid < 50).length;
        const minorDebtors = data.filter((d) => d.percentagePaid >= 50).length;
        const overdueDebtors = data.filter((d) => d.daysOverdue && d.daysOverdue > 0).length;
        const averageDebt = totalDebtors > 0 ? totalOutstanding / totalDebtors : 0;

        setStatistics({
            totalDebtors,
            totalOutstanding,
            criticalDebtors,
            moderateDebtors,
            minorDebtors,
            overdueDebtors,
            averageDebt
        });
    };

    const openView = (debtor: DebtorStudent) => {
        setSelectedDebtor(debtor);
        setViewDialogVisible(true);
    };

    const openReminder = (debtor: DebtorStudent) => {
        setSelectedDebtor(debtor);
        setReminderNote({ note: '', method: 'phone' });
        setReminderDialogVisible(true);
    };

    const saveReminder = async () => {
        if (!selectedDebtor || !reminderNote.note.trim()) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please enter a note',
                life: 3000
            });
            return;
        }

        try {
            // Save reminder to localStorage or API
            const reminders = JSON.parse(localStorage.getItem('debtorReminders') || '{}');
            if (!reminders[selectedDebtor._id]) {
                reminders[selectedDebtor._id] = [];
            }

            reminders[selectedDebtor._id].push({
                date: new Date(),
                note: reminderNote.note,
                method: reminderNote.method,
                contactedBy: 'Current User' // TODO: Get from auth context
            });

            localStorage.setItem('debtorReminders', JSON.stringify(reminders));

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Reminder saved successfully',
                life: 3000
            });

            setReminderDialogVisible(false);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save reminder',
                life: 3000
            });
        }
    };

    const exportCSV = () => {
        dt.current?.exportCSV();
    };

    const sendBulkReminder = () => {
        toast.current?.show({
            severity: 'info',
            summary: 'Info',
            detail: 'Bulk reminder functionality coming soon',
            life: 3000
        });
    };

    // Template functions
    const studentBodyTemplate = (rowData: DebtorStudent) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar image={rowData.profilePicture} icon={!rowData.profilePicture ? 'pi pi-user' : undefined} size="large" shape="circle" className="mr-2" />
                <div>
                    <div className="font-semibold">
                        {rowData.firstName} {rowData.lastName}
                    </div>
                    <div className="text-sm text-600">ID: {rowData.studentId}</div>
                </div>
            </div>
        );
    };

    const classBodyTemplate = (rowData: DebtorStudent) => {
        return (
            <div>
                <div className="font-semibold">{rowData.class.name}</div>
                <div className="text-sm text-600">{rowData.site.description}</div>
            </div>
        );
    };

    const feesBodyTemplate = (rowData: DebtorStudent) => {
        return (
            <div>
                <div className="text-sm text-600">Required:</div>
                <div className="font-semibold">
                    {new Intl.NumberFormat('en-GH', {
                        style: 'currency',
                        currency: 'GHS'
                    }).format(rowData.totalFeesRequired)}
                </div>
                <div className="text-sm text-600 mt-1">Paid:</div>
                <div className="text-green-600 font-semibold">
                    {new Intl.NumberFormat('en-GH', {
                        style: 'currency',
                        currency: 'GHS'
                    }).format(rowData.totalFeesPaid)}
                </div>
            </div>
        );
    };

    const outstandingBodyTemplate = (rowData: DebtorStudent) => {
        const isOverdue = rowData.daysOverdue && rowData.daysOverdue > 0;
        const isCritical = rowData.percentagePaid < 25;

        return (
            <div>
                <div className={`text-xl font-bold ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                    {new Intl.NumberFormat('en-GH', {
                        style: 'currency',
                        currency: 'GHS'
                    }).format(rowData.outstandingBalance)}
                </div>
                {isOverdue && <Tag severity="danger" value={`${rowData.daysOverdue} days overdue`} className="mt-1" />}
            </div>
        );
    };

    const progressBodyTemplate = (rowData: DebtorStudent) => {
        let severity: 'success' | 'info' | 'warning' | 'danger' = 'success';
        if (rowData.percentagePaid < 25) severity = 'danger';
        else if (rowData.percentagePaid < 50) severity = 'warning';
        else if (rowData.percentagePaid < 75) severity = 'info';

        return (
            <div>
                <ProgressBar value={rowData.percentagePaid} className="h-1rem" color={severity === 'danger' ? '#f44336' : severity === 'warning' ? '#ff9800' : severity === 'info' ? '#2196f3' : '#4caf50'} />
                <div className="text-sm text-center mt-1">{rowData.percentagePaid.toFixed(1)}% Paid</div>
            </div>
        );
    };

    const contactBodyTemplate = (rowData: DebtorStudent) => {
        return (
            <div>
                {rowData.contact?.mobilePhone && (
                    <div className="flex align-items-center gap-1 mb-1">
                        <i className="pi pi-phone text-xs"></i>
                        <span className="text-sm">{rowData.contact.mobilePhone}</span>
                    </div>
                )}
                {rowData.studentInfo?.guardian && (
                    <div className="text-sm text-600">
                        Guardian: {rowData.studentInfo.guardian.firstName} {rowData.studentInfo.guardian.lastName}
                        {rowData.studentInfo.guardian.contact?.mobilePhone && (
                            <div className="flex align-items-center gap-1 mt-1">
                                <i className="pi pi-phone text-xs"></i>
                                <span>{rowData.studentInfo.guardian.contact.mobilePhone}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const lastPaymentBodyTemplate = (rowData: DebtorStudent) => {
        if (!rowData.lastPaymentDate) {
            return <Tag severity="warning" value="No payments" />;
        }

        return (
            <div>
                <div className="text-sm">
                    {new Date(rowData.lastPaymentDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })}
                </div>
                <div className="text-xs text-600">
                    {new Intl.NumberFormat('en-GH', {
                        style: 'currency',
                        currency: 'GHS'
                    }).format(rowData.lastPaymentAmount || 0)}
                </div>
            </div>
        );
    };

    const actionsBodyTemplate = (rowData: DebtorStudent) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-info" onClick={() => openView(rowData)} tooltip="View Details" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-bell" className="p-button-rounded p-button-text p-button-warning" onClick={() => openReminder(rowData)} tooltip="Send Reminder" tooltipOptions={{ position: 'top' }} />
                <Button
                    icon="pi pi-phone"
                    className="p-button-rounded p-button-text p-button-success"
                    onClick={() => rowData.contact?.mobilePhone && window.open(`tel:${rowData.contact.mobilePhone}`, '_self')}
                    disabled={!rowData.contact?.mobilePhone}
                    tooltip="Call Student"
                    tooltipOptions={{ position: 'top' }}
                />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Export CSV" icon="pi pi-upload" className="p-button-help" onClick={exportCSV} />
                <Button label="Print Report" icon="pi pi-print" className="p-button-info" onClick={handlePrint} disabled={debtors.length === 0} />
                <Button label="Send Bulk Reminder" icon="pi pi-send" className="p-button-warning" onClick={sendBulkReminder} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchDebtors} loading={loading} />
            </div>
        );
    };

    // Get debtors by tab
    const getFilteredDebtors = () => {
        switch (activeTab) {
            case 0:
                return debtors;
            case 1:
                return debtors.filter((d) => d.percentagePaid < 25);
            case 2:
                return debtors.filter((d) => d.percentagePaid >= 25 && d.percentagePaid < 50);
            case 3:
                return debtors.filter((d) => d.percentagePaid >= 50);
            case 4:
                return debtors.filter((d) => d.daysOverdue && d.daysOverdue > 0);
            default:
                return debtors;
        }
    };

    const getReminderHistory = (studentId: string): ReminderNote[] => {
        const reminders = JSON.parse(localStorage.getItem('debtorReminders') || '{}');
        return reminders[studentId] || [];
    };

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Statistics Cards */}
            <div className="grid mb-3">
                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Total Outstanding</span>
                                <span className="text-2xl font-bold text-red-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.totalOutstanding)}
                                </span>
                                <div className="text-sm text-600 mt-1">{statistics.totalDebtors} students</div>
                            </div>
                            <div className="bg-red-100 text-red-600 border-round p-2">
                                <i className="pi pi-exclamation-triangle text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Critical Debtors</span>
                                <span className="text-2xl font-bold text-orange-600">{statistics.criticalDebtors}</span>
                                <div className="text-sm text-600 mt-1">Less than 25% paid</div>
                            </div>
                            <div className="bg-orange-100 text-orange-600 border-round p-2">
                                <i className="pi pi-exclamation-circle text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Overdue Payments</span>
                                <span className="text-2xl font-bold text-purple-600">{statistics.overdueDebtors}</span>
                                <div className="text-sm text-600 mt-1">Past deadline</div>
                            </div>
                            <div className="bg-purple-100 text-purple-600 border-round p-2">
                                <i className="pi pi-clock text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Average Debt</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.averageDebt)}
                                </span>
                                <div className="text-sm text-600 mt-1">Per student</div>
                            </div>
                            <div className="bg-blue-100 text-blue-600 border-round p-2">
                                <i className="pi pi-chart-line text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Moderate Debtors</span>
                                <span className="text-2xl font-bold text-yellow-600">{statistics.moderateDebtors}</span>
                                <div className="text-sm text-600 mt-1">25-50% paid</div>
                            </div>
                            <div className="bg-yellow-100 text-yellow-600 border-round p-2">
                                <i className="pi pi-info-circle text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-4">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Minor Debtors</span>
                                <span className="text-2xl font-bold text-green-600">{statistics.minorDebtors}</span>
                                <div className="text-sm text-600 mt-1">More than 50% paid</div>
                            </div>
                            <div className="bg-green-100 text-green-600 border-round p-2">
                                <i className="pi pi-check-circle text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <div className="grid">
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">School</label>
                        <Dropdown
                            value={filters.school}
                            options={schools.map((s) => ({ label: s.name, value: s._id }))}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    school: e.value,
                                    site: '',
                                    class: ''
                                })
                            }
                            placeholder="Select School"
                            className="w-full"
                            showClear
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Site</label>
                        <Dropdown
                            value={filters.site}
                            options={sites.map((s) => ({ label: s.description, value: s._id }))}
                            onChange={(e) => setFilters({ ...filters, site: e.value, class: '' })}
                            placeholder="All Sites"
                            className="w-full"
                            showClear
                            disabled={!filters.school}
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Class</label>
                        <Dropdown
                            value={filters.class}
                            options={classes.map((c) => ({ label: c.className, value: c._id }))}
                            onChange={(e) => setFilters({ ...filters, class: e.value })}
                            placeholder="All Classes"
                            className="w-full"
                            showClear
                            disabled={!filters.site}
                            filter
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Academic Year</label>
                        <Dropdown value={filters.academicYear} options={getAcademicYears} onChange={(e) => setFilters({ ...filters, academicYear: e.value })} placeholder="All Years" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Term</label>
                        <Dropdown value={filters.academicTerm} options={academicTerms} onChange={(e) => setFilters({ ...filters, academicTerm: e.value })} placeholder="All Terms" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Search Student</label>
                        <InputText value={filters.searchQuery} onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })} placeholder="Name or ID" className="w-full" />
                    </div>
                    <div className="col-12 md:col-6 flex align-items-end gap-2">
                        <Button label="Apply Filters" icon="pi pi-filter" onClick={fetchDebtors} />
                        <Button
                            label="Clear"
                            icon="pi pi-filter-slash"
                            className="p-button-outlined"
                            onClick={() => {
                                setFilters({
                                    school: '',
                                    site: '',
                                    class: '',
                                    academicYear: '',
                                    academicTerm: null,
                                    minBalance: null,
                                    searchQuery: ''
                                });
                                fetchDebtors();
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Data Table with Tabs */}
            <Card title="Student Debtors">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                    <TabPanel header={`All (${statistics.totalDebtors})`}>
                        <DataTable
                            ref={dt}
                            value={getFilteredDebtors()}
                            loading={loading}
                            paginator
                            rows={20}
                            rowsPerPageOptions={[10, 20, 50, 100]}
                            dataKey="_id"
                            emptyMessage="No debtors found"
                            stripedRows
                            sortField="outstandingBalance"
                            sortOrder={-1}
                        >
                            <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '220px' }} />
                            <Column field="class" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Fees" body={feesBodyTemplate} style={{ minWidth: '150px' }} />
                            <Column field="outstandingBalance" header="Outstanding" body={outstandingBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Progress" body={progressBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Last Payment" body={lastPaymentBodyTemplate} sortable style={{ minWidth: '150px' }} />
                            <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Critical (${statistics.criticalDebtors})`}>
                        <DataTable value={getFilteredDebtors()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No critical debtors" stripedRows sortField="outstandingBalance" sortOrder={-1}>
                            <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '220px' }} />
                            <Column field="class" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Fees" body={feesBodyTemplate} style={{ minWidth: '150px' }} />
                            <Column field="outstandingBalance" header="Outstanding" body={outstandingBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Progress" body={progressBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Moderate (${statistics.moderateDebtors})`}>
                        <DataTable value={getFilteredDebtors()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No moderate debtors" stripedRows sortField="outstandingBalance" sortOrder={-1}>
                            <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '220px' }} />
                            <Column field="class" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Fees" body={feesBodyTemplate} style={{ minWidth: '150px' }} />
                            <Column field="outstandingBalance" header="Outstanding" body={outstandingBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Progress" body={progressBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Minor (${statistics.minorDebtors})`}>
                        <DataTable value={getFilteredDebtors()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No minor debtors" stripedRows sortField="outstandingBalance" sortOrder={-1}>
                            <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '220px' }} />
                            <Column field="class" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Fees" body={feesBodyTemplate} style={{ minWidth: '150px' }} />
                            <Column field="outstandingBalance" header="Outstanding" body={outstandingBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column header="Progress" body={progressBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Overdue (${statistics.overdueDebtors})`}>
                        <DataTable value={getFilteredDebtors()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No overdue payments" stripedRows sortField="daysOverdue" sortOrder={-1}>
                            <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '220px' }} />
                            <Column field="class" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column field="paymentDeadline" header="Deadline" body={(rowData) => (rowData.paymentDeadline ? new Date(rowData.paymentDeadline).toLocaleDateString('en-GB') : 'N/A')} sortable style={{ minWidth: '120px' }} />
                            <Column field="daysOverdue" header="Days Overdue" body={(rowData) => <Tag severity="danger" value={`${rowData.daysOverdue} days`} />} sortable style={{ minWidth: '120px' }} />
                            <Column header="Outstanding" body={outstandingBodyTemplate} style={{ minWidth: '150px' }} />
                            <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                        </DataTable>
                    </TabPanel>
                </TabView>
            </Card>

            {/* View Dialog */}
            <Dialog visible={viewDialogVisible} onHide={() => setViewDialogVisible(false)} header="Student Debt Details" modal style={{ width: '800px' }} maximizable>
                {selectedDebtor && (
                    <div className="grid">
                        {/* Student Info Card */}
                        <div className="col-12">
                            <Card className="bg-blue-50 mb-3">
                                <div className="flex align-items-center gap-3">
                                    <Avatar image={selectedDebtor.profilePicture} icon={!selectedDebtor.profilePicture ? 'pi pi-user' : undefined} size="xlarge" shape="circle" />
                                    <div className="flex-1">
                                        <h3 className="m-0 mb-1">
                                            {selectedDebtor.firstName} {selectedDebtor.lastName}
                                        </h3>
                                        <div className="text-600 mb-2">ID: {selectedDebtor.studentId}</div>
                                        <div className="flex gap-2">
                                            <Chip label={selectedDebtor.class.name} icon="pi pi-users" />
                                            <Chip label={selectedDebtor.site.description} icon="pi pi-building" />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-600 mb-1">Outstanding Balance</div>
                                        <div className="text-3xl font-bold text-red-600">
                                            {new Intl.NumberFormat('en-GH', {
                                                style: 'currency',
                                                currency: 'GHS'
                                            }).format(selectedDebtor.outstandingBalance)}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Fee Breakdown */}
                        <div className="col-12 md:col-6">
                            <Card title="Fee Breakdown" className="h-full">
                                <div className="flex justify-content-between mb-3 pb-2 border-bottom-1 border-300">
                                    <span className="text-600">Total Fees Required:</span>
                                    <span className="font-bold">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format(selectedDebtor.totalFeesRequired)}
                                    </span>
                                </div>
                                <div className="flex justify-content-between mb-3 pb-2 border-bottom-1 border-300">
                                    <span className="text-600">Total Paid:</span>
                                    <span className="font-bold text-green-600">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format(selectedDebtor.totalFeesPaid)}
                                    </span>
                                </div>
                                <div className="flex justify-content-between mb-3">
                                    <span className="text-600">Outstanding:</span>
                                    <span className="font-bold text-red-600">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format(selectedDebtor.outstandingBalance)}
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <div className="text-sm text-600 mb-2">Payment Progress</div>
                                    <ProgressBar value={selectedDebtor.percentagePaid} className="h-2rem" displayValueTemplate={() => `${selectedDebtor.percentagePaid.toFixed(1)}%`} />
                                </div>
                            </Card>
                        </div>

                        {/* Contact Information */}
                        <div className="col-12 md:col-6">
                            <Card title="Contact Information" className="h-full">
                                <div className="mb-3">
                                    <div className="text-sm text-600 mb-1">Student</div>
                                    {selectedDebtor.contact?.mobilePhone && (
                                        <div className="flex align-items-center gap-2 mb-2">
                                            <i className="pi pi-phone"></i>
                                            <a href={`tel:${selectedDebtor.contact.mobilePhone}`} className="text-primary">
                                                {selectedDebtor.contact.mobilePhone}
                                            </a>
                                        </div>
                                    )}
                                    {selectedDebtor.contact?.email && (
                                        <div className="flex align-items-center gap-2">
                                            <i className="pi pi-envelope"></i>
                                            <a href={`mailto:${selectedDebtor.contact.email}`} className="text-primary">
                                                {selectedDebtor.contact.email}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {selectedDebtor.studentInfo?.guardian && (
                                    <div className="mt-4 pt-3 border-top-1 border-300">
                                        <div className="text-sm text-600 mb-2">Guardian</div>
                                        <div className="font-semibold mb-2">
                                            {selectedDebtor.studentInfo.guardian.firstName} {selectedDebtor.studentInfo.guardian.lastName}
                                        </div>
                                        {selectedDebtor.studentInfo.guardian.contact?.mobilePhone && (
                                            <div className="flex align-items-center gap-2 mb-2">
                                                <i className="pi pi-phone"></i>
                                                <a href={`tel:${selectedDebtor.studentInfo.guardian.contact.mobilePhone}`} className="text-primary">
                                                    {selectedDebtor.studentInfo.guardian.contact.mobilePhone}
                                                </a>
                                            </div>
                                        )}
                                        {selectedDebtor.studentInfo.guardian.contact?.email && (
                                            <div className="flex align-items-center gap-2">
                                                <i className="pi pi-envelope"></i>
                                                <a href={`mailto:${selectedDebtor.studentInfo.guardian.contact.email}`} className="text-primary">
                                                    {selectedDebtor.studentInfo.guardian.contact.email}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Payment History */}
                        {selectedDebtor.payments && selectedDebtor.payments.length > 0 && (
                            <div className="col-12">
                                <Card title="Payment History">
                                    <DataTable value={selectedDebtor.payments} emptyMessage="No payments recorded" stripedRows>
                                        <Column
                                            field="datePaid"
                                            header="Date"
                                            body={(rowData) =>
                                                new Date(rowData.datePaid).toLocaleDateString('en-GB', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })
                                            }
                                        />
                                        <Column
                                            field="amountPaid"
                                            header="Amount"
                                            body={(rowData) =>
                                                new Intl.NumberFormat('en-GH', {
                                                    style: 'currency',
                                                    currency: 'GHS'
                                                }).format(rowData.amountPaid)
                                            }
                                        />
                                        <Column field="paymentMethod" header="Method" body={(rowData) => <Tag value={rowData.paymentMethod.replace('_', ' ').toUpperCase()} />} />
                                        <Column field="receiptNumber" header="Receipt #" />
                                    </DataTable>
                                </Card>
                            </div>
                        )}

                        {/* Reminder History */}
                        <div className="col-12">
                            <Card title="Reminder History">
                                {getReminderHistory(selectedDebtor._id).length === 0 ? (
                                    <div className="text-center text-600 py-4">No reminders sent yet</div>
                                ) : (
                                    <div className="flex flex-column gap-3">
                                        {getReminderHistory(selectedDebtor._id).map((reminder, index) => (
                                            <div key={index} className="p-3 border-1 border-300 border-round">
                                                <div className="flex justify-content-between mb-2">
                                                    <div className="flex align-items-center gap-2">
                                                        <Tag value={reminder.method.replace('_', ' ').toUpperCase()} />
                                                        <span className="text-sm text-600">{new Date(reminder.date).toLocaleString()}</span>
                                                    </div>
                                                    <span className="text-sm text-600">By: {reminder.contactedBy}</span>
                                                </div>
                                                <div className="text-700">{reminder.note}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Send Reminder Dialog */}
            <Dialog
                visible={reminderDialogVisible}
                onHide={() => setReminderDialogVisible(false)}
                header="Send Payment Reminder"
                modal
                style={{ width: '600px' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setReminderDialogVisible(false)} />
                        <Button label="Save Note" icon="pi pi-check" onClick={saveReminder} />
                    </div>
                }
            >
                {selectedDebtor && (
                    <div className="grid">
                        <div className="col-12">
                            <Card className="bg-gray-50 mb-3">
                                <div className="flex align-items-center gap-2">
                                    <Avatar image={selectedDebtor.profilePicture} icon={!selectedDebtor.profilePicture ? 'pi pi-user' : undefined} size="large" shape="circle" />
                                    <div>
                                        <div className="font-semibold">
                                            {selectedDebtor.firstName} {selectedDebtor.lastName}
                                        </div>
                                        <div className="text-sm text-600">
                                            Outstanding:{' '}
                                            {new Intl.NumberFormat('en-GH', {
                                                style: 'currency',
                                                currency: 'GHS'
                                            }).format(selectedDebtor.outstandingBalance)}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12">
                            <label className="block font-medium mb-2">Contact Method</label>
                            <div className="grid">
                                {contactMethods.map((method) => (
                                    <div key={method.value} className="col-6">
                                        <div
                                            onClick={() => setReminderNote({ ...reminderNote, method: method.value })}
                                            className={`p-3 border-1 border-round cursor-pointer transition-colors text-center ${reminderNote.method === method.value ? 'border-primary bg-primary-50' : 'border-300 hover:border-400'}`}
                                        >
                                            <div className="text-2xl mb-1">{method.icon}</div>
                                            <div className="font-medium text-sm">{method.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="block font-medium mb-2">
                                Note <span className="text-red-500">*</span>
                            </label>
                            <InputTextarea value={reminderNote.note} onChange={(e) => setReminderNote({ ...reminderNote, note: e.target.value })} rows={5} className="w-full" placeholder="Record what was discussed, agreed, or promised..." />
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Hidden Print Component */}
            <div style={{ display: 'none' }}>
                <TuitionDefaultersPrintReport
                    ref={printRef}
                    debtors={debtors}
                    schoolName={schools.find((s) => s._id === filters.school)?.name || 'School Name'}
                    schoolAddress="School Address Line 1, City, Region"
                    schoolContact="Tel: +233 XXX XXX XXX | Email: info@school.edu.gh"
                    filters={{
                        school: filters.school,
                        site: sites.find((s) => s._id === filters.site)?.description,
                        className: classes.find((c) => c._id === filters.class)?.className,
                        academicYear: filters.academicYear,
                        academicTerm: filters.academicTerm
                    }}
                    generatedBy="System Administrator"
                />
            </div>
        </>
    );
};

export default StudentDebtorsManagement;
