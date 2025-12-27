'use client';

import React, { useContext } from 'react';
import { Button } from 'primereact/button';
import type { Page } from '@/types';
import { classNames } from 'primereact/utils';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { useRouter } from 'next/navigation';

const AccessDenied: Page = () => {
    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();

    const goHome = () => {
        router.push('/');
    };
    return (
        <>
            <div
                className={classNames('exception-body', 'min-h-screen', {
                    'layout-light': layoutConfig.colorScheme === 'light',
                    'layout-dark': layoutConfig.colorScheme === 'dark'
                })}
                style={{ background: 'var(--surface-ground)' }}
            >
                <div
                    className={classNames('exception-container', 'min-h-screen', 'flex', 'align-items-center', 'justify-content-center', 'flex-column', 'bg-auto', 'md:bg-contain', 'bg-no-repeat')}
                    style={{
                        background: 'var(--exception-pages-image)',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'contain',
                        boxSizing: 'border-box'
                    }}
                >
                    <div className="exception-panel text-center flex align-items-center justify-content-center flex-column" style={{ marginTop: '-200px', boxSizing: 'border-box' }}>
                        <h1 className="text-blue-500 mb-0" style={{ fontSize: '140px', fontWeight: 900, textShadow: '0px 0px 50px rgba(#0f8bfd, 0.2)' }}>
                            ACCESS
                        </h1>
                        <h3 className="text-blue-700" style={{ fontSize: '80px', fontWeight: 900, marginTop: '-90px', marginBottom: '50px' }}>
                            denied
                        </h3>
                        <p className="text-3xl" style={{ maxWidth: '320px' }}>
                            You are not allowed to view this page.
                        </p>
                        <Button type="button" onClick={goHome} style={{ marginTop: '50px' }}>
                            Go back to home
                        </Button>
                    </div>
                    <div className="exception-footer absolute align-items-center flex" style={{ bottom: '60px' }}>
                        <img src={`/layout/images/logo/logo-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} className="exception-logo" style={{ width: '34px' }} alt="logo" />
                        <img src={`/layout/images/logo/appname-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} className="exception-appname ml-3" style={{ width: '72px' }} alt="appname" />
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccessDenied;
