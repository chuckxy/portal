'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '@/context/AuthContext';

interface Student {
    _id: string;
    fullName: string;
    studentInfo?: {
        studentId: string;
        currentClass?: {
            className: string;
        };
        department?: {
            name: string;
        };
    };
    contact?: {
        email?: string;
        mobilePhone?: string;
    };
    isActive: boolean;
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

interface SemesterRecord {
    academicYear: string;
    academicTerm: number;
    level: string;
    courses: CourseRecord[];
    cct: number;
    ccp: number;
    gpa: number;
    cgpa: number;
}

interface CourseRecord {
    code: string;
    courseTitle: string;
    credit: number;
    grade: string;
    gpt: number;
}

interface StudentTranscriptManagementProps {
    schoolId?: string;
    schoolSiteId?: string;
}

const StudentTranscriptManagement: React.FC<StudentTranscriptManagementProps> = ({ schoolId, schoolSiteId }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
    const [loading, setLoading] = useState(false);
    const [transcriptLoading, setTranscriptLoading] = useState(false);
    const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const [classFilter, setClassFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const toast = useRef<Toast>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    useEffect(() => {
        fetchStudents();
    }, [schoolId, schoolSiteId]);

    useEffect(() => {
        filterStudents();
    }, [students, globalFilter, classFilter, statusFilter]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            let url = '/api/students?';

            if (schoolId) url += `school=${schoolId}&`;
            if (schoolSiteId) url += `site=${schoolSiteId}&`;
            if (user?.school) url += `school=${user.school}&`;
            if (user?.schoolSite) url += `site=${user.schoolSite}&`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.students) {
                setStudents(data.students);
                setFilteredStudents(data.students);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to fetch students',
                    life: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while fetching students',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const filterStudents = () => {
        let filtered = [...students];

        // Global search filter
        if (globalFilter) {
            filtered = filtered.filter(
                (student) =>
                    student.fullName.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    student.studentInfo?.studentId?.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    student.contact?.email?.toLowerCase().includes(globalFilter.toLowerCase())
            );
        }

        // Class filter
        if (classFilter) {
            filtered = filtered.filter((student) => student.studentInfo?.currentClass?.className === classFilter);
        }

        // Status filter
        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            filtered = filtered.filter((student) => student.isActive === isActive);
        }

        setFilteredStudents(filtered);
    };

    const fetchTranscript = async (studentId: string) => {
        try {
            setTranscriptLoading(true);
            const response = await fetch(`/api/students/${studentId}/transcript`);
            const data = await response.json();

            if (data.success) {
                setTranscriptData(data.data);
                setShowTranscriptDialog(true);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to fetch transcript',
                    life: 3000
                });
            }
        } catch (error) {
            console.error('Error fetching transcript:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while fetching transcript',
                life: 3000
            });
        } finally {
            setTranscriptLoading(false);
        }
    };

    const handleViewTranscript = (student: Student) => {
        setSelectedStudent(student);
        fetchTranscript(student._id);
    };

    const handlePrintTranscript = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Transcript_${selectedStudent?.studentInfo?.studentId || 'student'}`,
        onAfterPrint: () => {
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Transcript printed successfully',
                life: 3000
            });
        }
    });

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

    const getClassificationFromCGPA = (cgpa: number): string => {
        if (cgpa >= 3.6) return 'First Class Honours';
        if (cgpa >= 3.0) return 'Second Class Upper';
        if (cgpa >= 2.5) return 'Second Class Lower';
        if (cgpa >= 2.0) return 'Third Class';
        if (cgpa >= 1.0) return 'Pass';
        return 'Fail';
    };

    // DataTable Templates
    const studentIdBodyTemplate = (rowData: Student) => {
        return rowData.studentInfo?.studentId || 'N/A';
    };

    const classBodyTemplate = (rowData: Student) => {
        return rowData.studentInfo?.currentClass?.className || 'N/A';
    };

    const departmentBodyTemplate = (rowData: Student) => {
        return rowData.studentInfo?.department?.name || 'N/A';
    };

    const statusBodyTemplate = (rowData: Student) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const actionBodyTemplate = (rowData: Student) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-file" label="View Transcript" className="p-button-sm p-button-info" onClick={() => handleViewTranscript(rowData)} loading={transcriptLoading && selectedStudent?._id === rowData._id} />
            </div>
        );
    };

    // Get unique classes for filter
    const uniqueClasses = Array.from(new Set(students.map((s) => s.studentInfo?.currentClass?.className).filter(Boolean)));
    const classOptions = [{ label: 'All Classes', value: '' }, ...uniqueClasses.map((c) => ({ label: c, value: c }))];

    const statusOptions = [
        { label: 'All Students', value: 'all' },
        { label: 'Active Only', value: 'active' },
        { label: 'Inactive Only', value: 'inactive' }
    ];

    const header = (
        <div className="flex flex-column md:flex-row md:justify-content-between gap-2">
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText type="search" placeholder="Search students..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="w-full md:w-20rem" />
                </span>
                <Dropdown value={classFilter} options={classOptions} onChange={(e) => setClassFilter(e.value)} placeholder="Filter by Class" className="w-full md:w-14rem" />
                <Dropdown value={statusFilter} options={statusOptions} onChange={(e) => setStatusFilter(e.value)} placeholder="Filter by Status" className="w-full md:w-12rem" />
            </div>
            <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchStudents} />
        </div>
    );

    return (
        <>
            <Toast ref={toast} />

            <Card
                title={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-file text-primary text-2xl" />
                        <span>Student Transcript Records</span>
                    </div>
                }
                subTitle="Access and view student academic transcripts"
            >
                {loading ? (
                    <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                        <ProgressSpinner />
                    </div>
                ) : (
                    <>
                        <DataTable value={filteredStudents} paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]} header={header} emptyMessage="No students found" responsiveLayout="scroll" className="mt-3" stripedRows>
                            <Column field="studentInfo.studentId" header="Student ID" body={studentIdBodyTemplate} sortable />
                            <Column field="fullName" header="Full Name" sortable />
                            <Column field="studentInfo.currentClass.className" header="Class" body={classBodyTemplate} sortable />
                            <Column field="studentInfo.department.name" header="Department" body={departmentBodyTemplate} sortable />
                            <Column field="contact.email" header="Email" sortable />
                            <Column field="isActive" header="Status" body={statusBodyTemplate} sortable />
                            <Column header="Actions" body={actionBodyTemplate} style={{ width: '200px' }} />
                        </DataTable>

                        {filteredStudents.length === 0 && !loading && <Message severity="info" text="No students found. Try adjusting your filters or add students to the system." className="mt-3 w-full" />}
                    </>
                )}
            </Card>

            {/* Transcript Dialog */}
            <Dialog
                visible={showTranscriptDialog}
                style={{ width: '90vw', maxWidth: '1200px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-file text-primary" />
                        <span>Academic Transcript - {selectedStudent?.fullName}</span>
                    </div>
                }
                modal
                onHide={() => {
                    setShowTranscriptDialog(false);
                    setTranscriptData(null);
                    setSelectedStudent(null);
                }}
                footer={
                    <div className="flex gap-2 justify-content-end">
                        <Button label="Print Transcript" icon="pi pi-print" onClick={handlePrintTranscript} disabled={!transcriptData} />
                        <Button label="Close" icon="pi pi-times" className="p-button-secondary" onClick={() => setShowTranscriptDialog(false)} />
                    </div>
                }
            >
                {transcriptLoading ? (
                    <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                        <ProgressSpinner />
                    </div>
                ) : transcriptData ? (
                    <div ref={printRef} className="p-4">
                        {/* Printable Transcript Content */}
                        <style>
                            {`
                                @media print {
                                    @page {
                                        size: A4;
                                        margin: 15mm;
                                    }
                                    .print-hide {
                                        display: none !important;
                                    }
                                }
                            `}
                        </style>

                        {/* Header */}
                        <div className="text-center mb-4 pb-3" style={{ borderBottom: '3px solid #000' }}>
                            <h1 className="text-4xl font-bold m-0 mb-2">ACADEMIC TRANSCRIPT</h1>
                            <h2 className="text-2xl text-600 m-0">Official Academic Record</h2>
                        </div>

                        {/* Student Information */}
                        <div className="grid mb-4">
                            <div className="col-12 md:col-6">
                                <div className="mb-2">
                                    <strong>Student Name:</strong> {transcriptData.student.fullName}
                                </div>
                                <div className="mb-2">
                                    <strong>Student ID:</strong> {transcriptData.student.studentId}
                                </div>
                                <div className="mb-2">
                                    <strong>Program:</strong> {transcriptData.student.program}
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="mb-2">
                                    <strong>Major:</strong> {transcriptData.student.major}
                                </div>
                                <div className="mb-2">
                                    <strong>Class:</strong> {transcriptData.student.class}
                                </div>
                                {transcriptData.student.dateOfAdmission && (
                                    <div className="mb-2">
                                        <strong>Date of Admission:</strong> {new Date(transcriptData.student.dateOfAdmission).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Academic Records by Semester */}
                        {transcriptData.semesters.length > 0 ? (
                            <>
                                {transcriptData.semesters.map((semester, semesterIndex) => (
                                    <div key={semesterIndex} className="mb-4">
                                        <h3 className="text-xl font-bold mb-2 p-2 bg-primary text-white">
                                            Academic Year: {semester.academicYear} | Term {semester.academicTerm} | Level: {semester.level}
                                        </h3>

                                        <DataTable value={semester.courses} className="mb-3">
                                            <Column field="code" header="Course Code" style={{ width: '15%' }} />
                                            <Column field="courseTitle" header="Course Title" style={{ width: '45%' }} />
                                            <Column field="credit" header="Credit" style={{ width: '10%' }} />
                                            <Column field="grade" header="Grade" style={{ width: '10%' }} body={(rowData) => <Tag value={rowData.grade} style={{ backgroundColor: getGradeColor(rowData.grade), color: 'white' }} />} />
                                            <Column field="gpt" header="GPT" style={{ width: '10%' }} body={(rowData) => rowData.gpt.toFixed(2)} />
                                        </DataTable>

                                        <div className="flex justify-content-between p-3 bg-gray-100 border-round">
                                            <div>
                                                <strong>CCT (Credit Taken):</strong> {semester.cct}
                                            </div>
                                            <div>
                                                <strong>CCP (Credit Passed):</strong> {semester.ccp}
                                            </div>
                                            <div>
                                                <strong>GPA:</strong> {semester.gpa.toFixed(2)}
                                            </div>
                                            <div>
                                                <strong>CGPA:</strong> {semester.cgpa.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Overall Summary */}
                                <div className="mt-4 p-4 bg-primary-50 border-round">
                                    <h3 className="text-2xl font-bold mb-3 text-center">Overall Performance Summary</h3>
                                    <div className="grid">
                                        <div className="col-12 md:col-4 text-center">
                                            <div className="text-600 mb-1">Total Credits Earned</div>
                                            <div className="text-3xl font-bold text-primary">{transcriptData.totalCredits}</div>
                                        </div>
                                        <div className="col-12 md:col-4 text-center">
                                            <div className="text-600 mb-1">Overall CGPA</div>
                                            <div className="text-3xl font-bold text-primary">{transcriptData.overallCGPA.toFixed(2)}</div>
                                        </div>
                                        <div className="col-12 md:col-4 text-center">
                                            <div className="text-600 mb-1">Classification</div>
                                            <div className="text-xl font-bold text-primary">{getClassificationFromCGPA(transcriptData.overallCGPA)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 text-center text-sm text-600">
                                    <p>This is an official academic transcript generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
                                    <p>This document is valid only when bearing the official seal and signature.</p>
                                </div>
                            </>
                        ) : (
                            <Message severity="info" text="No academic records found for this student." />
                        )}
                    </div>
                ) : (
                    <Message severity="info" text="No transcript data available." />
                )}
            </Dialog>
        </>
    );
};

export default StudentTranscriptManagement;
