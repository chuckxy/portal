'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PersonCategory } from '@/models/Person';

interface UseRequireAuthOptions {
    allowedRoles?: PersonCategory[];
    redirectTo?: string;
    redirectOnUnauthorized?: boolean;
}

interface UseRequireAuthResult {
    user: ReturnType<typeof useAuth>['user'];
    isAuthenticated: boolean;
    isLoading: boolean;
    isAuthorized: boolean;
}

/**
 * Hook to require authentication for a page
 * Redirects to login if not authenticated
 * Optionally checks for specific roles
 */
export const useRequireAuth = (options: UseRequireAuthOptions = {}): UseRequireAuthResult => {
    const { allowedRoles, redirectTo = '/auth/login', redirectOnUnauthorized = false } = options;
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    // Calculate if user is authorized based on roles
    const isAuthorized = useMemo(() => {
        if (!isAuthenticated || !user) return false;
        if (!allowedRoles || allowedRoles.length === 0) return true;
        return allowedRoles.includes(user.personCategory);
    }, [isAuthenticated, user, allowedRoles]);

    useEffect(() => {
        if (!isLoading) {
            // If not authenticated, redirect to login
            if (!isAuthenticated) {
                router.push(redirectTo);
                return;
            }

            // If allowed roles are specified, check if user has permission
            if (redirectOnUnauthorized && allowedRoles && allowedRoles.length > 0 && user) {
                if (!allowedRoles.includes(user.personCategory)) {
                    // User doesn't have required role, redirect to unauthorized page
                    router.push('/unauthorized');
                }
            }
        }
    }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router, redirectOnUnauthorized]);

    return { user, isAuthenticated, isLoading, isAuthorized };
};
