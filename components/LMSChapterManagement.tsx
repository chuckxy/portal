'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Checkbox } from 'primereact/checkbox';
import { Badge } from 'primereact/badge';
import { useAuth } from '@/context/AuthContext';
import { Editor } from 'primereact/editor';

// Types
interface Chapter {
    _id?: string;
    chapterName: string;
    chapterDescription: string;
    moduleId: string | { _id: string; moduleName: string };
    subjectId?: string;
    schoolSiteId: string;
    addedBy: string | { _id: string; firstName: string; lastName: string };
    sortOrder: number;
    estimatedDuration?: number;
    status: 'draft' | 'published' | 'archived';
    isFree: boolean;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface CourseModule {
    _id: string;
    moduleName: string;
    moduleDescription?: string;
    subjectId?: string | { _id: string; name: string };
}

interface DropdownOption {
    label: string;
    value: string;
}

const statusOptions: DropdownOption[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
];

interface LMSChapterManagementProps {
    moduleId?: string;
    embedded?: boolean;
}

const LMSChapterManagement: React.FC<LMSChapterManagementProps> = ({ moduleId: propModuleId, embedded = false }) => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);

    // State
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState<string>(propModuleId || '');

    // Form state
    const [formData, setFormData] = useState<Chapter>(getEmptyChapter());

    // Filters
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        chapterName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        status: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyChapter(): Chapter {
        const selectedModule = modules.find((m) => m._id === (selectedModuleId || propModuleId));
        const subId = selectedModule?.subjectId;
        return {
            chapterName: '',
            chapterDescription: '',
            moduleId: selectedModuleId || propModuleId || '',
            subjectId: typeof subId === 'object' ? subId._id : subId,
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            sortOrder: 0,
            estimatedDuration: 0,
            status: 'draft',
            isFree: false,
            isActive: true
        };
    }

    useEffect(() => {
        if (user?.schoolSite) {
            fetchModules();
        }
    }, [user]);

    useEffect(() => {
        if (selectedModuleId) {
            fetchChapters();
        }
    }, [selectedModuleId]);

    useEffect(() => {
        if (propModuleId) {
            setSelectedModuleId(propModuleId);
        }
    }, [propModuleId]);

    const fetchModules = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);

            const response = await fetch(`/api/lms/course-modules?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setModules(data.modules || []);

                // If no module selected and we have modules, select the first one
                if (!selectedModuleId && data.modules?.length > 0 && !propModuleId) {
                    setSelectedModuleId(data.modules[0]._id);
                }
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            if (!selectedModuleId && !propModuleId) {
                setLoading(false);
            }
        }
    };

    const fetchChapters = async () => {
        if (!selectedModuleId) return;

        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('moduleId', selectedModuleId);

            const response = await fetch(`/api/lms/chapters?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setChapters(data.chapters || []);
            } else {
                showToast('error', 'Error', 'Failed to load chapters');
            }
        } catch (error) {
            console.error('Error fetching chapters:', error);
            showToast('error', 'Error', 'Failed to load chapters');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        const selectedModule = modules.find((m) => m._id === selectedModuleId);
        const subId = selectedModule?.subjectId;
        const extractedSubjectId = typeof subId === 'object' ? subId._id : subId;

        const newChapter = getEmptyChapter();
        setFormData({
            ...newChapter,
            moduleId: selectedModuleId,
            subjectId: extractedSubjectId,
            sortOrder: chapters.length
        });
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (chapter: Chapter) => {
        const editData = {
            ...chapter,
            moduleId: typeof chapter.moduleId === 'object' ? chapter.moduleId._id : chapter.moduleId,
            subjectId: chapter.subjectId || (modules.find((m) => m._id === (typeof chapter.moduleId === 'object' ? chapter.moduleId._id : chapter.moduleId))?.subjectId as any)?._id,
            addedBy: typeof chapter.addedBy === 'object' ? chapter.addedBy._id : chapter.addedBy
        };
        setFormData(editData);
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyChapter());
    };

    const saveChapter = async () => {
        if (!formData.chapterName || !formData.chapterDescription) {
            showToast('error', 'Validation Error', 'Chapter name and description are required');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/chapters/${formData._id}` : '/api/lms/chapters';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    moduleId: selectedModuleId
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Chapter ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchChapters();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save chapter');
            }
        } catch (error) {
            console.error('Error saving chapter:', error);
            showToast('error', 'Error', 'An error occurred while saving chapter');
        } finally {
            setLoading(false);
        }
    };

    const deleteChapter = async (chapterId: string) => {
        confirmDialog({
            message: 'Are you sure you want to archive this chapter?',
            header: 'Confirm Archive',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/lms/chapters/${chapterId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Chapter archived successfully');
                        fetchChapters();
                    } else {
                        showToast('error', 'Error', 'Failed to archive chapter');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const publishChapter = async (chapter: Chapter) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/lms/chapters/${chapter._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' })
            });

            if (response.ok) {
                showToast('success', 'Success', 'Chapter published');
                fetchChapters();
            } else {
                showToast('error', 'Error', 'Failed to publish chapter');
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
    const moduleDropdownOptions = modules.map((m) => ({
        label: m.moduleName,
        value: m._id
    }));

    const leftToolbarTemplate = () => (
        <div className="flex gap-2 flex-wrap">
            {!embedded && <Dropdown value={selectedModuleId} options={moduleDropdownOptions} onChange={(e) => setSelectedModuleId(e.value)} placeholder="Select Module" className="w-auto min-w-15rem" filter showClear />}
            <Button label="New Chapter" icon="pi pi-plus" severity="success" onClick={openNew} disabled={!selectedModuleId} />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search chapters..." />
            </span>
            <Button icon="pi pi-refresh" severity="info" onClick={fetchChapters} loading={loading} tooltip="Refresh" />
        </div>
    );

    const statusBodyTemplate = (rowData: Chapter) => {
        const statusConfig: Record<string, { severity: 'success' | 'warning' | 'danger'; icon: string }> = {
            published: { severity: 'success', icon: 'pi pi-check-circle' },
            draft: { severity: 'warning', icon: 'pi pi-pencil' },
            archived: { severity: 'danger', icon: 'pi pi-archive' }
        };
        const config = statusConfig[rowData.status];

        return <Tag value={rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const freeBodyTemplate = (rowData: Chapter) => {
        return rowData.isFree ? <Tag value="Free" severity="success" icon="pi pi-gift" /> : <Tag value="Premium" severity="info" icon="pi pi-lock" />;
    };

    const durationBodyTemplate = (rowData: Chapter) => {
        if (!rowData.estimatedDuration) return <span className="text-500">-</span>;
        return <span>{rowData.estimatedDuration} min</span>;
    };

    const actionBodyTemplate = (rowData: Chapter) => (
        <div className="flex gap-1">
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            {rowData.status === 'draft' && <Button icon="pi pi-check" rounded outlined severity="success" onClick={() => publishChapter(rowData)} tooltip="Publish" tooltipOptions={{ position: 'top' }} />}
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteChapter(rowData._id!)} tooltip="Archive" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Chapter' : 'Create Chapter'} icon="pi pi-check" onClick={saveChapter} loading={loading} />
        </div>
    );

    // Get current module name
    const currentModule = modules.find((m) => m._id === selectedModuleId);

    const content = (
        <>
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Header Section */}
            {!embedded && (
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Chapter Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">{currentModule ? `Managing chapters for: ${currentModule.moduleName}` : 'Select a module to manage its chapters'}</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Badge value={chapters.length.toString()} severity="info" />
                        <i className="pi pi-list text-4xl md:text-5xl text-primary"></i>
                    </div>
                </div>
            )}

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            {!selectedModuleId ? (
                <div className="text-center p-6">
                    <i className="pi pi-book text-6xl text-300 mb-3"></i>
                    <h3 className="text-600">No Module Selected</h3>
                    <p className="text-500">Please select a module from the dropdown to view its chapters</p>
                </div>
            ) : (
                <DataTable
                    value={chapters}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['chapterName', 'chapterDescription', 'status']}
                    emptyMessage="No chapters found. Create your first chapter!"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                    stripedRows
                >
                    <Column field="sortOrder" header="#" sortable style={{ width: '60px' }} />
                    <Column field="chapterName" header="Chapter Name" sortable style={{ minWidth: '200px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable field="status" style={{ minWidth: '120px' }} />
                    <Column body={freeBodyTemplate} header="Access" style={{ minWidth: '100px' }} />
                    <Column body={durationBodyTemplate} header="Duration" style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '150px' }} />
                </DataTable>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '700px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Chapter' : 'Create New Chapter'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="grid">
                    <div className="col-12">
                        <div className="bg-primary-50 border-round p-3 mb-3">
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-book text-primary"></i>
                                <span className="font-semibold text-primary-900">Module: {currentModule?.moduleName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="col-12">
                        <label htmlFor="chapterName" className="font-semibold text-900 mb-2 block">
                            Chapter Name <span className="text-red-500">*</span>
                        </label>
                        <InputText id="chapterName" value={formData.chapterName} onChange={(e) => setFormData({ ...formData, chapterName: e.target.value })} placeholder="e.g., Getting Started with Variables" className="w-full" />
                    </div>

                    <div className="col-12">
                        <label htmlFor="chapterDescription" className="font-semibold text-900 mb-2 block">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <Editor id="chapterDescription" value={formData.chapterDescription} onTextChange={(e) => setFormData((prev) => ({ ...prev, chapterDescription: e.htmlValue || '' }))} style={{ height: '150px' }} />
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="sortOrder" className="font-semibold text-900 mb-2 block">
                            Order
                        </label>
                        <InputNumber id="sortOrder" value={formData.sortOrder} onValueChange={(e) => setFormData({ ...formData, sortOrder: e.value || 0 })} min={0} showButtons className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="estimatedDuration" className="font-semibold text-900 mb-2 block">
                            Duration (min)
                        </label>
                        <InputNumber id="estimatedDuration" value={formData.estimatedDuration} onValueChange={(e) => setFormData({ ...formData, estimatedDuration: e.value || 0 })} min={0} suffix=" min" className="w-full" />
                    </div>

                    <div className="col-12 md:col-4">
                        <label htmlFor="status" className="font-semibold text-900 mb-2 block">
                            Status
                        </label>
                        <Dropdown id="status" value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} className="w-full" />
                    </div>

                    <div className="col-12">
                        <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                            <Checkbox inputId="isFree" checked={formData.isFree} onChange={(e) => setFormData({ ...formData, isFree: e.checked || false })} />
                            <label htmlFor="isFree" className="cursor-pointer">
                                <div className="font-semibold text-900">Free Preview Chapter</div>
                                <small className="text-500">Allow non-enrolled users to access this chapter for free</small>
                            </label>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <div className="surface-ground p-3 md:p-4">
            <Card>{content}</Card>
        </div>
    );
};

export default LMSChapterManagement;
