'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { FilterMatchMode } from 'primereact/api';
import { Tooltip } from 'primereact/tooltip';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Calendar } from 'primereact/calendar';
import { useAuth } from '@/context/AuthContext';

interface Person {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
}

interface SchoolSite {
    _id: string;
    name: string;
    code?: string;
}

interface LibraryUser {
    _id?: string;
    user: Person | string;
    site: SchoolSite | string;
    libraryCardNumber?: string;
    registrationDate: Date;
    status: 'active' | 'suspended' | 'inactive' | 'expired';
    membershipType: 'student' | 'teacher' | 'staff' | 'public';
    borrowingLimit: number;
    borrowingPeriodDays: number;
    currentBorrowings: any[];
    borrowingHistory: any[];
    totalBorrowings: number;
    activeBorrowingsCount: number;
    overdueFines: number;
    suspensionReason?: string;
    suspensionDate?: Date;
    expiryDate?: Date;
    notes?: string;
    canBorrow?: boolean;
    availableSlots?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const emptyLibraryUser: Partial<LibraryUser> = {
    status: 'active',
    membershipType: 'student',
    borrowingLimit: 3,
    borrowingPeriodDays: 14,
    notes: ''
};

export default function LibraryUserManagement() {
    const { user } = useAuth();
    const [libraryUsers, setLibraryUsers] = useState<LibraryUser[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [sites, setSites] = useState<SchoolSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [suspendDialogVisible, setSuspendDialogVisible] = useState(false);
    const [selectedLibraryUser, setSelectedLibraryUser] = useState<Partial<LibraryUser>>(emptyLibraryUser);
    const [selectedUserForAction, setSelectedUserForAction] = useState<LibraryUser | null>(null);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        membershipType: { value: null, matchMode: FilterMatchMode.EQUALS }
    });

    const toast = React.useRef<Toast>(null);

    const membershipTypeOptions = [
        { label: 'Student', value: 'student' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Staff', value: 'staff' },
        { label: 'Public', value: 'public' }
    ];

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Expired', value: 'expired' }
    ];

    useEffect(() => {
        fetchData();
    }, [user]);
    useEffect(() => {
        fetchSites();
    }, [user]);
    const fetchSites = async () => {
        // Fetch sites for dropdown
        if (!user) return;
        const response = await fetch(`/api/sites?school=${user.school}`);
        const sitesData = await response.json();
        setSites(sitesData.sites);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch library users
            if (!user) return;
            const usersResponse = await fetch(`/api/library-users?site=${user.schoolSite}`);
            const usersData = await usersResponse.json();
            setLibraryUsers(usersData);

            // Fetch persons for dropdown
            const personsResponse = await fetch(`/api/persons?site=${user.schoolSite}`);
            const personsData = await personsResponse.json();
            setPersons(personsData.persons.map((p: Person) => ({ _id: p._id, firstName: p.firstName, lastName: p.lastName, email: p.email, fullName: `${p.firstName} ${p.lastName}` })));
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load data',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setSelectedLibraryUser(emptyLibraryUser);
        setDialogVisible(true);
    };

    const editLibraryUser = (libraryUser: LibraryUser) => {
        setSelectedLibraryUser({
            ...libraryUser,
            user: typeof libraryUser.user === 'object' ? libraryUser.user._id : libraryUser.user,
            site: typeof libraryUser.site === 'object' ? libraryUser.site._id : libraryUser.site
        });
        setDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setSelectedLibraryUser(emptyLibraryUser);
    };

