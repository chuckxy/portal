'use client';

import React, { forwardRef } from 'react';

type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type ActivityType = 'break' | 'lunch' | 'assembly' | 'other';
type PrintOrientation = 'landscape' | 'portrait';

interface ScheduleEntry {
    _id?: string;
    weekDay: WeekDay;
    subject: {
        _id?: string;
        name: string;
        code?: string;
    };
    teacher?: {
        _id?: string;
        firstName: string;
        lastName: string;
    };
    timeStart: string;
    timeEnd: string;
    room?: string;
    periodNumber?: number;
    isRecurring: boolean;
    notes?: string;
}

interface RecessActivity {
    _id?: string;
    description: string;
    weekDay?: WeekDay;
    timeStart: string;
    timeEnd: string;
    activityType: ActivityType;
}

interface TimetableData {
    _id?: string;
    school: {
        _id?: string;
        schoolName: string;
        address?: string;
        phone?: string;
        email?: string;
        logo?: string;
    };
    site: {
        _id?: string;
        siteName: string;
    };
    class?: {
        _id?: string;
        className: string;
        division?: string;
    };
    department?: {
        _id?: string;
        name: string;
    };
    academicYear: string;
    academicTerm: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    schedule: ScheduleEntry[];
    recessActivities: RecessActivity[];
    version: number;
    isActive: boolean;
    createdBy?: {
        firstName: string;
        lastName: string;
    };
    versionNote?: string;
}

interface TimetablePrintReportProps {
    timetable: TimetableData;
    orientation: PrintOrientation;
    schoolLogo?: string;
    showLegend?: boolean;
    customTitle?: string;
    generatedBy?: string;
    approvalStatus?: 'Draft' | 'Approved' | 'Pending';
}

const WEEKDAYS: WeekDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WEEKDAYS_SHORT: Record<WeekDay, string> = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun'
};

