'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Chip } from 'primereact/chip';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Message } from 'primereact/message';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { useRouter } from 'next/navigation';
import ExamScoreEntryForm from './ExamScoreEntryForm';
import ClassExamScoreEntry from './ClassExamScoreEntry';

interface TeacherDashboardProps {
    teacherId: string;
}

interface DashboardData {
    teacher: {
        _id: string;
        fullName: string;
        email?: string;
        phone?: string;
        photoLink?: string;
        jobTitle?: string;
        school: any;
        schoolSite: any;
        dateJoined?: Date;
    };
    subjects: any[];
    classes: any[];
    statistics: {
        totalSubjects: number;
        totalClasses: number;
        totalStudents: number;
        totalScoresEntered: number;
        publishedScores: number;
        draftScores: number;
        pendingScores: number;
        averageScores: {
            avgTotal: number;
            avgClass: number;
            avgExam: number;
        };
    };
    recentScores: any[];
}

export default function TeacherDashboard({ teacherId }: TeacherDashboardProps) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showIndividualEntry, setShowIndividualEntry] = useState(false);
    const [showClassEntry, setShowClassEntry] = useState(false);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        if (teacherId) {
            loadDashboardData();
        } else {
            setError('Teacher ID is required');
            setLoading(false);
        }
    }, [teacherId]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!teacherId || teacherId === 'undefined') {
                setError('Invalid teacher ID');
                setLoading(false);
                return;
            }

            const response = await fetch(`/api/teachers/dashboard?teacherId=${teacherId}`);
            const data = await response.json();

            if (data.success) {
                setDashboardData(data.data);
            } else {
                setError(data.message || 'Failed to load dashboard data');
            }
        } catch (err: any) {
            console.error('Error loading dashboard:', err);
            setError('An error occurred while loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenIndividualEntry = () => {
        setShowIndividualEntry(true);
    };

    const handleOpenClassEntry = () => {
        setShowClassEntry(true);
    };

    const handleCloseIndividualEntry = () => {
        setShowIndividualEntry(false);
        loadDashboardData(); // Refresh data after closing
    };

    const handleCloseClassEntry = () => {
        setShowClassEntry(false);
        setSelectedClass(null);
        setSelectedSubject(null);
        loadDashboardData(); // Refresh data after closing
    };

    const gradeTemplate = (rowData: any) => {
        const gradeColors: any = {
            A: 'success',
            B: 'info',
            C: 'warning',
            D: 'warning',
            E: 'danger',
            F: 'danger'
        };
        return <Tag value={rowData.grade} severity={gradeColors[rowData.grade] || 'info'} />;
    };

    const statusTemplate = (rowData: any) => {
        return rowData.isPublished ? <Tag value="Published" severity="success" icon="pi pi-check" /> : <Tag value="Draft" severity="warning" icon="pi pi-pencil" />;
    };

    const studentTemplate = (rowData: any) => {
        const studentName = rowData.student ? `${rowData.student.firstName} ${rowData.student.middleName || ''} ${rowData.student.lastName}`.trim() : 'N/A';
        return <span>{studentName}</span>;
    };

    const subjectTemplate = (rowData: any) => {
        return rowData.subject ? (
            <div>
                <div className="font-semibold">{rowData.subject.name}</div>
                <small className="text-500">{rowData.subject.code}</small>
            </div>
        ) : (
            'N/A'
        );
    };

    const dateTemplate = (rowData: any) => {
        return rowData.createdAt
            ? new Date(rowData.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
              })
            : 'N/A';
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Card>
                        <Skeleton width="100%" height="150px" className="mb-3" />
                        <Skeleton width="100%" height="200px" />
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="error" text={error} />
                </div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="warn" text="No dashboard data available" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            {/* Welcome Section */}
            <div className="col-12">
                <Card className="">
                    <div className="flex align-items-center gap-4">
                        {dashboardData.teacher.photoLink ? (
                            <img src={dashboardData.teacher.photoLink} alt={dashboardData.teacher.fullName} className="w-5rem h-5rem border-circle border-3 border-white" />
                        ) : (
                            <div className="w-5rem h-5rem border-circle bg-white-alpha-30 flex align-items-center justify-content-center">
                                <i className="pi pi-user text-4xl"></i>
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="m-0 mb-2">Welcome, {dashboardData.teacher.fullName}!</h2>
                            <p className="m-0 text-lg opacity-90">{dashboardData.teacher.jobTitle || 'Teacher'}</p>
                            {dashboardData.teacher.email && (
                                <p className="m-0 mt-2 opacity-80">
                                    <i className="pi pi-envelope mr-2"></i>
                                    {dashboardData.teacher.email}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Statistics Cards */}
            <div className="col-12 lg:col-3 md:col-6">
                <Card className="surface-card shadow-2">
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center bg-blue-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-book text-blue-600 text-2xl"></i>
                        </div>
                        <div>
                            <div className="text-500 text-sm mb-1">Subjects</div>
                            <div className="text-900 font-bold text-2xl">{dashboardData.statistics.totalSubjects}</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="surface-card shadow-2">
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center bg-green-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-users text-green-600 text-2xl"></i>
                        </div>
                        <div>
                            <div className="text-500 text-sm mb-1">Classes</div>
                            <div className="text-900 font-bold text-2xl">{dashboardData.statistics.totalClasses}</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="surface-card shadow-2">
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center bg-purple-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-user text-purple-600 text-2xl"></i>
                        </div>
                        <div>
                            <div className="text-500 text-sm mb-1">Students</div>
                            <div className="text-900 font-bold text-2xl">{dashboardData.statistics.totalStudents}</div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 lg:col-3 md:col-6">
                <Card className="surface-card shadow-2">
                    <div className="flex align-items-center gap-3">
                        <div className="flex align-items-center justify-content-center bg-orange-100 border-circle" style={{ width: '3rem', height: '3rem' }}>
                            <i className="pi pi-file-edit text-orange-600 text-2xl"></i>
                        </div>
                        <div>
                            <div className="text-500 text-sm mb-1">Pending Scores</div>
                            <div className="text-900 font-bold text-2xl">{dashboardData.statistics.pendingScores}</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Exam Score Statistics */}
            <div className="col-12 lg:col-6">
                <Card title="Exam Score Overview" subTitle="Your score entry statistics">
                    <div className="grid">
                        <div className="col-6">
                            <div className="text-center p-3 border-round bg-green-50">
                                <div className="text-green-600 font-bold text-3xl mb-2">{dashboardData.statistics.publishedScores}</div>
                                <div className="text-500">Published</div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="text-center p-3 border-round bg-yellow-50">
                                <div className="text-yellow-600 font-bold text-3xl mb-2">{dashboardData.statistics.draftScores}</div>
                                <div className="text-500">Drafts</div>
                            </div>
                        </div>
                        <div className="col-12 mt-3">
                            <div className="text-center p-3 border-round bg-blue-50">
                                <div className="text-blue-600 font-bold text-3xl mb-2">{dashboardData.statistics.totalScoresEntered}</div>
                                <div className="text-500">Total Scores Entered</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Average Scores */}
            <div className="col-12 lg:col-6">
                <Card title="Average Scores" subTitle="Class performance overview">
                    <div className="grid">
                        <div className="col-4">
                            <div className="text-center">
                                <div className="text-900 font-bold text-2xl mb-1">{dashboardData.statistics.averageScores.avgTotal.toFixed(1)}%</div>
                                <div className="text-500 text-sm">Total Score</div>
                            </div>
                        </div>
                        <div className="col-4">
                            <div className="text-center">
                                <div className="text-900 font-bold text-2xl mb-1">{dashboardData.statistics.averageScores.avgClass.toFixed(1)}%</div>
                                <div className="text-500 text-sm">Class Score</div>
                            </div>
                        </div>
                        <div className="col-4">
                            <div className="text-center">
                                <div className="text-900 font-bold text-2xl mb-1">{dashboardData.statistics.averageScores.avgExam.toFixed(1)}%</div>
                                <div className="text-500 text-sm">Exam Score</div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="col-12">
                <Card title="Quick Actions" subTitle="Common tasks">
                    <div className="grid">
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="Enter Individual Score" icon="pi pi-pencil" className="w-full p-button-lg p-button-primary" onClick={handleOpenIndividualEntry} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="Enter Class Scores" icon="pi pi-table" className="w-full p-button-lg p-button-success" onClick={handleOpenClassEntry} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="View All Scores" icon="pi pi-list" className="w-full p-button-lg p-button-secondary" onClick={() => router.push('/exam-scores')} />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <Button label="View Reports" icon="pi pi-chart-bar" className="w-full p-button-lg p-button-info" onClick={() => router.push('/exam-scores')} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* My Subjects */}
            <div className="col-12 lg:col-6">
                <Card title="My Subjects" subTitle={`${dashboardData.subjects.length} subject(s)`}>
                    {dashboardData.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {dashboardData.subjects.map((subject: any) => (
                                <Chip key={subject._id} label={`${subject.name} (${subject.code})`} icon="pi pi-book" className="bg-blue-100 text-blue-900" />
                            ))}
                        </div>
                    ) : (
                        <Message severity="info" text="No subjects assigned yet" />
                    )}
                </Card>
            </div>

            {/* My Classes */}
            <div className="col-12 lg:col-6">
                <Card title="My Classes" subTitle={`${dashboardData.classes.length} class(es)`}>
                    {dashboardData.classes.length > 0 ? (
                        <div className="flex flex-column gap-2">
                            {dashboardData.classes.map((classItem: any) => (
                                <div key={classItem._id} className="p-3 border-round surface-100 flex align-items-center justify-content-between">
                                    <div>
                                        <div className="font-semibold text-900">{classItem.name}</div>
                                        <div className="text-500 text-sm">
                                            <i className="pi pi-users mr-1"></i>
                                            {classItem.studentCount} student(s)
                                        </div>
                                    </div>
                                    <Button
                                        icon="pi pi-pencil"
                                        rounded
                                        text
                                        severity="info"
                                        onClick={() => {
                                            setSelectedClass(classItem);
                                            setShowClassEntry(true);
                                        }}
                                        tooltip="Enter scores for this class"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Message severity="info" text="No classes assigned yet" />
                    )}
                </Card>
            </div>

            {/* Recent Exam Scores */}
            <div className="col-12">
                <Card title="Recent Exam Scores" subTitle="Last 10 entries">
                    {dashboardData.recentScores.length > 0 ? (
                        <DataTable value={dashboardData.recentScores} paginator rows={5} dataKey="_id" stripedRows>
                            <Column field="student" header="Student" body={studentTemplate} />
                            <Column field="subject" header="Subject" body={subjectTemplate} />
                            <Column field="totalScore" header="Score" body={(row) => `${row.totalScore}%`} />
                            <Column field="grade" header="Grade" body={gradeTemplate} />
                            <Column field="isPublished" header="Status" body={statusTemplate} />
                            <Column field="createdAt" header="Date" body={dateTemplate} />
                        </DataTable>
                    ) : (
                        <Message severity="info" text="No exam scores entered yet" />
                    )}
                </Card>
            </div>

            {/* Individual Entry Dialog */}
            <Dialog header="Enter Individual Exam Score" visible={showIndividualEntry} style={{ width: '90vw', maxWidth: '1200px' }} onHide={handleCloseIndividualEntry} maximizable>
                <ExamScoreEntryForm onClose={handleCloseIndividualEntry} />
            </Dialog>

            {/* Class Entry Dialog */}
            <Dialog header="Enter Class Exam Scores" visible={showClassEntry} style={{ width: '95vw', maxWidth: '1400px' }} onHide={handleCloseClassEntry} maximizable>
                <ClassExamScoreEntry onClose={handleCloseClassEntry} preSelectedClass={selectedClass?._id} />
            </Dialog>
        </div>
    );
}
