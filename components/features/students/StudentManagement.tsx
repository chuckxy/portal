'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Chips } from 'primereact/chips';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { useAuth } from '@/context/AuthContext';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';

interface StudentData {
    _id?: string;
    // Basic Information
    firstName: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';

    // Contact Information
    contact: {
        mobilePhone?: string;
        homePhone?: string;
        email?: string;
        primaryLanguage?: string;
        secondaryLanguage?: string;
    };

    // Student Specific
    studentInfo: {
        studentId?: string;
        dateJoined?: Date;
        faculty?: string;
        department?: string;
        guardian?: string;
        guardianRelationship?: 'parent' | 'uncle' | 'aunt' | 'grandparent' | 'sibling' | 'other';
        house?: string;
        dormitory?: string;
        room?: string;
        previousSchool?: string;
        currentClass?: string;
        defaultAcademicTerm?: number;
        defaultAcademicYear?: string;
        subjects?: string[];
    };

    // Medical Information
    medicalInfo: {
        bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
        allergies?: string[];
        chronicConditions?: string[];
        medications?: Array<{
            name?: string;
            dosage?: string;
            frequency?: string;
        }>;
        emergencyContact: {
            name?: string;
            relationship?: string;
            phone?: string;
            alternatePhone?: string;
        };
    };

    // Official Documents
    officialDocuments?: Array<{
        documentType: 'passport' | 'national_id' | 'voters_id' | 'birth_certificate' | 'driver_license' | 'other';
        documentId: string;
        nameOnDocument?: string;
        issuedDate?: Date;
        expiryDate?: Date;
    }>;

    // Authentication
    username: string;
    password?: string;
    photoLink?: string;
    isActive: boolean;
}

interface DropdownOption {
    label: string;
    value: string;
}

const StudentManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = React.useRef<Toast>(null);

    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    // Dropdown options
    const [classes, setClasses] = useState<DropdownOption[]>([]);
    const [faculties, setFaculties] = useState<DropdownOption[]>([]);
    const [departments, setDepartments] = useState<DropdownOption[]>([]);

    // Form state
    const [formData, setFormData] = useState<StudentData>(getEmptyStudent());

    // DataTable filters
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        firstName: { value: null, matchMode: FilterMatchMode.STARTS_WITH },
        'studentInfo.studentId': { value: null, matchMode: FilterMatchMode.CONTAINS }
    });
    const [globalFilterValue, setGlobalFilterValue] = useState('');

    function getEmptyStudent(): StudentData {
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
            studentInfo: {
                studentId: '',
                subjects: []
            },
            medicalInfo: {
                allergies: [],
                chronicConditions: [],
                medications: [],
                emergencyContact: {
                    name: '',
                    relationship: '',
                    phone: '',
                    alternatePhone: ''
                }
            },
            officialDocuments: [],
            username: '',
            password: '',
            isActive: true
        };
    }

    useEffect(() => {
        fetchStudents();
        fetchDropdownData();
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/students');
            if (response.ok) {
                const data = await response.json();
                setStudents(data.students || []);
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            // Fetch classes
            const classResponse = await fetch('/api/classes');
            if (classResponse.ok) {
                const classData = await classResponse.json();
                setClasses(classData.classes?.map((c: any) => ({
                    label: c.className || `Form ${c.sequence}${c.division}`,
                    value: c._id
                })) || []);
            }

            // Fetch faculties
            const facultyResponse = await fetch('/api/faculties');
            if (facultyResponse.ok) {
                const facultyData = await facultyResponse.json();
                setFaculties(facultyData.faculties?.map((f: any) => ({
                    label: f.name,
                    value: f._id
                })) || []);
            }

            // Fetch departments
            const deptResponse = await fetch('/api/departments');
            if (deptResponse.ok) {
                const deptData = await deptResponse.json();
                setDepartments(deptData.departments?.map((d: any) => ({
                    label: d.name,
                    value: d._id
                })) || []);
            }
        } catch (error) {
            console.error('Failed to fetch dropdown data:', error);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const openNew = () => {
        setFormData(getEmptyStudent());
        setIsEditMode(false);
        setDialogVisible(true);
        setActiveTabIndex(0);
    };

    const openEdit = (student: StudentData) => {
        setFormData({ ...student });
        setIsEditMode(true);
        setDialogVisible(true);
        setActiveTabIndex(0);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setFormData(getEmptyStudent());
    };

    const saveStudent = async () => {
        if (!formData.firstName || !formData.username) {
            showToast('error', 'Validation Error', 'First name and username are required');
            return;
        }

        try {
            const url = isEditMode ? `/api/students/${formData._id}` : '/api/students';
            const method = isEditMode ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    school: user?.school,
                    schoolSite: user?.schoolSite,
                    personCategory: 'student'
                })
            });

            if (response.ok) {
                showToast('success', 'Success', `Student ${isEditMode ? 'updated' : 'created'} successfully`);
                hideDialog();
                fetchStudents();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to save student');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while saving student');
        }
    };

    const deleteStudent = async (studentId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this student?',
            header: 'Confirm Delete',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const response = await fetch(`/api/students/${studentId}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        showToast('success', 'Success', 'Student deleted successfully');
                        fetchStudents();
                    } else {
                        showToast('error', 'Error', 'Failed to delete student');
                    }
                } catch (error) {
                    showToast('error', 'Error', 'An error occurred while deleting student');
                }
            }
        });
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="New Student" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search students..."
                    />
                </span>
                <Button label="Refresh" icon="pi pi-refresh" severity="info" onClick={fetchStudents} />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: StudentData) => {
        return (
            <div className="flex gap-2">
                <Button
                    icon="pi pi-pencil"
                    rounded
                    outlined
                    severity="info"
                    onClick={() => openEdit(rowData)}
                />
                <Button
                    icon="pi pi-trash"
                    rounded
                    outlined
                    severity="danger"
                    onClick={() => deleteStudent(rowData._id!)}
                />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: StudentData) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} />;
    };

    const fullNameBodyTemplate = (rowData: StudentData) => {
        const parts = [rowData.firstName, rowData.middleName, rowData.lastName].filter(Boolean);
        return parts.join(' ');
    };

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

    const guardianRelationshipOptions = [
        { label: 'Parent', value: 'parent' },
        { label: 'Uncle', value: 'uncle' },
        { label: 'Aunt', value: 'aunt' },
        { label: 'Grandparent', value: 'grandparent' },
        { label: 'Sibling', value: 'sibling' },
        { label: 'Other', value: 'other' }
    ];

    const termOptions = [
        { label: 'Term 1', value: 1 },
        { label: 'Term 2', value: 2 },
        { label: 'Term 3', value: 3 }
    ];

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" outlined onClick={hideDialog} />
            <Button label="Save" icon="pi pi-check" onClick={saveStudent} />
        </div>
    );

    return (
        <div className="surface-ground p-4">
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Card className="mb-4">
                <div className="flex align-items-center justify-content-between mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-900 m-0 mb-2">Student Management</h2>
                        <p className="text-600 m-0">Manage student admissions and records</p>
                    </div>
                    <i className="pi pi-users text-6xl text-primary"></i>
                </div>

                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

                <DataTable
                    value={students}
                    loading={loading}
                    paginator
                    rows={10}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="_id"
                    filters={filters}
                    globalFilterFields={['firstName', 'lastName', 'studentInfo.studentId', 'contact.email']}
                    emptyMessage="No students found"
                    className="datatable-responsive"
                    responsiveLayout="scroll"
                >
                    <Column field="studentInfo.studentId" header="Student ID" sortable style={{ minWidth: '120px' }} />
                    <Column body={fullNameBodyTemplate} header="Full Name" sortable style={{ minWidth: '200px' }} />
                    <Column field="gender" header="Gender" sortable style={{ minWidth: '100px' }} />
                    <Column field="contact.email" header="Email" sortable style={{ minWidth: '200px' }} />
                    <Column field="contact.mobilePhone" header="Phone" sortable style={{ minWidth: '150px' }} />
                    <Column body={statusBodyTemplate} header="Status" sortable style={{ minWidth: '100px' }} />
                    <Column body={actionBodyTemplate} exportable={false} style={{ minWidth: '120px' }} />
                </DataTable>
            </Card>

            <Dialog
                visible={dialogVisible}
                style={{ width: '90vw', maxWidth: '1200px' }}
                header={isEditMode ? 'Edit Student' : 'New Student Admission'}
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
            >
                <TabView activeIndex={activeTabIndex} onTabChange={(e) => setActiveTabIndex(e.index)}>
                    {/* Basic Information Tab */}
                    <TabPanel header="Basic Info" leftIcon="pi pi-user mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <label htmlFor="firstName" className="font-semibold">First Name *</label>
                                <InputText
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="middleName" className="font-semibold">Middle Name</label>
                                <InputText
                                    id="middleName"
                                    value={formData.middleName}
                                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="lastName" className="font-semibold">Last Name</label>
                                <InputText
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="dateOfBirth" className="font-semibold">Date of Birth</label>
                                <Calendar
                                    id="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.value as Date })}
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="gender" className="font-semibold">Gender</label>
                                <Dropdown
                                    id="gender"
                                    value={formData.gender}
                                    options={genderOptions}
                                    onChange={(e) => setFormData({ ...formData, gender: e.value })}
                                    placeholder="Select Gender"
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="username" className="font-semibold">Username *</label>
                                <InputText
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    disabled={isEditMode}
                                    className="mt-2"
                                />
                            </div>
                            {!isEditMode && (
                                <div className="col-12 md:col-6">
                                    <label htmlFor="password" className="font-semibold">Password *</label>
                                    <InputText
                                        id="password"
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        className="mt-2"
                                    />
                                </div>
                            )}

                            <div className="col-12">
                                <label htmlFor="photoLink" className="font-semibold">Photo URL</label>
                                <InputText
                                    id="photoLink"
                                    value={formData.photoLink}
                                    onChange={(e) => setFormData({ ...formData, photoLink: e.target.value })}
                                    placeholder="https://example.com/photo.jpg"
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Contact Information Tab */}
                    <TabPanel header="Contact" leftIcon="pi pi-phone mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="email" className="font-semibold">Email</label>
                                <InputText
                                    id="email"
                                    type="email"
                                    value={formData.contact.email}
                                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="mobilePhone" className="font-semibold">Mobile Phone</label>
                                <InputText
                                    id="mobilePhone"
                                    value={formData.contact.mobilePhone}
                                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, mobilePhone: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="homePhone" className="font-semibold">Home Phone</label>
                                <InputText
                                    id="homePhone"
                                    value={formData.contact.homePhone}
                                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, homePhone: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="primaryLanguage" className="font-semibold">Primary Language</label>
                                <InputText
                                    id="primaryLanguage"
                                    value={formData.contact.primaryLanguage}
                                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, primaryLanguage: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12">
                                <label htmlFor="secondaryLanguage" className="font-semibold">Secondary Language</label>
                                <InputText
                                    id="secondaryLanguage"
                                    value={formData.contact.secondaryLanguage}
                                    onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, secondaryLanguage: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Academic Information Tab */}
                    <TabPanel header="Academic" leftIcon="pi pi-book mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="studentId" className="font-semibold">Student ID</label>
                                <InputText
                                    id="studentId"
                                    value={formData.studentInfo.studentId}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, studentId: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="dateJoined" className="font-semibold">Date Joined</label>
                                <Calendar
                                    id="dateJoined"
                                    value={formData.studentInfo.dateJoined}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, dateJoined: e.value as Date } })}
                                    showIcon
                                    dateFormat="dd/mm/yy"
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="currentClass" className="font-semibold">Current Class</label>
                                <Dropdown
                                    id="currentClass"
                                    value={formData.studentInfo.currentClass}
                                    options={classes}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, currentClass: e.value } })}
                                    placeholder="Select Class"
                                    filter
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="faculty" className="font-semibold">Faculty</label>
                                <Dropdown
                                    id="faculty"
                                    value={formData.studentInfo.faculty}
                                    options={faculties}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, faculty: e.value } })}
                                    placeholder="Select Faculty"
                                    filter
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="department" className="font-semibold">Department</label>
                                <Dropdown
                                    id="department"
                                    value={formData.studentInfo.department}
                                    options={departments}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, department: e.value } })}
                                    placeholder="Select Department"
                                    filter
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="defaultAcademicTerm" className="font-semibold">Academic Term</label>
                                <Dropdown
                                    id="defaultAcademicTerm"
                                    value={formData.studentInfo.defaultAcademicTerm}
                                    options={termOptions}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, defaultAcademicTerm: e.value } })}
                                    placeholder="Select Term"
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="defaultAcademicYear" className="font-semibold">Academic Year</label>
                                <InputText
                                    id="defaultAcademicYear"
                                    value={formData.studentInfo.defaultAcademicYear}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, defaultAcademicYear: e.target.value } })}
                                    placeholder="2023/2024"
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="previousSchool" className="font-semibold">Previous School</label>
                                <InputText
                                    id="previousSchool"
                                    value={formData.studentInfo.previousSchool}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, previousSchool: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>

                            <Divider />

                            <div className="col-12 md:col-4">
                                <label htmlFor="house" className="font-semibold">House</label>
                                <InputText
                                    id="house"
                                    value={formData.studentInfo.house}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, house: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="dormitory" className="font-semibold">Dormitory</label>
                                <InputText
                                    id="dormitory"
                                    value={formData.studentInfo.dormitory}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, dormitory: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="room" className="font-semibold">Room</label>
                                <InputText
                                    id="room"
                                    value={formData.studentInfo.room}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, room: e.target.value } })}
                                    className="mt-2"
                                />
                            </div>

                            <Divider />

                            <div className="col-12 md:col-6">
                                <label htmlFor="guardianRelationship" className="font-semibold">Guardian Relationship</label>
                                <Dropdown
                                    id="guardianRelationship"
                                    value={formData.studentInfo.guardianRelationship}
                                    options={guardianRelationshipOptions}
                                    onChange={(e) => setFormData({ ...formData, studentInfo: { ...formData.studentInfo, guardianRelationship: e.value } })}
                                    placeholder="Select Relationship"
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Medical Information Tab */}
                    <TabPanel header="Medical" leftIcon="pi pi-heart mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="bloodGroup" className="font-semibold">Blood Group</label>
                                <Dropdown
                                    id="bloodGroup"
                                    value={formData.medicalInfo.bloodGroup}
                                    options={bloodGroupOptions}
                                    onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, bloodGroup: e.value } })}
                                    placeholder="Select Blood Group"
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="allergies" className="font-semibold">Allergies</label>
                                <Chips
                                    id="allergies"
                                    value={formData.medicalInfo.allergies}
                                    onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, allergies: e.value as string[] } })}
                                    placeholder="Add allergies"
                                    className="mt-2"
                                />
                            </div>

                            <div className="col-12">
                                <label htmlFor="chronicConditions" className="font-semibold">Chronic Conditions</label>
                                <Chips
                                    id="chronicConditions"
                                    value={formData.medicalInfo.chronicConditions}
                                    onChange={(e) => setFormData({ ...formData, medicalInfo: { ...formData.medicalInfo, chronicConditions: e.value as string[] } })}
                                    placeholder="Add chronic conditions"
                                    className="mt-2"
                                />
                            </div>

                            <Divider />
                            <div className="col-12">
                                <h4 className="text-xl font-bold text-900 mb-3">Emergency Contact</h4>
                            </div>

                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyName" className="font-semibold">Name</label>
                                <InputText
                                    id="emergencyName"
                                    value={formData.medicalInfo.emergencyContact.name}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalInfo: {
                                            ...formData.medicalInfo,
                                            emergencyContact: { ...formData.medicalInfo.emergencyContact, name: e.target.value }
                                        }
                                    })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyRelationship" className="font-semibold">Relationship</label>
                                <InputText
                                    id="emergencyRelationship"
                                    value={formData.medicalInfo.emergencyContact.relationship}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalInfo: {
                                            ...formData.medicalInfo,
                                            emergencyContact: { ...formData.medicalInfo.emergencyContact, relationship: e.target.value }
                                        }
                                    })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyPhone" className="font-semibold">Phone</label>
                                <InputText
                                    id="emergencyPhone"
                                    value={formData.medicalInfo.emergencyContact.phone}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalInfo: {
                                            ...formData.medicalInfo,
                                            emergencyContact: { ...formData.medicalInfo.emergencyContact, phone: e.target.value }
                                        }
                                    })}
                                    className="mt-2"
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyAlternatePhone" className="font-semibold">Alternate Phone</label>
                                <InputText
                                    id="emergencyAlternatePhone"
                                    value={formData.medicalInfo.emergencyContact.alternatePhone}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        medicalInfo: {
                                            ...formData.medicalInfo,
                                            emergencyContact: { ...formData.medicalInfo.emergencyContact, alternatePhone: e.target.value }
                                        }
                                    })}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>
        </div>
    );
};

export default StudentManagement;
