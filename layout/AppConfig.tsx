'use client';

import React from 'react';
import { classNames } from 'primereact/utils';
import { PrimeReactContext } from 'primereact/api';
import { RadioButton, RadioButtonChangeEvent } from 'primereact/radiobutton';
import { InputSwitch, InputSwitchChangeEvent } from 'primereact/inputswitch';
import { Button } from 'primereact/button';
import { LayoutContext } from './context/layoutcontext';
import { Sidebar } from 'primereact/sidebar';
import { useContext, useEffect } from 'react';
import { AppConfigProps, ColorScheme } from '../types/layout';

const AppConfig = (props: AppConfigProps) => {
    const { layoutConfig, setLayoutConfig, layoutState, setLayoutState, isSlim, isHorizontal, isSlimPlus } = useContext(LayoutContext);
    const { setRipple, changeTheme } = useContext(PrimeReactContext);
    const scales = [12, 13, 14, 15, 16];

    const componentThemes = [
        { name: 'blue', color: '#0F8BFD' },
        { name: 'green', color: '#0BD18A' },
        { name: 'magenta', color: '#EC4DBC' },
        { name: 'orange', color: '#FD9214' },
        { name: 'purple', color: '#873EFE' },
        { name: 'red', color: '#FC6161' },
        { name: 'teal', color: '#00D0DE' },
        { name: 'yellow', color: '#EEE500' }
    ];

    useEffect(() => {
        if (isSlim() || isHorizontal() || isSlimPlus()) {
            setLayoutState((prevState) => ({ ...prevState, resetMenu: true }));
        }
    }, [layoutConfig.menuMode]);

    const changeInputStyle = (e: RadioButtonChangeEvent) => {
        setLayoutConfig((prevState) => ({ ...prevState, inputStyle: e.value }));
    };

    const changeRipple = (e: InputSwitchChangeEvent) => {
        setRipple(e.value);
        setLayoutConfig((prevState) => ({ ...prevState, ripple: e.value }));
    };

    const changeMenuMode = (e: RadioButtonChangeEvent) => {
        setLayoutConfig((prevState) => ({ ...prevState, menuMode: e.value }));
    };

    const changeColorScheme = (colorScheme: ColorScheme) => {
        changeTheme(layoutConfig.colorScheme, colorScheme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({ ...prevState, colorScheme }));
        });
    };

    const _changeTheme = (theme: string) => {
        changeTheme(layoutConfig.theme, theme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({ ...prevState, theme }));
        });
    };

    const getComponentThemes = () => {
        return (
            <div className="flex flex-wrap row-gap-3">
                {componentThemes.map((theme, i) => {
                    return (
                        <div key={i} className="w-3">
                            <a
                                className="cursor-pointer p-link w-2rem h-2rem border-circle flex-shrink-0 flex align-items-center justify-content-center"
                                style={{ cursor: 'pointer', backgroundColor: theme.color }}
                                onClick={() => _changeTheme(theme.name)}
                            >
                                {layoutConfig.theme === theme.name && (
                                    <span className="check flex align-items-center justify-content-center">
                                        <i className="pi pi-check" style={{ color: 'white' }}></i>
                                    </span>
                                )}
                            </a>
                        </div>
                    );
                })}
            </div>
        );
    };

    const componentThemesElement = getComponentThemes();

    const decrementScale = () => {
        setLayoutConfig((prevState) => ({
            ...prevState,
            scale: prevState.scale - 1
        }));
    };

    const incrementScale = () => {
        setLayoutConfig((prevState) => ({
            ...prevState,
            scale: prevState.scale + 1
        }));
    };

    const applyScale = () => {
        document.documentElement.style.fontSize = layoutConfig.scale + 'px';
    };

    useEffect(() => {
        applyScale();
    }, [layoutConfig.scale]);

    return (
        <div id="layout-config">
            <a
                className="layout-config-button"
                onClick={() =>
                    setLayoutState((prevState) => ({
                        ...prevState,
                        configSidebarVisible: true
                    }))
                }
            >
                <i className="pi pi-cog"></i>
            </a>

            <Sidebar
                visible={layoutState.configSidebarVisible}
                position="right"
                onHide={() =>
                    setLayoutState((prevState) => ({
                        ...prevState,
                        configSidebarVisible: false
                    }))
                }
            >
                <h5>Themes</h5>
                {componentThemesElement}

                <h5>Scale</h5>
                <div className="flex align-items-center">
                    <Button text rounded icon="pi pi-minus" onClick={decrementScale} className=" w-2rem h-2rem mr-2" disabled={layoutConfig.scale === scales[0]}></Button>
                    <div className="flex gap-2 align-items-center">
                        {scales.map((s, i) => {
                            return (
                                <i
                                    key={i}
                                    className={classNames('pi pi-circle-fill text-300', {
                                        'text-primary-500': s === layoutConfig.scale
                                    })}
                                ></i>
                            );
                        })}
                    </div>
                    <Button text rounded icon="pi pi-plus" onClick={incrementScale} className=" w-2rem h-2rem ml-2" disabled={layoutConfig.scale === scales[scales.length - 1]}></Button>
                </div>

                {!props.minimal && (
                    <>
                        <h5>Menu Type</h5>
                        <div className="flex flex-wrap row-gap-3">
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="static" checked={layoutConfig.menuMode === 'static'} inputId="mode1" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode1">Static</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="overlay" checked={layoutConfig.menuMode === 'overlay'} inputId="mode2" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode2">Overlay</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="slim" checked={layoutConfig.menuMode === 'slim'} inputId="mode3" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode3">Slim</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="slim-plus" checked={layoutConfig.menuMode === 'slim-plus'} inputId="mode4" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode4">Slim+</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="horizontal" checked={layoutConfig.menuMode === 'horizontal'} inputId="mode4" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode4">Horizontal</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="reveal" checked={layoutConfig.menuMode === 'reveal'} inputId="mode5" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode5">Reveal</label>
                            </div>
                            <div className="flex align-items-center gap-2 w-6">
                                <RadioButton name="menuMode" value="drawer" checked={layoutConfig.menuMode === 'drawer'} inputId="mode6" onChange={(e) => changeMenuMode(e)}></RadioButton>
                                <label htmlFor="mode6">Drawer</label>
                            </div>
                        </div>
                    </>
                )}

                <h5>Color Scheme</h5>

                <div className="field-radiobutton">
                    <RadioButton name="colorScheme" value="light" checked={layoutConfig.colorScheme === 'light'} inputId="theme3" onChange={(e) => changeColorScheme(e.value)}></RadioButton>
                    <label htmlFor="theme3">Light</label>
                </div>

                <div className="field-radiobutton">
                    <RadioButton name="colorScheme" value="dark" checked={layoutConfig.colorScheme === 'dark'} inputId="theme1" onChange={(e) => changeColorScheme(e.value)}></RadioButton>
                    <label htmlFor="theme1">Dark</label>
                </div>

                <h5>Ripple Effect</h5>
                <InputSwitch checked={layoutConfig.ripple} onChange={(e) => changeRipple(e)} />
            </Sidebar>
        </div>
    );
};

export default AppConfig;
