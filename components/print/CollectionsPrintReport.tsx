'use client';

import React, { forwardRef } from 'react';

interface DailyFeeCollectionData {
    _id?: string;
    school: any;
    site: any;
    academicYear: string;
    academicTerm: number;
    collectionDate: Date;
    canteenFeeAmount: number;
    busFeeAmount: number;
    totalStudents: number;
    totalStudentsPresent: number;
    totalAbsent: number;
    accumulatedCanteenFee: number;
    accumulatedBusFee: number;
    currency: string;
    notes?: string;
    recordedBy?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface CollectionsPrintReportProps {
    collections: DailyFeeCollectionData[];
    schoolName: string;
    schoolAddress?: string;
    schoolContact?: string;
    schoolLogo?: string;
    academicYear: string;
    academicTerm: number | null;
    dateFrom: Date | null;
    dateTo: Date | null;
    siteName?: string;
    generatedBy: string;
}

export const CollectionsPrintReport = forwardRef<HTMLDivElement, CollectionsPrintReportProps>((props, ref) => {
    const { collections, schoolName, schoolAddress, schoolContact, schoolLogo, academicYear, academicTerm, dateFrom, dateTo, siteName, generatedBy } = props;

    // Calculate totals
    const totalCanteenFees = collections.reduce((sum, c) => sum + (c.canteenFeeAmount || 0), 0);
    const totalBusFees = collections.reduce((sum, c) => sum + (c.busFeeAmount || 0), 0);
    const grandTotal = totalCanteenFees + totalBusFees;
    const totalTransactions = collections.length;

    const currency = collections[0]?.currency || 'GHS';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const reportPeriod = () => {
        if (dateFrom && dateTo) {
            return `${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
        } else if (dateFrom) {
            return `From ${formatDate(dateFrom)}`;
        } else if (dateTo) {
            return `Up to ${formatDate(dateTo)}`;
        }
        return 'All Dates';
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
                    padding: 20mm;
                }

                .report-header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2c3e50;
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
                    color: #2c3e50;
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
                    color: #2c3e50;
                    margin: 20px 0 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .report-metadata {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 15px;
                    font-size: 13px;
                    color: #555;
                }

                .metadata-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                .metadata-label {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .summary-section {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                }

                .summary-card {
                    text-align: center;
                    padding: 15px;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }

                .summary-label {
                    font-size: 11px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                    font-weight: 600;
                }

                .summary-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: #2c3e50;
                }

                .summary-value.highlight {
                    color: #27ae60;
                }

                .collections-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                    font-size: 11px;
                }

                .collections-table thead {
                    background: #2c3e50;
                    color: white;
                }

                .collections-table th {
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 10px;
                    letter-spacing: 0.5px;
                }

                .collections-table th.text-right {
                    text-align: right;
                }

                .collections-table td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #dee2e6;
                    color: #333;
                }

                .collections-table td.text-right {
                    text-align: right;
                    font-weight: 600;
                }

                .collections-table tbody tr:nth-child(even) {
                    background: #f8f9fa;
                }

                .collections-table tbody tr:hover {
                    background: #e9ecef;
                }

                .table-footer {
                    background: #e9ecef;
                    font-weight: 700;
                    border-top: 2px solid #2c3e50;
                }

                .table-footer td {
                    padding: 15px 8px;
                    font-size: 12px;
                    color: #2c3e50;
                }

                .report-footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #dee2e6;
                }

                .footer-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: #666;
                }

                .signature-section {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 40px;
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

                .page-break {
                    page-break-after: always;
                }

                @media print {
                    .print-report {
                        padding: 15mm;
                        max-width: 100%;
                    }

                    .report-header {
                        margin-bottom: 20px;
                    }

                    .summary-section {
                        margin: 20px 0;
                        padding: 15px;
                    }

                    .collections-table {
                        font-size: 10px;
                    }

                    .collections-table th,
                    .collections-table td {
                        padding: 8px 6px;
                    }

                    .signature-section {
                        margin-top: 40px;
                    }

                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                }
            `}</style>

            {/* Header Section */}
            <div className="report-header">
                {schoolLogo && <img src={schoolLogo} alt="School Logo" className="school-logo" />}
                <div className="school-name">{schoolName}</div>
                {schoolAddress && <div className="school-details">{schoolAddress}</div>}
                {schoolContact && <div className="school-details">{schoolContact}</div>}

                <div className="report-title">Collections Report</div>

                <div className="report-metadata">
                    {academicYear && (
                        <div className="metadata-item">
                            <span className="metadata-label">Academic Year:</span>
                            <span>{academicYear}</span>
                        </div>
                    )}
                    {academicTerm && (
                        <div className="metadata-item">
                            <span className="metadata-label">Term:</span>
                            <span>Term {academicTerm}</span>
                        </div>
                    )}
                    {siteName && (
                        <div className="metadata-item">
                            <span className="metadata-label">Site:</span>
                            <span>{siteName}</span>
                        </div>
                    )}
                    <div className="metadata-item">
                        <span className="metadata-label">Period:</span>
                        <span>{reportPeriod()}</span>
                    </div>
                </div>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
                <div className="summary-card">
                    <div className="summary-label">Total Collections</div>
                    <div className="summary-value highlight">{formatCurrency(grandTotal)}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Transactions</div>
                    <div className="summary-value">{totalTransactions}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Average Daily</div>
                    <div className="summary-value">{formatCurrency(totalTransactions > 0 ? grandTotal / totalTransactions : 0)}</div>
                </div>
            </div>

            {/* Collections Table */}
            <table className="collections-table">
                <thead>
                    <tr>
                        <th style={{ width: '8%' }}>No.</th>
                        <th style={{ width: '12%' }}>Date</th>
                        <th style={{ width: '20%' }}>Site</th>
                        <th style={{ width: '10%' }} className="text-right">
                            Attendance
                        </th>
                        <th style={{ width: '15%' }} className="text-right">
                            Canteen Fee
                        </th>
                        <th style={{ width: '15%' }} className="text-right">
                            Bus Fee
                        </th>
                        <th style={{ width: '15%' }} className="text-right">
                            Total
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {collections.map((collection, index) => {
                        const total = (collection.canteenFeeAmount || 0) + (collection.busFeeAmount || 0);
                        const attendanceRate = collection.totalStudents > 0 ? ((collection.totalStudentsPresent / collection.totalStudents) * 100).toFixed(1) : '0.0';

                        return (
                            <tr key={collection._id || index}>
                                <td>{index + 1}</td>
                                <td>{formatDate(collection.collectionDate)}</td>
                                <td>{collection.site?.description || 'N/A'}</td>
                                <td className="text-right">
                                    {collection.totalStudentsPresent}/{collection.totalStudents} ({attendanceRate}%)
                                </td>
                                <td className="text-right">{formatCurrency(collection.canteenFeeAmount || 0)}</td>
                                <td className="text-right">{formatCurrency(collection.busFeeAmount || 0)}</td>
                                <td className="text-right">{formatCurrency(total)}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot className="table-footer">
                    <tr>
                        <td colSpan={4} style={{ textAlign: 'right' }}>
                            TOTAL:
                        </td>
                        <td className="text-right">{formatCurrency(totalCanteenFees)}</td>
                        <td className="text-right">{formatCurrency(totalBusFees)}</td>
                        <td className="text-right">{formatCurrency(grandTotal)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Signature Section */}
            <div className="signature-section">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Prepared By</div>
                </div>
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Verified By</div>
                </div>
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Approved By</div>
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
            </div>
        </div>
    );
});

CollectionsPrintReport.displayName = 'CollectionsPrintReport';

export default CollectionsPrintReport;
