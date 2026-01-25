'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import { Panel } from 'primereact/panel';
import { Timeline } from 'primereact/timeline';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { ProgressBar } from 'primereact/progressbar';
import { AutoComplete } from 'primereact/autocomplete';
import { Badge } from 'primereact/badge';
import { Chip } from 'primereact/chip';
import { useAuth } from '@/context/AuthContext';
import { getAcademicYears } from '@/lib/utils/utilFunctions';
import { IStudentBilling, IAdditionalCharge, BillingStatus, ChargeCategory, BillingSummary, CHARGE_CATEGORIES, BILLING_STATUS_CONFIG, AddChargeRequest } from '@/types/billing';

// Constants
const TERM_OPTIONS = [
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

const STATUS_OPTIONS = [
    { label: 'All Statuses', value: '' },
    { label: 'Owing', value: 'owing' },
    { label: 'Cleared', value: 'clear' },
    { label: 'Overpaid', value: 'overpaid' },
    { label: 'Pending', value: 'pending' }
];

interface Student {
    _id: string;
    firstName: string;
    lastName: string;
    studentInfo?: {
        studentId?: string;
        currentClass?: {
            _id: string;
            className: string;
        };
    };
}

interface SiteClass {
    _id: string;
    className: string;
}

interface Site {
    _id: string;
    siteName: string;
    description?: string;
}

const StudentBillingManagement: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // ==================== STATE ====================

    // Data states
    const [billings, setBillings] = useState<IStudentBilling[]>([]);
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [sites, setSites] = useState<Site[]>([]);
    const [classes, setClasses] = useState<SiteClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    // Loading states
    const [loading, setLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Pagination
    const [totalRecords, setTotalRecords] = useState(0);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(20);

    // Filters
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>(getAcademicYears[0]?.value || '');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(1);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [searchText, setSearchText] = useState('');
    const [owingOnly, setOwingOnly] = useState(false);

    // Dialog states
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [selectedBilling, setSelectedBilling] = useState<IStudentBilling | null>(null);
    const [chargeDialogVisible, setChargeDialogVisible] = useState(false);
    const [generateDialogVisible, setGenerateDialogVisible] = useState(false);
    const [createDialogVisible, setCreateDialogVisible] = useState(false);

    // Charge form
    const [chargeForm, setChargeForm] = useState<AddChargeRequest>({
        category: 'other',
        particulars: '',
        amount: 0
    });

    // Create billing form
    const [createForm, setCreateForm] = useState({
        student: null as Student | null,
        studentSearchText: '',
        classId: '',
        balanceBroughtForward: 0,
        feeConfigurationId: ''
    });

    // ==================== DATA FETCHING ====================

    const fetchSites = async () => {
        try {
            if (!user) return;
            const response = await fetch(`/api/sites?school=${user?.school}`);
            const data = await response.json();
            console.log(data);
            if (Array.isArray(data.sites)) {
                setSites(data.sites);
                if (data.sites.length > 0 && !selectedSite) {
                    setSelectedSite(data.sites[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchClasses = useCallback(async () => {
        if (!selectedSite) return;
        try {
            const response = await fetch(`/api/classes?site=${selectedSite}`);
            const data = await response.json();
            setClasses(Array.isArray(data) ? data : data.classes || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    }, [selectedSite]);

    const fetchBillings = useCallback(async () => {
        if (!selectedSite) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                siteId: selectedSite,
                page: String(Math.floor(first / rows)),
                limit: String(rows)
            });

            if (selectedYear) params.append('academicYear', selectedYear);
            if (selectedTerm) params.append('academicTerm', String(selectedTerm));
            if (selectedClass) params.append('classId', selectedClass);
            if (selectedStatus) params.append('billingStatus', selectedStatus);
            if (searchText) params.append('search', searchText);
            if (owingOnly) params.append('owingOnly', 'true');

            const response = await fetch(`/api/student-billing?${params}`);
            const data = await response.json();

            if (response.ok) {
                setBillings(data.billings || []);
                setTotalRecords(data.total || 0);
                setSummary(data.summary || null);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to fetch billing records',
                    life: 5000
                });
            }
        } catch (error) {
            console.error('Error fetching billings:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to fetch billing records',
                life: 5000
            });
        } finally {
            setLoading(false);
        }
    }, [selectedSite, selectedYear, selectedTerm, selectedClass, selectedStatus, searchText, owingOnly, first, rows]);

    const fetchSummary = useCallback(async () => {
        if (!selectedSite) return;

        setSummaryLoading(true);
        try {
            const params = new URLSearchParams({ siteId: selectedSite });
            if (selectedYear) params.append('academicYear', selectedYear);
            if (selectedTerm) params.append('academicTerm', String(selectedTerm));

            const response = await fetch(`/api/student-billing/summary?${params}`);
            const data = await response.json();

            if (response.ok) {
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setSummaryLoading(false);
        }
    }, [selectedSite, selectedYear, selectedTerm]);

    const searchStudents = async (query: string) => {
        if (!query || query.length < 2) {
            setFilteredStudents([]);
            return;
        }
        try {
            const response = await fetch(`/api/persons?search=${query}&personCategory=student&siteId=${selectedSite}&limit=10`);
            const data = await response.json();
            setFilteredStudents(data.persons || []);
        } catch (error) {
            console.error('Error searching students:', error);
        }
    };

    // ==================== EFFECTS ====================

    useEffect(() => {
        if (!user) return;
        fetchSites();
    }, [user]);

    useEffect(() => {
        if (selectedSite) {
            fetchClasses();
            fetchBillings();
            fetchSummary();
        }
    }, [selectedSite]);

    useEffect(() => {
        if (selectedSite) {
            fetchBillings();
        }
    }, [selectedYear, selectedTerm, selectedClass, selectedStatus, owingOnly, first, rows]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedSite && searchText !== undefined) {
                fetchBillings();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText]);

    // ==================== HANDLERS ====================

    const handleViewBilling = async (billing: IStudentBilling) => {
        try {
            const response = await fetch(`/api/student-billing/${billing._id}`);
            const data = await response.json();
            if (response.ok) {
                setSelectedBilling(data);
                setViewDialogVisible(true);
            }
        } catch (error) {
            console.error('Error fetching billing details:', error);
        }
    };

    const handleAddCharge = (billing: IStudentBilling) => {
        setSelectedBilling(billing);
        setChargeForm({
            category: 'other',
            particulars: '',
            amount: 0,
            chargedDate: new Date()
        });
        setChargeDialogVisible(true);
    };

    const submitCharge = async () => {
        if (!selectedBilling || !chargeForm.particulars || !chargeForm.amount) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please fill in all required fields',
                life: 3000
            });
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`/api/student-billing/${selectedBilling._id}/charges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chargeForm)
            });

            const data = await response.json();

            if (response.ok) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Charge added successfully',
                    life: 3000
                });
                setChargeDialogVisible(false);
                fetchBillings();
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.error || 'Failed to add charge',
                    life: 5000
                });
            }
        } catch (error) {
            console.error('Error adding charge:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to add charge',
                life: 5000
            });
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateBilling = async () => {
        if (!selectedSite || !selectedYear || !selectedTerm) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select site, academic year, and term',
                life: 3000
            });
            return;
        }

        confirmDialog({
            message: `This will generate billing records for all students in ${selectedYear} Term ${selectedTerm}. Continue?`,
            header: 'Confirm Bulk Generation',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-primary',
            accept: async () => {
                setSaving(true);
                try {
                    const response = await fetch('/api/student-billing/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            schoolSiteId: selectedSite,
                            academicYear: selectedYear,
                            academicTerm: selectedTerm,
                            classIds: selectedClass ? [selectedClass] : undefined,
                            createdBy: user?.id
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        toast.current?.show({
                            severity: 'success',
                            summary: 'Success',
                            detail: data.message,
                            life: 5000
                        });
                        fetchBillings();
                        fetchSummary();
                    } else {
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Error',
                            detail: data.error || 'Failed to generate billing records',
                            life: 5000
                        });
                    }
                } catch (error) {
                    console.error('Error generating billings:', error);
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to generate billing records',
                        life: 5000
                    });
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    // ==================== RENDER HELPERS ====================

    const formatCurrency = (value: number, currency: string = 'GHS') => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: currency
        }).format(value);
    };

    const formatDate = (date: Date | string | undefined) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const statusBodyTemplate = (rowData: IStudentBilling) => {
        const config = BILLING_STATUS_CONFIG[rowData.billingStatus];
        return <Tag value={config.label} severity={config.severity} icon={config.icon} />;
    };

    const studentBodyTemplate = (rowData: IStudentBilling) => {
        return (
            <div className="flex align-items-center gap-2">
                <div>
                    <div className="font-semibold">
                        {rowData.student.firstName} {rowData.student.lastName}
                    </div>
                    <div className="text-sm text-500">{rowData.student.studentInfo?.studentId || 'No ID'}</div>
                </div>
            </div>
        );
    };

    const balanceBodyTemplate = (rowData: IStudentBilling) => {
        const isOwing = rowData.currentBalance > 0;
        const isOverpaid = rowData.currentBalance < 0;

        return (
            <span className={`font-bold ${isOwing ? 'text-red-600' : isOverpaid ? 'text-blue-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(rowData.currentBalance), rowData.currency)}
                {isOverpaid && <span className="text-xs ml-1">(CR)</span>}
            </span>
        );
    };

    const actionsBodyTemplate = (rowData: IStudentBilling) => {
        return (
            <div className="flex gap-1">
                <Button icon="pi pi-eye" rounded text severity="info" tooltip="View Details" tooltipOptions={{ position: 'top' }} onClick={() => handleViewBilling(rowData)} />
                <Button icon="pi pi-plus" rounded text severity="warning" tooltip="Add Charge" tooltipOptions={{ position: 'top' }} onClick={() => handleAddCharge(rowData)} disabled={rowData.isLocked} />
            </div>
        );
    };

    // ==================== TOOLBAR ====================

    const leftToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2 align-items-center">
                <Dropdown value={selectedSite} options={sites} optionLabel="siteName" optionValue="_id" placeholder="Select Site" onChange={(e) => setSelectedSite(e.value)} className="w-12rem" />
                <Dropdown value={selectedYear} options={getAcademicYears} placeholder="Academic Year" onChange={(e) => setSelectedYear(e.value)} className="w-10rem" />
                <Dropdown value={selectedTerm} options={TERM_OPTIONS} placeholder="Term" onChange={(e) => setSelectedTerm(e.value)} className="w-8rem" />
                <Dropdown value={selectedClass} options={[{ _id: '', className: 'All Classes' }, ...classes]} optionLabel="className" optionValue="_id" placeholder="Class" onChange={(e) => setSelectedClass(e.value)} className="w-10rem" />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search students..." className="w-15rem" />
                </span>
                <Dropdown value={selectedStatus} options={STATUS_OPTIONS} placeholder="Status" onChange={(e) => setSelectedStatus(e.value)} className="w-10rem" />
                <Button label="Generate Bills" icon="pi pi-cog" severity="success" onClick={handleGenerateBilling} loading={saving} />
                <Button icon="pi pi-refresh" rounded outlined onClick={fetchBillings} tooltip="Refresh" />
            </div>
        );
    };

    // ==================== SUMMARY CARDS ====================

    const renderSummaryCards = () => {
        if (summaryLoading) {
            return (
                <div className="grid">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="col-12 md:col-6 lg:col-2">
                            <Skeleton height="100px" />
                        </div>
                    ))}
                </div>
            );
        }

        if (!summary) return null;

        const collectionRate = summary.totalBilled > 0 ? (summary.totalPaid / summary.totalBilled) * 100 : 0;

        return (
            <div className="grid mb-4">
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full bg-blue-50">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Total Billed</div>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalBilled)}</div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full bg-green-50">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Total Paid</div>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full bg-red-50">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Outstanding</div>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full bg-orange-50">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Owing Students</div>
                            <div className="text-2xl font-bold text-orange-600">{summary.owingCount}</div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full bg-teal-50">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Cleared</div>
                            <div className="text-2xl font-bold text-teal-600">{summary.clearCount}</div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-6 lg:col-2">
                    <Card className="h-full">
                        <div className="text-center">
                            <div className="text-500 mb-2 text-sm">Collection Rate</div>
                            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
                            <ProgressBar value={collectionRate} showValue={false} style={{ height: '6px' }} className="mt-2" />
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    // ==================== VIEW DIALOG ====================

    const renderViewDialog = () => {
        if (!selectedBilling) return null;

        return (
            <Dialog
                visible={viewDialogVisible}
                onHide={() => setViewDialogVisible(false)}
                header={
                    <div className="flex align-items-center gap-3">
                        <i className="pi pi-file-edit text-2xl text-primary" />
                        <div>
                            <div className="text-xl font-bold">
                                {selectedBilling.student.firstName} {selectedBilling.student.lastName}
                            </div>
                            <div className="text-sm text-500">
                                {selectedBilling.academicYear} - Term {selectedBilling.academicTerm}
                            </div>
                        </div>
                    </div>
                }
                style={{ width: '80vw', maxWidth: '1000px' }}
                modal
                className="p-fluid"
            >
                <TabView>
                    {/* Overview Tab */}
                    <TabPanel header="Overview" leftIcon="pi pi-chart-bar mr-2">
                        <div className="grid">
                            <div className="col-12 lg:col-6">
                                <Panel header="Financial Summary" className="h-full">
                                    <div className="grid">
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Balance B/F</div>
                                            <div className="text-xl font-semibold">{formatCurrency(selectedBilling.balanceBroughtForward, selectedBilling.currency)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Term Bill</div>
                                            <div className="text-xl font-semibold">{formatCurrency(selectedBilling.termOrSemesterBill, selectedBilling.currency)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Added Charges</div>
                                            <div className="text-xl font-semibold text-orange-600">{formatCurrency(selectedBilling.addedChargesTotal, selectedBilling.currency)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Total Billed</div>
                                            <div className="text-xl font-bold text-blue-600">{formatCurrency(selectedBilling.totalBilled, selectedBilling.currency)}</div>
                                        </div>
                                        <div className="col-12">
                                            <Divider />
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Total Paid</div>
                                            <div className="text-xl font-semibold text-green-600">{formatCurrency(selectedBilling.totalPaid, selectedBilling.currency)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Current Balance</div>
                                            <div className={`text-2xl font-bold ${selectedBilling.currentBalance > 0 ? 'text-red-600' : selectedBilling.currentBalance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                                                {formatCurrency(Math.abs(selectedBilling.currentBalance), selectedBilling.currency)}
                                                {selectedBilling.currentBalance < 0 && <span className="text-sm ml-1">(CR)</span>}
                                            </div>
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                            <div className="col-12 lg:col-6">
                                <Panel header="Billing Information" className="h-full">
                                    <div className="grid">
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Status</div>
                                            <div className="mt-1">{statusBodyTemplate(selectedBilling)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Class</div>
                                            <div className="text-lg font-semibold">{selectedBilling.class.className}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Bill Generated</div>
                                            <div>{formatDate(selectedBilling.billGeneratedDate)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="text-500 text-sm">Payment Due</div>
                                            <div>{formatDate(selectedBilling.paymentDueDate)}</div>
                                        </div>
                                        <div className="col-12">
                                            <div className="text-500 text-sm">School Site</div>
                                            <div>{selectedBilling.schoolSite.siteName}</div>
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        {selectedBilling.feeBreakdown && selectedBilling.feeBreakdown.length > 0 && (
                            <Panel header="Fee Breakdown" className="mt-3">
                                <DataTable value={selectedBilling.feeBreakdown} size="small">
                                    <Column field="description" header="Description" />
                                    <Column field="determinant" header="Category" />
                                    <Column field="amount" header="Amount" body={(row) => formatCurrency(row.amount, selectedBilling.currency)} style={{ textAlign: 'right', width: '150px' }} />
                                </DataTable>
                            </Panel>
                        )}
                    </TabPanel>

                    {/* Charges Tab */}
                    <TabPanel header="Additional Charges" leftIcon="pi pi-plus-circle mr-2">
                        {selectedBilling.additionalCharges.length === 0 ? (
                            <Message severity="info" text="No additional charges have been added to this billing record." className="w-full" />
                        ) : (
                            <DataTable value={selectedBilling.additionalCharges} size="small" paginator rows={5}>
                                <Column field="chargedDate" header="Date" body={(row) => formatDate(row.chargedDate)} style={{ width: '100px' }} />
                                <Column
                                    field="category"
                                    header="Category"
                                    body={(row) => {
                                        const cat = CHARGE_CATEGORIES.find((c) => c.value === row.category);
                                        return <Chip label={cat?.label || row.category} icon={cat?.icon} />;
                                    }}
                                />
                                <Column field="particulars" header="Particulars" />
                                <Column field="amount" header="Amount" body={(row) => formatCurrency(row.amount, selectedBilling.currency)} style={{ textAlign: 'right', width: '120px' }} />
                                <Column field="addedBy" header="Added By" body={(row) => (typeof row.addedBy === 'object' ? `${row.addedBy.firstName} ${row.addedBy.lastName}` : '-')} style={{ width: '150px' }} />
                            </DataTable>
                        )}

                        <div className="flex justify-content-end mt-3">
                            <Button label="Add New Charge" icon="pi pi-plus" onClick={() => handleAddCharge(selectedBilling)} disabled={selectedBilling.isLocked} />
                        </div>
                    </TabPanel>

                    {/* Payments Tab */}
                    <TabPanel header="Payments" leftIcon="pi pi-dollar mr-2">
                        {selectedBilling.linkedPayments.length === 0 ? (
                            <Message severity="info" text="No payments have been linked to this billing record." className="w-full" />
                        ) : (
                            <DataTable value={selectedBilling.linkedPayments} size="small">
                                <Column field="datePaid" header="Date Paid" body={(row) => formatDate(row.datePaid)} />
                                <Column field="receiptNumber" header="Receipt #" />
                                <Column field="paymentMethod" header="Method" />
                                <Column field="amount" header="Amount" body={(row) => formatCurrency(row.amount, selectedBilling.currency)} style={{ textAlign: 'right' }} />
                            </DataTable>
                        )}
                    </TabPanel>

                    {/* Audit Trail Tab */}
                    <TabPanel header="Audit Trail" leftIcon="pi pi-history mr-2">
                        {selectedBilling.auditTrail && selectedBilling.auditTrail.length > 0 ? (
                            <Timeline
                                value={selectedBilling.auditTrail}
                                opposite={(item) => <small className="text-500">{formatDate(item.performedAt)}</small>}
                                content={(item) => (
                                    <div>
                                        <div className="font-semibold text-sm">{item.action.replace('_', ' ').toUpperCase()}</div>
                                        <div className="text-500">{item.details}</div>
                                        {typeof item.performedBy === 'object' && (
                                            <small className="text-400">
                                                By: {item.performedBy.firstName} {item.performedBy.lastName}
                                            </small>
                                        )}
                                    </div>
                                )}
                            />
                        ) : (
                            <Message severity="info" text="No audit trail available" className="w-full" />
                        )}
                    </TabPanel>
                </TabView>
            </Dialog>
        );
    };

    // ==================== CHARGE DIALOG ====================

    const renderChargeDialog = () => {
        return (
            <Dialog
                visible={chargeDialogVisible}
                onHide={() => setChargeDialogVisible(false)}
                header="Add Additional Charge"
                style={{ width: '500px' }}
                modal
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" outlined onClick={() => setChargeDialogVisible(false)} />
                        <Button label="Add Charge" icon="pi pi-check" onClick={submitCharge} loading={saving} />
                    </div>
                }
            >
                {selectedBilling && (
                    <div className="mb-4 p-3 bg-gray-100 border-round">
                        <div className="font-semibold">
                            {selectedBilling.student.firstName} {selectedBilling.student.lastName}
                        </div>
                        <div className="text-sm text-500">
                            {selectedBilling.academicYear} - Term {selectedBilling.academicTerm}
                        </div>
                    </div>
                )}

                <div className="grid">
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-1">Category *</label>
                        <Dropdown
                            value={chargeForm.category}
                            options={CHARGE_CATEGORIES}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(e) => setChargeForm({ ...chargeForm, category: e.value })}
                            placeholder="Select category"
                            className="w-full"
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-1">Particulars *</label>
                        <InputTextarea value={chargeForm.particulars} onChange={(e) => setChargeForm({ ...chargeForm, particulars: e.target.value })} placeholder="Description of the charge" rows={2} className="w-full" />
                    </div>
                    <div className="col-6">
                        <label className="block text-sm font-medium mb-1">Amount *</label>
                        <InputNumber value={chargeForm.amount} onValueChange={(e) => setChargeForm({ ...chargeForm, amount: e.value || 0 })} mode="currency" currency={selectedBilling?.currency || 'GHS'} locale="en-GH" className="w-full" />
                    </div>
                    <div className="col-6">
                        <label className="block text-sm font-medium mb-1">Charge Date</label>
                        <Calendar value={chargeForm.chargedDate ? new Date(chargeForm.chargedDate) : new Date()} onChange={(e) => setChargeForm({ ...chargeForm, chargedDate: e.value as Date })} dateFormat="dd/mm/yy" className="w-full" />
                    </div>
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-1">Reference (Optional)</label>
                        <InputText value={chargeForm.reference || ''} onChange={(e) => setChargeForm({ ...chargeForm, reference: e.target.value })} placeholder="Invoice or reference number" className="w-full" />
                    </div>
                    <div className="col-12">
                        <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                        <InputTextarea value={chargeForm.notes || ''} onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })} placeholder="Additional notes" rows={2} className="w-full" />
                    </div>
                </div>
            </Dialog>
        );
    };

    // ==================== MAIN RENDER ====================

    return (
        <div className="student-billing-management">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header */}
            <div className="flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="m-0">Student Billing Management</h2>
                    <p className="text-500 mt-1">Manage student billing records, charges, and financial tracking</p>
                </div>
            </div>

            {/* Summary Cards */}
            {renderSummaryCards()}

            {/* Main Content */}
            <Card>
                <Toolbar left={leftToolbarTemplate} right={rightToolbarTemplate} className="mb-4 p-3" />

                <DataTable
                    value={billings}
                    loading={loading}
                    paginator
                    rows={rows}
                    first={first}
                    totalRecords={totalRecords}
                    onPage={(e) => {
                        setFirst(e.first);
                        setRows(e.rows);
                    }}
                    lazy
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    emptyMessage="No billing records found"
                    className="p-datatable-sm"
                    stripedRows
                    showGridlines
                    responsiveLayout="scroll"
                >
                    <Column field="student" header="Student" body={studentBodyTemplate} style={{ minWidth: '200px' }} />
                    <Column field="class.className" header="Class" style={{ width: '120px' }} />
                    <Column field="balanceBroughtForward" header="Balance B/F" body={(row) => formatCurrency(row.balanceBroughtForward, row.currency)} style={{ textAlign: 'right', width: '120px' }} />
                    <Column field="termOrSemesterBill" header="Term Bill" body={(row) => formatCurrency(row.termOrSemesterBill, row.currency)} style={{ textAlign: 'right', width: '120px' }} />
                    <Column field="addedChargesTotal" header="Charges" body={(row) => formatCurrency(row.addedChargesTotal, row.currency)} style={{ textAlign: 'right', width: '100px' }} />
                    <Column field="totalPaid" header="Paid" body={(row) => <span className="text-green-600 font-semibold">{formatCurrency(row.totalPaid, row.currency)}</span>} style={{ textAlign: 'right', width: '120px' }} />
                    <Column field="currentBalance" header="Balance" body={balanceBodyTemplate} style={{ textAlign: 'right', width: '130px' }} />
                    <Column field="billingStatus" header="Status" body={statusBodyTemplate} style={{ width: '100px' }} />
                    <Column body={actionsBodyTemplate} style={{ width: '100px' }} />
                </DataTable>
            </Card>

            {/* Dialogs */}
            {renderViewDialog()}
            {renderChargeDialog()}
        </div>
    );
};

export default StudentBillingManagement;
