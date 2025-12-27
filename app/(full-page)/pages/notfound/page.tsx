'use client';

import React, { useContext } from 'react';
import { Button } from 'primereact/button';

import { classNames } from 'primereact/utils';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { useRouter } from 'next/navigation';

function NotFound() {
    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();

    const goHome = () => {
        router.push('/');
    };
    return (
        <>
            <div className={classNames('exception-body', 'min-h-screen', layoutConfig.colorScheme === 'light' ? 'layout-light' : 'layout-dark')} style={{ background: 'var(--surface-ground)' }}>
                <div
                    className="exception-container  min-h-screen flex align-items-center justify-content-center flex-column bg-auto md:bg-contain bg-no-repeat"
                    style={{ boxSizing: 'border-box', background: 'var(--exception-pages-image)', backgroundRepeat: 'no-repeat', backgroundSize: 'contain' }}
                >
                    <div className="exception-panel text-center flex align-items-center justify-content-center flex-column" style={{ marginTop: '-200px', boxSizing: 'border-box' }}>
                        <h1 className="text-blue-500 mb-0" style={{ fontSize: '140px', fontWeight: '900', textShadow: '0px 0px 50px rgba(#0F8BFD, 0.2)' }}>
                            404
                        </h1>
                        <h3 className="text-blue-700" style={{ fontSize: '80px', fontWeight: '900', marginTop: '-90px', marginBottom: '50px' }}>
                            not found
                        </h3>
                        <p className="text-3xl" style={{ maxWidth: '320px' }}>
                            The page that you are looking for does not exist
                        </p>
                        <Button type="button" label="Go back to home" style={{ marginTop: '50px' }} onClick={goHome}></Button>
                    </div>
                    <div className="exception-footer absolute align-items-center flex" style={{ bottom: '60px' }}>
                        <img src={`/layout/images/logo/logo-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} alt="Logo" className="exception-logo" style={{ width: '34px' }} />
                        <img src={`/layout/images/logo/appname-${layoutConfig.colorScheme === 'light' ? 'dark' : 'light'}.png`} alt="App Name" className="exception-appname ml-3" style={{ width: '72px' }} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default NotFound;
