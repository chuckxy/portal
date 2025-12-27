'use client';

import React, { useState } from 'react';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import PersonManagement from '@/components/PersonManagement';
import PersonStatsWidget from '@/components/PersonStatsWidget';

const Persons = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <div className="surface-ground p-3 md:p-4">
            <Card>
                <div className="mb-3">
                    <h1 className="text-3xl font-bold text-900 m-0 mb-2">Person Management</h1>
                    <p className="text-600 m-0">Manage all persons in your school system</p>
                </div>

                <TabView activeIndex={activeIndex} onTabChange={(e) => setActiveIndex(e.index)}>
                    <TabPanel header="Dashboard" leftIcon="pi pi-chart-bar mr-2">
                        <PersonStatsWidget />
                    </TabPanel>

                    <TabPanel header="Manage Persons" leftIcon="pi pi-users mr-2">
                        <PersonManagement />
                    </TabPanel>
                </TabView>
            </Card>
        </div>
    );
};

export default Persons;
