'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import StudentDashboard from '@/components/features/students/StudentDashboard';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function StudentDashboardPage() {
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
            <div className="grid">
                <div className="col-12">
                    <Message severity="warn" text="Please log in to access the student dashboard" />
                </div>
            </div>
        );
    }

    if (user.personCategory !== 'student') {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="error" text="This dashboard is only accessible to students" />
                </div>
            </div>
        );
    }

    if (!user.id) {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="error" text="User ID not found. Please log in again." />
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <StudentDashboard studentId={user.id} />
            </div>
        </div>
    );
}
