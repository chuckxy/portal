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
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Tooltip } from 'primereact/tooltip';
import { useReactToPrint } from 'react-to-print';
import LocalDBService from '@/lib/services/localDBService';
import { useAuth } from '@/context/AuthContext';
import { getAcademicYears } from '@/lib/utils/utilFunctions';
import { CollectionsPrintReport } from '@/components/print/CollectionsPrintReport';

interface DailyFeeCollectionData {
    _id?: string;
    school: any;
    site: any;
    academicYear: string;
    academicTerm: number;
    collectionDate: Date;
    canteenFeeAmount: number;
    busFeeAmount: number;
    totalStudents: number;
    totalStudentsPresent: number;
    totalAbsent: number;
    accumulatedCanteenFee: number;
    accumulatedBusFee: number;
    currency: string;
    notes?: string;
    recordedBy?: any;
    createdAt?: Date;
    updatedAt?: Date;
    totalAccumulatedFees?: number;
    totalDailyCollection?: number;
    attendancePercentage?: number;
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

export const DailyFeeCollectionManagement: React.FC = () => {
    const [collections, setCollections] = useState<DailyFeeCollectionData[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [filterSites, setFilterSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<DailyFeeCollectionData | null>(null);
    const { user } = useAuth();

    const [formData, setFormData] = useState<Partial<DailyFeeCollectionData>>({
        collectionDate: new Date(),
        academicYear: getAcademicYears[0].value,
        academicTerm: 1,
        currency: 'GHS',
        canteenFeeAmount: 0,
        busFeeAmount: 0,
        totalStudents: 0,
        totalStudentsPresent: 0,
        totalAbsent: 0,
        accumulatedCanteenFee: 0,
        accumulatedBusFee: 0
    });

    const [filters, setFilters] = useState({
        school: '',
        site: '',
        academicYear: '',
        academicTerm: null as number | null,
        dateFrom: null as Date | null,
        dateTo: null as Date | null
    });

    // Statistics
    const [statistics, setStatistics] = useState({
        todayTotal: 0,
        termTotal: 0,
        averageAttendance: 0,
        totalCollections: 0
    });

    const toast = useRef<Toast>(null);
    const dt = useRef<DataTable<DailyFeeCollectionData[]>>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const academicTerms = [
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    // Print handler
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Collections_Report_${new Date().toISOString().split('T')[0]}`,
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
        fetchCollections();
    }, [user]);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school);
        }
    }, [formData.school]);

    // Fetch total students when site is selected
    useEffect(() => {
        if (formData.site && dialogVisible && !editMode) {
            fetchTotalStudentsForSite(formData.site);
        }
    }, [formData.site, dialogVisible, editMode]);

    // Auto-calculate absent students only
    useEffect(() => {
        if (formData.totalStudents && formData.totalStudentsPresent !== undefined) {
            const absent = formData.totalStudents - formData.totalStudentsPresent;

            setFormData((prev) => ({
                ...prev,
                totalAbsent: absent
            }));
        }
    }, [formData.totalStudents, formData.totalStudentsPresent]);
    useEffect(() => {
        if (user) {
            fetchFilterSites(user.school);
        }
    }, [user]);
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
    const fetchFilterSites = async (schoolId: any) => {
        try {
            console.log('schoolId', schoolId);
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setFilterSites(data.sites || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };
    const fetchTotalStudentsForSite = async (siteId: any) => {
        try {
            const id = typeof siteId === 'object' ? siteId._id : siteId;
            const response = await fetch(`/api/students?site=${id}`);
            const data = await response.json();
            const totalStudents = Array.isArray(data) ? data.length : 0;

            setFormData((prev) => ({
                ...prev,
                totalStudents: totalStudents
            }));
        } catch (error) {
            console.error('Error fetching students count:', error);
        }
    };

    const fetchCollections = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();

            if (filters.site) queryParams.append('site', filters.site);
            queryParams.append('site', filters.site ? filters.site : user?.schoolSite);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.academicTerm) queryParams.append('academicTerm', filters.academicTerm.toString());
            if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom.toISOString());
            if (filters.dateTo) queryParams.append('dateTo', filters.dateTo.toISOString());

            const response = await fetch(`/api/daily-fee-collections?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch collections');

            const data = await response.json();
            setCollections(data.collections || []);
            calculateStatistics(data.collections || []);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load collections',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStatistics = (data: DailyFeeCollectionData[]) => {
        const today = new Date().setHours(0, 0, 0, 0);

        const todayCollections = data.filter((c) => new Date(c.collectionDate).setHours(0, 0, 0, 0) === today);

        const todayTotal = todayCollections.reduce((sum, c) => sum + (c.totalDailyCollection || 0), 0);

        const termTotal = data.reduce((sum, c) => sum + (c.totalDailyCollection || 0), 0);

        const avgAttendance = data.length > 0 ? data.reduce((sum, c) => sum + (c.attendancePercentage || 0), 0) / data.length : 0;

        setStatistics({
            todayTotal,
            termTotal,
            averageAttendance: avgAttendance,
            totalCollections: data.length
        });
    };

    const openNew = () => {
        setFormData({
            collectionDate: new Date(),
            academicYear: getAcademicYears[0].value,
            academicTerm: 1,
            currency: 'GHS',
            canteenFeeAmount: 0,
            busFeeAmount: 0,
            totalStudents: 0,
            totalStudentsPresent: 0,
            totalAbsent: 0,
            accumulatedCanteenFee: 0,
            accumulatedBusFee: 0
        });
        setEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (collection: DailyFeeCollectionData) => {
        setFormData({
            ...collection,
            school: collection.site?.school?._id || collection.site?.school,
            site: collection.site?._id,
            collectionDate: new Date(collection.collectionDate)
        });
        setEditMode(true);
        setDialogVisible(true);
    };

    const openView = (collection: DailyFeeCollectionData) => {
        setSelectedCollection(collection);
        setViewDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setEditMode(false);
    };

    const saveCollection = async () => {
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

            const url = editMode ? `/api/daily-fee-collections?id=${formData._id}` : '/api/daily-fee-collections';
            const method = editMode ? 'PUT' : 'POST';

            // Set accumulated fees from the collected amounts
            const dataToSave = {
                ...formData,
                accumulatedCanteenFee: formData.canteenFeeAmount || 0,
                accumulatedBusFee: formData.busFeeAmount || 0
            };

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save collection');
            }

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Collection ${editMode ? 'updated' : 'recorded'} successfully`,
                life: 3000
            });

            hideDialog();
            fetchCollections();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Failed to save collection',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteCollection = async (collection: DailyFeeCollectionData) => {
        confirmDialog({
            message: `Are you sure you want to delete the collection from ${new Date(collection.collectionDate).toLocaleDateString()}?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/daily-fee-collections?id=${collection._id}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) throw new Error('Failed to delete');

                    toast.current?.show({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Collection deleted successfully',
                        life: 3000
                    });

                    fetchCollections();
                } catch (error) {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to delete collection',
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

        if (!formData.collectionDate) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Please select collection date',
                life: 3000
            });
            return false;
        }

