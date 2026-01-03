'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Chart } from 'primereact/chart';
import { TabView, TabPanel } from 'primereact/tabview';
import { InputText } from 'primereact/inputtext';
import { Skeleton } from 'primereact/skeleton';
import { Badge } from 'primereact/badge';
import { Menu } from 'primereact/menu';
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { useAuth } from '@/context/AuthContext';

interface DashboardStats {
    totalBooks: number;
    availableBooks: number;
    borrowedBooks: number;
    overdueBooks: number;
    activeUsers: number;
    newAcquisitions: number;
    onlineBooksAdded: number;
    reservedBooks: number;
    lowStockBooks: number;
}

interface Book {
    _id: string;
    title: string;
    authors: { firstName: string; lastName: string }[];
    isbn: string;
    status: 'available' | 'borrowed' | 'reserved' | 'lost' | 'damaged';
    itemType: string;
    provider?: string;
    totalQuantity?: number;
    availableQuantity?: number;
}

interface BorrowedItem {
    _id: string;
    borrower: {
        firstName: string;
        lastName: string;
        email: string;
    };
    items: {
        book: {
            title: string;
            isbn: string;
        };
        quantityIssued: number;
        quantityReturned: number;
    }[];
    issuedDate: Date;
    dueDate: Date;
    isOverdue: boolean;
}

interface LibraryUser {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    activeLoanCount: number;
    totalBorrowed: number;
    penalties: number;
    isActive: boolean;
}

