'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { useRouter } from 'next/navigation';

const Home = () => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

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
                    <Message severity="warn" text="Please log in to access your dashboard" />
                </div>
            </div>
        );
    }

    return (
        <div className="grid">
            <div className="col-12">
                <Card>
                    <div className="flex align-items-center justify-content-between mb-3">
                        <div className="flex align-items-center">
                            {user.photoLink && <img src={user.photoLink} alt={user.fullName} className="border-circle" style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '1rem' }} />}
                            <div>
                                <h2 className="m-0">Welcome, {user.fullName}</h2>
                                <p className="text-600 m-0 mt-1">Role: {user.personCategory.charAt(0).toUpperCase() + user.personCategory.slice(1)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid mt-4">
                        <div className="col-12">
                            <Message severity="info" text="Your personalized dashboard is being developed. In the meantime, you can access the system features from the menu." />
                        </div>

                        <div className="col-12 mt-4">
                            <h3>Quick Links</h3>
                            <div className="grid">
                                {(user.personCategory === 'librarian' || user.personCategory === 'admin') && (
                                    <>
                                        <div className="col-12 md:col-6 lg:col-4">
                                            <Button label="Manage Students" icon="pi pi-users" className="w-full p-button-outlined" onClick={() => router.push('/students')} />
                                        </div>
                                        <div className="col-12 md:col-6 lg:col-4">
                                            <Button label="Manage Teachers" icon="pi pi-briefcase" className="w-full p-button-outlined" onClick={() => router.push('/teachers')} />
                                        </div>
                                        <div className="col-12 md:col-6 lg:col-4">
                                            <Button label="View Sites" icon="pi pi-building" className="w-full p-button-outlined" onClick={() => router.push('/sites')} />
                                        </div>
                                    </>
                                )}
                                {user.personCategory === 'parent' && (
                                    <div className="col-12">
                                        <Message severity="info" text="Parent dashboard coming soon! You'll be able to view your children's academic progress, attendance, and more." />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Home;
