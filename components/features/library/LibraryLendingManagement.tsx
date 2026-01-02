'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Calendar } from 'primereact/calendar';
import { Chip } from 'primereact/chip';
import { ProgressBar } from 'primereact/progressbar';
import { Badge } from 'primereact/badge';
import { Panel } from 'primereact/panel';
import { Timeline } from 'primereact/timeline';
import { Steps } from 'primereact/steps';
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import { DataView } from 'primereact/dataview';

interface LendingItem {
    book: any;
    quantityIssued: number;
    quantityReturned: number;
    dateReturned?: Date;
    receivedBy?: any;
    condition: 'good' | 'fair' | 'damaged' | 'lost';
    returnNotes?: string;
}

interface RenewalHistory {
    renewedBy?: any;
    renewedAt: Date;
    previousDueDate?: Date;
    newDueDate?: Date;
}

interface Fine {
    reason: 'overdue' | 'damage' | 'loss' | 'other';
    amount: number;
    isPaid: boolean;
    paidDate?: Date;
    notes?: string;
}

interface LibraryLending {
    _id?: string;
    borrower: any;
    site: any;
    issuedBy: any;
    issuedDate: Date;
    dueDate: Date;
    status: 'active' | 'returned' | 'overdue' | 'partially_returned';
    items: LendingItem[];
    renewalCount: number;
    renewalHistory: RenewalHistory[];
    fines: Fine[];
    totalFines: number;
    notes?: string;
    isOverdue?: boolean;
    daysOverdue?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const emptyLending: Partial<LibraryLending> = {
    items: [],
    renewalCount: 0,
    renewalHistory: [],
    fines: [],
    totalFines: 0
};

export default function LibraryLendingManagement() {
    const [lendings, setLendings] = useState<LibraryLending[]>([]);
    const [persons, setPersons] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [libraryItems, setLibraryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [detailDialogVisible, setDetailDialogVisible] = useState(false);
    const [issueDialogVisible, setIssueDialogVisible] = useState(false);
    const [returnDialogVisible, setReturnDialogVisible] = useState(false);
    const [renewDialogVisible, setRenewDialogVisible] = useState(false);
    const [fineDialogVisible, setFineDialogVisible] = useState(false);

    const [selectedLending, setSelectedLending] = useState<LibraryLending | null>(null);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS }
    });

    // Issue workflow state
    const [issueStep, setIssueStep] = useState(0);
    const [newIssue, setNewIssue] = useState<{
        borrower: string;
        site: string;
        dueDate: Date | null;
        items: Array<{ book: string; quantity: number }>;
        notes: string;
    }>({
        borrower: '',
        site: '',
        dueDate: null,
        items: [],
        notes: ''
    });

    // Return workflow state
    const [returnData, setReturnData] = useState<{
        itemIndex: number;
        quantity: number;
        condition: 'good' | 'fair' | 'damaged' | 'lost';
        notes: string;
    }>({
        itemIndex: -1,
        quantity: 0,
        condition: 'good',
        notes: ''
    });

    // Renew data
    const [renewData, setRenewData] = useState<{
        newDueDate: Date | null;
    }>({
        newDueDate: null
    });

    // Fine data
    const [newFine, setNewFine] = useState<{
        reason: 'overdue' | 'damage' | 'loss' | 'other';
        amount: number;
        notes: string;
    }>({
        reason: 'overdue',
        amount: 0,
        notes: ''
    });

    const toast = useRef<Toast>(null);

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Partially Returned', value: 'partially_returned' },
        { label: 'Returned', value: 'returned' }
    ];

    const conditionOptions = [
        { label: 'Good', value: 'good', icon: 'pi pi-check-circle', color: 'success' },
        { label: 'Fair', value: 'fair', icon: 'pi pi-info-circle', color: 'info' },
        { label: 'Damaged', value: 'damaged', icon: 'pi pi-exclamation-triangle', color: 'warning' },
        { label: 'Lost', value: 'lost', icon: 'pi pi-times-circle', color: 'danger' }
    ];

    const fineReasonOptions = [
        { label: 'Overdue', value: 'overdue' },
        { label: 'Damage', value: 'damage' },
        { label: 'Loss', value: 'loss' },
        { label: 'Other', value: 'other' }
    ];

    const issueSteps = [{ label: 'Select Borrower' }, { label: 'Add Items' }, { label: 'Set Details' }, { label: 'Review & Confirm' }];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // TODO: ADD DATA RETRIEVAL LOGIC CRITERIAS
            const [lendingsRes, personsRes, sitesRes, itemsRes] = await Promise.all([fetch('/api/library-lending'), fetch('/api/persons'), fetch('/api/sites'), fetch('/api/library-items')]);

            const lendingsData = await lendingsRes.json();
            const personsData = await personsRes.json();
            const sitesData = await sitesRes.json();
            const itemsData = await itemsRes.json();

            setLendings(lendingsData);
            setPersons(personsData.persons);
            setSites(sitesData.sites || sitesData);
            setLibraryItems(itemsData);
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

    const viewDetails = (lending: LibraryLending) => {
        setSelectedLending(lending);
        setDetailDialogVisible(true);
    };

    const openIssueDialog = () => {
        setNewIssue({
            borrower: '',
            site: '',
            dueDate: null,
            items: [],
            notes: ''
        });
        setIssueStep(0);
        setIssueDialogVisible(true);
    };

    const openReturnDialog = (lending: LibraryLending) => {
        setSelectedLending(lending);
        setReturnData({
            itemIndex: -1,
            quantity: 0,
            condition: 'good',
            notes: ''
        });
        setReturnDialogVisible(true);
    };

    const openRenewDialog = (lending: LibraryLending) => {
        setSelectedLending(lending);
        const newDate = new Date(lending.dueDate);
        newDate.setDate(newDate.getDate() + 14); // Add 14 days
        setRenewData({ newDueDate: newDate });
        setRenewDialogVisible(true);
    };

    const openFineDialog = (lending: LibraryLending) => {
        setSelectedLending(lending);
        setNewFine({
            reason: 'overdue',
            amount: 0,
            notes: ''
        });
        setFineDialogVisible(true);
    };

    const addItemToIssue = () => {
        setNewIssue({
            ...newIssue,
            items: [...newIssue.items, { book: '', quantity: 1 }]
        });
    };

    const removeItemFromIssue = (index: number) => {
        setNewIssue({
            ...newIssue,
            items: newIssue.items.filter((_, i) => i !== index)
        });
    };

    const updateIssueItem = (index: number, field: 'book' | 'quantity', value: any) => {
        const newItems = [...newIssue.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setNewIssue({ ...newIssue, items: newItems });
    };

    const submitIssue = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/library-lending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newIssue)
            });
            const responseMSG = await response.json();
            if (!response.ok) throw new Error(responseMSG.message);

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Items issued successfully',
                life: 3000
            });

            setIssueDialogVisible(false);
            fetchData();
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message,
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const submitReturn = async () => {
        if (!selectedLending || returnData.itemIndex < 0) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/library-lending/${selectedLending._id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(returnData)
            });

            if (!response.ok) throw new Error('Failed to return item');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Item returned successfully',
                life: 3000
            });

            setReturnDialogVisible(false);
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to return item',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const submitRenewal = async () => {
        if (!selectedLending || !renewData.newDueDate) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/library-lending/${selectedLending._id}/renew`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(renewData)
            });

            if (!response.ok) throw new Error('Failed to renew');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Lending renewed successfully',
                life: 3000
            });

            setRenewDialogVisible(false);
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to renew',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const submitFine = async () => {
        if (!selectedLending || newFine.amount <= 0) return;

        try {
            setLoading(true);
            const response = await fetch(`/api/library-lending/${selectedLending._id}/fine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newFine)
            });

            if (!response.ok) throw new Error('Failed to add fine');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Fine added successfully',
                life: 3000
            });

            setFineDialogVisible(false);
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to add fine',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const markFinePaid = async (lendingId: string, fineIndex: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/library-lending/${lendingId}/fine/${fineIndex}/pay`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to mark fine as paid');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Fine marked as paid',
                life: 3000
            });

            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to mark fine as paid',
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

    // Template functions
    const borrowerBodyTemplate = (rowData: LibraryLending) => {
        const borrower = rowData.borrower;
        return borrower ? `${borrower.firstName} ${borrower.lastName}` : 'N/A';
    };

    const siteBodyTemplate = (rowData: LibraryLending) => {
        const site = rowData.site;
        return site ? site.siteName : 'N/A';
    };

    const statusBodyTemplate = (rowData: LibraryLending) => {
        const severityMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
            active: 'info',
            overdue: 'danger',
            partially_returned: 'warning',
            returned: 'success'
        };

        const labelMap: Record<string, string> = {
            active: 'ACTIVE',
            overdue: 'OVERDUE',
            partially_returned: 'PARTIAL RETURN',
            returned: 'RETURNED'
        };

        return <Tag value={labelMap[rowData.status]} severity={severityMap[rowData.status]} icon={rowData.isOverdue ? 'pi pi-exclamation-triangle' : undefined} rounded />;
    };

    const datesBodyTemplate = (rowData: LibraryLending) => {
        return (
            <div>
                <div className="text-sm">
                    <span className="font-semibold">Issued:</span> {new Date(rowData.issuedDate).toLocaleDateString()}
                </div>
                <div className="text-sm mt-1">
                    <span className="font-semibold">Due:</span> {new Date(rowData.dueDate).toLocaleDateString()}
                </div>
                {rowData.daysOverdue && rowData.daysOverdue > 0 && (
                    <div className="text-sm mt-1">
                        <Tag severity="danger" value={`${rowData.daysOverdue} days overdue`} />
                    </div>
                )}
            </div>
        );
    };

    const itemsBodyTemplate = (rowData: LibraryLending) => {
        const totalIssued = rowData.items.reduce((sum, item) => sum + item.quantityIssued, 0);
        const totalReturned = rowData.items.reduce((sum, item) => sum + item.quantityReturned, 0);
        const percentage = totalIssued > 0 ? (totalReturned / totalIssued) * 100 : 0;

        return (
            <div className="flex align-items-center gap-2">
                <span className={totalReturned < totalIssued ? 'font-semibold' : ''}>
                    {totalReturned} / {totalIssued}
                </span>
                {totalIssued > 0 && <ProgressBar value={percentage} showValue={false} style={{ width: '60px', height: '8px' }} color={percentage === 100 ? '#10b981' : percentage > 0 ? '#f97316' : '#6366f1'} />}
            </div>
        );
    };

    const finesBodyTemplate = (rowData: LibraryLending) => {
        if (rowData.totalFines === 0) {
            return <span className="text-green-600">$0.00</span>;
        }

        const unpaidFines = rowData.fines.filter((f) => !f.isPaid).reduce((sum, f) => sum + f.amount, 0);

        return (
            <div>
                <div className={unpaidFines > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>${rowData.totalFines.toFixed(2)}</div>
                {unpaidFines > 0 && <small className="text-red-500">(${unpaidFines.toFixed(2)} unpaid)</small>}
            </div>
        );
    };

    const actionBodyTemplate = (rowData: LibraryLending) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" rounded text severity="info" onClick={() => viewDetails(rowData)} tooltip="View Details" tooltipOptions={{ position: 'top' }} />
                {(rowData.status === 'active' || rowData.status === 'overdue' || rowData.status === 'partially_returned') && (
                    <>
                        <Button icon="pi pi-arrow-left" rounded text severity="success" onClick={() => openReturnDialog(rowData)} tooltip="Return Items" tooltipOptions={{ position: 'top' }} />
                        <Button icon="pi pi-refresh" rounded text severity="warning" onClick={() => openRenewDialog(rowData)} tooltip="Renew" tooltipOptions={{ position: 'top' }} />
                        <Button icon="pi pi-dollar" rounded text severity="danger" onClick={() => openFineDialog(rowData)} tooltip="Add Fine" tooltipOptions={{ position: 'top' }} />
                    </>
                )}
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return <Button label="Issue Items" icon="pi pi-plus" severity="success" onClick={openIssueDialog} />;
    };

    const rightToolbarTemplate = () => {
        return (
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search lendings..." />
            </span>
        );
    };

    const issueDialogFooter = (
        <div className="flex justify-content-between">
            <Button label="Cancel" icon="pi pi-times" text onClick={() => setIssueDialogVisible(false)} />
            <div className="flex gap-2">
                {issueStep > 0 && <Button label="Previous" icon="pi pi-chevron-left" text onClick={() => setIssueStep(issueStep - 1)} />}
                {issueStep < 3 && (
                    <Button
                        label="Next"
                        icon="pi pi-chevron-right"
                        iconPos="right"
                        onClick={() => setIssueStep(issueStep + 1)}
                        disabled={(issueStep === 0 && !newIssue.borrower) || (issueStep === 1 && newIssue.items.length === 0) || (issueStep === 2 && (!newIssue.site || !newIssue.dueDate))}
                    />
                )}
                {issueStep === 3 && <Button label="Issue Items" icon="pi pi-check" onClick={submitIssue} loading={loading} disabled={loading} />}
            </div>
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="mb-4">
                <h2 className="text-3xl font-bold text-900 mb-2">Library Circulation</h2>
                <p className="text-600 text-lg">Manage item lending, returns, renewals, and fines</p>
            </div>

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={lendings}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[10, 25, 50]}
                filters={filters}
                globalFilterFields={['status']}
                emptyMessage="No lending records found."
                responsiveLayout="scroll"
                stripedRows
                showGridlines
                rowClassName={(rowData) => {
                    if (rowData.isOverdue && rowData.daysOverdue > 7) return 'bg-red-50';
                    if (rowData.isOverdue) return 'bg-orange-50';
                    return '';
                }}
            >
                <Column body={borrowerBodyTemplate} header="Borrower" sortable style={{ minWidth: '180px' }} />
                <Column body={siteBodyTemplate} header="Site" sortable style={{ minWidth: '150px' }} />
                <Column body={datesBodyTemplate} header="Dates" style={{ minWidth: '180px' }} />
                <Column body={statusBodyTemplate} header="Status" sortable filter filterElement={<Dropdown options={statusOptions} placeholder="All Status" className="p-column-filter" showClear />} style={{ minWidth: '150px' }} />
                <Column body={itemsBodyTemplate} header="Items (Returned/Issued)" style={{ minWidth: '180px' }} />
                <Column field="renewalCount" header="Renewals" sortable style={{ minWidth: '100px' }} />
                <Column body={finesBodyTemplate} header="Fines" sortable style={{ minWidth: '120px' }} />
                <Column body={actionBodyTemplate} header="Actions" exportable={false} style={{ minWidth: '180px' }} />
            </DataTable>

            {/* Detail Dialog */}
            <Dialog
                visible={detailDialogVisible}
                style={{ width: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-book text-primary text-2xl" />
                        <span className="font-bold text-xl">Lending Details</span>
                    </div>
                }
                modal
                onHide={() => setDetailDialogVisible(false)}
                maximizable
            >
                {selectedLending && (
                    <TabView>
                        <TabPanel header="Transaction Info" leftIcon="pi pi-info-circle mr-2">
                            <div className="grid">
                                <div className="col-12 md:col-6">
                                    <Card className="shadow-2 mb-3">
                                        <h4 className="mt-0 mb-3 text-900">Borrower Information</h4>
                                        <div className="mb-2">
                                            <span className="font-semibold text-600">Name:</span>
                                            <div className="text-900 mt-1">{borrowerBodyTemplate(selectedLending)}</div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="font-semibold text-600">Site:</span>
                                            <div className="text-900 mt-1">{siteBodyTemplate(selectedLending)}</div>
                                        </div>
                                    </Card>
                                </div>

                                <div className="col-12 md:col-6">
                                    <Card className="shadow-2 mb-3">
                                        <h4 className="mt-0 mb-3 text-900">Transaction Details</h4>
                                        <div className="mb-2">
                                            <span className="font-semibold text-600">Status:</span>
                                            <div className="mt-1">{statusBodyTemplate(selectedLending)}</div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="font-semibold text-600">Issued Date:</span>
                                            <div className="text-900 mt-1">{new Date(selectedLending.issuedDate).toLocaleString()}</div>
                                        </div>
                                        <div className="mb-2">
                                            <span className="font-semibold text-600">Due Date:</span>
                                            <div className="text-900 mt-1">{new Date(selectedLending.dueDate).toLocaleString()}</div>
                                        </div>
                                        {selectedLending.daysOverdue && selectedLending.daysOverdue > 0 && <Message severity="error" text={`${selectedLending.daysOverdue} days overdue!`} className="mt-2" />}
                                    </Card>
                                </div>

                                {selectedLending.notes && (
                                    <div className="col-12">
                                        <Card className="shadow-2">
                                            <h4 className="mt-0 mb-2 text-900">Notes</h4>
                                            <p className="text-600 m-0">{selectedLending.notes}</p>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </TabPanel>

                        <TabPanel header="Items" leftIcon="pi pi-book mr-2">
                            {selectedLending.items.map((item, index) => (
                                <Card key={index} className="mb-3 shadow-2">
                                    <div className="grid">
                                        <div className="col-12 md:col-8">
                                            <h4 className="mt-0 mb-2 text-900">{item.book?.title || 'Unknown Book'}</h4>
                                            <div className="grid">
                                                <div className="col-6">
                                                    <div className="mb-2">
                                                        <span className="font-semibold text-600">Issued:</span>
                                                        <span className="ml-2 text-900">{item.quantityIssued}</span>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="mb-2">
                                                        <span className="font-semibold text-600">Returned:</span>
                                                        <span className="ml-2 text-900">{item.quantityReturned}</span>
                                                    </div>
                                                </div>
                                                {item.dateReturned && (
                                                    <div className="col-12">
                                                        <div className="mb-2">
                                                            <span className="font-semibold text-600">Return Date:</span>
                                                            <span className="ml-2 text-900">{new Date(item.dateReturned).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="col-12 md:col-4">
                                            <div className="flex flex-column align-items-end gap-2">
                                                <Tag value={item.condition.toUpperCase()} severity={item.condition === 'good' ? 'success' : item.condition === 'fair' ? 'info' : item.condition === 'damaged' ? 'warning' : 'danger'} />
                                                {item.quantityReturned >= item.quantityIssued ? (
                                                    <Tag value="FULLY RETURNED" severity="success" icon="pi pi-check" />
                                                ) : item.quantityReturned > 0 ? (
                                                    <Tag value="PARTIAL RETURN" severity="warning" />
                                                ) : (
                                                    <Tag value="NOT RETURNED" severity="danger" />
                                                )}
                                            </div>
                                        </div>
                                        {item.returnNotes && (
                                            <div className="col-12">
                                                <Divider />
                                                <p className="text-600 text-sm m-0">
                                                    <strong>Return Notes:</strong> {item.returnNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </TabPanel>

                        <TabPanel header="Renewals" leftIcon="pi pi-refresh mr-2">
                            {selectedLending.renewalHistory.length > 0 ? (
                                <Timeline
                                    value={selectedLending.renewalHistory}
                                    content={(item) => (
                                        <Card className="shadow-1">
                                            <div className="text-sm text-600 mb-2">{new Date(item.renewedAt).toLocaleString()}</div>
                                            <div>
                                                <i className="pi pi-arrow-right mr-2" />
                                                {item.previousDueDate && new Date(item.previousDueDate).toLocaleDateString()}
                                                {' → '}
                                                {item.newDueDate && new Date(item.newDueDate).toLocaleDateString()}
                                            </div>
                                        </Card>
                                    )}
                                />
                            ) : (
                                <Message severity="info" text="No renewals yet" />
                            )}
                        </TabPanel>

                        <TabPanel header={`Fines (${selectedLending.fines.length})`} leftIcon="pi pi-dollar mr-2">
                            <div className="mb-3">
                                <Card className="bg-primary">
                                    <div className="flex justify-content-between align-items-center">
                                        <h3 className="m-0 text-white">Total Fines</h3>
                                        <h2 className="m-0 text-white">${selectedLending.totalFines.toFixed(2)}</h2>
                                    </div>
                                </Card>
                            </div>

                            {selectedLending.fines.length > 0 ? (
                                selectedLending.fines.map((fine, index) => (
                                    <Card key={index} className="mb-3 shadow-2">
                                        <div className="flex justify-content-between align-items-start">
                                            <div>
                                                <Tag value={fine.reason.toUpperCase()} severity={fine.reason === 'overdue' ? 'warning' : 'danger'} className="mb-2" />
                                                <h3 className="mt-2 mb-2 text-900">${fine.amount.toFixed(2)}</h3>
                                                {fine.notes && <p className="text-600 text-sm m-0">{fine.notes}</p>}
                                            </div>
                                            <div className="flex flex-column align-items-end gap-2">
                                                {fine.isPaid ? (
                                                    <>
                                                        <Tag value="PAID" severity="success" icon="pi pi-check" />
                                                        {fine.paidDate && <small className="text-600">{new Date(fine.paidDate).toLocaleDateString()}</small>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Tag value="UNPAID" severity="danger" />
                                                        <Button label="Mark Paid" icon="pi pi-check" size="small" onClick={() => selectedLending._id && markFinePaid(selectedLending._id, index)} />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <Message severity="success" text="No fines" />
                            )}
                        </TabPanel>
                    </TabView>
                )}
            </Dialog>

            {/* Issue Dialog */}
            <Dialog
                visible={issueDialogVisible}
                style={{ width: '800px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-plus-circle text-primary text-2xl" />
                        <span className="font-bold text-xl">Issue Items</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={issueDialogFooter}
                onHide={() => setIssueDialogVisible(false)}
            >
                <Steps model={issueSteps} activeIndex={issueStep} className="mb-4" />

                {issueStep === 0 && (
                    <div>
                        <h4 className="text-900 mb-3">Select Borrower</h4>
                        <Dropdown value={newIssue.borrower} options={persons} onChange={(e) => setNewIssue({ ...newIssue, borrower: e.value })} optionLabel={'firstName'} optionValue="_id" placeholder="Select a borrower" filter className="w-full" />
                    </div>
                )}

                {issueStep === 1 && (
                    <div>
                        <div className="flex justify-content-between align-items-center mb-3">
                            <h4 className="text-900 m-0">Add Items</h4>
                            <Button label="Add Item" icon="pi pi-plus" size="small" onClick={addItemToIssue} />
                        </div>

                        {newIssue.items.map((item, index) => (
                            <Card key={index} className="mb-3 shadow-1">
                                <div className="grid">
                                    <div className="col-10">
                                        <div className="field mb-3">
                                            <label className="font-semibold">Book</label>
                                            <Dropdown value={item.book} options={libraryItems} onChange={(e) => updateIssueItem(index, 'book', e.value)} optionLabel="title" optionValue="_id" placeholder="Select a book" filter />
                                        </div>
                                        <div className="field mb-0">
                                            <label className="font-semibold">Quantity</label>
                                            <InputNumber value={item.quantity} onValueChange={(e) => updateIssueItem(index, 'quantity', e.value || 1)} min={1} showButtons />
                                        </div>
                                    </div>
                                    <div className="col-2 flex align-items-center justify-content-center">
                                        <Button icon="pi pi-trash" severity="danger" text rounded onClick={() => removeItemFromIssue(index)} />
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {newIssue.items.length === 0 && <Message severity="info" text="No items added yet. Click 'Add Item' to begin." />}
                    </div>
                )}

                {issueStep === 2 && (
                    <div>
                        <h4 className="text-900 mb-3">Set Details</h4>
                        <div className="field mb-3">
                            <label className="font-semibold">Site</label>
                            <Dropdown value={newIssue.site} options={sites} onChange={(e) => setNewIssue({ ...newIssue, site: e.value })} optionLabel="siteName" optionValue="_id" placeholder="Select a site" />
                        </div>
                        <div className="field mb-3">
                            <label className="font-semibold">Due Date</label>
                            <Calendar value={newIssue.dueDate} onChange={(e) => setNewIssue({ ...newIssue, dueDate: e.value as Date })} showIcon minDate={new Date()} dateFormat="yy-mm-dd" />
                        </div>
                        <div className="field mb-0">
                            <label className="font-semibold">Notes (Optional)</label>
                            <InputTextarea value={newIssue.notes} onChange={(e) => setNewIssue({ ...newIssue, notes: e.target.value })} rows={3} />
                        </div>
                    </div>
                )}

                {issueStep === 3 && (
                    <div>
                        <h4 className="text-900 mb-3">Review & Confirm</h4>
                        <Card className="shadow-2">
                            <div className="mb-3">
                                <span className="font-semibold text-600">Borrower:</span>
                                <div className="text-900 mt-1">
                                    {persons.find((p) => p._id === newIssue.borrower)?.firstName} {persons.find((p) => p._id === newIssue.borrower)?.lastName}
                                </div>
                            </div>
                            <div className="mb-3">
                                <span className="font-semibold text-600">Site:</span>
                                <div className="text-900 mt-1">{sites.find((s) => s._id === newIssue.site)?.siteName}</div>
                            </div>
                            <div className="mb-3">
                                <span className="font-semibold text-600">Due Date:</span>
                                <div className="text-900 mt-1">{newIssue.dueDate?.toLocaleDateString()}</div>
                            </div>
                            <Divider />
                            <div className="mb-2">
                                <span className="font-semibold text-600">Items ({newIssue.items.length}):</span>
                            </div>
                            {newIssue.items.map((item, index) => {
                                const book = libraryItems.find((b) => b._id === item.book);
                                return (
                                    <div key={index} className="flex justify-content-between align-items-center p-2 border-round mb-2 surface-100">
                                        <span>{book?.title}</span>
                                        <Badge value={`Qty: ${item.quantity}`} severity="info" />
                                    </div>
                                );
                            })}
                        </Card>
                    </div>
                )}
            </Dialog>

            {/* Return Dialog */}
            <Dialog
                visible={returnDialogVisible}
                style={{ width: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-arrow-left text-success text-2xl" />
                        <span className="font-bold text-xl">Return Items</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setReturnDialogVisible(false)} />
                        <Button label="Submit Return" icon="pi pi-check" onClick={submitReturn} disabled={returnData.itemIndex < 0 || returnData.quantity <= 0 || loading} loading={loading} />
                    </div>
                }
                onHide={() => setReturnDialogVisible(false)}
            >
                {selectedLending && (
                    <>
                        <div className="field mb-3">
                            <label className="font-semibold">Select Item</label>
                            <Dropdown
                                value={returnData.itemIndex}
                                options={selectedLending.items.map((item, idx) => ({
                                    label: `${item.book?.title} (${item.quantityIssued - item.quantityReturned} remaining)`,
                                    value: idx,
                                    disabled: item.quantityReturned >= item.quantityIssued
                                }))}
                                onChange={(e) => {
                                    const maxQty = selectedLending.items[e.value].quantityIssued - selectedLending.items[e.value].quantityReturned;
                                    setReturnData({ ...returnData, itemIndex: e.value, quantity: maxQty });
                                }}
                                placeholder="Select an item to return"
                            />
                        </div>

                        {returnData.itemIndex >= 0 && (
                            <>
                                <div className="field mb-3">
                                    <label className="font-semibold">Quantity to Return</label>
                                    <InputNumber
                                        value={returnData.quantity}
                                        onValueChange={(e) => setReturnData({ ...returnData, quantity: e.value || 0 })}
                                        min={1}
                                        max={selectedLending.items[returnData.itemIndex].quantityIssued - selectedLending.items[returnData.itemIndex].quantityReturned}
                                        showButtons
                                    />
                                </div>

                                <div className="field mb-3">
                                    <label className="font-semibold">Item Condition</label>
                                    <Dropdown value={returnData.condition} options={conditionOptions} onChange={(e) => setReturnData({ ...returnData, condition: e.value })} />
                                    {(returnData.condition === 'damaged' || returnData.condition === 'lost') && <Message severity="warn" text="This may result in additional fines" className="mt-2" />}
                                </div>

                                <div className="field mb-0">
                                    <label className="font-semibold">Return Notes</label>
                                    <InputTextarea value={returnData.notes} onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })} rows={3} placeholder="Any notes about the return..." />
                                </div>
                            </>
                        )}
                    </>
                )}
            </Dialog>

            {/* Renew Dialog */}
            <Dialog
                visible={renewDialogVisible}
                style={{ width: '500px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-refresh text-warning text-2xl" />
                        <span className="font-bold text-xl">Renew Lending</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setRenewDialogVisible(false)} />
                        <Button label="Renew" icon="pi pi-check" onClick={submitRenewal} disabled={!renewData.newDueDate || loading} loading={loading} />
                    </div>
                }
                onHide={() => setRenewDialogVisible(false)}
            >
                {selectedLending && (
                    <>
                        <Message severity="info" text={`Current due date: ${new Date(selectedLending.dueDate).toLocaleDateString()}`} className="mb-3" />

                        <div className="field mb-0">
                            <label className="font-semibold">New Due Date</label>
                            <Calendar value={renewData.newDueDate} onChange={(e) => setRenewData({ newDueDate: e.value as Date })} showIcon minDate={new Date(selectedLending.dueDate)} dateFormat="yy-mm-dd" />
                        </div>
                    </>
                )}
            </Dialog>

            {/* Fine Dialog */}
            <Dialog
                visible={fineDialogVisible}
                style={{ width: '500px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-dollar text-danger text-2xl" />
                        <span className="font-bold text-xl">Add Fine</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setFineDialogVisible(false)} />
                        <Button label="Add Fine" icon="pi pi-check" severity="danger" onClick={submitFine} disabled={newFine.amount <= 0 || loading} loading={loading} />
                    </div>
                }
                onHide={() => setFineDialogVisible(false)}
            >
                <div className="field mb-3">
                    <label className="font-semibold">Reason</label>
                    <Dropdown value={newFine.reason} options={fineReasonOptions} onChange={(e) => setNewFine({ ...newFine, reason: e.value })} />
                </div>

                <div className="field mb-3">
                    <label className="font-semibold">Amount ($)</label>
                    <InputNumber value={newFine.amount} onValueChange={(e) => setNewFine({ ...newFine, amount: e.value || 0 })} min={0} mode="currency" currency="USD" />
                </div>

                <div className="field mb-0">
                    <label className="font-semibold">Notes</label>
                    <InputTextarea value={newFine.notes} onChange={(e) => setNewFine({ ...newFine, notes: e.target.value })} rows={3} placeholder="Reason for fine..." />
                </div>
            </Dialog>
        </div>
    );
}
