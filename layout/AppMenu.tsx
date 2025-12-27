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
            label: 'Students',
            icon: 'pi pi-user',
            items: [{ label: 'Admit', icon: 'pi pi-fw pi-pencil', to: '/persons' }]
        },
        { separator: true },
        {
            label: 'Settings',
            icon: 'pi pi-cog',
            items: [
                { label: 'Profile', icon: 'pi pi-fw pi-user', to: '/profile' },
                { label: 'Sites', icon: 'pi pi-fw pi-map-marker', to: '/sites' },
                { label: 'Faculties', icon: 'pi pi-fw pi-building', to: '/faculties' },
                { label: 'Departments', icon: 'pi pi-fw pi-briefcase', to: '/departments' },
                { label: 'Courses', icon: 'pi pi-fw pi-book', to: '/courses' },
                { label: 'Levels', icon: 'pi pi-fw pi-graduation-cap', to: '/levels' },
                { label: 'Scores', icon: 'pi pi-fw pi-pencil', to: '/exam-scores/entry' },
                { label: 'Class Scores', icon: 'pi pi-fw pi-pencil', to: '/exam-scores/class-entry' },
                { label: 'persons', icon: 'pi pi-fw pi-users', to: '/persons' }
            ]
        }
    ];

    return <AppSubMenu model={model} />;
};

export default AppMenu;
