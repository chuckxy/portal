'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
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
import { TabView, TabPanel } from 'primereact/tabview';

type SubjectCategory = 'core' | 'elective' | 'extracurricular';

interface CourseData {
    _id?: string;
    name: string;
    code?: string;
    category: SubjectCategory;
    isGraded: boolean;
    school: string;
    site?: string;
    department?: string;
    creditHours: number;
    description?: string;
    topics?: any[];
    resources?: any[];
    isActive: boolean;
}

interface DropdownOption {
    label: string;
    value: string;
}

const CourseManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = React.useRef<Toast>(null);

    const [courses, setCourses] = useState<CourseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dropdown options
    const [departments, setDepartments] = useState<DropdownOption[]>([]);
    const [schoolSites, setSchoolSites] = useState<DropdownOption[]>([]);

    // Form state
    const [formData, setFormData] = useState<CourseData>(getEmptyCourse());

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        code: { value: null, matchMode: FilterMatchMode.CONTAINS },
        category: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    // Category options
    const categoryOptions = [
        { label: 'Core', value: 'core' },
        { label: 'Elective', value: 'elective' },
        { label: 'Extracurricular', value: 'extracurricular' }
    ];

    function getEmptyCourse(): CourseData {
        return {
            name: '',
            code: '',
            category: 'core',
            isGraded: true,
            school: user?.school || '',
            site: user?.schoolSite || '',
            department: '',
            creditHours: 0,
            description: '',
            topics: [],
            resources: [],
            isActive: true
        };
    }

    useEffect(() => {
        fetchCourses();
        fetchDropdownData();
    }, [user]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/subjects?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setCourses(data.subjects || []);
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to load courses');
        } finally {
            setLoading(false);
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
                        label: `${d.name}${d.faculty?.name ? ' (' + d.faculty.name + ')' : ''}`,
                        value: d._id
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
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptyCourse());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (course: any) => {
        // Extract IDs from populated objects

        const editData = {
            ...course,
            department: typeof course.department === 'object' && course?.department?._id ? course?.department?._id : course.department,
            site: typeof course.site === 'object' && course?.site?._id ? course.site?._id : course.site
        };
        setFormData(editData);
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyCourse());
    };

    const saveCourse = async () => {
        if (!formData.name || !formData.school) {
            showToast('error', 'Validation Error', 'Name and school are required');
            return;
        }

        try {
            const url = isEditMode ? `/api/subjects/${formData._id}` : '/api/subjects';
            const method = isEditMode ? 'PUT' : 'POST';

            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Course ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchCourses();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save course');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while saving course');
        } finally {
            setLoading(false);
        }
    };

    const deleteCourse = async (courseId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this course? This action cannot be undone.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/subjects/${courseId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Course deleted successfully');
                        fetchCourses();
                    } else {
                        showToast('error', 'Error', 'Failed to delete course');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting course');
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
                <Button label="New Course" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search courses..." />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchCourses} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: CourseData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteCourse(rowData._id!)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: CourseData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const categoryBodyTemplate = (rowData: CourseData) => {
        const severityMap = {
            core: 'danger',
            elective: 'warning',
            extracurricular: 'info'
        };
        return <Tag value={rowData.category.charAt(0).toUpperCase() + rowData.category.slice(1)} severity={severityMap[rowData.category] as any} />;
    };

    const departmentBodyTemplate = (rowData: any) => {
        return rowData.department?.name || <span className="text-500 italic">Not assigned</span>;
    };

    const gradedBodyTemplate = (rowData: CourseData) => {
        return rowData.isGraded ? <i className="pi pi-check-circle text-green-500" style={{ fontSize: '1.2rem' }}></i> : <i className="pi pi-times-circle text-red-500" style={{ fontSize: '1.2rem' }}></i>;
    };

    const creditHoursBodyTemplate = (rowData: CourseData) => {
        return <Badge value={rowData.creditHours} severity={rowData.creditHours > 0 ? 'success' : 'info'} />;
    };

    const codeBodyTemplate = (rowData: CourseData) => {
        return rowData.code ? <Chip label={rowData.code} className="text-xs font-bold" /> : <span className="text-500 italic">-</span>;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Course' : 'Save Course'} icon="pi pi-check" onClick={saveCourse} loading={loading} disabled={loading} />
        </div>
    );

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Course Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage courses and subjects across departments</p>
                    </div>
                    <i className="pi pi-book text-4xl md:text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={courses}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['name', 'code', 'description', 'category']}
                    emptyMessage="No courses found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                    stripedRows
                >
                    <Column field="name" header="Course Name" sortable style={{ minWidth: '200px' }} />
                    <Column body={codeBodyTemplate} header="Code" sortable style={{ minWidth: '100px' }} />
                    <Column body={categoryBodyTemplate} header="Category" sortable style={{ minWidth: '120px' }} />
                    <Column body={departmentBodyTemplate} header="Department" style={{ minWidth: '150px' }} />
                    <Column body={creditHoursBodyTemplate} header="Credits" sortable style={{ minWidth: '100px' }} />
                    <Column body={gradedBodyTemplate} header="Graded" sortable style={{ minWidth: '100px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} header="Actions" style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '800px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Course' : 'Add New Course'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <TabView>
                    <TabPanel header="Basic Information" leftIcon="pi pi-info-circle mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-primary-50 border-round p-3 mb-3">
                                    <h4 className="text-primary-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-bookmark"></i>
                                        Course Details
                                    </h4>
                                    <p className="text-primary-700 text-sm m-0">Enter the essential information for this course</p>
                                </div>
                            </div>

                            <div className="col-12 md:col-8">
                                <label htmlFor="name" className="font-semibold text-900 mb-2 block">
                                    Course Name <span className="text-red-500">*</span>
                                </label>
                                <InputText id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Mathematics, Physics, English Literature" className="w-full" />
                                <small className="text-500 mt-1 block">The official name of the course</small>
                            </div>

                            <div className="col-12 md:col-4">
                                <label htmlFor="code" className="font-semibold text-900 mb-2 block">
                                    Course Code
                                </label>
                                <InputText id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g., MATH101" className="w-full" style={{ textTransform: 'uppercase' }} />
                                <small className="text-500 mt-1 block">Unique identifier</small>
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
                                    placeholder="Provide a brief description of the course content and objectives"
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12">
                                <Divider />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="category" className="font-semibold text-900 mb-2 block">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <Dropdown id="category" value={formData.category} options={categoryOptions} onChange={(e) => setFormData({ ...formData, category: e.value })} placeholder="Select Category" className="w-full" />
                                <small className="text-500 mt-1 block">Core, Elective, or Extracurricular</small>
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="creditHours" className="font-semibold text-900 mb-2 block">
                                    Credit Hours
                                </label>
                                <InputNumber id="creditHours" value={formData.creditHours} onValueChange={(e) => setFormData({ ...formData, creditHours: e.value || 0 })} min={0} max={10} showButtons className="w-full" />
                                <small className="text-500 mt-1 block">Number of credit hours</small>
                            </div>

                            <div className="col-12">
                                <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                                    <Checkbox inputId="isGraded" checked={formData.isGraded} onChange={(e) => setFormData({ ...formData, isGraded: e.checked || false })} />
                                    <label htmlFor="isGraded" className="cursor-pointer">
                                        <div className="font-semibold text-900">This course is graded</div>
                                        <small className="text-500">Uncheck if this is a pass/fail course</small>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel header="Assignment" leftIcon="pi pi-sitemap mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-blue-50 border-round p-3 mb-3">
                                    <h4 className="text-blue-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-building"></i>
                                        Organizational Assignment
                                    </h4>
                                    <p className="text-blue-700 text-sm m-0">Associate this course with a department and location</p>
                                </div>
                            </div>

                            <div className="col-12">
                                <label htmlFor="department" className="font-semibold text-900 mb-2 block">
                                    Department
                                </label>
                                <Dropdown
                                    id="department"
                                    value={formData.department}
                                    options={departments}
                                    onChange={(e) => setFormData({ ...formData, department: e.value })}
                                    placeholder="Select Department"
                                    filter
                                    showClear
                                    className="w-full"
                                    emptyMessage="No departments available"
                                />
                                <small className="text-500 mt-1 block">The department that offers this course</small>
                            </div>

                            <div className="col-12">
                                <label htmlFor="site" className="font-semibold text-900 mb-2 block">
                                    School Site
                                </label>
                                <Dropdown
                                    id="site"
                                    value={formData.site}
                                    options={schoolSites}
                                    onChange={(e) => setFormData({ ...formData, site: e.value })}
                                    placeholder="Select School Site"
                                    filter
                                    showClear
                                    className="w-full"
                                    emptyMessage="No sites available"
                                />
                                <small className="text-500 mt-1 block">Primary location where this course is offered</small>
                            </div>

                            <div className="col-12 mt-3">
                                <div className="surface-100 border-round p-3">
                                    <div className="flex align-items-start gap-2">
                                        <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                                        <div>
                                            <p className="m-0 text-sm text-600">
                                                <strong>Note:</strong> You can assign this course to a specific department or leave it unassigned for general school-wide courses.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel header="Additional Info" leftIcon="pi pi-cog mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-teal-50 border-round p-3 mb-3">
                                    <h4 className="text-teal-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-sliders-h"></i>
                                        Course Settings
                                    </h4>
                                    <p className="text-teal-700 text-sm m-0">Additional configuration options</p>
                                </div>
                            </div>

                            <div className="col-12">
                                <Card className="border-1 surface-border">
                                    <div className="flex align-items-center justify-content-between mb-3">
                                        <div>
                                            <h4 className="m-0 text-900">Topics & Resources</h4>
                                            <p className="text-500 text-sm mt-1">
                                                {formData.topics?.length || 0} topics • {formData.resources?.length || 0} resources
                                            </p>
                                        </div>
                                        <i className="pi pi-file-pdf text-4xl text-primary"></i>
                                    </div>
                                    <small className="text-600">Topics and resources can be managed after creating the course through the detailed course view.</small>
                                </Card>
                            </div>

                            <div className="col-12 mt-3">
                                <div className="surface-100 border-round p-3">
                                    <div className="flex align-items-start gap-2">
                                        <i className="pi pi-lightbulb text-yellow-500 mt-1"></i>
                                        <div>
                                            <p className="m-0 text-sm text-600">
                                                <strong>Tip:</strong> Organize your courses with meaningful codes and clear descriptions to help students and teachers quickly identify course content.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>
        </div>
    );
};

export default CourseManagement;
