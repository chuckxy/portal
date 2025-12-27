'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ExamScoreEntryForm from '@/components/ExamScoreEntryForm';
import { Card } from 'primereact/card';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useAuth } from '@/context/AuthContext';

export default function ExamScorePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const toast = React.useRef<Toast>(null);

    const [examScore, setExamScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const scoreId = searchParams.get('id');
    const isEditMode = !!scoreId;

    useEffect(() => {
        if (scoreId) {
            // Edit mode: Fetch existing score
            fetchExamScore(scoreId);
        } else {
            // Create mode: Ready immediately
            setLoading(false);
        }
    }, [scoreId]);

    const fetchExamScore = async (id: string) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/exam-scores/${id}`);

            if (!response.ok) {
                throw new Error('Failed to fetch exam score');
            }

            const data = await response.json();
            setExamScore(data);
        } catch (err: any) {
            console.error('Error fetching exam score:', err);
            setError(err.message || 'Failed to load exam score');
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load exam score',
                life: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (data: any) => {
        toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: isEditMode ? 'Exam score updated successfully' : 'Exam score created successfully',
            life: 3000
        });

        // Optional: Navigate back to list or stay on page
        // router.push('/exam-scores');
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <ProgressSpinner />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <Card>
                <div className="text-center p-5">
                    <i className="pi pi-exclamation-triangle text-6xl text-red-500 mb-3"></i>
                    <h3 className="text-red-500 mb-2">Error Loading Exam Score</h3>
                    <p className="text-600 mb-3">{error}</p>
                    <button onClick={() => router.back()} className="p-button p-component">
                        Go Back
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <div className="exam-score-page">
            <Toast ref={toast} />

            <ExamScoreEntryForm existingScore={examScore} onSave={handleSave} />
        </div>
    );
}
