'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { InputSwitch } from 'primereact/inputswitch';
import { Divider } from 'primereact/divider';
import { SelectButton } from 'primereact/selectbutton';
import { MultiSelect } from 'primereact/multiselect';
import { Chip } from 'primereact/chip';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Checkbox } from 'primereact/checkbox';
import { useAuth } from '@/context/AuthContext';
import { getAcademicYears } from '@/lib/utils/utilFunctions';

const TERM_OPTIONS = [
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

const APPLY_TO_OPTIONS = [
    { label: 'Specific Classes', value: 'class', icon: 'pi pi-users' },
    { label: 'Department', value: 'department', icon: 'pi pi-sitemap' }
];

interface FeeItem {
    _id?: string;
    determinant: string;
    description: string;
    amount: number;
    isOptional: boolean;
}

interface FeeConfiguration {
    _id?: string;
    site: any;
    class: any;
    academicYear: string;
    academicTerm?: number;
    configName?: string;
    feeItems: FeeItem[];
    totalAmount: number;
    currency: string;
    paymentDeadline?: Date;
    installmentAllowed: boolean;
    createdBy: any;
    isActive: boolean;
}

const FeeConfigurationManagement: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // State
    const [feeConfigurations, setFeeConfigurations] = useState<FeeConfiguration[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [availableFeeDeterminants, setAvailableFeeDeterminants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [applyToType, setApplyToType] = useState<'class' | 'department'>('class');
    const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
    const [selectedClasses, setSelectedClasses] = useState<any[]>([]);
    const [selectedFeeItems, setSelectedFeeItems] = useState<FeeItem[]>([]);

    const [formData, setFormData] = useState<any>({
        school: null,
        site: null,
        academicYear: getAcademicYears[0].value,
        academicTerm: 1,
        configName: '',
        paymentDeadline: null,
        installmentAllowed: true,
        currency: 'GHS',
        isActive: true
    });

    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        fetchSchools();
        if (user?.school) {
            fetchFeeConfigurations();
        }
    }, [user]);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school._id || formData.school);
        } else {
            setSites([]);
            setDepartments([]);
            setClasses([]);
        }
    }, [formData.school]);

    useEffect(() => {
        if (formData.site) {
            fetchDepartments(formData.site._id || formData.site);
            fetchClasses(formData.site._id || formData.site);
            fetchFeeDeterminants(formData.site._id || formData.site);
        } else {
            setDepartments([]);
            setClasses([]);
            setAvailableFeeDeterminants([]);
        }
    }, [formData.site]);

    useEffect(() => {
        if (applyToType === 'department' && selectedDepartment) {
            // Filter classes by department
            const departmentClasses = classes.filter((c) => (c.department?._id || c.department) === (selectedDepartment._id || selectedDepartment));
            setSelectedClasses(departmentClasses);
        }
    }, [applyToType, selectedDepartment, classes]);

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
                setFormData((prev: any) => ({ ...prev, school: userSchool }));
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

    const fetchDepartments = async (siteId: string) => {
        try {
            const response = await fetch(`/api/departments?site=${siteId}`);
            const data = await response.json();
            setDepartments(Array.isArray(data.departments) ? data.departments : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchClasses = async (siteId: string) => {
        try {
            const response = await fetch(`/api/classes?site=${siteId}`);
            const data = await response.json();
            setClasses(Array.isArray(data.classes) ? data.classes : []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchFeeDeterminants = async (siteId: string) => {
        try {
            const response = await fetch(`/api/fee-determinants?schoolSite=${siteId}&isActive=true`);
            const data = await response.json();
            setAvailableFeeDeterminants(data.feeDeterminants || []);
        } catch (error) {
            console.error('Error fetching fee determinants:', error);
        }
    };

    const fetchFeeConfigurations = async () => {
        setLoading(true);
        try {
            let url = '/api/fee-configurations';
            if (user?.school) {
                url += `?school=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            setFeeConfigurations(Array.isArray(data) ? data : data.feeConfigurations || []);
        } catch (error) {
            console.error('Error fetching fee configurations:', error);
            showToast('error', 'Error', 'Failed to load fee configurations');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 4000 });
    };

    const calculateTotalAmount = () => {
        return selectedFeeItems.reduce((sum, item) => sum + item.amount, 0);
    };

    const validateForm = () => {
        const newErrors: any = {};

        if (!formData.school) newErrors.school = 'School is required';
        if (!formData.site) newErrors.site = 'Site is required';
        if (!formData.academicYear) newErrors.academicYear = 'Academic year is required';
        if (!formData.academicTerm) newErrors.academicTerm = 'Academic term is required';

        if (!editMode) {
            if (applyToType === 'class' && selectedClasses.length === 0) {
                newErrors.classes = 'Please select at least one class';
            }

            if (applyToType === 'department' && !selectedDepartment) {
                newErrors.department = 'Please select a department';
            }
        } else {
            // In edit mode, must have exactly one class
            if (selectedClasses.length === 0) {
                newErrors.classes = 'Class is required';
            }
        }

        if (selectedFeeItems.length === 0) {
            newErrors.feeItems = 'Please add at least one fee item';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openNew = () => {
        setFormData({
            school: user?.school ? schools.find((s) => s._id === user.school) : null,
            site: null,
            academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
            academicTerm: 1,
            configName: '',
            paymentDeadline: null,
            installmentAllowed: true,
            currency: 'GHS',
            isActive: true
        });
        setApplyToType('class');
        setSelectedDepartment(null);
        setSelectedClasses([]);
        setSelectedFeeItems([]);
        setErrors({});
        setEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (config: FeeConfiguration) => {
        setFormData({
            _id: config._id,
            school: config.site?.school || (user?.school ? schools.find((s) => s._id === user.school) : null),
            site: config.site,
            academicYear: config.academicYear,
            academicTerm: config.academicTerm,
            configName: config.configName || '',
            paymentDeadline: config.paymentDeadline ? new Date(config.paymentDeadline) : null,
            installmentAllowed: config.installmentAllowed,
            currency: config.currency,
            isActive: config.isActive
        });
        setApplyToType('class');
        setSelectedDepartment(null);
        setSelectedClasses([config.class]);
        setSelectedFeeItems(config.feeItems || []);
        setErrors({});
        setEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setErrors({});
    };

    const addFeeItem = (determinant: any) => {
        const exists = selectedFeeItems.find((item) => item.determinant === determinant.determinant);
        if (exists) {
            showToast('warn', 'Already Added', 'This fee item is already in the configuration');
            return;
        }

        const newItem: FeeItem = {
            determinant: determinant.determinant,
            description: determinant.description,
            amount: determinant.amount,
            isOptional: false
        };

        setSelectedFeeItems([...selectedFeeItems, newItem]);
    };

    const removeFeeItem = (index: number) => {
        setSelectedFeeItems(selectedFeeItems.filter((_, i) => i !== index));
    };

    const updateFeeItemAmount = (index: number, amount: number) => {
        const updated = [...selectedFeeItems];
        updated[index].amount = amount;
        setSelectedFeeItems(updated);
    };

    const toggleFeeItemOptional = (index: number) => {
        const updated = [...selectedFeeItems];
        updated[index].isOptional = !updated[index].isOptional;
        setSelectedFeeItems(updated);
    };

    const saveConfiguration = async () => {
        if (!validateForm()) {
            showToast('warn', 'Validation Error', 'Please fill all required fields correctly');
            return;
        }

        if (editMode) {
            confirmDialog({
                message: 'Update this fee configuration?',
                header: 'Confirm Update',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Yes, Update',
                rejectLabel: 'Cancel',
                accept: async () => {
                    await updateConfiguration();
                }
            });
        } else {
            confirmDialog({
                message: `This will create fee configuration for ${selectedClasses.length} class(es). Continue?`,
                header: 'Confirm Creation',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Yes, Create',
                rejectLabel: 'Cancel',
                accept: async () => {
                    await executeConfigurationCreation();
                }
            });
        }
    };

    const executeConfigurationCreation = async () => {
        setSaving(true);
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const classItem of selectedClasses) {
                const payload = {
                    site: formData.site._id || formData.site,
                    class: classItem._id || classItem,
                    academicYear: formData.academicYear,
                    academicTerm: formData.academicTerm,
                    configName: formData.configName || `${classItem.className} - ${formData.academicYear} T${formData.academicTerm}`,
                    feeItems: selectedFeeItems,
                    totalAmount: calculateTotalAmount(),
                    currency: formData.currency,
                    paymentDeadline: formData.paymentDeadline,
                    installmentAllowed: formData.installmentAllowed,
                    createdBy: user?._id,
                    isActive: formData.isActive
                };

                try {
                    const response = await fetch('/api/fee-configurations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        const errorData = await response.json();
                        console.error(`Failed for class ${classItem.className}:`, errorData);
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error creating config for class ${classItem.className}:`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                showToast('success', 'Success', `Created ${successCount} fee configuration(s) successfully`);
                hideDialog();
                fetchFeeConfigurations();
            } else {
                showToast('warn', 'Partially Completed', `${successCount} created, ${errorCount} failed`);
            }
        } catch (error) {
            console.error('Error saving configuration:', error);
            showToast('error', 'Error', 'An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const updateConfiguration = async () => {
        setSaving(true);
        try {
            const payload = {
                site: formData.site._id || formData.site,
                class: selectedClasses[0]._id || selectedClasses[0],
                academicYear: formData.academicYear,
                academicTerm: formData.academicTerm,
                configName: formData.configName || undefined,
                feeItems: selectedFeeItems,
                totalAmount: calculateTotalAmount(),
                currency: formData.currency,
                paymentDeadline: formData.paymentDeadline,
                installmentAllowed: formData.installmentAllowed,
                isActive: formData.isActive
            };

            const response = await fetch(`/api/fee-configurations/${formData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showToast('success', 'Success', 'Fee configuration updated successfully');
                hideDialog();
                fetchFeeConfigurations();
            } else {
                showToast('error', 'Error', data.error || 'Failed to update fee configuration');
            }
        } catch (error) {
            console.error('Error updating configuration:', error);
            showToast('error', 'Error', 'An error occurred while updating');
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (config: FeeConfiguration) => {
        confirmDialog({
            message: `Delete fee configuration for "${config.class.className}"?`,
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deleteConfiguration(config._id!)
        });
    };

    const deleteConfiguration = async (id: string) => {
        try {
            const response = await fetch(`/api/fee-configurations/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('success', 'Deleted', 'Fee configuration deleted successfully');
                fetchFeeConfigurations();
            } else {
                const data = await response.json();
                showToast('error', 'Error', data.error || 'Failed to delete configuration');
            }
        } catch (error) {
            console.error('Error deleting configuration:', error);
            showToast('error', 'Error', 'An error occurred while deleting');
        }
    };

    // Template functions
    const amountBodyTemplate = (rowData: FeeConfiguration) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: 'GHS'
        }).format(rowData.totalAmount);
    };

    const statusBodyTemplate = (rowData: FeeConfiguration) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const classBodyTemplate = (rowData: FeeConfiguration) => {
        return rowData.class?.className || 'N/A';
    };

    const termBodyTemplate = (rowData: FeeConfiguration) => {
        return `Term ${rowData.academicTerm}`;
    };

    const actionBodyTemplate = (rowData: FeeConfiguration) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" className="p-button-rounded p-button-text p-button-info" onClick={() => openEdit(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Create Configuration" icon="pi pi-plus" className="p-button-success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchFeeConfigurations} loading={loading} />;
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={hideDialog} disabled={saving} />
            <Button label={editMode ? 'Update Configuration' : 'Create Configuration'} icon="pi pi-check" onClick={saveConfiguration} loading={saving} disabled={selectedClasses.length === 0 || selectedFeeItems.length === 0} />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card title="Fee Configuration Management" subTitle="Create and manage fee structures for classes">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={feeConfigurations}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    emptyMessage="No fee configurations found"
                    className="datatable-responsive"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} configurations"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                >
                    <Column field="academicYear" header="Academic Year" sortable style={{ minWidth: '150px' }} />
                    <Column field="academicTerm" header="Term" body={termBodyTemplate} sortable style={{ minWidth: '100px' }} />
                    <Column field="class.className" header="Class" body={classBodyTemplate} sortable style={{ minWidth: '150px' }} />
                    <Column field="configName" header="Configuration Name" sortable style={{ minWidth: '200px' }} />
                    <Column field="totalAmount" header="Total Amount" body={amountBodyTemplate} sortable style={{ minWidth: '150px' }} />
                    <Column field="isActive" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-money-bill text-primary text-2xl" />
                        <span>{editMode ? 'Edit Fee Configuration' : 'Create Fee Configuration'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <div className="formgrid grid">
                    {/* School and Site Selection */}
                    <div className="field col-12 md:col-6">
                        <label htmlFor="school" className="font-semibold">
                            School <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="school"
                            value={formData.school}
                            options={schools}
                            onChange={(e) => setFormData({ ...formData, school: e.value, site: null })}
                            optionLabel="name"
                            placeholder="Select school"
                            filter
                            disabled={!!user?.school}
                            className={errors.school ? 'p-invalid' : ''}
                        />
                        {errors.school && <small className="p-error">{errors.school}</small>}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="site" className="font-semibold">
                            School Site <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="site"
                            value={formData.site}
                            options={sites}
                            onChange={(e) => setFormData({ ...formData, site: e.value })}
                            optionLabel="siteName"
                            placeholder="Select site"
                            filter
                            disabled={!formData.school}
                            className={errors.site ? 'p-invalid' : ''}
                        />
                        {errors.site && <small className="p-error">{errors.site}</small>}
                    </div>

                    {/* Academic Year and Term */}
                    <div className="field col-12 md:col-6">
                        <label htmlFor="academicYear" className="font-semibold">
                            Academic Year <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="academicYear"
                            value={formData.academicYear}
                            options={getAcademicYears}
                            onChange={(e) => setFormData({ ...formData, academicYear: e.value })}
                            placeholder="Select Academic Year"
                            className={errors.academicYear ? 'p-invalid' : ''}
                        />
                        {errors.academicYear && <small className="p-error">{errors.academicYear}</small>}
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="academicTerm" className="font-semibold">
                            Academic Term <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="academicTerm"
                            value={formData.academicTerm}
                            options={TERM_OPTIONS}
                            onChange={(e) => setFormData({ ...formData, academicTerm: e.value })}
                            placeholder="Select term"
                            className={errors.academicTerm ? 'p-invalid' : ''}
                        />
                        {errors.academicTerm && <small className="p-error">{errors.academicTerm}</small>}
                    </div>

                    <Divider className="col-12 m-0" />

                    {/* Apply To Selection - Hidden in Edit Mode */}
                    {!editMode && (
                        <div className="field col-12">
                            <label className="font-semibold mb-3 block">
                                Apply Configuration To <span className="text-red-500">*</span>
                            </label>
                            <SelectButton
                                value={applyToType}
                                options={APPLY_TO_OPTIONS}
                                onChange={(e) => {
                                    setApplyToType(e.value);
                                    setSelectedDepartment(null);
                                    setSelectedClasses([]);
                                }}
                                optionLabel="label"
                                className="w-full"
                                disabled={!formData.site}
                            />
                        </div>
                    )}

                    {/* Department or Class Selection */}
                    {editMode ? (
                        <div className="field col-12">
                            <label htmlFor="class" className="font-semibold">
                                Class <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="class"
                                value={selectedClasses[0]}
                                options={classes}
                                onChange={(e) => setSelectedClasses([e.value])}
                                optionLabel="className"
                                placeholder="Select class"
                                filter
                                disabled={!formData.site || classes.length === 0}
                                className={errors.classes ? 'p-invalid' : ''}
                            />
                            {errors.classes && <small className="p-error">{errors.classes}</small>}
                        </div>
                    ) : applyToType === 'department' ? (
                        <div className="field col-12">
                            <label htmlFor="department" className="font-semibold">
                                Select Department <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="department"
                                value={selectedDepartment}
                                options={departments}
                                onChange={(e) => setSelectedDepartment(e.value)}
                                optionLabel="name"
                                placeholder="Select a department"
                                filter
                                showClear
                                disabled={!formData.site || departments.length === 0}
                                className={errors.department ? 'p-invalid' : ''}
                            />
                            {errors.department && <small className="p-error">{errors.department}</small>}
                            {selectedDepartment && <Message severity="info" className="mt-2" text={`This will create fee configurations for all ${selectedClasses.length} classes in ${selectedDepartment.name} department`} />}
                        </div>
                    ) : (
                        <div className="field col-12">
                            <label htmlFor="classes" className="font-semibold">
                                Select Classes <span className="text-red-500">*</span>
                            </label>
                            <MultiSelect
                                id="classes"
                                value={selectedClasses}
                                options={classes}
                                onChange={(e) => setSelectedClasses(e.value)}
                                optionLabel="className"
                                placeholder="Select classes"
                                filter
                                display="chip"
                                disabled={!formData.site || classes.length === 0}
                                className={errors.classes ? 'p-invalid' : ''}
                            />
                            {errors.classes && <small className="p-error">{errors.classes}</small>}
                        </div>
                    )}

                    {/* Selected Classes Preview */}
                    {selectedClasses.length > 0 && (
                        <div className="field col-12">
                            <Card className="bg-blue-50">
                                <div className="font-semibold mb-2">Selected Classes ({selectedClasses.length}):</div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedClasses.map((cls) => (
                                        <Chip key={cls._id} label={cls.className} />
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                    <Divider className="col-12 m-0" />

                    {/* Fee Items Section */}
                    <div className="field col-12">
                        <Panel header="Fee Items Configuration" toggleable>
                            <div className="mb-3">
                                <label className="font-semibold mb-2 block">Available Fee Items</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableFeeDeterminants.map((det) => (
                                        <Button key={det._id} label={`${det.determinant} (GHS ${det.amount})`} icon="pi pi-plus" className="p-button-outlined p-button-sm" onClick={() => addFeeItem(det)} />
                                    ))}
                                    {availableFeeDeterminants.length === 0 && <Message severity="info" text="No active fee items available for this site. Please create fee determinants first." />}
                                </div>
                            </div>

                            {selectedFeeItems.length > 0 && (
                                <>
                                    <Divider />
                                    <label className="font-semibold mb-2 block">Selected Fee Items</label>
                                    <DataTable value={selectedFeeItems} className="mt-2">
                                        <Column field="determinant" header="Item" style={{ width: '25%' }} />
                                        <Column field="description" header="Description" style={{ width: '30%' }} />
                                        <Column
                                            field="amount"
                                            header="Amount (GHS)"
                                            body={(rowData, options) => <InputText type="number" value={rowData.amount} onChange={(e) => updateFeeItemAmount(options.rowIndex, parseFloat(e.target.value) || 0)} className="w-full" />}
                                            style={{ width: '20%' }}
                                        />
                                        <Column field="isOptional" header="Optional" body={(rowData, options) => <Checkbox checked={rowData.isOptional} onChange={() => toggleFeeItemOptional(options.rowIndex)} />} style={{ width: '15%' }} />
                                        <Column body={(rowData, options) => <Button icon="pi pi-trash" className="p-button-rounded p-button-text p-button-danger" onClick={() => removeFeeItem(options.rowIndex)} />} style={{ width: '10%' }} />
                                    </DataTable>

                                    <div className="flex justify-content-end mt-3 p-3 bg-blue-50 border-round">
                                        <div className="text-xl font-bold">
                                            Total Amount: <span className="text-primary">{new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(calculateTotalAmount())}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            {errors.feeItems && <small className="p-error block mt-2">{errors.feeItems}</small>}
                        </Panel>
                    </div>

                    <Divider className="col-12 m-0" />

                    {/* Additional Settings */}
                    <div className="field col-12 md:col-6">
                        <label htmlFor="paymentDeadline" className="font-semibold">
                            Payment Deadline
                        </label>
                        <Calendar id="paymentDeadline" value={formData.paymentDeadline} onChange={(e) => setFormData({ ...formData, paymentDeadline: e.value })} showIcon dateFormat="dd/mm/yy" placeholder="Select deadline" />
                    </div>

                    <div className="field col-12 md:col-6">
                        <label htmlFor="configName" className="font-semibold">
                            Configuration Name <span className="text-500">(Optional)</span>
                        </label>
                        <InputText id="configName" value={formData.configName} onChange={(e) => setFormData({ ...formData, configName: e.target.value })} placeholder="e.g., Standard Fees" />
                        <small className="text-500">Leave empty to auto-generate</small>
                    </div>

                    <div className="field col-12">
                        <div className="flex align-items-center gap-3">
                            <InputSwitch id="installmentAllowed" checked={formData.installmentAllowed} onChange={(e) => setFormData({ ...formData, installmentAllowed: e.value })} />
                            <label htmlFor="installmentAllowed" className="mb-0 font-semibold">
                                Allow Installment Payments
                            </label>
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default FeeConfigurationManagement;
