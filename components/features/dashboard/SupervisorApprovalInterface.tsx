'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { TabView, TabPanel } from 'primereact/tabview';
import { Badge } from 'primereact/badge';
import { PaymentModification } from '@/types/payment';

export const SupervisorApprovalInterface: React.FC = () => {
    const [modifications, setModifications] = useState<PaymentModification[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedModification, setSelectedModification] = useState<PaymentModification | null>(null);
    const [showApprovalDialog, setShowApprovalDialog] = useState(false);
    const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [processingApproval, setProcessingApproval] = useState(false);

    const toast = useRef<Toast>(null);

    useEffect(() => {
        loadModifications();
    }, [activeTab]);

    const loadModifications = async () => {
        setLoading(true);
        try {
            const status = ['pending', 'approved', 'rejected'][activeTab];
            const response = await fetch(`/api/fees-payments/modifications?status=${status}`);
            const data = await response.json();
            setModifications(data);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load modification requests',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprovalClick = (modification: PaymentModification, action: 'approve' | 'reject') => {
        setSelectedModification(modification);
        setApprovalAction(action);
        setApprovalNotes('');
        setShowApprovalDialog(true);
    };

    const submitApproval = async () => {
        if (!selectedModification) return;

        setProcessingApproval(true);
        try {
            const response = await fetch(`/api/fees-payments/modifications/${selectedModification._id}/${approvalAction}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: approvalNotes })
            });

            if (!response.ok) {
                throw new Error(`Failed to ${approvalAction} modification`);
            }

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Modification ${approvalAction}d successfully`,
                life: 3000
            });

            setShowApprovalDialog(false);
            loadModifications();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : `Failed to ${approvalAction} modification`,
                life: 5000
            });
        } finally {
            setProcessingApproval(false);
        }
    };

    const getPendingCount = () => {
        return modifications.filter((m) => m.status === 'pending').length;
    };

    const statusBodyTemplate = (rowData: PaymentModification) => {
        const statusConfig = {
            pending: { severity: 'warning' as const, label: 'Pending Review' },
            approved: { severity: 'success' as const, label: 'Approved' },
            rejected: { severity: 'danger' as const, label: 'Rejected' }
        };

        const config = statusConfig[rowData.status];
        return <Tag value={config.label} severity={config.severity} />;
    };

    const dateBodyTemplate = (rowData: PaymentModification) => {
        return new Date(rowData.modifiedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const modifiedByBodyTemplate = (rowData: PaymentModification) => {
        return (
            <div>
                <div className="font-medium">
                    {rowData.modifiedBy.firstName} {rowData.modifiedBy.lastName}
                </div>
                <div className="text-sm text-600">{dateBodyTemplate(rowData)}</div>
            </div>
        );
    };

    const paymentBodyTemplate = (rowData: PaymentModification) => {
        return (
            <div>
                <div className="font-medium">{rowData.payment.receiptNumber}</div>
                <div className="text-sm text-600">
                    {rowData.payment.student.firstName} {rowData.payment.student.lastName}
                </div>
                <div className="text-sm font-semibold">Amount: GHS {rowData.payment.amountPaid.toFixed(2)}</div>
            </div>
        );
    };

    const changesBodyTemplate = (rowData: PaymentModification) => {
        const changes = rowData.changes;
        if (!changes) return <span className="text-600">No changes recorded</span>;

        return (
            <div className="flex flex-column gap-1">
                {Object.entries(changes).map(([field, change]: [string, any]) => (
                    <div key={field} className="text-sm">
                        <span className="font-semibold capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span>
                        <br />
                        <span className="text-red-500">{String(change.old)}</span>
                        {' → '}
                        <span className="text-green-600">{String(change.new)}</span>
                    </div>
                ))}
            </div>
        );
    };

    const reasonBodyTemplate = (rowData: PaymentModification) => {
        return (
            <div className="max-w-20rem">
                <div className="text-sm">{rowData.reason}</div>
            </div>
        );
    };

    const actionsBodyTemplate = (rowData: PaymentModification) => {
        if (rowData.status === 'pending') {
            return (
                <div className="flex gap-2">
                    <Button label="Approve" icon="pi pi-check" size="small" severity="success" onClick={() => handleApprovalClick(rowData, 'approve')} />
                    <Button label="Reject" icon="pi pi-times" size="small" severity="danger" outlined onClick={() => handleApprovalClick(rowData, 'reject')} />
                </div>
            );
        } else if (rowData.status === 'approved') {
            return (
                <div className="text-sm">
                    <div className="text-600">Approved by:</div>
                    <div className="font-medium">
                        {rowData.approvedBy?.firstName} {rowData.approvedBy?.lastName}
                    </div>
                    <div className="text-600 text-xs">{rowData.approvedAt && new Date(rowData.approvedAt).toLocaleDateString('en-GB')}</div>
                </div>
            );
        } else {
            return (
                <div className="text-sm">
                    <div className="text-600">Rejected by:</div>
                    <div className="font-medium">
                        {rowData.approvedBy?.firstName} {rowData.approvedBy?.lastName}
                    </div>
                    <div className="text-600 text-xs">{rowData.approvedAt && new Date(rowData.approvedAt).toLocaleDateString('en-GB')}</div>
                </div>
            );
        }
    };

    const renderModificationDetails = () => {
        if (!selectedModification) return null;

        return (
            <div className="flex flex-column gap-4">
                {/* Payment Information */}
                <Card className="shadow-1">
                    <h4 className="text-lg font-semibold mb-3">Payment Information</h4>
                    <div className="grid">
                        <div className="col-6">
                            <div className="text-sm text-600">Receipt Number</div>
                            <div className="font-bold">{selectedModification.payment.receiptNumber}</div>
                        </div>
                        <div className="col-6">
                            <div className="text-sm text-600">Student</div>
                            <div className="font-medium">
                                {selectedModification.payment.student.firstName} {selectedModification.payment.student.lastName}
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="text-sm text-600">Original Amount</div>
                            <div className="font-semibold text-lg">GHS {selectedModification.payment.amountPaid.toFixed(2)}</div>
                        </div>
                    </div>
                </Card>

                {/* Modification Request */}
                <Card className="shadow-1 bg-orange-50 border-1 border-orange-200">
                    <div className="flex align-items-center gap-2 mb-3">
                        <i className="pi pi-exclamation-triangle text-orange-600 text-xl"></i>
                        <h4 className="text-lg font-semibold m-0">Modification Requested</h4>
                    </div>

                    <div className="mb-3">
                        <div className="text-sm text-600 mb-1">Requested by:</div>
                        <div className="font-medium">
                            {selectedModification.modifiedBy.firstName} {selectedModification.modifiedBy.lastName}
                        </div>
                        <div className="text-sm text-600">{new Date(selectedModification.modifiedAt).toLocaleString('en-GB')}</div>
                    </div>

                    <div className="mb-3">
                        <div className="text-sm text-600 mb-2">Reason for Modification:</div>
                        <div className="p-3 bg-white border-1 border-300 border-round">{selectedModification.reason}</div>
                    </div>

                    <div>
                        <div className="text-sm text-600 mb-2">Proposed Changes:</div>
                        <div className="p-3 bg-white border-1 border-300 border-round">
                            {selectedModification.changes &&
                                Object.entries(selectedModification.changes).map(([field, change]: [string, any]) => (
                                    <div key={field} className="mb-2 pb-2 border-bottom-1 border-200 last:border-bottom-none">
                                        <div className="font-semibold mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</div>
                                        <div className="flex align-items-center gap-2">
                                            <span className="text-red-600 line-through">{String(change.old)}</span>
                                            <i className="pi pi-arrow-right text-600"></i>
                                            <span className="text-green-600 font-semibold">{String(change.new)}</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </Card>

                {/* Approval Decision */}
                {approvalAction === 'approve' ? (
                    <Card className="shadow-1 bg-green-50 border-1 border-green-200">
                        <div className="flex align-items-center gap-2 mb-3">
                            <i className="pi pi-check-circle text-green-600 text-xl"></i>
                            <h4 className="text-lg font-semibold m-0 text-green-900">Approve Modification</h4>
                        </div>
                        <p className="text-green-800 mb-3">You are about to approve this modification. The payment record will be updated with the proposed changes.</p>
                        <div className="field">
                            <label htmlFor="approvalNotes" className="block mb-2 font-semibold">
                                Approval Notes <span className="text-500">(optional)</span>
                            </label>
                            <InputTextarea id="approvalNotes" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={3} className="w-full" placeholder="Add any notes or comments about this approval..." />
                        </div>
                    </Card>
                ) : (
                    <Card className="shadow-1 bg-red-50 border-1 border-red-200">
                        <div className="flex align-items-center gap-2 mb-3">
                            <i className="pi pi-times-circle text-red-600 text-xl"></i>
                            <h4 className="text-lg font-semibold m-0 text-red-900">Reject Modification</h4>
                        </div>
                        <p className="text-red-800 mb-3">You are about to reject this modification. The payment record will remain unchanged.</p>
                        <div className="field">
                            <label htmlFor="rejectionReason" className="block mb-2 font-semibold">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <InputTextarea id="rejectionReason" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={3} className="w-full" placeholder="Please provide a reason for rejecting this modification..." />
                            {approvalNotes.trim() === '' && <small className="text-red-600 block mt-1">A reason is required when rejecting a modification request</small>}
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <>
            <Toast ref={toast} />

            <Card className="shadow-2">
                <div className="flex justify-content-between align-items-center mb-4">
                    <div className="flex align-items-center gap-2">
                        <h2 className="text-2xl font-bold m-0">Payment Modification Approvals</h2>
                        {getPendingCount() > 0 && <Badge value={getPendingCount()} severity="danger" />}
                    </div>
                </div>

                <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                    <TabPanel
                        header={
                            <div className="flex align-items-center gap-2">
                                <span>Pending Approval</span>
                                {getPendingCount() > 0 && <Badge value={getPendingCount()} severity="danger" />}
                            </div>
                        }
                    >
                        <DataTable
                            value={modifications.filter((m) => m.status === 'pending')}
                            loading={loading}
                            emptyMessage={
                                <div className="text-center p-5">
                                    <i className="pi pi-check-circle text-green-500" style={{ fontSize: '3rem' }}></i>
                                    <div className="text-xl font-semibold mt-3 text-600">No pending approvals</div>
                                    <div className="text-sm text-500 mt-2">All modification requests have been reviewed</div>
                                </div>
                            }
                            paginator
                            rows={10}
                            rowsPerPageOptions={[10, 20, 50]}
                            stripedRows
                            showGridlines
                        >
                            <Column header="Payment" body={paymentBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Requested By" body={modifiedByBodyTemplate} style={{ minWidth: '180px' }} />
                            <Column header="Changes" body={changesBodyTemplate} style={{ minWidth: '250px' }} />
                            <Column header="Reason" body={reasonBodyTemplate} style={{ minWidth: '200px' }} />
                            <Column header="Actions" body={actionsBodyTemplate} style={{ minWidth: '200px' }} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header="Approved">
                        <DataTable value={modifications.filter((m) => m.status === 'approved')} loading={loading} emptyMessage="No approved modifications" paginator rows={10} rowsPerPageOptions={[10, 20, 50]} stripedRows showGridlines>
                            <Column header="Payment" body={paymentBodyTemplate} />
                            <Column header="Modified By" body={modifiedByBodyTemplate} />
                            <Column header="Changes" body={changesBodyTemplate} />
                            <Column header="Reason" body={reasonBodyTemplate} />
                            <Column header="Approved By" body={actionsBodyTemplate} />
                        </DataTable>
                    </TabPanel>

                    <TabPanel header="Rejected">
                        <DataTable value={modifications.filter((m) => m.status === 'rejected')} loading={loading} emptyMessage="No rejected modifications" paginator rows={10} rowsPerPageOptions={[10, 20, 50]} stripedRows showGridlines>
                            <Column header="Payment" body={paymentBodyTemplate} />
                            <Column header="Modified By" body={modifiedByBodyTemplate} />
                            <Column header="Changes" body={changesBodyTemplate} />
                            <Column header="Reason" body={reasonBodyTemplate} />
                            <Column header="Rejected By" body={actionsBodyTemplate} />
                        </DataTable>
                    </TabPanel>
                </TabView>
            </Card>

            {/* Approval/Rejection Dialog */}
            <Dialog visible={showApprovalDialog} onHide={() => setShowApprovalDialog(false)} header={approvalAction === 'approve' ? 'Approve Modification' : 'Reject Modification'} style={{ width: '700px' }} modal blockScroll>
                {renderModificationDetails()}

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" outlined onClick={() => setShowApprovalDialog(false)} disabled={processingApproval} />
                    <Button
                        label={approvalAction === 'approve' ? 'Approve' : 'Reject'}
                        icon={approvalAction === 'approve' ? 'pi pi-check' : 'pi pi-times'}
                        severity={approvalAction === 'approve' ? 'success' : 'danger'}
                        onClick={submitApproval}
                        disabled={processingApproval || (approvalAction === 'reject' && approvalNotes.trim() === '')}
                        loading={processingApproval}
                    />
                </div>
            </Dialog>
        </>
    );
};
