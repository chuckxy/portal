'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TeacherDashboard from '@/components/features/dashboard/TeacherDashboard';
import AccessBlockedDisplay from '@/components/common/AccessBlockedDisplay';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function TeacherDashboardPage() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <ProgressSpinner />
            </div>
        );
    }

    if (!user) {
        return (
            <AccessBlockedDisplay
                reason="not-logged-in"
                showLoginButton={true}
                loginRedirect="/auth/login"
            />
        );
    }

    if (user.personCategory !== 'teacher') {
        return (
            <AccessBlockedDisplay
                reason="unauthorized-role"
                requiredRole="teacher"
                currentRole={user.personCategory}
            />
        );
    }

    if (!user.id) {
        return (
            <AccessBlockedDisplay
                reason="invalid-session"
                showLoginButton={true}
                loginRedirect="/auth/login"
            />
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <TeacherDashboard teacherId={user.id} />
            </div>
        </div>
    );
}
