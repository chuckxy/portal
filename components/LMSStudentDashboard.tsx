'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import { Skeleton } from 'primereact/skeleton';
import { Avatar } from 'primereact/avatar';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import { Ripple } from 'primereact/ripple';
import { Message } from 'primereact/message';
import { useAuth } from '@/context/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface Subject {
    _id: string;
    name: string;
    code?: string;
    description?: string;
    coverImage?: string;
    category?: string;
}

interface Enrollment {
    _id: string;
    subjectId: Subject;
    progressPercentage: number;
    lastAccessedAt?: string;
    totalTimeSpent: number;
    status: 'enrolled' | 'in_progress' | 'completed' | 'expired' | 'suspended';
    enrollmentDate: string;
}

interface Announcement {
    _id: string;
    title: string;
    content: string;
    subjectId?: Subject;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    announcementDate: string;
    addedBy?: { firstName: string; lastName: string; photoLink?: string };
    isPinned?: boolean;
}

interface Quiz {
    _id: string;
    title: string;
    subjectId: Subject;
    startDate?: string;
    endDate?: string;
    timeLimit?: number;
    totalMarks: number;
    isPublished: boolean;
}

interface LessonProgress {
    _id: string;
    lessonId: {
        _id: string;
        title: string;
        orderIndex: number;
    };
    subjectId: Subject;
    status: string;
    timeSpent: number;
    completionPercentage: number;
    lastAccessedAt: string;
}

interface DashboardStats {
    totalEnrolled: number;
    inProgress: number;
    completed: number;
    totalTimeSpent: number;
    averageProgress: number;
    lessonsCompleted: number;
    quizzesPassed: number;
}

interface DashboardData {
    enrollments: Enrollment[];
    recentEnrollments: Enrollment[];
    continueLearning?: Enrollment;
    announcements: Announcement[];
    upcomingQuizzes: Quiz[];
    recentActivity: LessonProgress[];
    stats: DashboardStats;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatTimeSpent = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDeadline = (dateString: string): { text: string; isUrgent: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'Overdue', isUrgent: true };
    if (diffDays === 0) return { text: 'Due Today', isUrgent: true };
    if (diffDays === 1) return { text: 'Due Tomorrow', isUrgent: true };
    if (diffDays <= 3) return { text: `${diffDays} days left`, isUrgent: true };
    if (diffDays <= 7) return { text: `${diffDays} days left`, isUrgent: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isUrgent: false };
};

const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const getStatusColor = (status: string): 'success' | 'info' | 'warning' | 'danger' | null | undefined => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
        completed: 'success',
        in_progress: 'info',
        enrolled: 'info',
        expired: 'danger',
        suspended: 'warning'
    };
    return colors[status] || 'info';
};

const getPriorityColor = (priority: string): 'success' | 'info' | 'warning' | 'danger' | null | undefined => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
        low: 'info',
        medium: 'info',
        high: 'warning',
        urgent: 'danger'
    };
    return colors[priority] || 'info';
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Skeleton Loader Component
const DashboardSkeleton: React.FC = () => (
    <div className="grid">
        {/* Header Skeleton */}
        <div className="col-12">
            <Card className="border-none shadow-2">
                <div className="flex align-items-center gap-4">
                    <Skeleton shape="circle" size="5rem" />
                    <div className="flex-1">
                        <Skeleton width="200px" height="2rem" className="mb-2" />
                        <Skeleton width="300px" height="1rem" />
                    </div>
                </div>
            </Card>
        </div>
        {/* Stats Skeleton */}
        <div className="col-12">
            <div className="grid">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="col-6 lg:col-3">
                        <Card className="border-none shadow-1">
                            <Skeleton width="100%" height="80px" />
                        </Card>
                    </div>
                ))}
            </div>
        </div>
        {/* Content Skeleton */}
        <div className="col-12 lg:col-8">
            <Card className="border-none shadow-2">
                <Skeleton width="150px" height="1.5rem" className="mb-3" />
                <Skeleton width="100%" height="200px" />
            </Card>
        </div>
        <div className="col-12 lg:col-4">
            <Card className="border-none shadow-2">
                <Skeleton width="150px" height="1.5rem" className="mb-3" />
                <Skeleton width="100%" height="200px" />
            </Card>
        </div>
    </div>
);

