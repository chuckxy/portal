'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PersonCategory } from '@/models/Person';

interface UseRequireAuthOptions {
    allowedRoles?: PersonCategory[];
    redirectTo?: string;
}

/**
 * Hook to require authentication for a page
 * Redirects to login if not authenticated
 * Optionally checks for specific roles
 */
export const useRequireAuth = (options: UseRequireAuthOptions = {}) => {
    const { allowedRoles, redirectTo = '/auth/login' } = options;
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

    return { user, isAuthenticated, isLoading };
};
