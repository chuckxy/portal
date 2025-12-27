'use client';

import React, { useState, useContext } from 'react';
import { Button } from 'primereact/button';
import { useRouter } from 'next/navigation';
import type { Page } from '@/types';
import { InputNumber } from 'primereact/inputnumber';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { classNames } from 'primereact/utils';

const Verification: Page = () => {
    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();

    const [value1, setValue1] = useState(null);
    const [value2, setValue2] = useState(null);
    const [value3, setValue3] = useState(null);
    const [value4, setValue4] = useState(null);
    const [verify, setVerify] = useState(false);

    const goHome = () => {
        router.push('/');
    };

    const focus = (event) => {
        const regexNum = /^\d+$/;
        const isValid = regexNum.test(event.key);
        const nextElementInputRef = event.currentTarget.nextElementSibling?.children[0];

        if (isValid && nextElementInputRef) {
            nextElementInputRef.focus();
        }
    };

    return (
        <div
            className={classNames('login-body', 'flex', 'min-h-screen', {
                'layout-light': layoutConfig.colorScheme === 'light',
                'layout-dark': layoutConfig.colorScheme === 'dark'
            })}
        >
            <div className="login-image w-6 h-screen hidden md:block" style={{ maxWidth: '490px' }}>
                <img src={`/layout/images/pages/verification-${layoutConfig.colorScheme === 'dark' ? 'ondark' : 'onlight'}.png`} alt="atlantis" className="h-screen w-full" />
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
                            <h4 className="text-900 font-bold mb-2">Verification</h4>
                            <span className="text-600 font-medium">We have sent code to your email:</span>
                            <div className="flex align-items-center mt-1 mb-4">
                                <i className="pi pi-envelope text-600"></i>
                                <span className="text-900 font-bold ml-2">dm**@gmail.com</span>
                            </div>
                            <div className="flex justify-content-between w-full align-items-center gap-3">
                                <InputNumber inputId="val1" value={value1} onInput={(e) => setValue1(e.target)} inputClassName="w-3rem text-center" max={9} onKeyUp={focus} />
                                <InputNumber inputId="val2" value={value2} onInput={(e) => setValue2(e.target)} inputClassName="w-3rem text-center" max={9} onKeyUp={focus} />
                                <InputNumber inputId="val3" value={value3} onInput={(e) => setValue3(e.target)} inputClassName="w-3rem text-center" max={9} onKeyUp={focus} />
                                <InputNumber inputId="val4" value={value4} onInput={(e) => setValue4(e.target)} inputClassName="w-3rem text-center" max={9} />
                            </div>
                        </div>
                        <div className="button-container mt-4 text-left" style={{ maxWidth: '320px', minWidth: '270px' }}>
                            <div className="buttons flex align-items-center gap-3">
                                <Button onClick={goHome} className="block p-button-danger p-button-outlined" style={{ maxWidth: '320px', marginBottom: '32px' }}>
                                    Cancel
                                </Button>
                                <Button onClick={() => setVerify(true)} className="block" style={{ maxWidth: '320px', marginBottom: '32px' }}>
                                    Verify
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
    );
};

export default Verification;
