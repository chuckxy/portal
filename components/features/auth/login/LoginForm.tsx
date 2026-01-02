'use client';

import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Message } from 'primereact/message';
import { useRouter } from 'next/navigation';
import { classNames } from 'primereact/utils';
import { useAuth } from '@/context/AuthContext';

interface LoginFormData {
    username: string;
    password: string;
    rememberMe: boolean;
}

const LoginForm: React.FC = () => {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<LoginFormData>({
        username: '',
        password: '',
        rememberMe: false
    });

    const handleInputChange = (field: keyof LoginFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validateForm = (): boolean => {
        if (!formData.username.trim()) {
            setError('Username is required');
            return false;
        }
        if (!formData.password) {
            setError('Password is required');
            return false;
        }
        return true;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await login({
                username: formData.username,
                password: formData.password,
                rememberMe: formData.rememberMe
            });

            if (response.success && response.user) {
                // Redirect to appropriate dashboard based on person category
                switch (response.user.personCategory) {
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
                        router.push('/proprietor');
                        break;
                    case 'finance':
                        router.push('/finance');
                        break;
                    case 'librarian':
                        router.push('/library/dashboard');
                        break;
                    case 'admin':
                        router.push('/proprietor');
                        break;
                    case 'parent':
                        router.push('/home');
                        break;
                    default:
                        router.push('/');
                }
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-form-section">
            <div className="form-wrapper">
                <div className="form-header">
                    <h1 className="text-4xl font-bold text-900 mb-2">Sign In</h1>
                    <p className="text-600 text-lg">Enter your credentials to access your account</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    {error && <Message severity="error" text={error} className="w-full mb-4" />}

                    {/* Username Field */}
                    <div className="field mb-4">
                        <label htmlFor="username" className="block text-900 font-semibold mb-2">
                            Username or Email
                        </label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-user" />
                            <InputText
                                id="username"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                placeholder="Enter your username"
                                className={classNames('w-full', {
                                    'p-invalid': error && !formData.username
                                })}
                                disabled={loading}
                            />
                        </span>
                    </div>

                    {/* Password Field */}
                    <div className="field mb-4">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <label htmlFor="password" className="text-900 font-semibold">
                                Password
                            </label>
                            <a onClick={() => router.push('/auth/forgotpassword')} className="text-primary font-semibold cursor-pointer hover:underline text-sm">
                                Forgot Password?
                            </a>
                        </div>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-lock" />
                            <Password
                                id="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="Enter your password"
                                className="w-full"
                                inputClassName={classNames('w-full', {
                                    'p-invalid': error && !formData.password
                                })}
                                toggleMask
                                feedback={false}
                                disabled={loading}
                            />
                        </span>
                    </div>

                    {/* Remember Me */}
                    <div className="flex align-items-center mb-5">
                        <Checkbox inputId="rememberMe" checked={formData.rememberMe} onChange={(e) => handleInputChange('rememberMe', e.checked)} disabled={loading} />
                        <label htmlFor="rememberMe" className="ml-2 text-700 cursor-pointer">
                            Remember me for 7 days
                        </label>
                    </div>

                    {/* Login Button */}
                    <Button type="submit" label={loading ? 'Signing in...' : 'Sign In'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-sign-in'} className="w-full p-button-lg font-bold mb-4" disabled={loading} />

                    {/* Register Link */}
                    <div className="text-center">
                        <p className="text-600 m-0">
                            {`Don't have an account`}
                            <a onClick={() => router.push('/auth/register')} className="font-bold text-primary cursor-pointer hover:underline">
                                Register your school
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
