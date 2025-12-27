'use client';

import React, { useEffect, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputMask } from 'primereact/inputmask';
import { Steps } from 'primereact/steps';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useRouter } from 'next/navigation';
import { IRegistrationData } from '@/types/general';
import localDBService from '@/lib/services/localDBService';



const SchoolRegistration: React.FC = () => {
    const router = useRouter();
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState<IRegistrationData>({
        schoolName: '',
        schoolType: 'private',
        dateFounded: null,
        motto: '',
        siteName: '',
        siteDescription: '',
        schoolLevel: 'basic',
        tertiaryType: 'n/a',
        sitePhone: '',
        siteEmail: '',
        street: '',
        town: '',
        constituency: '',
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: null,
        gender: 'male',
        mobilePhone: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
    });
    useEffect(() => {
        const reloadPageData=async ()=>{
            const localSavedData = await localDBService.getLocalDataItem('registrationData');
            setFormData({ ...formData,...localSavedData });
        }
        reloadPageData().catch(console.error);
    }, []);
    const steps = [
        { label: 'School Info', icon: 'pi pi-building' },
        { label: 'Site Details', icon: 'pi pi-map-marker' },
        { label: 'Proprietor', icon: 'pi pi-user' },
        { label: 'Account', icon: 'pi pi-shield' }
    ];

    const schoolTypeOptions = [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
        { label: 'Shared', value: 'shared' }
    ];

    const schoolLevelOptions = [
        { label: 'Early Childhood', value: 'early_child' },
        { label: 'Basic', value: 'basic' },
        { label: 'Junior High', value: 'junior' },
        { label: 'Senior High', value: 'senior' },
        { label: 'Tertiary', value: 'tertiary' }
    ];

    const tertiaryTypeOptions = [
        { label: 'Not Applicable', value: 'n/a' },
        { label: 'University', value: 'university' },
        { label: 'Nursing Training', value: 'nursing_training' },
        { label: 'Teacher Training', value: 'teacher_training' },
        { label: 'Vocational', value: 'vocational' }
    ];

    const genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' }
    ];

    const handleInputChange = (field: keyof IRegistrationData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0: // School Info
                if (!formData.schoolName.trim()) {
                    setError('School name is required');
                    return false;
                }
                if (!formData.schoolType) {
                    setError('School type is required');
                    return false;
                }
                localDBService.setLocalDataItem(formData,'registrationData').catch(console.error);
                break;
            case 1: // Site Details
                if (!formData.siteName.trim()) {
                    setError('Site name is required');
                    return false;
                }
                if (!formData.siteDescription.trim()) {
                    setError('Site description is required');
                    return false;
                }
                if (!formData.schoolLevel) {
                    setError('School level is required');
                    return false;
                }
                if (formData.siteEmail && !/^\S+@\S+\.\S+$/.test(formData.siteEmail)) {
                    setError('Please provide a valid email address');
                    return false;
                }
                localDBService.setLocalDataItem(formData, 'registrationData').catch(console.error);
                break;
            case 2: // Proprietor
                if (!formData.firstName.trim()) {
                    setError('First name is required');
                    return false;
                }
                if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
                    setError('Please provide a valid email address');
                    return false;
                }
                localDBService.setLocalDataItem(formData, 'registrationData').catch(console.error);
                break;
            case 3: // Account
                if (!formData.username.trim()) {
                    setError('Username is required');
                    return false;
                }
                if (formData.username.length < 4) {
                    setError('Username must be at least 4 characters');
                    return false;
                }
                if (!formData.password) {
                    setError('Password is required');
                    return false;
                }
                if (formData.password.length < 6) {
                    setError('Password must be at least 6 characters');
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Passwords do not match');
                    return false;
                }
                localDBService.setLocalDataItem(formData, 'registrationData').catch(console.error);
                break;
        }
        setError(null);
        return true;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!validateStep(activeStep)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/school/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log(data);
            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            setSuccess(true);
            setTimeout(() => {
                localDBService.setLocalDataItem({} as IRegistrationData,'registrationData')
                router.push('/auth/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div className="grid">
                        <div className="col-12">
                            <h3 className="text-2xl font-bold mb-3">School Information</h3>
                            <p className="text-600 mb-4">Tell us about your school</p>
                        </div>
                        <div className="col-12">
                            <label htmlFor="schoolName" className="block text-900 font-semibold mb-2">
                                School Name <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="schoolName"
                                value={formData.schoolName}
                                onChange={(e) => handleInputChange('schoolName', e.target.value)}
                                className="w-full"
                                placeholder="Enter school name"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="schoolType" className="block text-900 font-semibold mb-2">
                                School Type <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="schoolType"
                                value={formData.schoolType}
                                options={schoolTypeOptions}
                                onChange={(e) => handleInputChange('schoolType', e.value)}
                                className="w-full"
                                placeholder="Select school type"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="dateFounded" className="block text-900 font-semibold mb-2">
                                Date Founded
                            </label>
                            <Calendar
                                id="dateFounded"
                                value={formData.dateFounded}
                                onChange={(e) => handleInputChange('dateFounded', e.value)}
                                className="w-full"
                                placeholder="Select date"
                                dateFormat="dd/mm/yy"
                                showIcon
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="motto" className="block text-900 font-semibold mb-2">
                                School Motto
                            </label>
                            <InputText
                                id="motto"
                                value={formData.motto}
                                onChange={(e) => handleInputChange('motto', e.target.value)}
                                className="w-full"
                                placeholder="Enter school motto"
                            />
                        </div>
                    </div>
                );

            case 1:
                return (
                    <div className="grid">
                        <div className="col-12">
                            <h3 className="text-2xl font-bold text-900 mb-3">School Site Details</h3>
                            <p className="text-600 mb-4">Provide information about the main campus</p>
                        </div>
                        <div className="col-12">
                            <label htmlFor="siteName" className="block text-900 font-semibold mb-2">
                                Site Name <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="siteName"
                                value={formData.siteName}
                                onChange={(e) => handleInputChange('siteName', e.target.value)}
                                className="w-full"
                                placeholder="e.g., Main Campus, Headquarters"
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="siteDescription" className="block text-900 font-semibold mb-2">
                                Site Description <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="siteDescription"
                                value={formData.siteDescription}
                                onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                                className="w-full"
                                placeholder="e.g., Primary learning center for grades 1-6"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="schoolLevel" className="block text-900 font-semibold mb-2">
                                School Level <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="schoolLevel"
                                value={formData.schoolLevel}
                                options={schoolLevelOptions}
                                onChange={(e) => handleInputChange('schoolLevel', e.value)}
                                className="w-full"
                                placeholder="Select school level"
                            />
                        </div>
                        {formData.schoolLevel === 'tertiary' && (
                            <div className="col-12 md:col-6">
                                <label htmlFor="tertiaryType" className="block text-900 font-semibold mb-2">
                                    Tertiary Type
                                </label>
                                <Dropdown
                                    id="tertiaryType"
                                    value={formData.tertiaryType}
                                    options={tertiaryTypeOptions}
                                    onChange={(e) => handleInputChange('tertiaryType', e.value)}
                                    className="w-full"
                                />
                            </div>
                        )}
                        <div className="col-12 md:col-6">
                            <label htmlFor="sitePhone" className="block text-900 font-semibold mb-2">
                                Phone Number
                            </label>
                            <InputMask
                                id="sitePhone"
                                value={formData.sitePhone}
                                onChange={(e) => handleInputChange('sitePhone', e.value)}
                                mask="(999) 999-9999"
                                className="w-full"
                                placeholder="(123) 456-7890"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="siteEmail" className="block text-900 font-semibold mb-2">
                                Email Address
                            </label>
                            <InputText
                                id="siteEmail"
                                type="email"
                                value={formData.siteEmail}
                                onChange={(e) => handleInputChange('siteEmail', e.target.value)}
                                className="w-full"
                                placeholder="school@example.com"
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="street" className="block text-900 font-semibold mb-2">
                                Street Address
                            </label>
                            <InputText
                                id="street"
                                value={formData.street}
                                onChange={(e) => handleInputChange('street', e.target.value)}
                                className="w-full"
                                placeholder="Street address"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="town" className="block text-900 font-semibold mb-2">
                                Town/City
                            </label>
                            <InputText
                                id="town"
                                value={formData.town}
                                onChange={(e) => handleInputChange('town', e.target.value)}
                                className="w-full"
                                placeholder="Town or city"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="constituency" className="block text-900 font-semibold mb-2">
                                Constituency
                            </label>
                            <InputText
                                id="constituency"
                                value={formData.constituency}
                                onChange={(e) => handleInputChange('constituency', e.target.value)}
                                className="w-full"
                                placeholder="Constituency"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="grid">
                        <div className="col-12">
                            <h3 className="text-2xl font-bold text-900 mb-3">Proprietor Information</h3>
                            <p className="text-600 mb-4">Your personal details as the school owner</p>
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="firstName" className="block text-900 font-semibold mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="firstName"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="w-full"
                                placeholder="First name"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="middleName" className="block text-900 font-semibold mb-2">
                                Middle Name
                            </label>
                            <InputText
                                id="middleName"
                                value={formData.middleName}
                                onChange={(e) => handleInputChange('middleName', e.target.value)}
                                className="w-full"
                                placeholder="Middle name"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="lastName" className="block text-900 font-semibold mb-2">
                                Last Name
                            </label>
                            <InputText
                                id="lastName"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="w-full"
                                placeholder="Last name"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="dateOfBirth" className="block text-900 font-semibold mb-2">
                                Date of Birth
                            </label>
                            <Calendar
                                id="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={(e) => handleInputChange('dateOfBirth', e.value)}
                                className="w-full"
                                placeholder="Select date"
                                dateFormat="dd/mm/yy"
                                showIcon
                                maxDate={new Date()}
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="gender" className="block text-900 font-semibold mb-2">
                                Gender
                            </label>
                            <Dropdown
                                id="gender"
                                value={formData.gender}
                                options={genderOptions}
                                onChange={(e) => handleInputChange('gender', e.value)}
                                className="w-full"
                                placeholder="Select gender"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="mobilePhone" className="block text-900 font-semibold mb-2">
                                Mobile Phone
                            </label>
                            <InputMask
                                id="mobilePhone"
                                value={formData.mobilePhone}
                                onChange={(e) => handleInputChange('mobilePhone', e.value)}
                                mask="(999) 999-9999"
                                className="w-full"
                                placeholder="(123) 456-7890"
                            />
                        </div>
                        <div className="col-12">
                            <label htmlFor="email" className="block text-900 font-semibold mb-2">
                                Email Address
                            </label>
                            <InputText
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full"
                                placeholder="your.email@example.com"
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="grid">
                        <div className="col-12">
                            <h3 className="text-2xl font-bold text-900 mb-3">Account Information</h3>
                            <p className="text-600 mb-4">Create your login credentials</p>
                        </div>
                        <div className="col-12">
                            <label htmlFor="username" className="block text-900 font-semibold mb-2">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                id="username"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                className="w-full"
                                placeholder="Choose a username"
                            />
                            <small className="text-600">Username must be at least 4 characters</small>
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="password" className="block text-900 font-semibold mb-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <Password
                                id="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Enter password"
                                toggleMask
                                feedback={true}
                            />
                            <small className="text-600">Password must be at least 6 characters</small>
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="confirmPassword" className="block text-900 font-semibold mb-2">
                                Confirm Password <span className="text-red-500">*</span>
                            </label>
                            <Password
                                id="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                className="w-full"
                                inputClassName="w-full"
                                placeholder="Confirm password"
                                toggleMask
                                feedback={false}
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (success) {
        return (
            <div className="flex align-items-center justify-content-center min-h-screen p-4 surface-ground">
                <Card className="w-full max-w-30rem">
                    <div className="text-center">
                        <i className="pi pi-check-circle text-green-500 text-6xl mb-4"></i>
                        <h2 className="text-3xl font-bold text-900 mb-3">Registration Successful!</h2>
                        <p className="text-600 mb-4">
                            Your school has been registered successfully. Redirecting to login...
                        </p>
                        <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-3 md:p-6 surface-ground">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-5 p-4">
                    <div className="flex align-items-center justify-content-center mb-3">
                        <i className="pi pi-graduation-cap text-primary text-5xl mr-3"></i>
                        <h1 className="text-4xl md:text-5xl font-bold text-900 m-0">School Registration</h1>
                    </div>
                    <p className="text-600 text-lg md:text-xl m-0">
                        Set up your school management system in just a few steps
                    </p>
                </div>

                {/* Steps */}
                <Card className="mb-4">
                    <Steps
                        model={steps}
                        activeIndex={activeStep}
                        readOnly={false}
                        className="mb-4"
                    />
                </Card>

                {/* Form Content */}
                <Card>
                    {error && (
                        <Message
                            severity="error"
                            text={error}
                            className="w-full mb-4"
                        />
                    )}

                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-content-between mt-5 pt-4 border-top-1 surface-border">
                        <Button
                            label="Back"
                            icon="pi pi-arrow-left"
                            onClick={handleBack}
                            disabled={activeStep === 0 || loading}
                            className="p-button-outlined"
                        />

                        {activeStep < steps.length - 1 ? (
                            <Button
                                label="Next"
                                icon="pi pi-arrow-right"
                                iconPos="right"
                                onClick={handleNext}
                                disabled={loading}
                            />
                        ) : (
                            <Button
                                label={loading ? 'Submitting...' : 'Submit Registration'}
                                icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                                onClick={handleSubmit}
                                disabled={loading}
                                className="p-button-success"
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-top-1 surface-border">
                        <p className="text-600 m-0">
                            Already have an account?{' '}
                            <a
                                onClick={() => router.push('/auth/login')}
                                className="font-semibold text-primary cursor-pointer hover:underline"
                            >
                                Login here
                            </a>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SchoolRegistration;
