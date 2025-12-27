'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TeacherDashboard from '@/components/TeacherDashboard';
import { Message } from 'primereact/message';
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
            <div className="grid">
                <div className="col-12">
                    <Message severity="warn" text="Please log in to access the teacher dashboard" />
                </div>
            </div>
        );
    }

    if (user.personCategory !== 'teacher') {
        return (
            <div className="grid">
                <div className="col-12">
                    <Message severity="error" text="This dashboard is only accessible to teachers" />
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
                <TeacherDashboard teacherId={user.id} />
            </div>
        </div>
    );
}
