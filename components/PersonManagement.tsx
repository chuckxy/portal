'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { Tag } from 'primereact/tag';
import { Avatar } from 'primereact/avatar';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { FileUpload } from 'primereact/fileupload';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Chip } from 'primereact/chip';
import { Menu } from 'primereact/menu';
import { useAuth } from '@/context/AuthContext';
import AddPersonForm from './AddPersonForm';

interface Person {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    username: string;
    personCategory: string;
    isActive: boolean;
    photoLink?: string;
    contact?: {
        email?: string;
        mobilePhone?: string;
    };
    studentInfo?: {
        studentId?: string;
        currentClass?: any;
        faculty?: any;
    };
    employeeInfo?: {
        customId?: string;
        jobTitle?: string;
        teachingDepartment?: any;
    };
    school?: any;
    schoolSite?: any;
    createdAt?: string;
}

const PersonManagement: React.FC = () => {
    const { user } = useAuth();
    const toastRef = useRef<Toast>(null);
    const menuRef = useRef<Menu>(null);
    const fileUploadRef = useRef<FileUpload>(null);

    const [persons, setPersons] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [bulkUploadVisible, setBulkUploadVisible] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const categoryOptions = [
        { label: 'All Categories', value: '' },
        { label: 'Proprietor', value: 'proprietor' },
        { label: 'Headmaster', value: 'headmaster' },
        { label: 'Teacher', value: 'teacher' },
        { label: 'Finance Officer', value: 'finance' },
        { label: 'Student', value: 'student' },
        { label: 'Parent', value: 'parent' },
        { label: 'Librarian', value: 'librarian' },
        { label: 'Administrator', value: 'admin' }
    ];

    const statusOptions = [
        { label: 'All Status', value: '' },
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
    ];

    useEffect(() => {
        fetchPersons();
    }, [user, categoryFilter, statusFilter]);

    const fetchPersons = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);
            if (categoryFilter) params.append('category', categoryFilter);
            if (statusFilter) params.append('isActive', statusFilter);

            const response = await fetch(`/api/persons?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setPersons(data.persons || []);
            } else {
                showToast('error', 'Error', 'Failed to fetch persons');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while fetching persons');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 4000 });
    };

    const openNew = () => {
        setSelectedPerson(null);
        setDialogVisible(true);
    };

    const editPerson = (person: Person) => {
        setSelectedPerson(person);
        setDialogVisible(true);
    };

    const confirmDeletePerson = (person: Person) => {
        confirmDialog({
            message: `Are you sure you want to delete ${person.firstName} ${person.lastName}?`,
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            accept: () => deletePerson(person._id)
        });
    };

    const deletePerson = async (id: string) => {
        try {
            const response = await fetch(`/api/persons/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('success', 'Success', 'Person deleted successfully');
                fetchPersons();
            } else {
                const error = await response.json();
                showToast('error', 'Error', error.message || 'Failed to delete person');
            }
        } catch (error) {
            showToast('error', 'Error', 'An error occurred while deleting person');
        }
    };

    const onFormSuccess = () => {
        setDialogVisible(false);
        setSelectedPerson(null);
        fetchPersons();
    };

    const onFormCancel = () => {
        setDialogVisible(false);
        setSelectedPerson(null);
    };

    // Export to CSV
    const exportCSV = () => {
        const data = persons.map((p) => ({
            'First Name': p.firstName,
            'Middle Name': p.middleName || '',
            'Last Name': p.lastName || '',
            Username: p.username,
            Category: p.personCategory,
            Email: p.contact?.email || '',
            Phone: p.contact?.mobilePhone || '',
            'Student ID': p.studentInfo?.studentId || '',
            'Employee ID': p.employeeInfo?.customId || '',
            Status: p.isActive ? 'Active' : 'Inactive'
        }));

        const csv = [
            Object.keys(data[0]).join(','),
            ...data.map((row) =>
                Object.values(row)
                    .map((v) => `"${v}"`)
                    .join(',')
            )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `persons_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Handle bulk upload
    const handleBulkUpload = async (event: any) => {
        const file = event.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter((line) => line.trim());
                const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

                const persons = lines.slice(1).map((line) => {
                    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
                    const person: any = {};
                    headers.forEach((header, index) => {
                        const value = values[index];
                        if (value) {
                            // Map CSV headers to person fields
                            switch (header.toLowerCase()) {
                                case 'firstname':
                                case 'first name':
                                    person.firstName = value;
                                    break;
                                case 'middlename':
                                case 'middle name':
                                    person.middleName = value;
                                    break;
                                case 'lastname':
                                case 'last name':
                                    person.lastName = value;
                                    break;
                                case 'username':
                                    person.username = value;
                                    break;
                                case 'password':
                                    person.password = value;
                                    break;
                                case 'email':
                                    if (!person.contact) person.contact = {};
                                    person.contact.email = value;
                                    break;
                                case 'phone':
                                case 'mobile':
                                    if (!person.contact) person.contact = {};
                                    person.contact.mobilePhone = value;
                                    break;
                                case 'category':
                                case 'personcategory':
                                    person.personCategory = value.toLowerCase();
                                    break;
                                case 'gender':
                                    person.gender = value.toLowerCase();
                                    break;
                                case 'dateofbirth':
                                case 'dob':
                                    person.dateOfBirth = new Date(value);
                                    break;
                            }
                        }
                    });
                    return person;
                });

                // Send to bulk upload API
                const response = await fetch('/api/persons/bulk-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        persons,
                        school: user?.school,
                        schoolSite: user?.schoolSite
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    showToast('success', 'Success', data.message);
                    setBulkUploadVisible(false);
                    fetchPersons();

                    // Show detailed results
                    if (data.result.errors.length > 0) {
                        console.log('Upload errors:', data.result.errors);
                    }
                } else {
                    const error = await response.json();
                    showToast('error', 'Error', error.message || 'Bulk upload failed');
                }
            } catch (error) {
                showToast('error', 'Error', 'Failed to process CSV file');
            }
        };
        reader.readAsText(file);
    };

    // Download CSV template
    const downloadTemplate = () => {
        const template = [
            'FirstName,MiddleName,LastName,Username,Password,Email,Phone,Category,Gender,DateOfBirth',
            'John,M,Doe,jdoe,password123,john@example.com,+2331234567890,student,male,2005-01-15',
            'Jane,,Smith,jsmith,password123,jane@example.com,+2330987654321,teacher,female,1990-05-20'
        ].join('\n');

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'persons_upload_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Column Templates
    const nameBodyTemplate = (rowData: Person) => {
        return (
            <div className="flex align-items-center gap-2">
                <Avatar image={rowData.photoLink || '/default-avatar.png'} size="normal" shape="circle" className="border-2 border-primary" />
                <div>
                    <div className="font-semibold text-900">
                        {rowData.firstName} {rowData.middleName} {rowData.lastName}
                    </div>
                    <small className="text-500">{rowData.username}</small>
                </div>
            </div>
        );
    };

    const categoryBodyTemplate = (rowData: Person) => {
        const severityMap: any = {
            proprietor: 'danger',
            headmaster: 'danger',
            teacher: 'info',
            finance: 'warning',
            student: 'success',
            parent: 'secondary',
            librarian: 'info',
            admin: 'warning'
        };

        return <Tag value={rowData.personCategory.toUpperCase()} severity={severityMap[rowData.personCategory] || 'info'} />;
    };

    const statusBodyTemplate = (rowData: Person) => {
        return <Tag value={rowData.isActive ? 'Active' : 'Inactive'} severity={rowData.isActive ? 'success' : 'danger'} icon={rowData.isActive ? 'pi pi-check' : 'pi pi-times'} />;
    };

    const contactBodyTemplate = (rowData: Person) => {
        return (
            <div>
                {rowData.contact?.email && (
                    <div className="text-sm mb-1">
                        <i className="pi pi-envelope mr-1 text-500"></i>
                        {rowData.contact.email}
                    </div>
                )}
                {rowData.contact?.mobilePhone && (
                    <div className="text-sm">
                        <i className="pi pi-phone mr-1 text-500"></i>
                        {rowData.contact.mobilePhone}
                    </div>
                )}
            </div>
        );
    };

    const roleInfoBodyTemplate = (rowData: Person) => {
        if (rowData.personCategory === 'student' && rowData.studentInfo) {
            return (
                <div className="text-sm">
                    {rowData.studentInfo.studentId && (
                        <div className="mb-1">
                            <strong>ID:</strong> {rowData.studentInfo.studentId}
                        </div>
                    )}
                    {rowData.studentInfo.currentClass && (
                        <div>
                            <strong>Class:</strong> {rowData.studentInfo.currentClass.className || rowData.studentInfo.currentClass}
                        </div>
                    )}
                </div>
            );
        } else if (rowData.employeeInfo) {
            return (
                <div className="text-sm">
                    {rowData.employeeInfo.customId && (
                        <div className="mb-1">
                            <strong>ID:</strong> {rowData.employeeInfo.customId}
                        </div>
                    )}
                    {rowData.employeeInfo.jobTitle && (
                        <div>
                            <strong>Title:</strong> {rowData.employeeInfo.jobTitle}
                        </div>
                    )}
                </div>
            );
        }
        return <span className="text-500">-</span>;
    };

    const actionBodyTemplate = (rowData: Person) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-pencil" rounded text severity="info" tooltip="Edit" tooltipOptions={{ position: 'top' }} onClick={() => editPerson(rowData)} />
                <Button icon="pi pi-trash" rounded text severity="danger" tooltip="Delete" tooltipOptions={{ position: 'top' }} onClick={() => confirmDeletePerson(rowData)} />
            </div>
        );
    };

    // Toolbar
    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Add Person" icon="pi pi-plus" severity="success" onClick={openNew} />
                <Button label="Bulk Upload" icon="pi pi-upload" severity="info" outlined onClick={() => setBulkUploadVisible(true)} />
                <Button label="Download Template" icon="pi pi-download" severity="help" outlined onClick={downloadTemplate} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Export" icon="pi pi-file-export" severity="info" outlined onClick={exportCSV} />
                <Button icon="pi pi-refresh" rounded outlined onClick={fetchPersons} tooltip="Refresh" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const header = (
        <div className="flex flex-wrap gap-3 align-items-center justify-content-between">
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search persons..." className="w-full" />
                </span>
                <Dropdown value={categoryFilter} options={categoryOptions} onChange={(e) => setCategoryFilter(e.value)} placeholder="Filter by Category" className="w-full md:w-14rem" />
                <Dropdown value={statusFilter} options={statusOptions} onChange={(e) => setStatusFilter(e.value)} placeholder="Filter by Status" className="w-full md:w-12rem" />
            </div>
            <div className="flex gap-2 align-items-center">
                <Chip label={`Total: ${persons.length}`} icon="pi pi-users" />
                <Chip label={`Active: ${persons.filter((p) => p.isActive).length}`} icon="pi pi-check-circle" className="bg-green-100 text-green-900" />
            </div>
        </div>
    );

    return (
        <div>
            <Toast ref={toastRef} />
            <ConfirmDialog />

            <Toolbar className="mb-4" start={leftToolbarTemplate} end={rightToolbarTemplate} />

            <DataTable
                value={persons}
                loading={loading}
                header={header}
                globalFilter={globalFilter}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25, 50]}
                emptyMessage="No persons found"
                className="p-datatable-gridlines"
                stripedRows
                showGridlines
                responsiveLayout="scroll"
            >
                <Column field="firstName" header="Name" body={nameBodyTemplate} sortable style={{ minWidth: '250px' }} />
                <Column field="personCategory" header="Category" body={categoryBodyTemplate} sortable style={{ minWidth: '120px' }} />
                <Column header="Contact" body={contactBodyTemplate} style={{ minWidth: '200px' }} />
                <Column header="Role Info" body={roleInfoBodyTemplate} style={{ minWidth: '180px' }} />
                <Column field="isActive" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }} />
                <Column header="Actions" body={actionBodyTemplate} exportable={false} style={{ minWidth: '120px' }} />
            </DataTable>

            {/* Add/Edit Person Dialog */}
            <Dialog visible={dialogVisible} style={{ width: '90vw', maxWidth: '1200px' }} onHide={onFormCancel} modal dismissableMask blockScroll>
                <AddPersonForm onSuccess={onFormSuccess} onCancel={onFormCancel} editData={selectedPerson} />
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog header="Bulk Upload Persons" visible={bulkUploadVisible} style={{ width: '600px' }} onHide={() => setBulkUploadVisible(false)} modal>
                <div className="grid">
                    <div className="col-12">
                        <div className="bg-blue-50 border-round p-3 mb-3">
                            <h4 className="text-blue-900 mt-0 mb-2">
                                <i className="pi pi-info-circle mr-2"></i>
                                How to use Bulk Upload
                            </h4>
                            <ol className="text-blue-800 text-sm pl-3 mb-0">
                                <li>Download the CSV template</li>
                                <li>Fill in person details following the template format</li>
                                <li>Required fields: FirstName, Username, Password, Category</li>
                                <li>Upload the completed CSV file</li>
                            </ol>
                        </div>
                    </div>

                    <div className="col-12">
                        <FileUpload ref={fileUploadRef} name="bulkUpload" accept=".csv" maxFileSize={5000000} customUpload uploadHandler={handleBulkUpload} auto chooseLabel="Select CSV File" className="w-full" />
                    </div>

                    <div className="col-12">
                        <Button label="Download Template" icon="pi pi-download" className="w-full" severity="help" outlined onClick={downloadTemplate} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default PersonManagement;
