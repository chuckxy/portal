'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Panel } from 'primereact/panel';
import { Divider } from 'primereact/divider';
import { TabView, TabPanel } from 'primereact/tabview';
import { useAuth } from '@/context/AuthContext';

type ScholarshipType = 'full' | 'partial' | 'merit' | 'need_based' | 'sports' | 'academic' | 'other';
type ScholarshipStatus = 'active' | 'expired' | 'suspended' | 'completed';

interface Grant {
    amount: number;
    currency: string;
    scholarshipBody: any;
    referenceNumber?: string;
    dateReceived: Date;
    academicYear?: string;
    academicTerm?: number;
    description?: string;
}

interface ScholarshipData {
    _id?: string;
    student: any;
    school?: any;
    site?: any;
    scholarshipType: ScholarshipType;
    scholarshipBodies: any[];
    grants: Grant[];
    usage?: any[];
    dateStart: Date;
    dateEnd?: Date;
    totalGranted: number;
    balance: number;
    status: ScholarshipStatus;
    conditions?: string;
    createdBy?: any;
}

const SCHOLARSHIP_TYPES = [
    { label: 'Full Scholarship', value: 'full' },
    { label: 'Partial Scholarship', value: 'partial' },
    { label: 'Merit-Based', value: 'merit' },
    { label: 'Need-Based', value: 'need_based' },
    { label: 'Sports Scholarship', value: 'sports' },
    { label: 'Academic Excellence', value: 'academic' },
    { label: 'Other', value: 'other' }
];

