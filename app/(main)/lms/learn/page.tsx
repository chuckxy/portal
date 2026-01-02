'use client';

import { Suspense } from 'react';
import StudentLearningPortal from '@/components/features/lms/StudentLearningPortal';

// Loading component
const LoadingState = () => (
    <div className="surface-ground min-h-screen flex align-items-center justify-content-center">
        <div className="text-center">
            <i className="pi pi-spin pi-spinner text-4xl text-primary mb-3"></i>
            <p className="text-600">Loading your course...</p>
        </div>
    </div>
);

const LearnPage = () => {
    return (
        <Suspense fallback={<LoadingState />}>
            <StudentLearningPortal />
        </Suspense>
    );
};

export default LearnPage;
