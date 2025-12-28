'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import { AutoComplete } from 'primereact/autocomplete';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { PaymentFormData, Student, StudentBalance } from '@/types/payment';
import { PaymentMethod, PaymentStatus } from '@/models/FeesPayment';
import LocalDBService from '@/lib/services/localDBService';

interface FeesPaymentRecordingProps {
    visible: boolean;
    onHide: () => void;
    prefilledStudentId?: string;
    onPaymentRecorded?: (receiptNumber: string) => void;
    editMode?: boolean;
    paymentId?: string;
}

interface School {
    _id: string;
    name: string;
}

interface Site {
    _id: string;
    description: string;
}

interface Class {
    _id: string;
    className: string;
}

export const FeesPaymentRecording: React.FC<FeesPaymentRecordingProps> = ({ visible, onHide, prefilledStudentId, onPaymentRecorded, editMode = false, paymentId }) => {
    // Payment being edited (for display only)
    const [editingPayment, setEditingPayment] = useState<any>(null);

    // Context selection states
    const [schools, setSchools] = useState<School[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    const [selectedSchool, setSelectedSchool] = useState<string>('');
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentSearchText, setStudentSearchText] = useState<string>('');
    const [studentBalance, setStudentBalance] = useState<StudentBalance | null>(null);

    // Payment form states
    const [formData, setFormData] = useState<Partial<PaymentFormData>>({
        currency: 'GHS',
        status: 'confirmed',
        datePaid: new Date(),
        academicYear: '2024/2025',
        academicTerm: 1,
        paymentMethod: 'cash'
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedReceipt, setGeneratedReceipt] = useState<string>('');

    const toast = React.useRef<Toast>(null);

    const academicYears = ['2025/2026', '2024/2025', '2023/2024'];
    const academicTerms = [
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    const currencies = ['GHS', 'USD', 'EUR', 'GBP'];

    const paymentMethods: { label: string; value: PaymentMethod; icon: string; requiresReference: boolean }[] = [
        { label: 'Cash', value: 'cash', icon: '💵', requiresReference: false },
        { label: 'Mobile Money', value: 'mobile_money', icon: '📱', requiresReference: true },
        { label: 'Bank Transfer', value: 'bank_transfer', icon: '🏦', requiresReference: true },
        { label: 'Card', value: 'card', icon: '💳', requiresReference: true },
        { label: 'Cheque', value: 'cheque', icon: '📝', requiresReference: true },
        { label: 'Online', value: 'online', icon: '🌐', requiresReference: true },
        { label: 'Scholarship', value: 'scholarship', icon: '🎓', requiresReference: false }
    ];

    // Load initial data
    useEffect(() => {
        if (visible) {
            if (editMode && paymentId) {
                loadPaymentForEdit(paymentId);
            } else {
                loadSchools();
                if (prefilledStudentId) {
                    loadStudentData(prefilledStudentId);
                }
            }
        }
    }, [visible, editMode, paymentId, prefilledStudentId]);

    // Load cascading data
    useEffect(() => {
        if (selectedSchool) {
            loadSites(selectedSchool);
            setSites([]);
            setClasses([]);
            setStudents([]);
            setSelectedSite('');
            setSelectedClass('');
            setSelectedStudent(null);
        }
    }, [selectedSchool]);

    useEffect(() => {
        if (selectedSite) {
            loadClasses(selectedSite);
            setClasses([]);
            setStudents([]);
            setSelectedClass('');
            setSelectedStudent(null);
        }
    }, [selectedSite]);

    useEffect(() => {
        if (selectedClass) {
            loadStudents(selectedClass);
            setStudents([]);
            setSelectedStudent(null);
        }
    }, [selectedClass]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!visible) {
            setTimeout(() => {
                resetForm();
            }, 300);
        }
    }, [visible]);

    const resetForm = () => {
        setSelectedSchool('');
        setSelectedSite('');
        setSelectedClass('');
        setSelectedStudent(null);
        setStudentBalance(null);
        setFormData({
            currency: 'GHS',
            status: 'confirmed',
            datePaid: new Date(),
            academicYear: '2024/2025',
            academicTerm: 1,
            paymentMethod: 'cash'
        });
        setErrors({});
        setShowSuccess(false);
        setGeneratedReceipt('');
    };

    const loadSchools = async () => {
        try {
            const response = await fetch('/api/school');
            const data = await response.json();
            setSchools(Array.isArray(data) ? data : [data]);
        } catch (error) {
            console.error('Error loading schools:', error);
        }
    };

    const loadSites = async (schoolId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/sites?school=${schoolId}`);
            const data = await response.json();
            setSites(data.sites || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadClasses = async (siteId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/classes?site=${siteId}`);
            const data = await response.json();
            setClasses(data.classes || []);
        } catch (error) {
            console.error('Error loading classes:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async (classId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/students?class=${classId}`);
            const data = await response.json();
            setStudents(data || []);
        } catch (error) {
            console.error('Error loading students:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStudentBalance = async (studentId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/students/${studentId}/balance?year=${formData.academicYear}&term=${formData.academicTerm}`);
            if (!response.ok) throw new Error('Failed to load balance');
            const data = await response.json();
            setStudentBalance(data.balance);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load student balance',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const loadStudentData = async (studentId: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/students/${studentId}/balance`);
            const data = await response.json();
            setSelectedStudent(data.student);
            setStudentBalance(data.balance);
            setFormData((prev) => ({
                ...prev,
                studentId: data.student._id,
                siteId: data.student.schoolSite?._id,
                classId: data.student.currentClass?._id
            }));
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load student data',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentForEdit = async (id: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/fees-payments?page=0&limit=1000`);
            const data = await response.json();

            const payment = data.payments?.find((p: any) => p._id === id);

            if (payment) {
                // Store the full payment for display
                setEditingPayment(payment);

                // Only set the editable fields in formData
                setFormData({
                    amountPaid: payment.amountPaid,
                    paymentMethod: payment.paymentMethod,
                    datePaid: new Date(payment.datePaid),
                    currency: payment.currency || 'GHS',
                    paymentReference: payment.paymentReference,
                    transactionId: payment.transactionId,
                    description: payment.description,
                    notes: payment.notes,
                    status: payment.status
                });
            } else {
                throw new Error('Payment not found');
            }
        } catch (error) {
            console.error('Error loading payment:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load payment details',
                life: 3000
            });
            onHide();
        } finally {
            setLoading(false);
        }
    };

    const searchStudents = (event: { query: string }) => {
        const query = event.query.toLowerCase();
        const filtered = students.filter((student) => {
            const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
            const studentId = student.studentInfo?.studentId?.toLowerCase() || '';
            return fullName.includes(query) || studentId.includes(query);
        });
        setFilteredStudents(filtered);
    };

    const handleStudentSelect = async (student: Student) => {
        setSelectedStudent(student);
        setStudentSearchText('');
        setFormData((prev) => ({
            ...prev,
            studentId: student._id,
            siteId: selectedSite,
            classId: selectedClass
        }));
        await loadStudentBalance(student._id);
    };

    const studentItemTemplate = (student: Student) => {
        return (
            <div className="flex align-items-center gap-3 py-2">
                <div className="flex align-items-center justify-content-center border-circle bg-primary" style={{ width: '40px', height: '40px', color: 'white', fontWeight: 'bold' }}>
                    {student.firstName.charAt(0)}
                    {student.lastName.charAt(0)}
                </div>
                <div className="flex-1">
                    <div className="font-semibold">
                        {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-600">ID: {student.studentInfo?.studentId || 'N/A'}</div>
                </div>
            </div>
        );
    };

    const requiresReference = () => {
        const method = paymentMethods.find((m) => m.value === formData.paymentMethod);
        return method?.requiresReference || false;
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!selectedStudent) newErrors.student = 'Select a student';
        if (!formData.academicYear) newErrors.academicYear = 'Select academic year';
        if (!formData.academicTerm) newErrors.academicTerm = 'Select term';
        if (!formData.amountPaid || formData.amountPaid <= 0) newErrors.amountPaid = 'Enter valid amount';
        if (!formData.paymentMethod) newErrors.paymentMethod = 'Select payment method';
        if (requiresReference() && !formData.paymentReference) {
            newErrors.paymentReference = 'Transaction reference required';
        }
        if (!formData.datePaid) newErrors.datePaid = 'Payment date required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkStudentScholarship = async (studentId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/scholarships?student=${studentId}&status=active`);
            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.scholarships && data.scholarships.length > 0;
        } catch (error) {
            console.error('Error checking scholarship:', error);
            return false;
        }
    };

    const handleSubmit = async () => {
        // Simplified validation for edit mode
        if (editMode) {
            if (!formData.amountPaid || formData.amountPaid <= 0) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Please enter a valid amount',
                    life: 3000
                });
                return;
            }
            if (!formData.paymentMethod) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Please select a payment method',
                    life: 3000
                });
                return;
            }
            if (!formData.datePaid) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Please select a payment date',
                    life: 3000
                });
                return;
            }
            if (requiresReference() && !formData.paymentReference) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Transaction reference required for this payment method',
                    life: 3000
                });
                return;
            }
        } else {
            if (!validateForm()) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Please fill all required fields',
                    life: 3000
                });
                return;
            }
        }

        // Check if student has active scholarship when payment method is scholarship
        if (formData.paymentMethod === 'scholarship' && !editMode) {
            const hasScholarship = await checkStudentScholarship(formData.studentId);
            if (!hasScholarship) {
                toast.current?.show({
                    severity: 'error',
                    summary: 'No Active Scholarship',
                    detail: 'This student does not have an active scholarship. Please select a different payment method or create a scholarship for this student first.',
                    life: 5000
                });
                return;
            }
        }

        try {
            setLoading(true);

            // Get auth token
            const authToken = await LocalDBService.getLocalDataItem('authToken');

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            // Prepare data based on mode
            const submitData = editMode
                ? {
                      amountPaid: formData.amountPaid,
                      paymentMethod: formData.paymentMethod,
                      datePaid: formData.datePaid,
                      paymentReference: formData.paymentReference,
                      transactionId: formData.transactionId,
                      description: formData.description,
                      notes: formData.notes
                  }
                : formData;

            const url = editMode ? `/api/fees-payments?id=${paymentId}` : '/api/fees-payments';
            const method = editMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(submitData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'record'} payment`);
            }

            const result = await response.json();

            if (editMode) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Payment updated successfully',
                    life: 3000
                });

                if (onPaymentRecorded) {
                    onPaymentRecorded(result.receiptNumber || editingPayment?.receiptNumber);
                }

                // Close immediately for edit mode
                setTimeout(() => {
                    resetForm();
                    onHide();
                }, 1000);
            } else {
                setGeneratedReceipt(result.receiptNumber);
                setShowSuccess(true);

                if (onPaymentRecorded) {
                    onPaymentRecorded(result.receiptNumber);
                }

                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: `Payment recorded successfully. Receipt #${result.receiptNumber}`,
                    life: 5000
                });

                // Reset form after 2 seconds
                setTimeout(() => {
                    resetForm();
                    onHide();
                }, 2000);
            }
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error instanceof Error ? error.message : 'Failed to record payment',
                life: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Toast ref={toast} />
            <Dialog
                visible={visible}
                onHide={onHide}
                header={showSuccess ? '✅ Payment Recorded Successfully' : editMode ? 'Edit Payment Details' : 'Record Fee Payment'}
                style={{ width: editMode ? '600px' : '95vw', maxWidth: editMode ? '600px' : '1400px', maxHeight: '95vh' }}
                modal
                closable={!loading}
                blockScroll
                draggable={false}
                className="payment-recording-dialog"
                contentClassName="overflow-y-auto"
            >
                {showSuccess ? (
                    <div className="text-center py-6">
                        <i className="pi pi-check-circle text-green-500" style={{ fontSize: '4rem' }}></i>
                        <h2 className="mt-3 text-2xl">Payment Recorded!</h2>
                        <p className="text-600 mt-2">
                            Receipt Number: <strong>{generatedReceipt}</strong>
                        </p>
                    </div>
                ) : editMode && editingPayment ? (
                    /* Simplified Edit Mode UI */
                    <div>
                        {/* Payment Info (Read-only) */}
                        <Card className="mb-3 bg-blue-50">
                            <div className="flex flex-column gap-2 text-sm">
                                <div className="flex justify-content-between">
                                    <span className="font-semibold">Receipt #:</span>
                                    <span>{editingPayment.receiptNumber}</span>
                                </div>
                                <div className="flex justify-content-between">
                                    <span className="font-semibold">Student:</span>
                                    <span>
                                        {editingPayment.student?.firstName} {editingPayment.student?.lastName}
                                    </span>
                                </div>
                                <div className="flex justify-content-between">
                                    <span className="font-semibold">Academic Year/Term:</span>
                                    <span>
                                        {editingPayment.academicYear} - Term {editingPayment.academicTerm}
                                    </span>
                                </div>
                                <div className="flex justify-content-between">
                                    <span className="font-semibold">Original Amount:</span>
                                    <span className="text-600">
                                        {editingPayment.currency} {editingPayment.amountPaid?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Editable Fields */}
                        <div className="flex flex-column gap-3">
                            <div>
                                <label htmlFor="edit-amount" className="block mb-2 font-medium">
                                    Amount Paid <span className="text-red-500">*</span>
                                </label>
                                <InputNumber
                                    id="edit-amount"
                                    value={formData.amountPaid}
                                    onValueChange={(e) => setFormData({ ...formData, amountPaid: e.value || 0 })}
                                    mode="currency"
                                    currency={formData.currency}
                                    locale="en-GH"
                                    minFractionDigits={2}
                                    className="w-full"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="edit-method" className="block mb-2 font-medium">
                                    Payment Method <span className="text-red-500">*</span>
                                </label>
                                <div className="grid">
                                    {paymentMethods.map((method) => (
                                        <div key={method.value} className="col-4">
                                            <div
                                                onClick={() => !loading && setFormData({ ...formData, paymentMethod: method.value })}
                                                className={`p-2 border-1 border-round cursor-pointer transition-colors ${formData.paymentMethod === method.value ? 'border-primary bg-primary-50' : 'border-300 hover:border-400'} ${
                                                    loading ? 'opacity-50 cursor-not-allowed' : ''
                                                }`}
                                            >
                                                <div className="text-lg mb-1">{method.icon}</div>
                                                <div className="font-medium text-xs">{method.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {requiresReference() && (
                                <div>
                                    <label htmlFor="edit-reference" className="block mb-2 font-medium">
                                        Transaction Reference <span className="text-red-500">*</span>
                                    </label>
                                    <InputText
                                        id="edit-reference"
                                        value={formData.paymentReference || ''}
                                        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                                        placeholder="Enter transaction reference"
                                        className="w-full"
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            <div>
                                <label htmlFor="edit-date" className="block mb-2 font-medium">
                                    Payment Date <span className="text-red-500">*</span>
                                </label>
                                <Calendar id="edit-date" value={formData.datePaid} onChange={(e) => setFormData({ ...formData, datePaid: e.value as Date })} showIcon dateFormat="dd/mm/yy" maxDate={new Date()} className="w-full" disabled={loading} />
                            </div>

                            <div>
                                <label htmlFor="edit-description" className="block mb-2 font-medium">
                                    Description
                                </label>
                                <InputText
                                    id="edit-description"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                    className="w-full"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label htmlFor="edit-notes" className="block mb-2 font-medium">
                                    Notes
                                </label>
                                <InputTextarea id="edit-notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Optional notes" className="w-full" disabled={loading} />
                            </div>

                            <div className="flex justify-content-end gap-2 pt-3">
                                <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={onHide} disabled={loading} />
                                <Button label="Update Payment" icon="pi pi-check" onClick={handleSubmit} loading={loading} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid">
                        {/* Left Column - Student Selection & Context */}
                        <div className="col-12 lg:col-4">
                            <Card title="Student & Academic Context" className="h-full">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label htmlFor="school" className="block mb-2 font-medium text-sm">
                                            School <span className="text-red-500">*</span>
                                        </label>
                                        <Dropdown
                                            id="school"
                                            value={selectedSchool}
                                            options={schools.map((s) => ({ label: s.name, value: s._id }))}
                                            onChange={(e) => setSelectedSchool(e.value)}
                                            placeholder="Select school"
                                            className="w-full"
                                            disabled={loading}
                                            filter
                                            showClear
                                        />
                                    </div>

                                    <div className="grid">
                                        <div className="col-6">
                                            <label htmlFor="academicYear" className="block mb-2 font-medium text-sm">
                                                Academic Year <span className="text-red-500">*</span>
                                            </label>
                                            <Dropdown
                                                id="academicYear"
                                                value={formData.academicYear}
                                                options={academicYears.map((y) => ({ label: y, value: y }))}
                                                onChange={(e) => setFormData({ ...formData, academicYear: e.value })}
                                                placeholder="Select year"
                                                className={`w-full ${errors.academicYear ? 'p-invalid' : ''}`}
                                                disabled={loading}
                                            />
                                            {errors.academicYear && <small className="p-error">{errors.academicYear}</small>}
                                        </div>
                                        <div className="col-6">
                                            <label htmlFor="academicTerm" className="block mb-2 font-medium text-sm">
                                                Term <span className="text-red-500">*</span>
                                            </label>
                                            <Dropdown
                                                id="academicTerm"
                                                value={formData.academicTerm}
                                                options={academicTerms}
                                                onChange={(e) => setFormData({ ...formData, academicTerm: e.value })}
                                                placeholder="Select term"
                                                className={`w-full ${errors.academicTerm ? 'p-invalid' : ''}`}
                                                disabled={loading}
                                            />
                                            {errors.academicTerm && <small className="p-error">{errors.academicTerm}</small>}
                                        </div>
                                    </div>

                                    <Divider />

                                    <div>
                                        <label htmlFor="site" className="block mb-2 font-medium text-sm">
                                            Site <span className="text-red-500">*</span>
                                        </label>
                                        <Dropdown
                                            id="site"
                                            value={selectedSite}
                                            options={sites.map((s) => ({ label: s.description, value: s._id }))}
                                            onChange={(e) => setSelectedSite(e.value)}
                                            placeholder={selectedSchool ? 'Select site' : 'Select school first'}
                                            className="w-full"
                                            disabled={!selectedSchool || loading}
                                            filter
                                            showClear
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="class" className="block mb-2 font-medium text-sm">
                                            Class <span className="text-red-500">*</span>
                                        </label>
                                        <Dropdown
                                            id="class"
                                            value={selectedClass}
                                            options={classes.map((c) => ({ label: c.className, value: c._id }))}
                                            onChange={(e) => setSelectedClass(e.value)}
                                            placeholder={selectedSite ? 'Select class' : 'Select site first'}
                                            className="w-full"
                                            disabled={!selectedSite || loading}
                                            filter
                                            showClear
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="student" className="block mb-2 font-medium text-sm">
                                            Student <span className="text-red-500">*</span>
                                        </label>
                                        <AutoComplete
                                            id="student"
                                            value={selectedStudent || studentSearchText}
                                            suggestions={filteredStudents}
                                            completeMethod={searchStudents}
                                            field="firstName"
                                            onChange={(e) => {
                                                if (typeof e.value === 'object' && e.value !== null) {
                                                    handleStudentSelect(e.value);
                                                } else {
                                                    setStudentSearchText(e.value);
                                                    setSelectedStudent(null);
                                                }
                                            }}
                                            itemTemplate={studentItemTemplate}
                                            placeholder={selectedClass ? 'Search student...' : 'Select class first'}
                                            className={`w-full ${errors.student ? 'p-invalid' : ''}`}
                                            disabled={!selectedClass || loading}
                                            dropdown
                                        />
                                        {errors.student && <small className="p-error">{errors.student}</small>}
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Middle Column - Payment Details */}
                        <div className="col-12 lg:col-5">
                            <Card title="Payment Details" className="h-full">
                                <div className="flex flex-column gap-3">
                                    <div>
                                        <label htmlFor="amountPaid" className="block mb-2 font-medium text-sm">
                                            Amount Paid <span className="text-red-500">*</span>
                                        </label>
                                        <InputNumber
                                            id="amountPaid"
                                            value={formData.amountPaid}
                                            onValueChange={(e) => setFormData({ ...formData, amountPaid: e.value || 0 })}
                                            mode="currency"
                                            currency={formData.currency}
                                            locale="en-US"
                                            minFractionDigits={2}
                                            className={`w-full ${errors.amountPaid ? 'p-invalid' : ''}`}
                                            disabled={loading}
                                            placeholder="0.00"
                                        />
                                        {errors.amountPaid && <small className="p-error">{errors.amountPaid}</small>}
                                        {studentBalance && formData.amountPaid && formData.amountPaid > studentBalance.outstandingBalance && (
                                            <Message severity="warn" text={`Overpayment: ${formData.currency} ${(formData.amountPaid - studentBalance.outstandingBalance).toLocaleString()}`} className="mt-2" />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block mb-2 font-medium text-sm">
                                            Payment Method <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid">
                                            {paymentMethods.map((method) => (
                                                <div key={method.value} className="col-4">
                                                    <div
                                                        className={`px-2 py-1 border-1 border-round cursor-pointer transition-all hover:border-primary ${formData.paymentMethod === method.value ? 'border-primary bg-primary-50' : 'border-300'}`}
                                                        onClick={() => setFormData({ ...formData, paymentMethod: method.value })}
                                                    >
                                                        <div className="flex align-items-center gap-1">
                                                            <span className="text-base">{method.icon}</span>
                                                            <span className="text-xs font-medium">{method.label}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.paymentMethod && <small className="p-error">{errors.paymentMethod}</small>}
                                    </div>

                                    {requiresReference() && (
                                        <div>
                                            <label htmlFor="paymentReference" className="block mb-2 font-medium text-sm">
                                                Transaction Reference <span className="text-red-500">*</span>
                                            </label>
                                            <InputText
                                                id="paymentReference"
                                                value={formData.paymentReference || ''}
                                                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                                                placeholder="Enter transaction reference"
                                                className={`w-full ${errors.paymentReference ? 'p-invalid' : ''}`}
                                                disabled={loading}
                                            />
                                            {errors.paymentReference && <small className="p-error">{errors.paymentReference}</small>}
                                        </div>
                                    )}

                                    <div className="grid">
                                        <div className="col-6">
                                            <label htmlFor="datePaid" className="block mb-2 font-medium text-sm">
                                                Payment Date <span className="text-red-500">*</span>
                                            </label>
                                            <Calendar
                                                id="datePaid"
                                                value={formData.datePaid}
                                                onChange={(e) => setFormData({ ...formData, datePaid: e.value as Date })}
                                                showIcon
                                                dateFormat="dd/mm/yy"
                                                maxDate={new Date()}
                                                className={`w-full ${errors.datePaid ? 'p-invalid' : ''}`}
                                                disabled={loading}
                                            />
                                            {errors.datePaid && <small className="p-error">{errors.datePaid}</small>}
                                        </div>
                                        <div className="col-6">
                                            <label htmlFor="currency" className="block mb-2 font-medium text-sm">
                                                Currency
                                            </label>
                                            <Dropdown
                                                id="currency"
                                                value={formData.currency}
                                                options={currencies.map((c) => ({ label: c, value: c }))}
                                                onChange={(e) => setFormData({ ...formData, currency: e.value })}
                                                className="w-full"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="description" className="block mb-2 font-medium text-sm">
                                            Description
                                        </label>
                                        <InputText
                                            id="description"
                                            value={formData.description || ''}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="e.g., School fees Term 1"
                                            className="w-full"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="notes" className="block mb-2 font-medium text-sm">
                                            Additional Notes
                                        </label>
                                        <InputTextarea id="notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Optional notes..." className="w-full" disabled={loading} />
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column - Summary & Actions */}
                        <div className="col-12 lg:col-3">
                            <Card title="Summary" className="mb-3">
                                {selectedStudent ? (
                                    <div className="flex flex-column gap-2">
                                        <div className="text-center mb-2">
                                            <div className="mx-auto flex align-items-center justify-content-center border-circle bg-primary" style={{ width: '60px', height: '60px', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                                                {selectedStudent.firstName.charAt(0)}
                                                {selectedStudent.lastName.charAt(0)}
                                            </div>
                                            <div className="font-bold mt-2">
                                                {selectedStudent.firstName} {selectedStudent.lastName}
                                            </div>
                                            <div className="text-sm text-600">ID: {selectedStudent.studentInfo?.studentId}</div>
                                        </div>
                                        <Divider className="my-2" />
                                        <div className="text-sm">
                                            <div className="flex justify-content-between mb-1">
                                                <span className="text-600">Year:</span>
                                                <span className="font-medium">{formData.academicYear}</span>
                                            </div>
                                            <div className="flex justify-content-between mb-1">
                                                <span className="text-600">Term:</span>
                                                <span className="font-medium">Term {formData.academicTerm}</span>
                                            </div>
                                            {studentBalance && (
                                                <>
                                                    <Divider className="my-2" />
                                                    <div className="flex justify-content-between mb-1">
                                                        <span className="text-600 text-xs">Total Fees (Current):</span>
                                                        <span className="font-medium text-sm">
                                                            {studentBalance.currency} {studentBalance.totalFeesForPeriod.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-content-between mb-1">
                                                        <span className="text-600 text-xs">Already Paid (Current):</span>
                                                        <span className="text-green-600 text-sm">
                                                            {studentBalance.currency} {studentBalance.totalPaid.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-content-between mb-2">
                                                        <span className="font-medium text-xs">Current Outstanding:</span>
                                                        <span className="font-bold text-orange-500 text-sm">
                                                            {studentBalance.currency} {studentBalance.outstandingBalance.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {studentBalance.previousArrears > 0 && (
                                                        <>
                                                            <div className="flex justify-content-between mb-2">
                                                                <span className="font-medium text-xs text-red-600">Previous Arrears:</span>
                                                                <span className="font-bold text-red-600 text-sm">
                                                                    {studentBalance.currency} {studentBalance.previousArrears.toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <Divider className="my-1" />
                                                        </>
                                                    )}
                                                    <div className="flex justify-content-between mb-2">
                                                        <span className="font-bold">Total Due:</span>
                                                        <span className="font-bold text-red-500 text-lg">
                                                            {studentBalance.currency} {studentBalance.totalOutstanding.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                            {formData.amountPaid && (
                                                <>
                                                    <Divider className="my-2" />
                                                    <div className="flex justify-content-between mb-1">
                                                        <span className="text-600">Paying Now:</span>
                                                        <span className="font-bold text-green-600">
                                                            {formData.currency} {formData.amountPaid.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    {studentBalance && (
                                                        <div className="flex justify-content-between">
                                                            <span className="text-600">New Total Due:</span>
                                                            <span className="font-bold">
                                                                {formData.currency} {Math.max(0, studentBalance.totalOutstanding - formData.amountPaid).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-600 py-4">
                                        <i className="pi pi-info-circle text-4xl mb-3"></i>
                                        <p className="text-sm">Select a student to continue</p>
                                    </div>
                                )}
                            </Card>

                            <div className="flex flex-column gap-2">
                                <Button label="Record Payment" icon="pi pi-check" onClick={handleSubmit} disabled={loading || !selectedStudent} loading={loading} className="w-full" severity="success" />
                                <Button label="Clear Form" icon="pi pi-times" onClick={resetForm} disabled={loading} className="w-full" outlined />
                            </div>
                        </div>
                    </div>
                )}
            </Dialog>

            <style jsx global>{`
                .payment-recording-dialog .p-dialog-content {
                    padding: 1.5rem;
                }

                .payment-recording-dialog .p-card {
                    box-shadow: none;
                    border: 1px solid var(--surface-border);
                }

                .payment-recording-dialog .p-card-title {
                    font-size: 1rem;
                    font-weight: 600;
                    padding-bottom: 0.5rem;
                }

                .payment-recording-dialog .p-card-body {
                    padding: 1rem;
                }

                @media (max-width: 992px) {
                    .payment-recording-dialog {
                        width: 100vw !important;
                        height: 100vh !important;
                        max-width: 100vw !important;
                        max-height: 100vh !important;
                        margin: 0;
                    }

                    .payment-recording-dialog .p-dialog-content {
                        padding: 1rem;
                        max-height: calc(100vh - 120px);
                    }
                }
            `}</style>
        </>
    );
};