const SCHOLARSHIP_STATUS = [
    { label: 'Active', value: 'active' },
    { label: 'Expired', value: 'expired' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Completed', value: 'completed' }
];

const TERM_OPTIONS = [
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

const ScholarshipManagement: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // Data state
    const [scholarships, setScholarships] = useState<ScholarshipData[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [scholarshipBodies, setScholarshipBodies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const [formData, setFormData] = useState<ScholarshipData>({
        student: null,
        school: null,
        site: null,
        scholarshipType: 'partial',
        scholarshipBodies: [],
        grants: [],
        dateStart: new Date(),
        dateEnd: undefined,
        totalGranted: 0,
        balance: 0,
        status: 'active',
        conditions: ''
    });

    // Grant form state
    const [currentGrant, setCurrentGrant] = useState<Grant>({
        amount: 0,
        currency: 'GHS',
        scholarshipBody: null,
        referenceNumber: '',
        dateReceived: new Date(),
        academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        academicTerm: 1,
        description: ''
    });

    const [errors, setErrors] = useState<any>({});

    // Grant management dialog state
    const [grantDialogVisible, setGrantDialogVisible] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipData | null>(null);
    const [managingGrants, setManagingGrants] = useState<Grant[]>([]);
    const [editingGrantIndex, setEditingGrantIndex] = useState<number | null>(null);

    // View dialogs state
    const [viewGrantsDialogVisible, setViewGrantsDialogVisible] = useState(false);
    const [viewUsageDialogVisible, setViewUsageDialogVisible] = useState(false);
    const [viewingScholarship, setViewingScholarship] = useState<ScholarshipData | null>(null);

    useEffect(() => {
        fetchSchools();
        fetchScholarships();
        fetchScholarshipBodies();
    }, []);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school);
        }
    }, [formData.school]);

    useEffect(() => {
        if (formData.site) {
            fetchStudents(formData.site);
        }
    }, [formData.site]);

    const fetchSchools = async () => {
        try {
            let url = '/api/school';
            if (user?.school) {
                url += `?_id=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            const schoolsData = Array.isArray(data) ? data : [data];
            setSchools(schoolsData);

            if (user?.school && schoolsData.length > 0) {
                setFormData((prev) => ({ ...prev, school: user.school }));
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchSites = async (schoolId: string) => {
        try {
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setSites(Array.isArray(data.sites) ? data.sites : []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchStudents = async (siteId: string) => {
        try {
            const response = await fetch(`/api/students?site=${siteId}`);
            const data = await response.json();
            setStudents(Array.isArray(data) ? data.map((student) => ({ firstName: student.firstName, lastName: student.lastName, _id: student._id })) : []);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchScholarshipBodies = async () => {
        try {
            let url = '/api/scholarship-bodies';
            if (user?.school) {
                url += `?school=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setScholarshipBodies(Array.isArray(data.scholarshipBodies) ? data.scholarshipBodies : []);
        } catch (error) {
            console.error('Error fetching scholarship bodies:', error);
        }
    };

    const fetchScholarships = async () => {
        setLoading(true);
        try {
            let url = '/api/scholarships';
            if (user?.school) {
                url += `?school=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setScholarships(Array.isArray(data) ? data : data.scholarships || []);
        } catch (error) {
            console.error('Error fetching scholarships:', error);
            showToast('error', 'Error', 'Failed to load scholarships');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 4000 });
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.student) newErrors.student = 'Student is required';
        if (!formData.school) newErrors.school = 'School is required';
        if (!formData.site) newErrors.site = 'Site is required';
        if (!formData.scholarshipBodies || formData.scholarshipBodies.length === 0) newErrors.scholarshipBodies = 'At least one scholarship body is required';
        if (!formData.dateStart) newErrors.dateStart = 'Start date is required';
        if (formData.grants.length === 0) newErrors.grants = 'At least one grant is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateTotalGranted = (grants: Grant[]) => {
        return grants.reduce((sum, grant) => sum + grant.amount, 0);
    };

    const openNew = () => {
        setFormData({
            student: null,
            school: user?.school || null,
            site: null,
            scholarshipType: 'partial',
            scholarshipBodies: [],
            grants: [],
            dateStart: new Date(),
            dateEnd: undefined,
            totalGranted: 0,
            balance: 0,
            status: 'active',
            conditions: ''
        });
        setCurrentGrant({
            amount: 0,
            currency: 'GHS',
            scholarshipBody: null,
            referenceNumber: '',
            dateReceived: new Date(),
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            description: ''
        });
        setErrors({});
        setEditMode(false);
        setActiveTab(0);
        setDialogVisible(true);
    };

    const openEdit = (scholarship: ScholarshipData) => {
        setFormData({
            ...scholarship,
            student: scholarship.student?._id || scholarship.student,
            school: scholarship.school?._id || scholarship.school,
            site: scholarship.site?._id || scholarship.site,
            scholarshipBodies: Array.isArray(scholarship.scholarshipBodies) ? scholarship.scholarshipBodies.map((sb) => sb._id || sb) : [],
            dateStart: new Date(scholarship.dateStart),
            dateEnd: scholarship.dateEnd ? new Date(scholarship.dateEnd) : undefined
        });
        setErrors({});
        setEditMode(true);
        setActiveTab(0);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setErrors({});
    };

    const addGrant = () => {
        if (!currentGrant.amount || currentGrant.amount <= 0) {
            showToast('warn', 'Validation', 'Please enter a valid grant amount');
            return;
        }

        if (!currentGrant.scholarshipBody) {
            showToast('warn', 'Validation', 'Please select a scholarship body for this grant');
            return;
        }

        const updatedGrants = [...formData.grants, { ...currentGrant }];
        const total = calculateTotalGranted(updatedGrants);

        setFormData({
            ...formData,
            grants: updatedGrants,
            totalGranted: total,
            balance: total
        });

        // Reset grant form
        setCurrentGrant({
            amount: 0,
            currency: 'GHS',
            scholarshipBody: null,
            referenceNumber: '',
            dateReceived: new Date(),
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            description: ''
        });

        showToast('success', 'Added', 'Grant added successfully');
    };

    const removeGrant = (index: number) => {
        const updatedGrants = formData.grants.filter((_, i) => i !== index);
        const total = calculateTotalGranted(updatedGrants);

        setFormData({
            ...formData,
            grants: updatedGrants,
            totalGranted: total,
            balance: total
        });
    };

    const saveScholarship = async () => {
        if (!validateForm()) {
            showToast('warn', 'Validation Error', 'Please fill all required fields correctly');
            return;
        }

        // setSaving(true);
        try {
            const payload = {
                student: formData.student,
                school: formData.school || user?.school,
                site: formData.site,
                scholarshipType: formData.scholarshipType,
                scholarshipBodies: formData.scholarshipBodies.map((sb) => (typeof sb === 'string' ? sb : sb._id)),
                grants: formData.grants.map((grant) => ({ ...grant, scholarshipBody: typeof grant.scholarshipBody === 'string' ? grant.scholarshipBody : grant.scholarshipBody._id })),
                dateStart: formData.dateStart,
                dateEnd: formData.dateEnd,
                totalGranted: formData.totalGranted,
                balance: formData.balance,
                status: formData.status,
                conditions: formData.conditions,
                createdBy: user?._id
            };
            console.log(payload);
            const url = editMode ? `/api/scholarships/${formData._id}` : '/api/scholarships';
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('success', 'Success', `Scholarship ${editMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchScholarships();
            } else {
                showToast('error', 'Error', data.error || 'Failed to save scholarship');
            }
        } catch (error) {
            console.error('Error saving scholarship:', error);
            showToast('error', 'Error', 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (scholarship: ScholarshipData) => {
        confirmDialog({
            message: `Delete scholarship for "${scholarship.student?.firstName} ${scholarship.student?.lastName}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteScholarship(scholarship._id!)
        });
    };

    const deleteScholarship = async (id: string) => {
        try {
            const response = await fetch(`/api/scholarships/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('success', 'Deleted', 'Scholarship deleted successfully');
                fetchScholarships();
            } else {
                const data = await response.json();
                showToast('error', 'Error', data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting scholarship:', error);
            showToast('error', 'Error', 'An error occurred while deleting');
        }
    };

    // Grant Management Functions
    const openGrantManager = (scholarship: ScholarshipData) => {
        setSelectedScholarship(scholarship);
        setManagingGrants([...scholarship.grants]);
        setCurrentGrant({
            amount: 0,
            currency: 'GHS',
            scholarshipBody: null,
            referenceNumber: '',
            dateReceived: new Date(),
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            description: ''
        });
        setEditingGrantIndex(null);
        setGrantDialogVisible(true);
    };

    const addGrantToScholarship = () => {
        if (!currentGrant.amount || currentGrant.amount <= 0) {
            showToast('warn', 'Validation', 'Please enter a valid grant amount');
            return;
        }

        if (!currentGrant.scholarshipBody) {
            showToast('warn', 'Validation', 'Please select a scholarship body for this grant');
            return;
        }

        if (editingGrantIndex !== null) {
            // Update existing grant
            const updatedGrants = [...managingGrants];
            updatedGrants[editingGrantIndex] = { ...currentGrant };
            setManagingGrants(updatedGrants);
            showToast('success', 'Updated', 'Grant updated successfully');
        } else {
            // Add new grant
            setManagingGrants([...managingGrants, { ...currentGrant }]);
            showToast('success', 'Added', 'Grant added successfully');
        }

        // Reset form
        setCurrentGrant({
            amount: 0,
            currency: 'GHS',
            scholarshipBody: null,
            referenceNumber: '',
            dateReceived: new Date(),
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            description: ''
        });
        setEditingGrantIndex(null);
    };

    const editGrantInScholarship = (index: number) => {
        setCurrentGrant({ ...managingGrants[index], dateReceived: new Date(managingGrants[index].dateReceived) });
        setEditingGrantIndex(index);
    };

    const removeGrantFromScholarship = (index: number) => {
        const updatedGrants = managingGrants.filter((_, i) => i !== index);
        setManagingGrants(updatedGrants);
        if (editingGrantIndex === index) {
            setEditingGrantIndex(null);
            setCurrentGrant({
                amount: 0,
                currency: 'GHS',
                scholarshipBody: null,
                referenceNumber: '',
                dateReceived: new Date(),
                academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
                academicTerm: 1,
                description: ''
            });
        }
    };

    const cancelGrantEdit = () => {
        setEditingGrantIndex(null);
        setCurrentGrant({
            amount: 0,
            currency: 'GHS',
            scholarshipBody: null,
            referenceNumber: '',
            dateReceived: new Date(),
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            description: ''
        });
    };

    const saveGrantsToScholarship = async () => {
        if (!selectedScholarship) return;

        setSaving(true);
        try {
            const totalGranted = managingGrants.reduce((sum, grant) => sum + grant.amount, 0);
            const totalUsed = selectedScholarship.usage?.reduce((sum: number, use: any) => sum + (use.amount || 0), 0) || 0;
            const balance = totalGranted - totalUsed;
            const response = await fetch(`/api/scholarships/${selectedScholarship._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grants: managingGrants,
                    totalGranted,
                    balance
                })
            });

            const data = await response.json();

            if (response.ok) {
                showToast('success', 'Success', 'Grants updated successfully');
                setGrantDialogVisible(false);
                fetchScholarships();
            } else {
                showToast('error', 'Error', data.error || 'Failed to update grants');
            }
        } catch (error) {
            console.error('Error updating grants:', error);
            showToast('error', 'Error', 'An error occurred while updating grants');
        } finally {
            setSaving(false);
        }
    };

    const closeGrantDialog = () => {
        setGrantDialogVisible(false);
        setSelectedScholarship(null);
        setManagingGrants([]);
        setEditingGrantIndex(null);
    };

    const openViewGrants = (scholarship: ScholarshipData) => {
        setViewingScholarship(scholarship);
        setViewGrantsDialogVisible(true);
    };

    const openViewUsage = (scholarship: ScholarshipData) => {
        setViewingScholarship(scholarship);
        setViewUsageDialogVisible(true);
    };

    const closeViewDialogs = () => {
        setViewGrantsDialogVisible(false);
        setViewUsageDialogVisible(false);
        setViewingScholarship(null);
    };

    // Table templates
    const studentBodyTemplate = (rowData: ScholarshipData) => {
        return `${rowData.student?.firstName} ${rowData.student?.lastName}`;
    };

    const scholarshipBodyTemplate = (rowData: ScholarshipData) => {
        if (!rowData.scholarshipBodies || rowData.scholarshipBodies.length === 0) {
            return 'N/A';
        }

        const bodies = rowData.scholarshipBodies.map((sb) => (typeof sb === 'string' ? sb : sb.name)).join(', ');

        return bodies || 'N/A';
    };

    const typeBodyTemplate = (rowData: ScholarshipData) => {
        const typeLabels: any = {
            full: { label: 'Full', severity: 'success' },
            partial: { label: 'Partial', severity: 'info' },
            merit: { label: 'Merit', severity: 'primary' },
            need_based: { label: 'Need-Based', severity: 'warning' },
            sports: { label: 'Sports', severity: 'help' },
            academic: { label: 'Academic', severity: 'success' },
            other: { label: 'Other', severity: 'secondary' }
        };
        const type = typeLabels[rowData.scholarshipType] || typeLabels.other;
        return <Tag value={type.label} severity={type.severity} />;
    };

    const statusBodyTemplate = (rowData: ScholarshipData) => {
        const severityMap: any = {
            active: 'success',
            expired: 'danger',
            suspended: 'warning',
            completed: 'info'
        };
        return <Tag value={rowData.status} severity={severityMap[rowData.status]} />;
    };

    const amountBodyTemplate = (rowData: ScholarshipData) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(rowData.totalGranted);
    };

    const balanceBodyTemplate = (rowData: ScholarshipData) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(rowData.balance);
    };

    const actionBodyTemplate = (rowData: ScholarshipData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-list" className="p-button-rounded p-button-text p-button-primary" onClick={() => openViewGrants(rowData)} tooltip="View Grants" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-chart-bar" className="p-button-rounded p-button-text p-button-info" onClick={() => openViewUsage(rowData)} tooltip="View Usage History" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-money-bill" className="p-button-rounded p-button-text p-button-success" onClick={() => openGrantManager(rowData)} tooltip="Manage Grants" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Add Scholarship" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchScholarships} loading={loading} />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={saving} />
            <Button label={editMode ? 'Update' : 'Save'} icon="pi pi-check" onClick={saveScholarship} loading={saving} />
        </div>
    );
    const handleStudentChange = (studentId: any) => {
        console.log(studentId);
        setFormData((prev) => ({
            ...prev,
            student: studentId
        }));
    };

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card title="Scholarship Management" subTitle="Manage student scholarships and grants">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={scholarships}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    emptyMessage="No scholarships found"
                    className="datatable-responsive"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} scholarships"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                >
                    <Column header="Student" body={studentBodyTemplate} sortable style={{ minWidth: '180px' }} />
                    <Column header="Scholarship Body" body={scholarshipBodyTemplate} sortable style={{ minWidth: '180px' }} />
                    <Column header="Type" body={typeBodyTemplate} sortable style={{ minWidth: '120px' }} />
                    <Column header="Total Granted" body={amountBodyTemplate} sortable style={{ minWidth: '140px' }} />
                    <Column header="Balance" body={balanceBodyTemplate} sortable style={{ minWidth: '130px' }} />
                    <Column header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ width: '120px' }} />
                </DataTable>
            </Card>

            {/* Dialog Form */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-trophy text-primary text-2xl" />
                        <span>{editMode ? 'Edit Scholarship' : 'Add New Scholarship'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
                maximizable
            >
                <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                    {/* Basic Information Tab */}
                    <TabPanel header="Basic Information" leftIcon="pi pi-user">
                        <div className="formgrid grid">
                            <div className="field col-12 md:col-6">
                                <label htmlFor="school" className="font-semibold">
                                    School <span className="text-red-500">*</span>
                                </label>
                                <Dropdown
                                    id="school"
                                    value={formData.school}
                                    options={schools}
                                    onChange={(e) => setFormData({ ...formData, school: e.value, site: null, student: null })}
                                    optionLabel="name"
                                    optionValue="_id"
                                    placeholder="Select school"
                                    filter
                                    disabled={!!user?.school}
                                    className={errors.school ? 'p-invalid' : ''}
                                />
                                {errors.school && <small className="p-error">{errors.school}</small>}
                            </div>

                            <div className="field col-12 md:col-6">
                                <label htmlFor="site" className="font-semibold">
                                    School Site <span className="text-red-500">*</span>
                                </label>
                                <Dropdown
                                    id="site"
                                    value={formData.site}
                                    options={sites}
                                    onChange={(e) => setFormData({ ...formData, site: e.value, student: null })}
                                    optionLabel="siteName"
                                    optionValue="_id"
                                    placeholder="Select site"
                                    filter
                                    disabled={!formData.school}
                                    className={errors.site ? 'p-invalid' : ''}
                                />
                                {errors.site && <small className="p-error">{errors.site}</small>}
                            </div>

                            <div className="field col-12">
                                <label htmlFor="student" className="font-semibold">
                                    Student <span className="text-red-500">*</span>
                                </label>
                                <Dropdown
                                    id="student"
                                    value={formData.student}
                                    options={students}
                                    onChange={(e) => setFormData({ ...formData, student: e.value })}
                                    optionLabel="firstName"
                                    optionValue="_id"
                                    placeholder="Select student"
                                    className={errors.student ? 'p-invalid' : ''}
                                    filter
                                    showClear
                                    disabled={!formData.site || students.length === 0}
                                    valueTemplate={(option) => {
                                        if (option) {
                                            const student = students.find((s) => s._id === option);
                                            return student ? `${student.firstName} ${student.lastName}` : 'Select student';
                                        }
                                        return 'Select student';
                                    }}
                                    itemTemplate={(item) => (
                                        <div className="flex align-items-center">
                                            <div>
                                                <div>
                                                    {item.firstName} {item.lastName}
                                                </div>
                                                <small className="text-600">{item.studentInfo?.studentId}</small>
                                            </div>
                                        </div>
                                    )}
                                />

                                {errors.student && <small className="p-error">{errors.student}</small>}
                            </div>

                            <Divider className="col-12" />

                            <div className="field col-12 md:col-6">
                                <label htmlFor="scholarshipBodies" className="font-semibold">
                                    Scholarship Bodies <span className="text-red-500">*</span>
                                </label>
                                <MultiSelect
                                    id="scholarshipBodies"
                                    value={formData.scholarshipBodies}
                                    options={scholarshipBodies}
                                    onChange={(e) => setFormData({ ...formData, scholarshipBodies: e.value })}
                                    optionLabel="name"
                                    placeholder="Select scholarship bodies"
                                    filter
                                    className={errors.scholarshipBodies ? 'p-invalid' : ''}
                                />
                                {errors.scholarshipBodies && <small className="p-error">{errors.scholarshipBodies}</small>}
                            </div>

                            <div className="field col-12 md:col-6">
                                <label htmlFor="scholarshipType" className="font-semibold">
                                    Scholarship Type <span className="text-red-500">*</span>
                                </label>
                                <Dropdown id="scholarshipType" value={formData.scholarshipType} options={SCHOLARSHIP_TYPES} onChange={(e) => setFormData({ ...formData, scholarshipType: e.value })} placeholder="Select type" />
                            </div>

                            <div className="field col-12 md:col-4">
                                <label htmlFor="dateStart" className="font-semibold">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <Calendar id="dateStart" value={formData.dateStart} onChange={(e) => setFormData({ ...formData, dateStart: e.value as Date })} showIcon dateFormat="dd/mm/yy" className={errors.dateStart ? 'p-invalid' : ''} />
                                {errors.dateStart && <small className="p-error">{errors.dateStart}</small>}
                            </div>

                            <div className="field col-12 md:col-4">
                                <label htmlFor="dateEnd" className="font-semibold">
                                    End Date
                                </label>
                                <Calendar id="dateEnd" value={formData.dateEnd} onChange={(e) => setFormData({ ...formData, dateEnd: e.value as Date })} showIcon dateFormat="dd/mm/yy" />
                            </div>

                            <div className="field col-12 md:col-4">
                                <label htmlFor="status" className="font-semibold">
                                    Status
                                </label>
                                <Dropdown id="status" value={formData.status} options={SCHOLARSHIP_STATUS} onChange={(e) => setFormData({ ...formData, status: e.value })} placeholder="Select status" />
                            </div>

                            <div className="field col-12">
                                <label htmlFor="conditions" className="font-semibold">
                                    Terms & Conditions
                                </label>
                                <InputTextarea id="conditions" value={formData.conditions || ''} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })} rows={4} placeholder="Enter scholarship terms and conditions..." />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Grants Tab */}
                    <TabPanel header="Grants" leftIcon="pi pi-money-bill">
                        <Panel header="Add New Grant" className="mb-4">
                            <div className="formgrid grid">
                                <div className="field col-12 md:col-6">
                                    <label htmlFor="grantAmount" className="font-semibold">
                                        Amount <span className="text-red-500">*</span>
                                    </label>
                                    <InputNumber id="grantAmount" value={currentGrant.amount} onValueChange={(e) => setCurrentGrant({ ...currentGrant, amount: e.value || 0 })} mode="currency" currency="GHS" locale="en-GH" />
                                </div>

                                <div className="field col-12 md:col-6">
                                    <label htmlFor="grantScholarshipBody" className="font-semibold">
                                        Scholarship Body <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown
                                        id="grantScholarshipBody"
                                        value={currentGrant.scholarshipBody}
                                        options={formData.scholarshipBodies}
                                        onChange={(e) => setCurrentGrant({ ...currentGrant, scholarshipBody: e.value })}
                                        optionLabel="name"
                                        placeholder="Select scholarship body"
                                        filter
                                    />
                                </div>

                                <div className="field col-12 md:col-6">
                                    <label htmlFor="grantDate" className="font-semibold">
                                        Date Received
                                    </label>
                                    <Calendar id="grantDate" value={currentGrant.dateReceived} onChange={(e) => setCurrentGrant({ ...currentGrant, dateReceived: e.value as Date })} showIcon dateFormat="dd/mm/yy" />
                                </div>

                                <div className="field col-12 md:col-4">
                                    <label htmlFor="grantRef" className="font-semibold">
                                        Reference Number
                                    </label>
                                    <InputText id="grantRef" value={currentGrant.referenceNumber} onChange={(e) => setCurrentGrant({ ...currentGrant, referenceNumber: e.target.value })} placeholder="Enter reference" />
                                </div>

                                <div className="field col-12 md:col-4">
                                    <label htmlFor="grantYear" className="font-semibold">
                                        Academic Year
                                    </label>
                                    <InputText id="grantYear" value={currentGrant.academicYear} onChange={(e) => setCurrentGrant({ ...currentGrant, academicYear: e.target.value })} placeholder="e.g., 2024/2025" />
                                </div>

                                <div className="field col-12 md:col-4">
                                    <label htmlFor="grantTerm" className="font-semibold">
                                        Term
                                    </label>
                                    <Dropdown id="grantTerm" value={currentGrant.academicTerm} options={TERM_OPTIONS} onChange={(e) => setCurrentGrant({ ...currentGrant, academicTerm: e.value })} placeholder="Select term" />
                                </div>

                                <div className="field col-12">
                                    <label htmlFor="grantDesc" className="font-semibold">
                                        Description
                                    </label>
                                    <InputTextarea id="grantDesc" value={currentGrant.description} onChange={(e) => setCurrentGrant({ ...currentGrant, description: e.target.value })} rows={2} placeholder="Enter grant description..." />
                                </div>

                                <div className="field col-12">
                                    <Button label="Add Grant" icon="pi pi-plus" onClick={addGrant} className="p-button-success" />
                                </div>
                            </div>
                        </Panel>

                        {formData.grants.length > 0 && (
                            <>
                                <Divider />
                                <h5 className="mb-3">Grant History</h5>
                                <DataTable value={formData.grants} className="mb-3">
                                    <Column
                                        field="amount"
                                        header="Amount"
                                        body={(rowData) =>
                                            new Intl.NumberFormat('en-GH', {
                                                style: 'currency',
                                                currency: rowData.currency
                                            }).format(rowData.amount)
                                        }
                                    />
                                    <Column
                                        header="Scholarship Body"
                                        body={(rowData) => {
                                            const body = scholarshipBodies.find((sb) => sb._id === rowData.scholarshipBody || sb._id === rowData.scholarshipBody?._id);
                                            return body?.name || rowData.scholarshipBody?.name || 'N/A';
                                        }}
                                    />
                                    <Column field="referenceNumber" header="Reference" />
                                    <Column field="dateReceived" header="Date" body={(rowData) => new Date(rowData.dateReceived).toLocaleDateString()} />
                                    <Column field="academicYear" header="Academic Year/Term" body={(rowData) => (rowData.academicYear ? `${rowData.academicYear} - T${rowData.academicTerm}` : 'N/A')} />
                                    <Column body={(rowData, options) => <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => removeGrant(options.rowIndex)} />} style={{ width: '80px' }} />
                                </DataTable>

                                <div className="flex justify-content-end p-3 bg-blue-50 border-round">
                                    <div className="text-xl font-bold">
                                        Total Granted:{' '}
                                        <span className="text-primary">
                                            {new Intl.NumberFormat('en-GH', {
                                                style: 'currency',
                                                currency: 'GHS'
                                            }).format(formData.totalGranted)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                        {errors.grants && <small className="p-error block mt-2">{errors.grants}</small>}
                    </TabPanel>
                </TabView>
            </Dialog>

            {/* Grant Management Dialog */}
            <Dialog
                visible={grantDialogVisible}
                style={{ width: '800px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-money-bill text-success text-2xl" />
                        <span>
                            Manage Grants - {selectedScholarship?.student?.firstName} {selectedScholarship?.student?.lastName}
                        </span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={closeGrantDialog} disabled={saving} />
                        <Button label="Save Changes" icon="pi pi-check" onClick={saveGrantsToScholarship} loading={saving} />
                    </div>
                }
                onHide={closeGrantDialog}
            >
                <Panel header={editingGrantIndex !== null ? 'Edit Grant' : 'Add New Grant'} className="mb-4">
                    <div className="formgrid grid">
                        <div className="field col-12 md:col-6">
                            <label htmlFor="grantAmount2" className="font-semibold">
                                Amount <span className="text-red-500">*</span>
                            </label>
                            <InputNumber id="grantAmount2" value={currentGrant.amount} onValueChange={(e) => setCurrentGrant({ ...currentGrant, amount: e.value || 0 })} mode="currency" currency="GHS" locale="en-GH" />
                        </div>

                        <div className="field col-12 md:col-6">
                            <label htmlFor="grantScholarshipBody2" className="font-semibold">
                                Scholarship Body <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="grantScholarshipBody2"
                                value={currentGrant.scholarshipBody}
                                options={selectedScholarship?.scholarshipBodies || []}
                                onChange={(e) => setCurrentGrant({ ...currentGrant, scholarshipBody: e.value })}
                                optionValue="_id"
                                optionLabel="name"
                                placeholder="Select scholarship body"
                                filter
                            />
                        </div>

                        <div className="field col-12 md:col-6">
                            <label htmlFor="grantDate2" className="font-semibold">
                                Date Received
                            </label>
                            <Calendar id="grantDate2" value={currentGrant.dateReceived} onChange={(e) => setCurrentGrant({ ...currentGrant, dateReceived: e.value as Date })} showIcon dateFormat="dd/mm/yy" />
                        </div>

                        <div className="field col-12 md:col-4">
                            <label htmlFor="grantRef2" className="font-semibold">
                                Reference Number
                            </label>
                            <InputText id="grantRef2" value={currentGrant.referenceNumber} onChange={(e) => setCurrentGrant({ ...currentGrant, referenceNumber: e.target.value })} placeholder="Enter reference" />
                        </div>

                        <div className="field col-12 md:col-4">
                            <label htmlFor="grantYear2" className="font-semibold">
                                Academic Year
                            </label>
                            <InputText id="grantYear2" value={currentGrant.academicYear} onChange={(e) => setCurrentGrant({ ...currentGrant, academicYear: e.target.value })} placeholder="e.g., 2024/2025" />
                        </div>

                        <div className="field col-12 md:col-4">
                            <label htmlFor="grantTerm2" className="font-semibold">
                                Term
                            </label>
                            <Dropdown id="grantTerm2" value={currentGrant.academicTerm} options={TERM_OPTIONS} onChange={(e) => setCurrentGrant({ ...currentGrant, academicTerm: e.value })} placeholder="Select term" />
                        </div>

                        <div className="field col-12">
                            <label htmlFor="grantDesc2" className="font-semibold">
                                Description
                            </label>
                            <InputTextarea id="grantDesc2" value={currentGrant.description} onChange={(e) => setCurrentGrant({ ...currentGrant, description: e.target.value })} rows={2} placeholder="Enter grant description..." />
                        </div>

                        <div className="field col-12">
                            <div className="flex gap-2">
                                <Button
                                    label={editingGrantIndex !== null ? 'Update Grant' : 'Add Grant'}
                                    icon={editingGrantIndex !== null ? 'pi pi-check' : 'pi pi-plus'}
                                    onClick={addGrantToScholarship}
                                    className={editingGrantIndex !== null ? 'p-button-warning' : 'p-button-success'}
                                />
                                {editingGrantIndex !== null && <Button label="Cancel Edit" icon="pi pi-times" onClick={cancelGrantEdit} className="p-button-secondary" />}
                            </div>
                        </div>
                    </div>
                </Panel>

                {managingGrants.length > 0 && (
                    <>
                        <Divider />
                        <h5 className="mb-3">Grant History ({managingGrants.length} grants)</h5>
                        <DataTable value={managingGrants} className="mb-3">
                            <Column
                                field="amount"
                                header="Amount"
                                body={(rowData) =>
                                    new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: rowData.currency
                                    }).format(rowData.amount)
                                }
                            />
                            <Column
                                header="Scholarship Body"
                                body={(rowData) => {
                                    const body = scholarshipBodies.find((sb) => sb._id === rowData.scholarshipBody || sb._id === rowData.scholarshipBody?._id);
                                    return body?.name || rowData.scholarshipBody?.name || 'N/A';
                                }}
                            />
                            <Column field="referenceNumber" header="Reference" />
                            <Column field="dateReceived" header="Date" body={(rowData) => new Date(rowData.dateReceived).toLocaleDateString()} />
                            <Column field="academicYear" header="Academic Year/Term" body={(rowData) => (rowData.academicYear ? `${rowData.academicYear} - T${rowData.academicTerm}` : 'N/A')} />
                            <Column
                                body={(rowData, options) => (
                                    <div className="flex gap-1">
                                        <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-warning" onClick={() => editGrantInScholarship(options.rowIndex)} tooltip="Edit" />
                                        <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => removeGrantFromScholarship(options.rowIndex)} tooltip="Delete" />
                                    </div>
                                )}
                                style={{ width: '120px' }}
                            />
                        </DataTable>

                        <div className="flex justify-content-end p-3 bg-green-50 border-round">
                            <div className="text-xl font-bold">
                                Total Granted:{' '}
                                <span className="text-success">
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(managingGrants.reduce((sum, grant) => sum + grant.amount, 0))}
                                </span>
                            </div>
                        </div>
                    </>
                )}
                {managingGrants.length === 0 && (
                    <div className="text-center p-4 text-500">
                        <i className="pi pi-info-circle text-3xl mb-3"></i>
                        <p>No grants added yet. Add a grant using the form above.</p>
                    </div>
                )}
            </Dialog>

            {/* View Grants Dialog */}
            <Dialog visible={viewGrantsDialogVisible} onHide={closeViewDialogs} header="Grants History" modal style={{ width: '70vw' }}>
                {viewingScholarship && (
                    <>
                        <div className="mb-3 p-3 bg-blue-50 border-round">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <strong>Student:</strong> {viewingScholarship.student?.firstName} {viewingScholarship.student?.lastName}
                                </div>
                                <div className="col-12 md:col-6">
                                    <strong>Total Granted:</strong>{' '}
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(viewingScholarship.totalGranted)}
                                </div>
                            </div>
                        </div>

                        {viewingScholarship.grants && viewingScholarship.grants.length > 0 ? (
                            <DataTable value={viewingScholarship.grants} stripedRows>
                                <Column
                                    header="Amount"
                                    body={(rowData) =>
                                        new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: rowData.currency || 'GHS'
                                        }).format(rowData.amount)
                                    }
                                />
                                <Column header="Scholarship Body" body={(rowData) => rowData.scholarshipBody?.name || 'N/A'} />
                                <Column field="referenceNumber" header="Reference" />
                                <Column field="dateReceived" header="Date Received" body={(rowData) => new Date(rowData.dateReceived).toLocaleDateString()} />
                                <Column field="academicYear" header="Academic Year/Term" body={(rowData) => (rowData.academicYear ? `${rowData.academicYear} - T${rowData.academicTerm}` : 'N/A')} />
                                <Column field="description" header="Description" />
                            </DataTable>
                        ) : (
                            <div className="text-center p-4 text-500">
                                <i className="pi pi-info-circle text-3xl mb-3"></i>
                                <p>No grants recorded yet.</p>
                            </div>
                        )}
                    </>
                )}
            </Dialog>

            {/* View Usage History Dialog */}
            <Dialog visible={viewUsageDialogVisible} onHide={closeViewDialogs} header="Usage History" modal style={{ width: '70vw' }}>
                {viewingScholarship && (
                    <>
                        <div className="mb-3 p-3 bg-green-50 border-round">
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <strong>Student:</strong> {viewingScholarship.student?.firstName} {viewingScholarship.student?.lastName}
                                </div>
                                <div className="col-12 md:col-4">
                                    <strong>Total Granted:</strong>{' '}
                                    {new Intl.NumberFormat('en-GH', {
                                        style: 'currency',
                                        currency: 'GHS'
                                    }).format(viewingScholarship.totalGranted)}
                                </div>
                                <div className="col-12 md:col-4">
                                    <strong>Balance:</strong>{' '}
                                    <span className={viewingScholarship.balance > 0 ? 'text-success' : 'text-danger'}>
                                        {new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format(viewingScholarship.balance)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {viewingScholarship.usage && viewingScholarship.usage.length > 0 ? (
                            <DataTable value={viewingScholarship.usage} stripedRows>
                                <Column
                                    header="Amount"
                                    body={(rowData) =>
                                        new Intl.NumberFormat('en-GH', {
                                            style: 'currency',
                                            currency: 'GHS'
                                        }).format(rowData.amount)
                                    }
                                />
                                <Column field="reason" header="Reason" />
                                <Column field="referenceNumber" header="Reference" />
                                <Column field="dateUsed" header="Date Used" body={(rowData) => new Date(rowData.dateUsed).toLocaleDateString()} />
                                <Column
                                    header="Approved By"
                                    body={(rowData) => {
                                        if (rowData.approvedBy) {
                                            return `${rowData.approvedBy.firstName} ${rowData.approvedBy.lastName}`;
                                        }
                                        return 'N/A';
                                    }}
                                />
                                <Column field="notes" header="Notes" />
                            </DataTable>
                        ) : (
                            <div className="text-center p-4 text-500">
                                <i className="pi pi-info-circle text-3xl mb-3"></i>
                                <p>No usage recorded yet.</p>
                            </div>
                        )}
                    </>
                )}
            </Dialog>
        </>
    );
};

export default ScholarshipManagement;
