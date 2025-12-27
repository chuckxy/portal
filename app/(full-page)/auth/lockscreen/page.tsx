'use client';

import React, { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Page } from '../../../../types/layout';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { classNames } from 'primereact/utils';

const LockScreen: Page = () => {
    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();

    const goHome = () => {
        router.push('/');
    };

    return (
        <>
            <div
                className={classNames('login-body', 'flex', 'min-h-screen', {
                    'layout-light': layoutConfig.colorScheme === 'light',
                    'layout-dark': layoutConfig.colorScheme === 'dark'
                })}
            >
                <div className="login-image w-6 h-screen hidden md:block" style={{ maxWidth: '490px' }}>
                    <img src={`/layout/images/pages/lock-${layoutConfig.colorScheme === 'dark' ? 'ondark' : 'onlight'}.png`} alt="atlantis" className="h-screen w-full" />
                </div>
                <div className="w-full" style={{ background: 'var(--surface-ground)' }}>
                    <div
                        className="p-fluid min-h-screen bg-auto md:bg-contain bg-no-repeat text-center w-full flex align-items-center md:align-items-start justify-content-center flex-column bg-auto md:bg-contain bg-no-repeat"
                        style={{ padding: '20% 10% 20% 10%', background: 'var(--exception-pages-image)' }}
                    >
                        <div className="flex flex-column">
                            <div className="flex align-items-center mb-6 logo-container">
                                <img src={`/layout/images/logo/logo-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} className="login-logo" style={{ width: '45px' }} alt="logo" />
                                <img src={`/layout/images/logo/appname-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} className="login-appname ml-3" style={{ width: '100px' }} alt="appname" />
                            </div>
                            <div className="form-container text-left" style={{ maxWidth: '320px', minWidth: '270px' }}>
                                <div className="mb-4 flex flex-column align-items-start">
                                    <h4 className="text-900 font-bold mb-2">Screen Locked</h4>
                                    <span className="text-600 font-medium mb-5">Please enter your password</span>
                                    <img src="/layout/images/pages/avatar.png" className="w-3rem h-3rem mb-2" alt="Avatar" />
                                    <span className="font-medium text-900 font-medium">Isabella Andolini</span>
                                </div>
                                <span className="p-input-icon-left">
                                    <i className="pi pi-key"></i>
                                    <InputText type="password" autoComplete="off" placeholder="Password" className="block mb-3" style={{ maxWidth: '320px', minWidth: '270px' }} />
                                </span>
                            </div>
                            <div className="button-container mt-4 text-left" style={{ maxWidth: '320px', minWidth: '270px' }}>
                                <div className="buttons flex align-items-center gap-3">
                                    <Button onClick={goHome} className="block" style={{ maxWidth: '320px', marginBottom: '32px' }}>
                                        Unlock
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="login-footer flex align-items-center absolute" style={{ bottom: '75px' }}>
                            <div className="flex align-items-center login-footer-logo-container pr-4 mr-4 border-right-1 surface-border">
                                <img src="/layout/images/logo/logo-gray.png" className="login-footer-logo" style={{ width: '22px' }} alt="logo" />
                                <img src="/layout/images/logo/appname-gray.png" className="login-footer-appname ml-2" style={{ width: '45px' }} alt="appname" />
                            </div>
                            <span className="text-sm text-color-secondary mr-3">Copyright 2023</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LockScreen;
