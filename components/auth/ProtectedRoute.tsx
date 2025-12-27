'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { PersonCategory } from '@/models/Person';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: PersonCategory[];
    redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    redirectTo = '/auth/login'
}) => {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            // If not authenticated, redirect to login
            if (!isAuthenticated) {
                router.push(redirectTo);
                return;
            }

            // If allowed roles are specified, check if user has permission
            if (allowedRoles && allowedRoles.length > 0 && user) {
                if (!allowedRoles.includes(user.personCategory)) {
                    // User doesn't have required role, redirect to unauthorized page
                    router.push('/unauthorized');
                }
            }
        }
    }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router]);

    // Show loading spinner while checking authentication
    if (isLoading) {
        return (
            <div className="flex align-items-center justify-content-center min-h-screen surface-ground">
                <div className="text-center">
                    <ProgressSpinner style={{ width: '50px', height: '50px' }} />
                    <p className="text-600 mt-3">Loading...</p>
                </div>
            </div>
        );
    }

    // Show nothing if not authenticated (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    // Check role permission
    if (allowedRoles && allowedRoles.length > 0 && user) {
        if (!allowedRoles.includes(user.personCategory)) {
            return null; // Will redirect via useEffect
        }
    }

    // Render protected content
    return <>{children}</>;
};

export default ProtectedRoute;
