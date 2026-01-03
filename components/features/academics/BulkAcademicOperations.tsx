'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Steps } from 'primereact/steps';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { DataTable, DataTableSelectAllChangeEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ProgressBar } from 'primereact/progressbar';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Badge } from 'primereact/badge';
import { Divider } from 'primereact/divider';
import { Panel } from 'primereact/panel';
import { Avatar } from 'primereact/avatar';
import { Chip } from 'primereact/chip';
import { useAuth } from '@/context/AuthContext';

// Types
interface Student {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    studentInfo: {
        studentId: string;
        currentClass: {
            _id: string;
            className: string;
        };
        defaultAcademicYear: string;
        defaultAcademicTerm: number;
        accountBalance?: number;
        balanceBroughtForward?: number;
    };
    isActive: boolean;
    photoLink?: string;
}

interface ClassOption {
    _id: string;
    className: string;
    division?: string;
    sequence?: number;
    department?: {
        name: string;
    };
}

interface ValidationWarning {
    studentId: string;
    studentName: string;
    warnings: string[];
    severity: 'warn' | 'error';
}

interface OperationResult {
    success: number;
    failed: number;
    skipped: number;
    details: Array<{
        studentId: string;
        studentName: string;
        status: 'success' | 'failed' | 'skipped';
        message: string;
    }>;
}

type OperationMode = 'class_promotion' | 'term_update';
type WizardStep = 0 | 1 | 2 | 3 | 4;

// Constants
const ACADEMIC_TERMS = [
    { label: 'Term 1', value: 1 },
    { label: 'Term 2', value: 2 },
    { label: 'Term 3', value: 3 }
];

const generateAcademicYears = (): Array<{ label: string; value: string }> => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -2; i <= 2; i++) {
        const startYear = currentYear + i;
        years.push({
            label: `${startYear}/${startYear + 1}`,
            value: `${startYear}/${startYear + 1}`
        });
    }
    return years;
};

const WIZARD_STEPS = [{ label: 'Select Mode' }, { label: 'Source Criteria' }, { label: 'Target Assignment' }, { label: 'Review Students' }, { label: 'Confirm & Execute' }];

