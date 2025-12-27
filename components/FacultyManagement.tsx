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

interface FacultyData {
    _id?: string;
    name: string;
    description?: string;
    institutionLevel?: string;
    school?: string;
    site?: string;
    head?: {
        person?: string;
        dateFrom?: Date;
        dateTo?: Date;
    };
    departments?: string[];
    isActive: boolean;
}

interface DropdownOption {
    label: string;
    value: string;
}

const FacultyManagement: React.FC = () => {
    const { user } = useAuth();

    const toastRef = React.useRef<Toast>(null);

    const [faculties, setFaculties] = useState<FacultyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dropdown options
    const [teachers, setTeachers] = useState<DropdownOption[]>([]);
    const [schoolSites, setSchoolSites] = useState<DropdownOption[]>([]);

    // Form state
    const [formData, setFormData] = useState<FacultyData>(getEmptyFaculty());

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyFaculty(): FacultyData {
        return {
            name: '',
            description: '',
            institutionLevel: '',
            school: user?.school || '',
            site: user?.schoolSite || '',
            head: undefined,
            departments: [],
            isActive: true
        };
    }

    useEffect(() => {
        fetchFaculties();
        fetchDropdownData();
    }, [user]);

    const fetchFaculties = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/faculties?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setFaculties(data.faculties || []);
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to load faculties');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            // Build query params with user's school and site
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('schoolSite', user.schoolSite);
            console.log(user);
            // Fetch teachers (employees with teacher role)
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

            // Fetch school sites (only need school param for sites)
            const siteParams = new URLSearchParams();
            if (user?.school) siteParams.append('school', user.school);

            const siteResponse = await fetch(`/api/sites?${siteParams.toString()}`);

            if (siteResponse.ok) {
                const siteData = await siteResponse.json();
                console.log(siteData);
                setSchoolSites(
                    siteData.sites?.map((s: any) => ({
                        label: s.siteName,
                        value: s._id
                    })) || []
                );
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptyFaculty());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (faculty: FacultyData) => {
        setFormData({ ...faculty });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyFaculty());
    };

    const saveFaculty = async () => {
        if (!formData.name || !formData.school || !formData.site) {
            showToast('error', 'Validation Error', 'Name, school, and site are required');
            return;
        }

        try {
            const url = isEditMode ? `/api/faculties/${formData._id}` : '/api/faculties';
            const method = isEditMode ? 'PUT' : 'POST';

            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Faculty ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchFaculties();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save faculty');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while saving faculty');
        } finally {
            setLoading(false);
        }
    };

    const deleteFaculty = async (facultyId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this faculty?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const response = await fetch(`/api/faculties/${facultyId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Faculty deleted successfully');
                        fetchFaculties();
                    } else {
                        showToast('error', 'Error', 'Failed to delete faculty');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting faculty');
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
                <Button label="New Faculty" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search faculties..." />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchFaculties} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: FacultyData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteFaculty(rowData._id!)} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: FacultyData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const headBodyTemplate = (rowData: any) => {
        return rowData.head?.person ? `${rowData.head.person.firstName} ${rowData.head.person.lastName}` : '-';
    };

    const departmentCountBodyTemplate = (rowData: any) => {
        return rowData.departments?.length || 0;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Faculty' : 'Create Faculty'} icon="pi pi-check" onClick={saveFaculty} loading={loading} disabled={loading} />
        </div>
    );

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Faculty Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage faculties and their departments</p>
                    </div>
                    <i className="pi pi-building text-4xl md:text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={faculties}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['name', 'description', 'institutionLevel']}
                    emptyMessage="No faculties found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                >
                    <Column field="name" header="Faculty Name" sortable style={{ minWidth: '200px' }} />
                    <Column field="institutionLevel" header="Level" sortable style={{ minWidth: '120px' }} />
                    <Column body={headBodyTemplate} header="Head" style={{ minWidth: '150px' }} />
                    <Column body={departmentCountBodyTemplate} header="Departments" sortable style={{ minWidth: '120px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog visible={dialogVisible} style={{ width: '95vw', maxWidth: '600px' }} header={isEditMode ? 'Edit Faculty' : 'New Faculty'} modal className="p-fluid" footer={dialogFooter} onHide={hideDialog}>
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="name" className="font-semibold text-900">
                            Faculty Name *
                        </label>
                        <InputText id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Science Faculty, Arts Faculty" className="mt-2" />
                    </div>

                    <div className="col-12">
                        <label htmlFor="description" className="font-semibold text-900">
                            Description
                        </label>
                        <InputTextarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Brief description of the faculty" className="mt-2" />
                    </div>

                    <div className="col-12">
                        <label htmlFor="institutionLevel" className="font-semibold text-900">
                            Institution Level
                        </label>
                        <InputText id="institutionLevel" value={formData.institutionLevel} onChange={(e) => setFormData({ ...formData, institutionLevel: e.target.value })} placeholder="e.g., Undergraduate, Postgraduate, Secondary" className="mt-2" />
                    </div>

                    {schoolSites.length > 0 && (
                        <div className="col-12">
                            <label htmlFor="site" className="font-semibold text-900">
                                School Site *
                            </label>
                            <Dropdown id="site" value={formData.site} options={schoolSites} onChange={(e) => setFormData({ ...formData, site: e.value })} placeholder="Select School Site" filter className="mt-2" />
                        </div>
                    )}

                    <Divider />

                    <div className="col-12">
                        <h4 className="text-lg font-bold text-900 mb-3">Faculty Head</h4>
                    </div>

                    <div className="col-12">
                        <label htmlFor="headPerson" className="font-semibold text-900">
                            Select Head of Faculty
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
                            placeholder="Select a teacher"
                            filter
                            showClear
                            className="mt-2"
                        />
                    </div>

                    {formData.head?.person && (
                        <>
                            <div className="col-12 md:col-6">
                                <label htmlFor="dateFrom" className="font-semibold text-900">
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
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="dateTo" className="font-semibold text-900">
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
                                    className="mt-2"
                                />
                            </div>
                        </>
                    )}
                </div>
            </Dialog>
        </div>
    );
};

export default FacultyManagement;
