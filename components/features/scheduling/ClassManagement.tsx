'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { MultiSelect } from 'primereact/multiselect';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '@/context/AuthContext';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Divider } from 'primereact/divider';
import { Chip } from 'primereact/chip';
import { Badge } from 'primereact/badge';
import { Panel } from 'primereact/panel';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { ProgressBar } from 'primereact/progressbar';

interface ClassData {
    _id?: string;
    site: string;
    department?: string;
    division: string;
    sequence: number;
    className?: string;
    prefect?: string;
    classLimit: number;
    formMaster?: {
        teacher?: string;
        dateFrom?: Date;
        dateTo?: Date;
    };
    subjects?: string[];
    students?: string[];
    isActive: boolean;
}

interface DropdownOption {
    label: string;
    value: string;
}

const ClassManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = React.useRef<Toast>(null);

    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dropdown options
    const [departments, setDepartments] = useState<DropdownOption[]>([]);
    const [teachers, setTeachers] = useState<DropdownOption[]>([]);
    const [students, setStudents] = useState<DropdownOption[]>([]);
    const [subjects, setSubjects] = useState<DropdownOption[]>([]);
    const [schoolSites, setSchoolSites] = useState<DropdownOption[]>([]);

    // Form state
    const [formData, setFormData] = useState<ClassData>(getEmptyClass());
    const [generatedClassName, setGeneratedClassName] = useState('');

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        className: { value: null, matchMode: FilterMatchMode.CONTAINS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyClass(): ClassData {
        return {
            site: user?.schoolSite || '',
            department: '',
            division: '',
            sequence: 1,
            className: '',
            prefect: '',
            classLimit: 0,
            formMaster: undefined,
            subjects: [],
            students: [],
            isActive: true
        };
    }

    // Auto-generate class name
    useEffect(() => {
        if (formData.sequence && formData.division) {
            const generated = `Form ${formData.sequence}${formData.division.toUpperCase()}`;
            setGeneratedClassName(generated);
            if (!formData.className) {
                setFormData((prev) => ({ ...prev, className: generated }));
            }
        } else {
            setGeneratedClassName('');
        }
    }, [formData.sequence, formData.division]);

    // Fetch subjects when department changes
    useEffect(() => {
        if (formData.department) {
            fetchSubjectsByDepartment(formData.department);
        } else {
            // Clear subjects if no department is selected
            setSubjects([]);
        }
    }, [formData.department]);

    useEffect(() => {
        fetchClasses();
        fetchDropdownData();
    }, [user]);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/classes?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes || []);
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectsByDepartment = async (departmentId: string) => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (departmentId) params.append('department', departmentId);

            const subjectResponse = await fetch(`/api/subjects?${params.toString()}`);
            if (subjectResponse.ok) {
                const subjectData = await subjectResponse.json();
                setSubjects(
                    subjectData.subjects?.map((s: any) => ({
                        label: s.name,
                        value: s._id
                    })) || []
                );
            } else {
                setSubjects([]);
            }
        } catch (error) {
            console.error('Failed to fetch subjects:', error);
            setSubjects([]);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            // Fetch departments
            const deptResponse = await fetch(`/api/departments?${params.toString()}`);
            if (deptResponse.ok) {
                const deptData = await deptResponse.json();
                setDepartments(
                    deptData.departments?.map((d: any) => ({
                        label: d.name,
                        value: d._id
                    })) || []
                );
            }

            // Fetch teachers
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

            // Fetch students
            const studentResponse = await fetch(`/api/students?${params.toString()}`);
            if (studentResponse.ok) {
                const studentData = await studentResponse.json();
                setStudents(
                    studentData.students?.map((s: any) => ({
                        label: `${s.firstName} ${s.lastName}`,
                        value: s._id
                    })) || []
                );
            }

            // Note: Subjects will be fetched when department is selected

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
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptyClass());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (classData: any) => {
        const editData = {
            ...classData,
            department: typeof classData.department === 'object' && classData.department?._id ? classData.department._id : classData.department,
            site: typeof classData.site === 'object' && classData.site?._id ? classData.site._id : classData.site
        };
        setFormData(editData);
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyClass());
    };

    const saveClass = async () => {
        if (!formData.site || !formData.division || !formData.sequence) {
            showToast('error', 'Validation Error', 'Site, division, and sequence are required');
            return;
        }

        if (formData.sequence < 1) {
            showToast('error', 'Validation Error', 'Sequence must be greater than 0');
            return;
        }

        try {
            const url = isEditMode ? `/api/classes/${formData._id}` : '/api/classes';
            const method = isEditMode ? 'PUT' : 'POST';
            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                showToast('success', 'Success', `Class ${data.class?.className || ''} ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchClasses();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save class');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while saving class');
        } finally {
            setLoading(false);
        }
    };

    const deleteClass = async (classId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this class? This action cannot be undone.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/classes/${classId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Class deleted successfully');
                        fetchClasses();
                    } else {
                        showToast('error', 'Error', 'Failed to delete class');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting class');
                } finally {
                    setLoading(false);
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
                <Button label="Create New Class" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search classes..." />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchClasses} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: ClassData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteClass(rowData._id!)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: ClassData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const capacityBodyTemplate = (rowData: any) => {
        const studentCount = rowData.students?.length || 0;
        const limit = rowData.classLimit || 0;

        if (limit === 0) {
            return (
                <div className="flex align-items-center gap-2">
                    <Badge value={studentCount} severity="info" />
                    <span className="text-sm text-500">Unlimited</span>
                </div>
            );
        }

        const percentage = (studentCount / limit) * 100;
        const severity = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'success';

        return (
            <div className="flex flex-column gap-1">
                <div className="flex align-items-center gap-2">
                    <Badge value={`${studentCount}/${limit}`} severity={severity} />
                    {percentage >= 100 && <Chip label="Full" className="text-xs" style={{ backgroundColor: '#ef4444', color: 'white' }} />}
                </div>
                <ProgressBar value={Math.min(percentage, 100)} style={{ height: '4px' }} showValue={false} />
            </div>
        );
    };

    const formMasterBodyTemplate = (rowData: any) => {
        if (rowData.formMaster?.teacher) {
            const teacher = rowData.formMaster.teacher;
            return `${teacher.firstName} ${teacher.lastName}`;
        }
        return <span className="text-500 italic">Not assigned</span>;
    };

    const departmentBodyTemplate = (rowData: any) => {
        return rowData.department?.name || <span className="text-500 italic">General</span>;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Class' : 'Create Class'} icon="pi pi-check" loading={loading} onClick={saveClass} disabled={!formData.site || !formData.division || !formData.sequence || formData.sequence < 1} />
        </div>
    );

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Class Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Organize and manage classes across your school</p>
                    </div>
                    <i className="pi pi-users text-4xl md:text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={classes}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['className', 'division']}
                    emptyMessage="No classes found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                    stripedRows
                >
                    <Column field="className" header="Class Name" sortable style={{ minWidth: '150px' }} />
                    <Column body={departmentBodyTemplate} header="Department" style={{ minWidth: '150px' }} />
                    <Column body={formMasterBodyTemplate} header="Form Master" style={{ minWidth: '150px' }} />
                    <Column body={capacityBodyTemplate} header="Capacity" sortable style={{ minWidth: '150px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} header="Actions" style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '900px' }}
                header={
                    <div className="flex align-items-center gap-3">
                        <div className="bg-primary border-circle p-3">
                            <i className="pi pi-graduation-cap text-white text-2xl"></i>
                        </div>
                        <div>
                            <h3 className="m-0 text-900">{isEditMode ? 'Edit Class' : 'Create New Class'}</h3>
                            <p className="m-0 mt-1 text-sm text-600">{isEditMode ? 'Update class information' : 'Set up a new class for your school site'}</p>
                        </div>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="grid">
                    {/* Preview Card */}
                    {generatedClassName && (
                        <div className="col-12 mb-2">
                            <Card className="bg-primary-50 border-primary border-1">
                                <div className="flex align-items-center justify-content-between">
                                    <div>
                                        <h4 className="text-primary-900 m-0 mb-1">Class Preview</h4>
                                        <p className="text-2xl font-bold text-primary-900 m-0">{generatedClassName}</p>
                                    </div>
                                    <i className="pi pi-eye text-4xl text-primary-400"></i>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Basic Class Information */}
                    <div className="col-12">
                        <div className="bg-blue-50 border-round p-3 mb-3">
                            <h4 className="text-blue-900 mt-0 mb-1 flex align-items-center gap-2">
                                <i className="pi pi-info-circle"></i>
                                Basic Class Information
                            </h4>
                            <p className="text-blue-700 text-sm m-0">Essential details to identify and organize this class</p>
                        </div>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="department" className="font-semibold text-900 mb-2 block">
                            Department <span className="text-500">(Optional)</span>
                        </label>
                        <Dropdown
                            id="department"
                            value={formData.department}
                            options={departments}
                            onChange={(e) => {
                                setFormData({ ...formData, department: e.value, subjects: [] });
                            }}
                            placeholder="General / All Departments"
                            filter
                            showClear
                            className="w-full"
                            emptyMessage="No departments available"
                        />
                        <small className="text-500 mt-1 block">Leave empty for general classes</small>
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="sequence" className="font-semibold text-900 mb-2 block">
                            Class Level / Form <span className="text-red-500">*</span>
                        </label>
                        <InputNumber id="sequence" value={formData.sequence} onValueChange={(e) => setFormData({ ...formData, sequence: e.value || 1 })} min={1} max={13} showButtons className="w-full" />
                        <small className="text-500 mt-1 block">E.g., 1 for Form 1, 2 for Form 2</small>
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="division" className="font-semibold text-900 mb-2 block">
                            Division <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="division"
                            value={formData.division}
                            onChange={(e) => setFormData({ ...formData, division: e.target.value.toUpperCase().slice(0, 1) })}
                            placeholder="A, B, C..."
                            maxLength={1}
                            className="w-full"
                            style={{ textTransform: 'uppercase' }}
                        />
                        <small className="text-500 mt-1 block">Single letter (A, B, C, etc.)</small>
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="className" className="font-semibold text-900 mb-2 block">
                            Class Name <span className="text-500">(Auto-generated)</span>
                        </label>
                        <InputText id="className" value={formData.className || generatedClassName} onChange={(e) => setFormData({ ...formData, className: e.target.value })} placeholder="e.g., Form 1A" className="w-full" />
                        <small className="text-500 mt-1 block">Generated automatically if empty</small>
                    </div>

                    {/* Capacity & Status */}
                    <div className="col-12 mt-3">
                        <Divider />
                        <div className="bg-teal-50 border-round p-3 mb-3">
                            <h4 className="text-teal-900 mt-0 mb-1 flex align-items-center gap-2">
                                <i className="pi pi-sliders-h"></i>
                                Capacity & Status Settings
                            </h4>
                            <p className="text-teal-700 text-sm m-0">Configure class size and availability</p>
                        </div>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="classLimit" className="font-semibold text-900 mb-2 block">
                            Class Capacity Limit
                        </label>
                        <InputNumber id="classLimit" value={formData.classLimit} onValueChange={(e) => setFormData({ ...formData, classLimit: e.value || 0 })} min={0} max={100} showButtons className="w-full" />
                        <small className="text-500 mt-1 block">{formData.classLimit === 0 ? <span className="text-green-600 font-semibold">✓ Unlimited seats available</span> : <span>Maximum of {formData.classLimit} students</span>}</small>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="isActive" className="font-semibold text-900 mb-2 block">
                            Class Status
                        </label>
                        <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                            <InputSwitch id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.value })} />
                            <div className="flex-1">
                                <div className="font-semibold text-900">{formData.isActive ? 'Class is Active' : 'Class is Inactive'}</div>
                                <small className="text-500">{formData.isActive ? 'Students can enroll' : 'Enrollment disabled'}</small>
                            </div>
                        </div>
                    </div>

                    {/* Class Leadership */}
                    <div className="col-12 mt-3">
                        <Accordion>
                            <AccordionTab
                                header={
                                    <div className="flex align-items-center gap-2">
                                        <i className="pi pi-users text-xl"></i>
                                        <span className="font-semibold">Class Leadership & Roles</span>
                                        <Badge value="Optional" severity="info" className="ml-2" />
                                    </div>
                                }
                            >
                                <div className="grid">
                                    <div className="col-12">
                                        <div className="surface-100 border-round p-3 mb-3">
                                            <i className="pi pi-info-circle text-blue-500 mr-2"></i>
                                            <span className="text-600 text-sm">You can assign leadership roles now or add them later</span>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="formMasterTeacher" className="font-semibold text-900 mb-2 block">
                                            Form Master (Teacher)
                                        </label>
                                        <Dropdown
                                            id="formMasterTeacher"
                                            value={formData.formMaster?.teacher || null}
                                            options={teachers}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    formMaster: e.value
                                                        ? {
                                                              teacher: e.value,
                                                              dateFrom: formData.formMaster?.dateFrom,
                                                              dateTo: formData.formMaster?.dateTo
                                                          }
                                                        : undefined
                                                })
                                            }
                                            placeholder="Select a teacher"
                                            filter
                                            showClear
                                            className="w-full"
                                            emptyMessage="No teachers available"
                                        />
                                    </div>

                                    {formData.formMaster?.teacher && (
                                        <>
                                            <div className="col-12 md:col-6">
                                                <label htmlFor="dateFrom" className="font-semibold text-900 mb-2 block">
                                                    Start Date
                                                </label>
                                                <Calendar
                                                    id="dateFrom"
                                                    value={formData.formMaster?.dateFrom || null}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            formMaster: {
                                                                teacher: formData.formMaster?.teacher,
                                                                dateFrom: e.value as Date | undefined,
                                                                dateTo: formData.formMaster?.dateTo
                                                            }
                                                        })
                                                    }
                                                    showIcon
                                                    dateFormat="dd/mm/yy"
                                                    className="w-full"
                                                />
                                            </div>
                                            <div className="col-12 md:col-6">
                                                <label htmlFor="dateTo" className="font-semibold text-900 mb-2 block">
                                                    End Date
                                                </label>
                                                <Calendar
                                                    id="dateTo"
                                                    value={formData.formMaster?.dateTo || null}
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            formMaster: {
                                                                teacher: formData.formMaster?.teacher,
                                                                dateFrom: formData.formMaster?.dateFrom,
                                                                dateTo: e.value as Date | undefined
                                                            }
                                                        })
                                                    }
                                                    showIcon
                                                    dateFormat="dd/mm/yy"
                                                    className="w-full"
                                                    minDate={formData.formMaster?.dateFrom || undefined}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="col-12 mt-2">
                                        <label htmlFor="prefect" className="font-semibold text-900 mb-2 block">
                                            Class Prefect
                                        </label>
                                        <Dropdown
                                            id="prefect"
                                            value={formData.prefect}
                                            options={students}
                                            onChange={(e) => setFormData({ ...formData, prefect: e.value })}
                                            placeholder="Select a student"
                                            filter
                                            showClear
                                            className="w-full"
                                            emptyMessage="No students available"
                                        />
                                    </div>
                                </div>
                            </AccordionTab>

                            <AccordionTab
                                header={
                                    <div className="flex align-items-center gap-2">
                                        <i className="pi pi-book text-xl"></i>
                                        <span className="font-semibold">Subject Assignment</span>
                                        <Badge value="Optional" severity="info" className="ml-2" />
                                    </div>
                                }
                            >
                                <div className="grid">
                                    <div className="col-12">
                                        <div className="surface-100 border-round p-3 mb-3">
                                            <i className="pi pi-info-circle text-blue-500 mr-2"></i>
                                            <span className="text-600 text-sm">Assign subjects to this class or add them later</span>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <label htmlFor="subjects" className="font-semibold text-900 mb-2 block">
                                            Class Subjects
                                        </label>
                                        <MultiSelect
                                            id="subjects"
                                            value={formData.subjects}
                                            options={subjects}
                                            onChange={(e) => setFormData({ ...formData, subjects: e.value })}
                                            placeholder={formData.department ? 'Select subjects for this class' : 'Select a department first'}
                                            filter
                                            display="chip"
                                            className="w-full"
                                            disabled={!formData.department}
                                            emptyMessage={formData.department ? 'No subjects available for this department' : 'Please select a department first'}
                                        />
                                        <small className="text-500 mt-1 block">
                                            {formData.subjects && formData.subjects.length > 0 ? <span className="text-green-600">✓ {formData.subjects.length} subject(s) selected</span> : <span>No subjects assigned yet</span>}
                                        </small>
                                    </div>
                                </div>
                            </AccordionTab>
                        </Accordion>
                    </div>

                    {/* Help Section */}
                    <div className="col-12 mt-3">
                        <div className="surface-100 border-round p-3">
                            <div className="flex align-items-start gap-2">
                                <i className="pi pi-lightbulb text-yellow-500 mt-1 text-xl"></i>
                                <div>
                                    <p className="m-0 text-sm text-600">
                                        <strong>Quick Tips:</strong>
                                    </p>
                                    <ul className="mt-2 mb-0 text-sm text-600 pl-3">
                                        <li>Class names are auto-generated but can be customized</li>
                                        <li>Set capacity to 0 for unlimited enrollment</li>
                                        <li>Leadership roles and subjects can be added anytime</li>
                                        <li>{`Inactive classes won't appear in enrollment options`}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default ClassManagement;
