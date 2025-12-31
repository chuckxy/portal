'use client';

import React from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import LMSCourseModuleManagement from '@/components/LMSCourseModuleManagement';
import LMSChapterManagement from '@/components/LMSChapterManagement';
import LMSLessonManagement from '@/components/LMSLessonManagement';

/**
 * LMS Course Content Management Page
 *
 * Unified interface for managing:
 * - Course Modules
 * - Chapters
 * - Lessons
 */
const LMSContentPage: React.FC = () => {
    return (
        <div className="surface-ground">
            <TabView className="lms-content-tabs">
                <TabPanel header="Course Modules" leftIcon="pi pi-th-large mr-2">
                    <LMSCourseModuleManagement />
                </TabPanel>

                <TabPanel header="Chapters" leftIcon="pi pi-list mr-2">
                    <LMSChapterManagement />
                </TabPanel>

                <TabPanel header="Lessons" leftIcon="pi pi-play-circle mr-2">
                    <LMSLessonManagement />
                </TabPanel>
            </TabView>
        </div>
    );
};

export default LMSContentPage;
