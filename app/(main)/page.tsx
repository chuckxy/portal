'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ProgressSpinner } from 'primereact/progressspinner';

const Home = () => {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated || !user) {
            router.push('/landing');
            return;
        }

        // Redirect based on user's person category
        switch (user.personCategory) {
            case 'student':
                router.push('/students');
                break;
            case 'teacher':
                router.push('/teachers');
                break;
            case 'proprietor':
                router.push('/proprietor');
                break;
            case 'headmaster':
                router.push('/proprietor'); // Headmaster can use proprietor dashboard or create separate one
                break;
            case 'finance':
                router.push('/proprietor'); // Finance can use proprietor dashboard or create separate one
                break;
            case 'librarian':
                router.push('/home'); // Default home for now
                break;
            case 'admin':
                router.push('/proprietor'); // Admin can use proprietor dashboard
                break;
            case 'parent':
                router.push('/home'); // Default home for parents for now
                break;
            default:
                router.push('/home');
        }
    }, [user, isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <ProgressSpinner />
            </div>
        );
    }

    return (
        <div className="flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
            <ProgressSpinner />
        </div>
    );
};

export default Home;
