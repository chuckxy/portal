import { Metadata } from 'next';
import Layout from '../../layout/layout';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const metadata: Metadata = {
    title: 'Edu Portal - Main',
    description: 'A comprehensive education portal for schools, students, teachers, and parents—manage academics, results, attendance, and learning in one secure platform.',
    robots: { index: false, follow: false },
    viewport: { initialScale: 1, width: 'device-width' },
    openGraph: {
        type: 'website',
        title: 'Edu Portal - Main',
        url: 'https://www.eduportal.com',
        description: 'A comprehensive education portal for schools, students, teachers, and parents—manage academics, results, attendance, and learning in one secure platform.',
        ttl: 604800
    },
    icons: {
        icon: '/favicon.ico'
    }
};

export default function MainLayout({ children }: MainLayoutProps) {
    return <Layout>{children}</Layout>;
}
