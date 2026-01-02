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
import { TabView, TabPanel } from 'primereact/tabview';
import { FileUpload, FileUploadSelectEvent } from 'primereact/fileupload';
import { Badge } from 'primereact/badge';
import { InputTextarea } from 'primereact/inputtextarea';
import { ProgressBar } from 'primereact/progressbar';
import { useAuth } from '@/context/AuthContext';
import { Editor } from 'primereact/editor';

// Types
type ContentType = 'video' | 'pdf' | 'html' | 'audio' | 'quiz' | 'assignment' | 'interactive';
type MaterialType = 'pdf' | 'video' | 'link' | 'image' | 'pdf_link' | 'video_link' | 'image_link' | 'web_page';

interface CourseMaterial {
    _id?: string;
    lessonId: string;
    chapterId: string;
    moduleId: string;
    subjectId: string;
    schoolSiteId: string;
    addedBy: string | { _id: string; firstName: string; lastName: string };
    materialTitle: string;
    materialDescription?: string;
    materialType: MaterialType;
    materialURL: string;
    fileSize?: number;
    duration?: number;
    pageCount?: number;
    sortOrder: number;
    isDownloadable: boolean;
    isActive: boolean;
    uploadDate?: string;
    isPrimary?: boolean;
}

interface Lesson {
    _id?: string;
    lessonName: string;
    lessonDescription?: string;
    chapterId: string | { _id: string; chapterName: string };
    moduleId: string | { _id: string; moduleName: string };
    subjectId?: string;
    schoolSiteId: string;
    addedBy: string | { _id: string; firstName: string; lastName: string };
    contentType: ContentType;
    contentUrl?: string;
    contentHtml?: string;
    primaryMaterialId?: string | CourseMaterial;
    attachedMaterialIds?: (string | CourseMaterial)[];
    duration?: number;
    sortOrder: number;
    status: 'draft' | 'published' | 'archived';
    isFree: boolean;
    allowDownload: boolean;
    attachments?: Array<{ name: string; url: string; size: number }>;
    isActive: boolean;
    createdAt?: string;
}

interface Chapter {
    _id: string;
    chapterName: string;
    moduleId: string | { _id: string; moduleName: string };
    subjectId?: string;
}

interface CourseModule {
    _id: string;
    moduleName: string;
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

const contentTypeOptions: DropdownOption[] = [
    { label: '🎬 Video', value: 'video' },
    { label: '📄 PDF Document', value: 'pdf' },
    { label: '📝 HTML/Text', value: 'html' },
    { label: '🎧 Audio', value: 'audio' },
    { label: '📋 Quiz', value: 'quiz' },
    { label: '✏️ Assignment', value: 'assignment' },
    { label: '🎮 Interactive', value: 'interactive' }
];

const materialTypeOptions: DropdownOption[] = [
    { label: '🎬 Video File', value: 'video' },
    { label: '📄 PDF File', value: 'pdf' },
    { label: '🖼️ Image File', value: 'image' },
    { label: '🔗 External Link', value: 'link' },
    { label: '🎬 Video Link', value: 'video_link' },
    { label: '📄 PDF Link', value: 'pdf_link' },
    { label: '🖼️ Image Link', value: 'image_link' },
    { label: '🌐 Web Page', value: 'web_page' }
];

interface LMSLessonManagementProps {
    chapterId?: string;
    moduleId?: string;
    embedded?: boolean;
}

const LMSLessonManagement: React.FC<LMSLessonManagementProps> = ({ chapterId: propChapterId, moduleId: propModuleId, embedded = false }) => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    // State
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [modules, setModules] = useState<CourseModule[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Materials state
    const [materials, setMaterials] = useState<CourseMaterial[]>([]);
    const [materialDialogVisible, setMaterialDialogVisible] = useState(false);
    const [currentLessonForMaterials, setCurrentLessonForMaterials] = useState<Lesson | null>(null);
    const [materialFormData, setMaterialFormData] = useState<CourseMaterial>({
        lessonId: '',
        chapterId: '',
        moduleId: '',
        subjectId: '',
        schoolSiteId: '',
        addedBy: '',
        materialTitle: '',
        materialDescription: '',
        materialType: 'pdf',
        materialURL: '',
        fileSize: 0,
        duration: 0,
        pageCount: 0,
        sortOrder: 0,
        isDownloadable: true,
        isActive: true,
        isPrimary: false
    });
    const [isEditMaterial, setIsEditMaterial] = useState(false);
    const [materialUploading, setMaterialUploading] = useState(false);
    const [materialUploadProgress, setMaterialUploadProgress] = useState(0);
    const [manageMaterialsDialogVisible, setManageMaterialsDialogVisible] = useState(false);

    // Selection state
    const [selectedModuleId, setSelectedModuleId] = useState<string>(propModuleId || '');
    const [selectedChapterId, setSelectedChapterId] = useState<string>(propChapterId || '');

    // Form state
    const [formData, setFormData] = useState<Lesson>(getEmptyLesson());

    // Filters
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        lessonName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        contentType: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyLesson(): Lesson {
        // Try to get subjectId from selected chapter or module
        const selectedChapter = chapters.find((c) => c._id === (selectedChapterId || propChapterId));
        const selectedModule = modules.find((m) => m._id === (selectedModuleId || propModuleId));

        let subId = selectedChapter?.subjectId || selectedModule?.subjectId;
        if (typeof subId === 'object') {
            subId = subId._id;
        }

        return {
            lessonName: '',
            lessonDescription: '',
            chapterId: selectedChapterId || propChapterId || '',
            moduleId: selectedModuleId || propModuleId || '',
            subjectId: subId,
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            contentType: 'video',
            contentUrl: '',
            contentHtml: '',
            duration: 0,
            sortOrder: 0,
            status: 'draft',
            isFree: false,
            allowDownload: false,
            attachments: [],
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
        } else {
            setChapters([]);
            setSelectedChapterId('');
        }
    }, [selectedModuleId]);

