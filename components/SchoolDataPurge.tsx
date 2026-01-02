'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ProgressBar } from 'primereact/progressbar';
import { Steps } from 'primereact/steps';
import { Message } from 'primereact/message';
import { Divider } from 'primereact/divider';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { Panel } from 'primereact/panel';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '@/context/AuthContext';
import LocalDBService from '@/lib/services/localDBService';

// -------------------- TYPES --------------------
interface School {
    _id: string;
    name: string;
    code?: string;
    domain?: string;
    createdAt: string;
}

interface DeletionPreview {
    school: {
        id: string;
        name: string;
        code?: string;
    };
    collections: {
        name: string;
        displayName: string;
        count: number;
        description: string;
    }[];
    totalRecords: number;
    estimatedTime: string;
    warnings: string[];
}

interface PurgeResult {
    success: boolean;
    schoolId: string;
    schoolName: string;
    deletedCollections: {
        name: string;
        deletedCount: number;
    }[];
    totalDeleted: number;
    timestamp: string;
    auditLogId: string;
    error?: string;
}

// -------------------- CONSTANTS --------------------
const CONFIRMATION_PHRASE = 'DELETE SCHOOL DATA';
const REQUIRED_ROLE = 'proprietor'; // Only proprietors can access this
const STEP_ITEMS = [{ label: 'Select School' }, { label: 'Review Data' }, { label: 'Confirm Identity' }, { label: 'Final Confirmation' }, { label: 'Execute' }];