        if (formData.totalStudentsPresent! > formData.totalStudents!) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Validation Error',
                detail: 'Students present cannot exceed total students',
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
    const dateBodyTemplate = (rowData: DailyFeeCollectionData) => {
        return new Date(rowData.collectionDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const amountBodyTemplate = (rowData: DailyFeeCollectionData, field: 'canteenFeeAmount' | 'busFeeAmount' | 'accumulatedCanteenFee' | 'accumulatedBusFee') => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: rowData.currency || 'GHS'
        }).format(rowData[field] || 0);
    };

    const totalBodyTemplate = (rowData: DailyFeeCollectionData) => {
        const total = (rowData.canteenFeeAmount || 0) + (rowData.busFeeAmount || 0);
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: rowData.currency || 'GHS'
        }).format(total);
    };

    const attendanceBodyTemplate = (rowData: DailyFeeCollectionData) => {
        const percentage = rowData.totalStudents > 0 ? (rowData.totalStudentsPresent / rowData.totalStudents) * 100 : 0;
        const severity = percentage >= 90 ? 'success' : percentage >= 75 ? 'warning' : 'danger';

        return (
            <div className="flex flex-column gap-1">
                <div className="flex justify-content-between text-xs mb-1">
                    <span>
                        {rowData.totalStudentsPresent}/{rowData.totalStudents}
                    </span>
                    <span className="font-semibold">{percentage.toFixed(1)}%</span>
                </div>
                <ProgressBar value={percentage} showValue={false} style={{ height: '6px' }} color={severity === 'success' ? '#22c55e' : severity === 'warning' ? '#f59e0b' : '#ef4444'} />
            </div>
        );
    };

    const actionsBodyTemplate = (rowData: DailyFeeCollectionData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" className="p-button-rounded p-button-text p-button-info" onClick={() => openView(rowData)} tooltip="View Details" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-warning" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => deleteCollection(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Record Collection" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
                <Button label="Export CSV" icon="pi pi-upload" className="p-button-help" onClick={exportCSV} />
                <Button label="Print Report" icon="pi pi-print" className="p-button-info" onClick={handlePrint} disabled={collections.length === 0} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchCollections} loading={loading} />
            </div>
        );
    };

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="grid mb-3">
                {/* Statistics Cards */}
                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-500 text-sm block mb-2">{`Today's Collection`}</span>
                                <span className="text-2xl font-bold text-green-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.todayTotal)}
                                </span>
                            </div>
                            <div className="bg-green-100 text-green-600 border-round p-2">
                                <i className="pi pi-calendar-plus text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-500 text-sm block mb-2">Term Total</span>
                                <span className="text-2xl font-bold text-blue-600">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(statistics.termTotal)}
                                </span>
                            </div>
                            <div className="bg-blue-100 text-blue-600 border-round p-2">
                                <i className="pi pi-chart-line text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-500 text-sm block mb-2">Avg Attendance</span>
                                <span className="text-2xl font-bold text-orange-600">{statistics.averageAttendance.toFixed(1)}%</span>
                            </div>
                            <div className="bg-orange-100 text-orange-600 border-round p-2">
                                <i className="pi pi-users text-xl"></i>
                            </div>
                        </div>
                        <ProgressBar value={statistics.averageAttendance} showValue={false} style={{ height: '6px' }} />
                    </Card>
                </div>

                <div className="col-12 md:col-6 lg:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-500 text-sm block mb-2">Total Records</span>
                                <span className="text-2xl font-bold text-purple-600">{statistics.totalCollections}</span>
                            </div>
                            <div className="bg-purple-100 text-purple-600 border-round p-2">
                                <i className="pi pi-database text-xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Filters */}
            <Card className="mb-3">
                <div className="grid">
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Site</label>
                        <Dropdown value={filters.site} options={filterSites.map((s) => ({ label: s.description, value: s._id }))} onChange={(e) => setFilters({ ...filters, site: e.value })} placeholder="All Sites" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-3">
                        <label className="block text-sm font-medium mb-2">Academic Year</label>
                        <Dropdown value={filters.academicYear} options={getAcademicYears} onChange={(e) => setFilters({ ...filters, academicYear: e.value })} placeholder="All Years" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Term</label>
                        <Dropdown value={filters.academicTerm} options={academicTerms} onChange={(e) => setFilters({ ...filters, academicTerm: e.value })} placeholder="All Terms" className="w-full" showClear />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Date From</label>
                        <Calendar value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-sm font-medium mb-2">Date To</label>
                        <Calendar value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" showButtonBar />
                    </div>
                    <div className="col-12 flex align-items-end">
                        <Button label="Apply Filters" icon="pi pi-filter" onClick={fetchCollections} className="mr-2" />
                        <Button
                            label="Clear"
                            icon="pi pi-filter-slash"
                            className="p-button-outlined"
                            onClick={() => {
                                setFilters({
                                    school: '',
                                    site: '',
                                    academicYear: '',
                                    academicTerm: null,
                                    dateFrom: null,
                                    dateTo: null
                                });
                                fetchCollections();
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Data Table */}
            <Card title="Daily Fee Collections">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable ref={dt} value={collections} loading={loading} paginator rows={20} rowsPerPageOptions={[10, 20, 50]} dataKey="_id" emptyMessage="No collections found" stripedRows>
                    <Column field="collectionDate" header="Date" body={dateBodyTemplate} sortable style={{ minWidth: '120px' }} />
                    <Column field="site.description" header="Site" sortable style={{ minWidth: '150px' }} />
                    <Column field="academicYear" header="Year" sortable style={{ minWidth: '100px' }} />
                    <Column field="academicTerm" header="Term" body={(rowData) => `Term ${rowData.academicTerm}`} sortable style={{ minWidth: '80px' }} />
                    <Column header="Attendance" body={attendanceBodyTemplate} style={{ minWidth: '150px' }} />
                    <Column header="Canteen Fee" body={(rowData) => amountBodyTemplate(rowData, 'canteenFeeAmount')} sortable style={{ minWidth: '130px' }} />
                    <Column header="Bus Fee" body={(rowData) => amountBodyTemplate(rowData, 'busFeeAmount')} sortable style={{ minWidth: '130px' }} />
                    <Column header="Total Collected" body={totalBodyTemplate} sortable style={{ minWidth: '150px' }} />
                    <Column body={actionsBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                </DataTable>
            </Card>

            {/* Recording/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                onHide={hideDialog}
                header={editMode ? 'Edit Collection' : 'Record Daily Fee Collection'}
                modal
                style={{ width: '800px' }}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={loading} />
                        <Button label={editMode ? 'Update' : 'Save'} icon="pi pi-check" onClick={saveCollection} loading={loading} />
                    </div>
                }
            >
                <div className="grid">
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

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">
                            Collection Date <span className="text-red-500">*</span>
                        </label>
                        <Calendar value={formData.collectionDate} onChange={(e) => setFormData({ ...formData, collectionDate: e.value as Date })} showIcon dateFormat="dd/mm/yy" className="w-full" maxDate={new Date()} />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Academic Year</label>
                        <Dropdown value={formData.academicYear} options={getAcademicYears} onChange={(e) => setFormData({ ...formData, academicYear: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label className="block font-medium mb-2">Term</label>
                        <Dropdown value={formData.academicTerm} options={academicTerms} onChange={(e) => setFormData({ ...formData, academicTerm: e.value })} className="w-full" />
                    </div>

                    <Divider />

                    <div className="col-12">
                        <h4 className="mb-3">Fee Collection Amounts</h4>
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">Total Canteen Fee Collected</label>
                        <InputNumber value={formData.canteenFeeAmount} onValueChange={(e) => setFormData({ ...formData, canteenFeeAmount: e.value || 0 })} className="w-full" maxFractionDigits={2} />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">Total Bus Fee Collected</label>
                        <InputNumber value={formData.busFeeAmount} onValueChange={(e) => setFormData({ ...formData, busFeeAmount: e.value || 0 })} className="w-full" maxFractionDigits={2} />
                    </div>

                    <Divider />

                    <div className="col-12">
                        <h4 className="mb-3">Attendance</h4>
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">
                            Total Students <span className="text-red-500">*</span>
                        </label>
                        <InputNumber value={formData.totalStudents} onValueChange={(e) => setFormData({ ...formData, totalStudents: e.value || 0 })} className="w-full" min={0} />
                    </div>

                    <div className="col-12 md:col-6">
                        <label className="block font-medium mb-2">
                            Students Present <span className="text-red-500">*</span>
                        </label>
                        <InputNumber value={formData.totalStudentsPresent} onValueChange={(e) => setFormData({ ...formData, totalStudentsPresent: e.value || 0 })} className="w-full" min={0} max={formData.totalStudents} />
                    </div>

                    <div className="col-12">
                        <Card className="bg-blue-50">
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <div className="text-sm text-600 mb-1">Students Absent</div>
                                    <div className="text-2xl font-bold text-red-600">{formData.totalAbsent || 0}</div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="text-sm text-600 mb-1">Attendance Rate</div>
                                    <div className="text-2xl font-bold text-green-600">{formData.totalStudents ? ((formData.totalStudentsPresent! / formData.totalStudents) * 100).toFixed(1) : 0}%</div>
                                </div>
                                <div className="col-12 md:col-4">
                                    <div className="text-sm text-600 mb-1">Total Collection</div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format((formData.canteenFeeAmount || 0) + (formData.busFeeAmount || 0))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="col-12">
                        <label className="block font-medium mb-2">Notes</label>
                        <InputTextarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} className="w-full" placeholder="Optional notes..." />
                    </div>
                </div>
            </Dialog>

            {/* View Dialog */}
            <Dialog visible={viewDialogVisible} onHide={() => setViewDialogVisible(false)} header="Collection Details" modal style={{ width: '600px' }}>
                {selectedCollection && (
                    <div className="grid">
                        <div className="col-12">
                            <Card className="bg-primary-50 mb-3">
                                <div className="text-center">
                                    <div className="text-sm text-600 mb-2">{new Date(selectedCollection.collectionDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-3xl font-bold text-primary">
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: selectedCollection.currency
                                        }).format((selectedCollection.canteenFeeAmount || 0) + (selectedCollection.busFeeAmount || 0))}
                                    </div>
                                    <div className="text-sm text-600 mt-1">Total Collected</div>
                                </div>
                            </Card>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Site</div>
                            <div className="font-semibold mb-3">{selectedCollection.site?.description}</div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Academic Period</div>
                            <div className="font-semibold mb-3">
                                {selectedCollection.academicYear} - Term {selectedCollection.academicTerm}
                            </div>
                        </div>

                        <Divider />

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Canteen Fee Amount</div>
                            <div className="font-semibold mb-3">
                                {new Intl.NumberFormat('en-GH', {
                                    style: 'currency',
                                    currency: selectedCollection.currency
                                }).format(selectedCollection.canteenFeeAmount)}
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Bus Fee Amount</div>
                            <div className="font-semibold mb-3">
                                {new Intl.NumberFormat('en-GH', {
                                    style: 'currency',
                                    currency: selectedCollection.currency
                                }).format(selectedCollection.busFeeAmount)}
                            </div>
                        </div>

                        <Divider />

                        <div className="col-12 md:col-4">
                            <div className="text-sm text-600 mb-1">Total Students</div>
                            <div className="text-2xl font-bold text-blue-600 mb-3">{selectedCollection.totalStudents}</div>
                        </div>

                        <div className="col-12 md:col-4">
                            <div className="text-sm text-600 mb-1">Present</div>
                            <div className="text-2xl font-bold text-green-600 mb-3">{selectedCollection.totalStudentsPresent}</div>
                        </div>

                        <div className="col-12 md:col-4">
                            <div className="text-sm text-600 mb-1">Absent</div>
                            <div className="text-2xl font-bold text-red-600 mb-3">{selectedCollection.totalAbsent}</div>
                        </div>

                        <div className="col-12">
                            <div className="text-sm text-600 mb-2">Attendance Rate</div>
                            <ProgressBar className="h-1rem" value={selectedCollection.totalStudents > 0 ? (selectedCollection.totalStudentsPresent / selectedCollection.totalStudents) * 100 : 0} />
                        </div>

                        <Divider />

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Canteen Collection</div>
                            <div className="text-xl font-bold text-orange-600 mb-3">
                                {new Intl.NumberFormat('en-GH', {
                                    style: 'currency',
                                    currency: selectedCollection.currency
                                }).format(selectedCollection.canteenFeeAmount)}
                            </div>
                        </div>

                        <div className="col-12 md:col-6">
                            <div className="text-sm text-600 mb-1">Bus Collection</div>
                            <div className="text-xl font-bold text-purple-600 mb-3">
                                {new Intl.NumberFormat('en-GH', {
                                    style: 'currency',
                                    currency: selectedCollection.currency
                                }).format(selectedCollection.busFeeAmount)}
                            </div>
                        </div>

                        {selectedCollection.notes && (
                            <>
                                <Divider />
                                <div className="col-12">
                                    <div className="text-sm text-600 mb-1">Notes</div>
                                    <div className="text-sm p-3 bg-gray-50 border-round">{selectedCollection.notes}</div>
                                </div>
                            </>
                        )}

                        {selectedCollection.recordedBy && (
                            <div className="col-12">
                                <div className="text-xs text-500 mt-3 text-center">
                                    Recorded by {selectedCollection.recordedBy.firstName} {selectedCollection.recordedBy.lastName} on {new Date(selectedCollection.createdAt!).toLocaleString()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Dialog>

            {/* Hidden Print Component */}
            <div style={{ display: 'none' }}>
                <CollectionsPrintReport
                    ref={printRef}
                    collections={collections}
                    schoolName={schools.find((s) => s._id === (filters.school || user?.school))?.name || 'School Name'}
                    schoolAddress="School Address Line 1, City, Region"
                    schoolContact="Tel: +233 XXX XXX XXX | Email: info@school.edu.gh"
                    academicYear={filters.academicYear || 'All Years'}
                    academicTerm={filters.academicTerm}
                    dateFrom={filters.dateFrom}
                    dateTo={filters.dateTo}
                    siteName={filterSites.find((s) => s._id === filters.site)?.description}
                    generatedBy={user ? `${user.firstName} ${user.lastName}` : 'System Administrator'}
                />
            </div>
        </>
    );
};

export default DailyFeeCollectionManagement;
