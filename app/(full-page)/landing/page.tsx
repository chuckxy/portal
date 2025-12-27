'use client';

import React, { useContext, useEffect, useRef } from 'react';
import { Ripple } from 'primereact/ripple';
import { StyleClass } from 'primereact/styleclass';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { PrimeReactContext } from 'primereact/api';
import type { ColorScheme, Page } from '@/types';
import { useAuth } from '@/context/AuthContext';

const LandingPage: Page = () => {
    const { layoutConfig, setLayoutConfig } = useContext(LayoutContext);
    const { changeTheme } = useContext(PrimeReactContext);
    const router = useRouter();
    const { isAuthenticated, logout, user } = useAuth();

    const homeRef = useRef(null);
    const homeButtonRef = useRef(null);
    const aboutButtonRef = useRef(null);
    const timesRef = useRef(null);
    const menu = useRef(null);
    const menuButtonRef = useRef(null);
    const aboutRef = useRef(null);
    const featuresRef = useRef(null);
    const portalRef = useRef(null);
    const testimonialsRef = useRef(null);
    const contactRef = useRef(null);
    const featuresButtonRef = useRef(null);
    const portalButtonRef = useRef(null);
    const contactButtonRef = useRef(null);

    const goHome = () => {
        router.push('/');
    };
    const scrollToElement = (el: React.MutableRefObject<any>) => {
        setTimeout(() => {
            el.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }, 200);
    };
    const changeColorScheme = (colorScheme: ColorScheme) => {
        changeTheme?.(layoutConfig.colorScheme, colorScheme, 'theme-link', () => {
            setLayoutConfig((prevState) => ({
                ...prevState,
                colorScheme,
                menuTheme: layoutConfig.colorScheme === 'dark' ? 'dark' : 'light'
            }));
        });
    };

    useEffect(() => {
        changeColorScheme('light');
        setLayoutConfig((prevState) => ({
            ...prevState,
            menuTheme: 'light'
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div ref={homeRef} className="landing-container" style={{ background: '#f8f9fa' }}>
            {/* Header / Navigation */}
            <div id="header" className="landing-header flex flex-column w-full" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="header-menu-container flex align-items-center justify-content-between px-6 py-4 fixed top-0 left-0 right-0 z-5" style={{ background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                    <div className="header-left-elements flex align-items-center">
                        <div className="cursor-pointer flex align-items-center" onClick={goHome}>
                            <i className="pi pi-graduation-cap text-4xl text-primary mr-3"></i>
                            <span className="text-2xl font-bold text-primary">EduPortal</span>
                        </div>

                        <ul
                            ref={menu}
                            id="menu"
                            style={{ top: '0px', right: '0%' }}
                            className="list-none lg:flex lg:flex-row flex-column align-items-start bg-white absolute lg:relative h-screen lg:h-auto m-0 z-5 w-full sm:w-6 lg:w-auto py-6 lg:py-0 lg:ml-8 hidden"
                        >
                            <StyleClass nodeRef={timesRef} selector="@parent" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout">
                                <a ref={timesRef} className="p-ripple cursor-pointer block lg:hidden text-gray-800 font-medium absolute" style={{ top: '2rem', right: '2rem' }}>
                                    <i className="pi pi-times text-3xl"></i>
                                </a>
                            </StyleClass>

                            <li className="mt-5 lg:mt-0">
                                <StyleClass nodeRef={homeButtonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-fadein" leaveToClassName="hidden">
                                    <a
                                        ref={homeButtonRef}
                                        onClick={() => scrollToElement(homeRef)}
                                        className="p-ripple flex m-0 lg:ml-5 lg:px-3 px-4 py-3 text-700 font-semibold hover:text-primary cursor-pointer transition-colors transition-duration-200"
                                    >
                                        <span>Home</span>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                            </li>
                            <li>
                                <StyleClass nodeRef={aboutButtonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-fadein" leaveToClassName="hidden">
                                    <a
                                        ref={aboutButtonRef}
                                        onClick={() => scrollToElement(aboutRef)}
                                        className="p-ripple flex m-0 lg:ml-5 lg:px-3 px-4 py-3 text-700 font-semibold hover:text-primary cursor-pointer transition-colors transition-duration-200"
                                    >
                                        <span>About</span>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                            </li>
                            <li>
                                <StyleClass nodeRef={featuresButtonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-fadein" leaveToClassName="hidden">
                                    <a
                                        ref={featuresButtonRef}
                                        onClick={() => scrollToElement(featuresRef)}
                                        className="p-ripple flex m-0 lg:ml-5 lg:px-3 px-4 py-3 text-700 font-semibold hover:text-primary cursor-pointer transition-colors transition-duration-200"
                                    >
                                        <span>Features</span>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                            </li>
                            <li>
                                <StyleClass nodeRef={portalButtonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-fadein" leaveToClassName="hidden">
                                    <a
                                        ref={portalButtonRef}
                                        onClick={() => scrollToElement(portalRef)}
                                        className="p-ripple flex m-0 lg:ml-5 lg:px-3 px-4 py-3 text-700 font-semibold hover:text-primary cursor-pointer transition-colors transition-duration-200"
                                    >
                                        <span>Student Portal</span>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                            </li>
                            <li>
                                <StyleClass nodeRef={contactButtonRef} selector="@grandparent" enterClassName="hidden" enterActiveClassName="px-fadein" leaveToClassName="hidden">
                                    <a
                                        ref={contactButtonRef}
                                        onClick={() => scrollToElement(contactRef)}
                                        className="p-ripple flex m-0 lg:ml-5 lg:px-3 px-4 py-3 text-700 font-semibold hover:text-primary cursor-pointer transition-colors transition-duration-200"
                                    >
                                        <span>Contact</span>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                            </li>
                        </ul>
                    </div>

                    <div className="header-right-elements flex align-items-center gap-2">
                        {!isAuthenticated ? (
                            <>
                                <Button className="p-button-outlined p-button-info font-semibold" onClick={() => router.push('/auth/login')}>
                                    <span>Login</span>
                                </Button>

                                <Button className="p-button font-semibold bg-primary border-primary" onClick={() => router.push('/auth/register')}>
                                    <span>Sign Up</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button className="p-button-outlined p-button-success font-semibold" onClick={() => router.push('/home')}>
                                    <i className="pi pi-home mr-2"></i>
                                    <span>Dashboard</span>
                                </Button>

                                <Button className="p-button-outlined p-button-danger font-semibold" onClick={logout}>
                                    <i className="pi pi-sign-out mr-2"></i>
                                    <span>Logout</span>
                                </Button>
                            </>
                        )}

                        <StyleClass nodeRef={menuButtonRef} selector="#menu" enterClassName="hidden" leaveToClassName="hidden">
                            <a ref={menuButtonRef} className="p-ripple lg:hidden font-medium text-700 cursor-pointer ml-3">
                                <i className="pi pi-bars text-2xl"></i>
                            </a>
                        </StyleClass>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="flex flex-column align-items-center justify-content-center flex-1 px-4 text-center">
                    <h1 className="text-white font-bold mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: '1.2', maxWidth: '900px' }}>
                        Manage Your School and Empower Students
                    </h1>
                    <p className="text-white text-xl mb-5" style={{ maxWidth: '700px', opacity: 0.95 }}>
                        Complete school management solution with attendance tracking, grade management, timetable scheduling, and seamless communication tools
                    </p>
                    <div className="flex gap-3 flex-wrap justify-content-center">
                        <Button className="p-button-lg bg-white text-primary border-white font-bold px-5 py-3" onClick={() => scrollToElement(contactRef)}>
                            <span className="text-xl">Get Started</span>
                        </Button>
                        <Button className="p-button-lg p-button-outlined text-white border-white font-bold px-5 py-3" onClick={() => router.push('/auth/login')}>
                            <span className="text-xl">Student Login</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div ref={aboutRef} className="py-8 px-4" style={{ background: '#ffffff' }}>
                <div className="max-w-6xl mx-auto text-center">
                    <h2 className="text-5xl font-bold text-900 mb-4">Transforming Education Management</h2>
                    <p className="text-xl text-600 mb-6" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        EduPortal is a comprehensive school management system designed to streamline administrative tasks, enhance communication, and provide students with a powerful portal to track their academic journey.
                    </p>
                </div>
            </div>

            {/* Features Section */}
            <div ref={featuresRef} className="py-8 px-4" style={{ background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-bold text-900 text-center mb-3">Core Features</h2>
                    <p className="text-xl text-600 text-center mb-6">Everything you need to manage your institution efficiently</p>

                    <div className="grid mt-6">
                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-blue-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-calendar text-blue-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Attendance & Timetable</h3>
                                <p className="text-700 line-height-3">Track student attendance in real-time and manage class schedules with an intuitive timetable management system.</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-green-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-chart-line text-green-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Grades & Reports</h3>
                                <p className="text-700 line-height-3">Comprehensive grade management and automated report generation for students, parents, and administrators.</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-purple-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-comments text-purple-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Communication Tools</h3>
                                <p className="text-700 line-height-3">Instant announcements, messaging between teachers and students, and parent-teacher communication channels.</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-orange-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-dollar text-orange-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Fee Management</h3>
                                <p className="text-700 line-height-3">Streamlined fee collection, payment tracking, and automated reminders for pending payments.</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-cyan-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-file-edit text-cyan-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Assignments & Exams</h3>
                                <p className="text-700 line-height-3">Digital assignment submission, online assessments, and automated grading for efficient evaluation.</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full hover:shadow-4 transition-all transition-duration-300">
                                <div className="flex align-items-center justify-content-center bg-pink-100 border-circle mb-4" style={{ width: '4rem', height: '4rem' }}>
                                    <i className="pi pi-bell text-pink-600 text-3xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-900 mb-3">Smart Notifications</h3>
                                <p className="text-700 line-height-3">Real-time alerts for important events, deadlines, schedule changes, and personalized reminders.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Portal Preview */}
            <div ref={portalRef} className="py-8 px-4" style={{ background: '#ffffff' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid align-items-center">
                        <div className="col-12 lg:col-6 p-5">
                            <h2 className="text-5xl font-bold text-900 mb-4">Powerful Student Portal</h2>
                            <p className="text-xl text-600 mb-5 line-height-3">Give students complete control over their academic journey with our comprehensive portal featuring:</p>
                            <ul className="list-none p-0 m-0">
                                <li className="flex align-items-start mb-4">
                                    <i className="pi pi-check-circle text-green-500 text-2xl mr-3"></i>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-2">View Grades & Performance</h4>
                                        <p className="text-600 m-0">Track academic progress with detailed grade reports and performance analytics</p>
                                    </div>
                                </li>
                                <li className="flex align-items-start mb-4">
                                    <i className="pi pi-check-circle text-green-500 text-2xl mr-3"></i>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-2">Access Class Schedules</h4>
                                        <p className="text-600 m-0">View daily timetables, upcoming classes, and room assignments</p>
                                    </div>
                                </li>
                                <li className="flex align-items-start mb-4">
                                    <i className="pi pi-check-circle text-green-500 text-2xl mr-3"></i>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-2">Submit Assignments</h4>
                                        <p className="text-600 m-0">Upload homework, track deadlines, and receive instant feedback</p>
                                    </div>
                                </li>
                                <li className="flex align-items-start mb-4">
                                    <i className="pi pi-check-circle text-green-500 text-2xl mr-3"></i>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-2">Real-time Notifications</h4>
                                        <p className="text-600 m-0">Stay updated with announcements, grade updates, and important events</p>
                                    </div>
                                </li>
                            </ul>
                            <Button className="p-button-lg mt-4 bg-primary border-primary font-bold" onClick={() => router.push('/auth/register')}>
                                <span className="text-lg">Create Student Account</span>
                            </Button>
                        </div>
                        <div className="col-12 lg:col-6 p-5">
                            <div className="border-round-2xl shadow-4 p-4 bg-bluegray-50" style={{ border: '8px solid #dee2e6' }}>
                                <div className="bg-white border-round-xl p-5 shadow-2">
                                    <div className="flex align-items-center mb-5 pb-3 border-bottom-1 surface-border">
                                        <div className="bg-primary border-circle flex align-items-center justify-content-center mr-3" style={{ width: '3rem', height: '3rem' }}>
                                            <i className="pi pi-user text-white text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-900 mb-1">Student Dashboard</h3>
                                            <p className="text-600 m-0 text-sm">Welcome back, John!</p>
                                        </div>
                                    </div>
                                    <div className="grid">
                                        <div className="col-6">
                                            <div className="bg-blue-50 border-round p-3 text-center">
                                                <i className="pi pi-calendar text-blue-500 text-3xl mb-2"></i>
                                                <p className="text-sm text-600 mb-1">Attendance</p>
                                                <p className="text-2xl font-bold text-900 m-0">92%</p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-green-50 border-round p-3 text-center">
                                                <i className="pi pi-chart-line text-green-500 text-3xl mb-2"></i>
                                                <p className="text-sm text-600 mb-1">GPA</p>
                                                <p className="text-2xl font-bold text-900 m-0">3.8</p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-orange-50 border-round p-3 text-center">
                                                <i className="pi pi-book text-orange-500 text-3xl mb-2"></i>
                                                <p className="text-sm text-600 mb-1">Assignments</p>
                                                <p className="text-2xl font-bold text-900 m-0">5</p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="bg-purple-50 border-round p-3 text-center">
                                                <i className="pi pi-bell text-purple-500 text-3xl mb-2"></i>
                                                <p className="text-sm text-600 mb-1">Alerts</p>
                                                <p className="text-2xl font-bold text-900 m-0">3</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Testimonials Section */}
            <div ref={testimonialsRef} className="py-8 px-4" style={{ background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-5xl font-bold text-900 text-center mb-3">Trusted by Educators</h2>
                    <p className="text-xl text-600 text-center mb-6">See what our users have to say</p>

                    <div className="grid mt-6">
                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full">
                                <div className="flex align-items-center mb-4">
                                    <div className="bg-primary border-circle flex align-items-center justify-content-center mr-3" style={{ width: '3.5rem', height: '3.5rem' }}>
                                        <i className="pi pi-user text-white text-2xl"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-1">Sarah Johnson</h4>
                                        <p className="text-600 m-0">Principal, Lincoln High School</p>
                                    </div>
                                </div>
                                <div className="flex mb-3">
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500"></i>
                                </div>
                                <p className="text-700 line-height-3">{`EduPortal has transformed how we manage our school. The attendance tracking and grade management features have saved us countless hours. Highly recommended!`}</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full">
                                <div className="flex align-items-center mb-4">
                                    <div className="bg-green-500 border-circle flex align-items-center justify-content-center mr-3" style={{ width: '3.5rem', height: '3.5rem' }}>
                                        <i className="pi pi-user text-white text-2xl"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-1">Michael Chen</h4>
                                        <p className="text-600 m-0">Mathematics Teacher</p>
                                    </div>
                                </div>
                                <div className="flex mb-3">
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500"></i>
                                </div>
                                <p className="text-700 line-height-3">{`The assignment submission feature is incredible. I can track all student work in one place and provide instant feedback. It's made my job so much easier.`}</p>
                            </div>
                        </div>

                        <div className="col-12 md:col-6 lg:col-4 p-4">
                            <div className="surface-card p-5 border-round-xl shadow-2 h-full">
                                <div className="flex align-items-center mb-4">
                                    <div className="bg-orange-500 border-circle flex align-items-center justify-content-center mr-3" style={{ width: '3.5rem', height: '3.5rem' }}>
                                        <i className="pi pi-user text-white text-2xl"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-900 mb-1">Emily Rodriguez</h4>
                                        <p className="text-600 m-0">Student, Grade 11</p>
                                    </div>
                                </div>
                                <div className="flex mb-3">
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500 mr-1"></i>
                                    <i className="pi pi-star-fill text-yellow-500"></i>
                                </div>
                                <p className="text-700 line-height-3">{`I love being able to check my grades and assignments anytime. The portal is super easy to use and keeps me organized throughout the semester.`}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Call-to-Action Section */}
            <div ref={contactRef} className="py-8 px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-5xl font-bold text-white mb-4">Ready to Transform Your School?</h2>
                    <p className="text-xl text-white mb-6" style={{ opacity: 0.95 }}>
                        Join thousands of schools already using EduPortal to streamline their operations
                    </p>
                    <div className="flex gap-3 flex-wrap justify-content-center mb-6">
                        <Button className="p-button-lg bg-white text-primary border-white font-bold px-6 py-3">
                            <i className="pi pi-calendar mr-2"></i>
                            <span className="text-xl">Request a Demo</span>
                        </Button>
                        <Button className="p-button-lg p-button-outlined text-white border-white font-bold px-6 py-3" onClick={() => router.push('/auth/login')}>
                            <i className="pi pi-sign-in mr-2"></i>
                            <span className="text-xl">Student Login</span>
                        </Button>
                    </div>
                    <p className="text-white text-sm" style={{ opacity: 0.8 }}>
                        No credit card required • Free trial available • Setup in minutes
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 px-4" style={{ background: '#1e293b' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid pb-5 border-bottom-1 border-gray-700">
                        <div className="col-12 md:col-6 lg:col-3 mb-5">
                            <div className="flex align-items-center mb-4">
                                <i className="pi pi-graduation-cap text-4xl text-primary mr-3"></i>
                                <span className="text-2xl font-bold text-white">EduPortal</span>
                            </div>
                            <p className="text-gray-400 line-height-3">Empowering education through technology. Complete school management and student portal solution.</p>
                        </div>

                        <div className="col-12 md:col-6 lg:col-3 mb-5">
                            <h4 className="text-white font-bold mb-4">Quick Links</h4>
                            <ul className="list-none p-0 m-0">
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200" onClick={() => scrollToElement(aboutRef)}>
                                        About Us
                                    </a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200" onClick={() => scrollToElement(featuresRef)}>
                                        Features
                                    </a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200" onClick={() => scrollToElement(portalRef)}>
                                        Student Portal
                                    </a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200" onClick={() => scrollToElement(contactRef)}>
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div className="col-12 md:col-6 lg:col-3 mb-5">
                            <h4 className="text-white font-bold mb-4">Resources</h4>
                            <ul className="list-none p-0 m-0">
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200">Documentation</a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200">Support Center</a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200">Privacy Policy</a>
                                </li>
                                <li className="mb-3">
                                    <a className="text-gray-400 hover:text-white cursor-pointer transition-colors transition-duration-200">Terms of Service</a>
                                </li>
                            </ul>
                        </div>

                        <div className="col-12 md:col-6 lg:col-3 mb-5">
                            <h4 className="text-white font-bold mb-4">Contact Us</h4>
                            <ul className="list-none p-0 m-0">
                                <li className="flex align-items-center mb-3">
                                    <i className="pi pi-envelope text-primary mr-2"></i>
                                    <span className="text-gray-400">info@eduportal.com</span>
                                </li>
                                <li className="flex align-items-center mb-3">
                                    <i className="pi pi-phone text-primary mr-2"></i>
                                    <span className="text-gray-400">+1 (555) 123-4567</span>
                                </li>
                                <li className="flex align-items-center mb-4">
                                    <i className="pi pi-map-marker text-primary mr-2"></i>
                                    <span className="text-gray-400">123 Education St, NY 10001</span>
                                </li>
                            </ul>
                            <div className="flex gap-3">
                                <a className="flex align-items-center justify-content-center border-circle bg-gray-800 hover:bg-primary cursor-pointer transition-colors transition-duration-200" style={{ width: '2.5rem', height: '2.5rem' }}>
                                    <i className="pi pi-facebook text-white"></i>
                                </a>
                                <a className="flex align-items-center justify-content-center border-circle bg-gray-800 hover:bg-primary cursor-pointer transition-colors transition-duration-200" style={{ width: '2.5rem', height: '2.5rem' }}>
                                    <i className="pi pi-twitter text-white"></i>
                                </a>
                                <a className="flex align-items-center justify-content-center border-circle bg-gray-800 hover:bg-primary cursor-pointer transition-colors transition-duration-200" style={{ width: '2.5rem', height: '2.5rem' }}>
                                    <i className="pi pi-linkedin text-white"></i>
                                </a>
                                <a className="flex align-items-center justify-content-center border-circle bg-gray-800 hover:bg-primary cursor-pointer transition-colors transition-duration-200" style={{ width: '2.5rem', height: '2.5rem' }}>
                                    <i className="pi pi-instagram text-white"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-column md:flex-row align-items-center justify-content-between pt-5">
                        <p className="text-gray-400 m-0">© 2024 EduPortal. All rights reserved.</p>
                        <p className="text-gray-400 m-0 mt-3 md:mt-0">Built with excellence for education</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
