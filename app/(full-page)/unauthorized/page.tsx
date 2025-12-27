'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const UnauthorizedPage = () => {
    const router = useRouter();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="flex align-items-center justify-content-center min-h-screen surface-ground p-4">
            <div className="text-center max-w-30rem">
                <i className="pi pi-lock text-red-500 text-6xl mb-4"></i>
                <h1 className="text-5xl font-bold text-900 mb-3">Access Denied</h1>
                <p className="text-600 text-xl mb-5 line-height-3">{`You don't have permission to access this page. Please contact your administrator if you believe this is an error.`}</p>
                <div className="flex gap-3 justify-content-center flex-wrap">
                    <Button label="Go to Dashboard" icon="pi pi-home" onClick={() => router.push('/')} className="p-button-lg" />
                    <Button label="Logout" icon="pi pi-sign-out" onClick={handleLogout} className="p-button-lg p-button-outlined" />
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
