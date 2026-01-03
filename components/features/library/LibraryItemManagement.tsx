'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Toolbar } from 'primereact/toolbar';
import { FilterMatchMode } from 'primereact/api';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Calendar } from 'primereact/calendar';
import { Rating } from 'primereact/rating';
import { Chips } from 'primereact/chips';
import { TabView, TabPanel } from 'primereact/tabview';
import { Image } from 'primereact/image';
import { Chip } from 'primereact/chip';
import { ProgressBar } from 'primereact/progressbar';
import { useAuth } from '@/context/AuthContext';

interface Author {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    alias?: string;
}

interface Classification {
    classCode?: string;
    divisionCode?: string;
    sectionCode?: string;
    description?: string;
}

interface StockAdjustment {
    adjustmentType: 'addition' | 'removal' | 'damage' | 'loss' | 'donation';
    quantity: number;
    remarks?: string;
    adjustedBy: any;
    date: Date;
}

interface SiteInventory {
    _id?: string;
    school: any;
    site: any;
    quantity: number;
    availableQuantity: number;
    location?: string;
    shelfNumber?: string;
    dateAdded: Date;
    stockAdjustments: StockAdjustment[];
}

interface Review {
    user: any;
    rating: number;
    review?: string;
    date: Date;
}

interface LibraryItem {
    _id?: string;
    isbn?: string;
    title: string;
    subtitle?: string;
    category?: string;
    itemType: 'book' | 'journal' | 'magazine' | 'dvd' | 'ebook' | 'reference' | 'periodical' | 'other';
    authors: Author[];
    publicationDate?: Date;
    publisher?: string;
    edition?: string;
    language: string;
    pages?: number;
    classification: Classification;
    description?: string;
    subjects: string[];
    coverImagePath?: string;
    eBookLink?: string;
    lccn?: string;
    provider: 'Google Books' | 'Open Library' | 'DBooks' | 'Local User Add' | 'IArchive' | 'Other';
    siteInventory: SiteInventory[];
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
    isActive: boolean;
    totalQuantity?: number;
    totalAvailable?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const emptyLibraryItem: Partial<LibraryItem> = {
    title: '',
    itemType: 'book',
    language: 'English',
    provider: 'Local User Add',
    authors: [{ firstName: '', lastName: '' }],
    subjects: [],
    classification: {},
    siteInventory: [],
    reviews: [],
    isActive: true
};

export default function LibraryItemManagement() {
    const { user } = useAuth();
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [detailDialogVisible, setDetailDialogVisible] = useState(false);
    const [stockDialogVisible, setStockDialogVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Partial<LibraryItem>>(emptyLibraryItem);
    const [selectedItemForDetail, setSelectedItemForDetail] = useState<LibraryItem | null>(null);
    const [selectedItemForStock, setSelectedItemForStock] = useState<LibraryItem | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        itemType: { value: null, matchMode: FilterMatchMode.EQUALS },
        category: { value: null, matchMode: FilterMatchMode.CONTAINS },
        isActive: { value: null, matchMode: FilterMatchMode.EQUALS }
    });

    // Stock adjustment form
    const [stockAdjustment, setStockAdjustment] = useState({
        siteId: '',
        adjustmentType: 'addition' as 'addition' | 'removal' | 'damage' | 'loss' | 'donation',
        quantity: 0,
        remarks: ''
    });

    const toast = useRef<Toast>(null);

    const itemTypeOptions = [
        { label: 'Book', value: 'book', icon: 'pi pi-book' },
        { label: 'Journal', value: 'journal', icon: 'pi pi-file' },
        { label: 'Magazine', value: 'magazine', icon: 'pi pi-bookmark' },
        { label: 'DVD', value: 'dvd', icon: 'pi pi-play' },
        { label: 'E-Book', value: 'ebook', icon: 'pi pi-tablet' },
        { label: 'Reference', value: 'reference', icon: 'pi pi-database' },
        { label: 'Periodical', value: 'periodical', icon: 'pi pi-calendar' },
        { label: 'Other', value: 'other', icon: 'pi pi-ellipsis-h' }
    ];

