import { MenuModal } from '@/types';
import AppSubMenu from './AppSubMenu';

const AppMenu = () => {
    const model: MenuModal[] = [
        {
            label: 'Dashboards',
            icon: 'pi pi-home',
            items: [
                {
                    label: 'Home',
                    icon: 'pi pi-fw pi-home',
                    to: '/home'
                },
                {
                    label: 'Student Dashboard',
                    icon: 'pi pi-fw pi-user',
                    to: '/students'
                },
                {
                    label: 'Teacher Dashboard',
                    icon: 'pi pi-fw pi-briefcase',
                    to: '/teachers'
                }
            ]
        },
        { separator: true },
        {
            label: 'Student Management',
            icon: 'pi pi-users',
            items: [
                { label: 'All Students', icon: 'pi pi-fw pi-users', to: '/persons' },
                { label: 'Admit Student', icon: 'pi pi-fw pi-user-plus', to: '/persons' }
            ]
        },
        { separator: true },
        {
            label: 'Academic Management',
            icon: 'pi pi-book',
            items: [
                { label: 'Faculties', icon: 'pi pi-fw pi-building', to: '/faculties' },
                { label: 'Departments', icon: 'pi pi-fw pi-briefcase', to: '/departments' },
                { label: 'Courses', icon: 'pi pi-fw pi-book', to: '/courses' },
                { label: 'Levels', icon: 'pi pi-fw pi-graduation-cap', to: '/levels' },
                { label: 'Timetables', icon: 'pi pi-fw pi-calendar', to: '/timetables' },
                { label: 'Exam Score Entry', icon: 'pi pi-fw pi-pencil', to: '/exam-scores/entry' },
                { label: 'Class Exam Scores', icon: 'pi pi-fw pi-table', to: '/exam-scores/class-entry' }
            ]
        },
        { separator: true },
        {
            label: 'Financial Management',
            icon: 'pi pi-wallet',
            items: [
                { label: 'Financial Overview', icon: 'pi pi-fw pi-chart-line', to: '/finance' },
                { label: 'Fee Determinants', icon: 'pi pi-fw pi-tags', to: '/determinants' },
                { label: 'Fee Configurations', icon: 'pi pi-fw pi-cog', to: '/configure' },
                { label: 'Fee Payments', icon: 'pi pi-fw pi-dollar', to: '/payments' },
                { label: 'Daily Collections', icon: 'pi pi-fw pi-calendar', to: '/canteen' },
                { label: 'Student Debtors', icon: 'pi pi-fw pi-exclamation-triangle', to: '/defaulters' },
                { label: 'Expenditures', icon: 'pi pi-fw pi-money-bill', to: '/expenditures' },
                { label: 'Scholarship Bodies', icon: 'pi pi-fw pi-star', to: '/scholarship/body' },
                { label: 'Scholarships', icon: 'pi pi-fw pi-gift', to: '/scholarship/beneficiary' }
            ]
        },
        { separator: true },
        {
            label: 'System Settings',
            icon: 'pi pi-cog',
            items: [
                { label: 'Profile', icon: 'pi pi-fw pi-user', to: '/profile' },
                { label: 'School Sites', icon: 'pi pi-fw pi-map-marker', to: '/sites' }
            ]
        }
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;
