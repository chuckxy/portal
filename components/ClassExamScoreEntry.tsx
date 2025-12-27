'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { ProgressBar } from 'primereact/progressbar';
import { Toolbar } from 'primereact/toolbar';
import { SelectButton } from 'primereact/selectbutton';
import { Divider } from 'primereact/divider';
import { Chip } from 'primereact/chip';
import { FileUpload } from 'primereact/fileupload';
import { useAuth } from '@/context/AuthContext';
import LocalDBService from '@/lib/services/localDBService';

interface StudentScore {
    student: any;
    classScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
    credit: number;
    hasExistingRecord?: boolean;
    existingRecordId?: string;
}

interface ClassScoreFormData {
    school: any;
    site: any;
    class: any;
    subject: any;
    academicYear: string;
    academicTerm: number;
    studentScores: StudentScore[];
}

interface ClassExamScoreEntryProps {
    onClose?: () => void;
    preSelectedClass?: string;
}

const TERM_OPTIONS = [
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

const ClassExamScoreEntry: React.FC<ClassExamScoreEntryProps> = ({ onClose, preSelectedClass }) => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    // Form state
    const [formData, setFormData] = useState<ClassScoreFormData>({
        school: null,
        site: null,
        class: null,
        subject: null,
        academicYear: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        academicTerm: 1,
        studentScores: []
    });

    // Dropdown options
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [setupComplete, setSetupComplete] = useState(false);
    const [editableRows, setEditableRows] = useState<Set<string>>(new Set());
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        if (user?.school) {
            fetchSchools();
        }
    }, [user]);

    // Handle preSelectedClass prop
    useEffect(() => {
        if (preSelectedClass && classes.length > 0) {
            const selectedClass = classes.find((c) => c.value === preSelectedClass);
            if (selectedClass) {
                setFormData((prev) => ({ ...prev, class: selectedClass.value }));
            }
        }
    }, [preSelectedClass, classes]);

    useEffect(() => {
        if (formData.school) {
            fetchSites(formData.school._id || formData.school);
        } else {
            setSites([]);
            setClasses([]);
            setSubjects([]);
        }
    }, [formData.school]);

    useEffect(() => {
        if (formData.site) {
            fetchClasses(formData.site._id || formData.site);
        } else {
            setClasses([]);
            setSubjects([]);
        }
    }, [formData.site]);

    useEffect(() => {
        if (formData.class) {
            fetchSubjects(formData.class._id || formData.class);
        } else {
            setSubjects([]);
        }
    }, [formData.class]);

    // Helper function to get auth headers
    const getAuthHeaders = async () => {
        const token = await LocalDBService.getLocalDataItem('authToken');
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    // API Functions
    const fetchSchools = async () => {
        try {
            let url = '/api/school';
            if (user?.school) {
                url += `?_id=${user.school}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            const schoolsData = Array.isArray(data) ? data : [data];
            setSchools(schoolsData);

            if (user?.school && schoolsData.length > 0) {
                const userSchool = schoolsData.find((s: any) => s._id === user.school) || schoolsData[0];
                setFormData((prev) => ({ ...prev, school: userSchool }));
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchSites = async (schoolId: string) => {
        try {
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setSites(Array.isArray(data.sites) ? data.sites : []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchClasses = async (siteId: string) => {
        try {
            const response = await fetch(`/api/classes?site=${siteId}`);
            const data = await response.json();
            setClasses(Array.isArray(data.classes) ? data.classes : []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchSubjects = async (classId: string) => {
        try {
            const response = await fetch(`/api/subjects?class=${classId}`);
            const data = await response.json();
            setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const loadStudents = async () => {
        if (!formData.class || !formData.subject) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Missing Information',
                detail: 'Please select both class and subject',
                life: 3000
            });
            return;
        }

        setLoading(true);
        try {
            // Fetch students in the class
            const classId = formData.class._id || formData.class;
            const response = await fetch(`/api/students?class=${classId}`);
            const studentsData = await response.json();
            const students = Array.isArray(studentsData) ? studentsData : [];

            if (students.length === 0) {
                toast.current?.show({
                    severity: 'info',
                    summary: 'No Students',
                    detail: 'No students found in this class',
                    life: 3000
                });
                setLoading(false);
                return;
            }

            // Check for existing exam scores for each student
            const studentScores: StudentScore[] = await Promise.all(
                students.map(async (student: any) => {
                    try {
                        const scoreResponse = await fetch(`/api/exam-scores?student=${student._id}&year=${formData.academicYear}&term=${formData.academicTerm}`);
                        const scoreData = await scoreResponse.json();

                        if (scoreData.scores && scoreData.scores.length > 0) {
                            const existingRecord = scoreData.scores[0];
                            const subjectScore = existingRecord.scores?.find((s: any) => (s.subject._id || s.subject) === (formData.subject._id || formData.subject));

                            if (subjectScore) {
                                const grade = subjectScore.grade || 'F';
                                return {
                                    student,
                                    classScore: subjectScore.classScore || 0,
                                    examScore: subjectScore.examScore || 0,
                                    totalScore: subjectScore.totalScore || 0,
                                    grade: grade,
                                    credit: getCreditPoints(grade),
                                    hasExistingRecord: true,
                                    existingRecordId: existingRecord._id
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching scores for student ${student._id}:`, error);
                    }

                    return {
                        student,
                        classScore: 0,
                        examScore: 0,
                        totalScore: 0,
                        grade: 'F',
                        credit: 0,
                        hasExistingRecord: false
                    };
                })
            );

            setFormData((prev) => ({ ...prev, studentScores }));
            setSetupComplete(true);
            setSavedCount(studentScores.filter((s) => s.hasExistingRecord).length);

            toast.current?.show({
                severity: 'success',
                summary: 'Students Loaded',
                detail: `${students.length} students loaded for scoring`,
                life: 3000
            });
        } catch (error) {
            console.error('Error loading students:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load students',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    // Grade calculation
    const getGrade = (score: number): string => {
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        if (score >= 40) return 'E';
        return 'F';
    };

    // Grade Point calculation based on grade
    const getCreditPoints = (grade: string): number => {
        switch (grade) {
            case 'A':
                return 4;
            case 'B':
                return 3;
            case 'C':
                return 2;
            case 'D':
                return 1;
            case 'E':
                return 0.5;
            case 'F':
                return 0;
            default:
                return 0;
        }
    };

    // Calculate total score (40% class + 60% exam)
    const calculateTotalScore = (classScore: number, examScore: number): number => {
        return classScore * 0.4 + examScore * 0.6;
    };

    const handleScoreChange = (studentId: string, field: 'classScore' | 'examScore', value: number) => {
        setFormData((prev) => {
            const updatedScores = prev.studentScores.map((score) => {
                if (score.student._id === studentId) {
                    const updatedScore = { ...score, [field]: value };
                    updatedScore.totalScore = calculateTotalScore(updatedScore.classScore, updatedScore.examScore);
                    updatedScore.grade = getGrade(updatedScore.totalScore);
                    updatedScore.credit = getCreditPoints(updatedScore.grade);
                    return updatedScore;
                }
                return score;
            });
            return { ...prev, studentScores: updatedScores };
        });
    };

    const handleAutoCalculateAll = () => {
        setFormData((prev) => ({
            ...prev,
            studentScores: prev.studentScores.map((score) => {
                const total = calculateTotalScore(score.classScore, score.examScore);
                const grade = getGrade(total);
                return {
                    ...score,
                    totalScore: total,
                    grade: grade,
                    credit: getCreditPoints(grade)
                };
            })
        }));

        toast.current?.show({
            severity: 'success',
            summary: 'Calculated',
            detail: 'All scores calculated successfully',
            life: 2000
        });
    };

    const handleSaveAll = async () => {
        confirmDialog({
            message: `Save exam scores for ${formData.studentScores.length} students in ${formData.subject.name}?`,
            header: 'Confirm Save',
            icon: 'pi pi-save',
            acceptLabel: 'Yes, Save All',
            rejectLabel: 'Cancel',
            accept: async () => {
                await executeSaveAll();
            }
        });
    };

    const executeSaveAll = async () => {
        setSaving(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            const headers = await getAuthHeaders();

            for (const studentScore of formData.studentScores) {
                try {
                    const subjectScoreData = {
                        subject: formData.subject._id || formData.subject,
                        classScore: studentScore.classScore,
                        examScore: studentScore.examScore,
                        totalScore: studentScore.totalScore,
                        grade: studentScore.grade
                    };

                    if (studentScore.hasExistingRecord && studentScore.existingRecordId) {
                        // Update existing record
                        const response = await fetch(`/api/exam-scores/${studentScore.existingRecordId}`, {
                            method: 'GET',
                            headers
                        });

                        if (response.ok) {
                            const existingRecord = await response.json();

                            // Update or add the subject score
                            const existingScores = existingRecord.scores || [];
                            const subjectIndex = existingScores.findIndex((s: any) => (s.subject._id || s.subject) === (formData.subject._id || formData.subject));

                            if (subjectIndex >= 0) {
                                existingScores[subjectIndex] = subjectScoreData;
                            } else {
                                existingScores.push(subjectScoreData);
                            }

                            const updateResponse = await fetch(`/api/exam-scores/${studentScore.existingRecordId}`, {
                                method: 'PUT',
                                headers,
                                body: JSON.stringify({
                                    ...existingRecord,
                                    scores: existingScores,
                                    modifiedBy: user?._id
                                })
                            });

                            if (updateResponse.ok) {
                                successCount++;
                            } else {
                                errorCount++;
                            }
                        }
                    } else {
                        // Create new record
                        const newRecord = {
                            student: studentScore.student._id,
                            school: formData.school._id || formData.school,
                            site: formData.site._id || formData.site,
                            class: formData.class._id || formData.class,
                            academicYear: formData.academicYear,
                            academicTerm: formData.academicTerm,
                            scores: [subjectScoreData],
                            overallAverage: studentScore.totalScore,
                            totalMarks: studentScore.totalScore,
                            attendance: { present: 0, absent: 0, late: 0 },
                            conduct: 'satisfactory',
                            interest: 'satisfactory',
                            formMasterComment: '',
                            headmasterComment: '',
                            promoted: false,
                            recordedBy: user?._id,
                            modificationHistory: [],
                            isPublished: false
                        };

                        const createResponse = await fetch('/api/exam-scores', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(newRecord)
                        });

                        if (createResponse.ok) {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Error saving score for student ${studentScore.student._id}:`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Saved Successfully',
                    detail: `All ${successCount} student scores saved successfully`,
                    life: 4000
                });
                setSavedCount(successCount);
                // Reload to reflect changes
                await loadStudents();
            } else {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Partially Saved',
                    detail: `${successCount} saved, ${errorCount} failed`,
                    life: 4000
                });
            }
        } catch (error) {
            console.error('Error saving scores:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save scores',
                life: 3000
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        confirmDialog({
            message: 'Reset the form and clear all entered scores?',
            header: 'Confirm Reset',
            icon: 'pi pi-refresh',
            acceptLabel: 'Yes, Reset',
            rejectLabel: 'Cancel',
            accept: () => {
                setSetupComplete(false);
                setFormData((prev) => ({
                    ...prev,
                    studentScores: []
                }));
                setSavedCount(0);
            }
        });
    };

    const handleDownloadTemplate = () => {
        if (formData.studentScores.length === 0) {
            toast.current?.show({
                severity: 'warn',
                summary: 'No Students',
                detail: 'Please load students first',
                life: 3000
            });
            return;
        }

        try {
            // Create CSV content
            const headers = ['Student ID', 'First Name', 'Last Name', 'Class Score (0-100)', 'Exam Score (0-100)'];
            const rows = formData.studentScores.map((score) => [score.student.studentInfo?.studentId || '', score.student.firstName, score.student.lastName || '', score.classScore || '', score.examScore || '']);

            const csvContent = [
                `# ${formData.subject.name} - ${formData.class.className}`,
                `# Academic Year: ${formData.academicYear}, Term: ${formData.academicTerm}`,
                `# Instructions: Fill in Class Score and Exam Score columns (0-100). Do not modify the first 3 columns.`,
                '',
                headers.join(','),
                ...rows.map((row) => row.join(','))
            ].join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${formData.class.className}_${formData.subject.name}_Scores_Template.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.current?.show({
                severity: 'success',
                summary: 'Template Downloaded',
                detail: 'Fill the template and upload to import scores',
                life: 3000
            });
        } catch (error) {
            console.error('Error downloading template:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to download template',
                life: 3000
            });
        }
    };

    const handleFileUpload = (event: any) => {
        const file = event.files[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));

                if (lines.length < 2) {
                    throw new Error('Invalid file format');
                }

                // Skip header line
                const dataLines = lines.slice(1);
                let successCount = 0;
                let errorCount = 0;

                const updatedScores = formData.studentScores.map((score) => {
                    const studentId = score.student.studentInfo?.studentId || '';
                    const matchingLine = dataLines.find((line: string) => {
                        const cols = line.split(',');
                        return cols[0]?.trim() === studentId;
                    });

                    if (matchingLine) {
                        const cols = matchingLine.split(',');
                        const classScore = parseFloat(cols[3]?.trim()) || 0;
                        const examScore = parseFloat(cols[4]?.trim()) || 0;

                        // Validate scores
                        if (classScore >= 0 && classScore <= 100 && examScore >= 0 && examScore <= 100) {
                            const totalScore = calculateTotalScore(classScore, examScore);
                            const grade = getGrade(totalScore);
                            successCount++;
                            return {
                                ...score,
                                classScore,
                                examScore,
                                totalScore,
                                grade,
                                credit: getCreditPoints(grade)
                            };
                        } else {
                            errorCount++;
                        }
                    }
                    return score;
                });

                setFormData((prev) => ({ ...prev, studentScores: updatedScores }));

                toast.current?.show({
                    severity: successCount > 0 ? 'success' : 'warn',
                    summary: 'Upload Complete',
                    detail: `${successCount} scores imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
                    life: 4000
                });

                // Clear file upload
                if (fileUploadRef.current) {
                    fileUploadRef.current.clear();
                }
            } catch (error) {
                console.error('Error parsing file:', error);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Upload Failed',
                    detail: 'Invalid file format. Please use the downloaded template.',
                    life: 4000
                });
            } finally {
                setUploading(false);
            }
        };

        reader.onerror = () => {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to read file',
                life: 3000
            });
            setUploading(false);
        };

        reader.readAsText(file);
    };

    // Column templates
    const studentNameTemplate = (rowData: StudentScore) => (
        <div className="flex align-items-center gap-2">
            <div>
                <div className="font-semibold">
                    {rowData.student.firstName} {rowData.student.lastName}
                </div>
                <small className="text-600">{rowData.student.studentInfo?.studentId}</small>
            </div>
        </div>
    );

    const classScoreTemplate = (rowData: StudentScore) => (
        <InputNumber
            value={rowData.classScore}
            onValueChange={(e) => handleScoreChange(rowData.student._id, 'classScore', e.value ?? 0)}
            min={0}
            max={100}
            className="w-full"
            disabled={saving}
            showButtons
            buttonLayout="horizontal"
            step={1}
            decrementButtonClassName="p-button-outlined p-button-sm"
            incrementButtonClassName="p-button-outlined p-button-sm"
        />
    );

    const examScoreTemplate = (rowData: StudentScore) => (
        <InputNumber
            value={rowData.examScore}
            onValueChange={(e) => handleScoreChange(rowData.student._id, 'examScore', e.value ?? 0)}
            min={0}
            max={100}
            className="w-full"
            disabled={saving}
            showButtons
            buttonLayout="horizontal"
            step={1}
            decrementButtonClassName="p-button-outlined p-button-sm"
            incrementButtonClassName="p-button-outlined p-button-sm"
        />
    );

    const totalScoreTemplate = (rowData: StudentScore) => (
        <div className="text-center">
            <Chip label={rowData.totalScore.toFixed(1)} className="font-bold" />
        </div>
    );

    const gradeTemplate = (rowData: StudentScore) => <Tag value={rowData.grade} severity={rowData.grade === 'A' ? 'success' : rowData.grade === 'B' ? 'info' : rowData.grade === 'C' ? 'warning' : 'danger'} className="font-bold" />;

    const creditTemplate = (rowData: StudentScore) => (
        <div className="text-center">
            <Chip label={rowData.credit.toFixed(1)} className={`font-bold ${rowData.credit >= 4 ? 'bg-green-500' : rowData.credit >= 2 ? 'bg-blue-500' : rowData.credit > 0 ? 'bg-orange-500' : 'bg-red-500'}`} />
        </div>
    );

    const statusTemplate = (rowData: StudentScore) => (rowData.hasExistingRecord ? <Tag value="Saved" severity="success" icon="pi pi-check" /> : <Tag value="New" severity="warning" icon="pi pi-plus" />);

    // Render setup section
    const renderSetup = () => (
        <Card className="mb-3">
            <div className="grid formgrid p-fluid">
                <div className="col-12">
                    <Message severity="info" text="Select the class, subject, and academic term to load students for bulk score entry" />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="school" className="font-semibold">
                        School *
                    </label>
                    <Dropdown
                        id="school"
                        value={formData.school}
                        options={schools}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                school: e.value,
                                site: null,
                                class: null,
                                subject: null
                            })
                        }
                        optionLabel="name"
                        placeholder="Select school"
                        disabled={!!user?.school || setupComplete}
                        filter
                    />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="site" className="font-semibold">
                        School Site *
                    </label>
                    <Dropdown
                        id="site"
                        value={formData.site}
                        options={sites}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                site: e.value,
                                class: null,
                                subject: null
                            })
                        }
                        optionLabel="siteName"
                        placeholder="Select site"
                        disabled={!formData.school || setupComplete}
                        filter
                    />
                </div>

                <div className="field col-12 md:col-4">
                    <label htmlFor="class" className="font-semibold">
                        Class *
                    </label>
                    <Dropdown
                        id="class"
                        value={formData.class}
                        options={classes}
                        onChange={(e) => setFormData({ ...formData, class: e.value, subject: null })}
                        optionLabel="className"
                        placeholder="Select class"
                        disabled={!formData.site || setupComplete}
                        filter
                    />
                </div>

                <div className="field col-12 md:col-4">
                    <label htmlFor="subject" className="font-semibold">
                        Subject *
                    </label>
                    <Dropdown
                        id="subject"
                        value={formData.subject}
                        options={subjects}
                        onChange={(e) => setFormData({ ...formData, subject: e.value })}
                        optionLabel="name"
                        placeholder="Select subject"
                        disabled={!formData.class || setupComplete}
                        filter
                    />
                </div>

                <div className="field col-12 md:col-4">
                    <label htmlFor="academicYear" className="font-semibold">
                        Academic Year *
                    </label>
                    <InputText id="academicYear" value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })} placeholder="2024/2025" disabled={setupComplete} />
                </div>

                <div className="field col-12 md:col-4">
                    <label className="font-semibold">Academic Term *</label>
                    <SelectButton value={formData.academicTerm} options={TERM_OPTIONS} onChange={(e) => setFormData({ ...formData, academicTerm: e.value })} disabled={setupComplete} />
                </div>

                <div className="field col-12 md:col-8">
                    <label className="font-semibold">Actions</label>
                    <div className="flex gap-2 mt-2">
                        {!setupComplete ? (
                            <Button label="Load Students" icon="pi pi-users" onClick={loadStudents} disabled={!formData.class || !formData.subject} loading={loading} />
                        ) : (
                            <Button label="Reset & Change Selection" icon="pi pi-refresh" onClick={handleReset} className="p-button-outlined" />
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );

    // Render score entry table
    const renderScoreTable = () => (
        <Card>
            <Toolbar
                start={
                    <div className="flex align-items-center gap-3">
                        <h3 className="m-0">
                            {formData.subject?.name} - {formData.class?.className}
                        </h3>
                        <Tag value={`${formData.academicTerm} Term ${formData.academicYear}`} />
                    </div>
                }
                end={
                    <div className="flex gap-2">
                        <Chip label={`${savedCount}/${formData.studentScores.length} Saved`} icon="pi pi-check-circle" />
                        <Button label="Download Template" icon="pi pi-download" onClick={handleDownloadTemplate} className="p-button-outlined p-button-sm" disabled={saving || uploading} tooltip="Download CSV template with student list" />
                        <FileUpload ref={fileUploadRef} mode="basic" accept=".csv" maxFileSize={1000000} onSelect={handleFileUpload} auto chooseLabel="Upload Scores" className="p-button-outlined p-button-sm" disabled={saving || uploading} />
                        <Button label="Auto Calculate" icon="pi pi-calculator" onClick={handleAutoCalculateAll} className="p-button-outlined p-button-sm" disabled={saving || uploading} />
                        <Button label="Save All" icon="pi pi-save" onClick={handleSaveAll} loading={saving} className="p-button-success p-button-sm" disabled={uploading} />
                    </div>
                }
            />

            <Divider />

            {formData.studentScores.length > 0 && <Message severity="info" text="💡 Tip: Download the CSV template, fill in scores offline, then upload to quickly import all scores at once" className="mb-3" />}

            <DataTable value={formData.studentScores} scrollable scrollHeight="500px" emptyMessage="No students loaded" className="mt-3">
                <Column header="#" body={(data, options) => options.rowIndex + 1} style={{ width: '60px' }} frozen />
                <Column header="Student" body={studentNameTemplate} style={{ minWidth: '250px' }} frozen />
                <Column header="Class Score (40%)" body={classScoreTemplate} style={{ width: '200px' }} />
                <Column header="Exam Score (60%)" body={examScoreTemplate} style={{ width: '200px' }} />
                <Column header="Total" body={totalScoreTemplate} style={{ width: '100px' }} />
                <Column header="Grade" body={gradeTemplate} style={{ width: '100px' }} />
                <Column header="Grade Point" body={creditTemplate} style={{ width: '120px' }} />
                <Column header="Status" body={statusTemplate} style={{ width: '120px' }} />
            </DataTable>

            <div className="mt-3 p-3 surface-100 border-round">
                <div className="grid">
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Total Students</div>
                            <div className="text-2xl font-bold text-primary">{formData.studentScores.length}</div>
                        </div>
                    </div>
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Average Score</div>
                            <div className="text-2xl font-bold">{formData.studentScores.length > 0 ? (formData.studentScores.reduce((sum, s) => sum + s.totalScore, 0) / formData.studentScores.length).toFixed(1) : '0.0'}</div>
                        </div>
                    </div>
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Highest Score</div>
                            <div className="text-2xl font-bold text-green-600">{formData.studentScores.length > 0 ? Math.max(...formData.studentScores.map((s) => s.totalScore)).toFixed(1) : '0.0'}</div>
                        </div>
                    </div>
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Pass Rate</div>
                            <div className="text-2xl font-bold text-blue-600">{formData.studentScores.length > 0 ? ((formData.studentScores.filter((s) => s.totalScore >= 40).length / formData.studentScores.length) * 100).toFixed(0) : '0'}%</div>
                        </div>
                    </div>
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Total Grade Points</div>
                            <div className="text-2xl font-bold text-purple-600">{formData.studentScores.length > 0 ? formData.studentScores.reduce((sum, s) => sum + s.credit, 0).toFixed(1) : '0.0'}</div>
                        </div>
                    </div>
                    <div className="col-12 md:col-2">
                        <div className="text-center">
                            <div className="text-600 mb-1">Avg Grade Point</div>
                            <div className="text-2xl font-bold text-indigo-600">{formData.studentScores.length > 0 ? (formData.studentScores.reduce((sum, s) => sum + s.credit, 0) / formData.studentScores.length).toFixed(2) : '0.00'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );

    return (
        <div className="class-exam-score-entry">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="surface-card p-4 shadow-2 border-round mb-3">
                <div className="flex justify-content-between align-items-center">
                    <div>
                        <h2 className="mt-0 mb-2">📝 Class Exam Score Entry</h2>
                        <p className="text-600 mt-0">Enter exam scores for an entire class at once - efficient bulk data entry</p>
                    </div>
                </div>
            </div>

            {renderSetup()}

            {setupComplete && renderScoreTable()}
        </div>
    );
};

export default ClassExamScoreEntry;
