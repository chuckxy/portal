'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { Badge } from 'primereact/badge';
import { TabView, TabPanel } from 'primereact/tabview';
import { Chip } from 'primereact/chip';
import { FileUpload } from 'primereact/fileupload';
import LocalDBService from '@/lib/services/localDBService';
import { getAcademicYears } from '@/lib/utils/utilFunctions';

type ExpenditureCategory =
    | 'salaries_wages'
    | 'utilities'
    | 'supplies'
    | 'maintenance'
    | 'transportation'
    | 'food_canteen'
    | 'equipment'
    | 'infrastructure'
    | 'insurance'
    | 'taxes_fees'
    | 'marketing'
    | 'professional_services'
    | 'staff_development'
    | 'student_activities'
    | 'library'
    | 'technology'
    | 'other';

type ExpenditureStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
type PaymentMethod = 'cash' | 'cheque' | 'bank_transfer' | 'mobile_money' | 'card';

interface ExpenditureData {
    _id?: string;
    school: any;
    site: any;
    expenditureDate: Date;
    category: ExpenditureCategory | string;
    subCategory?: string;
    amount: number;
    currency: string;
    description: string;
    vendor?: string;
    vendorContact?: string;
    paymentMethod?: PaymentMethod;
    referenceNumber?: string;
    receiptNumber?: string;
    invoiceNumber?: string;
    academicYear: string;
    academicTerm?: number;
    status: ExpenditureStatus;
    requestedBy?: any;
    approvedBy?: any;
    approvalDate?: Date;
    paidBy?: any;
    paymentDate?: Date;
    notes?: string;
    attachments?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

interface School {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    description: string;
    school: any;
}

interface CustomCategory {
    _id?: string;
    name: string;
    value: string;
    isCustom: boolean;
}

export const ExpenditureManagement: React.FC = () => {
    const [expenditures, setExpenditures] = useState<ExpenditureData[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [categories, setCategories] = useState<CustomCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedExpenditure, setSelectedExpenditure] = useState<ExpenditureData | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    const [formData, setFormData] = useState<Partial<ExpenditureData>>({
        expenditureDate: new Date(),
        academicYear: getAcademicYears[0].value,
        academicTerm: 1,
        currency: 'GHS',
        amount: 0,
        status: 'pending'
    });

    const [newCategory, setNewCategory] = useState({ name: '', value: '' });

    const [filters, setFilters] = useState({
        site: '',
        category: '',
        status: '',
        academicYear: '',
        academicTerm: null as number | null,
        dateFrom: null as Date | null,
        dateTo: null as Date | null,
        minAmount: null as number | null,
        maxAmount: null as number | null
    });

    // Statistics
    const [statistics, setStatistics] = useState({
        totalPending: 0,
        totalApproved: 0,
        totalPaid: 0,
        monthlyTotal: 0,
        termTotal: 0,
        pendingCount: 0,
        approvedCount: 0
    });

    const toast = useRef<Toast>(null);
    const dt = useRef<DataTable<ExpenditureData[]>>(null);

    const academicTerms = [
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    const defaultCategories: CustomCategory[] = [
        { name: 'Salaries & Wages', value: 'salaries_wages', isCustom: false },
        { name: 'Utilities', value: 'utilities', isCustom: false },
        { name: 'Supplies', value: 'supplies', isCustom: false },
        { name: 'Maintenance & Repairs', value: 'maintenance', isCustom: false },
        { name: 'Transportation', value: 'transportation', isCustom: false },
        { name: 'Food & Canteen', value: 'food_canteen', isCustom: false },
        { name: 'Equipment', value: 'equipment', isCustom: false },
        { name: 'Infrastructure', value: 'infrastructure', isCustom: false },
        { name: 'Insurance', value: 'insurance', isCustom: false },
        { name: 'Taxes & Fees', value: 'taxes_fees', isCustom: false },
        { name: 'Marketing & Recruitment', value: 'marketing', isCustom: false },
        { name: 'Professional Services', value: 'professional_services', isCustom: false },
        { name: 'Staff Development', value: 'staff_development', isCustom: false },
        { name: 'Student Activities', value: 'student_activities', isCustom: false },
        { name: 'Library & Resources', value: 'library', isCustom: false },
        { name: 'Technology & IT', value: 'technology', isCustom: false },
        { name: 'Other', value: 'other', isCustom: false }
    ];

    const paymentMethods: { label: string; value: PaymentMethod; icon: string }[] = [
        { label: 'Cash', value: 'cash', icon: '💵' },
        { label: 'Cheque', value: 'cheque', icon: '📝' },
        { label: 'Bank Transfer', value: 'bank_transfer', icon: '🏦' },
        { label: 'Mobile Money', value: 'mobile_money', icon: '📱' },
        { label: 'Card', value: 'card', icon: '💳' }
    ];

    useEffect(() => {
        fetchSchools();
        fetchExpenditures();
        loadCustomCategories();
    }, []);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school);
        }
    }, [formData.school]);

    const loadCustomCategories = () => {
        const stored = localStorage.getItem('customExpenditureCategories');
        if (stored) {
            const custom = JSON.parse(stored);
            setCategories([...defaultCategories, ...custom]);
        } else {
            setCategories(defaultCategories);
        }
    };

    const saveCustomCategory = () => {
        if (!newCategory.name.trim()) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Category name is required',
                life: 3000
            });
            return;
        }

        const value = newCategory.value || newCategory.name.toLowerCase().replace(/\s+/g, '_');
        const customCat: CustomCategory = {
            name: newCategory.name,
            value: value,
            isCustom: true
        };

        const existingCustom = categories.filter((c) => c.isCustom);
        const updatedCustom = [...existingCustom, customCat];

        localStorage.setItem('customExpenditureCategories', JSON.stringify(updatedCustom));

        setCategories([...defaultCategories, ...updatedCustom]);
        setNewCategory({ name: '', value: '' });
        setCategoryDialogVisible(false);

        toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Category added successfully',
            life: 3000
        });
    };

    const fetchSchools = async () => {
        try {
            const response = await fetch('/api/school');
            const data = await response.json();
            setSchools(Array.isArray(data) ? data : [data]);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchSites = async (schoolId: any) => {
        try {
            const id = typeof schoolId === 'object' ? schoolId._id : schoolId;
            const response = await fetch(`/api/sites?school=${id}`);
            const data = await response.json();
            setSites(data.sites || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchExpenditures = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            if (filters.site) queryParams.append('site', filters.site);
            if (filters.category) queryParams.append('category', filters.category);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.academicTerm) queryParams.append('academicTerm', filters.academicTerm.toString());
            if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom.toISOString());
            if (filters.dateTo) queryParams.append('dateTo', filters.dateTo.toISOString());
            if (filters.minAmount !== null) queryParams.append('minAmount', filters.minAmount.toString());
            if (filters.maxAmount !== null) queryParams.append('maxAmount', filters.maxAmount.toString());

            const response = await fetch(`/api/expenditures?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch expenditures');

            const data = await response.json();
            setExpenditures(data.expenditures || []);
            calculateStatistics(data.expenditures || []);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load expenditures',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStatistics = (data: ExpenditureData[]) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyExpenditures = data.filter((e) => {
            const expDate = new Date(e.expenditureDate);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

        const totalPending = data.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
        const totalApproved = data.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
        const totalPaid = data.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
        const monthlyTotal = monthlyExpenditures.reduce((sum, e) => sum + e.amount, 0);
        const termTotal = data.reduce((sum, e) => sum + e.amount, 0);

        setStatistics({
            totalPending,
            totalApproved,
            totalPaid,
            monthlyTotal,
            termTotal,
            pendingCount: data.filter((e) => e.status === 'pending').length,
            approvedCount: data.filter((e) => e.status === 'approved').length
        });
    };

    const openNew = () => {
        setFormData({
            expenditureDate: new Date(),
            academicYear: getAcademicYears[0].value,
            academicTerm: 1,
            currency: 'GHS',
            amount: 0,
            status: 'pending'
        });
        setEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (expenditure: ExpenditureData) => {
        setFormData({
            ...expenditure,
            school: expenditure.site?.school?._id || expenditure.site?.school,
            site: expenditure.site?._id,
            expenditureDate: new Date(expenditure.expenditureDate)
        });
        setEditMode(true);
        setDialogVisible(true);
    };

    const openView = (expenditure: ExpenditureData) => {
        setSelectedExpenditure(expenditure);
        setViewDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setEditMode(false);
    };

    const saveExpenditure = async () => {
        if (!validateForm()) return;

        try {
            setLoading(true);

            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const url = editMode ? `/api/expenditures?id=${formData._id}` : '/api/expenditures';
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save expenditure');
            }

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Expenditure ${editMode ? 'updated' : 'created'} successfully`,
                life: 3000
            });

            hideDialog();
            fetchExpenditures();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Failed to save expenditure',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (expenditure: ExpenditureData, newStatus: ExpenditureStatus) => {
        try {
            setLoading(true);

            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`/api/expenditures?id=${expenditure._id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    status: newStatus,
                    ...(newStatus === 'approved' && { approvalDate: new Date() }),
                    ...(newStatus === 'paid' && { paymentDate: new Date() })
                })
            });

            if (!response.ok) throw new Error('Failed to update status');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Status updated to ${newStatus}`,
                life: 3000
            });

            fetchExpenditures();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update status',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteExpenditure = async (expenditure: ExpenditureData) => {
        confirmDialog({
            message: `Are you sure you want to delete this expenditure of ${new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(expenditure.amount)}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/expenditures?id=${expenditure._id}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) throw new Error('Failed to delete');

                    toast.current?.show({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Expenditure deleted successfully',
                        life: 3000
                    });

                    fetchExpenditures();
                } catch (error) {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete expenditure',
                        life: 3000
                    });
                }
            }
        });
    };

    const validateForm = () => {
        if (!formData.school || !formData.site) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select school and site',
                life: 3000
            });
            return false;
        }

        if (!formData.expenditureDate) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select expenditure date',
                life: 3000
            });
            return false;
        }

        if (!formData.category) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select category',
                life: 3000
            });
            return false;
        }

        if (!formData.amount || formData.amount <= 0) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please enter valid amount',
                life: 3000
            });
            return false;
        }

        if (!formData.description?.trim()) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please provide description',
                life: 3000
            });
            return false;
        }

        return true;
    };

    const exportCSV = () => {
        dt.current?.exportCSV();
    };

    // Template functions
    const dateBodyTemplate = (rowData: ExpenditureData) => {
        return new Date(rowData.expenditureDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const amountBodyTemplate = (rowData: ExpenditureData) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: rowData.currency || 'GHS'
        }).format(rowData.amount);
    };

    const categoryBodyTemplate = (rowData: ExpenditureData) => {
        const category = categories.find((c) => c.value === rowData.category);
        return (
            <div className="flex align-items-center gap-2">
                <span>{category?.name || rowData.category}</span>
                {category?.isCustom && <Badge value="Custom" severity="info" />}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: ExpenditureData) => {
        const severityMap: Record<ExpenditureStatus, 'info' | 'success' | 'warning' | 'danger'> = {
            pending: 'warning',
            approved: 'info',
            paid: 'success',
            rejected: 'danger',
            cancelled: 'danger'
        };

        return <Tag value={rowData.status.toUpperCase()} severity={severityMap[rowData.status]} />;
    };

    const actionsBodyTemplate = (rowData: ExpenditureData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-info" onClick={() => openView(rowData)} tooltip="View Details" tooltipOptions={{ position: 'top' }} />

                {rowData.status === 'pending' && (
                    <>
                        <Button icon="pi pi-check" className="p-button-rounded p-button-text p-button-success" onClick={() => updateStatus(rowData, 'approved')} tooltip="Approve" tooltipOptions={{ position: 'top' }} />
                        <Button icon="pi pi-times" className="p-button-rounded p-button-text p-button-danger" onClick={() => updateStatus(rowData, 'rejected')} tooltip="Reject" tooltipOptions={{ position: 'top' }} />
                    </>
                )}

                {rowData.status === 'approved' && (
                    <Button icon="pi pi-money-bill" className="p-button-rounded p-button-text p-button-success" onClick={() => updateStatus(rowData, 'paid')} tooltip="Mark as Paid" tooltipOptions={{ position: 'top' }} />
                )}

                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-warning" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} disabled={rowData.status === 'paid'} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => deleteExpenditure(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} disabled={rowData.status === 'paid'} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="New Expenditure" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
                <Button label="Export" icon="pi pi-upload" className="p-button-help" onClick={exportCSV} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchExpenditures} loading={loading} />
            </div>
        );
    };

    // Get expenditures by tab
    const getFilteredExpenditures = () => {
        switch (activeTab) {
            case 0:
                return expenditures;
            case 1:
                return expenditures.filter((e) => e.status === 'pending');
            case 2:
                return expenditures.filter((e) => e.status === 'approved');
            case 3:
                return expenditures.filter((e) => e.status === 'paid');
            default:
                return expenditures;
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Statistics Cards */}
            <div className="grid mb-3">
                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Pending Approval</span>
                                <span className="text-2xl font-bold text-orange-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.totalPending)}
                                </span>
                                <div className="text-sm text-600 mt-1">{statistics.pendingCount} items</div>
                            </div>
                            <div className="bg-orange-100 text-orange-600 border-round p-2">
                                <i className="pi pi-clock text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Approved</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.totalApproved)}
                                </span>
                                <div className="text-sm text-600 mt-1">{statistics.approvedCount} items</div>
                            </div>
                            <div className="bg-blue-100 text-blue-600 border-round p-2">
                                <i className="pi pi-check-circle text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">Total Paid</span>
                                <span className="text-2xl font-bold text-green-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.totalPaid)}
                                </span>
                                <div className="text-sm text-600 mt-1">This period</div>
                            </div>
                            <div className="bg-green-100 text-green-600 border-round p-2">
                                <i className="pi pi-money-bill text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start">
                            <div>
                                <span className="text-500 text-sm block mb-2">This Month</span>
                                <span className="text-2xl font-bold text-purple-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.monthlyTotal)}
                                </span>
                                <div className="text-sm text-600 mt-1">All statuses</div>
                            </div>
                            <div className="bg-purple-100 text-purple-600 border-round p-2">
                                <i className="pi pi-chart-bar text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <div className="grid">
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Site</label>
                        <Dropdown value={filters.site} options={sites.map((s) => ({ label: s.description, value: s._id }))} onChange={(e) => setFilters({ ...filters, site: e.value })} placeholder="All Sites" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Category</label>
                        <Dropdown
                            value={filters.category}
                            options={categories.map((c) => ({ label: c.name, value: c.value }))}
                            onChange={(e) => setFilters({ ...filters, category: e.value })}
                            placeholder="All Categories"
                            className="w-full"
                            showClear
                            filter
                        />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Status</label>
                        <Dropdown
                            value={filters.status}
                            options={[
                                { label: 'Pending', value: 'pending' },
                                { label: 'Approved', value: 'approved' },
                                { label: 'Paid', value: 'paid' },
                                { label: 'Rejected', value: 'rejected' }
                            ]}
                            onChange={(e) => setFilters({ ...filters, status: e.value })}
                            placeholder="All Statuses"
                            className="w-full"
                            showClear
                        />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Academic Year</label>
                        <Dropdown value={filters.academicYear} options={getAcademicYears} onChange={(e) => setFilters({ ...filters, academicYear: e.value })} placeholder="All Years" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Date From</label>
                        <Calendar value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Date To</label>
                        <Calendar value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                    </div>
                    <div className="col-12 flex align-items-end gap-2">
                        <Button label="Apply Filters" icon="pi pi-filter" onClick={fetchExpenditures} />
                        <Button
                            label="Clear"
                            icon="pi pi-filter-slash"
                            className="p-button-outlined"
                            onClick={() => {
                                setFilters({
                                    site: '',
                                    category: '',
                                    status: '',
                                    academicYear: '',
                                    academicTerm: null,
                                    dateFrom: null,
                                    dateTo: null,
                                    minAmount: null,
                                    maxAmount: null
                                });
                                fetchExpenditures();
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Data Table with Tabs */}
            <Card title="Expenditures">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                    <TabPanel header={`All (${expenditures.length})`}>
                        <DataTable ref={dt} value={getFilteredExpenditures()} loading={loading} paginator rows={20} rowsPerPageOptions={[10, 20, 50]} dataKey="_id" emptyMessage="No expenditures found" stripedRows>
                            <Column field="expenditureDate" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px' }} />
                            <Column field="category" header="Category" body={categoryBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                            <Column field="vendor" header="Vendor" sortable style={{ minWidth: '150px' }} />
                            <Column field="amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '130px' }} />
                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '120px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '200px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Pending (${statistics.pendingCount})`}>
                        <DataTable value={getFilteredExpenditures()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No pending expenditures" stripedRows>
                            <Column field="expenditureDate" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px' }} />
                            <Column field="category" header="Category" body={categoryBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                            <Column field="amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '130px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '200px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header={`Approved (${statistics.approvedCount})`}>
                        <DataTable value={getFilteredExpenditures()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No approved expenditures" stripedRows>
                            <Column field="expenditureDate" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px' }} />
                            <Column field="category" header="Category" body={categoryBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                            <Column field="amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '130px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '200px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header="Paid">
                        <DataTable value={getFilteredExpenditures()} loading={loading} paginator rows={20} dataKey="_id" emptyMessage="No paid expenditures" stripedRows>
                            <Column field="expenditureDate" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px' }} />
                            <Column field="category" header="Category" body={categoryBodyTemplate} sortable style={{ minWidth: '180px' }} />
                            <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                            <Column field="vendor" header="Vendor" sortable style={{ minWidth: '150px' }} />
                            <Column field="amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '130px' }} />
                            <Column field="paymentDate" header="Paid On" body={(rowData) => (rowData.paymentDate ? new Date(rowData.paymentDate).toLocaleDateString('en-GB') : '-')} sortable style={{ minWidth: '120px' }} />
                            <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '200px' }} />
                        </DataTable>
                    </TabPanel>
                </TabView>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                onHide={hideDialog}
                header={editMode ? 'Edit Expenditure' : 'New Expenditure'}
                modal
                style={{ width: '900px' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={loading} />
                        <Button label={editMode ? 'Update' : 'Submit'} icon="pi pi-check" onClick={saveExpenditure} loading={loading} />
                    </div>
                }
            >
                <div className="grid">
                    {/* School & Site */}
                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">
                            School <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.school}
                            options={schools.map((s) => ({ label: s.name, value: s._id }))}
                            onChange={(e) => setFormData({ ...formData, school: e.value, site: undefined })}
                            placeholder="Select school"
                            className="w-full"
                            filter
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">
                            Site <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.site}
                            options={sites.map((s) => ({ label: s.description, value: s._id }))}
                            onChange={(e) => setFormData({ ...formData, site: e.value })}
                            placeholder="Select site"
                            className="w-full"
                            filter
                            disabled={!formData.school}
                        />
                    </div>

                    {/* Date & Academic Info */}
                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">
                            Expenditure Date <span className="text-red-500">*</span>
                        </label>
                        <Calendar value={formData.expenditureDate} onChange={(e) => setFormData({ ...formData, expenditureDate: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" maxDate={new Date()} />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Academic Year</label>
                        <Dropdown value={formData.academicYear} options={getAcademicYears} onChange={(e) => setFormData({ ...formData, academicYear: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Term</label>
                        <Dropdown value={formData.academicTerm} options={academicTerms} onChange={(e) => setFormData({ ...formData, academicTerm: e.value })} className="w-full" showClear />
                    </div>

                    <Divider />

                    {/* Category */}
                    <div className="col-12 md:col-8">
                        <label className="block font-medium mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.category}
                            options={categories.map((c) => ({ label: c.name, value: c.value }))}
                            onChange={(e) => setFormData({ ...formData, category: e.value })}
                            placeholder="Select category"
                            className="w-full"
                            filter
                        />
                    </div>

                    <div className="col-12 md:col-4 flex align-items-end">
                        <Button label="Add Category" icon="pi pi-plus" className="w-full" outlined onClick={() => setCategoryDialogVisible(true)} />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">Sub-Category</label>
                        <InputText value={formData.subCategory || ''} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} placeholder="e.g., Water Bill, Office Supplies" className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <InputNumber value={formData.amount} onValueChange={(e) => setFormData({ ...formData, amount: e.value || 0 })} mode="currency" currency="GHS" locale="en-GH" className="w-full" />
                    </div>

                    {/* Description */}
                    <div className="col-12">
                        <label className="block font-medium mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <InputTextarea value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full" placeholder="Detailed description of expenditure..." />
                    </div>

                    <Divider />

                    {/* Vendor Information */}
                    <div className="col-12">
                        <h4 className="mb-3">Vendor Information</h4>
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">Vendor Name</label>
                        <InputText value={formData.vendor || ''} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder="Name of supplier/vendor" className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">Vendor Contact</label>
                        <InputText value={formData.vendorContact || ''} onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })} placeholder="Phone or email" className="w-full" />
                    </div>

                    <Divider />

                    {/* Payment Details */}
                    <div className="col-12">
                        <h4 className="mb-3">Payment Details</h4>
                    </div>

                    <div className="col-12">
                        <label className="block font-medium mb-2">Payment Method</label>
                        <div className="grid">
                            {paymentMethods.map((method) => (
                                <div key={method.value} className="col-4">
                                    <div
                                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                                        className={`p-2 border-1 border-round cursor-pointer transition-colors text-center ${formData.paymentMethod === method.value ? 'border-primary bg-primary-50' : 'border-300 hover:border-400'}`}
                                    >
                                        <div className="text-lg mb-1">{method.icon}</div>
                                        <div className="font-medium text-xs">{method.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Invoice Number</label>
                        <InputText value={formData.invoiceNumber || ''} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder="INV-001" className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Receipt Number</label>
                        <InputText value={formData.receiptNumber || ''} onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })} placeholder="REC-001" className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Reference Number</label>
                        <InputText value={formData.referenceNumber || ''} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} placeholder="REF-001" className="w-full" />
                    </div>

                    {/* Notes */}
                    <div className="col-12">
                        <label className="block font-medium mb-2">Additional Notes</label>
                        <InputTextarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full" placeholder="Any additional information..." />
                    </div>
                </div>
            </Dialog>

            {/* View Dialog */}
            <Dialog visible={viewDialogVisible} onHide={() => setViewDialogVisible(false)} header="Expenditure Details" modal style={{ width: '700px' }}>
                {selectedExpenditure && (
                    <div className="grid">
                        <div className="col-12">
                            <Card className="bg-primary-50 mb-3">
                                <div className="text-center">
                                    <div className="text-sm text-600 mb-2">{new Date(selectedExpenditure.expenditureDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-3xl font-bold text-primary">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: selectedExpenditure.currency
                                        }).format(selectedExpenditure.amount)}
                                    </div>
                                    <div className="mt-2">{statusBodyTemplate(selectedExpenditure)}</div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Site</div>
                            <div className="font-semibold mb-3">{selectedExpenditure.site?.description}</div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Category</div>
                            <div className="mb-3">{categoryBodyTemplate(selectedExpenditure)}</div>
                        </div>

                        {selectedExpenditure.subCategory && (
                            <div className="col-12">
                                <div className="text-sm text-600 mb-1">Sub-Category</div>
                                <div className="font-semibold mb-3">{selectedExpenditure.subCategory}</div>
                            </div>
                        )}

                        <div className="col-12">
                            <div className="text-sm text-600 mb-1">Description</div>
                            <div className="p-3 bg-gray-50 border-round mb-3">{selectedExpenditure.description}</div>
                        </div>

                        {(selectedExpenditure.vendor || selectedExpenditure.vendorContact) && (
                            <>
                                <Divider />
                                <div className="col-12">
                                    <h5>Vendor Information</h5>
                                </div>
                                {selectedExpenditure.vendor && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Vendor</div>
                                        <div className="font-semibold mb-3">{selectedExpenditure.vendor}</div>
                                    </div>
                                )}
                                {selectedExpenditure.vendorContact && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Contact</div>
                                        <div className="font-semibold mb-3">{selectedExpenditure.vendorContact}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {(selectedExpenditure.paymentMethod || selectedExpenditure.invoiceNumber || selectedExpenditure.receiptNumber || selectedExpenditure.referenceNumber) && (
                            <>
                                <Divider />
                                <div className="col-12">
                                    <h5>Payment Details</h5>
                                </div>
                                {selectedExpenditure.paymentMethod && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Payment Method</div>
                                        <div className="font-semibold mb-3">{paymentMethods.find((m) => m.value === selectedExpenditure.paymentMethod)?.label}</div>
                                    </div>
                                )}
                                {selectedExpenditure.invoiceNumber && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Invoice #</div>
                                        <div className="font-semibold mb-3">{selectedExpenditure.invoiceNumber}</div>
                                    </div>
                                )}
                                {selectedExpenditure.receiptNumber && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Receipt #</div>
                                        <div className="font-semibold mb-3">{selectedExpenditure.receiptNumber}</div>
                                    </div>
                                )}
                                {selectedExpenditure.referenceNumber && (
                                    <div className="col-12 md:col-6">
                                        <div className="text-sm text-600 mb-1">Reference #</div>
                                        <div className="font-semibold mb-3">{selectedExpenditure.referenceNumber}</div>
                                    </div>
                                )}
                            </>
                        )}

                        {selectedExpenditure.notes && (
                            <>
                                <Divider />
                                <div className="col-12">
                                    <div className="text-sm text-600 mb-1">Notes</div>
                                    <div className="p-3 bg-gray-50 border-round">{selectedExpenditure.notes}</div>
                                </div>
                            </>
                        )}

                        <Divider />
                        <div className="col-12">
                            <div className="text-xs text-500 text-center">
                                Requested by {selectedExpenditure.requestedBy?.firstName} {selectedExpenditure.requestedBy?.lastName} on {new Date(selectedExpenditure.createdAt!).toLocaleString()}
                                {selectedExpenditure.approvedBy && (
                                    <>
                                        <br />
                                        Approved by {selectedExpenditure.approvedBy.firstName} {selectedExpenditure.approvedBy.lastName} on {new Date(selectedExpenditure.approvalDate!).toLocaleString()}
                                    </>
                                )}
                                {selectedExpenditure.paidBy && (
                                    <>
                                        <br />
                                        Paid by {selectedExpenditure.paidBy.firstName} {selectedExpenditure.paidBy.lastName} on {new Date(selectedExpenditure.paymentDate!).toLocaleString()}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Add Category Dialog */}
            <Dialog
                visible={categoryDialogVisible}
                onHide={() => setCategoryDialogVisible(false)}
                header="Add Custom Category"
                modal
                style={{ width: '450px' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setCategoryDialogVisible(false)} />
                        <Button label="Add" icon="pi pi-check" onClick={saveCustomCategory} />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    <div>
                        <label className="block font-medium mb-2">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <InputText value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="e.g., Marketing Materials" className="w-full" />
                    </div>

                    <div>
                        <label className="block font-medium mb-2">Category ID (Optional)</label>
                        <InputText value={newCategory.value} onChange={(e) => setNewCategory({ ...newCategory, value: e.target.value })} placeholder="e.g., marketing_materials" className="w-full" />
                        <small className="text-500">If left empty, will be auto-generated from name</small>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default ExpenditureManagement;