export default function LibrarianDashboard() {
    const { user } = useAuth();
    const userSite = user?.schoolSite;

    // State
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [books, setBooks] = useState<Book[]>([]);
    const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>([]);
    const [users, setUsers] = useState<LibraryUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [globalFilter, setGlobalFilter] = useState('');
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [showReturnDialog, setShowReturnDialog] = useState(false);
    const [selectedLending, setSelectedLending] = useState<any>(null);

    // Analytics data
    const [trendData, setTrendData] = useState<any>(null);
    const [topBooksData, setTopBooksData] = useState<any>(null);
    const [providerData, setProviderData] = useState<any>(null);

    const toast = useRef<Toast>(null);

    // Fetch dashboard data
    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            if (!user) return;
            await Promise.all([fetchStats(), fetchBooks(), fetchBorrowedItems(), fetchUsers(), fetchAnalytics()]);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showMessage('Error', 'Failed to load dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const url = userSite ? `/api/library-dashboard/stats?site=${userSite}` : '/api/library-dashboard/stats';
            const response = await fetch(url);
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchBooks = async () => {
        try {
            const url = userSite ? `/api/library-items?site=${userSite}&limit=100` : '/api/library-items?limit=100';
            const response = await fetch(url);
            const data = await response.json();
            setBooks(Array.isArray(data) ? data : data.items || []);
        } catch (error) {
            console.error('Error fetching books:', error);
        }
    };

    const fetchBorrowedItems = async () => {
        try {
            const url = userSite ? `/api/library-lending?status=active&site=${userSite}` : '/api/library-lending?status=active';
            const response = await fetch(url);
            const data = await response.json();
            setBorrowedItems(Array.isArray(data) ? data : data.lendings || []);
        } catch (error) {
            console.error('Error fetching borrowed items:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const url = userSite ? `/api/library-users?site=${userSite}` : '/api/library-users';
            const response = await fetch(url);
            const data = await response.json();
            const formattedUsers = (Array.isArray(data) ? data : data.users || []).map((libUser: any) => ({
                _id: libUser._id,
                firstName: libUser.user?.firstName || '',
                lastName: libUser.user?.lastName || '',
                email: libUser.user?.email || '',
                role: libUser.membershipType || '',
                activeLoanCount: libUser.activeBorrowingsCount || 0,
                totalBorrowed: libUser.totalBorrowings || 0,
                penalties: libUser.overdueFines || 0,
                isActive: libUser.status === 'active'
            }));
            setUsers(formattedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const siteParam = userSite ? `?site=${userSite}` : '';

            // Borrowing trends
            const trendsRes = await fetch(`/api/library-dashboard/trends${siteParam}`);
            const trends = await trendsRes.json();
            setTrendData({
                labels: trends.labels || [],
                datasets: [
                    {
                        label: 'Borrowed Books',
                        data: trends.borrowed || [],
                        borderColor: '#42A5F5',
                        backgroundColor: 'rgba(66, 165, 245, 0.2)',
                        tension: 0.4
                    },
                    {
                        label: 'Returned Books',
                        data: trends.returned || [],
                        borderColor: '#66BB6A',
                        backgroundColor: 'rgba(102, 187, 106, 0.2)',
                        tension: 0.4
                    }
                ]
            });

            // Top books
            const topBooksRes = await fetch(`/api/library-dashboard/top-books${siteParam}`);
            const topBooks = await topBooksRes.json();
            setTopBooksData({
                labels: topBooks.map((b: any) => b.title?.substring(0, 20) + '...'),
                datasets: [
                    {
                        label: 'Times Borrowed',
                        data: topBooks.map((b: any) => b.count),
                        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA']
                    }
                ]
            });

            // Provider distribution
            const providersRes = await fetch(`/api/library-dashboard/providers${siteParam}`);
            const providers = await providersRes.json();
            setProviderData({
                labels: providers.map((p: any) => p.name),
                datasets: [
                    {
                        data: providers.map((p: any) => p.count),
                        backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA', '#EF5350']
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const showMessage = (summary: string, detail: string, severity: 'success' | 'info' | 'warn' | 'error') => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    // KPI Cards Component
    const KPICards = () => {
        if (!stats) return <Skeleton height="150px" />;

        const cards = [
            {
                title: 'Total Books',
                value: stats.totalBooks || 0,
                icon: 'pi pi-book',
                color: 'blue',
                subtext: `${stats.availableBooks || 0} available`
            },
            {
                title: 'Borrowed',
                value: stats.borrowedBooks || 0,
                icon: 'pi pi-shopping-cart',
                color: 'green',
                subtext: 'Currently out'
            },
            {
                title: 'Overdue',
                value: stats.overdueBooks || 0,
                icon: 'pi pi-exclamation-triangle',
                color: 'red',
                subtext: 'Needs attention'
            },
            {
                title: 'Active Users',
                value: stats.activeUsers || 0,
                icon: 'pi pi-users',
                color: 'purple',
                subtext: 'Registered members'
            },
            {
                title: 'New Acquisitions',
                value: stats.newAcquisitions || 0,
                icon: 'pi pi-plus-circle',
                color: 'cyan',
                subtext: 'This month'
            },
            {
                title: 'Online Books',
                value: stats.onlineBooksAdded || 0,
                icon: 'pi pi-cloud-download',
                color: 'orange',
                subtext: 'From providers'
            }
        ];

        return (
            <div className="grid">
                {cards.map((card, index) => (
                    <div key={index} className="col-12 md:col-6 lg:col-4 xl:col-2">
                        <Card className="shadow-2">
                            <div className="flex justify-content-between align-items-start">
                                <div>
                                    <span className="block text-500 font-medium mb-2">{card.title}</span>
                                    <div className="text-900 font-bold text-3xl">{card.value.toLocaleString()}</div>
                                    <span className="text-500 text-sm">{card.subtext}</span>
                                </div>
                                <div className={`flex align-items-center justify-content-center bg-${card.color}-100 border-round`} style={{ width: '3rem', height: '3rem' }}>
                                    <i className={`${card.icon} text-${card.color}-500 text-xl`}></i>
                                </div>
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        );
    };

    // Collection Management Component
    const CollectionManagement = () => {
        const statusBodyTemplate = (rowData: Book) => {
            const severityMap: Record<string, any> = {
                available: 'success',
                borrowed: 'warning',
                reserved: 'info',
                lost: 'danger',
                damaged: 'danger'
            };

            return <Tag value={rowData.status} severity={severityMap[rowData.status] || 'info'} />;
        };

        const typeBodyTemplate = (rowData: Book) => {
            const isOnlineProvider = rowData.provider && ['Google Books', 'Open Library', 'DBooks', 'IArchive'].includes(rowData.provider);
            if (isOnlineProvider) {
                return (
                    <div className="flex gap-2">
                        <Tag value="Digital" severity="success" icon="pi pi-globe" />
                        <Tag value={rowData.provider} severity="info" />
                    </div>
                );
            }
            return <Tag value="Physical" severity="info" icon="pi pi-book" />;
        };

        const authorsBodyTemplate = (rowData: Book) => {
            return rowData.authors?.map((a) => `${a.firstName} ${a.lastName}`).join(', ') || 'Unknown';
        };

        const stockBodyTemplate = (rowData: Book) => {
            if (!rowData.totalQuantity) return 'N/A';
            return `${rowData.availableQuantity || 0} / ${rowData.totalQuantity}`;
        };

        const actionBodyTemplate = (rowData: Book) => {
            const items = [
                {
                    label: 'View Details',
                    icon: 'pi pi-eye',
                    command: () => setSelectedBook(rowData)
                },
                {
                    label: 'Edit',
                    icon: 'pi pi-pencil',
                    command: () => {
                        /* Navigate to edit */
                    }
                },
                {
                    label: 'Archive',
                    icon: 'pi pi-trash',
                    command: () => handleArchiveBook(rowData)
                }
            ];

            return (
                <Button
                    icon="pi pi-ellipsis-v"
                    className="p-button-text p-button-rounded"
                    onClick={(e) => {
                        const menu = document.getElementById(`menu-${rowData._id}`) as any;
                        menu?.toggle(e);
                    }}
                />
            );
        };

        const header = (
            <div className="flex justify-content-between align-items-center">
                <h3 className="m-0">Collection ({books.length} items)</h3>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search books..." />
                </span>
            </div>
        );

        return (
            <Card>
                <DataTable value={books} paginator rows={10} dataKey="_id" globalFilter={globalFilter} header={header} emptyMessage="No books found." loading={loading}>
                    <Column field="title" header="Title" sortable style={{ minWidth: '250px' }} />
                    <Column field="isbn" header="ISBN" sortable />
                    <Column body={authorsBodyTemplate} header="Author(s)" />
                    <Column body={typeBodyTemplate} header="Type" />
                    <Column body={statusBodyTemplate} header="Status" sortable />
                    <Column body={stockBodyTemplate} header="Stock" />
                    <Column body={actionBodyTemplate} header="Actions" style={{ width: '80px' }} />
                </DataTable>
            </Card>
        );
    };

    // Circulation & Borrowing Component
    const CirculationManagement = () => {
        const overdueBodyTemplate = (rowData: BorrowedItem) => {
            return rowData.isOverdue ? <Badge value="OVERDUE" severity="danger" /> : <Badge value="Active" severity="success" />;
        };

        const userBodyTemplate = (rowData: BorrowedItem) => {
            return `${rowData.borrower.firstName} ${rowData.borrower.lastName}`;
        };

        const booksBodyTemplate = (rowData: BorrowedItem) => {
            return (
                <div>
                    {rowData.items.map((item, idx) => (
                        <div key={idx} className="mb-1">
                            {item.book.title}
                        </div>
                    ))}
                </div>
            );
        };

        const dueDateBodyTemplate = (rowData: BorrowedItem) => {
            return new Date(rowData.dueDate).toLocaleDateString();
        };

        const actionBodyTemplate = (rowData: BorrowedItem) => {
            return (
                <div className="flex gap-2">
                    <Button icon="pi pi-check" className="p-button-success p-button-sm" tooltip="Mark Returned" onClick={() => handleReturn(rowData)} />
                    <Button icon="pi pi-refresh" className="p-button-info p-button-sm" tooltip="Renew" onClick={() => handleRenew(rowData)} />
                    {rowData.isOverdue && <Button icon="pi pi-exclamation-circle" className="p-button-warning p-button-sm" tooltip="Apply Penalty" onClick={() => handlePenalty(rowData)} />}
                </div>
            );
        };

        const header = (
            <div className="flex justify-content-between align-items-center">
                <h3 className="m-0">Active Loans ({borrowedItems.length})</h3>
                <Button label="Refresh" icon="pi pi-refresh" className="p-button-sm" onClick={fetchBorrowedItems} />
            </div>
        );

        return (
            <Card>
                <DataTable value={borrowedItems} paginator rows={10} dataKey="_id" header={header} emptyMessage="No active loans." loading={loading}>
                    <Column body={userBodyTemplate} header="Borrower" sortable />
                    <Column body={booksBodyTemplate} header="Books" />
                    <Column field="issuedDate" header="Borrowed On" body={(row) => new Date(row.issuedDate).toLocaleDateString()} sortable />
                    <Column body={dueDateBodyTemplate} header="Due Date" sortable />
                    <Column body={overdueBodyTemplate} header="Status" />
                    <Column body={actionBodyTemplate} header="Actions" style={{ width: '150px' }} />
                </DataTable>
            </Card>
        );
    };

    // Users Management Component
    const UsersManagement = () => {
        const statusBodyTemplate = (rowData: LibraryUser) => {
            return rowData.isActive ? <Tag value="Active" severity="success" /> : <Tag value="Suspended" severity="danger" />;
        };

        const loansBodyTemplate = (rowData: LibraryUser) => {
            return `${rowData.activeLoanCount || 0} active`;
        };

        const penaltiesBodyTemplate = (rowData: LibraryUser) => {
            if (!rowData.penalties || rowData.penalties === 0) {
                return <Tag value="None" severity="success" />;
            }
            return <Tag value={`$${rowData.penalties}`} severity="warning" />;
        };

        const actionBodyTemplate = (rowData: LibraryUser) => {
            return (
                <div className="flex gap-2">
                    <Button icon="pi pi-eye" className="p-button-info p-button-sm" tooltip="View History" onClick={() => handleViewUserHistory(rowData)} />
                    <Button
                        icon={rowData.isActive ? 'pi pi-ban' : 'pi pi-check'}
                        className={`p-button-sm ${rowData.isActive ? 'p-button-warning' : 'p-button-success'}`}
                        tooltip={rowData.isActive ? 'Suspend' : 'Activate'}
                        onClick={() => handleToggleUserStatus(rowData)}
                    />
                </div>
            );
        };

        const header = (
            <div className="flex justify-content-between align-items-center">
                <h3 className="m-0">Library Users ({users.length})</h3>
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText placeholder="Search users..." onChange={(e) => setGlobalFilter(e.target.value)} />
                </span>
            </div>
        );

        return (
            <Card>
                <DataTable value={users} paginator rows={10} dataKey="_id" globalFilter={globalFilter} header={header} emptyMessage="No users found." loading={loading}>
                    <Column field="firstName" header="Name" body={(row) => `${row.firstName} ${row.lastName}`} sortable />
                    <Column field="email" header="Email" sortable />
                    <Column field="role" header="Role" sortable />
                    <Column body={loansBodyTemplate} header="Loans" />
                    <Column field="totalBorrowed" header="Total Borrowed" sortable />
                    <Column body={penaltiesBodyTemplate} header="Penalties" />
                    <Column body={statusBodyTemplate} header="Status" />
                    <Column body={actionBodyTemplate} header="Actions" style={{ width: '120px' }} />
                </DataTable>
            </Card>
        );
    };

    // Analytics & Reports Component
    const AnalyticsReports = () => {
        const chartOptions = {
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true
                    }
                }
            },
            maintainAspectRatio: false
        };

        return (
            <div className="grid">
                <div className="col-12 lg:col-8">
                    <Card title="Borrowing Trends (Last 30 Days)">
                        <div style={{ height: '300px' }}>{trendData ? <Chart type="line" data={trendData} options={chartOptions} /> : <Skeleton height="300px" />}</div>
                    </Card>
                </div>
                <div className="col-12 lg:col-4">
                    <Card title="Provider Distribution">
                        <div style={{ height: '300px' }}>{providerData ? <Chart type="doughnut" data={providerData} options={chartOptions} /> : <Skeleton height="300px" />}</div>
                    </Card>
                </div>
                <div className="col-12">
                    <Card title="Most Borrowed Books">
                        <div style={{ height: '300px' }}>
                            {topBooksData ? (
                                <Chart
                                    type="bar"
                                    data={topBooksData}
                                    options={{
                                        ...chartOptions,
                                        indexAxis: 'y'
                                    }}
                                />
                            ) : (
                                <Skeleton height="300px" />
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    // Notifications & Alerts Component
    const NotificationsAlerts = () => {
        const alerts = [
            {
                severity: 'error',
                icon: 'pi pi-exclamation-triangle',
                title: 'Overdue Books',
                message: `${stats?.overdueBooks || 0} books are overdue and require immediate attention`,
                action: () => setActiveTab(2)
            },
            {
                severity: 'warning',
                icon: 'pi pi-inbox',
                title: 'Low Stock Alert',
                message: `${stats?.lowStockBooks || 0} popular books are running low in stock`,
                action: () => setActiveTab(1)
            },
            {
                severity: 'info',
                icon: 'pi pi-cloud-download',
                title: 'Online Books',
                message: `${stats?.onlineBooksAdded || 0} books added from external providers this month`,
                action: () => {}
            }
        ];

        return (
            <div className="grid">
                {alerts.map((alert, index) => (
                    <div key={index} className="col-12">
                        <Card className={`border-left-3 border-${alert.severity}`}>
                            <div className="flex align-items-center justify-content-between">
                                <div className="flex align-items-start gap-3">
                                    <i className={`${alert.icon} text-${alert.severity} text-2xl`}></i>
                                    <div>
                                        <h4 className="m-0 mb-2">{alert.title}</h4>
                                        <p className="m-0 text-600">{alert.message}</p>
                                    </div>
                                </div>
                                <Button label="View" icon="pi pi-arrow-right" className="p-button-text" onClick={alert.action} />
                            </div>
                        </Card>
                    </div>
                ))}
            </div>
        );
    };

    // Action handlers
    const handleReturn = (lending: BorrowedItem) => {
        setSelectedLending(lending);
        setShowReturnDialog(true);
    };

    const handleRenew = async (lending: BorrowedItem) => {
        try {
            const response = await fetch(`/api/library-lending/${lending._id}/renew`, {
                method: 'POST'
            });
            if (response.ok) {
                showMessage('Success', 'Loan renewed successfully', 'success');
                fetchBorrowedItems();
            }
        } catch (error) {
            showMessage('Error', 'Failed to renew loan', 'error');
        }
    };

    const handlePenalty = async (lending: BorrowedItem) => {
        // Show dialog to add penalty
        showMessage('Info', 'Penalty dialog would open here', 'info');
    };

    const handleArchiveBook = async (book: Book) => {
        if (confirm(`Are you sure you want to archive "${book.title}"?`)) {
            try {
                const response = await fetch(`/api/library-items/${book._id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    showMessage('Success', 'Book archived successfully', 'success');
                    fetchBooks();
                }
            } catch (error) {
                showMessage('Error', 'Failed to archive book', 'error');
            }
        }
    };

    const handleViewUserHistory = (user: LibraryUser) => {
        showMessage('Info', `Viewing history for ${user.firstName} ${user.lastName}`, 'info');
    };

    const handleToggleUserStatus = async (user: LibraryUser) => {
        const action = user.isActive ? 'suspend' : 'activate';
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            showMessage('Info', `User ${action}d successfully`, 'success');
            fetchUsers();
        }
    };

    const confirmReturn = async () => {
        try {
            const response = await fetch(`/api/library-lending/${selectedLending._id}/return`, {
                method: 'POST'
            });
            if (response.ok) {
                showMessage('Success', 'Items marked as returned', 'success');
                setShowReturnDialog(false);
                fetchBorrowedItems();
                fetchStats();
            }
        } catch (error) {
            showMessage('Error', 'Failed to process return', 'error');
        }
    };

    return (
        <div className="card">
            <Toast ref={toast} position="bottom-right" />

            {/* Header */}
            <div className="flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 className="text-4xl font-bold text-900 m-0">Librarian Dashboard</h1>
                    <p className="text-600 text-lg mt-2">Manage your library operations efficiently</p>
                </div>
                <div className="flex gap-2">
                    <Button label="Add Book" icon="pi pi-plus" className="p-button-success" />
                    <Button label="Online Books" icon="pi pi-cloud-download" className="p-button-info" onClick={() => (window.location.href = '/library/online-books')} />
                    <Button label="Refresh" icon="pi pi-refresh" className="p-button-outlined" onClick={fetchDashboardData} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="mb-4">
                <KPICards />
            </div>

            {/* Main Content Tabs */}
            <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)}>
                <TabPanel header="Overview" leftIcon="pi pi-home">
                    <div className="grid">
                        <div className="col-12">
                            <NotificationsAlerts />
                        </div>
                        <div className="col-12">
                            <AnalyticsReports />
                        </div>
                    </div>
                </TabPanel>

                <TabPanel header="Collection" leftIcon="pi pi-book">
                    <CollectionManagement />
                </TabPanel>

                <TabPanel header="Circulation" leftIcon="pi pi-shopping-cart">
                    <CirculationManagement />
                </TabPanel>

                <TabPanel header="Users" leftIcon="pi pi-users">
                    <UsersManagement />
                </TabPanel>

                <TabPanel header="Analytics" leftIcon="pi pi-chart-line">
                    <AnalyticsReports />
                </TabPanel>

                <TabPanel header="Reports" leftIcon="pi pi-file">
                    <Card>
                        <h3>Reports & Exports</h3>
                        <div className="grid">
                            <div className="col-12 md:col-6 lg:col-4">
                                <Button label="Circulation Report" icon="pi pi-download" className="w-full" />
                            </div>
                            <div className="col-12 md:col-6 lg:col-4">
                                <Button label="Overdue Report" icon="pi pi-download" className="w-full" />
                            </div>
                            <div className="col-12 md:col-6 lg:col-4">
                                <Button label="User Activity Report" icon="pi pi-download" className="w-full" />
                            </div>
                        </div>
                    </Card>
                </TabPanel>
            </TabView>

            {/* Return Dialog */}
            <Dialog
                header="Confirm Return"
                visible={showReturnDialog}
                style={{ width: '450px' }}
                onHide={() => setShowReturnDialog(false)}
                footer={
                    <div>
                        <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setShowReturnDialog(false)} />
                        <Button label="Confirm Return" icon="pi pi-check" onClick={confirmReturn} />
                    </div>
                }
            >
                <p>Mark all items in this loan as returned?</p>
            </Dialog>
        </div>
    );
}
