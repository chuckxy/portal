'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { Avatar } from 'primereact/avatar';
import { FileUpload } from 'primereact/fileupload';
import { Divider } from 'primereact/divider';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Chips } from 'primereact/chips';
import { InputTextarea } from 'primereact/inputtextarea';
import { Panel } from 'primereact/panel';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '@/context/AuthContext';

type Gender = 'male' | 'female' | 'other';
type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';

interface ProfileData {
    // Basic Information
    firstName: string;
    middleName?: string;
    lastName: string;
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

    // Medical Information (if applicable)
    medicalInfo?: {
        bloodGroup?: BloodGroup;
        allergies?: string[];
        chronicConditions?: string[];
        emergencyContact?: {
            name?: string;
            relationship?: string;
            phone?: string;
            alternatePhone?: string;
        };
    };

    // Employee specific (if applicable)
    employeeInfo?: {
        maritalStatus?: MaritalStatus;
        tinNumber?: string;
        ssnitNumber?: string;
        bankInfo?: {
            accountName?: string;
            accountNumber?: string;
            branch?: string;
        };
    };

    // Biography/Notes
    biography?: string;
}

interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ProfileEditFormProps {
    userId: string;
    personCategory: string;
}

export default function ProfileEditForm({ userId, personCategory }: ProfileEditFormProps) {
    const toast = useRef<Toast>(null);
    const fileUploadRef = useRef<FileUpload>(null);
    const { updateProfile, refreshUser } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData>({
        firstName: '',
        lastName: '',
        contact: {},
        medicalInfo: {
            allergies: [],
            chronicConditions: []
        }
    });
    const [passwordData, setPasswordData] = useState<PasswordChangeData>({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [activeIndex, setActiveIndex] = useState(0);

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

    const maritalStatusOptions = [
        { label: 'Single', value: 'single' },
        { label: 'Married', value: 'married' },
        { label: 'Divorced', value: 'divorced' },
        { label: 'Widowed', value: 'widowed' }
    ];

    useEffect(() => {
        loadProfileData();
    }, [userId]);

    const loadProfileData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/persons/${userId}`);
            const data = await response.json();
            if (data.success) {
                const person = data.person;
                setProfileData({
                    firstName: person.firstName || '',
                    middleName: person.middleName || '',
                    lastName: person.lastName || '',
                    dateOfBirth: person.dateOfBirth ? new Date(person.dateOfBirth) : undefined,
                    gender: person.gender,
                    photoLink: person.photoLink,
                    contact: {
                        mobilePhone: person.contact?.mobilePhone || '',
                        homePhone: person.contact?.homePhone || '',
                        email: person.contact?.email || '',
                        primaryLanguage: person.contact?.primaryLanguage || '',
                        secondaryLanguage: person.contact?.secondaryLanguage || ''
                    },
                    medicalInfo: {
                        bloodGroup: person.medicalInfo?.bloodGroup,
                        allergies: person.medicalInfo?.allergies || [],
                        chronicConditions: person.medicalInfo?.chronicConditions || [],
                        emergencyContact: person.medicalInfo?.emergencyContact || {}
                    },
                    employeeInfo: person.employeeInfo
                        ? {
                              maritalStatus: person.employeeInfo.maritalStatus,
                              tinNumber: person.employeeInfo.tinNumber || '',
                              ssnitNumber: person.employeeInfo.ssnitNumber || '',
                              bankInfo: person.employeeInfo.bankInfo || {}
                          }
                        : undefined,
                    biography: person.biography || ''
                });
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to load profile data'
                });
            }
        } catch (error: any) {
            console.error('Error loading profile:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while loading profile data'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        try {
            setSaving(true);

            // Validate required fields
            if (!profileData.firstName || !profileData.lastName) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'First name and last name are required'
                });
                return;
            }

            const response = await fetch(`/api/persons/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (data.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Profile updated successfully'
                });

                // Update auth context if name or photo changed
                await refreshUser();
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to update profile'
                });
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while updating profile'
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        try {
            // Validate password fields
            if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'All password fields are required'
                });
                return;
            }

            if (passwordData.newPassword !== passwordData.confirmPassword) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'New password and confirm password do not match'
                });
                return;
            }

            if (passwordData.newPassword.length < 6) {
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Validation Error',
                    detail: 'Password must be at least 6 characters long'
                });
                return;
            }

            setSaving(true);

            const response = await fetch(`/api/persons/${userId}/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Password changed successfully'
                });

                // Clear password fields
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to change password'
                });
            }
        } catch (error: any) {
            console.error('Error changing password:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while changing password'
            });
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (event: any) => {
        try {
            const file = event.files[0];
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                setProfileData({
                    ...profileData,
                    photoLink: data.url
                });

                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Photo uploaded successfully'
                });

                fileUploadRef.current?.clear();
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to upload photo'
                });
            }
        } catch (error: any) {
            console.error('Error uploading photo:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while uploading photo'
            });
        }
    };

    const confirmDeleteAccount = () => {
        confirmDialog({
            message: 'Are you sure you want to delete your account? This action cannot be undone.',
            header: 'Delete Account Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: handleDeleteAccount
        });
    };

    const handleDeleteAccount = async () => {
        try {
            setSaving(true);

            const response = await fetch(`/api/persons/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account deleted successfully'
                });

                // Logout after account deletion
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 2000);
            } else {
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error',
                    detail: data.message || 'Failed to delete account'
                });
            }
        } catch (error: any) {
            console.error('Error deleting account:', error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while deleting account'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <ProgressSpinner />
            </div>
        );
    }

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <Card title="Edit Profile" className="mb-4">
                <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    {/* Basic Information Tab */}
                    <TabPanel header="Basic Information" leftIcon="pi pi-user mr-2">
                        <div className="grid">
                            {/* Photo Upload */}
                            <div className="col-12 text-center mb-4">
                                <Avatar image={profileData.photoLink || '/layout/images/avatar/avatar-m-1.jpg'} size="xlarge" shape="circle" className="mb-3" style={{ width: '120px', height: '120px' }} />
                                <div>
                                    <FileUpload ref={fileUploadRef} mode="basic" name="photo" accept="image/*" maxFileSize={5000000} onSelect={handlePhotoUpload} chooseLabel="Upload Photo" className="p-button-outlined" auto />
                                    <small className="block mt-2 text-500">Max size: 5MB</small>
                                </div>
                            </div>

                            {/* First Name */}
                            <div className="col-12 md:col-4">
                                <label htmlFor="firstName" className="block mb-2 font-semibold">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <InputText id="firstName" value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} className="w-full" />
                            </div>

                            {/* Middle Name */}
                            <div className="col-12 md:col-4">
                                <label htmlFor="middleName" className="block mb-2 font-semibold">
                                    Middle Name
                                </label>
                                <InputText id="middleName" value={profileData.middleName || ''} onChange={(e) => setProfileData({ ...profileData, middleName: e.target.value })} className="w-full" />
                            </div>

                            {/* Last Name */}
                            <div className="col-12 md:col-4">
                                <label htmlFor="lastName" className="block mb-2 font-semibold">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <InputText id="lastName" value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} className="w-full" />
                            </div>

                            {/* Date of Birth */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="dateOfBirth" className="block mb-2 font-semibold">
                                    Date of Birth
                                </label>
                                <Calendar id="dateOfBirth" value={profileData.dateOfBirth} onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.value as Date })} className="w-full" showIcon dateFormat="dd/mm/yy" maxDate={new Date()} />
                            </div>

                            {/* Gender */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="gender" className="block mb-2 font-semibold">
                                    Gender
                                </label>
                                <Dropdown id="gender" value={profileData.gender} options={genderOptions} onChange={(e) => setProfileData({ ...profileData, gender: e.value })} className="w-full" placeholder="Select Gender" />
                            </div>

                            {/* Biography */}
                            <div className="col-12">
                                <label htmlFor="biography" className="block mb-2 font-semibold">
                                    Biography
                                </label>
                                <InputTextarea id="biography" value={profileData.biography || ''} onChange={(e) => setProfileData({ ...profileData, biography: e.target.value })} rows={4} className="w-full" placeholder="Tell us about yourself..." />
                            </div>

                            <div className="col-12">
                                <Divider />
                                <Button label="Save Changes" icon="pi pi-save" onClick={handleProfileUpdate} loading={saving} className="mr-2" />
                                <Button label="Cancel" icon="pi pi-times" onClick={loadProfileData} className="p-button-outlined" disabled={saving} />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Contact Information Tab */}
                    <TabPanel header="Contact" leftIcon="pi pi-phone mr-2">
                        <div className="grid">
                            {/* Mobile Phone */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="mobilePhone" className="block mb-2 font-semibold">
                                    Mobile Phone
                                </label>
                                <InputText
                                    id="mobilePhone"
                                    value={profileData.contact.mobilePhone || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            contact: { ...profileData.contact, mobilePhone: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="+233 XX XXX XXXX"
                                />
                            </div>

                            {/* Home Phone */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="homePhone" className="block mb-2 font-semibold">
                                    Home Phone
                                </label>
                                <InputText
                                    id="homePhone"
                                    value={profileData.contact.homePhone || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            contact: { ...profileData.contact, homePhone: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Email */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="email" className="block mb-2 font-semibold">
                                    Email Address
                                </label>
                                <InputText
                                    id="email"
                                    type="email"
                                    value={profileData.contact.email || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            contact: { ...profileData.contact, email: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Primary Language */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="primaryLanguage" className="block mb-2 font-semibold">
                                    Primary Language
                                </label>
                                <InputText
                                    id="primaryLanguage"
                                    value={profileData.contact.primaryLanguage || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            contact: { ...profileData.contact, primaryLanguage: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Secondary Language */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="secondaryLanguage" className="block mb-2 font-semibold">
                                    Secondary Language
                                </label>
                                <InputText
                                    id="secondaryLanguage"
                                    value={profileData.contact.secondaryLanguage || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            contact: { ...profileData.contact, secondaryLanguage: e.target.value }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12">
                                <Divider />
                                <Button label="Save Changes" icon="pi pi-save" onClick={handleProfileUpdate} loading={saving} className="mr-2" />
                                <Button label="Cancel" icon="pi pi-times" onClick={loadProfileData} className="p-button-outlined" disabled={saving} />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Medical Information Tab */}
                    <TabPanel header="Medical & Emergency" leftIcon="pi pi-heart mr-2">
                        <div className="grid">
                            {/* Blood Group */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="bloodGroup" className="block mb-2 font-semibold">
                                    Blood Group
                                </label>
                                <Dropdown
                                    id="bloodGroup"
                                    value={profileData.medicalInfo?.bloodGroup}
                                    options={bloodGroupOptions}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: { ...profileData.medicalInfo, bloodGroup: e.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Select Blood Group"
                                />
                            </div>

                            {/* Allergies */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="allergies" className="block mb-2 font-semibold">
                                    Allergies
                                </label>
                                <Chips
                                    id="allergies"
                                    value={profileData.medicalInfo?.allergies}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: { ...profileData.medicalInfo, allergies: e.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Add allergies"
                                />
                            </div>

                            {/* Chronic Conditions */}
                            <div className="col-12">
                                <label htmlFor="chronicConditions" className="block mb-2 font-semibold">
                                    Chronic Conditions
                                </label>
                                <Chips
                                    id="chronicConditions"
                                    value={profileData.medicalInfo?.chronicConditions}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: { ...profileData.medicalInfo, chronicConditions: e.value }
                                        })
                                    }
                                    className="w-full"
                                    placeholder="Add chronic conditions"
                                />
                            </div>

                            <div className="col-12">
                                <Divider />
                                <h4>Emergency Contact</h4>
                            </div>

                            {/* Emergency Contact Name */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyName" className="block mb-2 font-semibold">
                                    Contact Name
                                </label>
                                <InputText
                                    id="emergencyName"
                                    value={profileData.medicalInfo?.emergencyContact?.name || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: {
                                                ...profileData.medicalInfo,
                                                emergencyContact: {
                                                    ...profileData.medicalInfo?.emergencyContact,
                                                    name: e.target.value
                                                }
                                            }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Emergency Contact Relationship */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyRelationship" className="block mb-2 font-semibold">
                                    Relationship
                                </label>
                                <InputText
                                    id="emergencyRelationship"
                                    value={profileData.medicalInfo?.emergencyContact?.relationship || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: {
                                                ...profileData.medicalInfo,
                                                emergencyContact: {
                                                    ...profileData.medicalInfo?.emergencyContact,
                                                    relationship: e.target.value
                                                }
                                            }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Emergency Contact Phone */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyPhone" className="block mb-2 font-semibold">
                                    Phone Number
                                </label>
                                <InputText
                                    id="emergencyPhone"
                                    value={profileData.medicalInfo?.emergencyContact?.phone || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: {
                                                ...profileData.medicalInfo,
                                                emergencyContact: {
                                                    ...profileData.medicalInfo?.emergencyContact,
                                                    phone: e.target.value
                                                }
                                            }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            {/* Emergency Alternate Phone */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="emergencyAlternatePhone" className="block mb-2 font-semibold">
                                    Alternate Phone
                                </label>
                                <InputText
                                    id="emergencyAlternatePhone"
                                    value={profileData.medicalInfo?.emergencyContact?.alternatePhone || ''}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            medicalInfo: {
                                                ...profileData.medicalInfo,
                                                emergencyContact: {
                                                    ...profileData.medicalInfo?.emergencyContact,
                                                    alternatePhone: e.target.value
                                                }
                                            }
                                        })
                                    }
                                    className="w-full"
                                />
                            </div>

                            <div className="col-12">
                                <Divider />
                                <Button label="Save Changes" icon="pi pi-save" onClick={handleProfileUpdate} loading={saving} className="mr-2" />
                                <Button label="Cancel" icon="pi pi-times" onClick={loadProfileData} className="p-button-outlined" disabled={saving} />
                            </div>
                        </div>
                    </TabPanel>

                    {/* Employee Information Tab (for non-students) */}
                    {personCategory !== 'student' && personCategory !== 'parent' && (
                        <TabPanel header="Professional" leftIcon="pi pi-briefcase mr-2">
                            <div className="grid">
                                {/* Marital Status */}
                                <div className="col-12 md:col-6">
                                    <label htmlFor="maritalStatus" className="block mb-2 font-semibold">
                                        Marital Status
                                    </label>
                                    <Dropdown
                                        id="maritalStatus"
                                        value={profileData.employeeInfo?.maritalStatus}
                                        options={maritalStatusOptions}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    maritalStatus: e.value
                                                }
                                            })
                                        }
                                        className="w-full"
                                        placeholder="Select Marital Status"
                                    />
                                </div>

                                {/* TIN Number */}
                                <div className="col-12 md:col-6">
                                    <label htmlFor="tinNumber" className="block mb-2 font-semibold">
                                        TIN Number
                                    </label>
                                    <InputText
                                        id="tinNumber"
                                        value={profileData.employeeInfo?.tinNumber || ''}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    tinNumber: e.target.value
                                                }
                                            })
                                        }
                                        className="w-full"
                                    />
                                </div>

                                {/* SSNIT Number */}
                                <div className="col-12 md:col-6">
                                    <label htmlFor="ssnitNumber" className="block mb-2 font-semibold">
                                        SSNIT Number
                                    </label>
                                    <InputText
                                        id="ssnitNumber"
                                        value={profileData.employeeInfo?.ssnitNumber || ''}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    ssnitNumber: e.target.value
                                                }
                                            })
                                        }
                                        className="w-full"
                                    />
                                </div>

                                <div className="col-12">
                                    <Divider />
                                    <h4>Bank Information</h4>
                                </div>

                                {/* Account Name */}
                                <div className="col-12 md:col-4">
                                    <label htmlFor="accountName" className="block mb-2 font-semibold">
                                        Account Name
                                    </label>
                                    <InputText
                                        id="accountName"
                                        value={profileData.employeeInfo?.bankInfo?.accountName || ''}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    bankInfo: {
                                                        ...profileData.employeeInfo?.bankInfo,
                                                        accountName: e.target.value
                                                    }
                                                }
                                            })
                                        }
                                        className="w-full"
                                    />
                                </div>

                                {/* Account Number */}
                                <div className="col-12 md:col-4">
                                    <label htmlFor="accountNumber" className="block mb-2 font-semibold">
                                        Account Number
                                    </label>
                                    <InputText
                                        id="accountNumber"
                                        value={profileData.employeeInfo?.bankInfo?.accountNumber || ''}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    bankInfo: {
                                                        ...profileData.employeeInfo?.bankInfo,
                                                        accountNumber: e.target.value
                                                    }
                                                }
                                            })
                                        }
                                        className="w-full"
                                    />
                                </div>

                                {/* Branch */}
                                <div className="col-12 md:col-4">
                                    <label htmlFor="branch" className="block mb-2 font-semibold">
                                        Branch
                                    </label>
                                    <InputText
                                        id="branch"
                                        value={profileData.employeeInfo?.bankInfo?.branch || ''}
                                        onChange={(e) =>
                                            setProfileData({
                                                ...profileData,
                                                employeeInfo: {
                                                    ...profileData.employeeInfo,
                                                    bankInfo: {
                                                        ...profileData.employeeInfo?.bankInfo,
                                                        branch: e.target.value
                                                    }
                                                }
                                            })
                                        }
                                        className="w-full"
                                    />
                                </div>

                                <div className="col-12">
                                    <Divider />
                                    <Button label="Save Changes" icon="pi pi-save" onClick={handleProfileUpdate} loading={saving} className="mr-2" />
                                    <Button label="Cancel" icon="pi pi-times" onClick={loadProfileData} className="p-button-outlined" disabled={saving} />
                                </div>
                            </div>
                        </TabPanel>
                    )}

                    {/* Security Tab */}
                    <TabPanel header="Security" leftIcon="pi pi-lock mr-2">
                        <div className="grid">
                            <div className="col-12">
                                <Message severity="info" text="Change your password to keep your account secure" />
                            </div>

                            {/* Current Password */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="currentPassword" className="block mb-2 font-semibold">
                                    Current Password <span className="text-red-500">*</span>
                                </label>
                                <Password
                                    id="currentPassword"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    className="w-full"
                                    inputClassName="w-full"
                                    feedback={false}
                                    toggleMask
                                />
                            </div>

                            <div className="col-12"></div>

                            {/* New Password */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="newPassword" className="block mb-2 font-semibold">
                                    New Password <span className="text-red-500">*</span>
                                </label>
                                <Password id="newPassword" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} className="w-full" inputClassName="w-full" toggleMask />
                            </div>

                            {/* Confirm Password */}
                            <div className="col-12 md:col-6">
                                <label htmlFor="confirmPassword" className="block mb-2 font-semibold">
                                    Confirm New Password <span className="text-red-500">*</span>
                                </label>
                                <Password
                                    id="confirmPassword"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full"
                                    inputClassName="w-full"
                                    feedback={false}
                                    toggleMask
                                />
                            </div>

                            <div className="col-12">
                                <Divider />
                                <Button label="Change Password" icon="pi pi-lock" onClick={handlePasswordChange} loading={saving} severity="warning" />
                            </div>

                            <div className="col-12 mt-4">
                                <Panel header="Danger Zone" toggleable className="border-red-500">
                                    <Message severity="warn" text="Deleting your account is permanent and cannot be undone. All your data will be removed." className="w-full mb-3" />
                                    <Button label="Delete Account" icon="pi pi-trash" onClick={confirmDeleteAccount} className="p-button-danger" disabled={saving} />
                                </Panel>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Card>
        </>
    );
}
