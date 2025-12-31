'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Toast } from 'primereact/toast';
import { Badge } from 'primereact/badge';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Skeleton } from 'primereact/skeleton';
import { useAuth } from '@/context/AuthContext';

interface Subject {
    _id: string;
    name: string;
    code: string;
    description?: string;
    lmsCourse?: {
        courseBanner?: string;
        difficulty?: string;
    };
}

interface Enrollment {
    _id: string;
    subjectId: Subject;
    personId: string;
    progressPercentage: number;
    lastAccessedAt?: string;
    totalTimeSpent: number;
    status: string;
    enrollmentDate: string;
}

const MyCoursesPage: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const toastRef = useRef<Toast>(null);

    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');

    useEffect(() => {
        if (user?.id && user?.schoolSite) {
            fetchEnrollments();
        }
    }, [user]);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('personId', user!.id);
            params.append('schoolSiteId', user!.schoolSite);

            const response = await fetch(`/api/lms/enrollments?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setEnrollments(data.enrollments || []);
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load your courses',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const formatTimeSpent = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getStatusSeverity = (status: string): 'success' | 'info' | 'warning' | 'danger' => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'enrolled':
                return 'info';
            case 'dropped':
                return 'danger';
            case 'suspended':
                return 'warning';
            default:
                return 'info';
        }
    };

    const filteredEnrollments = enrollments.filter((enrollment) => {
        const subject = enrollment.subjectId;
        const matchesSearch = !searchQuery || subject.name.toLowerCase().includes(searchQuery.toLowerCase()) || subject.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !statusFilter || enrollment.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusOptions = [
        { label: 'All Status', value: '' },
        { label: 'Enrolled', value: 'enrolled' },
        { label: 'Completed', value: 'completed' },
        { label: 'Dropped', value: 'dropped' },
        { label: 'Suspended', value: 'suspended' }
    ];

    const renderSkeleton = () => (
        <div className="grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="col-12 md:col-6 lg:col-4">
                    <div className="surface-card border-round-xl shadow-2 overflow-hidden">
                        <Skeleton height="160px" />
                        <div className="p-4">
                            <Skeleton width="30%" height="1.5rem" className="mb-2" />
                            <Skeleton width="80%" height="1.5rem" className="mb-3" />
                            <Skeleton width="100%" height="0.5rem" className="mb-3" />
                            <Skeleton width="60%" height="1rem" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCourseCard = (enrollment: Enrollment) => {
        const subject = enrollment.subjectId;

        return (
            <div key={enrollment._id} className="col-12 md:col-6 lg:col-4">
                <div className="surface-card border-round-xl shadow-2 overflow-hidden h-full flex flex-column hover:shadow-4 transition-all transition-duration-200">
                    {/* Course Banner */}
                    <div className="relative bg-primary-100 flex align-items-center justify-content-center" style={{ height: '160px' }}>
                        {subject.lmsCourse?.courseBanner ? <img src={subject.lmsCourse.courseBanner} alt={subject.name} className="w-full h-full" style={{ objectFit: 'cover' }} /> : <i className="pi pi-book text-6xl text-primary-300"></i>}

                        {/* Status Badge */}
                        <div className="absolute top-0 right-0 m-2">
                            <Tag value={enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)} severity={getStatusSeverity(enrollment.status)} />
                        </div>

                        {/* Progress Overlay */}
                        {enrollment.progressPercentage > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black-alpha-60 p-2">
                                <div className="flex align-items-center gap-2">
                                    <ProgressBar value={enrollment.progressPercentage} showValue={false} style={{ height: '6px' }} className="flex-grow-1" />
                                    <span className="text-white text-sm font-semibold">{enrollment.progressPercentage}%</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Course Info */}
                    <div className="p-4 flex flex-column flex-grow-1">
                        <div className="mb-2">
                            <Tag value={subject.code} severity="info" className="text-xs" />
                            {subject.lmsCourse?.difficulty && <Tag value={subject.lmsCourse.difficulty} severity="info" className="text-xs ml-2" />}
                        </div>

                        <h3 className="text-lg font-semibold text-900 m-0 mb-2 line-clamp-2">{subject.name}</h3>

                        <p className="text-600 text-sm m-0 mb-3 line-clamp-2 flex-grow-1">{subject.description || 'No description available'}</p>

                        {/* Stats */}
                        <div className="flex align-items-center gap-3 text-sm text-500 mb-3">
                            <span>
                                <i className="pi pi-clock mr-1"></i>
                                {formatTimeSpent(enrollment.totalTimeSpent)}
                            </span>
                            <span>
                                <i className="pi pi-calendar mr-1"></i>
                                {formatDate(enrollment.lastAccessedAt)}
                            </span>
                        </div>

                        {/* Action Button */}
                        <Button
                            label={enrollment.progressPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
                            icon={enrollment.progressPercentage > 0 ? 'pi pi-play' : 'pi pi-arrow-right'}
                            className="w-full"
                            onClick={() => router.push(`/lms/learn?courseId=${subject._id}`)}
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderEmptyState = () => (
        <div className="col-12">
            <div className="surface-card border-round-xl shadow-2 p-6 text-center">
                <i className="pi pi-inbox text-6xl text-300 mb-4"></i>
                <h3 className="text-900 mb-2">No Courses Found</h3>
                <p className="text-600 mb-4">{searchQuery || statusFilter ? 'No courses match your search criteria. Try adjusting your filters.' : "You haven't enrolled in any courses yet. Browse available courses to get started."}</p>
                <Button label="Browse Courses" icon="pi pi-search" onClick={() => router.push('/lms/content')} />
            </div>
        </div>
    );

    return (
        <div className="surface-ground min-h-screen p-3 md:p-4">
            <Toast ref={toastRef} />

            {/* Page Header */}
            <div className="surface-card border-round-xl shadow-2 p-4 mb-4">
                <div className="flex flex-column lg:flex-row align-items-start lg:align-items-center justify-content-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-900 m-0 mb-2">My Courses</h1>
                        <p className="text-600 m-0">Continue learning where you left off</p>
                    </div>

                    {/* Stats Summary */}
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-primary mb-1">{enrollments.length}</div>
                            <div className="text-sm text-600">Enrolled</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-500 mb-1">{enrollments.filter((e) => e.status === 'completed').length}</div>
                            <div className="text-sm text-600">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-500 mb-1">{enrollments.filter((e) => e.progressPercentage > 0 && e.progressPercentage < 100).length}</div>
                            <div className="text-sm text-600">In Progress</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="surface-card border-round-xl shadow-2 p-4 mb-4">
                <div className="flex flex-column md:flex-row gap-3">
                    <div className="flex-grow-1">
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-search" />
                            <InputText value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses..." className="w-full" />
                        </span>
                    </div>
                    <Dropdown value={statusFilter} options={statusOptions} onChange={(e) => setStatusFilter(e.value)} placeholder="Filter by status" className="w-full md:w-auto" style={{ minWidth: '180px' }} />
                    <Button icon="pi pi-refresh" className="p-button-outlined" onClick={fetchEnrollments} loading={loading} tooltip="Refresh" />
                </div>
            </div>

            {/* Course Grid */}
            {loading ? renderSkeleton() : <div className="grid">{filteredEnrollments.length > 0 ? filteredEnrollments.map(renderCourseCard) : renderEmptyState()}</div>}
        </div>
    );
};

export default MyCoursesPage;
