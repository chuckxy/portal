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
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Badge } from 'primereact/badge';
import { ProgressBar } from 'primereact/progressbar';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { useAuth } from '@/context/AuthContext';

// Types
type EnrollmentStatus = 'enrolled' | 'completed' | 'dropped' | 'suspended';
type EnrollmentSource = 'manual' | 'self' | 'bulk' | 'api';

interface Subject {
    _id: string;
    name: string;
    code: string;
    description?: string;
}

interface Person {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
    photoLink?: string;
    studentNo?: string;
}

interface Enrollment {
    _id?: string;
    subjectId: string | Subject;
    personId: string | Person;
    schoolSiteId: string;
    enrolledBy: string | Person;
    enrollmentDate: string;
    completionDate?: string;
    expiryDate?: string;
    status: EnrollmentStatus;
    progressPercentage: number;
    lastAccessedAt?: string;
    totalTimeSpent: number;
    finalGrade?: number;
    enrollmentSource: EnrollmentSource;
    notes?: string;
    isActive: boolean;
    createdAt?: string;
}

interface DropdownOption {
    label: string;
    value: string;
}

const statusOptions: DropdownOption[] = [
    { label: '✓ Enrolled', value: 'enrolled' },
    { label: '🎓 Completed', value: 'completed' },
    { label: '✗ Dropped', value: 'dropped' },
    { label: '⏸ Suspended', value: 'suspended' }
];

const enrollmentSourceOptions: DropdownOption[] = [
    { label: 'Manual', value: 'manual' },
    { label: 'Self-Enrollment', value: 'self' },
    { label: 'Bulk Import', value: 'bulk' },
    { label: 'API', value: 'api' }
];

interface LMSEnrollmentManagementProps {
    subjectId?: string;
    personId?: string;
    embedded?: boolean;
}