    useEffect(() => {
        if (selectedChapterId) {
            fetchLessons();
        } else {
            setLessons([]);
        }
    }, [selectedChapterId]);

    useEffect(() => {
        if (propModuleId) setSelectedModuleId(propModuleId);
        if (propChapterId) setSelectedChapterId(propChapterId);
    }, [propModuleId, propChapterId]);

    const fetchModules = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);

            const response = await fetch(`/api/lms/course-modules?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setModules(data.modules || []);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    };

    const fetchChapters = async () => {
        if (!selectedModuleId) return;

        try {
            const params = new URLSearchParams();
            params.append('moduleId', selectedModuleId);

            const response = await fetch(`/api/lms/chapters?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setChapters(data.chapters || []);
            }
        } catch (error) {
            console.error('Error fetching chapters:', error);
        }
    };

    const fetchLessons = async () => {
        if (!selectedChapterId) return;

        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('chapterId', selectedChapterId);

            const response = await fetch(`/api/lms/lessons?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setLessons(data.lessons || []);
            } else {
                showToast('error', 'Error', 'Failed to load lessons');
            }
        } catch (error) {
            console.error('Error fetching lessons:', error);
            showToast('error', 'Error', 'Failed to load lessons');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    function getEmptyMaterial(): CourseMaterial {
        const selectedChapter = chapters.find((c) => c._id === selectedChapterId);
        const selectedModule = modules.find((m) => m._id === selectedModuleId);

        let subId = selectedChapter?.subjectId || selectedModule?.subjectId;
        if (typeof subId === 'object') {
            subId = (subId as any)._id;
        }

        return {
            lessonId: currentLessonForMaterials?._id || '',
            chapterId: selectedChapterId,
            moduleId: selectedModuleId,
            subjectId: (subId as string) || '',
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            materialTitle: '',
            materialDescription: '',
            materialType: 'pdf',
            materialURL: '',
            fileSize: 0,
            duration: 0,
            pageCount: 0,
            sortOrder: materials.length,
            isDownloadable: true,
            isActive: true,
            isPrimary: false
        };
    }

    const fetchMaterials = async (lessonId: string) => {
        try {
            const response = await fetch(`/api/lms/course-materials?lessonId=${lessonId}`);
            if (response.ok) {
                const data = await response.json();
                setMaterials(data.materials || []);
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        }
    };

    const openMaterialsDialog = (lesson: Lesson) => {
        setCurrentLessonForMaterials(lesson);
        setManageMaterialsDialogVisible(true);
        if (lesson._id) {
            fetchMaterials(lesson._id);
        }
    };

    const openNewMaterial = () => {
        if (!currentLessonForMaterials?._id) {
            showToast('error', 'Error', 'Please save the lesson first before adding materials');
            return;
        }

        const selectedChapter = chapters.find((c) => c._id === selectedChapterId);
        const selectedModule = modules.find((m) => m._id === selectedModuleId);
        let subId = selectedChapter?.subjectId || selectedModule?.subjectId;
        if (typeof subId === 'object') {
            subId = (subId as any)._id;
        }

        setMaterialFormData({
            lessonId: currentLessonForMaterials._id,
            chapterId: typeof currentLessonForMaterials.chapterId === 'object' ? currentLessonForMaterials.chapterId._id : currentLessonForMaterials.chapterId,
            moduleId: typeof currentLessonForMaterials.moduleId === 'object' ? currentLessonForMaterials.moduleId._id : currentLessonForMaterials.moduleId,
            subjectId: currentLessonForMaterials.subjectId || (subId as string) || '',
            schoolSiteId: user?.schoolSite || '',
            addedBy: user?.id || '',
            materialTitle: '',
            materialDescription: '',
            materialType: 'pdf',
            materialURL: '',
            fileSize: 0,
            duration: 0,
            pageCount: 0,
            sortOrder: materials.length,
            isDownloadable: true,
            isActive: true,
            isPrimary: !materials.some((m) => m.isPrimary) // Auto-set as primary if no primary exists
        });
        setIsEditMaterial(false);
        setMaterialDialogVisible(true);
    };

    const openEditMaterial = (material: CourseMaterial) => {
        // Check if this is the primary material
        const isPrimary =
            currentLessonForMaterials?.primaryMaterialId &&
            (typeof currentLessonForMaterials.primaryMaterialId === 'object' ? (currentLessonForMaterials.primaryMaterialId as CourseMaterial)._id === material._id : currentLessonForMaterials.primaryMaterialId === material._id);

        setMaterialFormData({
            ...material,
            addedBy: typeof material.addedBy === 'object' ? material.addedBy._id : material.addedBy,
            isPrimary: isPrimary || false
        });
        setIsEditMaterial(true);
        setMaterialDialogVisible(true);
    };

    const saveMaterial = async () => {
        if (!materialFormData.materialTitle || !materialFormData.materialURL || !materialFormData.materialType) {
            showToast('error', 'Validation Error', 'Material title, type, and URL are required');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMaterial ? `/api/lms/course-materials/${materialFormData._id}` : '/api/lms/course-materials';
            const method = isEditMaterial ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...materialFormData,
                    lessonId: currentLessonForMaterials?._id
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Material ${isEditMaterial ? 'updated' : 'added'} successfully`);
                setMaterialDialogVisible(false);
                if (currentLessonForMaterials?._id) {
                    fetchMaterials(currentLessonForMaterials._id);
                    fetchLessons(); // Refresh to update primary material reference
                }
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save material');
            }
        } catch (error) {
            console.error('Error saving material:', error);
            showToast('error', 'Error', 'An error occurred while saving material');
        } finally {
            setLoading(false);
        }
    };

    const deleteMaterial = async (materialId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this material?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/lms/course-materials/${materialId}?hard=true`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Material deleted');
                        if (currentLessonForMaterials?._id) {
                            fetchMaterials(currentLessonForMaterials._id);
                            fetchLessons();
                        }
                    } else {
                        showToast('error', 'Error', 'Failed to delete material');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                }
            }
        });
    };

    const setAsPrimaryMaterial = async (material: CourseMaterial) => {
        if (!currentLessonForMaterials?._id) return;

        try {
            const response = await fetch(`/api/lms/course-materials/${material._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isPrimary: true,
                    lessonId: currentLessonForMaterials._id
                })
            });

            if (response.ok) {
                showToast('success', 'Success', 'Primary material updated');
                fetchMaterials(currentLessonForMaterials._id);
                fetchLessons();
            } else {
                showToast('error', 'Error', 'Failed to set primary material');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred');
        }
    };

    const handleMaterialFileUpload = async (file: File, type: 'video' | 'pdf' | 'image') => {
        const maxSize = type === 'video' ? 100 * 1024 * 1024 : type === 'pdf' ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('error', 'File Too Large', `Maximum file size is ${maxSize / (1024 * 1024)}MB`);
            return;
        }

        setMaterialUploading(true);
        setMaterialUploadProgress(0);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('contentType', type);
            uploadFormData.append('schoolSiteId', user?.schoolSite || '');

            const progressInterval = setInterval(() => {
                setMaterialUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 500);

            const response = await fetch('/api/upload/cloudinary', {
                method: 'POST',
                body: uploadFormData
            });

            clearInterval(progressInterval);

            if (response.ok) {
                const result = await response.json();
                setMaterialUploadProgress(100);
                setMaterialFormData((prev) => ({
                    ...prev,
                    materialURL: result.data.url,
                    fileSize: result.data.size || file.size,
                    duration: result.data.duration ? Math.round(result.data.duration) : prev.duration
                }));
                showToast('success', 'Upload Complete', 'File uploaded successfully');
            } else {
                const error = await response.json();
                showToast('error', 'Upload Failed', error.error || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('error', 'Upload Error', 'An error occurred while uploading');
        } finally {
            setMaterialUploading(false);
            setMaterialUploadProgress(0);
        }
    };

    const openNew = () => {
        // Get subjectId from selected chapter or module
        const selectedChapter = chapters.find((c) => c._id === selectedChapterId);
        const selectedModule = modules.find((m) => m._id === selectedModuleId);

        let subId = selectedChapter?.subjectId || selectedModule?.subjectId;
        if (typeof subId === 'object') {
            subId = subId._id;
        }

        setFormData({
            ...getEmptyLesson(),
            chapterId: selectedChapterId,
            moduleId: selectedModuleId,
            subjectId: subId,
            sortOrder: lessons.length
        });
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (lesson: Lesson) => {
        // Try to get subjectId from lesson, chapter, or module
        let subId: string | undefined = lesson.subjectId;
        if (!subId) {
            const selectedChapter = chapters.find((c) => c._id === (typeof lesson.chapterId === 'object' ? lesson.chapterId._id : lesson.chapterId));
            const selectedModule = modules.find((m) => m._id === (typeof lesson.moduleId === 'object' ? lesson.moduleId._id : lesson.moduleId));
            const rawSubId = selectedChapter?.subjectId || selectedModule?.subjectId;
            if (rawSubId) {
                subId = typeof rawSubId === 'object' ? rawSubId._id : rawSubId;
            }
        }

        const editData = {
            ...lesson,
            chapterId: typeof lesson.chapterId === 'object' ? lesson.chapterId._id : lesson.chapterId,
            moduleId: typeof lesson.moduleId === 'object' ? lesson.moduleId._id : lesson.moduleId,
            subjectId: subId,
            addedBy: typeof lesson.addedBy === 'object' ? lesson.addedBy._id : lesson.addedBy
        };
        setFormData(editData);
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyLesson());
    };

    const saveLesson = async () => {
        if (!formData.lessonName || !formData.contentType) {
            showToast('error', 'Validation Error', 'Lesson name and content type are required');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/lessons/${formData._id}` : '/api/lms/lessons';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    chapterId: selectedChapterId,
                    moduleId: selectedModuleId
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Lesson ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchLessons();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save lesson');
            }
        } catch (error) {
            console.error('Error saving lesson:', error);
            showToast('error', 'Error', 'An error occurred while saving lesson');
        } finally {
            setLoading(false);
        }
    };

    const deleteLesson = async (lessonId: string) => {
        confirmDialog({
            message: 'Are you sure you want to archive this lesson?',
            header: 'Confirm Archive',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/lms/lessons/${lessonId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Lesson archived successfully');
                        fetchLessons();
                    } else {
                        showToast('error', 'Error', 'Failed to archive lesson');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const publishLesson = async (lesson: Lesson) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/lms/lessons/${lesson._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' })
            });

            if (response.ok) {
                showToast('success', 'Success', 'Lesson published');
                fetchLessons();
            } else {
                showToast('error', 'Error', 'Failed to publish lesson');
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

    // Dropdown options
    const moduleDropdownOptions = modules.map((m) => ({ label: m.moduleName, value: m._id }));
    const chapterDropdownOptions = chapters.map((c) => ({ label: c.chapterName, value: c._id }));

    // Templates
    const leftToolbarTemplate = () => (
        <div className="flex gap-2 flex-wrap align-items-center">
            {!embedded && (
                <>
                    <Dropdown
                        value={selectedModuleId}
                        options={moduleDropdownOptions}
                        onChange={(e) => {
                            setSelectedModuleId(e.value);
                            setSelectedChapterId('');
                        }}
                        placeholder="Select Module"
                        className="w-auto min-w-12rem"
                        filter
                        showClear
                    />
                    <i className="pi pi-angle-right text-400"></i>
                    <Dropdown value={selectedChapterId} options={chapterDropdownOptions} onChange={(e) => setSelectedChapterId(e.value)} placeholder="Select Chapter" className="w-auto min-w-12rem" filter showClear disabled={!selectedModuleId} />
                </>
            )}
            <Button label="New Lesson" icon="pi pi-plus" severity="success" onClick={openNew} disabled={!selectedChapterId} />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search lessons..." />
            </span>
            <Button icon="pi pi-refresh" severity="info" onClick={fetchLessons} loading={loading} tooltip="Refresh" />
        </div>
    );

    const statusBodyTemplate = (rowData: Lesson) => {
        const statusConfig: Record<string, { severity: 'success' | 'warning' | 'danger'; icon: string }> = {
            published: { severity: 'success', icon: 'pi pi-check-circle' },
            draft: { severity: 'warning', icon: 'pi pi-pencil' },
            archived: { severity: 'danger', icon: 'pi pi-archive' }
        };
        const config = statusConfig[rowData.status];

        return <Tag value={rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const contentTypeBodyTemplate = (rowData: Lesson) => {
        const typeConfig: Record<ContentType, { icon: string; color: string }> = {
            video: { icon: 'pi pi-video', color: 'text-red-500' },
            pdf: { icon: 'pi pi-file-pdf', color: 'text-orange-500' },
            html: { icon: 'pi pi-code', color: 'text-blue-500' },
            audio: { icon: 'pi pi-volume-up', color: 'text-purple-500' },
            quiz: { icon: 'pi pi-question-circle', color: 'text-green-500' },
            assignment: { icon: 'pi pi-pencil', color: 'text-yellow-500' },
            interactive: { icon: 'pi pi-play', color: 'text-cyan-500' }
        };
        const config = typeConfig[rowData.contentType];

        return (
            <div className="flex align-items-center gap-2">
                <i className={`${config.icon} ${config.color}`}></i>
                <span className="capitalize">{rowData.contentType}</span>
            </div>
        );
    };

    const durationBodyTemplate = (rowData: Lesson) => {
        if (!rowData.duration) return <span className="text-500">-</span>;
        const mins = Math.floor(rowData.duration / 60);
        const secs = rowData.duration % 60;
        return (
            <span>
                {mins}:{secs.toString().padStart(2, '0')}
            </span>
        );
    };

    const accessBodyTemplate = (rowData: Lesson) => {
        return (
            <div className="flex gap-1">
                {rowData.isFree && <Tag value="Free" severity="success" className="text-xs" />}
                {rowData.allowDownload && <Tag value="Download" severity="info" className="text-xs" />}
                {!rowData.isFree && !rowData.allowDownload && <span className="text-500">-</span>}
            </div>
        );
    };

    const actionBodyTemplate = (rowData: Lesson) => (
        <div className="flex gap-1">
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-paperclip" rounded outlined severity="warning" onClick={() => openMaterialsDialog(rowData)} tooltip="Materials" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-eye" rounded outlined severity="help" tooltip="Preview" tooltipOptions={{ position: 'top' }} />
            {rowData.status === 'draft' && <Button icon="pi pi-check" rounded outlined severity="success" onClick={() => publishLesson(rowData)} tooltip="Publish" tooltipOptions={{ position: 'top' }} />}
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteLesson(rowData._id!)} tooltip="Archive" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const materialDialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={() => setMaterialDialogVisible(false)} />
            <Button label={isEditMaterial ? 'Update Material' : 'Add Material'} icon="pi pi-check" onClick={saveMaterial} loading={loading} />
        </div>
    );

    const materialsDialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button
                label="Close"
                icon="pi pi-times"
                onClick={() => {
                    setManageMaterialsDialogVisible(false);
                    setCurrentLessonForMaterials(null);
                    setMaterials([]);
                }}
            />
        </div>
    );

    const materialTypeBodyTemplate = (rowData: CourseMaterial) => {
        const typeConfig: Record<MaterialType, { icon: string; color: string }> = {
            video: { icon: 'pi pi-video', color: 'text-red-500' },
            pdf: { icon: 'pi pi-file-pdf', color: 'text-orange-500' },
            image: { icon: 'pi pi-image', color: 'text-cyan-500' },
            link: { icon: 'pi pi-link', color: 'text-blue-500' },
            video_link: { icon: 'pi pi-video', color: 'text-red-400' },
            pdf_link: { icon: 'pi pi-file-pdf', color: 'text-orange-400' },
            image_link: { icon: 'pi pi-image', color: 'text-cyan-400' },
            web_page: { icon: 'pi pi-globe', color: 'text-green-500' }
        };
        const config = typeConfig[rowData.materialType] || { icon: 'pi pi-file', color: 'text-500' };

        return (
            <div className="flex align-items-center gap-2">
                <i className={`${config.icon} ${config.color}`}></i>
                <span className="capitalize">{rowData.materialType.replace('_', ' ')}</span>
            </div>
        );
    };

    const materialActionsTemplate = (rowData: CourseMaterial) => {
        const isPrimary =
            currentLessonForMaterials?.primaryMaterialId &&
            (typeof currentLessonForMaterials.primaryMaterialId === 'object' ? (currentLessonForMaterials.primaryMaterialId as CourseMaterial)._id === rowData._id : currentLessonForMaterials.primaryMaterialId === rowData._id);

        return (
            <div className="flex gap-1">
                {!isPrimary && <Button icon="pi pi-star" rounded outlined severity="warning" onClick={() => setAsPrimaryMaterial(rowData)} tooltip="Feature This" tooltipOptions={{ position: 'top' }} />}
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEditMaterial(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-external-link" rounded outlined severity="help" onClick={() => window.open(rowData.materialURL, '_blank')} tooltip="Open" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteMaterial(rowData._id!)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const materialPrimaryTemplate = (rowData: CourseMaterial) => {
        const isPrimary =
            currentLessonForMaterials?.primaryMaterialId &&
            (typeof currentLessonForMaterials.primaryMaterialId === 'object' ? (currentLessonForMaterials.primaryMaterialId as CourseMaterial)._id === rowData._id : currentLessonForMaterials.primaryMaterialId === rowData._id);

        return isPrimary ? <Tag value="Featured" severity="warning" icon="pi pi-star-fill" /> : <Tag value="Resource" severity="info" icon="pi pi-paperclip" />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Lesson' : 'Create Lesson'} icon="pi pi-check" onClick={saveLesson} loading={loading} />
        </div>
    );

    // Get current selections
    const currentModule = modules.find((m) => m._id === selectedModuleId);
    const currentChapter = chapters.find((c) => c._id === selectedChapterId);

    const content = (
        <>
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Header */}
            {!embedded && (
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Lesson Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">{currentChapter ? `Managing lessons for: ${currentChapter.chapterName}` : 'Select a module and chapter to manage lessons'}</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Badge value={lessons.length.toString()} severity="info" />
                        <i className="pi pi-play-circle text-4xl md:text-5xl text-primary"></i>
                    </div>
                </div>
            )}

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            {!selectedChapterId ? (
                <div className="text-center p-6">
                    <i className="pi pi-video text-6xl text-300 mb-3"></i>
                    <h3 className="text-600">No Chapter Selected</h3>
                    <p className="text-500">{!selectedModuleId ? 'Please select a module first, then a chapter to view its lessons' : 'Please select a chapter to view its lessons'}</p>
                </div>
            ) : (
                <DataTable
                    value={lessons}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['lessonName', 'lessonDescription', 'status', 'contentType']}
                    emptyMessage="No lessons found. Create your first lesson!"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                    stripedRows
                >
                    <Column field="sortOrder" header="#" sortable style={{ width: '60px' }} />
                    <Column field="lessonName" header="Lesson Name" sortable style={{ minWidth: '200px' }} />
                    <Column body={contentTypeBodyTemplate} header="Type" style={{ minWidth: '120px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable field="status" style={{ minWidth: '100px' }} />
                    <Column body={durationBodyTemplate} header="Duration" style={{ minWidth: '80px' }} />
                    <Column body={accessBodyTemplate} header="Access" style={{ minWidth: '120px' }} />
                    <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '180px' }} />
                </DataTable>
            )}

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Lesson' : 'Create New Lesson'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <TabView>
                    {/* Basic Info */}
                    <TabPanel header="Basic Info" leftIcon="pi pi-info-circle mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="bg-primary-50 border-round p-3 mb-3">
                                    <div className="flex align-items-center gap-2 mb-1">
                                        <i className="pi pi-folder text-primary"></i>
                                        <span className="font-semibold text-primary-900">
                                            {currentModule?.moduleName} → {currentChapter?.chapterName}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-12 md:col-8">
                                <label htmlFor="lessonName" className="font-semibold text-900 mb-2 block">
                                    Lesson Name <span className="text-red-500">*</span>
                                </label>
                                <InputText id="lessonName" value={formData.lessonName} onChange={(e) => setFormData({ ...formData, lessonName: e.target.value })} placeholder="e.g., Introduction to Variables" className="w-full" />
                            </div>

                            <div className="col-12 md:col-4">
                                <label htmlFor="sortOrder" className="font-semibold text-900 mb-2 block">
                                    Order
                                </label>
                                <InputNumber id="sortOrder" value={formData.sortOrder} onValueChange={(e) => setFormData({ ...formData, sortOrder: e.value || 0 })} min={0} showButtons className="w-full" />
                            </div>

                            <div className="col-12">
                                <label htmlFor="lessonDescription" className="font-semibold text-900 mb-2 block">
                                    Description
                                </label>
                                <Editor id="lessonDescription" value={formData.lessonDescription} onTextChange={(e) => setFormData((prev) => ({ ...prev, lessonDescription: e.htmlValue || '' }))} style={{ height: '120px' }} />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="contentType" className="font-semibold text-900 mb-2 block">
                                    Content Type <span className="text-red-500">*</span>
                                </label>
                                <Dropdown id="contentType" value={formData.contentType} options={contentTypeOptions} onChange={(e) => setFormData({ ...formData, contentType: e.value })} className="w-full" />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="status" className="font-semibold text-900 mb-2 block">
                                    Status
                                </label>
                                <Dropdown id="status" value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} className="w-full" />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Content */}
                    <TabPanel header="Content" leftIcon="pi pi-file mr-2">
                        <div className="grid">
                            {(formData.contentType === 'video' || formData.contentType === 'audio' || formData.contentType === 'pdf') && (
                                <>
                                    {/* Upload Section */}
                                    <div className="col-12">
                                        <div className="bg-primary-50 border-round p-3 mb-3">
                                            <h4 className="text-primary-900 mt-0 mb-1 flex align-items-center gap-2">
                                                <i className="pi pi-cloud-upload"></i>
                                                Upload Primary Lesson {formData.contentType === 'video' ? 'Video' : formData.contentType === 'audio' ? 'Audio' : 'PDF'}
                                            </h4>
                                            <p className="text-primary-700 text-sm m-0">This is the main content students will see first. You can add supplementary materials later.</p>
                                        </div>

                                        <div className="surface-100 border-round p-4">
                                            <div className="flex flex-column align-items-center gap-3">
                                                <input
                                                    type="file"
                                                    id="fileUpload"
                                                    accept={formData.contentType === 'video' ? 'video/*' : formData.contentType === 'audio' ? 'audio/*' : 'application/pdf'}
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        // File size validation (100MB for video, 50MB for audio, 20MB for PDF)
                                                        const maxSize = formData.contentType === 'video' ? 100 * 1024 * 1024 : formData.contentType === 'audio' ? 50 * 1024 * 1024 : 20 * 1024 * 1024;
                                                        if (file.size > maxSize) {
                                                            showToast('error', 'File Too Large', `Maximum file size is ${maxSize / (1024 * 1024)}MB`);
                                                            return;
                                                        }

                                                        setUploading(true);
                                                        setUploadProgress(0);

                                                        try {
                                                            const uploadFormData = new FormData();
                                                            uploadFormData.append('file', file);
                                                            uploadFormData.append('contentType', formData.contentType);
                                                            uploadFormData.append('schoolSiteId', user?.schoolSite || '');
                                                            uploadFormData.append('lessonId', formData._id || '');

                                                            // Simulate progress (Cloudinary doesn't provide real-time progress via fetch)
                                                            const progressInterval = setInterval(() => {
                                                                setUploadProgress((prev) => Math.min(prev + 10, 90));
                                                            }, 500);

                                                            const response = await fetch('/api/upload/cloudinary', {
                                                                method: 'POST',
                                                                body: uploadFormData
                                                            });

                                                            clearInterval(progressInterval);

                                                            if (response.ok) {
                                                                const result = await response.json();
                                                                setUploadProgress(100);
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    contentUrl: result.data.url,
                                                                    duration: result.data.duration ? Math.round(result.data.duration) : prev.duration
                                                                }));
                                                                showToast('success', 'Upload Complete', 'Your file has been uploaded successfully');
                                                            } else {
                                                                const error = await response.json();
                                                                showToast('error', 'Upload Failed', error.error || 'Failed to upload file');
                                                            }
                                                        } catch (error) {
                                                            console.error('Upload error:', error);
                                                            showToast('error', 'Upload Error', 'An error occurred while uploading');
                                                        } finally {
                                                            setUploading(false);
                                                            setUploadProgress(0);
                                                            // Reset file input
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="hidden"
                                                    disabled={uploading}
                                                />

                                                <label htmlFor="fileUpload" className={`cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                                                    <div className="flex flex-column align-items-center gap-2 p-4 border-2 border-dashed border-round surface-border hover:border-primary transition-colors transition-duration-200">
                                                        <i className={`pi ${uploading ? 'pi-spin pi-spinner' : 'pi-cloud-upload'} text-4xl text-primary`}></i>
                                                        <span className="font-semibold text-900">{uploading ? 'Uploading...' : 'Click to upload or drag and drop'}</span>
                                                        <span className="text-500 text-sm">
                                                            {formData.contentType === 'video' && 'MP4, MOV, AVI, WebM (max 100MB)'}
                                                            {formData.contentType === 'audio' && 'MP3, WAV, OGG, M4A (max 50MB)'}
                                                            {formData.contentType === 'pdf' && 'PDF files only (max 20MB)'}
                                                        </span>
                                                    </div>
                                                </label>

                                                {uploading && (
                                                    <div className="w-full">
                                                        <div className="flex justify-content-between mb-1">
                                                            <span className="text-sm text-500">Uploading...</span>
                                                            <span className="text-sm text-500">{uploadProgress}%</span>
                                                        </div>
                                                        <div className="surface-300 border-round" style={{ height: '8px' }}>
                                                            <div className="bg-primary border-round transition-all transition-duration-300" style={{ height: '100%', width: `${uploadProgress}%` }}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="col-12">
                                        <div className="flex align-items-center gap-3 my-3">
                                            <div className="flex-grow-1 border-top-1 surface-border"></div>
                                            <span className="text-500 font-semibold">OR</span>
                                            <div className="flex-grow-1 border-top-1 surface-border"></div>
                                        </div>
                                    </div>

                                    {/* Manual URL Entry */}
                                    <div className="col-12">
                                        <label htmlFor="contentUrl" className="font-semibold text-900 mb-2 block">
                                            Content URL (YouTube, Vimeo, or direct link)
                                        </label>
                                        <div className="p-inputgroup">
                                            <span className="p-inputgroup-addon">
                                                <i className="pi pi-link"></i>
                                            </span>
                                            <InputText
                                                id="contentUrl"
                                                value={formData.contentUrl}
                                                onChange={(e) => setFormData({ ...formData, contentUrl: e.target.value })}
                                                placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                                                className="w-full"
                                            />
                                            {formData.contentUrl && <Button icon="pi pi-times" severity="danger" outlined onClick={() => setFormData({ ...formData, contentUrl: '' })} tooltip="Clear URL" />}
                                        </div>
                                        <small className="text-500">Paste a URL from YouTube, Vimeo, or a direct file link</small>
                                    </div>

                                    {/* Preview current content URL */}
                                    {formData.contentUrl && (
                                        <div className="col-12">
                                            <div className="surface-100 border-round p-3">
                                                <div className="flex align-items-center gap-2 mb-2">
                                                    <i className="pi pi-check-circle text-green-500"></i>
                                                    <span className="font-semibold text-900">Content URL Set</span>
                                                </div>
                                                <a href={formData.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm break-all">
                                                    {formData.contentUrl}
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-12 md:col-6">
                                        <label htmlFor="duration" className="font-semibold text-900 mb-2 block">
                                            Duration (seconds)
                                        </label>
                                        <InputNumber id="duration" value={formData.duration} onValueChange={(e) => setFormData({ ...formData, duration: e.value || 0 })} min={0} suffix=" sec" className="w-full" />
                                        <small className="text-500">Auto-detected for uploaded files</small>
                                    </div>
                                </>
                            )}

                            {formData.contentType === 'html' && (
                                <div className="col-12">
                                    <label htmlFor="contentHtml" className="font-semibold text-900 mb-2 block">
                                        HTML Content
                                    </label>
                                    <Editor id="contentHtml" value={formData.contentHtml} onTextChange={(e) => setFormData((prev) => ({ ...prev, contentHtml: e.htmlValue || '' }))} style={{ height: '300px' }} />
                                </div>
                            )}

                            {(formData.contentType === 'quiz' || formData.contentType === 'assignment') && (
                                <div className="col-12">
                                    <div className="surface-100 border-round p-4 text-center">
                                        <i className={`pi ${formData.contentType === 'quiz' ? 'pi-question-circle' : 'pi-pencil'} text-4xl text-primary mb-3`}></i>
                                        <h4 className="m-0 mb-2">{formData.contentType === 'quiz' ? 'Quiz Builder' : 'Assignment Builder'}</h4>
                                        <p className="text-500 m-0">After creating the lesson, you can configure the {formData.contentType} from the detailed lesson view.</p>
                                    </div>
                                </div>
                            )}

                            {formData.contentType === 'interactive' && (
                                <div className="col-12">
                                    <div className="surface-100 border-round p-4 text-center">
                                        <i className="pi pi-desktop text-4xl text-primary mb-3"></i>
                                        <h4 className="m-0 mb-2">Interactive Content</h4>
                                        <p className="text-500 m-0">Interactive content builder will be available in a future update.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabPanel>

                    {/* Settings */}
                    <TabPanel header="Settings" leftIcon="pi pi-cog mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <div className="surface-100 border-round p-3 flex align-items-center gap-3 mb-3">
                                    <Checkbox inputId="isFree" checked={formData.isFree} onChange={(e) => setFormData({ ...formData, isFree: e.checked || false })} />
                                    <label htmlFor="isFree" className="cursor-pointer">
                                        <div className="font-semibold text-900">Free Preview Lesson</div>
                                        <small className="text-500">Allow non-enrolled users to access this lesson for free</small>
                                    </label>
                                </div>

                                <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                                    <Checkbox inputId="allowDownload" checked={formData.allowDownload} onChange={(e) => setFormData({ ...formData, allowDownload: e.checked || false })} />
                                    <label htmlFor="allowDownload" className="cursor-pointer">
                                        <div className="font-semibold text-900">Allow Download</div>
                                        <small className="text-500">Let enrolled users download the lesson content</small>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>

            {/* Manage Materials Dialog */}
            <Dialog
                visible={manageMaterialsDialogVisible}
                style={{ width: '95vw', maxWidth: '1000px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-paperclip text-primary"></i>
                        <span>Manage Materials - {currentLessonForMaterials?.lessonName}</span>
                    </div>
                }
                modal
                footer={materialsDialogFooter}
                onHide={() => {
                    setManageMaterialsDialogVisible(false);
                    setCurrentLessonForMaterials(null);
                    setMaterials([]);
                }}
            >
                <div className="mb-4">
                    <div className="bg-primary-50 border-round p-3 mb-3">
                        <div className="flex align-items-center justify-content-between gap-2">
                            <div>
                                <h4 className="m-0 mb-1 text-primary-900">Supplementary Materials</h4>
                                <p className="m-0 text-sm text-primary-700">Add additional resources like PDFs, links, or reference materials. These appear alongside the main lesson content as supplementary resources.</p>
                            </div>
                            <Button label="Add Material" icon="pi pi-plus" severity="success" onClick={openNewMaterial} />
                        </div>
                    </div>

                    {materials.length === 0 ? (
                        <div className="text-center p-5 surface-100 border-round">
                            <i className="pi pi-file-o text-5xl text-400 mb-3"></i>
                            <h4 className="text-600 m-0 mb-2">No Supplementary Materials</h4>
                            <p className="text-500 m-0 mb-3">Add extra resources like study guides, PDFs, reference links, or practice materials to supplement the main lesson content.</p>
                            <Button label="Add First Material" icon="pi pi-plus" onClick={openNewMaterial} />
                        </div>
                    ) : (
                        <DataTable value={materials} dataKey="_id" stripedRows responsiveLayout="scroll" emptyMessage="No materials found">
                            <Column body={materialPrimaryTemplate} header="Type" style={{ width: '100px' }} />
                            <Column field="materialTitle" header="Title" sortable />
                            <Column body={materialTypeBodyTemplate} header="Format" style={{ width: '140px' }} />
                            <Column field="fileSize" header="Size" body={(row) => (row.fileSize ? `${(row.fileSize / 1024 / 1024).toFixed(2)} MB` : '-')} style={{ width: '100px' }} />
                            <Column body={materialActionsTemplate} header="Actions" style={{ width: '180px' }} />
                        </DataTable>
                    )}
                </div>
            </Dialog>

            {/* Add/Edit Material Dialog */}
            <Dialog
                visible={materialDialogVisible}
                style={{ width: '95vw', maxWidth: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMaterial ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMaterial ? 'Edit Material' : 'Add New Material'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={materialDialogFooter}
                onHide={() => setMaterialDialogVisible(false)}
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="materialTitle" className="font-semibold text-900 mb-2 block">
                            Material Title <span className="text-red-500">*</span>
                        </label>
                        <InputText id="materialTitle" value={materialFormData.materialTitle} onChange={(e) => setMaterialFormData({ ...materialFormData, materialTitle: e.target.value })} placeholder="e.g., Chapter Summary PDF" className="w-full" />
                    </div>

                    <div className="col-12">
                        <label htmlFor="materialDescription" className="font-semibold text-900 mb-2 block">
                            Description
                        </label>
                        <InputTextarea
                            id="materialDescription"
                            value={materialFormData.materialDescription || ''}
                            onChange={(e) => setMaterialFormData({ ...materialFormData, materialDescription: e.target.value })}
                            placeholder="Brief description of this material..."
                            rows={3}
                            className="w-full"
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="materialType" className="font-semibold text-900 mb-2 block">
                            Material Type <span className="text-red-500">*</span>
                        </label>
                        <Dropdown id="materialType" value={materialFormData.materialType} options={materialTypeOptions} onChange={(e) => setMaterialFormData({ ...materialFormData, materialType: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="sortOrder" className="font-semibold text-900 mb-2 block">
                            Sort Order
                        </label>
                        <InputNumber id="sortOrder" value={materialFormData.sortOrder} onValueChange={(e) => setMaterialFormData({ ...materialFormData, sortOrder: e.value || 0 })} min={0} showButtons className="w-full" />
                    </div>

                    {/* File Upload for uploadable types */}
                    {['video', 'pdf', 'image'].includes(materialFormData.materialType) && (
                        <div className="col-12">
                            <label className="font-semibold text-900 mb-2 block">Upload File</label>
                            <div className="surface-100 border-round p-3">
                                <input
                                    type="file"
                                    id="materialFileUpload"
                                    accept={materialFormData.materialType === 'video' ? 'video/*' : materialFormData.materialType === 'pdf' ? 'application/pdf' : 'image/*'}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            handleMaterialFileUpload(file, materialFormData.materialType as 'video' | 'pdf' | 'image');
                                        }
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                    disabled={materialUploading}
                                />
                                <label htmlFor="materialFileUpload" className={`cursor-pointer ${materialUploading ? 'pointer-events-none opacity-60' : ''}`}>
                                    <div className="flex flex-column align-items-center gap-2 p-3 border-2 border-dashed border-round surface-border hover:border-primary transition-colors">
                                        <i className={`pi ${materialUploading ? 'pi-spin pi-spinner' : 'pi-cloud-upload'} text-3xl text-primary`}></i>
                                        <span className="font-semibold text-900">{materialUploading ? 'Uploading...' : 'Click to upload'}</span>
                                        <span className="text-500 text-sm">
                                            {materialFormData.materialType === 'video' && 'MP4, MOV, AVI (max 100MB)'}
                                            {materialFormData.materialType === 'pdf' && 'PDF files only (max 20MB)'}
                                            {materialFormData.materialType === 'image' && 'JPG, PNG, GIF (max 10MB)'}
                                        </span>
                                    </div>
                                </label>

                                {materialUploading && (
                                    <div className="mt-3">
                                        <ProgressBar value={materialUploadProgress} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="col-12">
                        <label htmlFor="materialURL" className="font-semibold text-900 mb-2 block">
                            Material URL <span className="text-red-500">*</span>
                        </label>
                        <div className="p-inputgroup">
                            <span className="p-inputgroup-addon">
                                <i className="pi pi-link"></i>
                            </span>
                            <InputText id="materialURL" value={materialFormData.materialURL} onChange={(e) => setMaterialFormData({ ...materialFormData, materialURL: e.target.value })} placeholder="https://example.com/file.pdf" className="w-full" />
                        </div>
                        {materialFormData.materialURL && (
                            <div className="mt-2 p-2 surface-100 border-round">
                                <a href={materialFormData.materialURL} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">
                                    <i className="pi pi-external-link mr-1"></i>
                                    Preview URL
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="col-12 md:col-6">
                        <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                            <Checkbox inputId="isDownloadable" checked={materialFormData.isDownloadable} onChange={(e) => setMaterialFormData({ ...materialFormData, isDownloadable: e.checked || false })} />
                            <label htmlFor="isDownloadable" className="cursor-pointer">
                                <div className="font-semibold text-900">Allow Download</div>
                                <small className="text-500">Users can download this material</small>
                            </label>
                        </div>
                    </div>

                    <div className="col-12 md:col-6">
                        <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                            <Checkbox inputId="isPrimary" checked={materialFormData.isPrimary || false} onChange={(e) => setMaterialFormData({ ...materialFormData, isPrimary: e.checked || false })} />
                            <label htmlFor="isPrimary" className="cursor-pointer">
                                <div className="font-semibold text-900">Featured Material</div>
                                <small className="text-500">Highlight this as a key supplementary resource</small>
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

export default LMSLessonManagement;
