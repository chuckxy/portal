'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthState, LoginCredentials, AuthResponse, AuthContextType } from '@/types/auth';
import LocalDBService from '@/lib/services/localDBService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAuthenticated: false,
        isLoading: true
    });
    const router = useRouter();

    // Initialize auth state from LocalDB
    useEffect(() => {
        const initAuth = async () => {
            try {
                const storedUser = await LocalDBService.getLocalDataItem('user');
                const storedToken = await LocalDBService.getLocalDataItem('authToken');

                if (storedUser && storedToken) {
                    setAuthState({
                        user: storedUser as User,
                        isAuthenticated: true,
                        isLoading: false
                    });
                } else {
                    setAuthState({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false
                });
            }
        };

        initAuth();
    }, []);

    const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.error || 'Login failed'
                };
            }

            // Store user and token using LocalDBService
            await LocalDBService.setLocalDataItem(data.user, 'user');
            await LocalDBService.setLocalDataItem(data.token, 'authToken');

            if (credentials.rememberMe) {
                await LocalDBService.setLocalDataItem(true, 'rememberMe');
            }

            setAuthState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false
            });

            return {
                success: true,
                message: 'Login successful',
                user: data.user,
                token: data.token
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'An error occurred during login. Please try again.'
            };
        }
    };

    const logout = async () => {
        try {
            // Clear auth data using LocalDBService
            await LocalDBService.setLocalDataItem(null, 'user');
            await LocalDBService.setLocalDataItem(null, 'authToken');
            await LocalDBService.setLocalDataItem(null, 'rememberMe');

            setAuthState({
                user: null,
                isAuthenticated: false,
                isLoading: false
            });

            router.push('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateProfile = async (data: Partial<User>) => {
        if (!authState.user) return;

        try {
            const updatedUser = { ...authState.user, ...data };
            await LocalDBService.setLocalDataItem(updatedUser, 'user');

            setAuthState({
                ...authState,
                user: updatedUser
            });
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    };

    const refreshUser = async () => {
        try {
            const storedUser = await LocalDBService.getLocalDataItem('user');
            const storedToken = await LocalDBService.getLocalDataItem('authToken');

            if (storedUser && storedToken) {
                setAuthState({
                    user: storedUser as User,
                    isAuthenticated: true,
                    isLoading: false
                });
            } else {
                setAuthState({
                    user: null,
                    isAuthenticated: false,
                    isLoading: false
                });
            }
        } catch (error) {
            console.error('Refresh user error:', error);
        }
    };

    const value: AuthContextType = {
        user: authState.user,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        login,
        logout,
        updateProfile,
        refreshUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