// Stat Card Component
interface StatCardProps {
    icon: string;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string | number;
    subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, iconColor, label, value, subtext }) => (
    <Card className="border-none shadow-1 h-full hover:shadow-3 transition-all transition-duration-200">
        <div className="flex align-items-center gap-3">
            <div className={`flex align-items-center justify-content-center ${iconBg} border-round-xl`} style={{ width: '3.5rem', height: '3.5rem' }}>
                <i className={`pi ${icon} ${iconColor} text-xl`}></i>
            </div>
            <div className="flex-1">
                <div className="text-500 text-sm font-medium mb-1">{label}</div>
                <div className="text-900 font-bold text-2xl">{value}</div>
                {subtext && <div className="text-500 text-xs mt-1">{subtext}</div>}
            </div>
        </div>
    </Card>
);

// Subject Card Component
interface SubjectCardProps {
    enrollment: Enrollment;
    onContinue: (enrollment: Enrollment) => void;
    isResumeCard?: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ enrollment, onContinue, isResumeCard }) => {
    const subject = enrollment.subjectId;
    const progress = enrollment.progressPercentage || 0;

    return (
        <Card className={`border-none shadow-1 h-full cursor-pointer hover:shadow-3 transition-all transition-duration-200 p-ripple ${isResumeCard ? 'border-left-3 border-primary' : ''}`} onClick={() => onContinue(enrollment)}>
            <Ripple />
            <div className="flex flex-column h-full">
                {/* Subject Header */}
                <div className="flex align-items-start gap-3 mb-3">
                    <div className="flex align-items-center justify-content-center bg-primary-100 border-round-lg flex-shrink-0" style={{ width: '3rem', height: '3rem' }}>
                        {subject?.coverImage ? <img src={subject.coverImage} alt={subject.name} className="w-full h-full border-round-lg object-fit-cover" /> : <i className="pi pi-book text-primary text-xl"></i>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-900 font-semibold m-0 mb-1 white-space-nowrap overflow-hidden text-overflow-ellipsis">{subject?.name || 'Unknown Subject'}</h4>
                        {subject?.code && <span className="text-500 text-sm">{subject.code}</span>}
                    </div>
                    <Tag value={enrollment.status.replace('_', ' ')} severity={getStatusColor(enrollment.status)} className="text-xs" />
                </div>

                {/* Progress Section */}
                <div className="mb-3">
                    <div className="flex justify-content-between align-items-center mb-2">
                        <span className="text-500 text-sm">Progress</span>
                        <span className="text-900 font-semibold text-sm">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} showValue={false} style={{ height: '8px' }} className="border-round-lg" />
                </div>

                {/* Footer */}
                <div className="flex justify-content-between align-items-center mt-auto pt-2 border-top-1 surface-border">
                    <div className="flex align-items-center gap-1 text-500 text-xs">
                        <i className="pi pi-clock text-xs"></i>
                        <span>{formatTimeSpent(enrollment.totalTimeSpent)}</span>
                    </div>
                    <Button
                        label={progress > 0 ? 'Continue' : 'Start'}
                        icon={progress > 0 ? 'pi pi-play' : 'pi pi-arrow-right'}
                        size="small"
                        className="p-button-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onContinue(enrollment);
                        }}
                    />
                </div>
            </div>
        </Card>
    );
};

