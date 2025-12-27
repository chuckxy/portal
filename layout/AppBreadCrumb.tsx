'use client';

import { usePathname } from 'next/navigation';
import { ObjectUtils, classNames } from 'primereact/utils';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { LayoutContext } from './context/layoutcontext';
import { Breadcrumb } from '@/types';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

const AppBreadcrumb = () => {
    const [searchActive, setSearchActive] = useState(false);
    const pathname = usePathname();
    const [breadcrumb, setBreadcrumb] = useState<Breadcrumb | null>(null);
    const { breadcrumbs, showSidebar } = useContext(LayoutContext);
    const searchInput = useRef(null);

    useEffect(() => {
        const filteredBreadcrumbs = breadcrumbs?.find((crumb) => {
            const lastPathSegment = crumb.to.split('/').pop();
            const lastRouterSegment = pathname.split('/').pop();

            if (lastRouterSegment?.startsWith('[') && !isNaN(Number(lastPathSegment))) {
                return pathname.split('/').slice(0, -1).join('/') === crumb.to?.split('/').slice(0, -1).join('/');
            }
            return crumb.to === pathname;
        });

        setBreadcrumb(filteredBreadcrumbs);
    }, [pathname, breadcrumbs]);

    const activateSearch = () => {
        setSearchActive(true);
        setTimeout(() => {
            searchInput.current.focus();
        }, 100);
    };

    const deactivateSearch = () => {
        setSearchActive(false);
    };

    const onSidebarButtonClick = () => {
        showSidebar();
    };

    return (
        <div className="layout-breadcrumb flex align-items-center relative h-3rem">
            <nav className="layout-breadcrumb">
                <ol>
                    {ObjectUtils.isNotEmpty(breadcrumb) && pathname !== '/' ? (
                        breadcrumb.labels.map((label, index) => {
                            return (
                                <React.Fragment key={index}>
                                    {index !== 0 && <li className="layout-breadcrumb-chevron"> / </li>}
                                    <li key={index}>{label}</li>
                                </React.Fragment>
                            );
                        })
                    ) : (
                        <li key={'home'}>Portal</li>
                    )}
                </ol>
            </nav>
            <ul className="breadcrumb-menu flex align-items-center justify-content-end lg:hidden absolute right-0 top-0 z-4 h-3rem w-screen">
                <li className="w-full m-0 ml-3">
                    <div className={classNames('breadcrumb-search flex justify-content-end', { 'breadcrumb-search-active': searchActive })}>
                        <Button icon="pi pi-search" className="breadcrumb-searchbutton p-button-text p-button-secondary text-color-secondary p-button-rounded flex-shrink-0" type="button" onClick={activateSearch}></Button>
                        <div className="search-input-wrapper">
                            <span className="p-input-icon-right">
                                <InputText
                                    ref={searchInput}
                                    type="text"
                                    placeholder="Search"
                                    onBlur={deactivateSearch}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ESCAPE') deactivateSearch();
                                    }}
                                />
                                <i className="pi pi-search"></i>
                            </span>
                        </div>
                    </div>
                </li>
                <li className="right-panel-button relative lg:block">
                    <Button type="button" label="Today" style={{ width: '6.7rem' }} icon="pi pi-bookmark" className="layout-rightmenu-button hidden md:block font-normal" onClick={onSidebarButtonClick}></Button>
                    <Button type="button" style={{ width: '3.286rem' }} icon="pi pi-bookmark" className="layout-rightmenu-button block md:hidden font-normal" onClick={onSidebarButtonClick}></Button>
                </li>
            </ul>
        </div>
    );
};

export default AppBreadcrumb;
