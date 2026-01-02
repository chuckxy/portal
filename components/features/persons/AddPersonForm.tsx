'use client';

import React, { useState, useEffect } from 'react';
import { Steps } from 'primereact/steps';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FileUpload } from 'primereact/fileupload';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { MultiSelect } from 'primereact/multiselect';
import { Chips } from 'primereact/chips';
import { Password } from 'primereact/password';
import { RadioButton } from 'primereact/radiobutton';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Panel } from 'primereact/panel';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { ProgressBar } from 'primereact/progressbar';
import { Avatar } from 'primereact/avatar';
import { useAuth } from '@/context/AuthContext';

type Gender = 'male' | 'female' | 'other';
type PersonCategory = 'proprietor' | 'headmaster' | 'teacher' | 'finance' | 'student' | 'parent' | 'librarian' | 'admin';
type AddressType = 'residential' | 'postal' | 'work' | 'temporary';
type AddressStatus = 'Active' | 'Inactive';
type WorkDepartment = 'academic' | 'administrative' | 'support';
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
type QualificationType = 'certificate' | 'diploma' | 'degree' | 'masters' | 'phd' | 'other';
type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
type DocumentType = 'passport' | 'national_id' | 'voters_id' | 'birth_certificate' | 'driver_license' | 'other';
type GuardianRelationship = 'parent' | 'uncle' | 'aunt' | 'grandparent' | 'sibling' | 'other';

interface PersonFormData {
    // Basic Information
    firstName: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    photoLink?: string;

    // Contact Information
    contact: {
        mobilePhone?: string;
        homePhone?: string;
        email?: string;
        primaryLanguage?: string;
        secondaryLanguage?: string;
    };

    // Address Information
    addresses: Array<{
        addressId?: string;
        addressType?: AddressType;
        dateFrom: Date;
        dateTo?: Date;
        status: AddressStatus;
    }>;
    currentAddress?: string;

    // Account & Authentication
    username: string;
    password: string;
    confirmPassword?: string;
    isActive: boolean;
    personCategory: PersonCategory;
    school: string;
    schoolSite: string;

    // Student Information
    studentInfo?: {
        studentId?: string;
        dateJoined?: Date;
        faculty?: string;
        department?: string;
        guardian?: string;
        guardianRelationship?: GuardianRelationship;
        house?: string;
        dormitory?: string;
        room?: string;
        previousSchool?: string;
        defaultClass?: string;
        currentClass?: string;
        defaultAcademicTerm?: number;
        defaultAcademicYear?: string;
        subjects?: string[];
    };

    // Employee Information
    employeeInfo?: {
        customId?: string;
        workDepartment?: WorkDepartment;
        teachingDepartment?: string;
        jobTitle?: string;
        maritalStatus?: MaritalStatus;
        dateJoined?: Date;
        dateLeft?: Date;
        faculty?: string;
        tinNumber?: string;
        ssnitNumber?: string;
        bankInfo?: {
            bank?: string;
            accountName?: string;
            accountNumber?: string;
            branch?: string;
        };
        qualifications?: Array<{
            type: QualificationType;
            title?: string;
            institution?: string;
            dateObtained?: Date;
            documentPath?: string;
        }>;
        subjects?: string[];
        payroll?: {
            basicSalary: number;
            instruments?: Array<{
                instrumentType: 'earning' | 'deduction';
                description: string;
                amount: number;
                isActive: boolean;
            }>;
        };
    };

    // Medical Information
    medicalInfo: {
        bloodGroup?: BloodGroup;
        allergies?: string[];
        chronicConditions?: string[];
        medications?: Array<{
            name?: string;
            dosage?: string;
            frequency?: string;
        }>;
        emergencyContact?: {
            name?: string;
            relationship?: string;
            phone?: string;
            alternatePhone?: string;
        };
    };

    // Official Documents
    officialDocuments?: Array<{
        documentType: DocumentType;
        documentId: string;
        nameOnDocument?: string;
        issuingCountry?: string;
        issuedDate?: Date;
        expiryDate?: Date;
        scannedCopyLink?: string;
    }>;
}

interface DropdownOption {
    label: string;
    value: string;
}

interface AddPersonFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
    editData?: any;
}

