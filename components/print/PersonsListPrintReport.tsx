'use client';

import React, { forwardRef } from 'react';

interface Person {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    username: string;
    personCategory: string;
    photoLink?: string;
    contact?: {
        email?: string;
        mobilePhone?: string;
    };
    studentInfo?: {
        studentId?: string;
        currentClass?: any;
        faculty?: any;
        department?: any;
    };
    employeeInfo?: {
        customId?: string;
        jobTitle?: string;
    };
    isActive: boolean;
}

interface PersonsListPrintReportProps {
    persons: Person[];
    schoolName: string;
    schoolAddress?: string;
    schoolContact?: string;
    schoolLogo?: string;
    siteName?: string;
    generatedBy: string;
    filters: {
        category?: string;
        status?: string;
        classFilter?: string;
    };
}

export const PersonsListPrintReport = forwardRef<HTMLDivElement, PersonsListPrintReportProps>((props, ref) => {
    const { persons, schoolName, schoolAddress, schoolContact, schoolLogo, siteName, generatedBy, filters } = props;

    // Filter to only include students
    const students = persons.filter(p => p.personCategory === 'student');

    // Group students by class
    const groupByClass = () => {
        const grouped: { [key: string]: Person[] } = {};

        students.forEach((person) => {
            if (person.studentInfo?.currentClass) {
                const className = person.studentInfo.currentClass.className || 'Unassigned';
                if (!grouped[className]) {
                    grouped[className] = [];
                }
                grouped[className].push(person);
            } else {
                if (!grouped['Unassigned']) {
                    grouped['Unassigned'] = [];
                }
                grouped['Unassigned'].push(person);
            }
        });

        // Sort classes alphabetically
        return Object.keys(grouped)
            .sort()
            .map((className) => ({
                className,
                students: grouped[className].sort((a, b) => 
                    `${a.lastName || ''} ${a.firstName}`.localeCompare(`${b.lastName || ''} ${b.firstName}`)
                )
            }));
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatFullName = (person: Person) => {
        return `${person.lastName || ''} ${person.firstName} ${person.middleName || ''}`.trim();
    };

    const classGroups = groupByClass();

    return (
        <div ref={ref} className="print-report">
            <style jsx>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    .page-break {
                        page-break-before: always;
                    }
                }

                .print-report {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    max-width: 210mm;
                    margin: 0 auto;
                    background: white;
                    color: #000;
                    padding: 10mm;
                }

                .report-header {
                    text-align: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 3px solid #2c3e50;
                }

                .school-logo {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                    margin-bottom: 10px;
                }

                .school-name {
                    font-size: 24px;
                    font-weight: 700;
                    color: #2c3e50;
                    margin: 8px 0;
                    letter-spacing: 0.5px;
                }

                .school-details {
                    font-size: 11px;
                    color: #555;
                    margin: 3px 0;
                    line-height: 1.5;
                }

                .report-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 15px 0 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .report-metadata {
                    display: flex;
                    justify-content: center;
                    flex-wrap: wrap;
                    gap: 20px;
                    margin-top: 12px;
                    font-size: 11px;
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

                .filters-section {
                    background: #f8f9fa;
                    padding: 10px 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    font-size: 11px;
                }

                .filters-title {
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }

                .filter-tags {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .filter-tag {
                    background: #fff;
                    border: 1px solid #dee2e6;
                    padding: 3px 10px;
                    border-radius: 3px;
                    font-size: 10px;
                }

                .class-section {
                    margin-bottom: 30px;
                    break-inside: avoid;
                }

                .class-header {
                    background: #2c3e50;
                    color: white;
                    padding: 10px 15px;
                    margin-bottom: 10px;
                    border-radius: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .class-name {
                    font-size: 16px;
                    font-weight: 600;
                }

                .class-count {
                    font-size: 13px;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 3px 10px;
                    border-radius: 3px;
                }

                .persons-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    font-size: 11px;
                }

                .persons-table thead {
                    background: #f8f9fa;
                }

                .persons-table th {
                    padding: 8px 10px;
                    text-align: left;
                    font-weight: 600;
                    color: #2c3e50;
                    border-bottom: 2px solid #dee2e6;
                }

                .persons-table td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #e9ecef;
                }

                .persons-table tbody tr:hover {
                    background: #f8f9fa;
                }

                .persons-table tbody tr:nth-child(even) {
                    background: #fafbfc;
                }

                .serial-number {
                    font-weight: 600;
                    color: #6c757d;
                    width: 40px;
                }

                .person-name {
                    font-weight: 500;
                    color: #2c3e50;
                }

                .contact-info {
                    color: #6c757d;
                    font-size: 10px;
                }

                .student-id {
                    font-family: 'Courier New', monospace;
                    font-weight: 600;
                    color: #495057;
                }

                .status-badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 9px;
                    font-weight: 600;
                }

                .status-active {
                    background: #d4edda;
                    color: #155724;
                }

                .status-inactive {
                    background: #f8d7da;
                    color: #721c24;
                }

                .summary-section {
                    margin-top: 25px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 5px;
                    border-left: 4px solid #2c3e50;
                }

                .summary-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .summary-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    font-size: 12px;
                }

                .summary-stat {
                    display: flex;
                    justify-content: space-between;
                }

                .stat-label {
                    color: #6c757d;
                }

                .stat-value {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #dee2e6;
                    font-size: 10px;
                    color: #6c757d;
                    display: flex;
                    justify-content: space-between;
                }

                .no-data {
                    text-align: center;
                    padding: 40px;
                    color: #6c757d;
                    font-size: 14px;
                }
            `}</style>

            {/* Report Header */}
            <div className="report-header">
                {schoolLogo && <img src={schoolLogo} alt="School Logo" className="school-logo" />}
                <div className="school-name">{schoolName}</div>
                {schoolAddress && <div className="school-details">{schoolAddress}</div>}
                {schoolContact && <div className="school-details">{schoolContact}</div>}
                {siteName && <div className="school-details">Campus: {siteName}</div>}

                <div className="report-title">
                    Students List by Class
                </div>

                <div className="report-metadata">
                    <div className="metadata-item">
                        <span className="metadata-label">Total Students:</span>
                        <span>{students.length}</span>
                    </div>
                    <div className="metadata-item">
                        <span className="metadata-label">Total Classes:</span>
                        <span>{classGroups.length}</span>
                    </div>
                    <div className="metadata-item">
                        <span className="metadata-label">Generated:</span>
                        <span>{formatDate(new Date())}</span>
                    </div>
                    <div className="metadata-item">
                        <span className="metadata-label">Generated By:</span>
                        <span>{generatedBy}</span>
                    </div>
                </div>
            </div>

            {/* Active Filters */}
            {(filters.status || filters.classFilter) && (
                <div className="filters-section">
                    <div className="filters-title">Applied Filters:</div>
                    <div className="filter-tags">
                        {filters.status && (
                            <div className="filter-tag">
                                Status: {filters.status === 'true' ? 'Active' : 'Inactive'}
                            </div>
                        )}
                        {filters.classFilter && (
                            <div className="filter-tag">Class: {filters.classFilter}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {students.length === 0 ? (
                <div className="no-data">No students found matching the selected filters.</div>
            ) : (
                // Students grouped by class
                <>
                    {classGroups.map((group, index) => (
                        <div key={group.className} className={`class-section ${index > 0 ? 'page-break' : ''}`}>
                            <div className="class-header">
                                <div className="class-name">{group.className}</div>
                                <div className="class-count">{group.students.length} Students</div>
                            </div>

                            <table className="persons-table">
                                <thead>
                                    <tr>
                                        <th className="serial-number">#</th>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Contact</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.students.map((person, idx) => (
                                        <tr key={person._id}>
                                            <td className="serial-number">{idx + 1}</td>
                                            <td className="student-id">{person.studentInfo?.studentId || 'N/A'}</td>
                                            <td className="person-name">{formatFullName(person)}</td>
                                            <td className="contact-info">
                                                {person.contact?.mobilePhone || person.contact?.email || 'N/A'}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${person.isActive ? 'status-active' : 'status-inactive'}`}>
                                                    {person.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            )}

            {/* Summary */}
            {students.length > 0 && (
                <div className="summary-section">
                    <div className="summary-title">Summary</div>
                    <div className="summary-stats">
                        <div className="summary-stat">
                            <span className="stat-label">Total Students:</span>
                            <span className="stat-value">{students.length}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Active:</span>
                            <span className="stat-value">{students.filter(p => p.isActive).length}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Inactive:</span>
                            <span className="stat-value">{students.filter(p => !p.isActive).length}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-label">Classes:</span>
                            <span className="stat-value">{classGroups.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="footer">
                <div>Printed: {new Date().toLocaleString('en-GB')}</div>
                <div>Page 1 of 1</div>
            </div>
        </div>
    );
});

PersonsListPrintReport.displayName = 'PersonsListPrintReport';