const ACTIVITY_COLORS: Record<ActivityType, { bg: string; text: string; border: string }> = {
    break: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    lunch: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
    assembly: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    other: { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' }
};

const SUBJECT_COLORS = [
    { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
    { bg: '#f0fdf4', text: '#166534', border: '#22c55e' },
    { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    { bg: '#fce7f3', text: '#9d174d', border: '#ec4899' },
    { bg: '#f3e8ff', text: '#6b21a8', border: '#a855f7' },
    { bg: '#ecfeff', text: '#155e75', border: '#06b6d4' },
    { bg: '#fff7ed', text: '#9a3412', border: '#f97316' },
    { bg: '#f0f9ff', text: '#0369a1', border: '#0ea5e9' },
    { bg: '#fdf4ff', text: '#86198f', border: '#d946ef' },
    { bg: '#f7fee7', text: '#3f6212', border: '#84cc16' }
];

export const TimetablePrintReport = forwardRef<HTMLDivElement, TimetablePrintReportProps>((props, ref) => {
    const { timetable, orientation, schoolLogo, showLegend = true, customTitle, generatedBy, approvalStatus = 'Draft' } = props;

    // Get unique time slots from schedule
    const getTimeSlots = (): string[] => {
        const slots = new Set<string>();

        timetable.schedule.forEach((entry) => {
            slots.add(`${entry.timeStart}-${entry.timeEnd}`);
        });

        timetable.recessActivities.forEach((activity) => {
            slots.add(`${activity.timeStart}-${activity.timeEnd}`);
        });

        return Array.from(slots).sort((a, b) => {
            const timeA = a.split('-')[0];
            const timeB = b.split('-')[0];
            return timeA.localeCompare(timeB);
        });
    };

    // Get active days (days with at least one entry)
    const getActiveDays = (): WeekDay[] => {
        const activeDays = new Set<WeekDay>();

        timetable.schedule.forEach((entry) => {
            activeDays.add(entry.weekDay);
        });

        // Sort by weekday order
        return WEEKDAYS.filter((day) => activeDays.has(day));
    };

    // Get subject color based on subject name (consistent coloring)
    const getSubjectColor = (subjectName: string) => {
        const hash = subjectName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
    };

    // Get entry for specific day and time slot
    const getEntry = (day: WeekDay, timeSlot: string): ScheduleEntry | null => {
        const [timeStart, timeEnd] = timeSlot.split('-');
        return timetable.schedule.find((entry) => entry.weekDay === day && entry.timeStart === timeStart && entry.timeEnd === timeEnd) || null;
    };

    // Get recess activity for specific time slot
    const getRecessActivity = (timeSlot: string): RecessActivity | null => {
        const [timeStart, timeEnd] = timeSlot.split('-');
        return timetable.recessActivities.find((activity) => activity.timeStart === timeStart && activity.timeEnd === timeEnd) || null;
    };

    // Format time (24h to 12h)
    const formatTime = (time: string): string => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    // Get timetable title
    const getTitle = (): string => {
        if (customTitle) return customTitle;

        if (timetable.class) {
            return `Class Timetable – ${timetable.class.className}`;
        }
        if (timetable.department) {
            return `Department Timetable – ${timetable.department.name}`;
        }
        return 'Timetable';
    };

    // Get unique subjects for legend
    const getUniqueSubjects = (): { name: string; code?: string }[] => {
        const subjects = new Map<string, { name: string; code?: string }>();

        timetable.schedule.forEach((entry) => {
            if (entry.subject && !subjects.has(entry.subject.name)) {
                subjects.set(entry.subject.name, {
                    name: entry.subject.name,
                    code: entry.subject.code
                });
            }
        });

        return Array.from(subjects.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const timeSlots = getTimeSlots();
    const activeDays = getActiveDays();
    const isLandscape = orientation === 'landscape';

    return (
        <div ref={ref} className="timetable-print-report" data-orientation={orientation}>
            <style jsx>{`
                .timetable-print-report {
                    font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                    background: white;
                    color: #000;
                    padding: 10mm;
                    box-sizing: border-box;
                }

                .timetable-print-report[data-orientation='landscape'] {
                    width: 420mm;
                    min-height: 297mm;
                }

                .timetable-print-report[data-orientation='portrait'] {
                    width: 297mm;
                    min-height: 420mm;
                }

                /* ==================== HEADER SECTION ==================== */
                .report-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding-bottom: 12px;
                    border-bottom: 3px solid #1e3a5f;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .school-logo {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                }

                .school-info {
                    text-align: left;
                }

                .school-name {
                    font-size: ${isLandscape ? '28px' : '24px'};
                    font-weight: 700;
                    color: #1e3a5f;
                    margin: 0 0 4px 0;
                    letter-spacing: 0.5px;
                }

                .school-details {
                    font-size: 11px;
                    color: #4b5563;
                    margin: 2px 0;
                }

                .header-right {
                    text-align: right;
                }

                .academic-info {
                    font-size: 12px;
                    color: #374151;
                    margin: 3px 0;
                    font-weight: 500;
                }

                .orientation-badge {
                    display: inline-block;
                    background: #e0e7ff;
                    color: #3730a3;
                    padding: 3px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    margin-top: 8px;
                }

                /* ==================== TITLE SECTION ==================== */
                .report-title-section {
                    text-align: center;
                    margin: 15px 0 20px;
                }

                .report-title {
                    font-size: ${isLandscape ? '26px' : '22px'};
                    font-weight: 700;
                    color: #1e3a5f;
                    margin: 0 0 5px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .report-subtitle {
                    font-size: 13px;
                    color: #6b7280;
                    margin: 0;
                }

                .effective-dates {
                    font-size: 11px;
                    color: #059669;
                    margin-top: 8px;
                    font-weight: 500;
                }

                /* ==================== TIMETABLE GRID ==================== */
                .timetable-container {
                    width: 100%;
                    overflow: hidden;
                }

                .timetable-grid {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    border: 2px solid #1e3a5f;
                }

                .timetable-grid th,
                .timetable-grid td {
                    border: 1px solid #d1d5db;
                    padding: ${isLandscape ? '8px 6px' : '6px 4px'};
                    text-align: center;
                    vertical-align: middle;
                }

                .timetable-grid th {
                    background: linear-gradient(180deg, #1e3a5f 0%, #2d4a6f 100%);
                    color: white;
                    font-weight: 600;
                    font-size: ${isLandscape ? '13px' : '11px'};
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: ${isLandscape ? '12px 8px' : '10px 6px'};
                }

                .time-header {
                    width: ${isLandscape ? '100px' : '80px'};
                    background: linear-gradient(180deg, #374151 0%, #4b5563 100%) !important;
                }

                .day-header {
                    min-width: ${isLandscape ? '120px' : '90px'};
                }

                .time-cell {
                    background: #f8fafc;
                    font-weight: 600;
                    font-size: ${isLandscape ? '11px' : '10px'};
                    color: #1e3a5f;
                    white-space: nowrap;
                }

                .time-range {
                    display: block;
                    font-size: ${isLandscape ? '10px' : '9px'};
                    color: #6b7280;
                    margin-top: 2px;
                }

                /* ==================== SCHEDULE ENTRIES ==================== */
                .schedule-cell {
                    padding: ${isLandscape ? '6px 4px' : '4px 3px'} !important;
                    height: ${isLandscape ? '70px' : '60px'};
                }

                .schedule-entry {
                    border-radius: 6px;
                    padding: ${isLandscape ? '6px' : '4px'};
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    border-left: 4px solid;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                }

                .subject-name {
                    font-weight: 700;
                    font-size: ${isLandscape ? '12px' : '10px'};
                    margin-bottom: 2px;
                    line-height: 1.2;
                }

                .subject-code {
                    font-size: ${isLandscape ? '9px' : '8px'};
                    opacity: 0.8;
                    font-weight: 500;
                }

                .teacher-name {
                    font-size: ${isLandscape ? '10px' : '9px'};
                    margin-top: 3px;
                    opacity: 0.9;
                }

                .room-info {
                    font-size: ${isLandscape ? '9px' : '8px'};
                    margin-top: 2px;
                    opacity: 0.8;
                }

                /* ==================== RECESS ACTIVITIES ==================== */
                .recess-row td {
                    background: #fef3c7 !important;
                }

                .recess-cell {
                    background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%);
                    border: none !important;
                }

                .recess-entry {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 8px;
                    border-radius: 4px;
                }

                .recess-icon {
                    font-size: ${isLandscape ? '18px' : '16px'};
                }

                .recess-text {
                    font-weight: 600;
                    font-size: ${isLandscape ? '13px' : '11px'};
                    color: #92400e;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .empty-cell {
                    background: #f9fafb;
                }

                /* ==================== LEGEND SECTION ==================== */
                .legend-section {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                }

                .legend-title {
                    font-size: 14px;
                    font-weight: 700;
                    color: #1e3a5f;
                    margin: 0 0 12px 0;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .legend-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: ${isLandscape ? '15px' : '10px'};
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: ${isLandscape ? '11px' : '10px'};
                }

                .legend-color {
                    width: 20px;
                    height: 20px;
                    border-radius: 4px;
                    border-left: 4px solid;
                }

                .legend-label {
                    color: #374151;
                }

                .legend-code {
                    color: #6b7280;
                    font-size: 9px;
                }

                .legend-divider {
                    width: 1px;
                    height: 24px;
                    background: #d1d5db;
                    margin: 0 10px;
                }

                .activity-legend {
                    display: flex;
                    gap: 15px;
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #e5e7eb;
                }

                .activity-legend-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                }

                .activity-legend-icon {
                    font-size: 14px;
                }

                /* ==================== FOOTER SECTION ==================== */
                .report-footer {
                    margin-top: 20px;
                    padding-top: 12px;
                    border-top: 2px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .footer-left {
                    font-size: 10px;
                    color: #6b7280;
                }

                .footer-center {
                    text-align: center;
                }

                .approval-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .approval-draft {
                    background: #fef3c7;
                    color: #92400e;
                    border: 1px solid #f59e0b;
                }

                .approval-approved {
                    background: #dcfce7;
                    color: #166534;
                    border: 1px solid #22c55e;
                }

                .approval-pending {
                    background: #dbeafe;
                    color: #1e40af;
                    border: 1px solid #3b82f6;
                }

                .footer-right {
                    text-align: right;
                    font-size: 10px;
                    color: #6b7280;
                }

                .version-info {
                    font-size: 9px;
                    color: #9ca3af;
                    margin-top: 4px;
                }

                /* ==================== PRINT STYLES ==================== */
                @media print {
                    .timetable-print-report {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }

                    .timetable-print-report[data-orientation='landscape'] {
                        width: 420mm;
                        min-height: 297mm;
                    }

                    .timetable-print-report[data-orientation='portrait'] {
                        width: 297mm;
                        min-height: 420mm;
                    }

                    @page {
                        margin: 10mm;
                    }

                    .schedule-entry,
                    .recess-entry,
                    .legend-color,
                    .approval-badge,
                    .orientation-badge,
                    th {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header Section */}
            <div className="report-header">
                <div className="header-left">
                    {schoolLogo && <img src={schoolLogo} alt="School Logo" className="school-logo" />}
                    <div className="school-info">
                        <h1 className="school-name">{timetable.school?.schoolName || 'School Name'}</h1>
                        {timetable.school?.address && <p className="school-details">{timetable.school.address}</p>}
                        {(timetable.school?.phone || timetable.school?.email) && (
                            <p className="school-details">
                                {timetable.school.phone && `Tel: ${timetable.school.phone}`}
                                {timetable.school.phone && timetable.school.email && ' | '}
                                {timetable.school.email && `Email: ${timetable.school.email}`}
                            </p>
                        )}
                        {timetable.site && <p className="school-details">Site: {timetable.site.siteName}</p>}
                    </div>
                </div>
                <div className="header-right">
                    <p className="academic-info">Academic Year: {timetable.academicYear}</p>
                    <p className="academic-info">Term {timetable.academicTerm}</p>
                    <p className="academic-info">
                        Generated:{' '}
                        {new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                    <span className="orientation-badge">{orientation}</span>
                </div>
            </div>

            {/* Title Section */}
            <div className="report-title-section">
                <h2 className="report-title">{getTitle()}</h2>
                <p className="report-subtitle">Weekly Schedule Overview</p>
                {timetable.effectiveFrom && (
                    <p className="effective-dates">
                        Effective:{' '}
                        {new Date(timetable.effectiveFrom).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                        {timetable.effectiveTo &&
                            ` - ${new Date(timetable.effectiveTo).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })}`}
                    </p>
                )}
            </div>

            {/* Timetable Grid */}
            <div className="timetable-container">
                {isLandscape ? (
                    // Landscape: Days as columns, Time as rows
                    <table className="timetable-grid">
                        <thead>
                            <tr>
                                <th className="time-header">Time</th>
                                {activeDays.map((day) => (
                                    <th key={day} className="day-header">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((slot, index) => {
                                const recessActivity = getRecessActivity(slot);
                                const [startTime, endTime] = slot.split('-');

                                if (recessActivity) {
                                    return (
                                        <tr key={slot} className="recess-row">
                                            <td className="time-cell">
                                                {formatTime(startTime)}
                                                <span className="time-range">to {formatTime(endTime)}</span>
                                            </td>
                                            <td colSpan={activeDays.length} className="recess-cell">
                                                <div className="recess-entry">
                                                    <span className="recess-icon">
                                                        {recessActivity.activityType === 'break' && '☕'}
                                                        {recessActivity.activityType === 'lunch' && '🍽️'}
                                                        {recessActivity.activityType === 'assembly' && '🏫'}
                                                        {recessActivity.activityType === 'other' && '📋'}
                                                    </span>
                                                    <span className="recess-text">{recessActivity.description}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={slot}>
                                        <td className="time-cell">
                                            {formatTime(startTime)}
                                            <span className="time-range">to {formatTime(endTime)}</span>
                                        </td>
                                        {activeDays.map((day) => {
                                            const entry = getEntry(day, slot);

                                            if (entry) {
                                                const colors = getSubjectColor(entry.subject.name);
                                                return (
                                                    <td key={`${day}-${slot}`} className="schedule-cell">
                                                        <div
                                                            className="schedule-entry"
                                                            style={{
                                                                backgroundColor: colors.bg,
                                                                color: colors.text,
                                                                borderLeftColor: colors.border
                                                            }}
                                                        >
                                                            <div className="subject-name">
                                                                {entry.subject.name}
                                                                {entry.subject.code && <span className="subject-code"> ({entry.subject.code})</span>}
                                                            </div>
                                                            {entry.teacher && (
                                                                <div className="teacher-name">
                                                                    {entry.teacher.firstName} {entry.teacher.lastName}
                                                                </div>
                                                            )}
                                                            {entry.room && <div className="room-info">Room: {entry.room}</div>}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return <td key={`${day}-${slot}`} className="schedule-cell empty-cell"></td>;
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    // Portrait: Time as columns, Days as rows
                    <table className="timetable-grid">
                        <thead>
                            <tr>
                                <th className="time-header">Day</th>
                                {timeSlots.map((slot, index) => {
                                    const [startTime, endTime] = slot.split('-');
                                    const recessActivity = getRecessActivity(slot);
                                    return (
                                        <th
                                            key={slot}
                                            className="day-header"
                                            style={{
                                                backgroundColor: recessActivity ? '#fef3c7' : undefined,
                                                color: recessActivity ? '#92400e' : undefined
                                            }}
                                        >
                                            {formatTime(startTime)}
                                            <br />
                                            <span style={{ fontSize: '9px', opacity: 0.8 }}>{recessActivity ? recessActivity.description : formatTime(endTime)}</span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {activeDays.map((day) => (
                                <tr key={day}>
                                    <td className="time-cell" style={{ fontWeight: 700 }}>
                                        {isLandscape ? day : WEEKDAYS_SHORT[day]}
                                    </td>
                                    {timeSlots.map((slot) => {
                                        const recessActivity = getRecessActivity(slot);

                                        if (recessActivity) {
                                            return (
                                                <td key={`${day}-${slot}`} className="recess-cell">
                                                    <span style={{ fontSize: '14px' }}>
                                                        {recessActivity.activityType === 'break' && '☕'}
                                                        {recessActivity.activityType === 'lunch' && '🍽️'}
                                                        {recessActivity.activityType === 'assembly' && '🏫'}
                                                        {recessActivity.activityType === 'other' && '📋'}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        const entry = getEntry(day, slot);

                                        if (entry) {
                                            const colors = getSubjectColor(entry.subject.name);
                                            return (
                                                <td key={`${day}-${slot}`} className="schedule-cell">
                                                    <div
                                                        className="schedule-entry"
                                                        style={{
                                                            backgroundColor: colors.bg,
                                                            color: colors.text,
                                                            borderLeftColor: colors.border
                                                        }}
                                                    >
                                                        <div className="subject-name">{entry.subject.name}</div>
                                                        {entry.teacher && (
                                                            <div className="teacher-name">
                                                                {entry.teacher.firstName?.charAt(0)}. {entry.teacher.lastName}
                                                            </div>
                                                        )}
                                                        {entry.room && <div className="room-info">{entry.room}</div>}
                                                    </div>
                                                </td>
                                            );
                                        }

                                        return <td key={`${day}-${slot}`} className="schedule-cell empty-cell"></td>;
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Legend Section */}
            {showLegend && (
                <div className="legend-section">
                    <h3 className="legend-title">Subject Legend</h3>
                    <div className="legend-grid">
                        {getUniqueSubjects().map((subject, index) => {
                            const colors = getSubjectColor(subject.name);
                            return (
                                <div key={subject.name} className="legend-item">
                                    <div
                                        className="legend-color"
                                        style={{
                                            backgroundColor: colors.bg,
                                            borderLeftColor: colors.border
                                        }}
                                    ></div>
                                    <span className="legend-label">
                                        {subject.name}
                                        {subject.code && <span className="legend-code"> ({subject.code})</span>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="activity-legend">
                        <div className="activity-legend-item">
                            <span className="activity-legend-icon">☕</span>
                            <span>Break</span>
                        </div>
                        <div className="activity-legend-item">
                            <span className="activity-legend-icon">🍽️</span>
                            <span>Lunch</span>
                        </div>
                        <div className="activity-legend-item">
                            <span className="activity-legend-icon">🏫</span>
                            <span>Assembly</span>
                        </div>
                        <div className="activity-legend-item">
                            <span className="activity-legend-icon">📋</span>
                            <span>Other Activity</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Section */}
            <div className="report-footer">
                <div className="footer-left">
                    <p>Generated by: {generatedBy || timetable.createdBy ? `${timetable.createdBy?.firstName} ${timetable.createdBy?.lastName}` : 'System'}</p>
                    {timetable.versionNote && <p className="version-info">Note: {timetable.versionNote}</p>}
                </div>
                <div className="footer-center">
                    <span className={`approval-badge approval-${approvalStatus.toLowerCase()}`}>{approvalStatus}</span>
                </div>
                <div className="footer-right">
                    <p>Version {timetable.version || 1}</p>
                    <p className="version-info">Document ID: {timetable._id?.slice(-8) || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
});

TimetablePrintReport.displayName = 'TimetablePrintReport';

export default TimetablePrintReport;
