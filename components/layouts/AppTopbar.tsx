'use client';

import React, { forwardRef, useImperativeHandle, useContext, useRef, useState, useEffect } from 'react';

import AppBreadCrumb from './AppBreadCrumb';
import { LayoutContext } from './context/layoutcontext';
import AppSidebar from './AppSidebar';
import { StyleClass } from 'primereact/styleclass';
import { Ripple } from 'primereact/ripple';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { useAuth } from '@/context/AuthContext';

const AppTopbar = forwardRef((props: { sidebarRef: React.RefObject<HTMLDivElement> }, ref) => {
    const [searchActive, setSearchActive] = useState(false);
    const [schoolInfo, setSchoolInfo] = useState<any>(null);
    const [siteInfo, setSiteInfo] = useState<any>(null);

    const btnRef1 = useRef(null);
    const btnRef2 = useRef(null);
    const menubutton = useRef(null);
    const menubuttonRef = useRef(null);
    const searchInput = useRef(null);
    const profileRef = useRef(null);
    const profileMenuRef = useRef(null);

    const { onMenuToggle, showConfigSidebar, showSidebar, layoutConfig } = useContext(LayoutContext);
    const { logout, user } = useAuth();

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current
    }));

    // Fetch school and site info
    useEffect(() => {
        const fetchSchoolInfo = async () => {
            if (!user?.school) return;

            try {
                const schoolRes = await fetch(`/api/schools/${user.school}`);
                const schoolData = await schoolRes.json();
                if (schoolData.success) {
                    setSchoolInfo(schoolData.data);
                }
            } catch (error) {
                console.error('Error fetching school info:', error);
            }

            if (user?.schoolSite) {
                try {
                    const siteRes = await fetch(`/api/sites/${user.schoolSite}`);
                    const siteData = await siteRes.json();
                    if (siteData.success) {
                        setSiteInfo(siteData.data);
                    }
                } catch (error) {
                    console.error('Error fetching site info:', error);
                }
            }
        };

        fetchSchoolInfo();
    }, [user?.school, user?.schoolSite]);

    const activateSearch = () => {
        setSearchActive(true);

        setTimeout(() => {
            (searchInput.current as any).focus();
        }, 1000);
    };
    const deactivateSearch = () => {
        setSearchActive(false);
    };
    const handleKeyDown = (event: any) => {
        if (event.key === 'Escape') {
            deactivateSearch();
        }
    };

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();
        await logout();
    };

    return (
        <React.Fragment>
            <div className="layout-topbar">
                <div className="topbar-start">
                    <button ref={btnRef1} type="button" className="p-ripple topbar-menubutton p-link p-trigger" onClick={onMenuToggle}>
                        <i className="pi pi-bars"></i>
                        <Ripple />
                    </button>

                    <div className="topbar-breadcrumb">
                        <AppBreadCrumb></AppBreadCrumb>
                    </div>
                </div>
                <div className="layout-topbar-menu-section">
                    <AppSidebar sidebarRef={props.sidebarRef} />
                </div>
                <div className="topbar-end">
                    <ul className="topbar-menu">
                        {/* School and Site Info */}
                        {schoolInfo && (
                            <li className="mr-3 hidden lg:flex align-items-center">
                                <div className="flex align-items-center gap-2 border-1 surface-border border-round px-3 py-2 bg-primary-50">
                                    <i className="pi pi-building text-primary" style={{ fontSize: '1rem' }}></i>
                                    <div className="flex flex-column">
                                        <span className="text-xs text-500">Current School</span>
                                        <span className="font-semibold text-900 text-sm">{schoolInfo.schoolName}</span>
                                        {siteInfo && <span className="text-xs text-primary">{siteInfo.siteName}</span>}
                                    </div>
                                </div>
                            </li>
                        )}

                        <li className="hidden lg:block">
                            <div className={classNames('topbar-search', { 'topbar-search-active': searchActive })}>
                                <Button icon="pi pi-search" className="topbar-searchbutton p-button-text p-button-secondary text-color-secondary p-button-rounded flex-shrink-0" type="button" onClick={activateSearch}></Button>
                                <div className="search-input-wrapper">
                                    <span className="p-input-icon-right">
                                        <InputText
                                            ref={searchInput}
                                            type="text"
                                            placeholder="Search"
                                            onBlur={deactivateSearch}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') deactivateSearch();
                                            }}
                                        />
                                        <i className="pi pi-search"></i>
                                    </span>
                                </div>
                            </div>
                        </li>

                        <li className="profile-item topbar-item">
                            <Button type="button" icon="pi pi-bell" className="p-button-text p-button-secondary text-color-secondary p-button-rounded flex-shrink-0"></Button>
                        </li>

                        <li className="profile-item topbar-item">
                            <Button type="button" icon="pi pi-comment" className="p-button-text p-button-secondary relative text-color-secondary p-button-rounded flex-shrink-0"></Button>
                        </li>

                        <li className="ml-3">
                            <Button type="button" icon="pi pi-cog" className="p-button-text p-button-secondary text-color-secondary p-button-rounded flex-shrink-0" onClick={showConfigSidebar}></Button>
                        </li>

                        <li ref={profileMenuRef} className="profile-item topbar-item">
                            <StyleClass nodeRef={profileRef} selector="@next" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                <a className="p-ripple" ref={profileRef}>
                                    <img className="border-circle cursor-pointer" src="/layout/images/avatar/avatar-m-1.jpg" alt="avatar" />
                                    <Ripple />
                                </a>
                            </StyleClass>

                            <ul className="topbar-menu active-topbar-menu p-4 w-15rem z-5 hidden border-round">
                                <li role="menuitem" className="m-0 mb-3">
                                    <StyleClass nodeRef={menubutton} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                        <a href="/profile" ref={menubutton} className="flex align-items-center hover:text-primary-500 transition-duration-200">
                                            <i className="pi pi-fw pi-user mr-2"></i>
                                            <span>My Profile</span>
                                        </a>
                                    </StyleClass>
                                </li>

                                <li role="menuitem" className="m-0 mb-3">
                                    <StyleClass nodeRef={menubuttonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                        <a href="#" ref={menubuttonRef} className="flex align-items-center hover:text-primary-500 transition-duration-200">
                                            <i className="pi pi-fw pi-cog mr-2"></i>
                                            <span>Settings</span>
                                        </a>
                                    </StyleClass>
                                </li>
                                <li role="menuitem" className="m-0" onClick={handleLogout}>
                                    <StyleClass nodeRef={btnRef2} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                        <a href="#" ref={btnRef2} className="flex align-items-center hover:text-primary-500 transition-duration-200">
                                            <i className="pi pi-fw pi-sign-out mr-2"></i>
                                            <span>Logout</span>
                                        </a>
                                    </StyleClass>
                                </li>
                            </ul>
                        </li>

                        <li className="right-panel-button relative hidden lg:block">
                            <Button type="button" label="Today" style={{ width: '5.7rem' }} icon="pi pi-bookmark" className="layout-rightmenu-button md:block font-normal" onClick={showSidebar}></Button>
                            <Button type="button" icon="pi pi-bookmark" className="layout-rightmenu-button block md:hidden font-normal" onClick={showSidebar}></Button>
                        </li>
                    </ul>
                </div>
            </div>
        </React.Fragment>
    );
});

export default AppTopbar;

AppTopbar.displayName = 'AppTopbar';
