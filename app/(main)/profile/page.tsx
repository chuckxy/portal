'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ProfileEditForm from '@/components/ProfileEditForm';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';

export default function ProfilePage() {
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
                    <Message severity="warn" text="Please log in to access your profile" />
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
                <ProfileEditForm userId={user.id} personCategory={user.personCategory} />
            </div>
        </div>
    );
}
