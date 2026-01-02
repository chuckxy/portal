'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { useAuth } from '@/context/AuthContext';

interface ScholarshipBodyData {
    _id?: string;
    name: string;
    contactPerson?: string;
    contactPhone?: string;
    contactEmail?: string;
    school?: any;
}

const ScholarshipBodyManagement: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // Data state
    const [scholarshipBodies, setScholarshipBodies] = useState<ScholarshipBodyData[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [formData, setFormData] = useState<ScholarshipBodyData>({
        name: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        school: null
    });
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        fetchSchools();
        fetchScholarshipBodies();
    }, []);

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
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchScholarshipBodies = async () => {
        setLoading(true);
        try {
            let url = '/api/scholarship-bodies';
            if (user?.school) {
                url += `?school=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setScholarshipBodies(Array.isArray(data) ? data : data.scholarshipBodies || []);
        } catch (error) {
            console.error('Error fetching scholarship bodies:', error);
            showToast('error', 'Error', 'Failed to load scholarship bodies');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 4000 });
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.name || formData.name.trim().length === 0) {
            newErrors.name = 'Organization name is required';
        }

        if (formData.contactEmail && !/^\S+@\S+\.\S+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Invalid email format';
        }

        if (formData.contactPhone && !/^[\d\s\+\-\(\)]+$/.test(formData.contactPhone)) {
            newErrors.contactPhone = 'Invalid phone number format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openNew = () => {
        setFormData({
            name: '',
            contactPerson: '',
            contactPhone: '',
            contactEmail: '',
            school: user?.school ? schools.find((s) => s._id === user.school) : null
        });
        setErrors({});
        setEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (body: ScholarshipBodyData) => {
        setFormData({ ...body });
        setErrors({});
        setEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setErrors({});
    };

    const saveScholarshipBody = async () => {
        if (!validateForm()) {
            showToast('warn', 'Validation Error', 'Please fill all required fields correctly');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                school: formData.school?._id || formData.school || user?.school
            };

            const url = editMode ? `/api/scholarship-bodies/${formData._id}` : '/api/scholarship-bodies';
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('success', 'Success', `Scholarship body ${editMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchScholarshipBodies();
            } else {
                showToast('error', 'Error', data.error || 'Failed to save scholarship body');
            }
        } catch (error) {
            console.error('Error saving scholarship body:', error);
            showToast('error', 'Error', 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (body: ScholarshipBodyData) => {
        confirmDialog({
            message: `Delete scholarship body "${body.name}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteScholarshipBody(body._id!)
        });
    };

    const deleteScholarshipBody = async (id: string) => {
        try {
            const response = await fetch(`/api/scholarship-bodies/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('success', 'Deleted', 'Scholarship body deleted successfully');
                fetchScholarshipBodies();
            } else {
                const data = await response.json();
                showToast('error', 'Error', data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting scholarship body:', error);
            showToast('error', 'Error', 'An error occurred while deleting');
        }
    };

    // Table templates
    const actionBodyTemplate = (rowData: ScholarshipBodyData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const contactBodyTemplate = (rowData: ScholarshipBodyData) => {
        return (
            <div className="flex flex-column gap-1">
                {rowData.contactPerson && (
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-user text-500" style={{ fontSize: '0.9rem' }} />
                        <span className="text-sm">{rowData.contactPerson}</span>
                    </div>
                )}
                {rowData.contactEmail && (
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-envelope text-500" style={{ fontSize: '0.9rem' }} />
                        <span className="text-sm">{rowData.contactEmail}</span>
                    </div>
                )}
                {rowData.contactPhone && (
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-phone text-500" style={{ fontSize: '0.9rem' }} />
                        <span className="text-sm">{rowData.contactPhone}</span>
                    </div>
                )}
                {!rowData.contactPerson && !rowData.contactEmail && !rowData.contactPhone && <Tag severity="info" value="No contact info" />}
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Add Scholarship Body" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchScholarshipBodies} loading={loading} />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={saving} />
            <Button label={editMode ? 'Update' : 'Save'} icon="pi pi-check" onClick={saveScholarshipBody} loading={saving} />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card title="Scholarship Body Management" subTitle="Manage scholarship organizations and funding bodies">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={scholarshipBodies}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    emptyMessage="No scholarship bodies found"
                    className="datatable-responsive"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} scholarship bodies"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                >
                    <Column field="name" header="Organization Name" sortable style={{ minWidth: '200px' }} />
                    <Column header="Contact Information" body={contactBodyTemplate} style={{ minWidth: '250px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ width: '120px' }} />
                </DataTable>
            </Card>

            {/* Dialog Form */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-building text-primary text-2xl" />
                        <span>{editMode ? 'Edit Scholarship Body' : 'Add New Scholarship Body'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="formgrid grid">
                    <div className="field col-12">
                        <label htmlFor="name" className="font-semibold">
                            Organization Name <span className="text-red-500">*</span>
                        </label>
                        <InputText id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter scholarship body or organization name" className={errors.name ? 'p-invalid' : ''} />
                        {errors.name && <small className="p-error">{errors.name}</small>}
                    </div>

                    <div className="field col-12">
                        <label htmlFor="contactPerson" className="font-semibold">
                            Contact Person
                        </label>
                        <InputText id="contactPerson" value={formData.contactPerson || ''} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} placeholder="Enter contact person name" />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="contactPhone" className="font-semibold">
                            Contact Phone
                        </label>
                        <InputText
                            id="contactPhone"
                            value={formData.contactPhone || ''}
                            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            placeholder="e.g., +233 24 123 4567"
                            className={errors.contactPhone ? 'p-invalid' : ''}
                        />
                        {errors.contactPhone && <small className="p-error">{errors.contactPhone}</small>}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="contactEmail" className="font-semibold">
                            Contact Email
                        </label>
                        <InputText
                            id="contactEmail"
                            value={formData.contactEmail || ''}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            placeholder="e.g., contact@organization.com"
                            className={errors.contactEmail ? 'p-invalid' : ''}
                        />
                        {errors.contactEmail && <small className="p-error">{errors.contactEmail}</small>}
                    </div>

                    {!user?.school && (
                        <div className="field col-12">
                            <label htmlFor="school" className="font-semibold">
                                School
                            </label>
                            <Dropdown id="school" value={formData.school} options={schools} onChange={(e) => setFormData({ ...formData, school: e.value })} optionLabel="name" placeholder="Select school" filter />
                        </div>
                    )}
                </div>
            </Dialog>
        </>
    );
};

export default ScholarshipBodyManagement;