// Announcement Card Component
interface AnnouncementCardProps {
    announcement: Announcement;
    onClick?: () => void;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, onClick }) => (
    <div className={`flex gap-3 p-3 border-round-lg surface-hover cursor-pointer transition-all transition-duration-150 ${announcement.isPinned ? 'bg-yellow-50' : ''}`} onClick={onClick}>
        <div className={`flex align-items-center justify-content-center border-round-lg flex-shrink-0 ${announcement.isPinned ? 'bg-yellow-100' : 'bg-blue-50'}`} style={{ width: '2.5rem', height: '2.5rem' }}>
            <i className={`pi ${announcement.isPinned ? 'pi-star-fill text-yellow-600' : 'pi-megaphone text-blue-600'} text-lg`}></i>
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex align-items-center gap-2 mb-1">
                <span className="font-semibold text-900 white-space-nowrap overflow-hidden text-overflow-ellipsis">{announcement.title}</span>
                <Tag value={announcement.priority} severity={getPriorityColor(announcement.priority)} className="text-xs" />
            </div>
            <p className="text-500 text-sm m-0 line-clamp-2" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {announcement.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
            </p>
            <div className="flex align-items-center gap-2 mt-2">
                {announcement.subjectId && <Tag value={announcement.subjectId.name} className="text-xs bg-gray-100 text-gray-700" />}
                <span className="text-400 text-xs">{formatDate(announcement.announcementDate)}</span>
            </div>
        </div>
    </div>
);

// Quiz/Task Card Component
interface TaskCardProps {
    quiz: Quiz;
    onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ quiz, onClick }) => {
    const deadline = quiz.endDate ? formatDeadline(quiz.endDate) : null;

    return (
        <div className="flex gap-3 p-3 border-round-lg surface-hover cursor-pointer transition-all transition-duration-150" onClick={onClick}>
            <div className={`flex align-items-center justify-content-center border-round-lg flex-shrink-0 ${deadline?.isUrgent ? 'bg-red-50' : 'bg-purple-50'}`} style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className={`pi pi-file-edit ${deadline?.isUrgent ? 'text-red-600' : 'text-purple-600'} text-lg`}></i>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex align-items-center justify-content-between gap-2 mb-1">
                    <span className="font-semibold text-900 white-space-nowrap overflow-hidden text-overflow-ellipsis">{quiz.title}</span>
                    {deadline && <Tag value={deadline.text} severity={deadline.isUrgent ? 'danger' : 'info'} className="text-xs flex-shrink-0" />}
                </div>
                <div className="flex align-items-center gap-3 text-500 text-sm">
                    <span>{quiz.subjectId?.name || 'General'}</span>
                    {quiz.timeLimit && (
                        <span className="flex align-items-center gap-1">
                            <i className="pi pi-clock text-xs"></i>
                            {quiz.timeLimit} min
                        </span>
                    )}
                    <span>{quiz.totalMarks} marks</span>
                </div>
            </div>
        </div>
    );
};

