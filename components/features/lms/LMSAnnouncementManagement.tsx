'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Badge } from 'primereact/badge';
import { Checkbox } from 'primereact/checkbox';
import { Editor } from 'primereact/editor';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';
import { useAuth } from '@/context/AuthContext';

// Types
type AnnouncementPriority = 'low' | 'medium' | 'high' | 'urgent';
type TargetAudience = 'all' | 'enrolled' | 'instructors';

interface Subject {
    _id: string;
    name: string;
    code: string;
}

interface Person {
    _id: string;
    firstName: string;
    lastName: string;
    photoLink?: string;
}

interface AnnouncementReply {
    personId: string | Person;
    content: string;
    repliedAt: string;
    isEdited: boolean;
    editedAt?: string;
}

interface Announcement {
    _id?: string;
    subjectId?: string | Subject;
    schoolSiteId: string;
    title: string;
    content: string;
    announcementDate: string;
    runTill?: string;
    priority: AnnouncementPriority;
    addedBy: string | Person;
    announcementReply: AnnouncementReply[];
    isPinned: boolean;
    attachmentPaths: string[];
    viewCount: number;
    sendEmail: boolean;
    emailSentAt?: string;
    targetAudience: TargetAudience;
    isActive: boolean;
    createdAt?: string;
}

interface DropdownOption {
    label: string;
    value: string;
}

const priorityOptions: DropdownOption[] = [
    { label: '🟢 Low', value: 'low' },
    { label: '🟡 Medium', value: 'medium' },
    { label: '🟠 High', value: 'high' },
    { label: '🔴 Urgent', value: 'urgent' }
];

const audienceOptions: DropdownOption[] = [
    { label: '👥 All Users', value: 'all' },
    { label: '🎓 Enrolled Students', value: 'enrolled' },
    { label: '👨‍🏫 Instructors Only', value: 'instructors' }
];

interface LMSAnnouncementManagementProps {
    subjectId?: string;
    embedded?: boolean;
}

