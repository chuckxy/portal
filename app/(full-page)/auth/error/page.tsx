'use client';

import React, { useContext } from 'react';
import { Button } from 'primereact/button';
import type { Page } from '@/types';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { classNames } from 'primereact/utils';
import { useRouter } from 'next/navigation';

const Error: Page = () => {
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
                        <h1 className="text-red-400 mb-0" style={{ fontSize: '140px', fontWeight: 900, textShadow: '0px 0px 50px rgba(#fc6161, 0.2)' }}>
                            ERROR
                        </h1>
                        <h3 className="text-red-300" style={{ fontSize: '80px', fontWeight: 900, marginTop: '-90px', marginBottom: '50px' }}>
                            Something&lsquo;s went wrong
                        </h3>

                        <Button onClick={goHome} style={{ marginTop: '50px' }}>
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

export default Error;