    const providerOptions = [
        { label: 'Local User Add', value: 'Local User Add' },
        { label: 'Google Books', value: 'Google Books' },
        { label: 'Open Library', value: 'Open Library' },
        { label: 'DBooks', value: 'DBooks' },
        { label: 'Internet Archive', value: 'IArchive' },
        { label: 'Other', value: 'Other' }
    ];

    const adjustmentTypeOptions = [
        { label: 'Addition', value: 'addition', icon: 'pi pi-plus-circle', color: 'success' },
        { label: 'Removal', value: 'removal', icon: 'pi pi-minus-circle', color: 'warning' },
        { label: 'Damage', value: 'damage', icon: 'pi pi-exclamation-triangle', color: 'danger' },
        { label: 'Loss', value: 'loss', icon: 'pi pi-times-circle', color: 'danger' },
        { label: 'Donation', value: 'donation', icon: 'pi pi-gift', color: 'info' }
    ];

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (!user) return;
            // Build URL with site filter if user has a school site
            const libraryItemsUrl = user?.schoolSite ? `/api/library-items?site=${user.schoolSite}` : '/api/library-items';
            console.log('Fetching library items from:', libraryItemsUrl);
            const [itemsResponse, sitesResponse] = await Promise.all([fetch(libraryItemsUrl), fetch('/api/sites')]);

            const itemsData = await itemsResponse.json();
            const sitesData = await sitesResponse.json();

