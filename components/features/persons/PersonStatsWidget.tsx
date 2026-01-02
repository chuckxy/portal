'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Skeleton } from 'primereact/skeleton';
import { Chart } from 'primereact/chart';
import { useAuth } from '@/context/AuthContext';

interface PersonStats {
    total: number;
    active: number;
    inactive: number;
    byCategory: {
        [key: string]: number;
    };
}

const PersonStatsWidget: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<PersonStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [user]);

    const fetchStats = async () => {
        try {
            const params = new URLSearchParams();
            if (user?.school) params.append('school', user.school);
            if (user?.schoolSite) params.append('site', user.schoolSite);

            const response = await fetch(`/api/persons?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                const persons = data.persons || [];

                // Calculate statistics
                const statsData: PersonStats = {
                    total: persons.length,
                    active: persons.filter((p: any) => p.isActive).length,
                    inactive: persons.filter((p: any) => !p.isActive).length,
                    byCategory: {}
                };

                // Count by category
                persons.forEach((p: any) => {
                    const category = p.personCategory;
                    statsData.byCategory[category] = (statsData.byCategory[category] || 0) + 1;
                });

                setStats(statsData);
            }
        } catch (error) {
            console.error('Failed to fetch person stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid">
                <div className="col-12 md:col-3">
                    <Card>
                        <Skeleton height="100px" />
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <Skeleton height="100px" />
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <Skeleton height="100px" />
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <Skeleton height="100px" />
                    </Card>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const chartData = {
        labels: Object.keys(stats.byCategory).map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [
            {
                data: Object.values(stats.byCategory),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF']
            }
        ]
    };

    const chartOptions = {
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    boxWidth: 12,
                    padding: 8,
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    return (
        <div className="grid">
            {/* Total Persons Card */}
            <div className="col-12 md:col-3">
                <Card className="bg-blue-50 border-blue-500 border-2">
                    <div className="flex align-items-center justify-content-between">
                        <div>
                            <div className="text-blue-600 text-sm font-semibold mb-2">Total Persons</div>
                            <div className="text-blue-900 text-4xl font-bold">{stats.total}</div>
                        </div>
                        <div className="bg-blue-500 border-round p-3">
                            <i className="pi pi-users text-white text-4xl"></i>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Active Persons Card */}
            <div className="col-12 md:col-3">
                <Card className="bg-green-50 border-green-500 border-2">
                    <div className="flex align-items-center justify-content-between">
                        <div>
                            <div className="text-green-600 text-sm font-semibold mb-2">Active</div>
                            <div className="text-green-900 text-4xl font-bold">{stats.active}</div>
                        </div>
                        <div className="bg-green-500 border-round p-3">
                            <i className="pi pi-check-circle text-white text-4xl"></i>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Inactive Persons Card */}
            <div className="col-12 md:col-3">
                <Card className="bg-red-50 border-red-500 border-2">
                    <div className="flex align-items-center justify-content-between">
                        <div>
                            <div className="text-red-600 text-sm font-semibold mb-2">Inactive</div>
                            <div className="text-red-900 text-4xl font-bold">{stats.inactive}</div>
                        </div>
                        <div className="bg-red-500 border-round p-3">
                            <i className="pi pi-times-circle text-white text-4xl"></i>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Students Card */}
            <div className="col-12 md:col-3">
                <Card className="bg-purple-50 border-purple-500 border-2">
                    <div className="flex align-items-center justify-content-between">
                        <div>
                            <div className="text-purple-600 text-sm font-semibold mb-2">Students</div>
                            <div className="text-purple-900 text-4xl font-bold">{stats.byCategory['student'] || 0}</div>
                        </div>
                        <div className="bg-purple-500 border-round p-3">
                            <i className="pi pi-graduation-cap text-white text-4xl"></i>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Category Distribution Chart */}
            <div className="col-12 md:col-6">
                <Card title="Distribution by Category">
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <Chart type="doughnut" data={chartData} options={chartOptions} />
                    </div>
                </Card>
            </div>

            {/* Category Breakdown List */}
            <div className="col-12 md:col-6">
                <Card title="Category Breakdown">
                    <div className="flex flex-column gap-3">
                        {Object.entries(stats.byCategory)
                            .sort(([, a], [, b]) => b - a)
                            .map(([category, count]) => (
                                <div key={category} className="flex align-items-center justify-content-between p-3 surface-50 border-round">
                                    <div className="flex align-items-center gap-2">
                                        <i className="pi pi-user text-primary"></i>
                                        <span className="font-semibold text-900 capitalize">{category}</span>
                                    </div>
                                    <div className="flex align-items-center gap-3">
                                        <span className="text-600">{count}</span>
                                        <div className="bg-primary border-round px-2 py-1 text-sm text-white font-semibold" style={{ minWidth: '50px', textAlign: 'center' }}>
                                            {((count / stats.total) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default PersonStatsWidget;
