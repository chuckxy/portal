'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import LMSStudentDashboard from '@/components/features/lms/LMSStudentDashboard';

/**
 * Main LMS Entry Point
 * Routes users to appropriate dashboard based on their role
 */
export default function LMSPage() {
    const { user } = useAuth();

    // For now, show student dashboard
    // In the future, this can route to different dashboards based on personCategory
    // e.g., teacher dashboard, admin dashboard, etc.

    if (user?.personCategory === 'teacher') {
        // TODO: Redirect to teacher LMS dashboard when available
        return <LMSStudentDashboard />;
    }

    // Default to student dashboard
    return <LMSStudentDashboard />;
}
