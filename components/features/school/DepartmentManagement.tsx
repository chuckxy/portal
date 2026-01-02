'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '@/context/AuthContext';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Divider } from 'primereact/divider';
import { Chip } from 'primereact/chip';

interface DepartmentData {
    _id?: string;
    name: string;
    description?: string;
    faculty: string;
    school: string;
    site: string;
    head?: {
        person?: string;
        dateFrom?: Date;
        dateTo?: Date;
    };
    subjects?: string[];
    isActive: boolean;
}

interface DropdownOption {
    label: string;
    value: string;
}

const DepartmentManagement: React.FC = () => {
    const { user } = useAuth();

    const toastRef = React.useRef<Toast>(null);

    const [departments, setDepartments] = useState<DepartmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dropdown options
    const [faculties, setFaculties] = useState<DropdownOption[]>([]);
    const [teachers, setTeachers] = useState<DropdownOption[]>([]);
    const [schoolSites, setSchoolSites] = useState<DropdownOption[]>([]);

    // Form state
    const [formData, setFormData] = useState<DepartmentData>(getEmptyDepartment());

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        'faculty.name': { value: null, matchMode: FilterMatchMode.CONTAINS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyDepartment(): DepartmentData {
        return {
            name: '',
            description: '',
            faculty: '',
            school: user?.school || '',
            site: user?.schoolSite || '',
            head: undefined,
            subjects: [],
            isActive: true
        };
    }

    useEffect(() => {
        fetchDepartments();
        fetchDropdownData();
    }, [user]);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/departments?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setDepartments(data.departments || []);
            }
        } catch (error) {
            console.error('Failed to load departments:', error);
            showToast('error', 'Error', 'Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('schoolSite', user.schoolSite);

            // Fetch faculties
            const facultyResponse = await fetch(`/api/faculties?${params.toString()}`);
            if (facultyResponse.ok) {
                const facultyData = await facultyResponse.json();
                setFaculties(
                    facultyData.faculties?.map((f: any) => ({
                        label: f.name,
                        value: f._id
                    })) || []
                );
            }

            // Fetch teachers
            setLoading(true);
            const teacherResponse = await fetch(`/api/teachers?${params.toString()}`);
            if (teacherResponse.ok) {
                const teacherData = await teacherResponse.json();
                setTeachers(
                    teacherData.teachers?.map((t: any) => ({
                        label: `${t.firstName} ${t.lastName}`,
                        value: t._id
                    })) || []
                );
            }

            // Fetch school sites
            const siteParams = new URLSearchParams();
            if (user?.school) siteParams.append('school', user.school);

            const siteResponse = await fetch(`/api/sites?${siteParams.toString()}`);
            if (siteResponse.ok) {
                const siteData = await siteResponse.json();
                setSchoolSites(
                    siteData.sites?.map((s: any) => ({
                        label: s.siteName,
                        value: s._id
                    })) || []
                );
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptyDepartment());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (department: DepartmentData) => {
        setFormData({ ...department });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyDepartment());
    };

    const saveDepartment = async () => {
        if (!formData.name || !formData.faculty || !formData.school || !formData.site) {
            showToast('error', 'Validation Error', 'Name, faculty, school, and site are required');
            return;
        }

        try {
            const url = isEditMode ? `/api/departments/${formData._id}` : '/api/departments';
            const method = isEditMode ? 'PUT' : 'POST';

            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Department ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchDepartments();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save department');
            }
        } catch (error) {
            console.log('Error saving department:', error);
            showToast('error', 'Error', 'An error occurred while saving department');
        } finally {
            setLoading(false);
        }
    };

    const deleteDepartment = async (departmentId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this department? This action cannot be undone.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/departments/${departmentId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Department deleted successfully');
                        fetchDepartments();
                    } else {
                        showToast('error', 'Error', 'Failed to delete department');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting department');
                }
            }
        });
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="New Department" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search departments..." />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchDepartments} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: DepartmentData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteDepartment(rowData._id!)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: DepartmentData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const facultyBodyTemplate = (rowData: any) => {
        return rowData.faculty?.name || '-';
    };

    const headBodyTemplate = (rowData: any) => {
        if (rowData.head?.person) {
            const person = rowData.head.person;
            return (
                <div className="flex flex-column gap-1">
                    <span>{`${person.firstName} ${person.lastName}`}</span>
                    {rowData.head.dateFrom && <span className="text-xs text-500">Since: {new Date(rowData.head.dateFrom).toLocaleDateString()}</span>}
                </div>
            );
        }
        return <span className="text-500 italic">Not assigned</span>;
    };

    const subjectCountBodyTemplate = (rowData: any) => {
        const count = rowData.subjects?.length || 0;
        return <Chip label={`${count} Subject${count !== 1 ? 's' : ''}`} className="text-sm" />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Department' : 'Save Department'} icon="pi pi-check" onClick={saveDepartment} loading={loading} disabled={loading} />
        </div>
    );

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Department Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage departments across faculties</p>
                    </div>
                    <i className="pi pi-briefcase text-4xl md:text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={departments}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['name', 'description', 'faculty.name']}
                    emptyMessage="No departments found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                >
                    <Column field="name" header="Department Name" sortable style={{ minWidth: '200px' }} />
                    <Column body={facultyBodyTemplate} header="Faculty" sortable style={{ minWidth: '180px' }} />
                    <Column body={headBodyTemplate} header="Department Head" style={{ minWidth: '180px' }} />
                    <Column body={subjectCountBodyTemplate} header="Subjects" sortable style={{ minWidth: '120px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} header="Actions" style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '700px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Department' : 'Add New Department'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="grid">
                    {/* Basic Information Section */}
                    <div className="col-12">
                        <div className="bg-primary-50 border-round p-3 mb-3">
                            <h4 className="text-primary-900 mt-0 mb-1 flex align-items-center gap-2">
                                <i className="pi pi-info-circle"></i>
                                Basic Information
                            </h4>
                            <p className="text-primary-700 text-sm m-0">Enter the core details of the department</p>
                        </div>
                    </div>

                    <div className="col-12">
                        <label htmlFor="name" className="font-semibold text-900 mb-2 block">
                            Department Name <span className="text-red-500">*</span>
                        </label>
                        <InputText id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Computer Science, Mathematics, Physics" className="w-full" />
                        <small className="text-500 mt-1 block">This name will be displayed throughout the system</small>
                    </div>

                    <div className="col-12">
                        <label htmlFor="description" className="font-semibold text-900 mb-2 block">
                            Description
                        </label>
                        <InputTextarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Provide a brief description of the department's focus and objectives"
                            className="w-full"
                        />
                    </div>

                    {/* Organizational Assignment Section */}
                    <div className="col-12 mt-3">
                        <div className="bg-blue-50 border-round p-3 mb-3">
                            <h4 className="text-blue-900 mt-0 mb-1 flex align-items-center gap-2">
                                <i className="pi pi-sitemap"></i>
                                Organizational Assignment
                            </h4>
                            <p className="text-blue-700 text-sm m-0">Associate this department with a faculty and location</p>
                        </div>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="faculty" className="font-semibold text-900 mb-2 block">
                            Faculty <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="faculty"
                            value={formData.faculty}
                            options={faculties}
                            onChange={(e) => setFormData({ ...formData, faculty: e.value })}
                            placeholder="Select Faculty"
                            filter
                            className="w-full"
                            emptyMessage="No faculties available"
                        />
                        <small className="text-500 mt-1 block">The parent faculty this department belongs to</small>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="site" className="font-semibold text-900 mb-2 block">
                            School Site <span className="text-red-500">*</span>
                        </label>
                        <Dropdown id="site" value={formData.site} options={schoolSites} onChange={(e) => setFormData({ ...formData, site: e.value })} placeholder="Select School Site" filter className="w-full" emptyMessage="No sites available" />
                        <small className="text-500 mt-1 block">Primary location of the department</small>
                    </div>

                    {/* Department Head Section */}
                    <div className="col-12 mt-3">
                        <Divider />
                        <div className="bg-teal-50 border-round p-3 mb-3">
                            <h4 className="text-teal-900 mt-0 mb-1 flex align-items-center gap-2">
                                <i className="pi pi-user"></i>
                                Department Head (Optional)
                            </h4>
                            <p className="text-teal-700 text-sm m-0">Assign a head of department and their tenure period</p>
                        </div>
                    </div>

                    <div className="col-12">
                        <label htmlFor="headPerson" className="font-semibold text-900 mb-2 block">
                            Select Department Head
                        </label>
                        <Dropdown
                            id="headPerson"
                            value={formData.head?.person || null}
                            options={teachers}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    head: e.value
                                        ? {
                                              person: e.value,
                                              dateFrom: formData.head?.dateFrom,
                                              dateTo: formData.head?.dateTo
                                          }
                                        : undefined
                                })
                            }
                            placeholder="Select a teacher to lead this department"
                            filter
                            showClear
                            className="w-full"
                            emptyMessage="No teachers available"
                        />
                        <small className="text-500 mt-1 block">Choose from available teachers</small>
                    </div>

                    {formData.head?.person && (
                        <>
                            <div className="col-12">
                                <div className="surface-100 border-round p-3 mb-2">
                                    <i className="pi pi-calendar text-500 mr-2"></i>
                                    <span className="text-600 text-sm">Specify the tenure period for the department head</span>
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="dateFrom" className="font-semibold text-900 mb-2 block">
                                    Start Date
                                </label>
                                <Calendar
                                    id="dateFrom"
                                    value={formData.head?.dateFrom || null}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            head: {
                                                person: formData.head?.person,
                                                dateFrom: e.value as Date | undefined,
                                                dateTo: formData.head?.dateTo
                                            }
                                        })
                                    }
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="w-full"
                                    placeholder="Select start date"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="dateTo" className="font-semibold text-900 mb-2 block">
                                    End Date
                                </label>
                                <Calendar
                                    id="dateTo"
                                    value={formData.head?.dateTo || null}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            head: {
                                                person: formData.head?.person,
                                                dateFrom: formData.head?.dateFrom,
                                                dateTo: e.value as Date | undefined
                                            }
                                        })
                                    }
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="w-full"
                                    placeholder="Leave empty for ongoing"
                                    minDate={formData.head?.dateFrom || undefined}
                                />
                                <small className="text-500 mt-1 block">Leave empty if the position is ongoing</small>
                            </div>
                        </>
                    )}

                    {/* Help Text */}
                    <div className="col-12 mt-3">
                        <div className="surface-100 border-round p-3">
                            <div className="flex align-items-start gap-2">
                                <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                                <div>
                                    <p className="m-0 text-sm text-600">
                                        <strong>Note:</strong> All fields marked with <span className="text-red-500">*</span> are required. You can update department information at any time after creation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default DepartmentManagement;
