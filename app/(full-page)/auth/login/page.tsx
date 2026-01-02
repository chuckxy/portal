'use client';

import React from 'react';
import { Button } from 'primereact/button';
import LoginForm from '@/components/features/auth/login/LoginForm';
import { Page } from '@/types';
import './login.css';

const Login: Page = () => {
    const handleDemoLogin = async (role: 'student' | 'teacher' | 'admin') => {
        const demoCredentials = {
            student: { username: 'demo.student', password: 'Student123' },
            teacher: { username: 'demo.teacher', password: 'Teacher123' },
            admin: { username: 'demo.admin', password: 'Admin123' }
        };

        console.log(`Demo login for ${role}:`, demoCredentials[role]);

        // You can auto-fill the form or trigger login directly here
        // For now, just logging the credentials
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-content">
                    {/* Left Side - Info */}
                    <div className="login-info-section hidden lg:block">
                        <div className="info-content">
                            <div className="logo-section">
                                <i className="pi pi-graduation-cap text-6xl mb-4"></i>
                                <h2>Welcome Back!</h2>
                                <p>Sign in to access your school portal</p>
                            </div>

                            <div className="features-list">
                                <div className="feature-item">
                                    <i className="pi pi-check-circle text-3xl"></i>
                                    <div>
                                        <h4>Secure Access</h4>
                                        <p>Your data is protected with industry-standard encryption</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <i className="pi pi-bolt text-3xl"></i>
                                    <div>
                                        <h4>Real-Time Updates</h4>
                                        <p>Stay informed with instant notifications and live updates</p>
                                    </div>
                                </div>

                                <div className="feature-item">
                                    <i className="pi pi-users text-3xl"></i>
                                    <div>
                                        <h4>All-in-One Platform</h4>
                                        <p>Manage students, staff, grades, and more from one place</p>
                                    </div>
                                </div>
                            </div>

                            {/* Demo Accounts Info */}
                            <div className="demo-info">
                                <h4>Try Demo Accounts</h4>
                                <div className="demo-buttons">
                                    <Button
                                        label="Demo Student"
                                        icon="pi pi-user"
                                        outlined
                                        className="demo-btn"
                                        onClick={() => handleDemoLogin('student')}
                                    />
                                    <Button
                                        label="Demo Teacher"
                                        icon="pi pi-briefcase"
                                        outlined
                                        className="demo-btn"
                                        onClick={() => handleDemoLogin('teacher')}
                                    />
                                    <Button
                                        label="Demo Admin"
                                        icon="pi pi-shield"
                                        outlined
                                        className="demo-btn"
                                        onClick={() => handleDemoLogin('admin')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <LoginForm />
                </div>
            </div>
        </div>
    );
};

export default Login;