export default function BulkAcademicOperations() {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // Wizard state
    const [activeStep, setActiveStep] = useState<WizardStep>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);

    // Mode selection
    const [operationMode, setOperationMode] = useState<OperationMode | null>(null);

    // Source criteria
    const [sourceAcademicYear, setSourceAcademicYear] = useState<string>('');
    const [sourceAcademicTerm, setSourceAcademicTerm] = useState<number | null>(null);
    const [sourceClass, setSourceClass] = useState<string>('');

    // Target assignment
    const [targetClass, setTargetClass] = useState<string>('');
    const [targetAcademicYear, setTargetAcademicYear] = useState<string>('');
    const [targetAcademicTerm, setTargetAcademicTerm] = useState<number | null>(null);

    // Students data
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentFilter, setStudentFilter] = useState('');

    // Validation
    const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
    const [showWarningsDialog, setShowWarningsDialog] = useState(false);
    const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);

    // Dropdown options
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [academicYears] = useState(generateAcademicYears());

    // Operation result
    const [operationResult, setOperationResult] = useState<OperationResult | null>(null);
    const [showResultDialog, setShowResultDialog] = useState(false);

    // Role-based access control
    const allowedRoles = ['proprietor', 'headmaster', 'admin', 'finance'];
    const hasAccess = user && allowedRoles.includes(user.personCategory);

    // Initialize current academic year
    useEffect(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const academicYear = currentMonth >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
        const academicTerm = currentMonth <= 3 ? 1 : currentMonth <= 7 ? 2 : 3;

        setSourceAcademicYear(academicYear);
        setSourceAcademicTerm(academicTerm);
        setTargetAcademicYear(academicYear);
        setTargetAcademicTerm(academicTerm);
    }, []);

    // Fetch classes
    useEffect(() => {
        fetchClasses();
    }, [user]);

    const fetchClasses = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/classes?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setClasses(data.classes || []);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    // Fetch students based on source criteria
    const fetchStudents = useCallback(async () => {
        if (!sourceClass || !sourceAcademicYear) {
            setStudents([]);
            return;
        }

        setLoadingStudents(true);
        try {
            const params = new URLSearchParams();
            params.append('class', sourceClass);
            params.append('academicYear', sourceAcademicYear);
            if (sourceAcademicTerm) params.append('academicTerm', sourceAcademicTerm.toString());
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);
            params.append('isActive', 'true');

            const response = await fetch(`/api/students?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                const studentList = data.students || [];
                setStudents(studentList);
                setSelectedStudents(studentList); // Select all by default
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load students',
                life: 3000
            });
        } finally {
            setLoadingStudents(false);
        }
    }, [sourceClass, sourceAcademicYear, sourceAcademicTerm, user]);

    // Validate students for promotion/update
    const validateStudents = useCallback(async () => {
        const warnings: ValidationWarning[] = [];

        for (const student of selectedStudents) {
            const studentWarnings: string[] = [];

            // Check outstanding balance
            const totalOutstanding = (student.studentInfo?.accountBalance || 0) + (student.studentInfo?.balanceBroughtForward || 0);
            if (totalOutstanding > 0) {
                studentWarnings.push(`Outstanding balance: GHS ${totalOutstanding.toFixed(2)}`);
            }

            // Check if promoting to same class (for class promotion mode)
            if (operationMode === 'class_promotion' && student.studentInfo?.currentClass?._id === targetClass) {
                studentWarnings.push('Already in target class');
            }

            // Check if updating to same term (for term update mode)
            if (operationMode === 'term_update' && student.studentInfo?.defaultAcademicTerm === targetAcademicTerm) {
                studentWarnings.push('Already in target term');
            }

            if (studentWarnings.length > 0) {
                warnings.push({
                    studentId: student.studentInfo?.studentId || student._id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    warnings: studentWarnings,
                    severity: studentWarnings.some((w) => w.includes('Already in')) ? 'error' : 'warn'
                });
            }
        }

        setValidationWarnings(warnings);
        return warnings;
    }, [selectedStudents, operationMode, targetClass, targetAcademicTerm]);

    // Execute bulk operation
    const executeOperation = async () => {
        setIsProcessing(true);
        setProcessingProgress(0);

        const result: OperationResult = {
            success: 0,
            failed: 0,
            skipped: 0,
            details: []
        };

        const studentsToProcess = selectedStudents.filter((student) => {
            // Skip students with blocking errors
            const warning = validationWarnings.find((w) => w.studentId === (student.studentInfo?.studentId || student._id));
            return !warning?.warnings.some((w) => w.includes('Already in'));
        });

        const totalStudents = studentsToProcess.length;

        for (let i = 0; i < studentsToProcess.length; i++) {
            const student = studentsToProcess[i];

            try {
                const updatePayload: any = {
                    studentId: student._id
                };

                if (operationMode === 'class_promotion') {
                    updatePayload.currentClass = targetClass;
                    updatePayload.defaultAcademicYear = targetAcademicYear;
                    updatePayload.defaultAcademicTerm = targetAcademicTerm;
                    updatePayload.addToClassHistory = true;
                } else {
                    updatePayload.defaultAcademicTerm = targetAcademicTerm;
                    updatePayload.updateClassHistory = true;
                }

                const response = await fetch('/api/students/bulk-academic-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatePayload)
                });

                if (response.ok) {
                    result.success++;
                    result.details.push({
                        studentId: student.studentInfo?.studentId || student._id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        status: 'success',
                        message: operationMode === 'class_promotion' ? 'Promoted successfully' : 'Term updated successfully'
                    });
                } else {
                    const error = await response.json();
                    result.failed++;
                    result.details.push({
                        studentId: student.studentInfo?.studentId || student._id,
                        studentName: `${student.firstName} ${student.lastName}`,
                        status: 'failed',
                        message: error.message || 'Update failed'
                    });
                }
            } catch (error) {
                result.failed++;
                result.details.push({
                    studentId: student.studentInfo?.studentId || student._id,
                    studentName: `${student.firstName} ${student.lastName}`,
                    status: 'failed',
                    message: 'Network or server error'
                });
            }

            setProcessingProgress(Math.round(((i + 1) / totalStudents) * 100));
        }

        // Count skipped students
        result.skipped = selectedStudents.length - studentsToProcess.length;

        setOperationResult(result);
        setShowResultDialog(true);
        setIsProcessing(false);
    };

    // Navigation handlers
    const canProceedToNextStep = (): boolean => {
        switch (activeStep) {
            case 0:
                return operationMode !== null;
            case 1:
                return !!sourceClass && !!sourceAcademicYear;
            case 2:
                if (operationMode === 'class_promotion') {
                    return !!targetClass && !!targetAcademicYear && !!targetAcademicTerm && targetClass !== sourceClass;
                }
                return !!targetAcademicTerm && targetAcademicTerm !== sourceAcademicTerm;
            case 3:
                return selectedStudents.length > 0;
            case 4:
                return acknowledgeWarnings || validationWarnings.length === 0;
            default:
                return false;
        }
    };

    const handleNextStep = async () => {
        if (activeStep === 1) {
            await fetchStudents();
        }
        if (activeStep === 3) {
            await validateStudents();
        }
        if (activeStep < 4) {
            setActiveStep((prev) => (prev + 1) as WizardStep);
        }
    };

    const handlePreviousStep = () => {
        if (activeStep > 0) {
            setActiveStep((prev) => (prev - 1) as WizardStep);
        }
    };

    const resetWizard = () => {
        setActiveStep(0);
        setOperationMode(null);
        setSourceClass('');
        setTargetClass('');
        setStudents([]);
        setSelectedStudents([]);
        setValidationWarnings([]);
        setAcknowledgeWarnings(false);
        setOperationResult(null);
        setShowResultDialog(false);
    };

    // Render functions for each step
    const renderModeSelection = () => (
        <div className="grid">
            <div className="col-12">
                <h3 className="text-center mb-4">Select Operation Mode</h3>
                <p className="text-center text-600 mb-5">Choose the type of academic operation you want to perform on students</p>
            </div>

            <div className="col-12 md:col-6">
                <Card className={`cursor-pointer h-full transition-all transition-duration-200 ${operationMode === 'class_promotion' ? 'border-primary border-2 bg-primary-50' : 'hover:shadow-4'}`} onClick={() => setOperationMode('class_promotion')}>
                    <div className="text-center">
                        <div className={`inline-flex align-items-center justify-content-center border-circle mb-3 ${operationMode === 'class_promotion' ? 'bg-primary' : 'bg-blue-100'}`} style={{ width: '80px', height: '80px' }}>
                            <i className={`pi pi-arrow-up text-4xl ${operationMode === 'class_promotion' ? 'text-white' : 'text-blue-500'}`}></i>
                        </div>
                        <h4 className="mb-2">Class Promotion</h4>
                        <p className="text-600 text-sm m-0">Move students from one class to another. Use this for end-of-year promotions or class transfers.</p>
                        <div className="mt-3">
                            <Tag value="Changes: Class, Year, Term" severity="info" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 md:col-6">
                <Card className={`cursor-pointer h-full transition-all transition-duration-200 ${operationMode === 'term_update' ? 'border-primary border-2 bg-primary-50' : 'hover:shadow-4'}`} onClick={() => setOperationMode('term_update')}>
                    <div className="text-center">
                        <div className={`inline-flex align-items-center justify-content-center border-circle mb-3 ${operationMode === 'term_update' ? 'bg-primary' : 'bg-green-100'}`} style={{ width: '80px', height: '80px' }}>
                            <i className={`pi pi-calendar text-4xl ${operationMode === 'term_update' ? 'text-white' : 'text-green-500'}`}></i>
                        </div>
                        <h4 className="mb-2">Academic Term Update</h4>
                        <p className="text-600 text-sm m-0">Advance students to the next academic term within the same class. Use this for term transitions.</p>
                        <div className="mt-3">
                            <Tag value="Changes: Term Only" severity="success" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderSourceCriteria = () => (
        <div className="grid">
            <div className="col-12">
                <h3 className="mb-2">Define Source Criteria</h3>
                <p className="text-600 mb-4">Select the academic year, term, and class to find students for {operationMode === 'class_promotion' ? 'promotion' : 'term update'}</p>
            </div>

            <div className="col-12 md:col-4">
                <label className="block font-semibold mb-2">
                    Academic Year <span className="text-red-500">*</span>
                </label>
                <Dropdown value={sourceAcademicYear} options={academicYears} onChange={(e) => setSourceAcademicYear(e.value)} placeholder="Select academic year" className="w-full" filter />
            </div>

            <div className="col-12 md:col-4">
                <label className="block font-semibold mb-2">
                    Academic Term <span className="text-red-500">*</span>
                </label>
                <Dropdown value={sourceAcademicTerm} options={ACADEMIC_TERMS} onChange={(e) => setSourceAcademicTerm(e.value)} placeholder="Select term" className="w-full" />
            </div>

            <div className="col-12 md:col-4">
                <label className="block font-semibold mb-2">
                    Current Class <span className="text-red-500">*</span>
                </label>
                <Dropdown value={sourceClass} options={classes} optionLabel="className" optionValue="_id" onChange={(e) => setSourceClass(e.value)} placeholder="Select class" className="w-full" filter />
            </div>

            {sourceClass && sourceAcademicYear && (
                <div className="col-12 mt-4">
                    <Message severity="info" text={`Ready to search for students in the selected class for ${sourceAcademicYear} Term ${sourceAcademicTerm}. Click "Next" to load students.`} className="w-full" />
                </div>
            )}
        </div>
    );

    const renderTargetAssignment = () => {
        const sourceClassName = classes.find((c) => c._id === sourceClass)?.className || 'N/A';

        return (
            <div className="grid">
                <div className="col-12">
                    <h3 className="mb-2">Assign Target {operationMode === 'class_promotion' ? 'Class & Academic Period' : 'Academic Term'}</h3>
                    <p className="text-600 mb-4">{operationMode === 'class_promotion' ? 'Select the destination class and academic period for promoted students' : 'Select the target academic term for the students (class remains the same)'}</p>
                </div>

                {/* Source Summary */}
                <div className="col-12 mb-3">
                    <Panel header="Current Selection (Source)" className="surface-50">
                        <div className="flex flex-wrap gap-3">
                            <Chip label={`Class: ${sourceClassName}`} icon="pi pi-users" />
                            <Chip label={`Year: ${sourceAcademicYear}`} icon="pi pi-calendar" />
                            <Chip label={`Term: ${sourceAcademicTerm}`} icon="pi pi-clock" />
                            <Chip label={`Students: ${students.length}`} icon="pi pi-user" className="bg-primary text-white" />
                        </div>
                    </Panel>
                </div>

                <Divider align="center">
                    <i className="pi pi-arrow-down text-2xl text-primary"></i>
                </Divider>

                {operationMode === 'class_promotion' ? (
                    <>
                        <div className="col-12 md:col-4">
                            <label className="block font-semibold mb-2">
                                Target Class <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                value={targetClass}
                                options={classes.filter((c) => c._id !== sourceClass)}
                                optionLabel="className"
                                optionValue="_id"
                                onChange={(e) => setTargetClass(e.value)}
                                placeholder="Select target class"
                                className="w-full"
                                filter
                            />
                            {targetClass === sourceClass && <small className="text-red-500">Cannot promote to the same class</small>}
                        </div>

                        <div className="col-12 md:col-4">
                            <label className="block font-semibold mb-2">
                                Target Academic Year <span className="text-red-500">*</span>
                            </label>
                            <Dropdown value={targetAcademicYear} options={academicYears} onChange={(e) => setTargetAcademicYear(e.value)} placeholder="Select academic year" className="w-full" filter />
                        </div>

                        <div className="col-12 md:col-4">
                            <label className="block font-semibold mb-2">
                                Target Academic Term <span className="text-red-500">*</span>
                            </label>
                            <Dropdown value={targetAcademicTerm} options={ACADEMIC_TERMS} onChange={(e) => setTargetAcademicTerm(e.value)} placeholder="Select term" className="w-full" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="col-12 md:col-6">
                            <label className="block font-semibold mb-2">Class (Unchanged)</label>
                            <InputText value={sourceClassName} disabled className="w-full" />
                            <small className="text-500">Class remains the same for term updates</small>
                        </div>

                        <div className="col-12 md:col-6">
                            <label className="block font-semibold mb-2">
                                Target Academic Term <span className="text-red-500">*</span>
                            </label>
                            <Dropdown value={targetAcademicTerm} options={ACADEMIC_TERMS.filter((t) => t.value !== sourceAcademicTerm)} onChange={(e) => setTargetAcademicTerm(e.value)} placeholder="Select target term" className="w-full" />
                            {targetAcademicTerm === sourceAcademicTerm && <small className="text-red-500">Target term must be different from source term</small>}
                        </div>
                    </>
                )}

                {/* Target Summary */}
                {((operationMode === 'class_promotion' && targetClass && targetAcademicYear && targetAcademicTerm) || (operationMode === 'term_update' && targetAcademicTerm)) && (
                    <div className="col-12 mt-3">
                        <Panel header="Target Assignment" className="bg-green-50 border-green-200">
                            <div className="flex flex-wrap gap-3">
                                {operationMode === 'class_promotion' && (
                                    <>
                                        <Chip label={`Class: ${classes.find((c) => c._id === targetClass)?.className || 'N/A'}`} icon="pi pi-users" className="bg-green-100" />
                                        <Chip label={`Year: ${targetAcademicYear}`} icon="pi pi-calendar" className="bg-green-100" />
                                    </>
                                )}
                                <Chip label={`Term: ${targetAcademicTerm}`} icon="pi pi-clock" className="bg-green-100" />
                            </div>
                        </Panel>
                    </div>
                )}
            </div>
        );
    };

    const renderStudentPreview = () => {
        const filteredStudents = students.filter(
            (s) => s.firstName?.toLowerCase().includes(studentFilter.toLowerCase()) || s.lastName?.toLowerCase().includes(studentFilter.toLowerCase()) || s.studentInfo?.studentId?.toLowerCase().includes(studentFilter.toLowerCase())
        );

        const statusBodyTemplate = (rowData: Student) => <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;

        const nameBodyTemplate = (rowData: Student) => (
            <div className="flex align-items-center gap-2">
                <Avatar image={rowData.photoLink} icon={!rowData.photoLink ? 'pi pi-user' : undefined} shape="circle" size="normal" className="bg-primary-100" />
                <div>
                    <div className="font-semibold">
                        {rowData.firstName} {rowData.middleName} {rowData.lastName}
                    </div>
                    <div className="text-500 text-sm">{rowData.studentInfo?.studentId || 'N/A'}</div>
                </div>
            </div>
        );

        const classBodyTemplate = (rowData: Student) => <span>{rowData.studentInfo?.currentClass?.className || 'N/A'}</span>;

        const termBodyTemplate = (rowData: Student) => <Badge value={`Term ${rowData.studentInfo?.defaultAcademicTerm || 'N/A'}`} severity="info" />;

        const balanceBodyTemplate = (rowData: Student) => {
            const balance = (rowData.studentInfo?.accountBalance || 0) + (rowData.studentInfo?.balanceBroughtForward || 0);
            if (balance > 0) {
                return <span className="text-red-500 font-semibold">GHS {balance.toFixed(2)}</span>;
            }
            return <span className="text-green-500">Cleared</span>;
        };

        return (
            <div className="grid">
                <div className="col-12">
                    <h3 className="mb-2">Review & Select Students</h3>
                    <p className="text-600 mb-4">Review the list of students and select those to include in the {operationMode === 'class_promotion' ? 'promotion' : 'term update'}</p>
                </div>

                <div className="col-12 mb-3">
                    <div className="flex flex-wrap justify-content-between align-items-center gap-3">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)} placeholder="Search students..." />
                        </span>
                        <div className="flex gap-2 align-items-center">
                            <Chip label={`Total: ${students.length}`} icon="pi pi-users" />
                            <Chip label={`Selected: ${selectedStudents.length}`} icon="pi pi-check" className="bg-primary text-white" />
                        </div>
                    </div>
                </div>

                <div className="col-12">
                    <DataTable
                        value={filteredStudents}
                        selection={selectedStudents}
                        onSelectionChange={(e) => setSelectedStudents(e.value as Student[])}
                        selectionMode="checkbox"
                        dataKey="_id"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        loading={loadingStudents}
                        emptyMessage="No students found matching the criteria"
                        className="p-datatable-sm"
                    >
                        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
                        <Column body={nameBodyTemplate} header="Student" sortable sortField="firstName" />
                        <Column body={classBodyTemplate} header="Current Class" />
                        <Column body={termBodyTemplate} header="Term" />
                        <Column body={balanceBodyTemplate} header="Balance" />
                        <Column body={statusBodyTemplate} header="Status" />
                    </DataTable>
                </div>

                {selectedStudents.length === 0 && (
                    <div className="col-12 mt-3">
                        <Message severity="warn" text="Please select at least one student to proceed" className="w-full" />
                    </div>
                )}
            </div>
        );
    };

    const renderConfirmation = () => {
        const sourceClassName = classes.find((c) => c._id === sourceClass)?.className || 'N/A';
        const targetClassName = classes.find((c) => c._id === targetClass)?.className || sourceClassName;

        const warningsWithErrors = validationWarnings.filter((w) => w.severity === 'error');
        const warningsOnly = validationWarnings.filter((w) => w.severity === 'warn');

        return (
            <div className="grid">
                <div className="col-12">
                    <h3 className="mb-2">Confirm & Execute</h3>
                    <p className="text-600 mb-4">Review the operation summary before executing. This action will update student records.</p>
                </div>

                {/* Operation Summary */}
                <div className="col-12">
                    <Card title="Operation Summary" className="mb-3">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <h5 className="text-500 mb-2">FROM (Source)</h5>
                                <ul className="list-none p-0 m-0">
                                    <li className="mb-2">
                                        <i className="pi pi-users mr-2 text-primary"></i>Class: <strong>{sourceClassName}</strong>
                                    </li>
                                    <li className="mb-2">
                                        <i className="pi pi-calendar mr-2 text-primary"></i>Year: <strong>{sourceAcademicYear}</strong>
                                    </li>
                                    <li className="mb-2">
                                        <i className="pi pi-clock mr-2 text-primary"></i>Term: <strong>{sourceAcademicTerm}</strong>
                                    </li>
                                </ul>
                            </div>
                            <div className="col-12 md:col-6">
                                <h5 className="text-500 mb-2">TO (Target)</h5>
                                <ul className="list-none p-0 m-0">
                                    {operationMode === 'class_promotion' && (
                                        <>
                                            <li className="mb-2">
                                                <i className="pi pi-users mr-2 text-green-500"></i>Class: <strong>{targetClassName}</strong>
                                            </li>
                                            <li className="mb-2">
                                                <i className="pi pi-calendar mr-2 text-green-500"></i>Year: <strong>{targetAcademicYear}</strong>
                                            </li>
                                        </>
                                    )}
                                    <li className="mb-2">
                                        <i className="pi pi-clock mr-2 text-green-500"></i>Term: <strong>{targetAcademicTerm}</strong>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <Divider />
                        <div className="flex align-items-center gap-2">
                            <i className="pi pi-user text-2xl text-primary"></i>
                            <span className="text-xl">
                                <strong>{selectedStudents.length}</strong> students selected for {operationMode === 'class_promotion' ? 'promotion' : 'term update'}
                            </span>
                        </div>
                    </Card>
                </div>

                {/* Warnings Section */}
                {validationWarnings.length > 0 && (
                    <div className="col-12">
                        <Card
                            title={
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-exclamation-triangle text-yellow-500"></i>
                                    <span>Validation Warnings ({validationWarnings.length})</span>
                                </div>
                            }
                            className="mb-3 border-yellow-200"
                        >
                            {warningsWithErrors.length > 0 && <Message severity="error" className="w-full mb-3" text={`${warningsWithErrors.length} student(s) will be skipped due to blocking issues (e.g., already in target class/term)`} />}

                            {warningsOnly.length > 0 && <Message severity="warn" className="w-full mb-3" text={`${warningsOnly.length} student(s) have warnings (e.g., outstanding balances) but can still be processed`} />}

                            <Button label="View All Warnings" icon="pi pi-eye" className="p-button-outlined p-button-warning" onClick={() => setShowWarningsDialog(true)} />

                            <div className="mt-3">
                                <Checkbox inputId="ackWarnings" checked={acknowledgeWarnings} onChange={(e) => setAcknowledgeWarnings(e.checked || false)} disabled={validationWarnings.length === 0} />
                                <label htmlFor="ackWarnings" className="ml-2">
                                    I acknowledge these warnings and wish to proceed
                                </label>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Final Confirmation Message */}
                <div className="col-12">
                    <Message
                        severity="info"
                        className="w-full"
                        content={
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-info-circle text-xl"></i>
                                <span>
                                    This operation will update class history records for all selected students. Class history tracks academic progression and is used for financial calculations.
                                    <strong> This action cannot be undone automatically.</strong>
                                </span>
                            </div>
                        }
                    />
                </div>
            </div>
        );
    };

    // Render warnings dialog
    const renderWarningsDialog = () => (
        <Dialog header="Validation Warnings" visible={showWarningsDialog} style={{ width: '700px' }} onHide={() => setShowWarningsDialog(false)} modal>
            <DataTable value={validationWarnings} paginator rows={10} emptyMessage="No warnings">
                <Column field="studentId" header="Student ID" />
                <Column field="studentName" header="Name" />
                <Column
                    header="Warnings"
                    body={(rowData: ValidationWarning) => (
                        <div>
                            {rowData.warnings.map((w, i) => (
                                <Tag key={i} value={w} severity={rowData.severity === 'error' ? 'danger' : 'warning'} className="mr-1 mb-1" />
                            ))}
                        </div>
                    )}
                />
                <Column header="Action" body={(rowData: ValidationWarning) => <Tag value={rowData.severity === 'error' ? 'Will Skip' : 'Will Process'} severity={rowData.severity === 'error' ? 'danger' : 'info'} />} />
            </DataTable>
        </Dialog>
    );

    // Render result dialog
    const renderResultDialog = () => (
        <Dialog
            header={
                <div className="flex align-items-center gap-2">
                    <i className={`pi ${operationResult?.failed === 0 ? 'pi-check-circle text-green-500' : 'pi-exclamation-circle text-yellow-500'} text-2xl`}></i>
                    <span>Operation Complete</span>
                </div>
            }
            visible={showResultDialog}
            style={{ width: '700px' }}
            onHide={() => {
                setShowResultDialog(false);
                if (operationResult?.success && operationResult.success > 0) {
                    resetWizard();
                }
            }}
            modal
            footer={
                <div className="flex justify-content-end gap-2">
                    <Button
                        label="Close"
                        icon="pi pi-times"
                        className="p-button-text"
                        onClick={() => {
                            setShowResultDialog(false);
                            if (operationResult?.success && operationResult.success > 0) {
                                resetWizard();
                            }
                        }}
                    />
                    <Button label="Start New Operation" icon="pi pi-refresh" onClick={resetWizard} />
                </div>
            }
        >
            {operationResult && (
                <div className="grid">
                    <div className="col-12">
                        <div className="flex flex-wrap gap-3 justify-content-center mb-4">
                            <Card className="bg-green-50 text-center" style={{ minWidth: '150px' }}>
                                <div className="text-green-500 text-4xl font-bold">{operationResult.success}</div>
                                <div className="text-green-700">Successful</div>
                            </Card>
                            <Card className="bg-red-50 text-center" style={{ minWidth: '150px' }}>
                                <div className="text-red-500 text-4xl font-bold">{operationResult.failed}</div>
                                <div className="text-red-700">Failed</div>
                            </Card>
                            <Card className="bg-yellow-50 text-center" style={{ minWidth: '150px' }}>
                                <div className="text-yellow-500 text-4xl font-bold">{operationResult.skipped}</div>
                                <div className="text-yellow-700">Skipped</div>
                            </Card>
                        </div>
                    </div>

                    <div className="col-12">
                        <h5>Detailed Results</h5>
                        <DataTable value={operationResult.details} paginator rows={5} emptyMessage="No details" className="p-datatable-sm">
                            <Column field="studentId" header="Student ID" />
                            <Column field="studentName" header="Name" />
                            <Column
                                header="Status"
                                body={(rowData) => <Tag value={rowData.status.charAt(0).toUpperCase() + rowData.status.slice(1)} severity={rowData.status === 'success' ? 'success' : rowData.status === 'failed' ? 'danger' : 'warning'} />}
                            />
                            <Column field="message" header="Message" />
                        </DataTable>
                    </div>
                </div>
            )}
        </Dialog>
    );

    // Access denied render
    if (!hasAccess) {
        return (
            <Card className="text-center">
                <i className="pi pi-lock text-6xl text-red-500 mb-3"></i>
                <h3>Access Denied</h3>
                <p className="text-600">You do not have permission to access bulk academic operations. This feature is restricted to authorized administrators only.</p>
            </Card>
        );
    }

    return (
        <div className="bulk-academic-operations">
            <Toast ref={toast} />
            <ConfirmDialog />
            {renderWarningsDialog()}
            {renderResultDialog()}

            {/* Header */}
            <div className="flex flex-wrap justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="m-0 mb-1">Bulk Academic Operations</h2>
                    <p className="text-600 m-0">Manage class promotions and academic term updates for multiple students</p>
                </div>
                <Button label="Reset" icon="pi pi-refresh" className="p-button-outlined" onClick={resetWizard} disabled={isProcessing} />
            </div>

            {/* Wizard Steps */}
            <Card className="mb-4">
                <Steps model={WIZARD_STEPS} activeIndex={activeStep} readOnly className="mb-4" />

                {/* Processing Progress */}
                {isProcessing && (
                    <div className="mb-4">
                        <Message severity="info" text="Processing students... Please do not close this page." className="w-full mb-2" />
                        <ProgressBar value={processingProgress} showValue />
                    </div>
                )}

                {/* Step Content */}
                <div className="step-content py-4">
                    {activeStep === 0 && renderModeSelection()}
                    {activeStep === 1 && renderSourceCriteria()}
                    {activeStep === 2 && renderTargetAssignment()}
                    {activeStep === 3 && renderStudentPreview()}
                    {activeStep === 4 && renderConfirmation()}
                </div>

                <Divider />

                {/* Navigation Buttons */}
                <div className="flex justify-content-between">
                    <Button label="Previous" icon="pi pi-arrow-left" className="p-button-outlined" onClick={handlePreviousStep} disabled={activeStep === 0 || isProcessing} />

                    {activeStep < 4 ? (
                        <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={handleNextStep} disabled={!canProceedToNextStep() || isProcessing} loading={loadingStudents} />
                    ) : (
                        <Button
                            label={`Execute ${operationMode === 'class_promotion' ? 'Promotion' : 'Term Update'}`}
                            icon="pi pi-check"
                            severity="success"
                            onClick={() => {
                                confirmDialog({
                                    message: `Are you sure you want to ${operationMode === 'class_promotion' ? 'promote' : 'update term for'} ${selectedStudents.length} student(s)? This action will modify their academic records.`,
                                    header: 'Confirm Operation',
                                    icon: 'pi pi-exclamation-triangle',
                                    acceptClassName: 'p-button-success',
                                    accept: executeOperation
                                });
                            }}
                            disabled={!canProceedToNextStep() || isProcessing}
                            loading={isProcessing}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
}
