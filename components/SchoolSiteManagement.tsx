'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { InputMask } from 'primereact/inputmask';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '@/context/AuthContext';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import { Divider } from 'primereact/divider';

interface SchoolSiteData {
    _id?: string;
    school?: string;
    siteName: string;
    description: string;
    phone?: string;
    email?: string;
    address?: {
        street?: string;
        town?: string;
        constituency?: string;
    };
    schoolLevel: 'early_child' | 'basic' | 'junior' | 'senior' | 'tertiary';
    tertiaryType?: 'university' | 'nursing_training' | 'teacher_training' | 'vocational' | 'n/a';
    isActive: boolean;
}

const SchoolSiteManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = React.useRef<Toast>(null);

    const [sites, setSites] = useState<SchoolSiteData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Form state
    const [formData, setFormData] = useState<SchoolSiteData>(getEmptySite());

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        siteName: { value: null, matchMode: FilterMatchMode.STARTS_WITH }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptySite(): SchoolSiteData {
        return {
            school: user?.school || '',
            siteName: '',
            description: '',
            phone: '',
            email: '',
            address: {
                street: '',
                town: '',
                constituency: ''
            },
            schoolLevel: 'basic',
            tertiaryType: 'n/a',
            isActive: true
        };
    }

    useEffect(() => {
        fetchSites();
    }, [user]);

    const fetchSites = async () => {
        try {
            setLoading(true);

            // Check if user has school property
            if (!user?.school) {
                showToast('error', 'Error', 'No school associated with your account');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            params.append('school', user.school);

            const response = await fetch(`/api/sites?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                console.log(data.sites);
                setSites(data.sites || []);
                setFormData({ ...formData, school: user.school });
            } else {
                showToast('error', 'Error', 'Failed to load school sites');
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to load school sites');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptySite());
        setIsEditMode(false);
        setDialogVisible(true);
    };

    const openEdit = (site: SchoolSiteData) => {
        setFormData({ ...site });
        setIsEditMode(true);
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptySite());
    };

    const saveSite = async () => {
        if (!formData.siteName || !formData.description || !formData.school) {
            showToast('error', 'Validation Error', 'Site name, description, and school are required');
            return;
        }

        if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
            showToast('error', 'Validation Error', 'Please provide a valid email address');
            return;
        }

        try {
            const url = isEditMode ? `/api/sites/${formData._id}` : '/api/sites';
            const method = isEditMode ? 'PUT' : 'POST';

            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `School site ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchSites();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save school site');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while saving school site');
        } finally {
            setLoading(false);
        }
    };

    const deleteSite = async (siteId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this school site?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/sites/${siteId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'School site deleted successfully');
                        fetchSites();
                    } else {
                        showToast('error', 'Error', 'Failed to delete school site');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting school site');
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
                <Button label="New Site" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search sites..." />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchSites} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: SchoolSiteData) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded outlined severity="info" onClick={() => openEdit(rowData)} />
                <Button icon="pi pi-trash" rounded outlined severity="danger" onClick={() => deleteSite(rowData._id!)} />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: SchoolSiteData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const schoolLevelBodyTemplate = (rowData: SchoolSiteData) => {
        const levelLabels: Record<string, string> = {
            early_child: 'Early Childhood',
            basic: 'Basic',
            junior: 'Junior High',
            senior: 'Senior High',
            tertiary: 'Tertiary'
        };
        return levelLabels[rowData.schoolLevel] || rowData.schoolLevel;
    };

    const schoolLevelOptions = [
        { label: 'Early Childhood', value: 'early_child' },
        { label: 'Basic', value: 'basic' },
        { label: 'Junior High', value: 'junior' },
        { label: 'Senior High', value: 'senior' },
        { label: 'Tertiary', value: 'tertiary' }
    ];

    const tertiaryTypeOptions = [
        { label: 'Not Applicable', value: 'n/a' },
        { label: 'University', value: 'university' },
        { label: 'Nursing Training', value: 'nursing_training' },
        { label: 'Teacher Training', value: 'teacher_training' },
        { label: 'Vocational', value: 'vocational' }
    ];

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label={isEditMode ? 'Update Site' : 'Create Site'} icon="pi pi-check" onClick={saveSite} loading={loading} disabled={loading} />
        </div>
    );

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex flex-column md:flex-row align-items-center justify-content-between mb-4 gap-3">
                    <div className="text-center md:text-left w-full md:w-auto">
                        <h2 className="text-2xl md:text-3xl font-bold text-900 m-0 mb-2">School Sites Management</h2>
                        <p className="text-600 m-0 text-sm md:text-base">Manage multiple campuses and branches</p>
                    </div>
                    <i className="pi pi-map-marker text-4xl md:text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={sites}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="siteName"
                    filters={filters}
                    globalFilterFields={['siteName', 'description', 'address.town']}
                    emptyMessage="No school sites found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                >
                    <Column field="siteName" header="Site Name" sortable style={{ minWidth: '200px' }} />
                    <Column field="description" header="Description" sortable style={{ minWidth: '200px' }} />
                    <Column body={schoolLevelBodyTemplate} header="Level" sortable style={{ minWidth: '150px' }} />
                    <Column field="address.town" header="Town" sortable style={{ minWidth: '150px' }} />
                    <Column field="phone" header="Phone" style={{ minWidth: '150px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog visible={dialogVisible} style={{ width: '95vw', maxWidth: '800px' }} header={isEditMode ? 'Edit School Site' : 'New School Site'} modal className="p-fluid" footer={dialogFooter} onHide={hideDialog}>
                <div className="grid">
                    <div className="col-12">
                        <label htmlFor="siteName" className="font-semibold text-900">
                            Site Name *
                        </label>
                        <InputText id="siteName" value={formData.siteName} onChange={(e) => setFormData({ ...formData, siteName: e.target.value })} required placeholder="e.g., Main Campus, Branch Office" className="mt-2" />
                    </div>

                    <div className="col-12">
                        <label htmlFor="description" className="font-semibold text-900">
                            Description *
                        </label>
                        <InputTextarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Brief description of the site" className="mt-2" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="schoolLevel" className="font-semibold text-900">
                            School Level *
                        </label>
                        <Dropdown id="schoolLevel" value={formData.schoolLevel} options={schoolLevelOptions} onChange={(e) => setFormData({ ...formData, schoolLevel: e.value })} placeholder="Select school level" className="mt-2" />
                    </div>

                    {formData.schoolLevel === 'tertiary' && (
                        <div className="col-12 md:col-6">
                            <label htmlFor="tertiaryType" className="font-semibold text-900">
                                Tertiary Type
                            </label>
                            <Dropdown id="tertiaryType" value={formData.tertiaryType} options={tertiaryTypeOptions} onChange={(e) => setFormData({ ...formData, tertiaryType: e.value })} placeholder="Select tertiary type" className="mt-2" />
                        </div>
                    )}

                    <Divider />

                    <div className="col-12">
                        <h4 className="text-lg font-bold text-900 mb-3">Contact Information</h4>
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="phone" className="font-semibold text-900">
                            Phone Number
                        </label>
                        <InputMask id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.value || '' })} mask="(999) 999-9999" placeholder="(123) 456-7890" className="mt-2" />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="email" className="font-semibold text-900">
                            Email
                        </label>
                        <InputText id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="site@school.com" className="mt-2" />
                    </div>

                    <Divider />

                    <div className="col-12">
                        <h4 className="text-lg font-bold text-900 mb-3">Address</h4>
                    </div>

                    <div className="col-12">
                        <label htmlFor="street" className="font-semibold text-900">
                            Street Address
                        </label>
                        <InputText
                            id="street"
                            value={formData.address?.street}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    address: { ...formData.address, street: e.target.value }
                                })
                            }
                            placeholder="123 Main Street"
                            className="mt-2"
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="town" className="font-semibold text-900">
                            Town/City
                        </label>
                        <InputText
                            id="town"
                            value={formData.address?.town}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    address: { ...formData.address, town: e.target.value }
                                })
                            }
                            placeholder="Enter town or city"
                            className="mt-2"
                        />
                    </div>

                    <div className="col-12 md:col-6">
                        <label htmlFor="constituency" className="font-semibold text-900">
                            Constituency
                        </label>
                        <InputText
                            id="constituency"
                            value={formData.address?.constituency}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    address: { ...formData.address, constituency: e.target.value }
                                })
                            }
                            placeholder="Enter constituency"
                            className="mt-2"
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default SchoolSiteManagement;
