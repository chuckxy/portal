'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Steps } from 'primereact/steps';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { SelectButton } from 'primereact/selectbutton';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Timeline } from 'primereact/timeline';
import { Message } from 'primereact/message';
import { Chip } from 'primereact/chip';
import { Checkbox } from 'primereact/checkbox';
import { useAuth } from '@/context/AuthContext';
import { debounce } from 'lodash';
import LocalDBService from '@/lib/services/localDBService';
import { getAcademicYears } from '@/lib/utils/utilFunctions';

// Helper function to get auth headers
const getAuthHeaders = async () => {
    const token = await LocalDBService.getLocalDataItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

// Types
interface SubjectScore {
    _id?: string;
    subject: any;
    classScore: number;
    examScore: number;
    totalScore: number;
    grade: string;
    position?: number;
    classSize?: number;
    remarks?: string;
    teacherComment?: string;
}

interface ExamScoreData {
    _id?: string;
    student: any;
    school: any;
    site: any;
    class: any;
    academicYear: string;
    academicTerm: number;
    scores: SubjectScore[];
    overallPosition?: number;
    overallAverage: number;
    totalMarks: number;
    attendance: {
        present: number;
        absent: number;
        late: number;
    };
    conduct: string;
    interest: string;
    formMasterComment: string;
    headmasterComment: string;
    nextTermBegins?: Date;
    promoted: boolean;
    promotedTo?: any;
    recordedBy: any;
    modificationHistory: any[];
    isPublished: boolean;
    publishedAt?: Date;
}

interface ValidationError {
    field: string;
    message: string;
    step: number;
}

interface ExamScoreEntryFormProps {
    existingScore?: ExamScoreData;
    onSave?: (data: ExamScoreData) => void;
    onCancel?: () => void;
    onClose?: () => void;
}

const CONDUCT_OPTIONS = [
    { label: '⭐ Excellent', value: 'excellent' },
    { label: '👍 Very Good', value: 'very_good' },
    { label: '✓ Good', value: 'good' },
    { label: '○ Satisfactory', value: 'satisfactory' },
    { label: '⚠ Needs Improvement', value: 'needs_improvement' }
];

const TERM_OPTIONS = [
    { label: 'First Term', value: 1 },
    { label: 'Second Term', value: 2 },
    { label: 'Third Term', value: 3 }
];

const INITIAL_DATA_STATE: ExamScoreData = {
    student: null,
    school: 0,
    site: 0,
    class: null,
    academicYear: getAcademicYears[0].value,
    academicTerm: 1,
    scores: [],
    overallPosition: undefined,
    overallAverage: 0,
    totalMarks: 0,
    attendance: {
        present: 0,
        absent: 0,
        late: 0
    },
    conduct: 'satisfactory',
    interest: 'satisfactory',
    formMasterComment: '',
    headmasterComment: '',
    promoted: false,
    recordedBy: 0,
    modificationHistory: [],
    isPublished: false
};
/**
 * ExamScoreEntryForm Component
 *
 * Data Flow (Cascading Dropdowns):
 * 1. School dropdown → loads all schools
 * 2. School Site dropdown → filters sites by selected school
 * 3. Class dropdown → filters classes by selected site
 * 4. Student dropdown → filters students by selected class
 *
 * Subject Score Auto-Population:
 * - When a student is selected, checks for existing exam scores
 * - If existing scores found → pre-loads those scores
 * - If no existing scores → auto-populates subjects from:
 *   a) Student's class subjects (if class selected)
 *   b) Teacher's subjects (if user is a teacher)
 *   c) All subjects (fallback)
 *
 * Subject Filtering Logic:
 * - Subjects filtered by selected class
 * - If teacher role: only shows subjects they teach
 * - Teachers can manually add more subjects via "Add Subject" button
 */
const ExamScoreEntryForm: React.FC<ExamScoreEntryFormProps> = ({ existingScore, onSave }) => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form data state
    const [formData, setFormData] = useState<ExamScoreData>(INITIAL_DATA_STATE);

    // Dropdown options state
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
    const [classSize, setClassSize] = useState<number>(0);

    // Validation state
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [contextLocked, setContextLocked] = useState(false);
    const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

    // Permission checks
    const canEditHeadmasterComment = ['headmaster', 'admin', 'proprietor'].includes(user?.personCategory || '');
    const canPublish = ['teacher', 'headmaster', 'admin', 'proprietor'].includes(user?.personCategory || '');
    const canUnpublish = ['headmaster', 'admin', 'proprietor'].includes(user?.personCategory || '');
    const isEditMode = !!existingScore;

    // Steps configuration
    const steps = [{ label: 'Academic Context' }, { label: 'Subject Scores' }, { label: 'Attendance & Behavior' }, { label: 'Comments & Promotion' }, { label: 'Review & Publish' }];

    // Load existing data
    useEffect(() => {
        if (existingScore) {
            setFormData(existingScore);
            setContextLocked(existingScore.scores.length > 0);
        }
    }, [existingScore]);

    // Fetch supporting data
    useEffect(() => {
        if (user?.school) {
            fetchSchools();
        }
    }, [user]);

    useEffect(() => {
        if (formData.school) {
            const schoolId = formData.school._id || formData.school;
            fetchSites(schoolId);
        } else {
            setSites([]);
            setClasses([]);
            setStudents([]);
        }
    }, [formData.school]);

    useEffect(() => {
        if (formData.site) {
            const siteId = formData.site._id || formData.site;
            fetchClasses(siteId);
        } else {
            setClasses([]);
            setStudents([]);
        }
    }, [formData.site]);

    useEffect(() => {
        if (formData.class) {
            const classId = formData.class._id || formData.class;
            fetchStudentsByClass(classId);
        } else {
            setStudents([]);
        }
    }, [formData.class]);

    // Auto-save (debounced)
    const debouncedSave = useMemo(
        () =>
            debounce(async (data: ExamScoreData) => {
                if (!data._id) return; // Only autosave existing records
                try {
                    const headers = await getAuthHeaders();
                    await fetch(`/api/exam-scores/${data._id}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(data)
                    });
                } catch (error) {
                    console.error('Autosave failed:', error);
                }
            }, 2000),
        []
    );

    // Trigger autosave on data change
    useEffect(() => {
        if (formData._id && !formData.isPublished) {
            debouncedSave(formData);
        }
    }, [formData, debouncedSave]);

    // API Functions
    const fetchSchools = async () => {
        try {
            // If user has a school, fetch only that school, otherwise fetch all
            let url = '/api/school';
            if (user?.school) {
                url += `?_id=${user.school}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            const schoolsData = Array.isArray(data) ? data : [data];
            setSchools(schoolsData);

            // If user has a school and it's in the data, auto-select it
            if (user?.school && schoolsData.length > 0) {
                const userSchool = schoolsData.find((s: any) => s._id === user.school) || schoolsData[0];
                if (!formData.school) {
                    setFormData((prev) => ({ ...prev, school: userSchool, recordedBy: user?.id || user?.id }));
                }
            }

            // Ensure recordedBy is always set if user exists
            if (user?._id && !formData.recordedBy) {
                setFormData((prev) => ({ ...prev, recordedBy: user._id }));
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
            setSchools([]);
        }
    };

    const fetchSites = async (schoolId: string) => {
        try {
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data: any = await response.json();
            const fetchedSites = Array.isArray(data.sites) ? data.sites : [];
            setSites(fetchedSites);
        } catch (error) {
            console.error('Error fetching sites:', error);
            setSites([]);
        }
    };

    const fetchClasses = async (siteId: string) => {
        try {
            const response = await fetch(`/api/classes?site=${siteId}`);
            const data = await response.json();
            setClasses(Array.isArray(data.classes) ? data.classes : []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            setClasses([]);
        }
    };

    const fetchStudentsByClass = async (classId: string) => {
        try {
            const response = await fetch(`/api/students?class=${classId}`);
            const data = await response.json();

            setStudents(Array.isArray(data.students) ? data.students : []);
        } catch (error) {
            console.error('Error fetching students:', error);
            setStudents([]);
        }
    };

    const fetchClassSize = async (classId: string) => {
        try {
            const response = await fetch(`/api/classes/${classId}/student-count`);
            const data = await response.json();

            if (data.success) {
                setClassSize(data.studentCount);
            }
        } catch (error) {
            console.error('Error fetching class size:', error);
            setClassSize(0);
        }
    };

    const checkDuplicate = async () => {
        if (!formData.student || !formData.academicYear || !formData.academicTerm) return;

        try {
            const studentId = formData.student._id || formData.student;
            const response = await fetch(`/api/exam-scores/check-duplicate?student=${studentId}&year=${formData.academicYear}&term=${formData.academicTerm}`);
            const data = await response.json();

            if (data.exists && (!existingScore || data.recordId !== existingScore._id)) {
                setDuplicateWarning(`Exam record already exists for ${formData.student.firstName} ${formData.student.lastName} • ${formData.academicYear} • Term ${formData.academicTerm}`);
            } else {
                setDuplicateWarning(null);
            }
        } catch (error) {
            console.error('Error checking duplicate:', error);
        }
    };

    const loadStudentExistingScores = async (student: any) => {
        if (!student || !formData.academicYear || !formData.academicTerm) return;

        try {
            const studentId = student._id || student;
            const response = await fetch(`/api/exam-scores?student=${studentId}&year=${formData.academicYear}&term=${formData.academicTerm}`);
            const data = await response.json();

            // If existing scores found, pre-populate all form data for editing
            if (data && data.scores.length && data.scores[0]) {
                const existingData = data.scores[0];

                // Fetch available subjects first to ensure proper mapping

                setFormData((prev) => ({
                    ...prev,
                    _id: existingData._id,
                    scores: existingData.scores || [],
                    overallPosition: existingData.overallPosition,
                    overallAverage: existingData.overallAverage || 0,
                    totalMarks: existingData.totalMarks || 0,
                    attendance: existingData.attendance || prev.attendance,
                    conduct: existingData.conduct || prev.conduct,
                    interest: existingData.interest || prev.interest,
                    formMasterComment: existingData.formMasterComment || '',
                    headmasterComment: existingData.headmasterComment || '',
                    nextTermBegins: existingData.nextTermBegins ? new Date(existingData.nextTermBegins) : undefined,
                    promoted: existingData.promoted || false,
                    promotedTo: existingData.promotedTo || null,
                    recordedBy: existingData.recordedBy || prev.recordedBy,
                    modificationHistory: existingData.modificationHistory || [],
                    isPublished: existingData.isPublished || false,
                    publishedAt: existingData.publishedAt ? new Date(existingData.publishedAt) : undefined
                }));
            } else {
                // Otherwise, fetch subjects and auto-populate with empty scores
                await autoPopulateSubjects();
            }
        } catch (error) {
            console.error('Error loading student scores:', error);
        }
    };

    const autoPopulateSubjects = async () => {
        try {
            if (Array.isArray(subjects) && subjects.length > 0) {
                const emptyScores = subjects.map((subject: any) => ({
                    subject: subject,
                    classScore: 0,
                    examScore: 0,
                    totalScore: 0,
                    grade: 'F',
                    position: 0,
                    classSize: classSize
                }));

                setFormData((prev) => ({
                    ...prev,
                    scores: emptyScores
                }));
            }
        } catch (error) {
            console.error('Error auto-populating subjects:', error);
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

    // Calculate total score (40% class + 60% exam)
    const calculateTotalScore = (classScore: number, examScore: number): number => {
        return classScore * 0.4 + examScore * 0.6;
    };

    // Calculate overall average
    const calculateOverallAverage = (): number => {
        if (formData.scores.length === 0) return 0;
        const total = formData.scores.reduce((sum, score) => sum + score.totalScore, 0);
        return total / formData.scores.length;
    };

    // Calculate total marks
    const calculateTotalMarks = (): number => {
        return formData.scores.reduce((sum, score) => sum + score.totalScore, 0);
    };

    // Calculate attendance percentage
    const calculateAttendancePercentage = (): number => {
        const { present, absent, late } = formData.attendance;
        const total = present + absent + late;
        return total > 0 ? (present / total) * 100 : 0;
    };

    // Validation
    const validateStep = (step: number): ValidationError[] => {
        const stepErrors: ValidationError[] = [];

        switch (step) {
            case 0: // Academic Context
                if (!formData.school) {
                    stepErrors.push({ field: 'school', message: 'School is required', step: 0 });
                }
                if (!formData.site) {
                    stepErrors.push({ field: 'site', message: 'School site is required', step: 0 });
                }
                if (!formData.class) {
                    stepErrors.push({ field: 'class', message: 'Class is required', step: 0 });
                }
                if (!formData.student) {
                    stepErrors.push({ field: 'student', message: 'Student is required', step: 0 });
                }
                if (!formData.academicYear) {
                    stepErrors.push({ field: 'academicYear', message: 'Academic year is required', step: 0 });
                }
                break;

            case 1: // Subject Scores
                if (formData.scores.length === 0) {
                    stepErrors.push({ field: 'scores', message: 'At least one subject score is required', step: 1 });
                }
                formData.scores.forEach((score, index) => {
                    if (!score.subject) {
                        stepErrors.push({ field: `scores[${index}].subject`, message: `Subject is required for row ${index + 1}`, step: 1 });
                    }
                    if (score.classScore < 0 || score.classScore > 100) {
                        stepErrors.push({ field: `scores[${index}].classScore`, message: `Class score must be 0-100 for row ${index + 1}`, step: 1 });
                    }
                    if (score.examScore < 0 || score.examScore > 100) {
                        stepErrors.push({ field: `scores[${index}].examScore`, message: `Exam score must be 0-100 for row ${index + 1}`, step: 1 });
                    }
                });
                break;

            case 3: // Comments
                if (!formData.formMasterComment?.trim()) {
                    stepErrors.push({ field: 'formMasterComment', message: 'Form Master comment is required', step: 3 });
                }
                if (formData.promoted && !formData.promotedTo) {
                    stepErrors.push({ field: 'promotedTo', message: 'Promoted to class is required when student is promoted', step: 3 });
                }
                break;

            case 4: // Review
                if (calculateOverallAverage() === 0) {
                    stepErrors.push({ field: 'overallAverage', message: 'Overall average cannot be zero', step: 4 });
                }
                break;
        }

        return stepErrors;
    };

    const validateAll = (): { errors: ValidationError[]; warnings: string[] } => {
        let allErrors: ValidationError[] = [];
        const warnings: string[] = [];

        // Validate all steps
        for (let i = 0; i < steps.length - 1; i++) {
            allErrors = [...allErrors, ...validateStep(i)];
        }

        // Warnings
        const attendanceRate = calculateAttendancePercentage();
        if (attendanceRate < 75) {
            warnings.push('Attendance below 75% - student may need intervention');
        }
        if (calculateOverallAverage() < 40) {
            warnings.push('Overall average below passing grade (40%)');
        }
        if (!formData.headmasterComment?.trim()) {
            warnings.push('Headmaster comment not provided');
        }

        return { errors: allErrors, warnings };
    };

    // Handlers
    const handleSchoolChange = (schoolObj: any) => {
        setFormData((prev) => ({
            ...prev,
            school: schoolObj,
            site: null,
            class: null,
            student: null
        }));
        setSites([]);
        setClasses([]);
        setStudents([]);
    };

    const handleSiteChange = (siteObj: any) => {
        setFormData((prev) => ({
            ...prev,
            site: siteObj,
            class: null,
            student: null
        }));
        setClasses([]);
        setStudents([]);
    };

    const handleClassChange = (classObj: any) => {
        setFormData((prev) => ({
            ...prev,
            class: classObj,
            student: null
        }));
        setStudents([]);
        setSubjects(classObj.subjects || []);
        setContextLocked(false);

        // Fetch the class size when class changes
        const classId = classObj._id || classObj;
        if (classId) {
            fetchClassSize(classId);
        }
    };

    const handleStudentChange = (studentObj: any) => {
        setFormData((prev) => ({
            ...prev,
            student: studentObj
        }));
        checkDuplicate();
        loadStudentExistingScores(studentObj);
    };

    const handleAddSubjectRow = () => {
        setFormData((prev) => ({
            ...prev,
            scores: [
                ...prev.scores,
                {
                    subject: null,
                    classScore: 0,
                    examScore: 0,
                    totalScore: 0,
                    grade: 'F',
                    classSize: classSize
                }
            ]
        }));
    };

    const handleRemoveSubjectRow = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            scores: prev.scores.filter((_, i) => i !== index)
        }));
    };

    const handleScoreChange = (index: number, field: keyof SubjectScore, value: any) => {
        setFormData((prev) => {
            const updatedScores = [...prev.scores];
            updatedScores[index] = { ...updatedScores[index], [field]: value };

            // Auto-calculate if class or exam score changed
            if (field === 'classScore' || field === 'examScore') {
                const { classScore, examScore } = updatedScores[index];
                updatedScores[index].totalScore = calculateTotalScore(classScore, examScore);
                updatedScores[index].grade = getGrade(updatedScores[index].totalScore);
            }

            // Always set the classSize on score changes
            updatedScores[index].classSize = classSize;

            return { ...prev, scores: updatedScores };
        });
    };

    const handleAutoCalculateAll = () => {
        setFormData((prev) => ({
            ...prev,
            scores: prev.scores.map((score) => ({
                ...score,
                totalScore: calculateTotalScore(score.classScore, score.examScore),
                grade: getGrade(calculateTotalScore(score.classScore, score.examScore)),
                classSize: classSize
            })),
            overallAverage: calculateOverallAverage(),
            totalMarks: calculateTotalMarks()
        }));

        toast.current?.show({
            severity: 'success',
            summary: 'Calculated',
            detail: 'All scores recalculated successfully',
            life: 2000
        });
    };

    const handleNext = () => {
        const stepErrors = validateStep(activeStep);
        if (stepErrors.length > 0) {
            setErrors(stepErrors);
            toast.current?.show({
                severity: 'error',
                summary: 'Validation Error',
                detail: `Please fix ${stepErrors.length} error(s) before proceeding`,
                life: 3000
            });
            return;
        }

        setErrors([]);
        setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handlePrevious = () => {
        setActiveStep((prev) => Math.max(prev - 1, 0));
    };

    const handleSaveDraft = async () => {
        // Prevent saving published records
        if (formData.isPublished) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Cannot Save',
                detail: 'Published exam scores cannot be edited. Please unpublish first.',
                life: 4000
            });
            return;
        }

        setSaving(true);
        try {
            const method = formData._id ? 'PUT' : 'POST';
            const url = formData._id ? `/api/exam-scores/${formData._id}` : '/api/exam-scores';

            // Prepare data with proper defaults
            const dataToSave = {
                ...formData,
                recordedBy: formData.recordedBy || user?._id,
                overallPosition: formData.overallPosition || undefined,
                overallAverage: calculateOverallAverage(),
                totalMarks: calculateTotalMarks()
            };

            const headers = await getAuthHeaders();
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save');
            }

            const savedData = await response.json();
            setFormData(savedData);

            toast.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Draft saved successfully',
                life: 3000
            });

            if (onSave) onSave(savedData);
        } catch (error: any) {
            console.error('Save error:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to save draft',
                life: 4000
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePublish = async () => {
        const { errors: validationErrors, warnings } = validateAll();

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            toast.current?.show({
                severity: 'error',
                summary: 'Validation Failed',
                detail: `Please fix ${validationErrors.length} error(s) before publishing`,
                life: 5000,
                sticky: true
            });
            return;
        }

        // Show warnings if any
        if (warnings.length > 0) {
            confirmDialog({
                message: (
                    <div>
                        <p className="mb-3">The following warnings were detected:</p>
                        <ul className="pl-4">
                            {warnings.map((warning, idx) => (
                                <li key={idx} className="mb-2">
                                    {warning}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 font-semibold">Do you want to proceed with publishing?</p>
                    </div>
                ),
                header: 'Publish with Warnings?',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Yes, Publish',
                rejectLabel: 'Review',
                accept: () => {
                    // Add delay to allow first dialog to close properly before showing second
                    setTimeout(() => confirmPublish(), 100);
                }
            });
        } else {
            confirmPublish();
        }
    };

    const confirmPublish = () => {
        const studentName = formData.student?.firstName + ' ' + formData.student?.lastName;

        confirmDialog({
            message: (
                <div>
                    <p className="mb-3">You are about to publish exam results for:</p>
                    <div className="surface-100 p-3 border-round mb-3">
                        <p className="mb-2">
                            <strong>Student:</strong> {studentName}
                        </p>
                        <p className="mb-2">
                            <strong>Class:</strong> {formData.class?.className}
                        </p>
                        <p className="mb-2">
                            <strong>Term:</strong> {formData.academicTerm} - {formData.academicYear}
                        </p>
                    </div>
                    <Message severity="warn" text="Published results will be visible to students, parents, and administrators. Once published, editing requires unpublishing first." />
                </div>
            ),
            header: 'Confirm Publication',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Yes, Publish',
            rejectLabel: 'Cancel',
            accept: () => executePublish()
        });
    };

    const executePublish = async () => {
        setLoading(true);
        try {
            // Save draft first to ensure we have an _id
            if (!formData._id) {
                await handleSaveDraft();
                // Wait a bit for state to update
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            // Check if we have _id after save
            if (!formData._id) {
                throw new Error('Failed to save exam score before publishing');
            }
            setTimeout(async () => {
                // Then publish
                const headers = await getAuthHeaders();
                const response = await fetch(`/api/exam-scores/${formData._id}/publish`, {
                    method: 'PATCH',
                    headers
                });

                if (!response.ok) throw new Error('Failed to publish');

                const publishedData = await response.json();
                setFormData(publishedData);

                toast.current?.show({
                    severity: 'success',
                    summary: 'Published',
                    detail: 'Exam results published successfully',
                    life: 3000
                });
                if (onSave) onSave(publishedData);
            }, 1000);
        } catch (error: any) {
            console.error('Error publishing exam score:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to publish results',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnpublish = () => {
        confirmDialog({
            message: 'Are you sure you want to unpublish this exam record? It will no longer be visible to students and parents.',
            header: 'Confirm Unpublish',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Unpublish',
            rejectLabel: 'Cancel',
            accept: async () => {
                try {
                    const headers = await getAuthHeaders();
                    const response = await fetch(`/api/exam-scores/${formData._id}/unpublish`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify({
                            modifiedBy: user?._id,
                            reason: 'Unpublished for editing'
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to unpublish');
                    }
                    setLoading(true);
                    const unpublishedData = await response.json();
                    setFormData(unpublishedData);

                    toast.current?.show({
                        severity: 'success',
                        summary: 'Unpublished',
                        detail: 'Exam results unpublished',
                        life: 3000
                    });
                } catch (error: any) {
                    console.error('Unpublish error:', error);
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message || 'Failed to unpublish',
                        life: 4000
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };
    const onCancel = () => {
        setFormData({ ...INITIAL_DATA_STATE });
        fetchSchools();
    };
    // Render functions for each step
    const renderStep1 = () => (
        <div className="grid formgrid p-fluid">
            {duplicateWarning && (
                <div className="col-12">
                    <Message severity="warn" text={duplicateWarning} />
                </div>
            )}

            <div className="field col-12 md:col-6">
                <label htmlFor="school" className="font-semibold">
                    School *
                </label>
                <Dropdown
                    id="school"
                    value={formData.school}
                    options={schools || []}
                    onChange={(e) => handleSchoolChange(e.value)}
                    optionLabel="name"
                    placeholder="Select school"
                    disabled={contextLocked || !!user?.school}
                    className={errors.find((e) => e.field === 'school') ? 'p-invalid' : ''}
                    filter
                    showClear={!user?.school}
                />
                {errors.find((e) => e.field === 'school') && <small className="p-error">{errors.find((e) => e.field === 'school')?.message}</small>}
                {user?.school && <small className="text-600">Auto-filled from your account</small>}
                {contextLocked && <small className="text-600">🔒 Locked after scores entered</small>}
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="site" className="font-semibold">
                    School Site *
                </label>
                <Dropdown
                    id="site"
                    value={formData.site}
                    options={sites || []}
                    onChange={(e) => handleSiteChange(e.value)}
                    optionLabel="siteName"
                    placeholder="Select school site"
                    disabled={!formData.school || contextLocked}
                    className={errors.find((e) => e.field === 'site') ? 'p-invalid' : ''}
                    filter
                    showClear
                />
                {errors.find((e) => e.field === 'site') && <small className="p-error">{errors.find((e) => e.field === 'site')?.message}</small>}
                {user?.schoolSite && formData.site && <small className="text-600">Pre-selected from your account</small>}
                {!formData.school && !user?.school && <small className="text-600">School will be auto-filled</small>}
                {contextLocked && <small className="text-600">🔒 Locked after scores entered</small>}
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="class" className="font-semibold">
                    Class *
                </label>
                <Dropdown
                    id="class"
                    value={formData.class}
                    options={classes || []}
                    onChange={(e) => handleClassChange(e.value)}
                    optionLabel="className"
                    placeholder="Select class"
                    disabled={!formData.site || contextLocked}
                    className={errors.find((e) => e.field === 'class') ? 'p-invalid' : ''}
                    filter
                    showClear
                />
                {errors.find((e) => e.field === 'class') && <small className="p-error">{errors.find((e) => e.field === 'class')?.message}</small>}
                {!formData.site && <small className="text-600">Select school site first</small>}
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="student" className="font-semibold">
                    Student *
                </label>
                <Dropdown
                    id="student"
                    value={formData.student}
                    options={students || []}
                    onChange={(e) => handleStudentChange(e.value)}
                    optionLabel="firstName"
                    placeholder="Select student"
                    disabled={!formData.class || contextLocked}
                    className={errors.find((e) => e.field === 'student') ? 'p-invalid' : ''}
                    filter
                    showClear
                    valueTemplate={(item) => (item ? `${item.firstName} ${item.lastName}` : 'Select student')}
                    itemTemplate={(item) => (
                        <div className="flex align-items-center">
                            <div>
                                <div>
                                    {item.firstName} {item.lastName}
                                </div>
                                <small className="text-600">{item.studentInfo?.studentId}</small>
                            </div>
                        </div>
                    )}
                />
                {errors.find((e) => e.field === 'student') && <small className="p-error">{errors.find((e) => e.field === 'student')?.message}</small>}
                {!formData.class && <small className="text-600">Select class first</small>}
                {contextLocked && <small className="text-600">🔒 Locked after scores entered</small>}
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="academicYear" className="font-semibold">
                    Academic Year *
                </label>
                <Dropdown
                    id="academicYear"
                    value={formData.academicYear}
                    options={getAcademicYears}
                    onChange={(e) => setFormData((prev) => ({ ...prev, academicYear: e.value }))}
                    placeholder="Select Academic Year"
                    disabled={contextLocked}
                    className={errors.find((e) => e.field === 'academicYear') ? 'p-invalid' : ''}
                />
                {errors.find((e) => e.field === 'academicYear') && <small className="p-error">{errors.find((e) => e.field === 'academicYear')?.message}</small>}
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="academicTerm" className="font-semibold">
                    Academic Term *
                </label>
                <SelectButton id="academicTerm" value={formData.academicTerm} options={TERM_OPTIONS} onChange={(e) => setFormData((prev) => ({ ...prev, academicTerm: e.value }))} disabled={contextLocked} />
            </div>

            <div className="field col-12 md:col-6">
                <label htmlFor="recordedBy" className="font-semibold">
                    Recorded By
                </label>
                <InputText id="recordedBy" value={user?.firstName + ' ' + user?.lastName} disabled />
            </div>

            <div className="field col-12 md:col-6">
                <label className="font-semibold">Status</label>
                <div className="mt-2">{formData.isPublished ? <Tag severity="success" value="Published" icon="pi pi-check" /> : <Tag severity="warning" value="Draft" icon="pi pi-pencil" />}</div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <div className="flex justify-content-between mb-3">
                <Button label="Add Subject" icon="pi pi-plus" onClick={handleAddSubjectRow} className="p-button-sm" />
                <Button label="Auto-Calculate All" icon="pi pi-calculator" onClick={handleAutoCalculateAll} className="p-button-sm p-button-outlined" disabled={formData.scores.length === 0} />
            </div>

            {errors.find((e) => e.field === 'scores') && <Message severity="error" text={errors.find((e) => e.field === 'scores')?.message} className="mb-3" />}

            <DataTable value={formData.scores} scrollable scrollHeight="400px" emptyMessage="No subjects added yet. Click 'Add Subject' to begin.">
                <Column
                    header="Subject"
                    body={(rowData, options) => (
                        <Dropdown value={rowData.subject} options={subjects || []} onChange={(e) => handleScoreChange(options.rowIndex, 'subject', e.value)} optionLabel="name" dataKey="_id" placeholder="Select" className="w-full" filter showClear />
                    )}
                />
                <Column header="Class Score" body={(rowData, options) => <InputNumber value={rowData.classScore} onValueChange={(e) => handleScoreChange(options.rowIndex, 'classScore', e.value || 0)} min={0} max={100} className="w-full" />} />
                <Column header="Exam Score" body={(rowData, options) => <InputNumber value={rowData.examScore} onValueChange={(e) => handleScoreChange(options.rowIndex, 'examScore', e.value || 0)} min={0} max={100} className="w-full" />} />
                <Column header="Total" body={(rowData) => rowData.totalScore?.toFixed(1)} />
                <Column header="Grade" body={(rowData) => <Tag value={rowData.grade} severity={rowData.grade === 'A' ? 'success' : rowData.grade === 'B' ? 'info' : rowData.grade === 'C' ? 'warning' : 'danger'} />} />
                <Column header="Position" body={(rowData, options) => <InputNumber value={rowData.position} onValueChange={(e) => handleScoreChange(options.rowIndex, 'position', e.value)} min={1} className="w-full" />} />
                <Column header="Class Size" body={(rowData, options) => <InputNumber value={rowData.classSize} onValueChange={(e) => handleScoreChange(options.rowIndex, 'classSize', e.value)} min={0} className="w-full" />} />
                <Column header="" body={(rowData, options) => <Button icon="pi pi-trash" className="p-button-rounded p-button-danger p-button-text" onClick={() => handleRemoveSubjectRow(options.rowIndex)} />} />
            </DataTable>

            <div className="mt-3 text-right">
                <small className="text-600">Total Score = (Class Score × 0.4) + (Exam Score × 0.6)</small>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="grid">
            <div className="col-12">
                <Card title="📅 Attendance Record">
                    <div className="grid formgrid p-fluid">
                        <div className="field col-12 md:col-4">
                            <label htmlFor="present">Days Present</label>
                            <InputNumber
                                id="present"
                                value={formData.attendance.present}
                                onValueChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        attendance: { ...prev.attendance, present: e.value || 0 }
                                    }))
                                }
                                min={0}
                            />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="absent">Days Absent</label>
                            <InputNumber
                                id="absent"
                                value={formData.attendance.absent}
                                onValueChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        attendance: { ...prev.attendance, absent: e.value || 0 }
                                    }))
                                }
                                min={0}
                            />
                        </div>
                        <div className="field col-12 md:col-4">
                            <label htmlFor="late">Days Late</label>
                            <InputNumber
                                id="late"
                                value={formData.attendance.late}
                                onValueChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        attendance: { ...prev.attendance, late: e.value || 0 }
                                    }))
                                }
                                min={0}
                            />
                        </div>
                        <div className="col-12">
                            <div className="surface-100 p-3 border-round">
                                <div className="flex align-items-center justify-content-between">
                                    <span className="font-semibold">Attendance Rate:</span>
                                    <Chip label={`${calculateAttendancePercentage().toFixed(1)}%`} className={calculateAttendancePercentage() >= 75 ? 'bg-green-500' : 'bg-red-500'} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12">
                <Card title="🎯 Conduct & Interest">
                    <div className="grid formgrid p-fluid">
                        <div className="field col-12">
                            <label className="font-semibold mb-3 block">Conduct Rating *</label>
                            <SelectButton value={formData.conduct} options={CONDUCT_OPTIONS} onChange={(e) => setFormData((prev) => ({ ...prev, conduct: e.value }))} />
                        </div>
                        <div className="field col-12">
                            <label className="font-semibold mb-3 block">Interest in Learning *</label>
                            <SelectButton value={formData.interest} options={CONDUCT_OPTIONS} onChange={(e) => setFormData((prev) => ({ ...prev, interest: e.value }))} />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="grid">
            <div className="col-12">
                <Card title="💬 Comments">
                    <div className="grid formgrid p-fluid">
                        <div className="field col-12">
                            <label htmlFor="formMasterComment" className="font-semibold">
                                Form Master Comment *
                            </label>
                            <InputTextarea
                                id="formMasterComment"
                                value={formData.formMasterComment}
                                onChange={(e) => setFormData((prev) => ({ ...prev, formMasterComment: e.target.value }))}
                                rows={4}
                                maxLength={500}
                                className={errors.find((e) => e.field === 'formMasterComment') ? 'p-invalid' : ''}
                            />
                            <div className="flex justify-content-between">
                                {errors.find((e) => e.field === 'formMasterComment') && <small className="p-error">{errors.find((e) => e.field === 'formMasterComment')?.message}</small>}
                                <small className="text-right">{formData.formMasterComment.length}/500</small>
                            </div>
                        </div>

                        <div className="field col-12">
                            <label htmlFor="headmasterComment" className="font-semibold">
                                Headmaster Comment
                                {!canEditHeadmasterComment && <span className="ml-2 text-600">🔒 Headmaster/Admin only</span>}
                            </label>
                            <InputTextarea
                                id="headmasterComment"
                                value={formData.headmasterComment}
                                onChange={(e) => setFormData((prev) => ({ ...prev, headmasterComment: e.target.value }))}
                                rows={4}
                                maxLength={500}
                                disabled={!canEditHeadmasterComment}
                            />
                            <small className="text-right">{formData.headmasterComment.length}/500</small>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12">
                <Card title="📈 Promotion">
                    <div className="grid formgrid p-fluid">
                        <div className="field col-12">
                            <div className="flex align-items-center">
                                <Checkbox inputId="promoted" checked={formData.promoted} onChange={(e) => setFormData((prev) => ({ ...prev, promoted: e.checked || false }))} />
                                <label htmlFor="promoted" className="ml-2">
                                    Promoted to Next Class?
                                </label>
                            </div>
                        </div>

                        {formData.promoted && (
                            <>
                                <div className="field col-12 md:col-6">
                                    <label htmlFor="promotedTo" className="font-semibold">
                                        Promoted To *
                                    </label>
                                    <Dropdown
                                        id="promotedTo"
                                        value={formData.promotedTo}
                                        options={classes || []}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, promotedTo: e.value }))}
                                        optionLabel="className"
                                        placeholder="Select class"
                                        className={errors.find((e) => e.field === 'promotedTo') ? 'p-invalid' : ''}
                                    />
                                    {errors.find((e) => e.field === 'promotedTo') && <small className="p-error">{errors.find((e) => e.field === 'promotedTo')?.message}</small>}
                                </div>

                                <div className="field col-12 md:col-6">
                                    <label htmlFor="nextTermBegins" className="font-semibold">
                                        Next Term Begins
                                    </label>
                                    <Calendar id="nextTermBegins" value={formData.nextTermBegins} onChange={(e) => setFormData((prev) => ({ ...prev, nextTermBegins: e.value as Date }))} dateFormat="dd/mm/yy" showIcon />
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderStep5 = () => {
        const overallAverage = calculateOverallAverage();
        const totalMarks = calculateTotalMarks();
        const attendanceRate = calculateAttendancePercentage();

        return (
            <div className="grid">
                {/* Validation Summary */}
                {errors.length > 0 && (
                    <div className="col-12">
                        <Message
                            severity="error"
                            content={
                                <div>
                                    <div className="font-semibold mb-2">❌ {errors.length} ERROR(S) MUST BE FIXED</div>
                                    <ul className="pl-4 m-0">
                                        {errors.map((error, idx) => (
                                            <li key={idx}>{error.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            }
                        />
                    </div>
                )}

                {/* Score Summary */}
                <div className="col-12">
                    <Card title="📊 Score Summary">
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <div className="text-center surface-100 p-3 border-round">
                                    <div className="text-600 mb-2">Overall Average</div>
                                    <div className="text-4xl font-bold text-primary">{overallAverage.toFixed(1)}%</div>
                                    <Tag value={`Grade ${getGrade(overallAverage)}`} severity={overallAverage >= 70 ? 'success' : 'warning'} />
                                </div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-center surface-100 p-3 border-round">
                                    <div className="text-600 mb-2">Total Marks</div>
                                    <div className="text-4xl font-bold">{totalMarks.toFixed(0)}</div>
                                    <small className="text-600">Out of {formData.scores.length * 100}</small>
                                </div>
                            </div>
                            <div className="col-12 md:col-4">
                                <div className="text-center surface-100 p-3 border-round">
                                    <div className="text-600 mb-2">Position</div>
                                    <div className="text-4xl font-bold">{formData.overallPosition || '-'}</div>
                                    {formData.overallPosition && formData.class?.studentCount && <small className="text-600">Top {((formData.overallPosition / formData.class.studentCount) * 100).toFixed(0)}%</small>}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Subject Breakdown */}
                <div className="col-12">
                    <Card title="📚 Subject Breakdown">
                        <DataTable value={formData.scores} size="small">
                            <Column field="subject.name" header="Subject" />
                            <Column header="Total Score" body={(rowData) => rowData.totalScore.toFixed(1)} />
                            <Column header="Grade" body={(rowData) => <Tag value={rowData.grade} />} />
                            <Column header="Position" body={(rowData) => (rowData.position ? `${rowData.position}/${rowData.classSize}` : '-')} />
                        </DataTable>
                    </Card>
                </div>

                {/* Attendance & Conduct */}
                <div className="col-12">
                    <Card title="📅 Attendance & Conduct">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div className="mb-3">
                                    <span className="font-semibold">Present:</span> {formData.attendance.present} days
                                </div>
                                <div className="mb-3">
                                    <span className="font-semibold">Absent:</span> {formData.attendance.absent} days
                                </div>
                                <div className="mb-3">
                                    <span className="font-semibold">Late:</span> {formData.attendance.late} days
                                </div>
                                <div>
                                    <span className="font-semibold">Attendance Rate:</span> <Chip label={`${attendanceRate.toFixed(1)}%`} className={attendanceRate >= 75 ? 'bg-green-500' : 'bg-red-500'} />
                                </div>
                            </div>
                            <div className="col-12 md:col-6">
                                <div className="mb-3">
                                    <span className="font-semibold">Conduct:</span> {formData.conduct.replace('_', ' ')}
                                </div>
                                <div>
                                    <span className="font-semibold">Interest:</span> {formData.interest.replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Promotion Status */}
                {formData.promoted && (
                    <div className="col-12">
                        <Card title="📈 Promotion Status">
                            <div className="flex align-items-center gap-2 mb-2">
                                <i className="pi pi-check-circle text-green-500"></i>
                                <span>
                                    Promoted to <strong>{formData.promotedTo?.className}</strong>
                                </span>
                            </div>
                            {formData.nextTermBegins && (
                                <div>
                                    <span className="font-semibold">Next Term Begins:</span> {new Date(formData.nextTermBegins).toLocaleDateString()}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* Modification History */}
                {formData.modificationHistory && formData.modificationHistory.length > 0 && (
                    <div className="col-12">
                        <Card title="📜 Modification History">
                            <Timeline
                                value={formData.modificationHistory}
                                content={(item) => (
                                    <div>
                                        <div className="font-semibold">{item.action || 'Modified'}</div>
                                        <small className="text-600">
                                            {new Date(item.modifiedAt).toLocaleString()} by {item.modifiedBy?.firstName}
                                        </small>
                                    </div>
                                )}
                            />
                        </Card>
                    </div>
                )}
            </div>
        );
    };

    // Main render
    return (
        <div className="exam-score-entry-form">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header */}
            <div className="surface-card p-4 shadow-2 border-round mb-3">
                <div className="flex justify-content-between align-items-center">
                    <div>
                        <h2 className="mt-0 mb-2">{isEditMode ? 'Edit' : 'Create'} Exam Score</h2>
                        {formData.student && (
                            <div className="text-600">
                                {formData.student.firstName} {formData.student.lastName} • {formData.class?.className} • Term {formData.academicTerm}
                            </div>
                        )}
                    </div>
                    <div>{formData.isPublished ? <Tag severity="success" value="Published" icon="pi pi-check" /> : <Tag severity="warning" value="Draft" icon="pi pi-pencil" />}</div>
                </div>
            </div>

            {/* Steps */}
            <div className="surface-card p-4 shadow-2 border-round mb-3">
                <Steps model={steps} activeIndex={activeStep} onSelect={(e) => setActiveStep(e.index)} readOnly={false} />
            </div>

            {/* Step Content */}
            <div className="surface-card p-4 shadow-2 border-round mb-3" style={{ minHeight: '500px' }}>
                {activeStep === 0 && renderStep1()}
                {activeStep === 1 && renderStep2()}
                {activeStep === 2 && renderStep3()}
                {activeStep === 3 && renderStep4()}
                {activeStep === 4 && renderStep5()}
            </div>

            {/* Footer Actions */}
            <div className="surface-card p-3 shadow-2 border-round flex justify-content-between sticky bottom-0">
                <div>{onCancel && <Button label="Cancel" icon="pi pi-times" onClick={onCancel} className="p-button-text" />}</div>
                <div className="flex gap-2">
                    <Button
                        label="Save Draft"
                        icon="pi pi-save"
                        onClick={handleSaveDraft}
                        loading={saving}
                        disabled={formData.isPublished}
                        className="p-button-outlined"
                        tooltip={formData.isPublished ? 'Cannot edit published records. Unpublish first.' : 'Save as draft'}
                        tooltipOptions={{ position: 'top' }}
                    />
                    {activeStep > 0 && <Button label="Previous" icon="pi pi-arrow-left" onClick={handlePrevious} className="p-button-outlined" />}
                    {activeStep < steps.length - 1 ? (
                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={handleNext} />
                    ) : (
                        <>
                            {formData.isPublished ? (
                                <>
                                    {canUnpublish && <Button label="Unpublish" icon="pi pi-eye-slash" onClick={handleUnpublish} className="p-button-warning" loading={loading} disabled={loading} />}
                                    <Button label="Print Report" icon="pi pi-print" className="p-button-outlined" loading={loading} disabled={loading} />
                                </>
                            ) : (
                                canPublish && <Button label="Publish Results" icon="pi pi-send" onClick={handlePublish} loading={loading} className="p-button-success" disabled={loading} />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamScoreEntryForm;