    const saveLibraryUser = async () => {
        try {
            const method = selectedLibraryUser._id ? 'PUT' : 'POST';
            const url = selectedLibraryUser._id ? `/api/library-users/${selectedLibraryUser._id}` : '/api/library-users';

            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedLibraryUser)
            });

            if (!response.ok) throw new Error('Failed to save library user');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Library user ${selectedLibraryUser._id ? 'updated' : 'created'} successfully`,
                life: 3000
            });

            hideDialog();
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save library user',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (libraryUser: LibraryUser) => {
        confirmDialog({
            message: 'Are you sure you want to delete this library user?',
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            accept: () => deleteLibraryUser(libraryUser)
        });
    };

    const deleteLibraryUser = async (libraryUser: LibraryUser) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/library-users/${libraryUser._id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete library user');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Library user deleted successfully',
                life: 3000
            });

            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete library user',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const openSuspendDialog = (libraryUser: LibraryUser) => {
        setSelectedUserForAction(libraryUser);
        setSuspensionReason('');
        setSuspendDialogVisible(true);
    };

    const suspendUser = async () => {
        if (!selectedUserForAction || !suspensionReason.trim()) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please provide a suspension reason',
                life: 3000
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/library-users/${selectedUserForAction._id}/suspend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    suspensionReason,
                    suspensionDate: new Date()
                })
            });

            if (!response.ok) throw new Error('Failed to suspend user');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'User suspended successfully',
                life: 3000
            });

            setSuspendDialogVisible(false);
            setSelectedUserForAction(null);
            setSuspensionReason('');
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to suspend user',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const activateUser = async (libraryUser: LibraryUser) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/library-users/${libraryUser._id}/activate`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to activate user');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'User activated successfully',
                life: 3000
            });

            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to activate user',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // Template functions for columns
    const userBodyTemplate = (rowData: LibraryUser) => {
        const user = rowData.user as Person;
        return user ? `${user.firstName} ${user.lastName}` : 'N/A';
    };

    const siteBodyTemplate = (rowData: any) => {
        const site = rowData.site;
        return site ? site.siteName : 'N/A';
    };

    const statusBodyTemplate = (rowData: LibraryUser) => {
        const severityMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
            active: 'success',
            suspended: 'danger',
            inactive: 'warning',
            expired: 'info'
        };

        return <Tag value={rowData.status.toUpperCase()} severity={severityMap[rowData.status]} rounded />;
    };

    const membershipTypeBodyTemplate = (rowData: LibraryUser) => {
        const colorMap: Record<string, string> = {
            student: '#3B82F6',
            teacher: '#8B5CF6',
            staff: '#10B981',
            public: '#F59E0B'
        };

        return <Tag value={rowData.membershipType.toUpperCase()} style={{ backgroundColor: colorMap[rowData.membershipType] }} rounded />;
    };

    const availableSlotsBodyTemplate = (rowData: LibraryUser) => {
        const available = rowData.borrowingLimit - rowData.activeBorrowingsCount;
        return (
            <span className={available <= 0 ? 'text-red-500 font-semibold' : ''}>
                {available} / {rowData.borrowingLimit}
            </span>
        );
    };

    const overdueFinesBodyTemplate = (rowData: LibraryUser) => {
        return rowData.overdueFines > 0 ? <span className="text-red-600 font-semibold">${rowData.overdueFines.toFixed(2)}</span> : <span className="text-green-600">$0.00</span>;
    };

    const canBorrowBodyTemplate = (rowData: LibraryUser) => {
        const canBorrow = rowData.status === 'active' && rowData.activeBorrowingsCount < rowData.borrowingLimit && rowData.overdueFines === 0;

        return canBorrow ? <i className="pi pi-check-circle text-green-500 text-xl" /> : <i className="pi pi-times-circle text-red-500 text-xl" />;
    };

    const actionBodyTemplate = (rowData: LibraryUser) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded text severity="info" onClick={() => editLibraryUser(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                {rowData.status === 'active' ? (
                    <Button icon="pi pi-ban" rounded text severity="warning" onClick={() => openSuspendDialog(rowData)} tooltip="Suspend" tooltipOptions={{ position: 'top' }} />
                ) : (
                    <Button icon="pi pi-check" rounded text severity="success" onClick={() => activateUser(rowData)} tooltip="Activate" tooltipOptions={{ position: 'top' }} />
                )}
                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return <Button label="Add Library User" icon="pi pi-plus" severity="success" onClick={openNew} />;
    };

    const rightToolbarTemplate = () => {
        return (
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search..." />
            </span>
        );
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" text onClick={hideDialog} />
            <Button label={selectedLibraryUser._id ? 'Update User' : 'Save User'} icon="pi pi-check" onClick={saveLibraryUser} disabled={!selectedLibraryUser.user || !selectedLibraryUser.site} loading={loading} />
        </div>
    );

    const suspendDialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button
                label="Cancel"
                icon="pi pi-times"
                text
                onClick={() => {
                    setSuspendDialogVisible(false);
                    setSelectedUserForAction(null);
                    setSuspensionReason('');
                }}
            />
            <Button label="Suspend" icon="pi pi-ban" severity="warning" onClick={suspendUser} disabled={!suspensionReason.trim() || loading} loading={loading} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="mb-4">
                <h2 className="text-3xl font-bold text-900 mb-2">Library User Management</h2>
                <p className="text-600 text-lg">Manage library memberships, borrowing privileges, and user status</p>
            </div>

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={libraryUsers}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                filters={filters}
                globalFilterFields={['libraryCardNumber', 'status', 'membershipType']}
                emptyMessage="No library users found."
                responsiveLayout="scroll"
                stripedRows
                showGridlines
            >
                <Column field="libraryCardNumber" header="Card Number" sortable style={{ minWidth: '150px' }} />
                <Column header="User" body={userBodyTemplate} sortable style={{ minWidth: '180px' }} />
                <Column header="Site" body={siteBodyTemplate} sortable style={{ minWidth: '150px' }} />
                <Column
                    header="Membership"
                    body={membershipTypeBodyTemplate}
                    sortable
                    filter
                    filterElement={<Dropdown options={membershipTypeOptions} placeholder="Select Type" className="p-column-filter" showClear />}
                    style={{ minWidth: '140px' }}
                />
                <Column header="Status" body={statusBodyTemplate} sortable filter filterElement={<Dropdown options={statusOptions} placeholder="Select Status" className="p-column-filter" showClear />} style={{ minWidth: '120px' }} />
                <Column field="activeBorrowingsCount" header="Active Loans" sortable style={{ minWidth: '120px' }} />
                <Column header="Available Slots" body={availableSlotsBodyTemplate} sortable style={{ minWidth: '140px' }} />
                <Column header="Overdue Fines" body={overdueFinesBodyTemplate} sortable style={{ minWidth: '130px' }} />
                <Column header="Can Borrow" body={canBorrowBodyTemplate} style={{ minWidth: '110px' }} align="center" />
                <Column header="Actions" body={actionBodyTemplate} exportable={false} style={{ minWidth: '150px' }} />
            </DataTable>

            {/* Add/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '650px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-id-card text-primary text-2xl" />
                        <span className="font-bold text-xl">{selectedLibraryUser._id ? 'Edit Library User' : 'Add Library User'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <Card className="shadow-none border-none p-0">
                    {/* Library Card Number Info */}
                    {selectedLibraryUser._id && selectedLibraryUser.libraryCardNumber && (
                        <div className="mb-4">
                            <Message
                                severity="info"
                                text={
                                    <div className="flex align-items-center gap-2">
                                        <span className="font-semibold">Library Card Number:</span>
                                        <span className="font-mono text-lg">{selectedLibraryUser.libraryCardNumber}</span>
                                    </div>
                                }
                            />
                        </div>
                    )}

                    {!selectedLibraryUser._id && (
                        <div className="mb-4">
                            <Message
                                severity="info"
                                className="w-full"
                                content={
                                    <div className="flex align-items-start gap-2">
                                        <i className="pi pi-info-circle mt-1" />
                                        <div>
                                            <div className="font-semibold mb-1">Auto-Generated Card Number</div>
                                            <div className="text-sm">A unique library card number will be automatically generated based on the membership type when you save this user.</div>
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    )}

                    {/* User Selection */}
                    <div className="field mb-4">
                        <label htmlFor="user" className="font-semibold text-900 mb-2 block">
                            User <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="user"
                            value={selectedLibraryUser.user}
                            options={persons}
                            onChange={(e) => setSelectedLibraryUser({ ...selectedLibraryUser, user: e.value })}
                            optionLabel={'fullName'}
                            optionValue="_id"
                            placeholder="Select a user"
                            filter
                            filterBy="firstName,lastName,email"
                            className={!selectedLibraryUser.user ? 'p-invalid' : ''}
                        />
                        {!selectedLibraryUser.user && <small className="p-error">User is required.</small>}
                    </div>

                    {/* Site Selection */}
                    <div className="field mb-4">
                        <label htmlFor="site" className="font-semibold text-900 mb-2 block">
                            Site <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            id="site"
                            value={selectedLibraryUser.site}
                            options={sites}
                            onChange={(e) => setSelectedLibraryUser({ ...selectedLibraryUser, site: e.value })}
                            optionLabel={'siteName'}
                            optionValue="_id"
                            placeholder="Select a site"
                            filter
                            className={!selectedLibraryUser.site ? 'p-invalid' : ''}
                        />
                        {!selectedLibraryUser.site && <small className="p-error">Site is required.</small>}
                    </div>

                    <Divider />

                    {/* Membership Type */}
                    <div className="field mb-4">
                        <label htmlFor="membershipType" className="font-semibold text-900 mb-2 block">
                            Membership Type
                        </label>
                        <Dropdown
                            id="membershipType"
                            value={selectedLibraryUser.membershipType}
                            options={membershipTypeOptions}
                            onChange={(e) =>
                                setSelectedLibraryUser({
                                    ...selectedLibraryUser,
                                    membershipType: e.value
                                })
                            }
                            placeholder="Select membership type"
                        />
                    </div>

                    <div className="grid">
                        {/* Borrowing Limit */}
                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label htmlFor="borrowingLimit" className="font-semibold text-900 mb-2 block">
                                    Borrowing Limit
                                    <i className="pi pi-question-circle ml-2 text-600 cursor-pointer borrowing-limit-help" data-pr-tooltip="Maximum number of items user can borrow simultaneously" data-pr-position="top" />
                                    <Tooltip target=".borrowing-limit-help" />
                                </label>
                                <InputNumber
                                    id="borrowingLimit"
                                    value={selectedLibraryUser.borrowingLimit}
                                    onValueChange={(e) =>
                                        setSelectedLibraryUser({
                                            ...selectedLibraryUser,
                                            borrowingLimit: e.value || 0
                                        })
                                    }
                                    min={0}
                                    max={20}
                                    showButtons
                                />
                            </div>
                        </div>

                        {/* Borrowing Period */}
                        <div className="col-12 md:col-6">
                            <div className="field">
                                <label htmlFor="borrowingPeriod" className="font-semibold text-900 mb-2 block">
                                    Borrowing Period (Days)
                                    <i className="pi pi-question-circle ml-2 text-600 cursor-pointer borrowing-period-help" data-pr-tooltip="Number of days user can keep borrowed items" data-pr-position="top" />
                                    <Tooltip target=".borrowing-period-help" />
                                </label>
                                <InputNumber
                                    id="borrowingPeriod"
                                    value={selectedLibraryUser.borrowingPeriodDays}
                                    onValueChange={(e) =>
                                        setSelectedLibraryUser({
                                            ...selectedLibraryUser,
                                            borrowingPeriodDays: e.value || 1
                                        })
                                    }
                                    min={1}
                                    max={90}
                                    showButtons
                                />
                            </div>
                        </div>
                    </div>

                    {selectedLibraryUser._id && (
                        <>
                            <Divider />

                            {/* Expiry Date */}
                            <div className="field mb-4">
                                <label htmlFor="expiryDate" className="font-semibold text-900 mb-2 block">
                                    Membership Expiry Date
                                </label>
                                <Calendar
                                    id="expiryDate"
                                    value={selectedLibraryUser.expiryDate ? new Date(selectedLibraryUser.expiryDate) : null}
                                    onChange={(e) =>
                                        setSelectedLibraryUser({
                                            ...selectedLibraryUser,
                                            expiryDate: e.value as Date
                                        })
                                    }
                                    showIcon
                                    dateFormat="yy-mm-dd"
                                    minDate={new Date()}
                                    placeholder="No expiry date set"
                                />
                                <small className="text-600 block mt-1">Leave empty for no expiration</small>
                            </div>
                        </>
                    )}

                    <Divider />

                    {/* Notes */}
                    <div className="field mb-3">
                        <label htmlFor="notes" className="font-semibold text-900 mb-2 block">
                            Notes
                        </label>
                        <InputTextarea
                            id="notes"
                            value={selectedLibraryUser.notes || ''}
                            onChange={(e) =>
                                setSelectedLibraryUser({
                                    ...selectedLibraryUser,
                                    notes: e.target.value
                                })
                            }
                            rows={3}
                            placeholder="Additional notes or comments..."
                        />
                    </div>
                </Card>
            </Dialog>

            {/* Suspend User Dialog */}
            <Dialog
                visible={suspendDialogVisible}
                style={{ width: '500px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-ban text-orange-500 text-2xl" />
                        <span className="font-bold text-xl">Suspend Library User</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={suspendDialogFooter}
                onHide={() => {
                    setSuspendDialogVisible(false);
                    setSelectedUserForAction(null);
                    setSuspensionReason('');
                }}
            >
                <div className="mb-4">
                    <Message severity="warn" text="User will not be able to borrow items while suspended." />
                </div>

                <div className="field">
                    <label htmlFor="suspensionReason" className="font-semibold text-900 mb-2 block">
                        Suspension Reason <span className="text-red-500">*</span>
                    </label>
                    <InputTextarea
                        id="suspensionReason"
                        value={suspensionReason}
                        onChange={(e) => setSuspensionReason(e.target.value)}
                        rows={4}
                        placeholder="Enter the reason for suspension..."
                        className={!suspensionReason.trim() ? 'p-invalid' : ''}
                        autoFocus
                    />
                    {!suspensionReason.trim() && <small className="p-error">Suspension reason is required.</small>}
                </div>
            </Dialog>
        </div>
    );
}