const LMSAnnouncementManagement: React.FC<LMSAnnouncementManagementProps> = ({ subjectId: propSubjectId, embedded = false }) => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);

    // State
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [viewDialogVisible, setViewDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [replyContent, setReplyContent] = useState('');

    // Form state
    const [formData, setFormData] = useState<Announcement>(getEmptyAnnouncement());

    // Filters
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        priority: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [selectedPriority, setSelectedPriority] = useState<string>('');

    function getEmptyAnnouncement(): Announcement {
        return {
            subjectId: propSubjectId || '',
            schoolSiteId: user?.schoolSite || '',
            title: '',
            content: '',
            announcementDate: new Date().toISOString(),
            runTill: '',
            priority: 'medium',
            addedBy: user?.id || '',
            announcementReply: [],
            isPinned: false,
            attachmentPaths: [],
            viewCount: 0,
            sendEmail: false,
            targetAudience: 'enrolled',
            isActive: true
        };
    }

    useEffect(() => {
        if (user?.schoolSite) {
            fetchSubjects();
            fetchAnnouncements();
        }
    }, [user, selectedPriority]);

    const fetchSubjects = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            params.append('isLMSEnabled', 'true');

            const response = await fetch(`/api/subjects?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setSubjects(data.subjects || []);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            if (propSubjectId) params.append('subjectId', propSubjectId);
            if (selectedPriority) params.append('priority', selectedPriority);

            const response = await fetch(`/api/lms/announcements?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data.announcements || []);
            } else {
                showToast('error', 'Error', 'Failed to load announcements');
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
            showToast('error', 'Error', 'Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData({
            ...getEmptyAnnouncement(),
            subjectId: propSubjectId || ''
        });
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (announcement: Announcement) => {
        setFormData({
            ...announcement,
            subjectId: typeof announcement.subjectId === 'object' ? announcement.subjectId._id : announcement.subjectId,
            addedBy: typeof announcement.addedBy === 'object' ? announcement.addedBy._id : announcement.addedBy
        });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const openView = (announcement: Announcement) => {
        setSelectedAnnouncement(announcement);
        setReplyContent('');
        setViewDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyAnnouncement());
    };

    const hideViewDialog = () => {
        setViewDialogVisible(false);
        setSelectedAnnouncement(null);
        setReplyContent('');
    };

    const saveAnnouncement = async () => {
        if (!formData.title || !formData.content) {
            showToast('error', 'Validation Error', 'Title and content are required');
            return;
        }

        if (!formData.subjectId) {
            showToast('error', 'Validation Error', 'Please select a course for this announcement');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/announcements/${formData._id}` : '/api/lms/announcements';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Announcement ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchAnnouncements();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save announcement');
            }
        } catch (error) {
            console.error('Error saving announcement:', error);
            showToast('error', 'Error', 'An error occurred while saving announcement');
        } finally {
            setLoading(false);
        }
    };

    const deleteAnnouncement = async (announcementId: string) => {
        confirmDialog({
            message: 'Are you sure you want to archive this announcement?',
            header: 'Confirm Archive',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/lms/announcements/${announcementId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Announcement archived successfully');
                        fetchAnnouncements();
                    } else {
                        showToast('error', 'Error', 'Failed to archive announcement');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                }
            }
        });
    };

    const togglePin = async (announcement: Announcement) => {
        try {
            const response = await fetch(`/api/lms/announcements/${announcement._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPinned: !announcement.isPinned })
            });

            if (response.ok) {
                showToast('success', 'Success', announcement.isPinned ? 'Announcement unpinned' : 'Announcement pinned');
                fetchAnnouncements();
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred');
        }
    };

    const addReply = async () => {
        if (!replyContent.trim() || !selectedAnnouncement?._id) return;

        try {
            const response = await fetch(`/api/lms/announcements/${selectedAnnouncement._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addReply',
                    personId: user?.id,
                    content: replyContent
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedAnnouncement(data.announcement);
                setReplyContent('');
                showToast('success', 'Success', 'Reply added');
                fetchAnnouncements();
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to add reply');
        }
    };

    const deleteReply = async (replyIndex: number) => {
        if (!selectedAnnouncement?._id) return;

        try {
            const response = await fetch(`/api/lms/announcements/${selectedAnnouncement._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteReply',
                    replyIndex
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedAnnouncement(data.announcement);
                showToast('success', 'Success', 'Reply deleted');
                fetchAnnouncements();
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to delete reply');
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        (_filters['global'] as any).value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // Subject dropdown options
    const subjectOptions = [{ label: 'General (All Courses)', value: '' }, ...subjects.map((s) => ({ label: `${s.code} - ${s.name}`, value: s._id }))];

    // Templates
    const leftToolbarTemplate = () => (
        <div className="flex gap-2 flex-wrap align-items-center">
            <Button label="New Announcement" icon="pi pi-plus" severity="success" onClick={openNew} />
            <Dropdown value={selectedPriority} options={[{ label: 'All Priorities', value: '' }, ...priorityOptions]} onChange={(e) => setSelectedPriority(e.value)} placeholder="Filter by Priority" className="w-auto" showClear />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search announcements..." />
            </span>
            <Button icon="pi pi-refresh" severity="info" onClick={fetchAnnouncements} loading={loading} tooltip="Refresh" />
        </div>
    );

    const priorityBodyTemplate = (rowData: Announcement) => {
        const priorityConfig: Record<AnnouncementPriority, { severity: 'success' | 'info' | 'warning' | 'danger'; icon: string }> = {
            low: { severity: 'success', icon: 'pi pi-circle' },
            medium: { severity: 'info', icon: 'pi pi-circle-fill' },
            high: { severity: 'warning', icon: 'pi pi-exclamation-circle' },
            urgent: { severity: 'danger', icon: 'pi pi-exclamation-triangle' }
        };
        const config = priorityConfig[rowData.priority];

        return <Tag value={rowData.priority.charAt(0).toUpperCase() + rowData.priority.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const titleBodyTemplate = (rowData: Announcement) => {
        return (
            <div className="flex align-items-center gap-2">
                {rowData.isPinned && <i className="pi pi-bookmark-fill text-yellow-500" title="Pinned"></i>}
                <span className="font-semibold">{rowData.title}</span>
            </div>
        );
    };

    const courseBodyTemplate = (rowData: Announcement) => {
        const subject = typeof rowData.subjectId === 'object' ? rowData.subjectId : null;
        if (!subject) return <Tag value="General" severity="info" />;
        return (
            <div>
                <div className="font-semibold text-sm">{subject.code}</div>
                <small className="text-500">{subject.name}</small>
            </div>
        );
    };

    const authorBodyTemplate = (rowData: Announcement) => {
        const person = typeof rowData.addedBy === 'object' ? rowData.addedBy : null;
        if (!person) return <span className="text-500">-</span>;

        return (
            <div className="flex align-items-center gap-2">
                {person.photoLink ? <Avatar image={person.photoLink} shape="circle" size="normal" /> : <Avatar icon="pi pi-user" shape="circle" size="normal" />}
                <span className="text-sm">
                    {person.firstName} {person.lastName}
                </span>
            </div>
        );
    };

    const dateBodyTemplate = (rowData: Announcement) => {
        const date = new Date(rowData.announcementDate);
        return (
            <div>
                <div className="text-sm">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <small className="text-500">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
            </div>
        );
    };

    const statsBodyTemplate = (rowData: Announcement) => {
        return (
            <div className="flex gap-3">
                <div className="flex align-items-center gap-1" title="Views">
                    <i className="pi pi-eye text-500"></i>
                    <span className="text-sm">{rowData.viewCount}</span>
                </div>
                <div className="flex align-items-center gap-1" title="Replies">
                    <i className="pi pi-comments text-500"></i>
                    <span className="text-sm">{rowData.announcementReply?.length || 0}</span>
                </div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: Announcement) => (
        <div className="flex gap-1">
            <Button icon="pi pi-eye" rounded outlined severity="help" onClick={() => openView(rowData)} tooltip="View" tooltipOptions={{ position: 'top' }} />
            <Button icon={rowData.isPinned ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'} rounded outlined severity="warning" onClick={() => togglePin(rowData)} tooltip={rowData.isPinned ? 'Unpin' : 'Pin'} tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteAnnouncement(rowData._id!)} tooltip="Archive" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update' : 'Publish'} icon="pi pi-check" onClick={saveAnnouncement} loading={loading} />
        </div>
    );

    const content = (
        <>
            <Toast ref={toastRef} />
            <ConfirmDialog />

            {/* Header */}
            {!embedded && (
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Announcements</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage course and general announcements</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Badge value={announcements.length.toString()} severity="info" />
                        <i className="pi pi-megaphone text-4xl md:text-5xl text-primary"></i>
                    </div>
                </div>
            )}

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={announcements}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                dataKey="_id"
                filters={filters}
                globalFilterFields={['title', 'content', 'priority']}
                emptyMessage="No announcements found"
                className="datatable-responsive"
                responsiveLayout="scroll"
                stripedRows
            >
                <Column body={titleBodyTemplate} header="Title" sortable field="title" style={{ minWidth: '250px' }} />
                <Column body={courseBodyTemplate} header="Course" style={{ minWidth: '150px' }} />
                <Column body={priorityBodyTemplate} header="Priority" field="priority" sortable style={{ minWidth: '100px' }} />
                <Column body={authorBodyTemplate} header="Author" style={{ minWidth: '150px' }} />
                <Column body={dateBodyTemplate} header="Date" sortable field="announcementDate" style={{ minWidth: '130px' }} />
                <Column body={statsBodyTemplate} header="Stats" style={{ minWidth: '100px' }} />
                <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '180px' }} />
            </DataTable>

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '700px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        {isEditMode ? <i className="pi pi-pencil text-primary"></i> : <i className="pi pi-megaphone text-primary"></i>}
                        <span>{isEditMode ? 'Edit Announcement' : 'New Announcement'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="title" className="font-semibold text-900 mb-2 block">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <InputText id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Announcement title..." className="w-full" />
                    </div>

                    {!propSubjectId && (
                        <div className="col-12 md:col-6">
                            <label htmlFor="subjectId" className="font-semibold text-900 mb-2 block">
                                Course <span className="text-red-500">*</span>
                            </label>
                            <Dropdown id="subjectId" value={formData.subjectId} options={subjectOptions} onChange={(e) => setFormData({ ...formData, subjectId: e.value })} placeholder="Select a course" className="w-full" filter />
                        </div>
                    )}

                    <div className="col-12 md:col-6">
                        <label htmlFor="priority" className="font-semibold text-900 mb-2 block">
                            Priority
                        </label>
                        <Dropdown id="priority" value={formData.priority} options={priorityOptions} onChange={(e) => setFormData({ ...formData, priority: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="targetAudience" className="font-semibold text-900 mb-2 block">
                            Target Audience
                        </label>
                        <Dropdown id="targetAudience" value={formData.targetAudience} options={audienceOptions} onChange={(e) => setFormData({ ...formData, targetAudience: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="announcementDate" className="font-semibold text-900 mb-2 block">
                            Publish Date
                        </label>
                        <Calendar
                            id="announcementDate"
                            value={formData.announcementDate ? new Date(formData.announcementDate) : null}
                            onChange={(e) => setFormData({ ...formData, announcementDate: e.value?.toISOString() || '' })}
                            showIcon
                            showTime
                            className="w-full"
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="runTill" className="font-semibold text-900 mb-2 block">
                            Expires On
                        </label>
                        <Calendar
                            id="runTill"
                            value={formData.runTill ? new Date(formData.runTill) : null}
                            onChange={(e) => setFormData({ ...formData, runTill: e.value?.toISOString() || '' })}
                            showIcon
                            showTime
                            className="w-full"
                            placeholder="Optional"
                        />
                    </div>

                    <div className="col-12">
                        <label htmlFor="content" className="font-semibold text-900 mb-2 block">
                            Content <span className="text-red-500">*</span>
                        </label>
                        <Editor id="content" value={formData.content} onTextChange={(e) => setFormData((prev) => ({ ...prev, content: e.htmlValue || '' }))} style={{ height: '200px' }} />
                    </div>

                    <div className="col-12">
                        <div className="flex gap-4 flex-wrap">
                            <div className="flex align-items-center gap-2">
                                <Checkbox inputId="isPinned" checked={formData.isPinned} onChange={(e) => setFormData({ ...formData, isPinned: e.checked || false })} />
                                <label htmlFor="isPinned" className="cursor-pointer">
                                    Pin this announcement
                                </label>
                            </div>
                            <div className="flex align-items-center gap-2">
                                <Checkbox inputId="sendEmail" checked={formData.sendEmail} onChange={(e) => setFormData({ ...formData, sendEmail: e.checked || false })} />
                                <label htmlFor="sendEmail" className="cursor-pointer">
                                    Send email notification
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* View Announcement Dialog */}
            <Dialog
                visible={viewDialogVisible}
                style={{ width: '95vw', maxWidth: '800px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-megaphone text-primary"></i>
                        <span>Announcement Details</span>
                    </div>
                }
                modal
                onHide={hideViewDialog}
            >
                {selectedAnnouncement && (
                    <div>
                        <div className="mb-4">
                            <div className="flex align-items-center justify-content-between mb-3">
                                <h3 className="m-0 text-900">{selectedAnnouncement.title}</h3>
                                {priorityBodyTemplate(selectedAnnouncement)}
                            </div>

                            <div className="flex align-items-center gap-4 mb-3 text-500 text-sm">
                                {authorBodyTemplate(selectedAnnouncement)}
                                <span>•</span>
                                <span>{new Date(selectedAnnouncement.announcementDate).toLocaleString()}</span>
                                <span>•</span>
                                <span>
                                    <i className="pi pi-eye mr-1"></i>
                                    {selectedAnnouncement.viewCount} views
                                </span>
                            </div>

                            <div className="surface-100 border-round p-3" dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} />
                        </div>

                        <Divider />

                        <div>
                            <h4 className="text-900 mb-3">
                                <i className="pi pi-comments mr-2"></i>
                                Replies ({selectedAnnouncement.announcementReply?.length || 0})
                            </h4>

                            {selectedAnnouncement.announcementReply?.length === 0 && <p className="text-500 text-center p-3">No replies yet. Be the first to respond!</p>}

                            <div className="flex flex-column gap-3 mb-4">
                                {selectedAnnouncement.announcementReply?.map((reply, index) => {
                                    const person = typeof reply.personId === 'object' ? reply.personId : null;
                                    const isOwner = person?._id === user?.id;

                                    return (
                                        <div key={index} className="surface-50 border-round p-3">
                                            <div className="flex align-items-center justify-content-between mb-2">
                                                <div className="flex align-items-center gap-2">
                                                    {person?.photoLink ? <Avatar image={person.photoLink} shape="circle" size="normal" /> : <Avatar icon="pi pi-user" shape="circle" size="normal" />}
                                                    <div>
                                                        <div className="font-semibold text-900">
                                                            {person?.firstName} {person?.lastName}
                                                        </div>
                                                        <small className="text-500">{new Date(reply.repliedAt).toLocaleString()}</small>
                                                    </div>
                                                </div>
                                                {isOwner && <Button icon="pi pi-trash" rounded text severity="danger" size="small" onClick={() => deleteReply(index)} tooltip="Delete reply" />}
                                            </div>
                                            <p className="m-0 text-700">{reply.content}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2">
                                <InputTextarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={2} placeholder="Write a reply..." className="flex-grow-1" />
                                <Button icon="pi pi-send" onClick={addReply} disabled={!replyContent.trim()} tooltip="Send reply" />
                            </div>
                        </div>
                    </div>
                )}
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

export default LMSAnnouncementManagement;
