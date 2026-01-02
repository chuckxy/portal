'use client';

import React, { forwardRef } from 'react';

interface DebtorStudent {
    _id: string;
    studentId: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    site: {
        _id: string;
        description: string;
    };
    class: {
        _id: string;
        name: string;
    };
    academicYear: string;
    academicTerm?: number;
    totalFeesRequired: number;
    totalFeesPaid: number;
    outstandingBalance: number;
    percentagePaid: number;
    paymentDeadline?: Date;
    daysOverdue?: number;
    lastPaymentDate?: Date;
}

interface TuitionDefaultersPrintReportProps {
    debtors: DebtorStudent[];
    schoolName: string;
    schoolAddress?: string;
    schoolContact?: string;
    schoolLogo?: string;
    filters: {
        school?: string;
        site?: string;
        className?: string;
        academicYear?: string;
        academicTerm?: number | null;
        dateFrom?: Date | null;
        dateTo?: Date | null;
        paymentStatus?: string;
    };
    generatedBy: string;
}

export const TuitionDefaultersPrintReport = forwardRef<HTMLDivElement, TuitionDefaultersPrintReportProps>((props, ref) => {
    const { debtors, schoolName, schoolAddress, schoolContact, schoolLogo, filters, generatedBy } = props;

    // Calculate totals
    const totalFeesRequired = debtors.reduce((sum, d) => sum + (d.totalFeesRequired || 0), 0);
    const totalFeesPaid = debtors.reduce((sum, d) => sum + (d.totalFeesPaid || 0), 0);
    const totalOutstanding = debtors.reduce((sum, d) => sum + (d.outstandingBalance || 0), 0);
    const totalDefaulters = debtors.length;

    // Calculate payment status breakdown
    const unpaidCount = debtors.filter((d) => d.percentagePaid === 0).length;
    const partialCount = debtors.filter((d) => d.percentagePaid > 0 && d.percentagePaid < 100).length;
    const overdueCount = debtors.filter((d) => (d.daysOverdue || 0) > 0).length;

    const currency = 'GHS';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (date: Date | string | undefined) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getPaymentStatus = (debtor: DebtorStudent) => {
        if (debtor.percentagePaid === 0) return 'Unpaid';
        if (debtor.percentagePaid === 100) return 'Paid';
        if ((debtor.daysOverdue || 0) > 0) return 'Overdue';
        return 'Partial';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Unpaid':
                return '#ef4444';
            case 'Overdue':
                return '#dc2626';
            case 'Partial':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    const hasFilters = () => {
        return filters.school || filters.site || filters.className || filters.academicYear || filters.academicTerm || filters.dateFrom || filters.dateTo || filters.paymentStatus;
    };

    const getFiltersSummary = () => {
        const appliedFilters: string[] = [];

        if (filters.site) appliedFilters.push(`Site: ${filters.site}`);
        if (filters.className) appliedFilters.push(`Class: ${filters.className}`);
        if (filters.academicYear) appliedFilters.push(`Year: ${filters.academicYear}`);
        if (filters.academicTerm) appliedFilters.push(`Term: ${filters.academicTerm}`);
        if (filters.dateFrom && filters.dateTo) {
            appliedFilters.push(`Period: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`);
        } else if (filters.dateFrom) {
            appliedFilters.push(`From: ${formatDate(filters.dateFrom)}`);
        } else if (filters.dateTo) {
            appliedFilters.push(`Until: ${formatDate(filters.dateTo)}`);
        }
        if (filters.paymentStatus) appliedFilters.push(`Status: ${filters.paymentStatus}`);

        return appliedFilters.length > 0 ? appliedFilters.join(' | ') : 'No filters applied - All records included';
    };

    return (
        <div ref={ref} className="print-report">
            <style jsx>{`
                .print-report {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 210mm;
                    margin: 0 auto;
                    background: white;
                    color: #000;
                    padding: 12mm;
                }

                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #dc2626;
                }

                .school-logo {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin-bottom: 15px;
                }

                .school-name {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 10px 0;
                    letter-spacing: 0.5px;
                }

                .school-details {
                    font-size: 12px;
                    color: #555;
                    margin: 5px 0;
                    line-height: 1.6;
                }

                .report-title {
                    font-size: 22px;
                    font-weight: 600;
                    color: #dc2626;
                    margin: 20px 0 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .report-subtitle {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 15px;
                    font-weight: 500;
                }

                .filters-section {
                    background: #fef2f2;
                    padding: 12px 15px;
                    border-radius: 6px;
                    margin: 15px 0;
                    border: 1px solid #fecaca;
                }

                .filters-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: #991b1b;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }

                .filters-content {
                    font-size: 12px;
                    color: #374151;
                    line-height: 1.6;
                }

                .summary-section {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin: 25px 0;
                    padding: 20px;
                    background: #f9fafb;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }

                .summary-card {
                    text-align: center;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .summary-label {
                    font-size: 10px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 6px;
                    font-weight: 600;
                }

                .summary-value {
                    font-size: 20px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .summary-value.danger {
                    color: #dc2626;
                }

                .summary-value.warning {
                    color: #f59e0b;
                }

                .defaulters-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 25px 0;
                    font-size: 10px;
                }

                .defaulters-table thead {
                    background: #1f2937;
                    color: white;
                }

                .defaulters-table th {
                    padding: 10px 6px;
                    text-align: left;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: 0.3px;
                }

                .defaulters-table th.text-right {
                    text-align: right;
                }

                .defaulters-table td {
                    padding: 8px 6px;
                    border-bottom: 1px solid #e5e7eb;
                    color: #374151;
                }

                .defaulters-table td.text-right {
                    text-align: right;
                    font-weight: 600;
                }

                .defaulters-table tbody tr:nth-child(even) {
                    background: #f9fafb;
                }

                .defaulters-table tbody tr:hover {
                    background: #f3f4f6;
                }

                .student-name {
                    font-weight: 600;
                    color: #1f2937;
                }

                .student-id {
                    font-size: 9px;
                    color: #6b7280;
                    display: block;
                    margin-top: 2px;
                }

                .status-badge {
                    display: inline-block;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .balance-amount {
                    font-weight: 700;
                }

                .table-footer {
                    background: #f3f4f6;
                    font-weight: 700;
                    border-top: 2px solid #1f2937;
                }

                .table-footer td {
                    padding: 12px 6px;
                    font-size: 11px;
                    color: #1f2937;
                }

                .payment-breakdown {
                    margin: 25px 0;
                    padding: 15px;
                    background: #fef2f2;
                    border-radius: 8px;
                    border: 1px solid #fecaca;
                }

                .breakdown-title {
                    font-size: 12px;
                    font-weight: 600;
                    color: #991b1b;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }

                .breakdown-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }

                .breakdown-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    color: #374151;
                    padding: 5px 0;
                }

                .breakdown-label {
                    font-weight: 500;
                }

                .breakdown-value {
                    font-weight: 700;
                }

                .report-footer {
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 2px solid #e5e7eb;
                }

                .footer-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 10px;
                    color: #6b7280;
                }

                .page-number {
                    text-align: center;
                    margin-top: 10px;
                    font-size: 10px;
                    color: #9ca3af;
                }

                .signature-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 60px;
                    margin-top: 60px;
                    padding-top: 20px;
                }

                .signature-box {
                    text-align: center;
                }

                .signature-line {
                    border-top: 2px solid #000;
                    margin-bottom: 8px;
                    padding-top: 50px;
                }

                .signature-label {
                    font-size: 11px;
                    color: #555;
                    font-weight: 600;
                }

                @media print {
                    .print-report {
                        padding: 8mm;
                        max-width: 100%;
                    }

                    .report-header {
                        margin-bottom: 20px;
                    }

                    .summary-section {
                        margin: 15px 0;
                        padding: 15px;
                    }

                    .defaulters-table {
                        font-size: 9px;
                    }

                    .defaulters-table th,
                    .defaulters-table td {
                        padding: 6px 4px;
                    }

                    .signature-section {
                        margin-top: 40px;
                    }

                    @page {
                        size: A4;
                        margin: 10mm;
                    }

                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            {/* Header Section */}
            <div className="report-header">
                {schoolLogo && <img src={schoolLogo} alt="School Logo" className="school-logo" />}
                <div className="school-name">{schoolName}</div>
                {schoolAddress && <div className="school-details">{schoolAddress}</div>}
                {schoolContact && <div className="school-details">{schoolContact}</div>}

                <div className="report-title">Tuition Defaulters Report</div>
                <div className="report-subtitle">Students with Outstanding Tuition Balances</div>

                <div className="filters-section">
                    <div className="filters-label">Applied Filters:</div>
                    <div className="filters-content">{getFiltersSummary()}</div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
                <div className="summary-card">
                    <div className="summary-label">Total Defaulters</div>
                    <div className="summary-value danger">{totalDefaulters}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Outstanding</div>
                    <div className="summary-value danger">{formatCurrency(totalOutstanding)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Required</div>
                    <div className="summary-value">{formatCurrency(totalFeesRequired)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Paid</div>
                    <div className="summary-value">{formatCurrency(totalFeesPaid)}</div>
                </div>
            </div>

            {/* Payment Status Breakdown */}
            <div className="payment-breakdown">
                <div className="breakdown-title">Payment Status Breakdown</div>
                <div className="breakdown-grid">
                    <div className="breakdown-item">
                        <span className="breakdown-label">Unpaid:</span>
                        <span className="breakdown-value">{unpaidCount} students</span>
                    </div>
                    <div className="breakdown-item">
                        <span className="breakdown-label">Partial Payment:</span>
                        <span className="breakdown-value">{partialCount} students</span>
                    </div>
                    <div className="breakdown-item">
                        <span className="breakdown-label">Overdue:</span>
                        <span className="breakdown-value">{overdueCount} students</span>
                    </div>
                </div>
            </div>

            {/* Defaulters Table */}
            <table className="defaulters-table">
                <thead>
                    <tr>
                        <th style={{ width: '5%' }}>No.</th>
                        <th style={{ width: '20%' }}>Student Details</th>
                        <th style={{ width: '12%' }}>Class</th>
                        <th style={{ width: '10%' }}>Academic Period</th>
                        <th style={{ width: '11%' }} className="text-right">
                            Total Fees
                        </th>
                        <th style={{ width: '11%' }} className="text-right">
                            Amount Paid
                        </th>
                        <th style={{ width: '11%' }} className="text-right">
                            Outstanding
                        </th>
                        <th style={{ width: '10%' }}>Due Date</th>
                        <th style={{ width: '10%' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {debtors.map((debtor, index) => {
                        const status = getPaymentStatus(debtor);
                        const statusColor = getStatusColor(status);

                        return (
                            <tr key={debtor._id || index}>
                                <td>{index + 1}</td>
                                <td>
                                    <div className="student-name">
                                        {debtor.firstName} {debtor.lastName}
                                    </div>
                                    <span className="student-id">ID: {debtor.studentId}</span>
                                </td>
                                <td>{debtor.class?.name || 'N/A'}</td>
                                <td>
                                    {debtor.academicYear}
                                    {debtor.academicTerm ? ` - T${debtor.academicTerm}` : ''}
                                </td>
                                <td className="text-right">{formatCurrency(debtor.totalFeesRequired)}</td>
                                <td className="text-right">{formatCurrency(debtor.totalFeesPaid)}</td>
                                <td className="text-right">
                                    <span className="balance-amount" style={{ color: statusColor }}>
                                        {formatCurrency(debtor.outstandingBalance)}
                                    </span>
                                </td>
                                <td>
                                    {formatDate(debtor.paymentDeadline)}
                                    {debtor.daysOverdue && debtor.daysOverdue > 0 && <div style={{ fontSize: '8px', color: '#dc2626', marginTop: '2px' }}>{debtor.daysOverdue} days overdue</div>}
                                </td>
                                <td>
                                    <span className="status-badge" style={{ backgroundColor: statusColor, color: 'white' }}>
                                        {status}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="table-footer">
                    <tr>
                        <td colSpan={4} style={{ textAlign: 'right' }}>
                            TOTAL ({totalDefaulters} Students):
                        </td>
                        <td className="text-right">{formatCurrency(totalFeesRequired)}</td>
                        <td className="text-right">{formatCurrency(totalFeesPaid)}</td>
                        <td className="text-right">{formatCurrency(totalOutstanding)}</td>
                        <td colSpan={2}></td>
                    </tr>
                </tfoot>
            </table>

            {/* Signature Section */}
            <div className="signature-section">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Prepared By / Financial Officer</div>
                </div>
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Reviewed & Approved By</div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="report-footer">
                <div className="footer-content">
                    <div>
                        <strong>Generated by:</strong> {generatedBy}
                    </div>
                    <div>
                        <strong>Date & Time:</strong> {new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                </div>
                <div className="page-number">
                    <strong>System:</strong> School Management System | <strong>Report Type:</strong> Tuition Defaulters
                </div>
            </div>
        </div>
    );
});

TuitionDefaultersPrintReport.displayName = 'TuitionDefaultersPrintReport';

export default TuitionDefaultersPrintReport;
