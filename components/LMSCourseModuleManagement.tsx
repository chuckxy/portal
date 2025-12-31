'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Chips } from 'primereact/chips';
import { TabView, TabPanel } from 'primereact/tabview';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import { useAuth } from '@/context/AuthContext';
import { Editor } from 'primereact/editor';

// Types
interface CourseModule {
    _id?: string;
    moduleName: string;
    moduleDescription: string;
    subjectId: string | { _id: string; name: string; code?: string };
    schoolSiteId: string;
    addedBy: string | { _id: string; firstName: string; lastName: string; photoLink?: string };
    moduleFee: number;
    currency: string;
    status: 'draft' | 'published' | 'archived';
    estimatedDuration?: number;
    sortOrder: number;
    prerequisites: string[];
    learningObjectives: string[];
    thumbnailPath?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface DropdownOption {
    label: string;
    value: string;
}

interface SubjectOption {
    label: string;
    value: string;
    code?: string;
}

const statusOptions: DropdownOption[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
];

const currencyOptions: DropdownOption[] = [
    { label: 'GHS - Ghana Cedis', value: 'GHS' },
    { label: 'USD - US Dollar', value: 'USD' },
    { label: 'EUR - Euro', value: 'EUR' },
    { label: 'GBP - British Pound', value: 'GBP' }
];

const LMSCourseModuleManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);

    // State
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedModules, setSelectedModules] = useState<CourseModule[]>([]);
    const [allModules, setAllModules] = useState<DropdownOption[]>([]);

    // Subject/Course state
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CourseModule>(getEmptyModule());

    // Filters
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        moduleName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        status: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyModule(): CourseModule {
        return {
            moduleName: '',
            moduleDescription: '',
            subjectId: selectedSubjectId || '',
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            moduleFee: 0,
            currency: 'GHS',
            status: 'draft',
            estimatedDuration: 0,
            sortOrder: 0,
            prerequisites: [],
            learningObjectives: [],
            thumbnailPath: '',
            isActive: true
        };
    }

    useEffect(() => {
        if (user?.schoolSite) {
            fetchSubjects();
        }
    }, [user]);

    // Fetch modules when subject changes
    useEffect(() => {
        if (selectedSubjectId) {
            fetchModules();
        } else {
            setModules([]);
        }
    }, [selectedSubjectId]);

    const fetchSubjects = async () => {
        try {
            setLoadingSubjects(true);
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);

            const response = await fetch(`/api/subjects?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                const subjectList = data.subjects || data || [];
                // Filter subjects that are LMS courses (have lmsCourse.isLmsCourse = true)
                // or show all subjects if none are explicitly marked as LMS courses
                const lmsSubjects = subjectList.filter((s: any) => s.lmsCourse?.isLmsCourse === true);
                const displaySubjects = lmsSubjects.length > 0 ? lmsSubjects : subjectList;

                setSubjects(
                    displaySubjects.map((s: any) => ({
                        label: s.code ? `${s.name} (${s.code})` : s.name,
                        value: s._id,
                        code: s.code
                    }))
                );
            } else {
                showToast('error', 'Error', 'Failed to load subjects');
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
            showToast('error', 'Error', 'Failed to load subjects');
        } finally {
            setLoadingSubjects(false);
        }
    };

    const fetchModules = async () => {
        if (!selectedSubjectId) {
            setModules([]);
            return;
        }
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            params.append('subjectId', selectedSubjectId);

            const response = await fetch(`/api/lms/course-modules?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setModules(data.modules || []);
                // Set options for prerequisites dropdown
                setAllModules(
                    (data.modules || []).map((m: CourseModule) => ({
                        label: m.moduleName,
                        value: m._id
                    }))
                );
            } else {
                showToast('error', 'Error', 'Failed to load course modules');
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
            showToast('error', 'Error', 'Failed to load course modules');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        if (!selectedSubjectId) {
            showToast('warn', 'Select Subject', 'Please select a subject/course first before adding modules');
            return;
        }
        setFormData(getEmptyModule());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (module: CourseModule) => {
        const editData = {
            ...module,
            addedBy: typeof module.addedBy === 'object' ? module.addedBy._id : module.addedBy,
            schoolSiteId: typeof module.schoolSiteId === 'object' ? (module.schoolSiteId as any)._id : module.schoolSiteId,
            subjectId: typeof module.subjectId === 'object' ? module.subjectId._id : module.subjectId
        };
        setFormData(editData);
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyModule());
    };

    const saveModule = async () => {
        if (!formData.moduleName || !formData.moduleDescription) {
            showToast('error', 'Validation Error', 'Module name and description are required');
            return;
        }

        if (!formData.subjectId) {
            showToast('error', 'Validation Error', 'Subject/Course is required');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/course-modules/${formData._id}` : '/api/lms/course-modules';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Module ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchModules();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save module');
            }
        } catch (error) {
            console.error('Error saving module:', error);
            showToast('error', 'Error', 'An error occurred while saving module');
        } finally {
            setLoading(false);
        }
    };

    const deleteModule = async (moduleId: string) => {
        confirmDialog({
            message: 'Are you sure you want to archive this module? It can be restored later.',
            header: 'Confirm Archive',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/lms/course-modules/${moduleId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Module archived successfully');
                        fetchModules();
                    } else {
                        showToast('error', 'Error', 'Failed to archive module');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const publishModule = async (module: CourseModule) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/lms/course-modules/${module._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' })
            });

            if (response.ok) {
                showToast('success', 'Success', 'Module published successfully');
                fetchModules();
            } else {
                showToast('error', 'Error', 'Failed to publish module');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters['global'] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // Templates
    const leftToolbarTemplate = () => (
        <div className="flex gap-2">
            <Button label="New Module" icon="pi pi-plus" severity="success" onClick={openNew} disabled={!selectedSubjectId} tooltip={!selectedSubjectId ? 'Select a subject first' : undefined} tooltipOptions={{ position: 'top' }} />
            {selectedModules.length > 0 && <Button label={`Bulk Archive (${selectedModules.length})`} icon="pi pi-trash" severity="danger" outlined />}
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search modules..." />
            </span>
            <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchModules} loading={loading} />
        </div>
    );

    const statusBodyTemplate = (rowData: CourseModule) => {
        const statusConfig: Record<string, { severity: 'success' | 'warning' | 'danger'; icon: string }> = {
            published: { severity: 'success', icon: 'pi pi-check-circle' },
            draft: { severity: 'warning', icon: 'pi pi-pencil' },
            archived: { severity: 'danger', icon: 'pi pi-archive' }
        };
        const config = statusConfig[rowData.status];

        return <Tag value={rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const feeBodyTemplate = (rowData: CourseModule) => {
        if (rowData.moduleFee === 0) {
            return <Tag value="Free" severity="success" />;
        }
        return (
            <span className="font-semibold">
                {rowData.currency} {rowData.moduleFee.toLocaleString()}
            </span>
        );
    };

    const durationBodyTemplate = (rowData: CourseModule) => {
        if (!rowData.estimatedDuration) return <span className="text-500">-</span>;
        const hours = Math.floor(rowData.estimatedDuration / 60);
        const minutes = rowData.estimatedDuration % 60;
        return (
            <span>
                {hours > 0 && `${hours}h `}
                {minutes > 0 && `${minutes}m`}
            </span>
        );
    };

    const authorBodyTemplate = (rowData: CourseModule) => {
        const author = rowData.addedBy;
        if (typeof author === 'object') {
            return (
                <div className="flex align-items-center gap-2">
                    <i className="pi pi-user text-primary"></i>
                    <span>
                        {author.firstName} {author.lastName}
                    </span>
                </div>
            );
        }
        return <span className="text-500">-</span>;
    };

    const objectivesBodyTemplate = (rowData: CourseModule) => {
        const count = rowData.learningObjectives?.length || 0;
        return <Badge value={count.toString()} severity={count > 0 ? 'info' : 'warning'} />;
    };

    const actionBodyTemplate = (rowData: CourseModule) => (
        <div className="flex gap-1">
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            {rowData.status === 'draft' && <Button icon="pi pi-check" rounded outlined severity="success" onClick={() => publishModule(rowData)} tooltip="Publish" tooltipOptions={{ position: 'top' }} />}
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteModule(rowData._id!)} tooltip="Archive" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Module' : 'Create Module'} icon="pi pi-check" onClick={saveModule} loading={loading} />
        </div>
    );

    // Stats
    const statsData = {
        total: modules.length,
        published: modules.filter((m) => m.status === 'published').length,
        draft: modules.filter((m) => m.status === 'draft').length,
        archived: modules.filter((m) => m.status === 'archived').length
    };

    // Get selected subject name for display
    const selectedSubjectName = subjects.find((s) => s.value === selectedSubjectId)?.label || '';

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Subject/Course Selector */}
            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center gap-3">
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-book text-primary text-2xl"></i>
                        <div>
                            <h3 className="m-0 text-900">Select Subject/Course</h3>
                            <p className="m-0 text-600 text-sm">Choose a subject to manage its modules</p>
                        </div>
                    </div>
                    <div className="flex-grow-1 w-full md:w-auto">
                        <Dropdown
                            value={selectedSubjectId}
                            options={subjects}
                            onChange={(e) => setSelectedSubjectId(e.value)}
                            placeholder={loadingSubjects ? 'Loading subjects...' : 'Select a Subject/Course...'}
                            className="w-full md:w-25rem"
                            filter
                            showClear
                            disabled={loadingSubjects}
                            emptyMessage="No LMS courses found"
                            emptyFilterMessage="No matching subjects"
                        />
                    </div>
                    {selectedSubjectId && <Tag value={`Viewing: ${selectedSubjectName}`} severity="info" icon="pi pi-eye" />}
                </div>
            </Card>

            {/* Stats Cards */}
            <div className="grid mb-4">
                <div className="col-12 md:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-center">
                            <div>
                                <span className="block text-500 font-medium mb-2">Total Modules</span>
                                <div className="text-900 font-bold text-3xl">{statsData.total}</div>
                            </div>
                            <div className="bg-blue-100 border-circle p-3">
                                <i className="pi pi-book text-blue-500 text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-center">
                            <div>
                                <span className="block text-500 font-medium mb-2">Published</span>
                                <div className="text-green-600 font-bold text-3xl">{statsData.published}</div>
                            </div>
                            <div className="bg-green-100 border-circle p-3">
                                <i className="pi pi-check-circle text-green-500 text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-center">
                            <div>
                                <span className="block text-500 font-medium mb-2">Draft</span>
                                <div className="text-orange-600 font-bold text-3xl">{statsData.draft}</div>
                            </div>
                            <div className="bg-orange-100 border-circle p-3">
                                <i className="pi pi-pencil text-orange-500 text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card className="h-full">
                        <div className="flex justify-content-between align-items-center">
                            <div>
                                <span className="block text-500 font-medium mb-2">Archived</span>
                                <div className="text-red-600 font-bold text-3xl">{statsData.archived}</div>
                            </div>
                            <div className="bg-red-100 border-circle p-3">
                                <i className="pi pi-archive text-red-500 text-2xl"></i>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Main Table */}
            <Card>
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Course Modules</h2>
                        <p className="text-600 m-0 text-sm md:text-base">{selectedSubjectId ? `Managing modules for: ${selectedSubjectName}` : 'Select a subject/course to manage its modules'}</p>
                    </div>
                    <i className="pi pi-th-large text-4xl md:text-6xl text-primary"></i>
                </div>

                {!selectedSubjectId ? (
                    <div className="flex flex-column align-items-center justify-content-center py-6">
                        <i className="pi pi-inbox text-6xl text-300 mb-4"></i>
                        <h3 className="text-600 m-0 mb-2">No Subject Selected</h3>
                        <p className="text-500 m-0 text-center">Please select a subject/course from the dropdown above to view and manage its modules.</p>
                    </div>
                ) : (
                    <>
                        <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                        <DataTable
                            value={modules}
                            loading={loading}
                            paginator
                            rows={10}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            dataKey="_id"
                            filters={filters}
                            globalFilterFields={['moduleName', 'moduleDescription', 'status']}
                            emptyMessage="No modules found for this subject. Create your first module!"
                            selection={selectedModules}
                            onSelectionChange={(e) => setSelectedModules(e.value)}
                            selectionMode="checkbox"
                            className="datatable-responsive"
                            responsiveLayout="scroll"
                            stripedRows
                        >
                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                            <Column field="moduleName" header="Module Name" sortable style={{ minWidth: '200px' }} />
                            <Column body={statusBodyTemplate} header="Status" sortable field="status" style={{ minWidth: '120px' }} />
                            <Column body={feeBodyTemplate} header="Fee" sortable field="moduleFee" style={{ minWidth: '100px' }} />
                            <Column body={durationBodyTemplate} header="Duration" style={{ minWidth: '100px' }} />
                            <Column body={objectivesBodyTemplate} header="Objectives" style={{ minWidth: '100px' }} />
                            <Column body={authorBodyTemplate} header="Created By" style={{ minWidth: '150px' }} />
                            <Column field="sortOrder" header="Order" sortable style={{ minWidth: '80px' }} />
                            <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '150px' }} />
                        </DataTable>
                    </>
                )}
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Module' : 'Create New Module'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <TabView>
                    {/* Basic Info Tab */}
                    <TabPanel header="Basic Information" leftIcon="pi pi-info-circle mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-primary-50 border-round p-3 mb-3">
                                    <h4 className="text-primary-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-book"></i>
                                        Module Details
                                    </h4>
                                    <p className="text-primary-700 text-sm m-0">Enter the basic information for this learning module</p>
                                </div>
                            </div>

                            <div className="col-12">
                                <label htmlFor="moduleName" className="font-semibold text-900 mb-2 block">
                                    Module Name <span className="text-red-500">*</span>
                                </label>
                                <InputText id="moduleName" value={formData.moduleName} onChange={(e) => setFormData({ ...formData, moduleName: e.target.value })} placeholder="e.g., Introduction to Programming" className="w-full" />
                            </div>

                            <div className="col-12">
                                <label htmlFor="moduleDescription" className="font-semibold text-900 mb-2 block">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <Editor id="moduleDescription" value={formData.moduleDescription} onTextChange={(e) => setFormData((prev) => ({ ...prev, moduleDescription: e.htmlValue || '' }))} style={{ height: '200px' }} />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="status" className="font-semibold text-900 mb-2 block">
                                    Status
                                </label>
                                <Dropdown id="status" value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} placeholder="Select Status" className="w-full" />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="sortOrder" className="font-semibold text-900 mb-2 block">
                                    Sort Order
                                </label>
                                <InputNumber id="sortOrder" value={formData.sortOrder} onValueChange={(e) => setFormData({ ...formData, sortOrder: e.value || 0 })} min={0} showButtons className="w-full" />
                                <small className="text-500">Lower numbers appear first</small>
                            </div>
                        </div>
                    </TabPanel>

                    {/* Pricing & Duration Tab */}
                    <TabPanel header="Pricing & Duration" leftIcon="pi pi-dollar mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-green-50 border-round p-3 mb-3">
                                    <h4 className="text-green-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-wallet"></i>
                                        Pricing Settings
                                    </h4>
                                    <p className="text-green-700 text-sm m-0">Set the pricing and duration for this module</p>
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="currency" className="font-semibold text-900 mb-2 block">
                                    Currency
                                </label>
                                <Dropdown id="currency" value={formData.currency} options={currencyOptions} onChange={(e) => setFormData({ ...formData, currency: e.value })} className="w-full" />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="moduleFee" className="font-semibold text-900 mb-2 block">
                                    Module Fee
                                </label>
                                <InputNumber
                                    id="moduleFee"
                                    value={formData.moduleFee}
                                    onValueChange={(e) => setFormData({ ...formData, moduleFee: e.value || 0 })}
                                    min={0}
                                    mode="currency"
                                    currency={formData.currency}
                                    locale="en-GH"
                                    className="w-full"
                                />
                                <small className="text-500">Set to 0 for free modules</small>
                            </div>

                            <div className="col-12">
                                <Divider />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="estimatedDuration" className="font-semibold text-900 mb-2 block">
                                    Estimated Duration (minutes)
                                </label>
                                <InputNumber id="estimatedDuration" value={formData.estimatedDuration} onValueChange={(e) => setFormData({ ...formData, estimatedDuration: e.value || 0 })} min={0} suffix=" min" showButtons className="w-full" />
                            </div>

                            <div className="col-12 md:col-6">
                                <label className="font-semibold text-900 mb-2 block">Duration Preview</label>
                                <div className="surface-100 border-round p-3">
                                    {formData.estimatedDuration ? (
                                        <span className="text-lg font-semibold">
                                            {Math.floor(formData.estimatedDuration / 60)}h {formData.estimatedDuration % 60}m
                                        </span>
                                    ) : (
                                        <span className="text-500">Not set</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    {/* Learning Objectives Tab */}
                    <TabPanel header="Learning Objectives" leftIcon="pi pi-check-square mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-purple-50 border-round p-3 mb-3">
                                    <h4 className="text-purple-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-list"></i>
                                        Learning Objectives
                                    </h4>
                                    <p className="text-purple-700 text-sm m-0">Define what learners will achieve after completing this module</p>
                                </div>
                            </div>

                            <div className="col-12">
                                <label htmlFor="learningObjectives" className="font-semibold text-900 mb-2 block">
                                    Objectives (press Enter to add)
                                </label>
                                <Chips id="learningObjectives" value={formData.learningObjectives} onChange={(e) => setFormData({ ...formData, learningObjectives: e.value || [] })} placeholder="Add learning objective..." className="w-full" />
                                <small className="text-500 mt-1 block">Example: &quot;Understand the basics of programming&quot;, &quot;Write simple Python scripts&quot;</small>
                            </div>

                            {formData.learningObjectives.length > 0 && (
                                <div className="col-12 mt-3">
                                    <h5 className="mb-2">Preview:</h5>
                                    <ul className="m-0 pl-4">
                                        {formData.learningObjectives.map((obj, index) => (
                                            <li key={index} className="mb-1">
                                                {obj}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Prerequisites Tab */}
                    <TabPanel header="Prerequisites" leftIcon="pi pi-link mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-orange-50 border-round p-3 mb-3">
                                    <h4 className="text-orange-900 mt-0 mb-1 flex align-items-center gap-2">
                                        <i className="pi pi-sitemap"></i>
                                        Module Prerequisites
                                    </h4>
                                    <p className="text-orange-700 text-sm m-0">Select modules that must be completed before this one</p>
                                </div>
                            </div>

                            <div className="col-12">
                                <label htmlFor="prerequisites" className="font-semibold text-900 mb-2 block">
                                    Required Modules
                                </label>
                                <Dropdown
                                    id="prerequisites"
                                    value={formData.prerequisites}
                                    options={allModules.filter((m) => m.value !== formData._id)}
                                    onChange={(e) => setFormData({ ...formData, prerequisites: e.value || [] })}
                                    placeholder="Select prerequisite modules..."
                                    className="w-full"
                                    filter
                                    showClear
                                    multiple
                                    emptyMessage="No other modules available"
                                />
                                <small className="text-500 mt-1 block">Learners must complete these modules first</small>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>
        </div>
    );
};

export default LMSCourseModuleManagement;