const LMSEnrollmentManagement: React.FC<LMSEnrollmentManagementProps> = ({ subjectId: propSubjectId, personId: propPersonId, embedded = false }) => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);

    // State
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Search state
    const [filteredStudents, setFilteredStudents] = useState<Person[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

    // Form state
    const [formData, setFormData] = useState<Enrollment>(getEmptyEnrollment());

    // Filters
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    function getEmptyEnrollment(): Enrollment {
        return {
            subjectId: propSubjectId || '',
            personId: propPersonId || '',
            schoolSiteId: user?.schoolSite || '',
            enrolledBy: user?.id || '',
            enrollmentDate: new Date().toISOString(),
            expiryDate: '',
            status: 'enrolled',
            progressPercentage: 0,
            totalTimeSpent: 0,
            enrollmentSource: 'manual',
            notes: '',
            isActive: true
        };
    }

    useEffect(() => {
        if (user?.schoolSite) {
            fetchSubjects();
            fetchStudents();
            fetchEnrollments();
        }
    }, [user, selectedStatus]);

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

    const fetchStudents = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            params.append('isStudent', 'true');
            params.append('limit', '1000');

            const response = await fetch(`/api/persons?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setStudents(data.persons || []);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (user?.schoolSite) params.append('schoolSiteId', user.schoolSite);
            if (propSubjectId) params.append('subjectId', propSubjectId);
            if (propPersonId) params.append('personId', propPersonId);
            if (selectedStatus) params.append('status', selectedStatus);

            const response = await fetch(`/api/lms/enrollments?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setEnrollments(data.enrollments || []);
            } else {
                showToast('error', 'Error', 'Failed to load enrollments');
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
            showToast('error', 'Error', 'Failed to load enrollments');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const searchStudent = (event: AutoCompleteCompleteEvent) => {
        const query = event.query.toLowerCase();
        const filtered = students.filter((student) => `${student.firstName} ${student.lastName}`.toLowerCase().includes(query) || student.email?.toLowerCase().includes(query) || student.studentNo?.toLowerCase().includes(query));
        setFilteredStudents(filtered);
    };

    const searchSubject = (event: AutoCompleteCompleteEvent) => {
        const query = event.query.toLowerCase();
        const filtered = subjects.filter((subject) => subject.name.toLowerCase().includes(query) || subject.code.toLowerCase().includes(query));
        setFilteredSubjects(filtered);
    };

    const openNew = () => {
        setFormData({
            ...getEmptyEnrollment(),
            subjectId: propSubjectId || '',
            personId: propPersonId || ''
        });
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (enrollment: Enrollment) => {
        setFormData({
            ...enrollment,
            subjectId: typeof enrollment.subjectId === 'object' ? enrollment.subjectId._id : enrollment.subjectId,
            personId: typeof enrollment.personId === 'object' ? enrollment.personId._id : enrollment.personId,
            enrolledBy: typeof enrollment.enrolledBy === 'object' ? enrollment.enrolledBy._id : enrollment.enrolledBy
        });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyEnrollment());
    };

    const saveEnrollment = async () => {
        // Extract IDs from objects if needed
        const subjectId = typeof formData.subjectId === 'object' ? formData.subjectId._id : formData.subjectId;
        const personId = typeof formData.personId === 'object' ? formData.personId._id : formData.personId;

        if (!subjectId || !personId) {
            showToast('error', 'Validation Error', 'Please select both a student and a course');
            return;
        }

        try {
            setLoading(true);
            const url = isEditMode ? `/api/lms/enrollments/${formData._id}` : '/api/lms/enrollments';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    subjectId,
                    personId
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Enrollment ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchEnrollments();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to save enrollment');
            }
        } catch (error) {
            console.error('Error saving enrollment:', error);
            showToast('error', 'Error', 'An error occurred while saving enrollment');
        } finally {
            setLoading(false);
        }
    };

    const deleteEnrollment = async (enrollmentId: string) => {
        confirmDialog({
            message: 'Are you sure you want to remove this enrollment?',
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const response = await fetch(`/api/lms/enrollments/${enrollmentId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Enrollment removed successfully');
                        fetchEnrollments();
                    } else {
                        showToast('error', 'Error', 'Failed to remove enrollment');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred');
                }
            }
        });
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
        <div className="flex gap-2 flex-wrap align-items-center">
            <Button label="New Enrollment" icon="pi pi-plus" severity="success" onClick={openNew} />
            <Dropdown value={selectedStatus} options={[{ label: 'All Status', value: '' }, ...statusOptions]} onChange={(e) => setSelectedStatus(e.value)} placeholder="Filter by Status" className="w-auto" showClear />
        </div>
    );

    const rightToolbarTemplate = () => (
        <div className="flex gap-2">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search enrollments..." />
            </span>
            <Button icon="pi pi-refresh" severity="info" onClick={fetchEnrollments} loading={loading} tooltip="Refresh" />
        </div>
    );

    const statusBodyTemplate = (rowData: Enrollment) => {
        const statusConfig: Record<EnrollmentStatus, { severity: 'success' | 'warning' | 'danger' | 'info'; icon: string }> = {
            enrolled: { severity: 'info', icon: 'pi pi-user-edit' },
            completed: { severity: 'success', icon: 'pi pi-check-circle' },
            dropped: { severity: 'danger', icon: 'pi pi-times-circle' },
            suspended: { severity: 'warning', icon: 'pi pi-pause-circle' }
        };
        const config = statusConfig[rowData.status];

        return <Tag value={rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)} severity={config.severity} icon={config.icon} />;
    };

    const studentBodyTemplate = (rowData: Enrollment) => {
        const person = typeof rowData.personId === 'object' ? rowData.personId : null;
        if (!person) return <span className="text-500">-</span>;

        return (
            <div className="flex align-items-center gap-2">
                {person.photoLink && <img src={person.photoLink} alt={`${person.firstName} ${person.lastName}`} className="w-2rem h-2rem border-circle" />}
                <div>
                    <div className="font-semibold">
                        {person.firstName} {person.lastName}
                    </div>
                    {person.studentNo && <small className="text-500">{person.studentNo}</small>}
                </div>
            </div>
        );
    };

    const courseBodyTemplate = (rowData: Enrollment) => {
        const subject = typeof rowData.subjectId === 'object' ? rowData.subjectId : null;
        if (!subject) return <span className="text-500">-</span>;

        return (
            <div>
                <div className="font-semibold">{subject.name}</div>
                <small className="text-500">{subject.code}</small>
            </div>
        );
    };

    const progressBodyTemplate = (rowData: Enrollment) => {
        return (
            <div className="flex flex-column gap-1">
                <ProgressBar value={rowData.progressPercentage} showValue={false} style={{ height: '6px' }} />
                <small className="text-500">{rowData.progressPercentage}% Complete</small>
            </div>
        );
    };

    const dateBodyTemplate = (rowData: Enrollment) => {
        const date = new Date(rowData.enrollmentDate);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const timeSpentBodyTemplate = (rowData: Enrollment) => {
        const hours = Math.floor(rowData.totalTimeSpent / 3600);
        const minutes = Math.floor((rowData.totalTimeSpent % 3600) / 60);
        if (hours === 0 && minutes === 0) return <span className="text-500">-</span>;
        return (
            <span>
                {hours > 0 ? `${hours}h ` : ''}
                {minutes}m
            </span>
        );
    };

    const actionBodyTemplate = (rowData: Enrollment) => (
        <div className="flex gap-1">
            <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-chart-line" rounded outlined severity="help" tooltip="View Progress" tooltipOptions={{ position: 'top' }} />
            <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteEnrollment(rowData._id!)} tooltip="Remove" tooltipOptions={{ position: 'top' }} />
        </div>
    );

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Enrollment' : 'Create Enrollment'} icon="pi pi-check" onClick={saveEnrollment} loading={loading} />
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
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">Enrollment Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage student enrollments in LMS courses</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Badge value={enrollments.length.toString()} severity="info" />
                        <i className="pi pi-users text-4xl md:text-5xl text-primary"></i>
                    </div>
                </div>
            )}

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={enrollments}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                dataKey="_id"
                filters={filters}
                globalFilterFields={['personId.firstName', 'personId.lastName', 'subjectId.name', 'status']}
                emptyMessage="No enrollments found"
                className="datatable-responsive"
                responsiveLayout="scroll"
                stripedRows
            >
                <Column body={studentBodyTemplate} header="Student" sortable style={{ minWidth: '200px' }} />
                <Column body={courseBodyTemplate} header="Course" sortable style={{ minWidth: '200px' }} />
                <Column body={statusBodyTemplate} header="Status" field="status" sortable style={{ minWidth: '120px' }} />
                <Column body={progressBodyTemplate} header="Progress" style={{ minWidth: '150px' }} />
                <Column body={dateBodyTemplate} header="Enrolled" sortable field="enrollmentDate" style={{ minWidth: '120px' }} />
                <Column body={timeSpentBodyTemplate} header="Time Spent" style={{ minWidth: '100px' }} />
                <Column body={actionBodyTemplate} header="Actions" style={{ minWidth: '150px' }} />
            </DataTable>

            {/* Create/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '95vw', maxWidth: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className={`pi ${isEditMode ? 'pi-pencil' : 'pi-plus'} text-primary`}></i>
                        <span>{isEditMode ? 'Edit Enrollment' : 'New Enrollment'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="grid">
                    {!propPersonId && (
                        <div className="col-12">
                            <label htmlFor="personId" className="font-semibold text-900 mb-2 block">
                                Student <span className="text-red-500">*</span>
                            </label>
                            <AutoComplete
                                id="personId"
                                value={formData.personId}
                                suggestions={filteredStudents}
                                completeMethod={searchStudent}
                                field={'firstName'}
                                onChange={(e) => setFormData({ ...formData, personId: e.value })}
                                placeholder="Search by name or student number..."
                                disabled={isEditMode}
                                className="w-full"
                            />
                        </div>
                    )}

                    {!propSubjectId && (
                        <div className="col-12">
                            <label htmlFor="subjectId" className="font-semibold text-900 mb-2 block">
                                Course <span className="text-red-500">*</span>
                            </label>
                            <AutoComplete
                                id="subjectId"
                                value={formData.subjectId}
                                suggestions={filteredSubjects}
                                completeMethod={searchSubject}
                                field={'name'}
                                onChange={(e) => setFormData({ ...formData, subjectId: e.value })}
                                placeholder="Search by course code or name..."
                                disabled={isEditMode}
                                className="w-full"
                            />
                        </div>
                    )}

                    <div className="col-12 md:col-6">
                        <label htmlFor="status" className="font-semibold text-900 mb-2 block">
                            Status
                        </label>
                        <Dropdown id="status" value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} className="w-full" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="expiryDate" className="font-semibold text-900 mb-2 block">
                            Expiry Date
                        </label>
                        <Calendar
                            id="expiryDate"
                            value={formData.expiryDate ? new Date(formData.expiryDate) : null}
                            onChange={(e) => setFormData({ ...formData, expiryDate: e.value?.toISOString() || '' })}
                            showIcon
                            className="w-full"
                            placeholder="Optional"
                        />
                    </div>

                    {isEditMode && (
                        <>
                            <div className="col-12 md:col-6">
                                <label htmlFor="progressPercentage" className="font-semibold text-900 mb-2 block">
                                    Progress (%)
                                </label>
                                <InputNumber id="progressPercentage" value={formData.progressPercentage} onValueChange={(e) => setFormData({ ...formData, progressPercentage: e.value || 0 })} min={0} max={100} suffix="%" className="w-full" />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="finalGrade" className="font-semibold text-900 mb-2 block">
                                    Final Grade
                                </label>
                                <InputNumber id="finalGrade" value={formData.finalGrade || 0} onValueChange={(e) => setFormData({ ...formData, finalGrade: e.value || undefined })} min={0} max={100} suffix="%" className="w-full" />
                            </div>
                        </>
                    )}

                    <div className="col-12">
                        <label htmlFor="notes" className="font-semibold text-900 mb-2 block">
                            Notes
                        </label>
                        <InputTextarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Optional notes about this enrollment..." className="w-full" />
                    </div>

                    {!isEditMode && (
                        <div className="col-12">
                            <div className="bg-blue-50 border-round p-3">
                                <div className="flex align-items-start gap-2">
                                    <i className="pi pi-info-circle text-blue-500 mt-1"></i>
                                    <div className="text-sm text-blue-900">
                                        <strong>Note:</strong> The student will be enrolled with 0% progress. Progress will be tracked automatically as they access course materials.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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

export default LMSEnrollmentManagement;
