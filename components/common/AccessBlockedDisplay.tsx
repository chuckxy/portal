'use client';

import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useRouter } from 'next/navigation';

type AccessBlockedReason = 'not-logged-in' | 'unauthorized-role' | 'invalid-session' | 'missing-data';

interface AccessBlockedDisplayProps {
    reason: AccessBlockedReason;
    requiredRole?: string;
    currentRole?: string;
    title?: string;
    message?: string;
    showLoginButton?: boolean;
    showBackButton?: boolean;
    loginRedirect?: string;
    customAction?: {
        label: string;
        icon?: string;
        action: () => void;
    };
}

const defaultContent = {
    'not-logged-in': {
        icon: 'pi-lock',
        iconColor: 'text-orange-500',
        title: 'Authentication Required',
        message: 'Please log in to access this page. Your session may have expired.',
        severity: 'warn' as const
    },
    'unauthorized-role': {
        icon: 'pi-ban',
        iconColor: 'text-red-500',
        title: 'Access Denied',
        message: "You don't have permission to access this page.",
        severity: 'error' as const
    },
    'invalid-session': {
        icon: 'pi-exclamation-triangle',
        iconColor: 'text-red-500',
        title: 'Session Error',
        message: 'Your session data is invalid. Please log in again.',
        severity: 'error' as const
    },
    'missing-data': {
        icon: 'pi-info-circle',
        iconColor: 'text-blue-500',
        title: 'Missing Information',
        message: 'Required information is not available. Please contact support.',
        severity: 'info' as const
    }
};

export const AccessBlockedDisplay: React.FC<AccessBlockedDisplayProps> = ({ reason, requiredRole, currentRole, title, message, showLoginButton = false, showBackButton = true, loginRedirect, customAction }) => {
    const router = useRouter();
    const content = defaultContent[reason];

    const displayTitle = title || content.title;
    const displayMessage = message || (reason === 'unauthorized-role' && requiredRole ? `This page is only accessible to ${requiredRole}s. ${currentRole ? `You are logged in as a ${currentRole}.` : ''}` : content.message);

    const handleLogin = () => {
        if (loginRedirect) {
            router.push(loginRedirect);
        } else {
            router.push('/auth/login');
        }
    };

    const handleGoBack = () => {
        router.back();
    };

    const handleGoHome = () => {
        router.push('/');
    };

    return (
        <div className="flex align-items-center justify-content-center" style={{ minHeight: '60vh', padding: '1rem' }}>
            <Card className="shadow-3 border-round-lg" style={{ maxWidth: '600px', width: '100%' }}>
                <div className="flex flex-column align-items-center text-center gap-3 p-4">
                    {/* Icon */}
                    <div className={`flex align-items-center justify-content-center border-circle ${content.iconColor} bg-${content.severity}-50`} style={{ width: '80px', height: '80px' }}>
                        <i className={`pi ${content.icon} text-5xl`}></i>
                    </div>

                    {/* Title */}
                    <h2 className="text-900 font-bold text-2xl md:text-3xl m-0">{displayTitle}</h2>

                    {/* Message */}
                    <p className="text-600 line-height-3 m-0 text-lg">{displayMessage}</p>

                    {/* Role Badge (if applicable) */}
                    {reason === 'unauthorized-role' && requiredRole && (
                        <div className="mt-2 px-4 py-2 border-round-lg bg-gray-100 border-1 border-gray-300">
                            <div className="flex align-items-center gap-2">
                                <i className="pi pi-shield text-gray-600"></i>
                                <span className="text-sm text-gray-700">
                                    <strong>Required Role:</strong> {requiredRole}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4 justify-content-center">
                        {showLoginButton && <Button label="Go to Login" icon="pi pi-sign-in" className="p-button-primary" onClick={handleLogin} />}

                        {customAction && <Button label={customAction.label} icon={customAction.icon || 'pi pi-check'} className="p-button-outlined" onClick={customAction.action} />}

                        {showBackButton && <Button label="Go Back" icon="pi pi-arrow-left" className="p-button-outlined p-button-primary" onClick={handleGoBack} />}

                        <Button label="Go to Home" icon="pi pi-home" className="p-button-text" onClick={handleGoHome} />
                    </div>

                    {/* Additional Help Text */}
                    {reason === 'not-logged-in' && (
                        <div className="mt-3 text-sm text-500">
                            <i className="pi pi-question-circle mr-1"></i>
                            Need help? Contact your administrator
                        </div>
                    )}

                    {reason === 'unauthorized-role' && (
                        <div className="mt-3 text-sm text-500">
                            <i className="pi pi-question-circle mr-1"></i>
                            If you believe this is an error, contact your administrator
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AccessBlockedDisplay;
