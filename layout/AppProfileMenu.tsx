import { Sidebar } from 'primereact/sidebar';
import { useContext, useState } from 'react';
import { LayoutContext } from './context/layoutcontext';
import { Calendar } from 'primereact/calendar';

const AppProfileSidebar = () => {
    const { layoutState, setLayoutState, layoutConfig } = useContext(LayoutContext);

    const onRightMenuHide = () => {
        setLayoutState((prevLayoutState) => ({
            ...prevLayoutState,
            rightMenuActive: false
        }));
    };
    const [date, setDate] = useState(null);
    const [visibleLeft, setVisibleLeft] = useState(false);

    return (
        <Sidebar
            visible={layoutState.rightMenuVisible}
            position="right"
            onHide={() =>
                setLayoutState((prevState) => ({
                    ...prevState,
                    rightMenuVisible: false
                }))
            }
            className={`layout-profile-sidebar w-full sm:w-28rem ${layoutState.rightMenuActive ? 'layout-rightmenu-active' : ''}`}
        >
            <div className="layout-rightmenu h-full overflow-y-auto overflow-x-hidden">
                <div className="user-detail-wrapper text-center" style={{ padding: '4.5rem 0 2rem 0' }}>
                    <div className="user-detail-content mb-4">
                        <img src="/layout/images/avatar/gene.png" alt="atlantis" className="user-image" />
                        <span className="user-name text-2xl text-center block mt-4 mb-1">Gene Russell</span>
                        <span className="user-number">(406) 555-0120</span>
                    </div>
                    <div className="user-tasks flex justify-content-between align-items-center py-4 px-3 border-bottom-1 surface-border">
                        <div className="user-tasks-item in-progress font-medium">
                            <a className="task-number text-red-500 flex justify-content-center align-items-center border-round" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '9px', width: '50px', height: '50px', fontSize: '30px' }}>
                                23
                            </a>
                            <span className="task-name block mt-3">Progress</span>
                        </div>
                        <div className="user-tasks-item font-medium">
                            <a className="task-number flex justify-content-center align-items-center border-round" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '9px', width: '50px', height: '50px', fontSize: '30px' }}>
                                6
                            </a>
                            <span className="task-name block mt-3">Overdue</span>
                        </div>
                        <div className="user-tasks-item font-medium">
                            <a className="task-number flex justify-content-center align-items-center border-round" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '9px', width: '50px', height: '50px', fontSize: '30px' }}>
                                38
                            </a>
                            <span className="task-name block mt-3">All deals</span>
                        </div>
                    </div>
                </div>
                <div>
                    <Calendar value={date} inline className="w-full p-0" onChange={(e) => setDate(e.value)} />
                </div>
                <div className="daily-plan-wrapper mt-5">
                    <span className="today-date">14 Sunday, Jun 2020</span>
                    <ul className="list-none overflow-hidden p-0 m-0">
                        <li className="mt-3 border-round py-2 px-3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <span className="event-time block font-semibold text-color-secondary">1:00 PM - 2:00 PM</span>
                            <span className="event-topic block mt-2">Meeting with Alfredo Rhiel Madsen</span>
                        </li>
                        <li className="mt-3 border-round py-2 px-3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <span className="event-time block font-semibold text-color-secondary">2:00 PM - 3:00 PM</span>
                            <span className="event-topic block mt-2">Team Sync</span>
                        </li>
                        <li className="mt-3 border-round py-2 px-3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <span className="event-time block font-semibold text-color-secondary">5:00 PM - 6:00 PM</span>
                            <span className="event-topic block mt-2">Team Sync</span>
                        </li>
                        <li className="mt-3 border-round py-2 px-3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                            <span className="event-time block font-semibold text-color-secondary">7:00 PM - 7:30 PM</span>
                            <span className="event-topic block mt-2">Meeting with Engineering managers</span>
                        </li>
                    </ul>
                </div>
            </div>
        </Sidebar>
    );
};

export default AppProfileSidebar;