// -------------------- COMPONENT --------------------
const SchoolDataPurge: React.FC = () => {
    const { user } = useAuth();
    const toast = useRef<Toast>(null);

    // State
    const [schools, setSchools] = useState<School[]>([]);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [deletionPreview, setDeletionPreview] = useState<DeletionPreview | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [purgeInProgress, setPurgeInProgress] = useState(false);
    const [purgeProgress, setPurgeProgress] = useState(0);
    const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null);

    // Confirmation state
    const [confirmationPhrase, setConfirmationPhrase] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [passwordVerified, setPasswordVerified] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<boolean[]>([]);
    const [finalConfirmChecked, setFinalConfirmChecked] = useState(false);

    // Access control
    const hasAccess = user?.personCategory === REQUIRED_ROLE;

    // -------------------- DATA FETCHING --------------------
    const fetchSchools = useCallback(async () => {
        if (!hasAccess) return;

        setLoading(true);
        try {
            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch('/api/schools', {
                headers
            });
            if (response.ok) {
                const data = await response.json();
                console.log(data);
                setSchools(data.schools || []);
            } else {
                showToast('error', 'Error', 'Failed to fetch schools');
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to fetch schools');
        } finally {
            setLoading(false);
        }
    }, [hasAccess]);

    useEffect(() => {
        fetchSchools();
    }, [fetchSchools]);

    // -------------------- PREVIEW DELETION --------------------
    const fetchDeletionPreview = async (schoolId: string) => {
        setPreviewLoading(true);
        try {
            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`/api/admin/school-purge/preview?schoolId=${schoolId}`, {
                headers
            });
            if (response.ok) {
                const data = await response.json();
                setDeletionPreview(data);
                setAcknowledgedWarnings(new Array(data.warnings.length).fill(false));
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.error || 'Failed to fetch deletion preview');
            }
        } catch (error) {
            showToast('error', 'Error', 'Failed to fetch deletion preview');
        } finally {
            setPreviewLoading(false);
        }
    };

    // -------------------- PASSWORD VERIFICATION --------------------
    const verifyPassword = async () => {
        if (!adminPassword) {
            setPasswordError('Password is required');
            return;
        }

        setLoading(true);
        setPasswordError('');

        try {
            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch('/api/auth/verify-password', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: user?._id,
                    password: adminPassword
                })
            });

            if (response.ok) {
                setPasswordVerified(true);
                showToast('success', 'Verified', 'Identity confirmed');
            } else {
                const error = await response.json();
                setPasswordError(error.message || 'Invalid password');
                setPasswordVerified(false);
            }
        } catch (error) {
            setPasswordError('Verification failed');
            setPasswordVerified(false);
        } finally {
            setLoading(false);
        }
    };

    // -------------------- EXECUTE PURGE --------------------
    const executePurge = async () => {
        if (!selectedSchool || !deletionPreview) return;

        setPurgeInProgress(true);
        setPurgeProgress(0);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setPurgeProgress((prev) => Math.min(prev + Math.random() * 15, 90));
        }, 500);

        try {
            const authToken = await LocalDBService.getLocalDataItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch('/api/admin/school-purge', {
                method: 'DELETE',
                headers,
                body: JSON.stringify({
                    schoolId: selectedSchool._id,
                    schoolName: selectedSchool.name,
                    adminId: user?._id,
                    adminUsername: user?.username,
                    confirmationPhrase: confirmationPhrase
                })
            });

            clearInterval(progressInterval);
            setPurgeProgress(100);

            const result = await response.json();

            if (response.ok && result.success) {
                setPurgeResult(result);
                showToast('success', 'Purge Complete', `All data for "${selectedSchool.name}" has been permanently deleted`);
                // Remove the deleted school from the list
                setSchools((prev) => prev.filter((s) => s._id !== selectedSchool._id));
            } else {
                setPurgeResult({
                    success: false,
                    schoolId: selectedSchool._id,
                    schoolName: selectedSchool.name,
                    deletedCollections: [],
                    totalDeleted: 0,
                    timestamp: new Date().toISOString(),
                    auditLogId: '',
                    error: result.error || 'Purge operation failed'
                });
                showToast('error', 'Purge Failed', result.error || 'Failed to purge school data');
            }
        } catch (error: any) {
            clearInterval(progressInterval);
            setPurgeResult({
                success: false,
                schoolId: selectedSchool._id,
                schoolName: selectedSchool.name,
                deletedCollections: [],
                totalDeleted: 0,
                timestamp: new Date().toISOString(),
                auditLogId: '',
                error: error.message || 'Network error during purge'
            });
            showToast('error', 'Error', 'Failed to execute purge operation');
        } finally {
            setPurgeInProgress(false);
        }
    };

    // -------------------- NAVIGATION --------------------
    const canProceedToStep = (step: number): boolean => {
        switch (step) {
            case 0:
                return true;
            case 1:
                return !!selectedSchool && !!deletionPreview;
            case 2:
                return acknowledgedWarnings.every((ack) => ack);
            case 3:
                return passwordVerified;
            case 4:
                return confirmationPhrase === CONFIRMATION_PHRASE && finalConfirmChecked;
            default:
                return false;
        }
    };

    const handleSchoolSelect = (school: School) => {
        setSelectedSchool(school);
        resetConfirmations();
        fetchDeletionPreview(school._id);
    };

    const nextStep = () => {
        if (activeStep < 4 && canProceedToStep(activeStep + 1)) {
            setActiveStep(activeStep + 1);
        }
    };

    const prevStep = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const resetConfirmations = () => {
        setConfirmationPhrase('');
        setAdminPassword('');
        setPasswordVerified(false);
        setPasswordError('');
        setAcknowledgedWarnings([]);
        setFinalConfirmChecked(false);
        setPurgeResult(null);
    };

    const resetAll = () => {
        setSelectedSchool(null);
        setDeletionPreview(null);
        setActiveStep(0);
        resetConfirmations();
        fetchSchools();
    };

    // -------------------- HELPERS --------------------
    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 5000 });
    };

    const formatNumber = (num: number): string => {
        return num.toLocaleString();
    };

    // -------------------- ACCESS DENIED VIEW --------------------
    if (!hasAccess) {
        return (
            <div className="p-4">
                <Card className="bg-red-50 border-red-200">
                    <div className="text-center py-6">
                        <i className="pi pi-lock text-6xl text-red-500 mb-4"></i>
                        <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
                        <p className="text-red-600">
                            This administrative function is restricted to top-level administrators only.
                            <br />
                            If you believe you should have access, please contact system administration.
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    // -------------------- PURGE COMPLETE VIEW --------------------
    if (purgeResult) {
        return (
            <div className="p-4">
                <Toast ref={toast} />
                <Card className={purgeResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    <div className="text-center py-6">
                        <i className={`pi ${purgeResult.success ? 'pi-check-circle text-green-500' : 'pi-times-circle text-red-500'} text-6xl mb-4`}></i>
                        <h2 className={`text-2xl font-bold ${purgeResult.success ? 'text-green-700' : 'text-red-700'} mb-2`}>{purgeResult.success ? 'School Data Purged Successfully' : 'Purge Operation Failed'}</h2>

                        {purgeResult.success ? (
                            <>
                                <p className="text-gray-600 mb-4">
                                    All data associated with <strong>"{purgeResult.schoolName}"</strong> has been permanently and irreversibly deleted.
                                </p>

                                <div className="bg-white border border-gray-200 rounded-lg p-4 mx-auto max-w-lg text-left mb-4">
                                    <h4 className="font-semibold mb-2">Deletion Summary</h4>
                                    <ul className="text-sm text-gray-600">
                                        <li>
                                            <strong>Total Records Deleted:</strong> {formatNumber(purgeResult.totalDeleted)}
                                        </li>
                                        <li>
                                            <strong>Timestamp:</strong> {new Date(purgeResult.timestamp).toLocaleString()}
                                        </li>
                                        <li>
                                            <strong>Audit Log ID:</strong> <code className="bg-gray-100 px-1 rounded">{purgeResult.auditLogId}</code>
                                        </li>
                                    </ul>

                                    {purgeResult.deletedCollections.length > 0 && (
                                        <div className="mt-3">
                                            <h5 className="font-medium text-sm mb-1">Collections Purged:</h5>
                                            <div className="flex flex-wrap gap-1">
                                                {purgeResult.deletedCollections.map((col) => (
                                                    <Tag key={col.name} value={`${col.name}: ${col.deletedCount}`} severity="success" className="text-xs" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Message severity="warn" text="This action has been permanently recorded in the audit log and cannot be reversed." className="mb-4" />
                            </>
                        ) : (
                            <p className="text-red-600 mb-4">{purgeResult.error || 'An error occurred during the purge operation. The school data may be partially intact.'}</p>
                        )}

                        <Button label="Return to School Management" icon="pi pi-arrow-left" onClick={resetAll} className={purgeResult.success ? 'p-button-success' : 'p-button-secondary'} />
                    </div>
                </Card>
            </div>
        );
    }

    // -------------------- MAIN RENDER --------------------
    return (
        <div className="p-4">
            <Toast ref={toast} />
            <ConfirmDialog />

            {/* Header Warning */}
            <Card className="mb-4 bg-red-50 border-red-300 border-2">
                <div className="flex align-items-center gap-3">
                    <i className="pi pi-exclamation-triangle text-4xl text-red-600"></i>
                    <div>
                        <h2 className="text-xl font-bold text-red-700 m-0">⚠️ DESTRUCTIVE OPERATION - SCHOOL DATA PURGE</h2>
                        <p className="text-red-600 m-0 mt-1">This tool permanently deletes ALL data associated with a school. This action is IRREVERSIBLE and cannot be undone. Use with extreme caution.</p>
                    </div>
                </div>
            </Card>

            {/* Progress Steps */}
            <Card className="mb-4">
                <Steps model={STEP_ITEMS} activeIndex={activeStep} readOnly className="mb-4" />
            </Card>

            {/* Step Content */}
            <Card className="mb-4">
                {/* Step 0: Select School */}
                {activeStep === 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            <i className="pi pi-building mr-2"></i>
                            Step 1: Select School to Purge
                        </h3>

                        <Message severity="warn" text="Select the school whose data you want to permanently delete. All associated data will be removed." className="mb-4 w-full" />

                        <div className="field">
                            <label htmlFor="school" className="font-medium block mb-2">
                                Select School
                            </label>
                            <Dropdown
                                id="school"
                                value={selectedSchool}
                                options={schools}
                                onChange={(e) => handleSchoolSelect(e.value)}
                                optionLabel="name"
                                placeholder="-- Select a school --"
                                className="w-full"
                                filter
                                filterBy="name,code"
                                showClear
                                disabled={loading}
                                itemTemplate={(option) => (
                                    <div className="flex justify-content-between align-items-center">
                                        <span>{option.name}</span>
                                        {option.code && <Tag value={option.code} severity="info" className="ml-2" />}
                                    </div>
                                )}
                            />
                        </div>

                        {selectedSchool && previewLoading && (
                            <div className="mt-4">
                                <ProgressBar mode="indeterminate" style={{ height: '6px' }} />
                                <p className="text-center text-gray-500 mt-2">Loading deletion preview...</p>
                            </div>
                        )}

                        {selectedSchool && deletionPreview && (
                            <div className="mt-4 p-3 bg-yellow-50 border-round border-1 border-yellow-300">
                                <p className="m-0 text-yellow-800">
                                    <i className="pi pi-info-circle mr-2"></i>
                                    School "<strong>{selectedSchool.name}</strong>" selected. Click "Next" to review the data that will be deleted.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Review Data */}
                {activeStep === 1 && deletionPreview && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            <i className="pi pi-list mr-2"></i>
                            Step 2: Review Data to be Deleted
                        </h3>

                        <Message severity="error" text={`The following ${formatNumber(deletionPreview.totalRecords)} records will be PERMANENTLY DELETED. This cannot be undone.`} className="mb-4 w-full" />

                        {/* School Info */}
                        <Panel header="School Information" className="mb-3">
                            <div className="grid">
                                <div className="col-12 md:col-4">
                                    <label className="text-500 text-sm">School Name</label>
                                    <p className="font-semibold m-0">{deletionPreview.school.name}</p>
                                </div>
                                <div className="col-12 md:col-4">
                                    <label className="text-500 text-sm">School ID</label>
                                    <p className="font-mono text-sm m-0">{deletionPreview.school.id}</p>
                                </div>
                                <div className="col-12 md:col-4">
                                    <label className="text-500 text-sm">Estimated Time</label>
                                    <p className="font-semibold m-0">{deletionPreview.estimatedTime}</p>
                                </div>
                            </div>
                        </Panel>

                        {/* Collections Table */}
                        <Panel header={`Data Collections (${deletionPreview.collections.length})`} className="mb-3">
                            <DataTable value={deletionPreview.collections} size="small" stripedRows>
                                <Column field="displayName" header="Collection" />
                                <Column field="count" header="Records" body={(row) => <Tag value={formatNumber(row.count)} severity={row.count > 1000 ? 'danger' : row.count > 100 ? 'warning' : 'info'} />} />
                                <Column field="description" header="Description" className="text-sm text-500" />
                            </DataTable>

                            <Divider />

                            <div className="flex justify-content-between align-items-center">
                                <span className="font-semibold">Total Records to Delete:</span>
                                <Tag value={formatNumber(deletionPreview.totalRecords)} severity="danger" className="text-lg px-3 py-2" />
                            </div>
                        </Panel>

                        {/* Warnings */}
                        {deletionPreview.warnings.length > 0 && (
                            <Panel header="⚠️ Warnings - Must Acknowledge All" className="mb-3">
                                <div className="flex flex-column gap-3">
                                    {deletionPreview.warnings.map((warning, index) => (
                                        <div key={index} className="flex align-items-start gap-2 p-2 bg-red-50 border-round">
                                            <Checkbox
                                                inputId={`warning-${index}`}
                                                checked={acknowledgedWarnings[index] || false}
                                                onChange={(e) => {
                                                    const newAck = [...acknowledgedWarnings];
                                                    newAck[index] = e.checked || false;
                                                    setAcknowledgedWarnings(newAck);
                                                }}
                                                className="mt-1"
                                            />
                                            <label htmlFor={`warning-${index}`} className="text-red-700 cursor-pointer">
                                                {warning}
                                            </label>
                                        </div>
                                    ))}
                                </div>

                                {!acknowledgedWarnings.every((ack) => ack) && <Message severity="warn" text="You must acknowledge all warnings to proceed" className="mt-3 w-full" />}
                            </Panel>
                        )}
                    </div>
                )}

                {/* Step 2: Verify Identity */}
                {activeStep === 2 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            <i className="pi pi-shield mr-2"></i>
                            Step 3: Verify Your Identity
                        </h3>

                        <Message severity="info" text="For security purposes, please re-enter your password to confirm your identity." className="mb-4 w-full" />

                        <div className="p-4 bg-gray-50 border-round max-w-30rem mx-auto">
                            <div className="field">
                                <label htmlFor="admin-user" className="font-medium block mb-2">
                                    Administrator
                                </label>
                                <InputText id="admin-user" value={user?.username || ''} disabled className="w-full" />
                            </div>

                            <div className="field">
                                <label htmlFor="admin-password" className="font-medium block mb-2">
                                    Enter Your Password
                                </label>
                                <Password id="admin-password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} feedback={false} toggleMask className="w-full" inputClassName="w-full" disabled={passwordVerified} />
                                {passwordError && <small className="p-error block mt-1">{passwordError}</small>}
                            </div>

                            {!passwordVerified ? (
                                <Button label="Verify Identity" icon="pi pi-check" onClick={verifyPassword} loading={loading} disabled={!adminPassword} className="w-full" />
                            ) : (
                                <Message severity="success" text="Identity verified successfully" className="w-full" />
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Final Confirmation */}
                {activeStep === 3 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            <i className="pi pi-exclamation-circle mr-2 text-red-600"></i>
                            Step 4: Final Confirmation
                        </h3>

                        <div className="p-4 bg-red-100 border-2 border-red-500 border-round mb-4">
                            <h4 className="text-red-700 mt-0 mb-2">🚨 POINT OF NO RETURN</h4>
                            <p className="text-red-700 m-0">
                                You are about to <strong>PERMANENTLY DELETE</strong> all data for school "<strong>{selectedSchool?.name}</strong>".
                                <br />
                                This includes <strong>{formatNumber(deletionPreview?.totalRecords || 0)}</strong> records across <strong>{deletionPreview?.collections.length}</strong> collections.
                                <br />
                                <br />
                                <strong>THIS ACTION CANNOT BE UNDONE.</strong>
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 border-round max-w-30rem mx-auto">
                            <div className="field">
                                <label className="font-medium block mb-2">
                                    Type <code className="bg-red-100 text-red-700 px-2 py-1 border-round">{CONFIRMATION_PHRASE}</code> to confirm:
                                </label>
                                <InputText
                                    value={confirmationPhrase}
                                    onChange={(e) => setConfirmationPhrase(e.target.value.toUpperCase())}
                                    placeholder={CONFIRMATION_PHRASE}
                                    className={`w-full ${confirmationPhrase === CONFIRMATION_PHRASE ? 'border-green-500' : ''}`}
                                />
                                {confirmationPhrase && confirmationPhrase !== CONFIRMATION_PHRASE && <small className="p-error block mt-1">Phrase does not match</small>}
                                {confirmationPhrase === CONFIRMATION_PHRASE && <small className="text-green-600 block mt-1">✓ Confirmation phrase matches</small>}
                            </div>

                            <Divider />

                            <div className="field-checkbox">
                                <Checkbox inputId="final-confirm" checked={finalConfirmChecked} onChange={(e) => setFinalConfirmChecked(e.checked || false)} />
                                <label htmlFor="final-confirm" className="ml-2 text-red-700 font-medium">
                                    I understand this action is IRREVERSIBLE and I accept full responsibility for this deletion.
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Execute */}
                {activeStep === 4 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            <i className="pi pi-trash mr-2 text-red-600"></i>
                            Step 5: Execute Purge
                        </h3>

                        {!purgeInProgress ? (
                            <div className="text-center">
                                <div className="p-4 bg-red-100 border-2 border-red-500 border-round mb-4 max-w-30rem mx-auto">
                                    <i className="pi pi-exclamation-triangle text-6xl text-red-600 mb-3"></i>
                                    <h4 className="text-red-700 m-0">Final Warning</h4>
                                    <p className="text-red-700">
                                        Clicking the button below will permanently delete all data for "<strong>{selectedSchool?.name}</strong>".
                                    </p>
                                </div>

                                <Button
                                    label="🗑️ PERMANENTLY DELETE ALL SCHOOL DATA"
                                    icon="pi pi-trash"
                                    className="p-button-danger p-button-lg"
                                    onClick={() => {
                                        confirmDialog({
                                            message: `This is your LAST CHANCE to cancel. Are you absolutely sure you want to delete ALL data for "${selectedSchool?.name}"?`,
                                            header: '⚠️ FINAL CONFIRMATION',
                                            icon: 'pi pi-exclamation-triangle',
                                            acceptClassName: 'p-button-danger',
                                            acceptLabel: 'YES, DELETE EVERYTHING',
                                            rejectLabel: 'CANCEL',
                                            accept: executePurge
                                        });
                                    }}
                                />

                                <p className="text-gray-500 text-sm mt-3">
                                    <i className="pi pi-info-circle mr-1"></i>
                                    This action will be logged for audit purposes.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center p-4">
                                <i className="pi pi-spin pi-spinner text-4xl text-red-600 mb-3"></i>
                                <h4 className="text-red-700">Purge Operation In Progress</h4>
                                <p className="text-gray-600 mb-4">Please do not close this page or navigate away.</p>

                                <ProgressBar value={purgeProgress} showValue className="mb-3" style={{ height: '20px' }} />

                                <p className="text-sm text-gray-500">Deleting school data... This may take a few minutes.</p>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* Navigation Buttons */}
            {!purgeInProgress && !purgeResult && (
                <div className="flex justify-content-between">
                    <Button label="Cancel" icon="pi pi-times" className="p-button-secondary" onClick={resetAll} />

                    <div className="flex gap-2">
                        {activeStep > 0 && <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" onClick={prevStep} />}

                        {activeStep < 4 && (
                            <Button
                                label="Next"
                                icon="pi pi-arrow-right"
                                iconPos="right"
                                onClick={nextStep}
                                disabled={
                                    (activeStep === 0 && (!selectedSchool || !deletionPreview)) ||
                                    (activeStep === 1 && !acknowledgedWarnings.every((ack) => ack)) ||
                                    (activeStep === 2 && !passwordVerified) ||
                                    (activeStep === 3 && (confirmationPhrase !== CONFIRMATION_PHRASE || !finalConfirmChecked))
                                }
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolDataPurge;
