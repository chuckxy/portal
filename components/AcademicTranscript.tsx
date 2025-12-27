'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';

interface AcademicTranscriptProps {
    studentId: string;
}

interface CourseRecord {
    code: string;
    courseTitle: string;
    credit: number;
    grade: string;
    gpt: number;
}

interface SemesterRecord {
    academicYear: string;
    academicTerm: number;
    level: string;
    courses: CourseRecord[];
    cct: number; // Current Credit Taken
    ccp: number; // Current Credit Passed
    gpa: number; // Grade Point Average
    cgpa: number; // Cumulative Grade Point Average
}

interface TranscriptData {
    student: {
        fullName: string;
        studentId: string;
        program: string;
        major: string;
        class: string;
        dateOfAdmission?: string;
    };
    semesters: SemesterRecord[];
    overallCGPA: number;
    totalCredits: number;
}

// Printable Transcript Component
const PrintableTranscript = React.forwardRef<HTMLDivElement, { data: TranscriptData; semesters: SemesterRecord[] }>((props, ref) => {
    const { data, semesters } = props;

    const getGradeColor = (grade: string) => {
        const gradeColors: Record<string, string> = {
            A: '#22c55e',
            'B+': '#3b82f6',
            B: '#3b82f6',
            'C+': '#f59e0b',
            C: '#f59e0b',
            D: '#f59e0b',
            E: '#ef4444',
            F: '#ef4444'
        };
        return gradeColors[grade] || '#6b7280';
    };

    return (
        <div ref={ref} style={{ padding: '40px', fontFamily: 'Arial, sans-serif', backgroundColor: 'white' }}>
            <style>
                {`
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    .print-header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #000;
                        padding-bottom: 20px;
                    }
                    
                    .print-header h1 {
                        font-size: 28px;
                        font-weight: bold;
                        margin: 0 0 10px 0;
                        color: #000;
                    }
                    
                    .print-header h2 {
                        font-size: 20px;
                        margin: 5px 0;
                        color: #333;
                    }
                    
                    .student-info {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 25px;
                        font-size: 12px;
                    }
                    
                    .info-row {
                        display: flex;
                        margin-bottom: 8px;
                    }
                    
                    .info-label {
                        font-weight: bold;
                        min-width: 140px;
                        color: #000;
                    }
                    
                    .info-value {
                        color: #333;
                    }
                    
                    .semester-section {
                        margin-bottom: 30px;
                        page-break-inside: avoid;
                    }
                    
                    .semester-header {
                        background-color: #f3f4f6;
                        padding: 12px;
                        font-weight: bold;
                        font-size: 13px;
                        border: 1px solid #d1d5db;
                        margin-bottom: 15px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .semester-stats {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                        margin-bottom: 15px;
                        background-color: #fafafa;
                        padding: 12px;
                        border: 1px solid #e5e7eb;
                    }
                    
                    .stat-box {
                        text-align: center;
                    }
                    
                    .stat-label {
                        font-size: 10px;
                        color: #666;
                        margin-bottom: 4px;
                    }
                    
                    .stat-value {
                        font-size: 14px;
                        font-weight: bold;
                        color: #000;
                    }
                    
                    .courses-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 15px;
                        font-size: 11px;
                    }
                    
                    .courses-table th {
                        background-color: #e5e7eb;
                        padding: 10px 8px;
                        text-align: left;
                        font-weight: bold;
                        border: 1px solid #d1d5db;
                        color: #000;
                    }
                    
                    .courses-table td {
                        padding: 8px;
                        border: 1px solid #d1d5db;
                        color: #333;
                    }
                    
                    .courses-table tbody tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                    
                    .grade-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-weight: bold;
                        font-size: 11px;
                        color: white;
                    }
                    
                    .semester-footer {
                        background-color: #f3f4f6;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        font-weight: bold;
                    }
                    
                    .overall-summary {
                        margin-top: 30px;
                        padding: 20px;
                        background-color: #f9fafb;
                        border: 2px solid #d1d5db;
                        page-break-inside: avoid;
                    }
                    
                    .overall-summary h3 {
                        font-size: 16px;
                        margin: 0 0 15px 0;
                        color: #000;
                    }
                    
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                    }
                    
                    .summary-card {
                        text-align: center;
                        padding: 15px;
                        background-color: white;
                        border: 1px solid #d1d5db;
                        border-radius: 4px;
                    }
                    
                    .summary-label {
                        font-size: 11px;
                        color: #666;
                        margin-bottom: 8px;
                    }
                    
                    .summary-value {
                        font-size: 22px;
                        font-weight: bold;
                        color: #3b82f6;
                    }
                    
                    .legend {
                        margin-top: 25px;
                        padding: 15px;
                        background-color: #f9fafb;
                        border: 1px solid #e5e7eb;
                        font-size: 10px;
                        color: #666;
                    }
                    
                    .legend p {
                        margin: 0;
                        line-height: 1.6;
                    }
                    
                    .text-center {
                        text-align: center;
                    }
                `}
            </style>

            {/* Header */}
            <div className="print-header">
                <h1>ACADEMIC TRANSCRIPT</h1>
                <h2>Official Academic Record</h2>
            </div>

            {/* Student Information */}
            <div className="student-info">
                <div>
                    <div className="info-row">
                        <span className="info-label">Name:</span>
                        <span className="info-value">{data.student.fullName}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Student Number:</span>
                        <span className="info-value">{data.student.studentId}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Program:</span>
                        <span className="info-value">{data.student.program}</span>
                    </div>
                </div>
                <div>
                    <div className="info-row">
                        <span className="info-label">Major:</span>
                        <span className="info-value">{data.student.major}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Class:</span>
                        <span className="info-value">{data.student.class}</span>
                    </div>
                    <div className="info-row">
                        <span className="info-label">Overall CGPA:</span>
                        <span className="info-value" style={{ fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
                            {data.overallCGPA.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Semester Records */}
            {semesters.map((semester, index) => (
                <div key={index} className="semester-section">
                    <div className="semester-header">
                        <span>
                            Academic Year {semester.academicYear} - {semester.level} - Term {semester.academicTerm}
                        </span>
                        <span style={{ color: '#3b82f6' }}>
                            GPA: {semester.gpa.toFixed(2)} | CGPA: {semester.cgpa.toFixed(2)}
                        </span>
                    </div>

                    <div className="semester-stats">
                        <div className="stat-box">
                            <div className="stat-label">Level</div>
                            <div className="stat-value">{semester.level}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">CCT</div>
                            <div className="stat-value">{semester.cct}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">CCP</div>
                            <div className="stat-value">{semester.ccp}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">GPA</div>
                            <div className="stat-value" style={{ color: '#3b82f6' }}>
                                {semester.gpa.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <table className="courses-table">
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>Code</th>
                                <th>Course Title</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>Credit</th>
                                <th style={{ width: '80px', textAlign: 'center' }}>Grade</th>
                                <th style={{ width: '70px', textAlign: 'center' }}>GPT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {semester.courses.map((course, idx) => (
                                <tr key={idx}>
                                    <td>{course.code}</td>
                                    <td>{course.courseTitle}</td>
                                    <td style={{ textAlign: 'center' }}>{course.credit}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="grade-badge" style={{ backgroundColor: getGradeColor(course.grade) }}>
                                            {course.grade}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{course.gpt.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="semester-footer">
                        <div>
                            <span>Semester Summary: </span>
                            <span>
                                CCT: {semester.cct} | CCP: {semester.ccp}
                            </span>
                        </div>
                        <div>
                            <span>GPA: {semester.gpa.toFixed(2)} | </span>
                            <span style={{ color: '#3b82f6' }}>CGPA: {semester.cgpa.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            ))}

            {/* Overall Summary */}
            <div className="overall-summary">
                <h3>Overall Academic Summary</h3>
                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-label">Total Credits Earned</div>
                        <div className="summary-value">{data.totalCredits}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Cumulative GPA</div>
                        <div className="summary-value">{data.overallCGPA.toFixed(2)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Classification</div>
                        <div className="summary-value" style={{ fontSize: '16px', color: '#000' }}>
                            {data.overallCGPA >= 3.6 ? 'First Class' : data.overallCGPA >= 3.0 ? 'Second Class (Upper)' : data.overallCGPA >= 2.5 ? 'Second Class (Lower)' : data.overallCGPA >= 2.0 ? 'Third Class' : 'Pass'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="legend">
                <p>
                    <strong>Note:</strong> CCT: Cumulative Credit Taken | CCP: Cumulative Credit Passed | GPA: Grade Point Average | CGPA: Cumulative Grade Point Average | GPT: Grade Point Total
                </p>
                <p style={{ marginTop: '8px' }}>This is an official academic transcript generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            </div>
        </div>
    );
});

PrintableTranscript.displayName = 'PrintableTranscript';

const AcademicTranscript: React.FC<AcademicTranscriptProps> = ({ studentId }) => {
    const toast = useRef<Toast>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedTerm, setSelectedTerm] = useState<number | 'all'>('all');
    const [filteredSemesters, setFilteredSemesters] = useState<SemesterRecord[]>([]);
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    useEffect(() => {
        if (studentId) {
            fetchTranscriptData();
        }
    }, [studentId]);

    useEffect(() => {
        if (transcriptData) {
            filterSemesters();
        }
    }, [selectedYear, selectedTerm, transcriptData]);

    const fetchTranscriptData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/students/${studentId}/transcript`);
            const data = await response.json();

            if (data.success) {
                setTranscriptData(data.data);

                // Extract unique years
                const years: any = [...new Set(data.data.semesters.map((s: SemesterRecord) => s.academicYear))];
                setAvailableYears(years);
            } else {
                showToast('error', 'Error', data.message || 'Failed to load transcript data');
            }
        } catch (error) {
            console.error('Error fetching transcript:', error);
            showToast('error', 'Error', 'An error occurred while loading transcript data');
        } finally {
            setLoading(false);
        }
    };

    const filterSemesters = () => {
        if (!transcriptData) return;

        let filtered = [...transcriptData.semesters];

        if (selectedYear !== 'all') {
            filtered = filtered.filter((s) => s.academicYear === selectedYear);
        }

        if (selectedTerm !== 'all') {
            filtered = filtered.filter((s) => s.academicTerm === selectedTerm);
        }

        setFilteredSemesters(filtered);
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Academic_Transcript_${transcriptData?.student.studentId || 'student'}_${new Date().toISOString().split('T')[0]}`,
        onBeforePrint: async () => {
            showToast('info', 'Generating PDF', 'Preparing your academic transcript...');
        },
        onAfterPrint: async () => {
            showToast('success', 'PDF Ready', 'Your transcript has been generated successfully');
        }
    });

    const handleExport = () => {
        showToast('info', 'Export', 'Export functionality coming soon');
    };

    const getGradeColor = (grade: string) => {
        const gradeColors: Record<string, string> = {
            A: 'success',
            'B+': 'info',
            B: 'info',
            'C+': 'warning',
            C: 'warning',
            D: 'warning',
            E: 'danger',
            F: 'danger'
        };
        return gradeColors[grade] || 'secondary';
    };

    const yearOptions = [{ label: 'All Years', value: 'all' }, ...availableYears.map((year) => ({ label: year, value: year }))];

    const termOptions = [
        { label: 'All Terms', value: 'all' },
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    const gradeBodyTemplate = (rowData: CourseRecord) => {
        return <Tag value={rowData.grade} severity={getGradeColor(rowData.grade) as any} />;
    };

    if (loading) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <ProgressSpinner />
            </div>
        );
    }

    if (!transcriptData) {
        return (
            <Card>
                <Message severity="info" text="No transcript data available" />
            </Card>
        );
    }

    return (
        <>
            <Toast ref={toast} />

            <Card className="transcript-container">
                {/* Header Section */}
                <div className="transcript-header mb-4 text-center print-section">
                    <h2 className="text-3xl font-bold text-900 mb-2">Academic Transcript</h2>
                    <Divider />

                    <div className="grid text-left mt-3">
                        <div className="col-12 md:col-6">
                            <p className="mb-2">
                                <strong>Name:</strong> {transcriptData.student.fullName}
                            </p>
                            <p className="mb-2">
                                <strong>Student Number:</strong> {transcriptData.student.studentId}
                            </p>
                            <p className="mb-2">
                                <strong>Program:</strong> {transcriptData.student.program}
                            </p>
                        </div>
                        <div className="col-12 md:col-6">
                            <p className="mb-2">
                                <strong>Major:</strong> {transcriptData.student.major}
                            </p>
                            <p className="mb-2">
                                <strong>Class:</strong> {transcriptData.student.class}
                            </p>
                            <p className="mb-2">
                                <strong>Overall CGPA:</strong> <span className="text-primary font-bold text-xl">{transcriptData.overallCGPA.toFixed(2)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <Divider />

                {/* Filter Section - Hidden on print */}
                <div className="filter-section mb-4 no-print">
                    <div className="grid align-items-center">
                        <div className="col-12 md:col-3">
                            <label htmlFor="yearFilter" className="block mb-2 font-semibold">
                                Academic Year
                            </label>
                            <Dropdown id="yearFilter" value={selectedYear} options={yearOptions} onChange={(e) => setSelectedYear(e.value)} className="w-full" placeholder="Select Year" />
                        </div>

                        <div className="col-12 md:col-3">
                            <label htmlFor="termFilter" className="block mb-2 font-semibold">
                                Semester/Term
                            </label>
                            <Dropdown id="termFilter" value={selectedTerm} options={termOptions} onChange={(e) => setSelectedTerm(e.value)} className="w-full" placeholder="Select Term" />
                        </div>

                        <div className="col-12 md:col-6 flex justify-content-end align-items-end gap-2">
                            <Button
                                label="Reset Filters"
                                icon="pi pi-filter-slash"
                                className="p-button-outlined"
                                onClick={() => {
                                    setSelectedYear('all');
                                    setSelectedTerm('all');
                                }}
                            />
                            <Button label="Print" icon="pi pi-print" className="p-button-info" onClick={handlePrint} />
                            <Button label="Export" icon="pi pi-download" className="p-button-success" onClick={handleExport} />
                        </div>
                    </div>
                </div>

                <Divider className="no-print" />

                {/* Transcript Records */}
                {filteredSemesters.length === 0 ? (
                    <Message severity="info" text="No records found for the selected filters" />
                ) : (
                    <div className="transcript-records">
                        {filteredSemesters.map((semester, index) => (
                            <Panel
                                key={index}
                                header={
                                    <div className="flex justify-content-between align-items-center">
                                        <span className="font-bold">
                                            Academic Year {semester.academicYear} - {semester.level} - Term {semester.academicTerm}
                                        </span>
                                        <span className="text-primary font-bold">
                                            GPA: {semester.gpa.toFixed(2)} | CGPA: {semester.cgpa.toFixed(2)}
                                        </span>
                                    </div>
                                }
                                toggleable
                                className="mb-3"
                            >
                                <div className="semester-summary mb-3 p-3 surface-50 border-round">
                                    <div className="grid">
                                        <div className="col-6 md:col-3">
                                            <div className="text-center">
                                                <div className="text-500 text-sm">Level</div>
                                                <div className="text-900 font-bold text-lg">{semester.level}</div>
                                            </div>
                                        </div>
                                        <div className="col-6 md:col-3">
                                            <div className="text-center">
                                                <div className="text-500 text-sm">CCT (Credits Taken)</div>
                                                <div className="text-900 font-bold text-lg">{semester.cct}</div>
                                            </div>
                                        </div>
                                        <div className="col-6 md:col-3">
                                            <div className="text-center">
                                                <div className="text-500 text-sm">CCP (Credits Passed)</div>
                                                <div className="text-900 font-bold text-lg">{semester.ccp}</div>
                                            </div>
                                        </div>
                                        <div className="col-6 md:col-3">
                                            <div className="text-center">
                                                <div className="text-500 text-sm">GPA</div>
                                                <div className="text-primary font-bold text-xl">{semester.gpa.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <DataTable value={semester.courses} className="transcript-table" stripedRows showGridlines>
                                    <Column field="code" header="Code" style={{ width: '120px' }} />
                                    <Column field="courseTitle" header="Course Title" />
                                    <Column field="credit" header="Credit" style={{ width: '80px', textAlign: 'center' }} body={(rowData) => rowData.credit} />
                                    <Column field="grade" header="Grade" body={gradeBodyTemplate} style={{ width: '100px', textAlign: 'center' }} />
                                    <Column field="gpt" header="GPT" style={{ width: '80px', textAlign: 'center' }} body={(rowData) => rowData.gpt.toFixed(2)} />
                                </DataTable>

                                <div className="semester-footer mt-3 p-3 surface-100 border-round">
                                    <div className="flex justify-content-between align-items-center">
                                        <div>
                                            <span className="font-semibold">Semester Summary:</span>
                                            <span className="ml-3">CCT: {semester.cct}</span>
                                            <span className="ml-3">CCP: {semester.ccp}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold mr-2">GPA:</span>
                                            <span className="text-primary font-bold text-xl">{semester.gpa.toFixed(2)}</span>
                                            <span className="font-semibold ml-4 mr-2">CGPA:</span>
                                            <span className="text-primary font-bold text-xl">{semester.cgpa.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}

                {/* Overall Summary */}
                {filteredSemesters.length > 0 && (
                    <>
                        <Divider />
                        <div className="overall-summary p-4 surface-100 border-round">
                            <h3 className="text-xl font-bold mb-3">Overall Academic Summary</h3>
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <Card className="text-center border-primary">
                                        <div className="text-500 mb-2">Total Credits Earned</div>
                                        <div className="text-primary font-bold text-3xl">{transcriptData.totalCredits}</div>
                                    </Card>
                                </div>
                                <div className="col-12 md:col-4">
                                    <Card className="text-center border-primary">
                                        <div className="text-500 mb-2">Cumulative GPA</div>
                                        <div className="text-primary font-bold text-3xl">{transcriptData.overallCGPA.toFixed(2)}</div>
                                    </Card>
                                </div>
                                <div className="col-12 md:col-4">
                                    <Card className="text-center border-primary">
                                        <div className="text-500 mb-2">Classification</div>
                                        <div className="text-900 font-bold text-2xl">
                                            {transcriptData.overallCGPA >= 3.6
                                                ? 'First Class'
                                                : transcriptData.overallCGPA >= 3.0
                                                ? 'Second Class (Upper)'
                                                : transcriptData.overallCGPA >= 2.5
                                                ? 'Second Class (Lower)'
                                                : transcriptData.overallCGPA >= 2.0
                                                ? 'Third Class'
                                                : 'Pass'}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Legend */}
                <div className="legend mt-4 p-3 surface-50 border-round">
                    <p className="font-semibold mb-2">Note:</p>
                    <p className="text-sm text-600 mb-1">
                        <strong>CCT:</strong> Cumulative Credit Taken |<strong className="ml-2">CCP:</strong> Cumulative Credit Passed |<strong className="ml-2">GPA:</strong> Grade Point Average |<strong className="ml-2">CGPA:</strong> Cumulative
                        Grade Point Average |<strong className="ml-2">GPT:</strong> Grade Point Total
                    </p>
                </div>
            </Card>

            {/* Hidden Printable Component */}
            <div style={{ display: 'none' }}>{transcriptData && filteredSemesters.length > 0 && <PrintableTranscript ref={printRef} data={transcriptData} semesters={filteredSemesters} />}</div>
        </>
    );
};

export default AcademicTranscript;
