'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { InputSwitch } from 'primereact/inputswitch';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { useAuth } from '@/context/AuthContext';

interface FeeDeterminant {
    _id?: string;
    determinant: string;
    description: string;
    amount: number;
    school: any;
    schoolSite?: any;
    isActive: boolean;
}

const FeeDeterminantManagement: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // State
    const [feeDeterminants, setFeeDeterminants] = useState<FeeDeterminant[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState<FeeDeterminant>({
        determinant: '',
        description: '',
        amount: 0,
        school: null,
        schoolSite: null,
        isActive: true
    });

    // Validation errors
    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        fetchSchools();
        if (user?.school) {
            fetchFeeDeterminants();
        }
    }, [user]);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school._id || formData.school);
        } else {
            setSites([]);
        }
    }, [formData.school]);

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

            if (user?.school && schoolsData.length > 0) {
                const userSchool = schoolsData.find((s: any) => s._id === user.school) || schoolsData[0];
                setFormData((prev) => ({ ...prev, school: userSchool }));
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchSites = async (schoolId: string) => {
        try {
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setSites(Array.isArray(data.sites) ? data.sites : []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchFeeDeterminants = async () => {
        setLoading(true);
        try {
            let url = '/api/fee-determinants';
            if (user?.school) {
                url += `?school=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setFeeDeterminants(Array.isArray(data) ? data : data.feeDeterminants || []);
        } catch (error) {
            console.error('Error fetching fee determinants:', error);
            showToast('error', 'Error', 'Failed to load fee determinants');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 4000 });
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.determinant?.trim()) {
            newErrors.determinant = 'Fee item name is required';
        }

        if (!formData.description?.trim()) {
            newErrors.description = 'Description is required';
        }

        if (formData.amount === null || formData.amount === undefined || formData.amount < 0) {
            newErrors.amount = 'Amount must be 0 or greater';
        }

        if (!formData.school) {
            newErrors.school = 'School is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openNew = () => {
        setFormData({
            determinant: '',
            description: '',
            amount: 0,
            school: user?.school ? schools.find((s) => s._id === user.school) : null,
            schoolSite: null,
            isActive: true
        });
        setErrors({});
        setEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (feeDeterminant: FeeDeterminant) => {
        setFormData({ ...feeDeterminant });
        setErrors({});
        setEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setErrors({});
    };

    const saveDeterminant = async () => {
        if (!validateForm()) {
            showToast('warn', 'Validation Error', 'Please fill all required fields correctly');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                determinant: formData.determinant.trim(),
                description: formData.description.trim(),
                amount: formData.amount,
                school: formData.school._id || formData.school,
                schoolSite: formData.schoolSite ? formData.schoolSite._id || formData.schoolSite : undefined,
                isActive: formData.isActive
            };

            const url = editMode ? `/api/fee-determinants/${formData._id}` : '/api/fee-determinants';
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('success', 'Success', `Fee determinant ${editMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchFeeDeterminants();
            } else {
                showToast('error', 'Error', data.error || 'Failed to save fee determinant');
            }
        } catch (error) {
            console.error('Error saving fee determinant:', error);
            showToast('error', 'Error', 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (feeDeterminant: FeeDeterminant) => {
        confirmDialog({
            message: `Are you sure you want to delete "${feeDeterminant.determinant}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteDeterminant(feeDeterminant._id!)
        });
    };

    const deleteDeterminant = async (id: string) => {
        try {
            const response = await fetch(`/api/fee-determinants/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('success', 'Deleted', 'Fee determinant deleted successfully');
                fetchFeeDeterminants();
            } else {
                const data = await response.json();
                showToast('error', 'Error', data.error || 'Failed to delete fee determinant');
            }
        } catch (error) {
            console.error('Error deleting fee determinant:', error);
            showToast('error', 'Error', 'An error occurred while deleting');
        }
    };

    const toggleStatus = async (feeDeterminant: FeeDeterminant) => {
        try {
            const response = await fetch(`/api/fee-determinants/${feeDeterminant._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...feeDeterminant,
                    school: feeDeterminant.school._id || feeDeterminant.school,
                    schoolSite: feeDeterminant.schoolSite ? feeDeterminant.schoolSite._id || feeDeterminant.schoolSite : undefined,
                    isActive: !feeDeterminant.isActive
                })
            });

            if (response.ok) {
                showToast('success', 'Updated', `Fee determinant ${!feeDeterminant.isActive ? 'activated' : 'deactivated'}`);
                fetchFeeDeterminants();
            } else {
                const data = await response.json();
                showToast('error', 'Error', data.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('error', 'Error', 'An error occurred while updating status');
        }
    };

    // Template functions
    const amountBodyTemplate = (rowData: FeeDeterminant) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(rowData.amount);
    };

    const statusBodyTemplate = (rowData: FeeDeterminant) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const siteBodyTemplate = (rowData: FeeDeterminant) => {
        return rowData.schoolSite?.name || <span className="text-500">All Sites</span>;
    };

    const actionBodyTemplate = (rowData: FeeDeterminant) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button
                    icon={rowData.isActive ? 'pi pi-times-circle' : 'pi pi-check-circle'}
                    className={`p-button-rounded p-button-text ${rowData.isActive ? 'p-button-warning' : 'p-button-success'}`}
                    onClick={() => toggleStatus(rowData)}
                    tooltip={rowData.isActive ? 'Deactivate' : 'Activate'}
                    tooltipOptions={{ position: 'top' }}
                />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Add Fee Item" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchFeeDeterminants} loading={loading} />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={saving} />
            <Button label={editMode ? 'Update' : 'Save'} icon="pi pi-check" onClick={saveDeterminant} loading={saving} />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card title="Fee Determinants Management" subTitle="Manage school fee items and charges">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={feeDeterminants}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    emptyMessage="No fee determinants found"
                    className="datatable-responsive"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} fee items"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                >
                    <Column field="determinant" header="Fee Item" sortable style={{ minWidth: '180px' }} />
                    <Column field="description" header="Description" sortable style={{ minWidth: '250px' }} />
                    <Column field="amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '120px' }} />
                    <Column field="schoolSite.name" header="Site" body={siteBodyTemplate} sortable style={{ minWidth: '150px' }} />
                    <Column field="isActive" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-money-bill text-primary text-2xl" />
                        <span>{editMode ? 'Edit Fee Determinant' : 'Add New Fee Determinant'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="formgrid grid">
                    {/* School Selection */}
                    <div className="field col-12">
                        <label htmlFor="school" className="font-semibold">
                            School <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="school"
                            value={formData.school}
                            options={schools}
                            onChange={(e) => setFormData({ ...formData, school: e.value, schoolSite: null })}
                            optionLabel="name"
                            placeholder="Select a school"
                            filter
                            disabled={!!user?.school}
                            className={errors.school ? 'p-invalid' : ''}
                        />
                        {errors.school && <small className="p-error">{errors.school}</small>}
                    </div>

                    {/* Site Selection (Optional) */}
                    <div className="field col-12">
                        <label htmlFor="schoolSite" className="font-semibold">
                            School Site <span className="text-500">(Optional - Leave empty for all sites)</span>
                        </label>
                        <Dropdown
                            id="schoolSite"
                            value={formData.schoolSite}
                            options={sites}
                            onChange={(e) => setFormData({ ...formData, schoolSite: e.value })}
                            optionLabel="siteName"
                            placeholder="Select a site (optional)"
                            filter
                            showClear
                            disabled={!formData.school || sites.length === 0}
                        />
                        {sites.length === 0 && formData.school && <small className="text-500">No sites available for this school</small>}
                    </div>

                    <Divider className="col-12 m-0" />

                    {/* Fee Item Name */}
                    <div className="field col-12">
                        <label htmlFor="determinant" className="font-semibold">
                            Fee Item Name <span className="text-red-500">*</span>
                        </label>
                        <InputText
                            id="determinant"
                            value={formData.determinant}
                            onChange={(e) => setFormData({ ...formData, determinant: e.target.value })}
                            placeholder="e.g., Tuition, Books, Transport, Boarding"
                            className={errors.determinant ? 'p-invalid' : ''}
                            autoFocus
                        />
                        {errors.determinant && <small className="p-error">{errors.determinant}</small>}
                        <small className="text-500">Enter a clear name for this fee item</small>
                    </div>

                    {/* Description */}
                    <div className="field col-12">
                        <label htmlFor="description" className="font-semibold">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <InputTextarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Provide a detailed description of this fee..."
                            rows={3}
                            className={errors.description ? 'p-invalid' : ''}
                        />
                        {errors.description && <small className="p-error">{errors.description}</small>}
                    </div>

                    {/* Amount */}
                    <div className="field col-12 md:col-6">
                        <label htmlFor="amount" className="font-semibold">
                            Amount (GHS) <span className="text-red-500">*</span>
                        </label>
                        <InputNumber
                            id="amount"
                            value={formData.amount}
                            onValueChange={(e) => setFormData({ ...formData, amount: e.value || 0 })}
                            mode="currency"
                            currency="GHS"
                            locale="en-GH"
                            min={0}
                            className={errors.amount ? 'p-invalid' : ''}
                            placeholder="0.00"
                        />
                        {errors.amount && <small className="p-error">{errors.amount}</small>}
                    </div>

                    {/* Status */}
                    <div className="field col-12 md:col-6">
                        <label htmlFor="isActive" className="font-semibold">
                            Status
                        </label>
                        <div className="flex align-items-center gap-2 mt-2">
                            <InputSwitch id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.value })} />
                            <label htmlFor="isActive" className="mb-0">
                                {formData.isActive ? 'Active' : 'Inactive'}
                            </label>
                        </div>
                        <small className="text-500">Only active fee items can be used in fee configurations</small>
                    </div>

                    {/* Info Message */}
                    <div className="col-12">
                        <Message severity="info" text="Fee determinants are reusable fee items that can be added to class fee configurations. Create them once and use them across multiple classes." />
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default FeeDeterminantManagement;