// Empty State Component
interface EmptyStateProps {
    icon: string;
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => (
    <div className="flex flex-column align-items-center justify-content-center p-5 text-center">
        <div className="flex align-items-center justify-content-center bg-gray-100 border-round-xl mb-3" style={{ width: '4rem', height: '4rem' }}>
            <i className={`pi ${icon} text-gray-400 text-3xl`}></i>
        </div>
        <h4 className="text-700 font-semibold m-0 mb-2">{title}</h4>
        <p className="text-500 text-sm m-0 mb-3">{message}</p>
        {action && <Button label={action.label} icon="pi pi-arrow-right" className="p-button-sm p-button-outlined" onClick={action.onClick} />}
    </div>
);

// Quick Action Button Component
interface QuickActionProps {
    icon: string;
    label: string;
    onClick: () => void;
    badge?: number;
    color?: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onClick, badge, color = 'primary' }) => (
    <button
        className={`flex flex-column align-items-center gap-2 p-3 border-round-xl surface-card border-1 surface-border hover:shadow-2 hover:border-${color} cursor-pointer transition-all transition-duration-200 w-full p-ripple`}
        style={{ background: 'transparent' }}
        onClick={onClick}
    >
        <Ripple />
        <div className={`flex align-items-center justify-content-center bg-${color}-100 border-round-lg p-overlay-badge`} style={{ width: '2.5rem', height: '2.5rem' }}>
            <i className={`pi ${icon} text-${color} text-lg`}></i>
            {badge !== undefined && badge > 0 && <Badge value={badge > 99 ? '99+' : badge} severity="danger" />}
        </div>
        <span className="text-700 text-sm font-medium text-center">{label}</span>
    </button>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LMSStudentDashboard: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();

    // State
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch enrollments
            const enrollmentsRes = await fetch(`/api/lms/enrollments?personId=${user.id}&limit=50`);
            const enrollmentsData = await enrollmentsRes.json();

            // Fetch announcements
            const announcementsRes = await fetch(`/api/lms/announcements?schoolSiteId=${user.schoolSite}&activeOnly=true&limit=10`);
            const announcementsData = await announcementsRes.json();

            // Fetch upcoming quizzes
            const quizzesRes = await fetch(`/api/lms/quizzes?schoolSiteId=${user.schoolSite}&isPublished=true&limit=10`);
            const quizzesData = await quizzesRes.json();

            // Fetch session progress for recent activity
            const progressRes = await fetch(`/api/lms/session-progress?personId=${user.id}&limit=10`);
            const progressData = await progressRes.json();

            const enrollments: Enrollment[] = enrollmentsData.success ? enrollmentsData.enrollments : [];

            // Calculate stats
            const stats: DashboardStats = {
                totalEnrolled: enrollments.length,
                inProgress: enrollments.filter((e) => e.status === 'in_progress').length,
                completed: enrollments.filter((e) => e.status === 'completed').length,
                totalTimeSpent: enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0),
                averageProgress: enrollments.length > 0 ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length) : 0,
                lessonsCompleted: progressData.progress?.filter((p: LessonProgress) => p.status === 'completed').length || 0,
                quizzesPassed: 0 // Would need quiz attempts API
            };

            // Find course to continue (most recently accessed, in progress)
            const sortedByAccess = [...enrollments].filter((e) => e.status !== 'completed' && e.lastAccessedAt).sort((a, b) => new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime());
            const continueLearning = sortedByAccess[0];

            // Filter upcoming quizzes (not past deadline)
            const now = new Date();
            const upcomingQuizzes = (quizzesData.success ? quizzesData.quizzes : []).filter((q: Quiz) => !q.endDate || new Date(q.endDate) >= now);

            setDashboardData({
                enrollments,
                recentEnrollments: enrollments.slice(0, 6),
                continueLearning,
                announcements: announcementsData.success ? announcementsData.announcements : [],
                upcomingQuizzes,
                recentActivity: progressData.progress || [],
                stats
            });
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            setError('Failed to load dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.schoolSite]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Handlers
    const handleContinueLearning = (enrollment: Enrollment) => {
        router.push(`/lms/learn?courseId=${enrollment.subjectId._id}`);
    };

    const handleViewAllCourses = () => {
        router.push('/lms/courses');
    };

    const handleViewAnnouncement = (announcement: Announcement) => {
        router.push(`/lms/announcements/${announcement._id}`);
    };

    const handleViewQuiz = (quiz: Quiz) => {
        router.push(`/lms/quiz/${quiz._id}`);
    };

    const handleViewTimetable = () => {
        router.push('/timetable');
    };

    const handleViewSupport = () => {
        router.push('/support');
    };

    // Memoized values
    const currentTermLabel = useMemo(() => {
        // This would ideally come from academic settings
        const now = new Date();
        const year = now.getFullYear();
        return `${year}/${year + 1} Academic Year`;
    }, []);

    // Loading state
    if (loading) {
        return <DashboardSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-column align-items-center justify-content-center p-8">
                <Message severity="error" text={error} className="mb-4" />
                <Button label="Retry" icon="pi pi-refresh" onClick={fetchDashboardData} />
            </div>
        );
    }

    // No data state
    if (!dashboardData) {
        return <EmptyState icon="pi-inbox" title="No Data Available" message="Unable to load your dashboard. Please try again later." action={{ label: 'Refresh', onClick: fetchDashboardData }} />;
    }

    const { enrollments, recentEnrollments, continueLearning, announcements, upcomingQuizzes, stats } = dashboardData;

    return (
        <div className="grid">
            {/* ================================================================== */}
            {/* HEADER / WELCOME SECTION */}
            {/* ================================================================== */}
            <div className="col-12">
                <Card className="border-none shadow-2 bg-gradient-primary" style={{ background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)' }}>
                    <div className="flex flex-column md:flex-row align-items-center gap-4 text-white">
                        <Avatar image={user?.photoLink} icon={!user?.photoLink ? 'pi pi-user' : undefined} size="xlarge" shape="circle" className="border-3 border-white-alpha-50" style={{ width: '5rem', height: '5rem', fontSize: '2rem' }} />
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="m-0 mb-2 text-white font-bold">
                                {getGreeting()}, {user?.firstName || 'Student'}! 👋
                            </h2>
                            <div className="flex flex-wrap justify-content-center md:justify-content-start align-items-center gap-3 opacity-90">
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-calendar"></i>
                                    <span>{currentTermLabel}</span>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-book"></i>
                                    <span>{stats.totalEnrolled} Courses Enrolled</span>
                                </div>
                                <div className="flex align-items-center gap-2">
                                    <i className="pi pi-chart-line"></i>
                                    <span>{stats.averageProgress}% Average Progress</span>
                                </div>
                            </div>
                        </div>
                        {/* Continue Learning CTA */}
                        {continueLearning && (
                            <div className="hidden md:flex">
                                <Button label="Resume Learning" icon="pi pi-play" className="p-button-lg p-button-rounded bg-white text-primary border-none shadow-2" onClick={() => handleContinueLearning(continueLearning)} />
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ================================================================== */}
            {/* STATS OVERVIEW */}
            {/* ================================================================== */}
            <div className="col-6 lg:col-3">
                <StatCard icon="pi-book" iconBg="bg-blue-100" iconColor="text-blue-600" label="Enrolled Courses" value={stats.totalEnrolled} subtext={`${stats.inProgress} in progress`} />
            </div>
            <div className="col-6 lg:col-3">
                <StatCard icon="pi-check-circle" iconBg="bg-green-100" iconColor="text-green-600" label="Completed" value={stats.completed} subtext={`${stats.lessonsCompleted} lessons`} />
            </div>
            <div className="col-6 lg:col-3">
                <StatCard icon="pi-clock" iconBg="bg-purple-100" iconColor="text-purple-600" label="Time Spent" value={formatTimeSpent(stats.totalTimeSpent)} subtext="Total learning time" />
            </div>
            <div className="col-6 lg:col-3">
                <StatCard icon="pi-chart-bar" iconBg="bg-orange-100" iconColor="text-orange-600" label="Avg Progress" value={`${stats.averageProgress}%`} subtext="Across all courses" />
            </div>

            {/* ================================================================== */}
            {/* CONTINUE LEARNING (Mobile) */}
            {/* ================================================================== */}
            {continueLearning && (
                <div className="col-12 md:hidden">
                    <Card className="border-none shadow-2 border-left-3 border-primary">
                        <div className="flex align-items-center gap-3">
                            <i className="pi pi-play-circle text-primary text-3xl"></i>
                            <div className="flex-1">
                                <h4 className="m-0 mb-1 text-900">Continue Learning</h4>
                                <p className="m-0 text-500 text-sm">{continueLearning.subjectId.name}</p>
                            </div>
                            <Button icon="pi pi-arrow-right" className="p-button-rounded" onClick={() => handleContinueLearning(continueLearning)} />
                        </div>
                    </Card>
                </div>
            )}

            {/* ================================================================== */}
            {/* MY SUBJECTS / COURSES */}
            {/* ================================================================== */}
            <div className="col-12 lg:col-8">
                <Card className="border-none shadow-2 h-full">
                    <div className="flex align-items-center justify-content-between mb-4">
                        <h3 className="m-0 text-900 font-semibold flex align-items-center gap-2">
                            <i className="pi pi-book text-primary"></i>
                            My Subjects
                        </h3>
                        <Button label="View All" icon="pi pi-external-link" className="p-button-text p-button-sm" onClick={handleViewAllCourses} />
                    </div>

                    {recentEnrollments.length === 0 ? (
                        <EmptyState icon="pi-book" title="No Courses Yet" message="You haven't enrolled in any courses. Explore available courses to get started!" action={{ label: 'Browse Courses', onClick: handleViewAllCourses }} />
                    ) : (
                        <div className="grid">
                            {recentEnrollments.map((enrollment) => (
                                <div key={enrollment._id} className="col-12 md:col-6 xl:col-4">
                                    <SubjectCard enrollment={enrollment} onContinue={handleContinueLearning} isResumeCard={continueLearning?._id === enrollment._id} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ================================================================== */}
            {/* QUICK ACTIONS */}
            {/* ================================================================== */}
            <div className="col-12 lg:col-4">
                <Card className="border-none shadow-2 h-full">
                    <h3 className="m-0 mb-4 text-900 font-semibold flex align-items-center gap-2">
                        <i className="pi pi-bolt text-yellow-500"></i>
                        Quick Actions
                    </h3>
                    <div className="grid">
                        <div className="col-6">
                            <QuickAction icon="pi-play" label="Resume Last" onClick={() => continueLearning && handleContinueLearning(continueLearning)} color="primary" />
                        </div>
                        <div className="col-6">
                            <QuickAction icon="pi-calendar" label="Timetable" onClick={handleViewTimetable} color="purple" />
                        </div>
                        <div className="col-6">
                            <QuickAction icon="pi-megaphone" label="Announcements" onClick={() => router.push('/lms/announcements')} badge={announcements.length} color="blue" />
                        </div>
                        <div className="col-6">
                            <QuickAction icon="pi-question-circle" label="Get Help" onClick={handleViewSupport} color="green" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* ================================================================== */}
            {/* UPCOMING TASKS / QUIZZES */}
            {/* ================================================================== */}
            <div className="col-12 lg:col-6">
                <Card className="border-none shadow-2 h-full">
                    <div className="flex align-items-center justify-content-between mb-4">
                        <h3 className="m-0 text-900 font-semibold flex align-items-center gap-2">
                            <i className="pi pi-file-edit text-purple-500"></i>
                            Upcoming Quizzes
                        </h3>
                        <Tag value={`${upcomingQuizzes.length} pending`} severity="info" />
                    </div>

                    {upcomingQuizzes.length === 0 ? (
                        <EmptyState icon="pi-check-circle" title="All Caught Up!" message="No upcoming quizzes at the moment. Keep learning!" />
                    ) : (
                        <div className="flex flex-column gap-2">
                            {upcomingQuizzes.slice(0, 4).map((quiz) => (
                                <TaskCard key={quiz._id} quiz={quiz} onClick={() => handleViewQuiz(quiz)} />
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ================================================================== */}
            {/* ANNOUNCEMENTS */}
            {/* ================================================================== */}
            <div className="col-12 lg:col-6">
                <Card className="border-none shadow-2 h-full">
                    <div className="flex align-items-center justify-content-between mb-4">
                        <h3 className="m-0 text-900 font-semibold flex align-items-center gap-2">
                            <i className="pi pi-megaphone text-blue-500"></i>
                            Announcements
                        </h3>
                        <Button label="View All" icon="pi pi-external-link" className="p-button-text p-button-sm" onClick={() => router.push('/lms/announcements')} />
                    </div>

                    {announcements.length === 0 ? (
                        <EmptyState icon="pi-bell-slash" title="No Announcements" message="No new announcements at this time." />
                    ) : (
                        <div className="flex flex-column gap-2">
                            {announcements.slice(0, 4).map((announcement) => (
                                <AnnouncementCard key={announcement._id} announcement={announcement} onClick={() => handleViewAnnouncement(announcement)} />
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* ================================================================== */}
            {/* PROGRESS OVERVIEW (Optional - can be expanded) */}
            {/* ================================================================== */}
            {enrollments.length > 0 && (
                <div className="col-12">
                    <Card className="border-none shadow-2">
                        <div className="flex align-items-center justify-content-between mb-4">
                            <h3 className="m-0 text-900 font-semibold flex align-items-center gap-2">
                                <i className="pi pi-chart-line text-green-500"></i>
                                Progress Overview
                            </h3>
                        </div>
                        <div className="grid">
                            {enrollments.slice(0, 4).map((enrollment) => (
                                <div key={enrollment._id} className="col-12 md:col-6 lg:col-3">
                                    <div className="p-3 surface-50 border-round-lg">
                                        <div className="flex align-items-center justify-content-between mb-2">
                                            <span className="text-700 font-medium text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis" style={{ maxWidth: '150px' }}>
                                                {enrollment.subjectId?.name || 'Course'}
                                            </span>
                                            <span className="text-primary font-bold">{enrollment.progressPercentage}%</span>
                                        </div>
                                        <ProgressBar value={enrollment.progressPercentage} showValue={false} style={{ height: '8px' }} className="border-round-lg" />
                                        <div className="flex justify-content-between mt-2 text-xs text-500">
                                            <span>{formatTimeSpent(enrollment.totalTimeSpent)} spent</span>
                                            <span>{enrollment.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default LMSStudentDashboard;
