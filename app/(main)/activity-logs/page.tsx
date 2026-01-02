'use client';

import React from 'react';
import ActivityLogManagement from '@/components/ActivityLogManagement';
import { useRequireAuth } from '@/hooks/useRequireAuth';

/**
 * Activity Logs Page
 *
 * Admin-only page for viewing and auditing all system activities.
 * Access is restricted to proprietors, admins, and headmasters.
 */
export default function ActivityLogsPage() {
    // Require authentication and specific roles
    const { isLoading, isAuthorized } = useRequireAuth({
        allowedRoles: ['proprietor', 'admin', 'headmaster']
    });

    if (isLoading) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                    <i className="pi pi-spin pi-spinner text-4xl text-primary mb-3"></i>
                    <p className="text-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                <div className="text-center">
                    <i className="pi pi-lock text-4xl text-red-500 mb-3"></i>
                    <h3 className="text-900">Access Denied</h3>
                    <p className="text-500">
                        You do not have permission to view activity logs.
                        <br />
                        This page is restricted to administrators only.
                    </p>
                </div>
            </div>
        );
    }

    return <ActivityLogManagement />;
}
