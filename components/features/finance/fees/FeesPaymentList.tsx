'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { confirmDialog } from 'primereact/confirmdialog';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber } from 'primereact/inputnumber';
import { PaymentListItem, PaymentFilters } from '@/types/payment';
import { PaymentMethod, PaymentStatus } from '@/models/FeesPayment';
import { FeesPaymentRecording } from './FeesPaymentRecording';
import { useAuth } from '@/context/AuthContext';

export const FeesPaymentList: React.FC = () => {
    const { user } = useAuth();
    const [payments, setPayments] = useState<PaymentListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState(0);
    const [selectedPayments, setSelectedPayments] = useState<PaymentListItem[]>([]);
    const [showRecordingDialog, setShowRecordingDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentListItem | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>(undefined);
    const [isEditMode, setIsEditMode] = useState(false);

    const toast = useRef<Toast>(null);
    const filterPanel = useRef<OverlayPanel>(null);

    const [lazyState, setLazyState] = useState({
        first: 0,
        rows: 20,
        page: 0,
        sortField: 'datePaid',
        sortOrder: -1
    });

    const [filters, setFilters] = useState<PaymentFilters>({
        search: '',
        status: undefined,
        paymentMethod: undefined,
        dateFrom: undefined,
        dateTo: undefined
    });

    const [appliedFilters, setAppliedFilters] = useState<PaymentFilters>({});

    useEffect(() => {
        loadPayments();
    }, [lazyState, appliedFilters]);

    const loadPayments = async () => {
        if (!user?.schoolSite) return;

        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(lazyState.page),
                limit: String(lazyState.rows),
                sortField: lazyState.sortField || 'datePaid',
                sortOrder: String(lazyState.sortOrder),
                siteId: user.schoolSite // Always filter by logged-in user's school site
            });

            // Add filters with proper type conversion
            if (appliedFilters.search) {
                queryParams.append('search', appliedFilters.search);
            }
            if (appliedFilters.status) {
                queryParams.append('status', appliedFilters.status);
            }
            if (appliedFilters.paymentMethod) {
                queryParams.append('paymentMethod', appliedFilters.paymentMethod);
            }
            // Remove manual siteId filter since it's now automatic
            // if (appliedFilters.siteId) {
            //     queryParams.append('siteId', appliedFilters.siteId);
            // }
            if (appliedFilters.classId) {
                queryParams.append('classId', appliedFilters.classId);
            }
            if (appliedFilters.academicYear) {
                queryParams.append('academicYear', appliedFilters.academicYear);
            }
            if (appliedFilters.academicTerm) {
                queryParams.append('academicTerm', String(appliedFilters.academicTerm));
            }
            if (appliedFilters.dateFrom) {
                queryParams.append('dateFrom', appliedFilters.dateFrom.toISOString());
            }
            if (appliedFilters.dateTo) {
                queryParams.append('dateTo', appliedFilters.dateTo.toISOString());
            }
            if (appliedFilters.minAmount !== undefined) {
                queryParams.append('minAmount', String(appliedFilters.minAmount));
            }
            if (appliedFilters.maxAmount !== undefined) {
                queryParams.append('maxAmount', String(appliedFilters.maxAmount));
            }

            const response = await fetch(`/api/fees-payments?${queryParams}`);
            const data = await response.json();

            setPayments(data.payments);
            setTotalRecords(data.total);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load payments',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const onPage = (event: any) => {
        setLazyState(event);
    };

    const onSort = (event: any) => {
        setLazyState(event);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setAppliedFilters({ ...filters });
        setLazyState((prev) => ({ ...prev, first: 0, page: 0 }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            status: undefined,
            paymentMethod: undefined,
            dateFrom: undefined,
            dateTo: undefined
        });
        setAppliedFilters({});
        setLazyState((prev) => ({ ...prev, first: 0, page: 0 }));
    };

    const getActiveFilterCount = () => {
        return Object.values(appliedFilters).filter((v) => v !== undefined && v !== '').length;
    };

    const exportToExcel = () => {
        // Implement export functionality
        toast.current?.show({
            severity: 'info',
            summary: 'Export',
            detail: 'Exporting payments to Excel...',
            life: 3000
        });
    };

    const handleDeletePayment = async (payment: PaymentListItem) => {
        try {
            const response = await fetch(`/api/fees-payments?id=${payment._id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete payment');
            }

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: payment.paymentMethod === 'scholarship' ? 'Payment deleted and scholarship balance restored' : 'Payment deleted successfully',
                life: 3000
            });

            loadPayments();
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to delete payment',
                life: 5000
            });
        }
    };

    const confirmDelete = (payment: PaymentListItem) => {
        confirmDialog({
            message:
                payment.paymentMethod === 'scholarship'
                    ? `Are you sure you want to delete this payment? The amount will be restored to the student's scholarship balance.`
                    : 'Are you sure you want to delete this payment? This action cannot be undone.',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: () => handleDeletePayment(payment),
            reject: () => {},
            acceptClassName: 'p-button-danger'
        });
    };

    const statusBodyTemplate = (rowData: PaymentListItem) => {
        const statusConfig = {
            confirmed: { severity: 'success' as const, label: 'Confirmed' },
            pending: { severity: 'warning' as const, label: 'Pending' },
            failed: { severity: 'danger' as const, label: 'Failed' },
            reversed: { severity: 'info' as const, label: 'Reversed' }
        };

        const config = statusConfig[rowData.status];
        return <Tag value={config.label} severity={config.severity} />;
    };

    const amountBodyTemplate = (rowData: PaymentListItem) => {
        return (
            <div className="font-semibold">
                {rowData.currency} {rowData.amountPaid.toFixed(2)}
            </div>
        );
    };

    const studentBodyTemplate = (rowData: PaymentListItem) => {
        return (
            <div>
                <div className="font-medium">
                    {rowData.student.firstName} {rowData.student.lastName}
                </div>
                <div className="text-sm text-600">{rowData.student.studentId}</div>
            </div>
        );
    };

    const dateBodyTemplate = (rowData: PaymentListItem) => {
        return new Date(rowData.datePaid).toLocaleDateString('en-GB');
    };

    const methodBodyTemplate = (rowData: PaymentListItem) => {
        const methodIcons: Record<PaymentMethod, string> = {
            cash: '💵',
            mobile_money: '📱',
            bank_transfer: '🏦',
            card: '💳',
            cheque: '📝',
            online: '🌐',
            scholarship: '🎓'
        };

        return (
            <div className="flex align-items-center gap-2">
                <span>{methodIcons[rowData.paymentMethod]}</span>
                <span className="capitalize">{rowData.paymentMethod.replace('_', ' ')}</span>
            </div>
        );
    };

    const actionsBodyTemplate = (rowData: PaymentListItem) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-eye"
                    rounded
                    text
                    severity="info"
                    tooltip="View Details"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => {
                        setSelectedPayment(rowData);
                        setShowDetailsDialog(true);
                    }}
                />
                <Button icon="pi pi-print" rounded text severity="info" tooltip="Print Receipt" tooltipOptions={{ position: 'top' }} onClick={() => window.open(`/api/fees-payments/${rowData._id}/receipt`, '_blank')} />
                {rowData.status === 'confirmed' && (
                    <>
                        <Button
                            icon="pi pi-pencil"
                            rounded
                            text
                            severity="warning"
                            tooltip="Edit Payment"
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => {
                                setEditingPaymentId(rowData._id);
                                setIsEditMode(true);
                                setShowRecordingDialog(true);
                            }}
                        />
                        <Button
                            icon="pi pi-trash"
                            rounded
                            text
                            severity="danger"
                            tooltip={rowData.paymentMethod === 'scholarship' ? 'Delete & Restore Balance' : 'Delete Payment'}
                            tooltipOptions={{ position: 'top' }}
                            onClick={() => confirmDelete(rowData)}
                        />
                    </>
                )}
            </div>
        );
    };

    const header = (
        <div className="flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="flex align-items-center gap-2">
                <h2 className="text-2xl font-bold m-0">Fee Payments</h2>
                <Tag value={`${totalRecords} total`} severity="info" />
            </div>
            <div className="flex gap-2">
                <Button label="Record Payment" icon="pi pi-plus" onClick={() => setShowRecordingDialog(true)} severity="success" />
                <Button label="Export" icon="pi pi-download" outlined onClick={exportToExcel} />
            </div>
        </div>
    );

    const paymentMethods: { label: string; value: PaymentMethod }[] = [
        { label: 'Cash', value: 'cash' },
        { label: 'Mobile Money', value: 'mobile_money' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Card', value: 'card' },
        { label: 'Cheque', value: 'cheque' },
        { label: 'Online', value: 'online' }
    ];

    const statuses: { label: string; value: PaymentStatus }[] = [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
        { label: 'Reversed', value: 'reversed' }
    ];

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card className="shadow-2">
                {/* Search and Filter Bar */}
                <div className="mb-4">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
                        <div className="flex-1" style={{ minWidth: '300px' }}>
                            <span className="p-input-icon-left w-full">
                                <i className="pi pi-search" />
                                <InputText value={filters.search} onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))} placeholder="Search by student name, ID, or receipt number..." className="w-full" />
                            </span>
                        </div>

                        <Button
                            type="button"
                            label={`Filters ${getActiveFilterCount() > 0 ? `(${getActiveFilterCount()})` : ''}`}
                            icon="pi pi-filter"
                            outlined
                            onClick={(e) => filterPanel.current?.toggle(e)}
                            badge={getActiveFilterCount() > 0 ? String(getActiveFilterCount()) : undefined}
                            badgeClassName="p-badge-danger"
                        />

                        <Button type="submit" label="Search" icon="pi pi-search" />

                        {getActiveFilterCount() > 0 && <Button type="button" label="Clear" icon="pi pi-times" outlined severity="secondary" onClick={clearFilters} />}
                    </form>
                </div>

                {/* Advanced Filters Panel */}
                <OverlayPanel ref={filterPanel} style={{ width: '400px' }}>
                    <div className="flex flex-column gap-3">
                        <h4 className="mt-0 mb-2">Advanced Filters</h4>

                        <div className="field">
                            <label htmlFor="status" className="block mb-2 font-semibold">
                                Status
                            </label>
                            <Dropdown id="status" value={filters.status} options={statuses} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.value }))} placeholder="All Statuses" className="w-full" showClear />
                        </div>

                        <div className="field">
                            <label htmlFor="method" className="block mb-2 font-semibold">
                                Payment Method
                            </label>
                            <Dropdown id="method" value={filters.paymentMethod} options={paymentMethods} onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.value }))} placeholder="All Methods" className="w-full" showClear />
                        </div>

                        <div className="field">
                            <label htmlFor="dateFrom" className="block mb-2 font-semibold">
                                Date From
                            </label>
                            <Calendar id="dateFrom" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.value as Date }))} dateFormat="dd/mm/yy" showIcon className="w-full" showButtonBar />
                        </div>

                        <div className="field">
                            <label htmlFor="dateTo" className="block mb-2 font-semibold">
                                Date To
                            </label>
                            <Calendar id="dateTo" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.value as Date }))} dateFormat="dd/mm/yy" showIcon className="w-full" showButtonBar />
                        </div>

                        <div className="field">
                            <label htmlFor="minAmount" className="block mb-2 font-semibold">
                                Min Amount
                            </label>
                            <InputNumber id="minAmount" value={filters.minAmount} onValueChange={(e) => setFilters((prev) => ({ ...prev, minAmount: e.value || undefined }))} mode="decimal" minFractionDigits={2} className="w-full" />
                        </div>

                        <div className="field">
                            <label htmlFor="maxAmount" className="block mb-2 font-semibold">
                                Max Amount
                            </label>
                            <InputNumber id="maxAmount" value={filters.maxAmount} onValueChange={(e) => setFilters((prev) => ({ ...prev, maxAmount: e.value || undefined }))} mode="decimal" minFractionDigits={2} className="w-full" />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                label="Apply Filters"
                                className="flex-1"
                                onClick={() => {
                                    setAppliedFilters({ ...filters });
                                    setLazyState((prev) => ({ ...prev, first: 0, page: 0 }));
                                    filterPanel.current?.hide();
                                }}
                            />
                            <Button
                                label="Clear"
                                outlined
                                onClick={() => {
                                    clearFilters();
                                    filterPanel.current?.hide();
                                }}
                            />
                        </div>
                    </div>
                </OverlayPanel>

                {/* Data Table */}
                <DataTable
                    value={payments}
                    lazy
                    paginator
                    first={lazyState.first}
                    rows={lazyState.rows}
                    totalRecords={totalRecords}
                    onPage={onPage}
                    onSort={onSort}
                    sortField={lazyState.sortField}
                    loading={loading}
                    header={header}
                    selectionMode="multiple"
                    emptyMessage="No payments found"
                    selection={selectedPayments}
                    onSelectionChange={(e) => setSelectedPayments(e.value)}
                    dataKey="_id"
                    stripedRows
                    showGridlines
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} payments"
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                    <Column field="receiptNumber" header="Receipt No" sortable style={{ minWidth: '140px' }} />
                    <Column header="Student" body={studentBodyTemplate} sortable sortField="student.lastName" style={{ minWidth: '200px' }} />
                    <Column header="Amount" body={amountBodyTemplate} sortable sortField="amountPaid" style={{ minWidth: '120px' }} />
                    <Column header="Method" body={methodBodyTemplate} sortable sortField="paymentMethod" style={{ minWidth: '180px' }} />
                    <Column header="Date" body={dateBodyTemplate} sortable sortField="datePaid" style={{ minWidth: '120px' }} />
                    <Column header="Status" body={statusBodyTemplate} sortable sortField="status" style={{ minWidth: '120px' }} />
                    <Column header="Site" field="siteName" sortable style={{ minWidth: '150px' }} />
                    <Column header="Actions" body={actionsBodyTemplate} style={{ minWidth: '150px' }} />
                </DataTable>
            </Card>

            {/* Recording Dialog */}
            <FeesPaymentRecording
                visible={showRecordingDialog}
                editMode={isEditMode}
                paymentId={editingPaymentId}
                onHide={() => {
                    setShowRecordingDialog(false);
                    setIsEditMode(false);
                    setEditingPaymentId(undefined);
                }}
                onPaymentRecorded={() => {
                    loadPayments();
                    setShowRecordingDialog(false);
                    setIsEditMode(false);
                    setEditingPaymentId(undefined);
                }}
            />

            {/* Details Dialog */}
            <Dialog visible={showDetailsDialog} onHide={() => setShowDetailsDialog(false)} header="Payment Details" style={{ width: '600px' }} modal>
                {selectedPayment && (
                    <div className="flex flex-column gap-3">
                        <div>
                            <div className="text-sm text-600">Receipt Number</div>
                            <div className="font-bold text-lg">{selectedPayment.receiptNumber}</div>
                        </div>
                        <div>
                            <div className="text-sm text-600">Student</div>
                            <div className="font-medium">
                                {selectedPayment.student.firstName} {selectedPayment.student.lastName}
                            </div>
                            <div className="text-sm">{selectedPayment.student.studentId}</div>
                        </div>
                        <div className="grid">
                            <div className="col-6">
                                <div className="text-sm text-600">Amount</div>
                                <div className="font-semibold text-xl">
                                    {selectedPayment.currency} {selectedPayment.amountPaid.toFixed(2)}
                                </div>
                            </div>
                            <div className="col-6">
                                <div className="text-sm text-600">Status</div>
                                {statusBodyTemplate(selectedPayment)}
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-6">
                                <div className="text-sm text-600">Method</div>
                                {methodBodyTemplate(selectedPayment)}
                            </div>
                            <div className="col-6">
                                <div className="text-sm text-600">Date</div>
                                <div>{dateBodyTemplate(selectedPayment)}</div>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-600">Received By</div>
                            <div>
                                {selectedPayment.receivedBy.firstName} {selectedPayment.receivedBy.lastName}
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>
        </>
    );
};