const AddPersonForm: React.FC<AddPersonFormProps> = ({ onSuccess, onCancel, editData }) => {
    const { user } = useAuth();
    const toastRef = React.useRef<Toast>(null);

    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<PersonFormData>(getEmptyForm());
    const [photoPreview, setPhotoPreview] = useState<string>('');
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isDraft, setIsDraft] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Dropdown options
    const [faculties, setFaculties] = useState<DropdownOption[]>([]);
    const [departments, setDepartments] = useState<DropdownOption[]>([]);
    const [classes, setClasses] = useState<DropdownOption[]>([]);
    const [subjects, setSubjects] = useState<DropdownOption[]>([]);
    const [guardians, setGuardians] = useState<DropdownOption[]>([]);
    const [banks, setBanks] = useState<DropdownOption[]>([]);
    const [addresses, setAddresses] = useState<DropdownOption[]>([]);

    const categoryOptions = [
        { label: 'Proprietor', value: 'proprietor' },
        { label: 'Headmaster', value: 'headmaster' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Finance Officer', value: 'finance' },
        { label: 'Student', value: 'student' },
        { label: 'Parent', value: 'parent' },
        { label: 'Librarian', value: 'librarian' },
        { label: 'Administrator', value: 'admin' }
    ];

    const genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' }
    ];

    const bloodGroupOptions = [
        { label: 'A+', value: 'A+' },
        { label: 'A-', value: 'A-' },
        { label: 'B+', value: 'B+' },
        { label: 'B-', value: 'B-' },
        { label: 'AB+', value: 'AB+' },
        { label: 'AB-', value: 'AB-' },
        { label: 'O+', value: 'O+' },
        { label: 'O-', value: 'O-' }
    ];

    const steps = [{ label: 'Basic Info' }, { label: 'Contact & Address' }, { label: 'Account Setup' }, { label: 'Role & Details' }, { label: 'Medical Info' }, { label: 'Documents' }, { label: 'Review' }];

    function getEmptyForm(): PersonFormData {
        return {
            firstName: '',
            middleName: '',
            lastName: '',
            contact: {
                mobilePhone: '',
                homePhone: '',
                email: '',
                primaryLanguage: '',
                secondaryLanguage: ''
            },
            addresses: [],
            username: '',
            password: '',
            isActive: true,
            personCategory: 'student',
            school: user?.school || '',
            schoolSite: user?.schoolSite || '',
            medicalInfo: {
                allergies: [],
                chronicConditions: [],
                medications: []
            }
        };
    }

    useEffect(() => {
        fetchDropdownData();
    }, [user]);

    useEffect(() => {
        if (editData) {
            setIsEditMode(true);
            // Populate form with edit data
            const editFormData: PersonFormData = {
                firstName: editData.firstName || '',
                middleName: editData.middleName || '',
                lastName: editData.lastName || '',
                dateOfBirth: editData.dateOfBirth ? new Date(editData.dateOfBirth) : undefined,
                gender: editData.gender,
                photoLink: editData.photoLink,
                contact: editData.contact || {},
                addresses: editData.addresses || [],
                currentAddress: typeof editData.currentAddress === 'object' && editData.currentAddress?._id ? editData.currentAddress._id : editData.currentAddress,
                username: editData.username || '',
                password: '',
                isActive: editData.isActive !== undefined ? editData.isActive : true,
                personCategory: editData.personCategory || 'student',
                school: editData.school?._id || editData.school || user?.school || '',
                schoolSite: editData.schoolSite?._id || editData.schoolSite || user?.schoolSite || '',
                studentInfo: editData.studentInfo
                    ? {
                          ...editData.studentInfo,
                          faculty: typeof editData.studentInfo.faculty === 'object' && editData.studentInfo.faculty?._id ? editData.studentInfo.faculty._id : editData.studentInfo.faculty,
                          department: typeof editData.studentInfo.department === 'object' && editData.studentInfo.department?._id ? editData.studentInfo.department._id : editData.studentInfo.department,
                          currentClass: typeof editData.studentInfo.currentClass === 'object' && editData.studentInfo.currentClass?._id ? editData.studentInfo.currentClass._id : editData.studentInfo.currentClass,
                          guardian: typeof editData.studentInfo.guardian === 'object' && editData.studentInfo.guardian?._id ? editData.studentInfo.guardian._id : editData.studentInfo.guardian,
                          subjects: editData.studentInfo.subjects?.map((s: any) => (typeof s === 'object' && s?._id ? s._id : s)) || []
                      }
                    : undefined,
                employeeInfo: editData.employeeInfo
                    ? {
                          ...editData.employeeInfo,
                          teachingDepartment: typeof editData.employeeInfo.teachingDepartment === 'object' && editData.employeeInfo.teachingDepartment?._id ? editData.employeeInfo.teachingDepartment._id : editData.employeeInfo.teachingDepartment,
                          faculty: typeof editData.employeeInfo.faculty === 'object' && editData.employeeInfo.faculty?._id ? editData.employeeInfo.faculty._id : editData.employeeInfo.faculty,
                          bankInfo: editData.employeeInfo.bankInfo
                              ? {
                                    ...editData.employeeInfo.bankInfo,
                                    bank: typeof editData.employeeInfo.bankInfo.bank === 'object' && editData.employeeInfo.bankInfo.bank?._id ? editData.employeeInfo.bankInfo.bank._id : editData.employeeInfo.bankInfo.bank
                                }
                              : undefined,
                          subjects: editData.employeeInfo.subjects?.map((s: any) => (typeof s === 'object' && s?._id ? s._id : s)) || []
                      }
                    : undefined,
                medicalInfo: editData.medicalInfo || {
                    allergies: [],
                    chronicConditions: [],
                    medications: []
                },
                officialDocuments: editData.officialDocuments || []
            };
            setFormData(editFormData);
            if (editData.photoLink) {
                setPhotoPreview(editData.photoLink);
            }
        }
    }, [editData, user]);

    useEffect(() => {
        // Calculate password strength
        if (formData.password) {
            let strength = 0;
            if (formData.password.length >= 8) strength += 25;
            if (/[a-z]/.test(formData.password)) strength += 25;
            if (/[A-Z]/.test(formData.password)) strength += 25;
            if (/[0-9]/.test(formData.password)) strength += 25;
            setPasswordStrength(strength);
        } else {
            setPasswordStrength(0);
        }
    }, [formData.password]);

    const fetchDropdownData = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            // Fetch all dropdown data
            const [facultiesRes, deptRes, classesRes, subjectsRes, guardiansRes, banksRes, addressesRes] = await Promise.all([
                fetch(`/api/faculties?${params.toString()}`),
                fetch(`/api/departments?${params.toString()}`),
                fetch(`/api/classes?${params.toString()}`),
                fetch(`/api/subjects?${params.toString()}`),
                fetch(`/api/persons?category=parent&${params.toString()}`),
                fetch(`/api/banks`),
                fetch(`/api/addresses?${params.toString()}`)
            ]);

            if (facultiesRes.ok) {
                const data = await facultiesRes.json();
                setFaculties(data.faculties?.map((f: any) => ({ label: f.name, value: f._id })) || []);
            }

            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data.departments?.map((d: any) => ({ label: d.name, value: d._id })) || []);
            }

            if (classesRes.ok) {
                const data = await classesRes.json();
                setClasses(data.classes?.map((c: any) => ({ label: c.className, value: c._id })) || []);
            }

            if (subjectsRes.ok) {
                const data = await subjectsRes.json();
                setSubjects(data.subjects?.map((s: any) => ({ label: s.name, value: s._id })) || []);
            }

            if (guardiansRes.ok) {
                const data = await guardiansRes.json();
                setGuardians(data.persons?.map((p: any) => ({ label: `${p.firstName} ${p.lastName}`, value: p._id })) || []);
            }

            if (banksRes.ok) {
                const data = await banksRes.json();
                setBanks(data.banks?.map((b: any) => ({ label: b.name, value: b._id })) || []);
            }

            if (addressesRes.ok) {
                const data = await addressesRes.json();
                setAddresses(data.addresses?.map((a: any) => ({ label: a.addressLine1, value: a._id })) || []);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 4000 });
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0: // Basic Info
                if (!formData.firstName) {
                    showToast('warn', 'Validation Error', 'First name is required');
                    return false;
                }
                return true;
            case 1: // Contact & Address
                return true;
            case 2: // Account Setup
                if (!formData.username) {
                    showToast('warn', 'Validation Error', 'Username is required');
                    return false;
                }
                // Password is only required in create mode, not edit mode
                if (!isEditMode) {
                    if (!formData.password || formData.password.length < 8) {
                        showToast('warn', 'Validation Error', 'Password must be at least 8 characters');
                        return false;
                    }
                    if (formData.password !== formData.confirmPassword) {
                        showToast('warn', 'Validation Error', 'Passwords do not match');
                        return false;
                    }
                } else {
                    // In edit mode, validate password only if it's being changed
                    if (formData.password && formData.password.length > 0) {
                        if (formData.password.length < 8) {
                            showToast('warn', 'Validation Error', 'Password must be at least 8 characters');
                            return false;
                        }
                        if (formData.password !== formData.confirmPassword) {
                            showToast('warn', 'Validation Error', 'Passwords do not match');
                            return false;
                        }
                    }
                }
                return true;
            case 3: // Role & Details
                if (!formData.personCategory) {
                    showToast('warn', 'Validation Error', 'Person category is required');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(activeStep)) {
            setActiveStep(Math.min(activeStep + 1, steps.length - 1));
        }
    };

    const prevStep = () => {
        setActiveStep(Math.max(activeStep - 1, 0));
    };

    const saveDraft = async () => {
        setIsDraft(true);
        showToast('info', 'Draft Saved', 'Your progress has been saved');
    };

    const handleSubmit = async () => {
        if (!validateStep(activeStep)) return;

        setLoading(true);
        try {
            const url = isEditMode ? `/api/persons/${editData._id}` : '/api/persons';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'Success', `Person ${isEditMode ? 'updated' : 'created'} successfully`);
                setTimeout(() => {
                    onSuccess?.();
                }, 1500);
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} person`);
            }
        } catch (error) {
            showToast('error', 'Error', `An error occurred while ${isEditMode ? 'updating' : 'creating'} person`);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (event: any) => {
        const file = event.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            // Here you would upload to your server
            // const uploadedUrl = await uploadFile(file);
            // setFormData({ ...formData, photoLink: uploadedUrl });
        }
    };

    // Step 1: Basic Information
    const renderBasicInfo = () => (
        <div className="grid">
            <div className="col-12">
                <Card className="bg-blue-50 border-primary">
                    <div className="flex align-items-center gap-3">
                        <Avatar image={photoPreview || '/default-avatar.png'} size="xlarge" shape="circle" className="border-3 border-white shadow-4" />
                        <div className="flex-1">
                            <h3 className="text-primary-900 m-0 mb-2">Personal Details</h3>
                            <p className="text-primary-700 text-sm m-0">{`Enter the person's basic information`}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="firstName" className="font-semibold text-900 mb-2 block">
                    First Name <span className="text-red-500">*</span>
                </label>
                <InputText id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full" placeholder="Enter first name" />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="middleName" className="font-semibold text-900 mb-2 block">
                    Middle Name
                </label>
                <InputText id="middleName" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} className="w-full" placeholder="Enter middle name (optional)" />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="lastName" className="font-semibold text-900 mb-2 block">
                    Last Name
                </label>
                <InputText id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full" placeholder="Enter last name" />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="dateOfBirth" className="font-semibold text-900 mb-2 block">
                    Date of Birth
                </label>
                <Calendar
                    id="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.value as Date })}
                    showIcon
                    dateFormat="dd/mm/yy"
                    className="w-full"
                    placeholder="Select date of birth"
                    maxDate={new Date()}
                />
            </div>

            <div className="col-12 md:col-6">
                <label className="font-semibold text-900 mb-2 block">Gender</label>
                <div className="flex gap-4">
                    {genderOptions.map((option) => (
                        <div key={option.value} className="flex align-items-center">
                            <RadioButton inputId={option.value} name="gender" value={option.value} onChange={(e) => setFormData({ ...formData, gender: e.value })} checked={formData.gender === option.value} />
                            <label htmlFor={option.value} className="ml-2 cursor-pointer">
                                {option.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="photo" className="font-semibold text-900 mb-2 block">
                    Profile Photo
                </label>
                <FileUpload mode="basic" name="photo" accept="image/*" maxFileSize={2000000} onSelect={handlePhotoUpload} chooseLabel="Upload Photo" className="w-full" auto />
                <small className="text-500 block mt-1">Maximum file size: 2MB</small>
            </div>
        </div>
    );

    // Step 2: Contact & Address
    const renderContactInfo = () => (
        <div className="grid">
            <div className="col-12">
                <div className="bg-green-50 border-round p-3 mb-3">
                    <h4 className="text-green-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-phone"></i>
                        Contact Information
                    </h4>
                    <p className="text-green-700 text-sm m-0">How can we reach this person?</p>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="mobilePhone" className="font-semibold text-900 mb-2 block">
                    Mobile Phone
                </label>
                <InputText
                    id="mobilePhone"
                    value={formData.contact.mobilePhone}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            contact: { ...formData.contact, mobilePhone: e.target.value }
                        })
                    }
                    className="w-full"
                    placeholder="+233 XX XXX XXXX"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="homePhone" className="font-semibold text-900 mb-2 block">
                    Home Phone
                </label>
                <InputText
                    id="homePhone"
                    value={formData.contact.homePhone}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            contact: { ...formData.contact, homePhone: e.target.value }
                        })
                    }
                    className="w-full"
                    placeholder="Home phone number"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="email" className="font-semibold text-900 mb-2 block">
                    Email Address
                </label>
                <InputText
                    id="email"
                    type="email"
                    value={formData.contact.email}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            contact: { ...formData.contact, email: e.target.value }
                        })
                    }
                    className="w-full"
                    placeholder="email@example.com"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="primaryLanguage" className="font-semibold text-900 mb-2 block">
                    Primary Language
                </label>
                <InputText
                    id="primaryLanguage"
                    value={formData.contact.primaryLanguage}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            contact: { ...formData.contact, primaryLanguage: e.target.value }
                        })
                    }
                    className="w-full"
                    placeholder="e.g., English"
                />
            </div>

            <div className="col-12 mt-3">
                <Divider />
                <div className="bg-purple-50 border-round p-3 mb-3">
                    <h4 className="text-purple-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-map-marker"></i>
                        Address Information
                    </h4>
                    <p className="text-purple-700 text-sm m-0">Residential and contact addresses</p>
                </div>
            </div>

            <div className="col-12">
                <Message severity="info" text="You can add multiple addresses and mark one as current" className="w-full" />
            </div>

            <div className="col-12">
                <label htmlFor="currentAddress" className="font-semibold text-900 mb-2 block">
                    Current Address
                </label>
                <Dropdown
                    id="currentAddress"
                    value={formData.currentAddress}
                    options={addresses}
                    onChange={(e) => setFormData({ ...formData, currentAddress: e.value })}
                    placeholder="Select current address"
                    filter
                    showClear
                    className="w-full"
                    emptyMessage="No addresses available"
                />
                <small className="text-500 block mt-1">Create addresses in the Address Management section first</small>
            </div>
        </div>
    );

    // Step 3: Account Setup
    const renderAccountSetup = () => (
        <div className="grid">
            <div className="col-12">
                <div className="bg-orange-50 border-round p-3 mb-3">
                    <h4 className="text-orange-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-lock"></i>
                        Account & Authentication
                    </h4>
                    <p className="text-orange-700 text-sm m-0">Set up login credentials for this person</p>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="username" className="font-semibold text-900 mb-2 block">
                    Username <span className="text-red-500">*</span>
                </label>
                <InputText
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    className="w-full"
                    placeholder="Enter username (lowercase)"
                    style={{ textTransform: 'lowercase' }}
                />
                <small className="text-500 block mt-1">Must be unique across the system</small>
            </div>

            <div className="col-12 md:col-6">
                <label className="font-semibold text-900 mb-2 block">Account Status</label>
                <div className="surface-100 border-round p-3 flex align-items-center gap-3">
                    <InputSwitch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.value })} />
                    <div>
                        <div className="font-semibold text-900">{formData.isActive ? 'Active' : 'Inactive'}</div>
                        <small className="text-500">{formData.isActive ? 'Can log in' : 'Login disabled'}</small>
                    </div>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="password" className="font-semibold text-900 mb-2 block">
                    Password {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <Password
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    toggleMask
                    className="w-full"
                    inputClassName="w-full"
                    placeholder={isEditMode ? 'Leave empty to keep current password' : 'Enter password'}
                    feedback={false}
                />
                {isEditMode && (
                    <small className="text-500 block mt-1">
                        <i className="pi pi-info-circle mr-1"></i>
                        Leave empty to keep current password
                    </small>
                )}
                {formData.password && (
                    <div className="mt-2">
                        <small className="text-600 block mb-1">Password Strength:</small>
                        <ProgressBar value={passwordStrength} showValue={false} style={{ height: '6px' }} color={passwordStrength < 50 ? '#ef4444' : passwordStrength < 75 ? '#f59e0b' : '#10b981'} />
                        <small className="text-500 block mt-1">Must be at least 8 characters with uppercase, lowercase, and numbers</small>
                    </div>
                )}
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="confirmPassword" className="font-semibold text-900 mb-2 block">
                    Confirm Password {!isEditMode && <span className="text-red-500">*</span>}
                </label>
                <Password
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    toggleMask
                    className="w-full"
                    inputClassName="w-full"
                    placeholder={isEditMode ? 'Confirm new password if changing' : 'Confirm password'}
                    feedback={false}
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <small className="text-red-500 block mt-1">
                        <i className="pi pi-times-circle mr-1"></i>
                        Passwords do not match
                    </small>
                )}
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <small className="text-green-500 block mt-1">
                        <i className="pi pi-check-circle mr-1"></i>
                        Passwords match
                    </small>
                )}
            </div>
        </div>
    );

    // Step 4: Role & Details
    const renderRoleDetails = () => (
        <div className="grid">
            <div className="col-12">
                <div className="bg-indigo-50 border-round p-3 mb-3">
                    <h4 className="text-indigo-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-users"></i>
                        Role & Specific Information
                    </h4>
                    <p className="text-indigo-700 text-sm m-0">{`Select the person's role and provide role-specific details`}</p>
                </div>
            </div>

            <div className="col-12">
                <label htmlFor="personCategory" className="font-semibold text-900 mb-2 block">
                    Person Category <span className="text-red-500">*</span>
                </label>
                <Dropdown id="personCategory" value={formData.personCategory} options={categoryOptions} onChange={(e) => setFormData({ ...formData, personCategory: e.value })} placeholder="Select person category" className="w-full" />
                <small className="text-500 block mt-1">Different sections will appear based on selection</small>
            </div>

            {/* Student-specific fields */}
            {formData.personCategory === 'student' && (
                <div className="col-12 mt-3">
                    <Panel header="Student Information" toggleable>
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="studentId" className="font-semibold text-900 mb-2 block">
                                    Student ID
                                </label>
                                <InputText
                                    id="studentId"
                                    value={formData.studentInfo?.studentId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, studentId: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Auto-generated if left empty"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="dateJoined" className="font-semibold text-900 mb-2 block">
                                    Date Joined
                                </label>
                                <Calendar
                                    id="dateJoined"
                                    value={formData.studentInfo?.dateJoined}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, dateJoined: e.value as Date }
                                        })
                                    }
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="faculty" className="font-semibold text-900 mb-2 block">
                                    Faculty
                                </label>
                                <Dropdown
                                    id="faculty"
                                    value={formData.studentInfo?.faculty}
                                    options={faculties}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, faculty: e.value }
                                        })
                                    }
                                    placeholder="Select faculty"
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="department" className="font-semibold text-900 mb-2 block">
                                    Department
                                </label>
                                <Dropdown
                                    id="department"
                                    value={formData.studentInfo?.department}
                                    options={departments}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, department: e.value }
                                        })
                                    }
                                    placeholder="Select department"
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="currentClass" className="font-semibold text-900 mb-2 block">
                                    Current Class
                                </label>
                                <Dropdown
                                    id="currentClass"
                                    value={formData.studentInfo?.currentClass}
                                    options={classes}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, currentClass: e.value }
                                        })
                                    }
                                    placeholder="Select class"
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="guardian" className="font-semibold text-900 mb-2 block">
                                    Guardian
                                </label>
                                <Dropdown
                                    id="guardian"
                                    value={formData.studentInfo?.guardian}
                                    options={guardians}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, guardian: e.value }
                                        })
                                    }
                                    placeholder="Select guardian/parent"
                                    filter
                                    showClear
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12">
                                <label htmlFor="subjects" className="font-semibold text-900 mb-2 block">
                                    Subjects
                                </label>
                                <MultiSelect
                                    id="subjects"
                                    value={formData.studentInfo?.subjects}
                                    options={subjects}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            studentInfo: { ...formData.studentInfo!, subjects: e.value }
                                        })
                                    }
                                    placeholder="Select subjects"
                                    filter
                                    display="chip"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </Panel>
                </div>
            )}

            {/* Employee-specific fields */}
            {formData.personCategory !== 'student' && formData.personCategory !== 'parent' && (
                <div className="col-12 mt-3">
                    <Panel header="Employee Information" toggleable>
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="customId" className="font-semibold text-900 mb-2 block">
                                    Employee ID
                                </label>
                                <InputText
                                    id="customId"
                                    value={formData.employeeInfo?.customId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            employeeInfo: { ...formData.employeeInfo!, customId: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Custom employee ID"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="jobTitle" className="font-semibold text-900 mb-2 block">
                                    Job Title
                                </label>
                                <InputText
                                    id="jobTitle"
                                    value={formData.employeeInfo?.jobTitle}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            employeeInfo: { ...formData.employeeInfo!, jobTitle: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="e.g., Mathematics Teacher"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="empDateJoined" className="font-semibold text-900 mb-2 block">
                                    Date Joined
                                </label>
                                <Calendar
                                    id="empDateJoined"
                                    value={formData.employeeInfo?.dateJoined}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            employeeInfo: { ...formData.employeeInfo!, dateJoined: e.value as Date }
                                        })
                                    }
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="tinNumber" className="font-semibold text-900 mb-2 block">
                                    TIN Number
                                </label>
                                <InputText
                                    id="tinNumber"
                                    value={formData.employeeInfo?.tinNumber}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            employeeInfo: { ...formData.employeeInfo!, tinNumber: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Tax Identification Number"
                                />
                            </div>

                            {/* Show subjects for teachers */}
                            {formData.personCategory === 'teacher' && (
                                <div className="col-12">
                                    <label htmlFor="teacherSubjects" className="font-semibold text-900 mb-2 block">
                                        Teaching Subjects
                                    </label>
                                    <MultiSelect
                                        id="teacherSubjects"
                                        value={formData.employeeInfo?.subjects}
                                        options={subjects}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                employeeInfo: { ...formData.employeeInfo!, subjects: e.value }
                                            })
                                        }
                                        placeholder="Select teaching subjects"
                                        filter
                                        display="chip"
                                        className="w-full"
                                    />
                                    <small className="text-500 block mt-1">Select the subjects this teacher is qualified to teach</small>
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>
            )}
        </div>
    );

    // Step 5: Medical Information
    const renderMedicalInfo = () => (
        <div className="grid">
            <div className="col-12">
                <div className="bg-red-50 border-round p-3 mb-3">
                    <h4 className="text-red-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-heart-fill"></i>
                        Medical Information
                    </h4>
                    <p className="text-red-700 text-sm m-0">Health details and emergency contact</p>
                </div>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="bloodGroup" className="font-semibold text-900 mb-2 block">
                    Blood Group
                </label>
                <Dropdown
                    id="bloodGroup"
                    value={formData.medicalInfo.bloodGroup}
                    options={bloodGroupOptions}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: { ...formData.medicalInfo, bloodGroup: e.value }
                        })
                    }
                    placeholder="Select blood group"
                    showClear
                    className="w-full"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="allergies" className="font-semibold text-900 mb-2 block">
                    Allergies
                </label>
                <Chips
                    id="allergies"
                    value={formData.medicalInfo.allergies}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: { ...formData.medicalInfo, allergies: e.value }
                        })
                    }
                    placeholder="Type and press Enter"
                    className="w-full"
                />
                <small className="text-500 block mt-1">Press Enter after each allergy</small>
            </div>

            <div className="col-12">
                <label htmlFor="chronicConditions" className="font-semibold text-900 mb-2 block">
                    Chronic Conditions
                </label>
                <Chips
                    id="chronicConditions"
                    value={formData.medicalInfo.chronicConditions}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: { ...formData.medicalInfo, chronicConditions: e.value }
                        })
                    }
                    placeholder="Type and press Enter"
                    className="w-full"
                />
            </div>

            <div className="col-12 mt-3">
                <Divider />
                <h4 className="text-900 mb-3">Emergency Contact</h4>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="emergencyName" className="font-semibold text-900 mb-2 block">
                    Contact Name
                </label>
                <InputText
                    id="emergencyName"
                    value={formData.medicalInfo.emergencyContact?.name}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: {
                                ...formData.medicalInfo,
                                emergencyContact: {
                                    ...formData.medicalInfo.emergencyContact,
                                    name: e.target.value
                                }
                            }
                        })
                    }
                    className="w-full"
                    placeholder="Full name"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="emergencyRelationship" className="font-semibold text-900 mb-2 block">
                    Relationship
                </label>
                <InputText
                    id="emergencyRelationship"
                    value={formData.medicalInfo.emergencyContact?.relationship}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: {
                                ...formData.medicalInfo,
                                emergencyContact: {
                                    ...formData.medicalInfo.emergencyContact,
                                    relationship: e.target.value
                                }
                            }
                        })
                    }
                    className="w-full"
                    placeholder="e.g., Parent, Spouse"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="emergencyPhone" className="font-semibold text-900 mb-2 block">
                    Phone Number
                </label>
                <InputText
                    id="emergencyPhone"
                    value={formData.medicalInfo.emergencyContact?.phone}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: {
                                ...formData.medicalInfo,
                                emergencyContact: {
                                    ...formData.medicalInfo.emergencyContact,
                                    phone: e.target.value
                                }
                            }
                        })
                    }
                    className="w-full"
                    placeholder="Primary phone"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="emergencyAltPhone" className="font-semibold text-900 mb-2 block">
                    Alternate Phone
                </label>
                <InputText
                    id="emergencyAltPhone"
                    value={formData.medicalInfo.emergencyContact?.alternatePhone}
                    onChange={(e) =>
                        setFormData({
                            ...formData,
                            medicalInfo: {
                                ...formData.medicalInfo,
                                emergencyContact: {
                                    ...formData.medicalInfo.emergencyContact,
                                    alternatePhone: e.target.value
                                }
                            }
                        })
                    }
                    className="w-full"
                    placeholder="Secondary phone"
                />
            </div>
        </div>
    );

    // Step 6: Documents
    const renderDocuments = () => (
        <div className="grid">
            <div className="col-12">
                <div className="bg-cyan-50 border-round p-3 mb-3">
                    <h4 className="text-cyan-900 mt-0 mb-1 flex align-items-center gap-2">
                        <i className="pi pi-file"></i>
                        Official Documents
                    </h4>
                    <p className="text-cyan-700 text-sm m-0">Upload identification and official documents</p>
                </div>
            </div>

            <div className="col-12">
                <Message severity="info" text="Documents can be uploaded after creating the person record" className="w-full" />
            </div>

            <div className="col-12">
                <p className="text-600 text-sm">
                    <strong>Supported document types:</strong>
                </p>
                <ul className="text-600 text-sm">
                    <li>National ID Card</li>
                    <li>Passport</li>
                    <li>{`Voter's ID`}</li>
                    <li>Birth Certificate</li>
                    <li>{`Driver's License`}</li>
                </ul>
            </div>
        </div>
    );

    // Step 7: Review
    const renderReview = () => (
        <div className="grid">
            <div className="col-12">
                <Card className="bg-green-50 border-green-500 border-2">
                    <div className="flex align-items-center gap-3 mb-3">
                        <i className="pi pi-check-circle text-green-600 text-4xl"></i>
                        <div>
                            <h3 className="text-green-900 m-0 mb-1">Review Information</h3>
                            <p className="text-green-700 text-sm m-0">Please review all details before submitting</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="col-12 md:col-6">
                <Panel header="Basic Information" toggleable collapsed={false}>
                    <div className="grid">
                        <div className="col-6 text-600">Full Name:</div>
                        <div className="col-6 font-semibold">
                            {formData.firstName} {formData.middleName} {formData.lastName}
                        </div>

                        <div className="col-6 text-600">Gender:</div>
                        <div className="col-6 font-semibold">{formData.gender || '-'}</div>

                        <div className="col-6 text-600">Date of Birth:</div>
                        <div className="col-6 font-semibold">{formData.dateOfBirth?.toLocaleDateString() || '-'}</div>
                    </div>
                </Panel>
            </div>

            <div className="col-12 md:col-6">
                <Panel header="Contact Information" toggleable collapsed={false}>
                    <div className="grid">
                        <div className="col-6 text-600">Mobile:</div>
                        <div className="col-6 font-semibold">{formData.contact.mobilePhone || '-'}</div>

                        <div className="col-6 text-600">Email:</div>
                        <div className="col-6 font-semibold">{formData.contact.email || '-'}</div>
                    </div>
                </Panel>
            </div>

            <div className="col-12">
                <Panel header="Account Details" toggleable collapsed={false}>
                    <div className="grid">
                        <div className="col-6 md:col-3 text-600">Username:</div>
                        <div className="col-6 md:col-3 font-semibold">{formData.username}</div>

                        <div className="col-6 md:col-3 text-600">Role:</div>
                        <div className="col-6 md:col-3 font-semibold">
                            <Tag value={formData.personCategory} severity="info" />
                        </div>

                        <div className="col-6 md:col-3 text-600">Status:</div>
                        <div className="col-6 md:col-3 font-semibold">
                            <Tag value={formData.isActive ? 'Active' : 'Inactive'} severity={formData.isActive ? 'success' : 'danger'} />
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return renderBasicInfo();
            case 1:
                return renderContactInfo();
            case 2:
                return renderAccountSetup();
            case 3:
                return renderRoleDetails();
            case 4:
                return renderMedicalInfo();
            case 5:
                return renderDocuments();
            case 6:
                return renderReview();
            default:
                return null;
        }
    };

    return (
        <div className="surface-ground p-3 md:p-4">
            <Toast ref={toastRef} />

            <Card>
                <div className="flex align-items-center justify-content-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-900 m-0 mb-2">{isEditMode ? 'Edit Person' : 'Add New Person'}</h2>
                        <p className="text-600 m-0 text-sm">{isEditMode ? 'Update person information' : 'Complete all steps to create a new person record'}</p>
                    </div>
                    {isDraft && <Tag value="Draft Saved" severity="info" icon="pi pi-save" />}
                </div>

                <Steps model={steps} activeIndex={activeStep} onSelect={(e) => setActiveStep(e.index)} readOnly={false} className="mb-4" />

                <Divider />

                <div className="min-h-30rem">{renderStepContent()}</div>

                <Divider />

                <div className="flex justify-content-between align-items-center gap-2 flex-wrap">
                    <div className="flex gap-2">
                        <Button label="Cancel" icon="pi pi-times" outlined severity="info" onClick={onCancel} />
                        <Button label="Save Draft" icon="pi pi-save" outlined onClick={saveDraft} />
                    </div>

                    <div className="flex gap-2">
                        {activeStep > 0 && <Button label="Previous" icon="pi pi-arrow-left" outlined onClick={prevStep} />}

                        {activeStep < steps.length - 1 ? <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={nextStep} /> : <Button label="Submit" icon="pi pi-check" loading={loading} onClick={handleSubmit} />}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AddPersonForm;