            setLibraryItems(itemsData);
            setSites(sitesData.sites || sitesData);
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load data',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setSelectedItem(emptyLibraryItem);
        setDialogVisible(true);
    };

    const editItem = (item: LibraryItem) => {
        setSelectedItem({ ...item });
        setDialogVisible(true);
    };

    const viewItemDetails = (item: LibraryItem) => {
        setSelectedItemForDetail(item);
        setDetailDialogVisible(true);
    };

    const openStockAdjustment = (item: LibraryItem) => {
        setSelectedItemForStock(item);
        setStockAdjustment({
            siteId: '',
            adjustmentType: 'addition',
            quantity: 0,
            remarks: ''
        });
        setStockDialogVisible(true);
    };

    const hideDialog = () => {
        setDialogVisible(false);
        setSelectedItem(emptyLibraryItem);
    };

    const saveLibraryItem = async () => {
        try {
            const method = selectedItem._id ? 'PUT' : 'POST';
            const url = selectedItem._id ? `/api/library-items/${selectedItem._id}` : '/api/library-items';

            // Add siteInventory for new items
            const itemToSave = { ...selectedItem };
            if (!selectedItem._id && user?.school && user?.schoolSite) {
                itemToSave.siteInventory = [
                    {
                        school: user.school,
                        site: user.schoolSite,
                        quantity: 1,
                        availableQuantity: 1,
                        dateAdded: new Date(),
                        stockAdjustments: [
                            {
                                adjustmentType: 'addition',
                                quantity: 1,
                                remarks: 'Initial inventory',
                                adjustedBy: user.id,
                                date: new Date()
                            }
                        ]
                    }
                ];
            }
            setLoading(true);
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemToSave)
            });

            if (!response.ok) throw new Error('Failed to save library item');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `Library item ${selectedItem._id ? 'updated' : 'created'} successfully`,
                life: 3000
            });

            hideDialog();
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to save library item',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (item: LibraryItem) => {
        confirmDialog({
            message: `Are you sure you want to delete "${item.title}"?`,
            header: 'Confirm Deletion',
            icon: 'pi pi-exclamation-triangle',
            accept: () => deleteItem(item)
        });
    };

    const deleteItem = async (item: LibraryItem) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/library-items/${item._id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete library item');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Library item deleted successfully',
                life: 3000
            });

            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete library item',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const submitStockAdjustment = async () => {
        if (!selectedItemForStock || !stockAdjustment.siteId || stockAdjustment.quantity <= 0) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please fill all required fields',
                life: 3000
            });
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/api/library-items/${selectedItemForStock._id}/adjust-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stockAdjustment)
            });

            if (!response.ok) throw new Error('Failed to adjust stock');

            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Stock adjusted successfully',
                life: 3000
            });

            setStockDialogVisible(false);
            fetchData();
        } catch (error) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to adjust stock',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters = { ...filters };
        _filters['global'].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    // Author management
    const addAuthor = () => {
        setSelectedItem({
            ...selectedItem,
            authors: [...(selectedItem.authors || []), { firstName: '', lastName: '' }]
        });
    };

    const updateAuthor = (index: number, field: keyof Author, value: string) => {
        const newAuthors = [...(selectedItem.authors || [])];
        newAuthors[index] = { ...newAuthors[index], [field]: value };
        setSelectedItem({ ...selectedItem, authors: newAuthors });
    };

    const removeAuthor = (index: number) => {
        const newAuthors = (selectedItem.authors || []).filter((_, i) => i !== index);
        setSelectedItem({ ...selectedItem, authors: newAuthors });
    };

    // Template functions
    const coverImageBodyTemplate = (rowData: LibraryItem) => {
        return (
            <div className="flex align-items-center justify-content-center">
                {rowData.coverImagePath ? (
                    <Image src={rowData.coverImagePath} alt={rowData.title} width="40" height="60" preview />
                ) : (
                    <div className="flex align-items-center justify-content-center bg-gray-200 border-round" style={{ width: '40px', height: '60px' }}>
                        <i className="pi pi-book text-gray-500 text-xl" />
                    </div>
                )}
            </div>
        );
    };

    const titleBodyTemplate = (rowData: LibraryItem) => {
        return (
            <div>
                <div className="font-semibold text-900">{rowData.title}</div>
                {rowData.subtitle && <div className="text-sm text-600 mt-1">{rowData.subtitle}</div>}
            </div>
        );
    };

    const authorsBodyTemplate = (rowData: LibraryItem) => {
        if (!rowData.authors || rowData.authors.length === 0) return 'N/A';

        return rowData.authors
            .map((author) => {
                const parts = [author.firstName, author.middleName, author.lastName].filter(Boolean);
                return parts.join(' ') || author.alias || 'Unknown';
            })
            .join(', ');
    };

    const itemTypeBodyTemplate = (rowData: LibraryItem) => {
        const typeOption = itemTypeOptions.find((opt) => opt.value === rowData.itemType);
        return <Tag value={rowData.itemType.toUpperCase()} icon={typeOption?.icon} rounded />;
    };

    const ratingBodyTemplate = (rowData: LibraryItem) => {
        return (
            <div className="flex align-items-center gap-2">
                <Rating value={rowData.averageRating || 0} readOnly cancel={false} stars={5} />
                <span className="text-sm text-600">({rowData.totalReviews || 0})</span>
            </div>
        );
    };

    const inventoryBodyTemplate = (rowData: LibraryItem) => {
        const total = rowData.totalQuantity || 0;
        const available = rowData.totalAvailable || 0;
        const percentage = total > 0 ? (available / total) * 100 : 0;

        return (
            <div className="flex align-items-center gap-2">
                <span className={available === 0 ? 'text-red-600 font-semibold' : available < 5 ? 'text-orange-600 font-semibold' : ''}>
                    {available} / {total}
                </span>
                {total > 0 && <ProgressBar value={percentage} showValue={false} style={{ width: '60px', height: '8px' }} color={percentage === 0 ? '#ef4444' : percentage < 25 ? '#f97316' : '#10b981'} />}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: LibraryItem) => {
        return <Tag value={rowData.isActive ? 'ACTIVE' : 'INACTIVE'} severity={rowData.isActive ? 'success' : 'danger'} rounded />;
    };

    const actionBodyTemplate = (rowData: LibraryItem) => {
        return (
            <div className="flex gap-2">
                <Button icon="pi pi-eye" rounded text severity="info" onClick={() => viewItemDetails(rowData)} tooltip="View Details" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-pencil" rounded text severity="success" onClick={() => editItem(rowData)} tooltip="Edit" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-box" rounded text severity="warning" onClick={() => openStockAdjustment(rowData)} tooltip="Adjust Stock" tooltipOptions={{ position: 'top' }} />
                <Button icon="pi pi-trash" rounded text severity="danger" onClick={() => confirmDelete(rowData)} tooltip="Delete" tooltipOptions={{ position: 'top' }} />
            </div>
        );
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <Button label="Add Item" icon="pi pi-plus" severity="success" onClick={openNew} />
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return (
            <div className="flex gap-2">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Search items..." />
                </span>
            </div>
        );
    };

    const dialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" text onClick={hideDialog} />
            <Button label={selectedItem._id ? 'Update' : 'Save'} icon="pi pi-check" onClick={saveLibraryItem} disabled={!selectedItem.title || !selectedItem.itemType || loading} loading={loading} />
        </div>
    );

    const stockDialogFooter = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancel" icon="pi pi-times" text onClick={() => setStockDialogVisible(false)} />
            <Button label="Submit" icon="pi pi-check" onClick={submitStockAdjustment} disabled={!stockAdjustment.siteId || stockAdjustment.quantity <= 0 || loading} loading={loading} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="mb-4">
                <h2 className="text-3xl font-bold text-900 mb-2">Library Item Management</h2>
                <p className="text-600 text-lg">Manage books, journals, media, and digital resources across all library sites</p>
            </div>

            <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate} />

            <DataTable
                value={libraryItems}
                loading={loading}
                paginator
                rows={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
                filters={filters}
                globalFilterFields={['title', 'subtitle', 'category', 'isbn']}
                emptyMessage="No library items found."
                responsiveLayout="scroll"
                stripedRows
                showGridlines
            >
                <Column body={coverImageBodyTemplate} header="Cover" style={{ width: '100px' }} />
                <Column body={titleBodyTemplate} header="Title" sortable style={{ minWidth: '250px' }} />
                <Column body={authorsBodyTemplate} header="Authors" style={{ minWidth: '200px' }} />
                <Column body={itemTypeBodyTemplate} header="Type" sortable filter filterElement={<Dropdown options={itemTypeOptions} placeholder="All Types" className="p-column-filter" showClear />} style={{ minWidth: '140px' }} />
                <Column field="category" header="Category" sortable style={{ minWidth: '150px' }} />
                <Column body={ratingBodyTemplate} header="Rating" sortable style={{ minWidth: '180px' }} />
                <Column body={inventoryBodyTemplate} header="Available / Total" sortable style={{ minWidth: '160px' }} />
                <Column body={statusBodyTemplate} header="Status" sortable filter style={{ minWidth: '120px' }} />
                <Column body={actionBodyTemplate} header="Actions" exportable={false} style={{ minWidth: '180px' }} />
            </DataTable>

            {/* Add/Edit Dialog */}
            <Dialog
                visible={dialogVisible}
                style={{ width: '900px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-book text-primary text-2xl" />
                        <span className="font-bold text-xl">{selectedItem._id ? 'Edit Library Item' : 'Add Library Item'}</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={dialogFooter}
                onHide={hideDialog}
                maximizable
            >
                <TabView>
                    <TabPanel header="Basic Information" leftIcon="pi pi-info-circle mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-8">
                                <div className="field mb-4">
                                    <label htmlFor="title" className="font-semibold text-900 mb-2 block">
                                        Title <span className="text-red-500">*</span>
                                    </label>
                                    <InputText id="title" value={selectedItem.title || ''} onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })} className={!selectedItem.title ? 'p-invalid' : ''} />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="itemType" className="font-semibold text-900 mb-2 block">
                                        Item Type <span className="text-red-500">*</span>
                                    </label>
                                    <Dropdown id="itemType" value={selectedItem.itemType} options={itemTypeOptions} onChange={(e) => setSelectedItem({ ...selectedItem, itemType: e.value })} className={!selectedItem.itemType ? 'p-invalid' : ''} />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="field mb-4">
                                    <label htmlFor="subtitle" className="font-semibold text-900 mb-2 block">
                                        Subtitle
                                    </label>
                                    <InputText id="subtitle" value={selectedItem.subtitle || ''} onChange={(e) => setSelectedItem({ ...selectedItem, subtitle: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12">
                                <Divider align="left">
                                    <div className="inline-flex align-items-center">
                                        <i className="pi pi-users mr-2"></i>
                                        <b>Authors</b>
                                    </div>
                                </Divider>

                                {(selectedItem.authors || []).map((author, index) => (
                                    <Card key={index} className="mb-3 shadow-1">
                                        <div className="grid">
                                            <div className="col-12 md:col-4">
                                                <div className="field">
                                                    <label className="font-semibold text-sm">First Name</label>
                                                    <InputText value={author.firstName || ''} onChange={(e) => updateAuthor(index, 'firstName', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="col-12 md:col-3">
                                                <div className="field">
                                                    <label className="font-semibold text-sm">Middle Name</label>
                                                    <InputText value={author.middleName || ''} onChange={(e) => updateAuthor(index, 'middleName', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="col-12 md:col-4">
                                                <div className="field">
                                                    <label className="font-semibold text-sm">Last Name</label>
                                                    <InputText value={author.lastName || ''} onChange={(e) => updateAuthor(index, 'lastName', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="col-12 md:col-1 flex align-items-end">
                                                <Button icon="pi pi-trash" severity="danger" text onClick={() => removeAuthor(index)} />
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                <Button label="Add Author" icon="pi pi-plus" text onClick={addAuthor} />
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="isbn" className="font-semibold text-900 mb-2 block">
                                        ISBN
                                    </label>
                                    <InputText id="isbn" value={selectedItem.isbn || ''} onChange={(e) => setSelectedItem({ ...selectedItem, isbn: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="category" className="font-semibold text-900 mb-2 block">
                                        Category
                                    </label>
                                    <InputText id="category" value={selectedItem.category || ''} onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="field mb-4">
                                    <label htmlFor="description" className="font-semibold text-900 mb-2 block">
                                        Description
                                    </label>
                                    <InputTextarea id="description" value={selectedItem.description || ''} onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })} rows={4} />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="field mb-4">
                                    <label htmlFor="subjects" className="font-semibold text-900 mb-2 block">
                                        Subjects / Keywords
                                    </label>
                                    <Chips id="subjects" value={selectedItem.subjects || []} onChange={(e) => setSelectedItem({ ...selectedItem, subjects: e.value || [] })} separator="," />
                                    <small className="text-600">Press Enter or comma to add tags</small>
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel header="Publication Details" leftIcon="pi pi-building mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="publisher" className="font-semibold text-900 mb-2 block">
                                        Publisher
                                    </label>
                                    <InputText id="publisher" value={selectedItem.publisher || ''} onChange={(e) => setSelectedItem({ ...selectedItem, publisher: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="publicationDate" className="font-semibold text-900 mb-2 block">
                                        Publication Date
                                    </label>
                                    <Calendar
                                        id="publicationDate"
                                        value={selectedItem.publicationDate ? new Date(selectedItem.publicationDate) : null}
                                        onChange={(e) => setSelectedItem({ ...selectedItem, publicationDate: e.value as Date })}
                                        dateFormat="yy-mm-dd"
                                        showIcon
                                    />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="edition" className="font-semibold text-900 mb-2 block">
                                        Edition
                                    </label>
                                    <InputText id="edition" value={selectedItem.edition || ''} onChange={(e) => setSelectedItem({ ...selectedItem, edition: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="language" className="font-semibold text-900 mb-2 block">
                                        Language <span className="text-red-500">*</span>
                                    </label>
                                    <InputText id="language" value={selectedItem.language || 'English'} onChange={(e) => setSelectedItem({ ...selectedItem, language: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="pages" className="font-semibold text-900 mb-2 block">
                                        Pages
                                    </label>
                                    <InputNumber id="pages" value={selectedItem.pages || 0} onValueChange={(e) => setSelectedItem({ ...selectedItem, pages: e.value || 0 })} min={0} />
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="lccn" className="font-semibold text-900 mb-2 block">
                                        LCCN
                                    </label>
                                    <InputText id="lccn" value={selectedItem.lccn || ''} onChange={(e) => setSelectedItem({ ...selectedItem, lccn: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-12 md:col-6">
                                <div className="field mb-4">
                                    <label htmlFor="provider" className="font-semibold text-900 mb-2 block">
                                        Provider
                                    </label>
                                    <Dropdown id="provider" value={selectedItem.provider} options={providerOptions} onChange={(e) => setSelectedItem({ ...selectedItem, provider: e.value })} />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="field mb-4">
                                    <label htmlFor="ebookLink" className="font-semibold text-900 mb-2 block">
                                        E-Book Link
                                    </label>
                                    <InputText id="ebookLink" value={selectedItem.eBookLink || ''} onChange={(e) => setSelectedItem({ ...selectedItem, eBookLink: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel header="Classification" leftIcon="pi pi-list mr-2">
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="classCode" className="font-semibold text-900 mb-2 block">
                                        Class Code
                                    </label>
                                    <InputText
                                        id="classCode"
                                        value={selectedItem.classification?.classCode || ''}
                                        onChange={(e) =>
                                            setSelectedItem({
                                                ...selectedItem,
                                                classification: { ...selectedItem.classification, classCode: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="divisionCode" className="font-semibold text-900 mb-2 block">
                                        Division Code
                                    </label>
                                    <InputText
                                        id="divisionCode"
                                        value={selectedItem.classification?.divisionCode || ''}
                                        onChange={(e) =>
                                            setSelectedItem({
                                                ...selectedItem,
                                                classification: { ...selectedItem.classification, divisionCode: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="col-12 md:col-4">
                                <div className="field mb-4">
                                    <label htmlFor="sectionCode" className="font-semibold text-900 mb-2 block">
                                        Section Code
                                    </label>
                                    <InputText
                                        id="sectionCode"
                                        value={selectedItem.classification?.sectionCode || ''}
                                        onChange={(e) =>
                                            setSelectedItem({
                                                ...selectedItem,
                                                classification: { ...selectedItem.classification, sectionCode: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="col-12">
                                <div className="field mb-4">
                                    <label htmlFor="classificationDesc" className="font-semibold text-900 mb-2 block">
                                        Classification Description
                                    </label>
                                    <InputTextarea
                                        id="classificationDesc"
                                        value={selectedItem.classification?.description || ''}
                                        onChange={(e) =>
                                            setSelectedItem({
                                                ...selectedItem,
                                                classification: { ...selectedItem.classification, description: e.target.value }
                                            })
                                        }
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabView>
            </Dialog>

            {/* Item Detail Dialog */}
            <Dialog
                visible={detailDialogVisible}
                style={{ width: '800px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-book text-primary text-2xl" />
                        <span className="font-bold text-xl">Library Item Details</span>
                    </div>
                }
                modal
                onHide={() => setDetailDialogVisible(false)}
                maximizable
            >
                {selectedItemForDetail && (
                    <div className="grid">
                        <div className="col-12 md:col-3">
                            {selectedItemForDetail.coverImagePath ? (
                                <Image src={selectedItemForDetail.coverImagePath} alt={selectedItemForDetail.title} width="100%" preview />
                            ) : (
                                <div className="flex align-items-center justify-content-center bg-gray-200 border-round" style={{ height: '300px' }}>
                                    <i className="pi pi-book text-gray-400" style={{ fontSize: '4rem' }} />
                                </div>
                            )}
                        </div>

                        <div className="col-12 md:col-9">
                            <h3 className="text-2xl font-bold text-900 mt-0">{selectedItemForDetail.title}</h3>
                            {selectedItemForDetail.subtitle && <p className="text-lg text-600 mt-2">{selectedItemForDetail.subtitle}</p>}

                            <div className="flex align-items-center gap-3 mt-3">
                                <Rating value={selectedItemForDetail.averageRating || 0} readOnly cancel={false} />
                                <span className="text-600">({selectedItemForDetail.totalReviews || 0} reviews)</span>
                            </div>

                            <Divider />

                            <div className="grid">
                                <div className="col-6">
                                    <div className="mb-3">
                                        <span className="font-semibold text-600">Authors:</span>
                                        <div className="text-900 mt-1">{authorsBodyTemplate(selectedItemForDetail)}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-3">
                                        <span className="font-semibold text-600">Category:</span>
                                        <div className="text-900 mt-1">{selectedItemForDetail.category || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-3">
                                        <span className="font-semibold text-600">Publisher:</span>
                                        <div className="text-900 mt-1">{selectedItemForDetail.publisher || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="mb-3">
                                        <span className="font-semibold text-600">ISBN:</span>
                                        <div className="text-900 mt-1">{selectedItemForDetail.isbn || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {selectedItemForDetail.description && (
                                <>
                                    <Divider />
                                    <div className="mb-3">
                                        <span className="font-semibold text-600">Description:</span>
                                        <p className="text-900 mt-2 line-height-3">{selectedItemForDetail.description}</p>
                                    </div>
                                </>
                            )}

                            {selectedItemForDetail.subjects && selectedItemForDetail.subjects.length > 0 && (
                                <>
                                    <Divider />
                                    <div className="mb-3">
                                        <span className="font-semibold text-600 block mb-2">Subjects:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedItemForDetail.subjects.map((subject, index) => (
                                                <Chip key={index} label={subject} />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="col-12">
                            <Divider />
                            <h4 className="text-xl font-bold text-900 mb-3">Site Inventory</h4>
                            {selectedItemForDetail.siteInventory && selectedItemForDetail.siteInventory.length > 0 ? (
                                <div className="grid">
                                    {selectedItemForDetail.siteInventory.map((inv, index) => (
                                        <div key={index} className="col-12 md:col-6">
                                            <Card className="shadow-2">
                                                <div className="flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <div className="font-semibold text-900 text-lg">{typeof inv.site === 'object' ? inv.site.siteName : 'Site'}</div>
                                                        {inv.location && (
                                                            <div className="text-600 text-sm mt-1">
                                                                <i className="pi pi-map-marker mr-1" />
                                                                {inv.location}
                                                                {inv.shelfNumber && ` - Shelf ${inv.shelfNumber}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Tag value={`${inv.availableQuantity}/${inv.quantity}`} severity={inv.availableQuantity === 0 ? 'danger' : inv.availableQuantity < 3 ? 'warning' : 'success'} />
                                                </div>
                                                <ProgressBar value={inv.quantity > 0 ? (inv.availableQuantity / inv.quantity) * 100 : 0} showValue={false} style={{ height: '8px' }} />
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Message severity="info" text="No inventory records found" />
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Stock Adjustment Dialog */}
            <Dialog
                visible={stockDialogVisible}
                style={{ width: '600px' }}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-box text-primary text-2xl" />
                        <span className="font-bold text-xl">Adjust Stock</span>
                    </div>
                }
                modal
                className="p-fluid"
                footer={stockDialogFooter}
                onHide={() => setStockDialogVisible(false)}
            >
                {selectedItemForStock && (
                    <>
                        <Message severity="info" text={`Adjusting stock for: ${selectedItemForStock.title}`} className="mb-4" />

                        <div className="field mb-4">
                            <label htmlFor="site" className="font-semibold text-900 mb-2 block">
                                Site <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="site"
                                value={stockAdjustment.siteId}
                                options={sites}
                                onChange={(e) => setStockAdjustment({ ...stockAdjustment, siteId: e.value })}
                                optionLabel="siteName"
                                optionValue="_id"
                                placeholder="Select a site"
                                className={!stockAdjustment.siteId ? 'p-invalid' : ''}
                            />
                        </div>

                        <div className="field mb-4">
                            <label htmlFor="adjustmentType" className="font-semibold text-900 mb-2 block">
                                Adjustment Type <span className="text-red-500">*</span>
                            </label>
                            <Dropdown
                                id="adjustmentType"
                                value={stockAdjustment.adjustmentType}
                                options={adjustmentTypeOptions}
                                onChange={(e) => setStockAdjustment({ ...stockAdjustment, adjustmentType: e.value })}
                                optionLabel="label"
                                optionValue="value"
                            />
                        </div>

                        <div className="field mb-4">
                            <label htmlFor="quantity" className="font-semibold text-900 mb-2 block">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <InputNumber
                                id="quantity"
                                value={stockAdjustment.quantity}
                                onValueChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: e.value || 0 })}
                                min={1}
                                showButtons
                                className={stockAdjustment.quantity <= 0 ? 'p-invalid' : ''}
                            />
                        </div>

                        <div className="field mb-3">
                            <label htmlFor="remarks" className="font-semibold text-900 mb-2 block">
                                Remarks
                            </label>
                            <InputTextarea id="remarks" value={stockAdjustment.remarks} onChange={(e) => setStockAdjustment({ ...stockAdjustment, remarks: e.target.value })} rows={3} placeholder="Optional notes about this adjustment..." />
                        </div>
                    </>
                )}
            </Dialog>
        </div>
    );
}
