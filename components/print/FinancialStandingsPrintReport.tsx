'use client';

import React, { forwardRef } from 'react';

interface FinancialSummary {
    totalFeesExpected: number;
    totalFeesReceived: number;
    totalDailyCollections: number;
    totalScholarships: number;
    totalIncome: number;
    totalExpenditures: number;
    pendingExpenditures: number;
    approvedExpenditures: number;
    totalOutstanding: number;
    criticalDebtors: number;
    overdueAmount: number;
    netCashFlow: number;
    cashAtHand: number;
    bankBalance: number;
    incomeGrowth: number;
    expenseGrowth: number;
}

interface FinancialStandingsPrintReportProps {
    summary: FinancialSummary;
    schoolName: string;
    schoolAddress?: string;
    schoolContact?: string;
    schoolLogo?: string;
    filters: {
        school?: string;
        site?: string;
        academicYear?: string;
        dateFrom?: Date | null;
        dateTo?: Date | null;
    };
    generatedBy: string;
    periodView?: string;
}

export const FinancialStandingsPrintReport = forwardRef<HTMLDivElement, FinancialStandingsPrintReportProps>((props, ref) => {
    const { summary, schoolName, schoolAddress, schoolContact, schoolLogo, filters, generatedBy, periodView } = props;

    const currency = 'GHS';

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GH', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const getCollectionRate = () => {
        if (summary.totalFeesExpected === 0) return '0.0';
        return ((summary.totalFeesReceived / summary.totalFeesExpected) * 100).toFixed(1);
    };

    const getExpenditureRate = () => {
        if (summary.totalIncome === 0) return '0.0';
        return ((summary.totalExpenditures / summary.totalIncome) * 100).toFixed(1);
    };

    const hasFilters = () => {
        return filters.school || filters.site || filters.academicYear || filters.dateFrom || filters.dateTo;
    };

    const getFiltersSummary = () => {
        const appliedFilters: string[] = [];

        if (filters.site) appliedFilters.push(`Site: ${filters.site}`);
        if (filters.academicYear) appliedFilters.push(`Academic Year: ${filters.academicYear}`);
        if (periodView) appliedFilters.push(`Period: ${periodView}`);

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
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #2563eb;
                }

                .school-logo {
                    width: 80px;
                    height: 80px;
                    object-fit: contain;
                    margin-bottom: 12px;
                }

                .school-name {
                    font-size: 26px;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 8px 0;
                    letter-spacing: 0.5px;
                }

                .school-details {
                    font-size: 11px;
                    color: #555;
                    margin: 4px 0;
                    line-height: 1.5;
                }

                .report-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #2563eb;
                    margin: 18px 0 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .report-subtitle {
                    font-size: 12px;
                    color: #6b7280;
                    margin-bottom: 12px;
                    font-weight: 500;
                }

                .filters-section {
                    background: #eff6ff;
                    padding: 10px 12px;
                    border-radius: 6px;
                    margin: 12px 0;
                    border: 1px solid #bfdbfe;
                }

                .filters-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: #1e40af;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                }

                .filters-content {
                    font-size: 11px;
                    color: #374151;
                    line-height: 1.5;
                }

                .executive-summary {
                    background: #f0fdf4;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border: 2px solid #22c55e;
                }

                .summary-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #15803d;
                    margin-bottom: 12px;
                    text-transform: uppercase;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }

                .summary-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px;
                    background: white;
                    border-radius: 4px;
                    border: 1px solid #bbf7d0;
                }

                .summary-label {
                    font-size: 11px;
                    color: #4b5563;
                    font-weight: 500;
                }

                .summary-value {
                    font-size: 12px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .summary-value.positive {
                    color: #22c55e;
                }

                .summary-value.negative {
                    color: #ef4444;
                }

                .section {
                    margin: 20px 0;
                    page-break-inside: avoid;
                }

                .section-title {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 10px;
                    padding-bottom: 6px;
                    border-bottom: 2px solid #e5e7eb;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin: 12px 0;
                }

                .metric-card {
                    padding: 10px;
                    background: #f9fafb;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                }

                .metric-label {
                    font-size: 9px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    margin-bottom: 4px;
                    font-weight: 600;
                }

                .metric-value {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1f2937;
                }

                .metric-subtitle {
                    font-size: 9px;
                    color: #9ca3af;
                    margin-top: 3px;
                }

                .financial-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 12px 0;
                    font-size: 10px;
                }

                .financial-table thead {
                    background: #1f2937;
                    color: white;
                }

                .financial-table th {
                    padding: 8px 6px;
                    text-align: left;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: 0.3px;
                }

                .financial-table th.text-right {
                    text-align: right;
                }

                .financial-table td {
                    padding: 7px 6px;
                    border-bottom: 1px solid #e5e7eb;
                    color: #374151;
                }

                .financial-table td.text-right {
                    text-align: right;
                    font-weight: 600;
                }

                .financial-table tbody tr:nth-child(even) {
                    background: #f9fafb;
                }

                .table-footer {
                    background: #f3f4f6;
                    font-weight: 700;
                    border-top: 2px solid #1f2937;
                }

                .table-footer td {
                    padding: 10px 6px;
                    font-size: 11px;
                    color: #1f2937;
                }

                .alert-section {
                    background: #fef2f2;
                    padding: 12px;
                    border-radius: 6px;
                    margin: 15px 0;
                    border: 1px solid #fecaca;
                }

                .alert-title {
                    font-size: 11px;
                    font-weight: 600;
                    color: #991b1b;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }

                .alert-item {
                    padding: 6px 8px;
                    background: white;
                    border-radius: 4px;
                    margin-bottom: 6px;
                    font-size: 10px;
                    border-left: 3px solid #ef4444;
                }

                .alert-item:last-child {
                    margin-bottom: 0;
                }

                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 10px;
                    margin: 15px 0;
                }

                .kpi-card {
                    text-align: center;
                    padding: 10px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .kpi-value {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 3px;
                }

                .kpi-label {
                    font-size: 9px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .report-footer {
                    margin-top: 35px;
                    padding-top: 12px;
                    border-top: 2px solid #e5e7eb;
                }

                .footer-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 9px;
                    color: #6b7280;
                }

                .signature-section {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 50px;
                    margin-top: 50px;
                    padding-top: 15px;
                }

                .signature-box {
                    text-align: center;
                }

                .signature-line {
                    border-top: 2px solid #000;
                    margin-bottom: 6px;
                    padding-top: 40px;
                }

                .signature-label {
                    font-size: 10px;
                    color: #555;
                    font-weight: 600;
                }

                @media print {
                    .print-report {
                        padding: 8mm;
                        max-width: 100%;
                    }

                    .report-header {
                        margin-bottom: 18px;
                    }

                    .executive-summary {
                        margin: 15px 0;
                        padding: 12px;
                    }

                    .section {
                        margin: 15px 0;
                    }

                    .financial-table {
                        font-size: 9px;
                    }

                    .signature-section {
                        margin-top: 35px;
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

                <div className="report-title">Financial Standings Report</div>
                <div className="report-subtitle">Comprehensive Financial Overview & Analysis</div>

                <div className="filters-section">
                    <div className="filters-label">Report Parameters:</div>
                    <div className="filters-content">{getFiltersSummary()}</div>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="executive-summary">
                <div className="summary-title">Executive Summary</div>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="summary-label">Net Cash Flow:</span>
                        <span className={`summary-value ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}`}>{formatCurrency(summary.netCashFlow)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Total Income:</span>
                        <span className="summary-value positive">{formatCurrency(summary.totalIncome)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Total Expenses:</span>
                        <span className="summary-value negative">{formatCurrency(summary.totalExpenditures)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Outstanding Balance:</span>
                        <span className="summary-value negative">{formatCurrency(summary.totalOutstanding)}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Collection Rate:</span>
                        <span className="summary-value">{getCollectionRate()}%</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-label">Expenditure Rate:</span>
                        <span className="summary-value">{getExpenditureRate()}%</span>
                    </div>
                </div>
            </div>

            {/* Income Section */}
            <div className="section">
                <div className="section-title">Income Analysis</div>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-label">Total Income</div>
                        <div className="metric-value" style={{ color: '#22c55e' }}>
                            {formatCurrency(summary.totalIncome)}
                        </div>
                        <div className="metric-subtitle">
                            {summary.incomeGrowth >= 0 ? '+' : ''}
                            {summary.incomeGrowth.toFixed(1)}% growth
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Fees Received</div>
                        <div className="metric-value">{formatCurrency(summary.totalFeesReceived)}</div>
                        <div className="metric-subtitle">of {formatCurrency(summary.totalFeesExpected)} expected</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Daily Collections</div>
                        <div className="metric-value">{formatCurrency(summary.totalDailyCollections)}</div>
                        <div className="metric-subtitle">Canteen & Bus fees</div>
                    </div>
                </div>

                <table className="financial-table">
                    <thead>
                        <tr>
                            <th>Income Category</th>
                            <th className="text-right">Amount</th>
                            <th className="text-right">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Tuition Fees Received</td>
                            <td className="text-right">{formatCurrency(summary.totalFeesReceived)}</td>
                            <td className="text-right">{((summary.totalFeesReceived / summary.totalIncome) * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td>Daily Collections (Canteen & Bus)</td>
                            <td className="text-right">{formatCurrency(summary.totalDailyCollections)}</td>
                            <td className="text-right">{((summary.totalDailyCollections / summary.totalIncome) * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td>Scholarships & Other Income</td>
                            <td className="text-right">{formatCurrency(summary.totalScholarships)}</td>
                            <td className="text-right">{((summary.totalScholarships / summary.totalIncome) * 100).toFixed(1)}%</td>
                        </tr>
                    </tbody>
                    <tfoot className="table-footer">
                        <tr>
                            <td>TOTAL INCOME</td>
                            <td className="text-right">{formatCurrency(summary.totalIncome)}</td>
                            <td className="text-right">100.0%</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Expenditure Section */}
            <div className="section">
                <div className="section-title">Expenditure Analysis</div>
                <div className="metrics-grid">
                    <div className="metric-card">
                        <div className="metric-label">Total Expenses</div>
                        <div className="metric-value" style={{ color: '#ef4444' }}>
                            {formatCurrency(summary.totalExpenditures)}
                        </div>
                        <div className="metric-subtitle">
                            {summary.expenseGrowth >= 0 ? '+' : ''}
                            {summary.expenseGrowth.toFixed(1)}% change
                        </div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Approved</div>
                        <div className="metric-value">{formatCurrency(summary.approvedExpenditures)}</div>
                        <div className="metric-subtitle">Completed payments</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Pending</div>
                        <div className="metric-value">{formatCurrency(summary.pendingExpenditures)}</div>
                        <div className="metric-subtitle">Awaiting approval</div>
                    </div>
                </div>
            </div>

            {/* Receivables Section */}
            <div className="section">
                <div className="section-title">Receivables & Collections</div>

                <table className="financial-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th className="text-right">Amount</th>
                            <th className="text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Fees Expected</td>
                            <td className="text-right">{formatCurrency(summary.totalFeesExpected)}</td>
                            <td className="text-right">-</td>
                        </tr>
                        <tr>
                            <td>Total Fees Received</td>
                            <td className="text-right">{formatCurrency(summary.totalFeesReceived)}</td>
                            <td className="text-right">{getCollectionRate()}%</td>
                        </tr>
                        <tr>
                            <td>Total Outstanding Balance</td>
                            <td className="text-right" style={{ color: '#ef4444' }}>
                                {formatCurrency(summary.totalOutstanding)}
                            </td>
                            <td className="text-right">{(100 - parseFloat(getCollectionRate())).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td>Overdue Amount</td>
                            <td className="text-right" style={{ color: '#dc2626' }}>
                                {formatCurrency(summary.overdueAmount)}
                            </td>
                            <td className="text-right">Urgent</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Cash Position */}
            <div className="section">
                <div className="section-title">Cash Position & Liquidity</div>

                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-value" style={{ color: summary.netCashFlow >= 0 ? '#22c55e' : '#ef4444' }}>
                            {formatCurrency(summary.netCashFlow)}
                        </div>
                        <div className="kpi-label">Net Cash Flow</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{formatCurrency(summary.cashAtHand)}</div>
                        <div className="kpi-label">Cash at Hand</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{formatCurrency(summary.bankBalance)}</div>
                        <div className="kpi-label">Bank Balance</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{formatCurrency(summary.cashAtHand + summary.bankBalance)}</div>
                        <div className="kpi-label">Total Liquid Assets</div>
                    </div>
                </div>
            </div>

            {/* Financial Alerts */}
            {(summary.criticalDebtors > 0 || summary.netCashFlow < 0 || parseFloat(getCollectionRate()) < 70) && (
                <div className="alert-section">
                    <div className="alert-title">⚠️ Financial Alerts & Recommendations</div>

                    {summary.criticalDebtors > 0 && (
                        <div className="alert-item">
                            <strong>{summary.criticalDebtors} Critical Debtors:</strong> Students with less than 25% payment. Immediate follow-up required.
                        </div>
                    )}

                    {summary.netCashFlow < 0 && (
                        <div className="alert-item">
                            <strong>Negative Cash Flow:</strong> Expenses exceed income by {formatCurrency(Math.abs(summary.netCashFlow))}. Review expenditure controls.
                        </div>
                    )}

                    {parseFloat(getCollectionRate()) < 70 && (
                        <div className="alert-item">
                            <strong>Low Collection Rate:</strong> Currently at {getCollectionRate()}%. Intensify collection efforts and send payment reminders.
                        </div>
                    )}

                    {summary.pendingExpenditures > 1000 && (
                        <div className="alert-item">
                            <strong>Pending Approvals:</strong> {formatCurrency(summary.pendingExpenditures)} in expenditures awaiting approval.
                        </div>
                    )}
                </div>
            )}

            {/* Signature Section */}
            <div className="signature-section">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <div className="signature-label">Financial Controller / Prepared By</div>
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
                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '9px', color: '#9ca3af' }}>
                    <strong>System:</strong> School Management System | <strong>Report Type:</strong> Financial Standings | <strong>Confidential Document</strong>
                </div>
            </div>
        </div>
    );
});

FinancialStandingsPrintReport.displayName = 'FinancialStandingsPrintReport';

export default FinancialStandingsPrintReport;
