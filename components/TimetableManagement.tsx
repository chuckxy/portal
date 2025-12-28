'use client';

import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Steps } from 'primereact/steps';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { Divider } from 'primereact/divider';
import { ProgressBar } from 'primereact/progressbar';
import { Toolbar } from 'primereact/toolbar';
import { Menu } from 'primereact/menu';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Sidebar } from 'primereact/sidebar';
import { FileUpload } from 'primereact/fileupload';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
type ActivityType = 'break' | 'lunch' | 'assembly' | 'other';

interface ScheduleEntry {
    _id?: string;
    weekDay: WeekDay;
    subject: any;
    teacher?: any;
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
    school: any;
    site: any;
    class: any;
    academicYear: string;
    academicTerm: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    schedule: ScheduleEntry[];
    recessActivities: RecessActivity[];
    version: number;
    isActive: boolean;
    createdBy: any;
    versionNote?: string;
}

interface SchoolDayStructure {
    schoolStartTime: string;
    schoolEndTime: string;
    periodDuration: number;
    numberOfPeriods: number;
    breaks: {
        enabled: boolean;
        description: string;
        timeStart: string;
        timeEnd: string;
        activityType: ActivityType;
    }[];
}

const WEEKDAYS: WeekDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_BREAKS = [
    { description: 'Morning Assembly', timeStart: '07:30', timeEnd: '08:00', activityType: 'assembly' as ActivityType },
    { description: 'Mid-Morning Break', timeStart: '10:10', timeEnd: '10:30', activityType: 'break' as ActivityType },
    { description: 'Lunch Break', timeStart: '12:30', timeEnd: '13:15', activityType: 'lunch' as ActivityType },
    { description: 'Afternoon Break', timeStart: '14:30', timeEnd: '14:45', activityType: 'break' as ActivityType }
];

const SUBJECT_EMOJIS: Record<string, string> = {
    Mathematics: '📘',
    Math: '📘',
    English: '📗',
    Science: '📙',
    Physics: '⚗️',
    Chemistry: '🧪',
    Biology: '🔬',
    History: '🌍',
    Geography: '🗺️',
    ICT: '💻',
    'Computer Science': '💻',
    Art: '🎨',
    Music: '🎵',
    'Physical Education': '🏃',
    Sports: '🏃',
    PE: '🏃'
};

export default function TimetableManagement() {
    const router = useRouter();
    const toast = React.useRef<Toast>(null);
    const { user } = useAuth();
    // Phase management
    const [activeStep, setActiveStep] = useState(0);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view'>('list');

    // Data states
    const [timetables, setTimetables] = useState<TimetableData[]>([]);
    const [selectedTimetable, setSelectedTimetable] = useState<TimetableData | null>(null);
    const [loading, setLoading] = useState(false);

    // Form states - Phase 1: Setup
    const [setupData, setSetupData] = useState({
        school: null as any,
        site: null as any,
        class: null as any,
        academicYear: '',
        academicTerm: 1,
        effectiveFrom: new Date(),
        effectiveTo: null as Date | null,
        versionNote: ''
    });

    // Form states - Phase 1: School Day Structure
    const [schoolDay, setSchoolDay] = useState<SchoolDayStructure>({
        schoolStartTime: '07:30',
        schoolEndTime: '15:30',
        periodDuration: 40,
        numberOfPeriods: 8,
        breaks: DEFAULT_BREAKS.map((b) => ({ ...b, enabled: b.description === 'Mid-Morning Break' || b.description === 'Lunch Break' }))
    });

    // Form states - Phase 2: Schedule Building
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [recessActivities, setRecessActivities] = useState<RecessActivity[]>([]);

    // UI states
    const [showPeriodDialog, setShowPeriodDialog] = useState(false);
    const [showBreakDialog, setShowBreakDialog] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<ScheduleEntry | null>(null);
    const [selectedCell, setSelectedCell] = useState<{ day: WeekDay; timeSlot: string } | null>(null);
    const [conflictCheck, setConflictCheck] = useState<any[]>([]);
    const [showSidebar, setShowSidebar] = useState(false);
    const [uploadDialogVisible, setUploadDialogVisible] = useState(false);

    // Dropdown options
    const [schools, setSchools] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    // Steps for wizard
    const steps = [
        { label: 'Setup', icon: 'pi pi-cog' },
        { label: 'School Day', icon: 'pi pi-clock' },
        { label: 'Build Schedule', icon: 'pi pi-table' },
        { label: 'Review', icon: 'pi pi-check' }
    ];

    useEffect(() => {
        loadTimetables();
        loadDropdownData();
        setSetupData({ ...setupData, school: user?.school });
    }, [user]);

    useEffect(() => {
        if (setupData.site) {
            const siteId = setupData.site._id || setupData.site;
            if (siteId) {
                loadClasses(siteId);
            }
        }
    }, [setupData.site]);

    useEffect(() => {
        if (setupData.class) {
            loadSubjects();
            loadTeachers();
        }
    }, [setupData.class]);

    // Populate form when editing an existing timetable
    useEffect(() => {
        const populateEditData = async () => {
            if (viewMode === 'edit' && selectedTimetable) {
                // First, ensure sites are loaded
                if (sites.length === 0) {
                    await loadDropdownData();
                }

                // Find the matching site from the sites array
                const siteId = selectedTimetable.site?._id || selectedTimetable.site;
                const matchingSite = sites.find((s) => s._id === siteId) || selectedTimetable.site;

                // Load classes for this site
                if (siteId) {
                    await loadClasses(siteId);
                }

                // Wait a bit for classes to load
                setTimeout(() => {
                    const classId = selectedTimetable.class?._id || selectedTimetable.class;
                    const matchingClass = classes.find((c) => c._id === classId) || selectedTimetable.class;

                    // Populate setup data with matching objects from dropdowns
                    setSetupData({
                        school: selectedTimetable.school,
                        site: matchingSite,
                        class: matchingClass,
                        academicYear: selectedTimetable.academicYear,
                        academicTerm: selectedTimetable.academicTerm,
                        effectiveFrom: new Date(selectedTimetable.effectiveFrom),
                        effectiveTo: selectedTimetable.effectiveTo ? new Date(selectedTimetable.effectiveTo) : null,
                        versionNote: selectedTimetable.versionNote || ''
                    });
                }, 200);

                // Populate schedule
                setSchedule(selectedTimetable.schedule || []);

                // Populate recess activities first (before calculating school day)
                const recessActs = selectedTimetable.recessActivities || [];
                setRecessActivities(recessActs);

                // Use standard school day structure when editing
                // Don't try to infer from saved data as it may be incomplete
                setSchoolDay({
                    schoolStartTime: '07:30',
                    schoolEndTime: '15:30',
                    periodDuration: 40,
                    numberOfPeriods: 8,
                    breaks: recessActs.map((r) => ({
                        enabled: true,
                        description: r.description,
                        timeStart: r.timeStart,
                        timeEnd: r.timeEnd,
                        activityType: r.activityType
                    }))
                });

                // Start at build phase since setup is already done
                setActiveStep(2);
            }
        };

        populateEditData();
    }, [viewMode, selectedTimetable]);

    const loadTimetables = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/timetables');
            const data = await response.json();
            if (data.success) {
                setTimetables(data.data || []);
            }
        } catch (error) {
            console.error('Error loading timetables:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to load timetables' });
        } finally {
            setLoading(false);
        }
    };

    const loadDropdownData = async () => {
        try {
            // Load schools
            // const schoolsRes = await fetch('/api/schools');
            // const schoolsData = await schoolsRes.json();
            // setSchools(schoolsData.data || []);

            // Load sites
            // const sitesRes = await fetch('/api/sites');

            if (user == null) return;
            const response = await fetch(`/api/sites?school=${user.school}`);
            const sitesData = await response.json();
            setSites(sitesData.sites || []);

            // Set default academic year
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const academicYear = currentMonth >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
            setSetupData((prev) => ({ ...prev, academicYear }));
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    };

    const loadClasses = async (siteId: string) => {
        try {
            const response = await fetch(`/api/classes?siteId=${siteId}`);
            const data = await response.json();
            setClasses(data.classes || []);
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    };

    const loadSubjects = async () => {
        try {
            const response = await fetch('/api/subjects?site=' + (setupData.site?._id || setupData.site));
            const data = await response.json();

            setSubjects(data.subjects || []);
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    };

    const loadTeachers = async () => {
        try {
            const response = await fetch('/api/persons?category=teacher');
            const data = await response.json();

            setTeachers(data.persons || []);
        } catch (error) {
            console.error('Error loading teachers:', error);
        }
    };

    const checkExistingTimetable = async () => {
        if (!setupData.class || !setupData.academicYear || !setupData.academicTerm) return null;

        try {
            const response = await fetch(`/api/timetables/check?classId=${setupData.class._id || setupData.class}&academicYear=${setupData.academicYear}&academicTerm=${setupData.academicTerm}`);
            const data = await response.json();
            return data.exists ? data.timetable : null;
        } catch (error) {
            console.error('Error checking existing timetable:', error);
            return null;
        }
    };

    const generateTimeSlots = () => {
        const slots: string[] = [];
        const start = schoolDay.schoolStartTime.split(':').map(Number);
        let currentMinutes = start[0] * 60 + start[1];

        // Add all periods with breaks
        for (let i = 0; i < schoolDay.numberOfPeriods; i++) {
            const hours = Math.floor(currentMinutes / 60);
            const minutes = currentMinutes % 60;
            const startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

            currentMinutes += schoolDay.periodDuration;

            const endHours = Math.floor(currentMinutes / 60);
            const endMinutes = currentMinutes % 60;
            const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

            slots.push(`${startTime}-${endTime}`);

            // Check if there's a break after this period
            const breakAfter = recessActivities.find((b) => b.timeStart === endTime || (new Date(`2000-01-01T${b.timeStart}`) <= new Date(`2000-01-01T${endTime}`) && new Date(`2000-01-01T${b.timeEnd}`) > new Date(`2000-01-01T${endTime}`)));

            if (breakAfter) {
                currentMinutes = parseInt(breakAfter.timeEnd.split(':')[0]) * 60 + parseInt(breakAfter.timeEnd.split(':')[1]);
            }
        }

        return slots;
    };

    const getPeriodForSlot = (day: WeekDay, timeSlot: string) => {
        const [start, end] = timeSlot.split('-');
        return schedule.find((s) => s.weekDay === day && s.timeStart === start && s.timeEnd === end);
    };

    const getBreakForSlot = (timeSlot: string) => {
        const [start] = timeSlot.split('-');
        return recessActivities.find((r) => r.timeStart === start);
    };

    const getSubjectEmoji = (subjectName: string) => {
        return SUBJECT_EMOJIS[subjectName] || '📚';
    };

    const handleAddPeriod = (day: WeekDay, timeSlot: string) => {
        const [timeStart, timeEnd] = timeSlot.split('-');
        setSelectedCell({ day, timeSlot });
        setEditingPeriod({
            weekDay: day,
            subject: null,
            teacher: null,
            timeStart,
            timeEnd,
            room: '',
            periodNumber: schedule.length + 1,
            isRecurring: true,
            notes: ''
        });
        setShowPeriodDialog(true);
    };

    const handleEditPeriod = (period: ScheduleEntry) => {
        setEditingPeriod(period);
        setShowPeriodDialog(true);
    };

    const handleSavePeriod = () => {
        if (!editingPeriod || !editingPeriod.subject) {
            toast.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please select a subject' });
            return;
        }

        // Check for conflicts
        const conflicts = checkConflicts(editingPeriod);
        if (conflicts.length > 0) {
            toast.current?.show({
                severity: 'error',
                summary: 'Conflict',
                detail: conflicts[0],
                life: 5000
            });
            return;
        }

        if (editingPeriod._id) {
            // Update existing
            setSchedule((prev) => prev.map((p) => (p._id === editingPeriod._id ? editingPeriod : p)));
        } else {
            // Add new
            setSchedule((prev) => [...prev, { ...editingPeriod, _id: Date.now().toString() }]);
        }

        setShowPeriodDialog(false);
        setEditingPeriod(null);
        toast.current?.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Period added successfully',
            life: 3000
        });
    };

    const handleDeletePeriod = (periodId: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this period?',
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                setSchedule((prev) => prev.filter((p) => p._id !== periodId));
                toast.current?.show({
                    severity: 'success',
                    summary: 'Deleted',
                    detail: 'Period removed successfully'
                });
            }
        });
    };

    const checkConflicts = (period: ScheduleEntry): string[] => {
        const conflicts: string[] = [];

        // Check teacher conflicts
        if (period.teacher) {
            const teacherConflicts = schedule.filter((s) => s._id !== period._id && s.weekDay === period.weekDay && s.timeStart === period.timeStart && s.teacher?._id === period.teacher?._id);

            if (teacherConflicts.length > 0) {
                const teacherName = period.teacher.firstName + ' ' + period.teacher.lastName;
                conflicts.push(`${teacherName} is already teaching another class at this time`);
            }
        }

        // Check room conflicts
        if (period.room) {
            const roomConflicts = schedule.filter((s) => s._id !== period._id && s.weekDay === period.weekDay && s.timeStart === period.timeStart && s.room === period.room);

            if (roomConflicts.length > 0) {
                conflicts.push(`Room ${period.room} is already occupied at this time`);
            }
        }

        return conflicts;
    };

    const calculateCompletionPercentage = () => {
        const totalSlots = WEEKDAYS.filter((d) => d !== 'Sunday').length * schoolDay.numberOfPeriods;
        const filledSlots = schedule.length;
        return Math.round((filledSlots / totalSlots) * 100);
    };

    const validateSetup = () => {
        if (!setupData.school || !setupData.site || !setupData.class || !setupData.academicYear) {
            toast.current?.show({ severity: 'warn', summary: 'Required', detail: 'Please fill all required fields' });
            return false;
        }
        return true;
    };

    const handleNext = async () => {
        if (activeStep === 0) {
            if (!validateSetup()) return;

            // Check for existing timetable
            const existing = await checkExistingTimetable();
            if (existing) {
                confirmDialog({
                    message: 'An active timetable already exists for this class and term. Do you want to create a new version?',
                    header: 'Existing Timetable',
                    icon: 'pi pi-exclamation-triangle',
                    accept: () => {
                        setActiveStep(1);
                    }
                });
                return;
            }
        }

        if (activeStep === 1) {
            // Generate recess activities from school day setup
            const activities: RecessActivity[] = schoolDay.breaks
                .filter((b) => b.enabled)
                .map((b, index) => ({
                    _id: `break-${index}`,
                    description: b.description,
                    timeStart: b.timeStart,
                    timeEnd: b.timeEnd,
                    activityType: b.activityType
                }));
            setRecessActivities(activities);
        }

        if (activeStep < steps.length - 1) {
            setActiveStep(activeStep + 1);
        }
    };

    const handleBack = () => {
        if (activeStep > 0) {
            setActiveStep(activeStep - 1);
        }
    };

    const handleSaveDraft = async () => {
        try {
            setLoading(true);

            // Clean data before sending - remove temporary _id fields and extract object IDs
            const cleanSchedule = schedule.map(({ _id, ...rest }) => ({
                ...rest,
                subject: rest.subject?._id || rest.subject,
                teacher: rest.teacher?._id || rest.teacher
            }));

            const cleanRecessActivities = recessActivities.map(({ _id, ...rest }) => rest);

            const timetableData = {
                school: setupData.school?._id || setupData.school,
                site: setupData.site?._id || setupData.site,
                class: setupData.class?._id || setupData.class,
                academicYear: setupData.academicYear,
                academicTerm: setupData.academicTerm,
                effectiveFrom: setupData.effectiveFrom,
                effectiveTo: setupData.effectiveTo,
                versionNote: setupData.versionNote,
                schedule: cleanSchedule,
                recessActivities: cleanRecessActivities,
                version: selectedTimetable?.version || 1,
                isActive: false,
                createdBy: user?._id || user?.id
            };

            // Check if we're editing or if a draft already exists for this class/term
            let isEditing: boolean = viewMode === 'edit' && !!selectedTimetable?._id;
            let existingDraftId = selectedTimetable?._id;

            // If creating new, check for existing draft to overwrite
            if (!isEditing && setupData.class && setupData.academicYear && setupData.academicTerm) {
                const existingDrafts = timetables.filter((t) => !t.isActive && (t.class?._id || t.class) === (setupData.class?._id || setupData.class) && t.academicYear === setupData.academicYear && t.academicTerm === setupData.academicTerm);

                if (existingDrafts.length > 0) {
                    isEditing = true;
                    existingDraftId = existingDrafts[0]._id;
                }
            }

            const url = isEditing ? `/api/timetables?id=${existingDraftId}` : '/api/timetables';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timetableData)
            });

            const data = await response.json();

            if (data.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Saved',
                    detail: isEditing ? 'Draft updated successfully' : 'Draft saved successfully'
                });
                loadTimetables();
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to save draft'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        try {
            setLoading(true);

            // Clean data before sending - remove temporary _id fields and extract object IDs
            const cleanSchedule = schedule.map(({ _id, ...rest }) => ({
                ...rest,
                subject: rest.subject?._id || rest.subject,
                teacher: rest.teacher?._id || rest.teacher
            }));

            const cleanRecessActivities = recessActivities.map(({ _id, ...rest }) => rest);

            const timetableData = {
                school: setupData.school?._id || setupData.school,
                site: setupData.site?._id || setupData.site,
                class: setupData.class?._id || setupData.class,
                academicYear: setupData.academicYear,
                academicTerm: setupData.academicTerm,
                effectiveFrom: setupData.effectiveFrom,
                effectiveTo: setupData.effectiveTo,
                versionNote: setupData.versionNote,
                schedule: cleanSchedule,
                recessActivities: cleanRecessActivities,
                version: selectedTimetable?.version || 1,
                isActive: true,
                createdBy: user?._id || user?.id
            };

            const isEditing: boolean = viewMode === 'edit' && !!selectedTimetable?._id;
            const url = isEditing ? `/api/timetables?id=${selectedTimetable._id}` : '/api/timetables';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(timetableData)
            });

            const data = await response.json();

            if (data.success) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Activated',
                    detail: 'Timetable activated successfully!',
                    life: 5000
                });
                setViewMode('list');
                setActiveStep(0);
                loadTimetables();
            } else {
                throw new Error(data.message);
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'Failed to activate timetable'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (timetableId: string, isActive: boolean) => {
        if (isActive) {
            toast.current?.show({
                severity: 'error',
                summary: 'Cannot Delete',
                detail: 'Cannot delete an active timetable. Please deactivate it first.'
            });
            return;
        }

        confirmDialog({
            message: 'Are you sure you want to delete this timetable? This action cannot be undone.',
            header: 'Delete Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    setLoading(true);
                    const response = await fetch(`/api/timetables?id=${timetableId}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        toast.current?.show({
                            severity: 'success',
                            summary: 'Deleted',
                            detail: 'Timetable deleted successfully'
                        });
                        loadTimetables();
                    } else {
                        throw new Error(data.message);
                    }
                } catch (error: any) {
                    toast.current?.show({
                        severity: 'error',
                        summary: 'Error',
                        detail: error.message || 'Failed to delete timetable'
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const downloadTemplate = () => {
        // Generate CSV template
        const headers = ['Day', 'TimeStart', 'TimeEnd', 'SubjectName', 'TeacherFirstName', 'TeacherLastName', 'Room', 'Notes'];
        const exampleRows = [
            ['Monday', '08:00', '08:40', 'Mathematics', 'John', 'Doe', 'Room 101', 'Bring calculators'],
            ['Monday', '08:40', '09:20', 'English', 'Jane', 'Smith', 'Room 102', ''],
            ['Tuesday', '08:00', '08:40', 'Science', 'John', 'Doe', 'Lab 1', '']
        ];

        // Add empty rows for each day and time slot
        const timeSlots = generateTimeSlots();
        const templateRows: string[][] = [];

        WEEKDAYS.slice(0, 6).forEach((day) => {
            timeSlots.forEach((slot) => {
                const [start, end] = slot.split('-');
                // Skip if it's a break time
                const isBreak = recessActivities.some((r) => r.timeStart === start);
                if (!isBreak) {
                    templateRows.push([day, start, end, '', '', '', '', '']);
                }
            });
        });

        // Create CSV content
        const csvContent = [
            '# Timetable Import Template',
            '# Fill in the rows below with your timetable data',
            '# Do not modify the header row',
            '# Leave TeacherFirstName, TeacherLastName, Room, and Notes blank if not applicable',
            '',
            headers.join(','),
            ...exampleRows.map((row) => row.join(',')),
            '# Add your entries below:',
            ...templateRows.map((row) => row.join(','))
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `timetable_template_${setupData.class?.className || 'template'}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.current?.show({
            severity: 'success',
            summary: 'Template Downloaded',
            detail: 'Fill in the template and upload it back',
            life: 3000
        });
    };

    const handleFileUpload = async (event: any) => {
        const file = event.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split('\n').filter((line) => line.trim() && !line.startsWith('#'));

            if (lines.length < 2) {
                throw new Error('File is empty or invalid');
            }

            const headers = lines[0].split(',').map((h) => h.trim());
            const dataLines = lines.slice(1);

            const newSchedule: ScheduleEntry[] = [];
            const errors: string[] = [];

            for (let i = 0; i < dataLines.length; i++) {
                const values = dataLines[i].split(',').map((v) => v.trim());
                if (values.length < 3 || !values[0] || !values[1] || !values[2]) continue;

                const [day, timeStart, timeEnd, subjectName, teacherFirst, teacherLast, room, notes] = values;

                // Validate day
                if (!WEEKDAYS.includes(day as WeekDay)) {
                    errors.push(`Line ${i + 2}: Invalid day "${day}"`);
                    continue;
                }

                // Find subject
                const subject = subjects.find((s) => s.name.toLowerCase() === subjectName.toLowerCase());

                if (subjectName && !subject) {
                    errors.push(`Line ${i + 2}: Subject "${subjectName}" not found`);
                    continue;
                }

                // Find teacher if specified
                let teacher = null;
                if (teacherFirst || teacherLast) {
                    teacher = teachers.find((t) => t.firstName.toLowerCase() === teacherFirst.toLowerCase() && t.lastName.toLowerCase() === teacherLast.toLowerCase());

                    if (!teacher) {
                        errors.push(`Line ${i + 2}: Teacher "${teacherFirst} ${teacherLast}" not found`);
                    }
                }

                if (subject) {
                    const entry: ScheduleEntry = {
                        _id: `import-${Date.now()}-${i}`,
                        weekDay: day as WeekDay,
                        subject: subject,
                        teacher: teacher,
                        timeStart,
                        timeEnd,
                        room: room || '',
                        periodNumber: newSchedule.length + 1,
                        isRecurring: true,
                        notes: notes || ''
                    };

                    // Check for conflicts
                    const conflicts = checkConflicts(entry);
                    if (conflicts.length > 0) {
                        errors.push(`Line ${i + 2}: ${conflicts[0]}`);
                    } else {
                        newSchedule.push(entry);
                    }
                }
            }

            if (newSchedule.length === 0) {
                throw new Error('No valid entries found in the file');
            }

            // Add imported schedule to existing schedule
            setSchedule((prev) => [...prev, ...newSchedule]);
            setUploadDialogVisible(false);

            toast.current?.show({
                severity: 'success',
                summary: 'Import Successful',
                detail: `${newSchedule.length} periods imported${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
                life: 5000
            });

            if (errors.length > 0) {
                console.log('Import errors:', errors);
                toast.current?.show({
                    severity: 'warn',
                    summary: 'Some Entries Skipped',
                    detail: `${errors.length} entries had errors. Check console for details.`,
                    life: 5000
                });
            }
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Import Failed',
                detail: error.message || 'Failed to parse file'
            });
        }
    };

    const renderSetupPhase = () => (
        <div className="grid">
            <div className="col-12">
                <h3>Timetable Context</h3>
                <p className="text-600">{`First, let's set up the basics for this timetable`}</p>
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="site" className="block mb-2">
                    School Site *
                </label>
                <Dropdown id="site" value={setupData.site} options={sites} onChange={(e) => setSetupData({ ...setupData, site: e.value, class: null })} optionLabel="siteName" placeholder="Select a site" className="w-full" filter />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="class" className="block mb-2">
                    Class *
                </label>
                <Dropdown
                    id="class"
                    value={setupData.class}
                    options={classes}
                    onChange={(e) => setSetupData({ ...setupData, class: e.value })}
                    optionLabel="className"
                    placeholder="Select a class"
                    className="w-full"
                    disabled={!setupData.site}
                    filter
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="academicYear" className="block mb-2">
                    Academic Year *
                </label>
                <InputText id="academicYear" value={setupData.academicYear} onChange={(e) => setSetupData({ ...setupData, academicYear: e.target.value })} className="w-full" />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="academicTerm" className="block mb-2">
                    Academic Term *
                </label>
                <Dropdown
                    id="academicTerm"
                    value={setupData.academicTerm}
                    options={[
                        { label: 'Term 1', value: 1 },
                        { label: 'Term 2', value: 2 },
                        { label: 'Term 3', value: 3 }
                    ]}
                    onChange={(e) => setSetupData({ ...setupData, academicTerm: e.value })}
                    className="w-full"
                />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="effectiveFrom" className="block mb-2">
                    Effective From
                </label>
                <Calendar id="effectiveFrom" value={setupData.effectiveFrom} onChange={(e) => setSetupData({ ...setupData, effectiveFrom: e.value as Date })} dateFormat="yy-mm-dd" className="w-full" showIcon />
            </div>

            <div className="col-12 md:col-6">
                <label htmlFor="effectiveTo" className="block mb-2">
                    Effective To (Optional)
                </label>
                <Calendar id="effectiveTo" value={setupData.effectiveTo} onChange={(e) => setSetupData({ ...setupData, effectiveTo: e.value as Date })} dateFormat="yy-mm-dd" className="w-full" showIcon />
            </div>

            <div className="col-12">
                <label htmlFor="versionNote" className="block mb-2">
                    Version Note (Optional)
                </label>
                <InputTextarea id="versionNote" value={setupData.versionNote} onChange={(e) => setSetupData({ ...setupData, versionNote: e.target.value })} rows={3} className="w-full" placeholder="E.g., First term timetable for new academic year" />
            </div>
        </div>
    );

    const renderSchoolDayPhase = () => (
        <div className="grid">
            <div className="col-12">
                <h3>Define School Day Structure</h3>
                <p className="text-600">Set up your school day timings and breaks</p>
            </div>

            <div className="col-12 md:col-3">
                <label htmlFor="schoolStartTime" className="block mb-2">
                    School Start Time
                </label>
                <InputText id="schoolStartTime" type="time" value={schoolDay.schoolStartTime} onChange={(e) => setSchoolDay({ ...schoolDay, schoolStartTime: e.target.value })} className="w-full" />
            </div>

            <div className="col-12 md:col-3">
                <label htmlFor="schoolEndTime" className="block mb-2">
                    School End Time
                </label>
                <InputText id="schoolEndTime" type="time" value={schoolDay.schoolEndTime} onChange={(e) => setSchoolDay({ ...schoolDay, schoolEndTime: e.target.value })} className="w-full" />
            </div>

            <div className="col-12 md:col-3">
                <label htmlFor="periodDuration" className="block mb-2">
                    Period Duration (minutes)
                </label>
                <InputText id="periodDuration" type="number" value={schoolDay.periodDuration.toString()} onChange={(e) => setSchoolDay({ ...schoolDay, periodDuration: parseInt(e.target.value) || 40 })} className="w-full" />
            </div>

            <div className="col-12 md:col-3">
                <label htmlFor="numberOfPeriods" className="block mb-2">
                    Number of Periods
                </label>
                <InputText id="numberOfPeriods" type="number" value={schoolDay.numberOfPeriods.toString()} onChange={(e) => setSchoolDay({ ...schoolDay, numberOfPeriods: parseInt(e.target.value) || 8 })} className="w-full" />
            </div>

            <div className="col-12">
                <Divider />
                <h4>Quick Add Common Breaks</h4>
            </div>

            {schoolDay.breaks.map((breakItem, index) => (
                <div key={index} className="col-12 md:col-6">
                    <div className="flex align-items-center gap-3 p-3 surface-100 border-round">
                        <Checkbox
                            checked={breakItem.enabled}
                            onChange={(e) => {
                                const newBreaks = [...schoolDay.breaks];
                                newBreaks[index].enabled = e.checked || false;
                                setSchoolDay({ ...schoolDay, breaks: newBreaks });
                            }}
                        />
                        <div className="flex-1">
                            <div className="font-semibold">{breakItem.description}</div>
                            <small className="text-500">
                                {breakItem.timeStart} - {breakItem.timeEnd}
                            </small>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderScheduleGrid = () => {
        const timeSlots = generateTimeSlots();
        const completion = calculateCompletionPercentage();

        return (
            <div>
                <div className="flex justify-content-between align-items-center mb-3">
                    <div>
                        <h3 className="m-0">Build Your Schedule</h3>
                        <p className="text-600 mt-1">Click any empty slot to add a teaching period</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <Tag value={`${completion}% Complete`} severity={completion < 50 ? 'danger' : completion < 80 ? 'warning' : 'success'} />
                        <Button label="Download Template" icon="pi pi-download" className="p-button-outlined p-button-success" onClick={downloadTemplate} disabled={!setupData.class} tooltip="Download CSV template to fill offline" />
                        <Button
                            label="Upload CSV"
                            icon="pi pi-upload"
                            className="p-button-outlined p-button-info"
                            onClick={() => setUploadDialogVisible(true)}
                            disabled={subjects.length === 0 || teachers.length === 0}
                            tooltip="Import periods from CSV file"
                        />
                        <Button label="Save Draft" icon="pi pi-save" className="p-button-outlined" onClick={handleSaveDraft} />
                    </div>
                </div>

                <ProgressBar value={completion} className="mb-3 h-1rem" />

                <div className="overflow-auto">
                    <table className="w-full border-collapse" style={{ minWidth: '1200px' }}>
                        <thead>
                            <tr className="bg-primary">
                                <th className="p-2 text-white border-1 border-300" style={{ width: '100px' }}>
                                    Time
                                </th>
                                {WEEKDAYS.slice(0, 6).map((day) => (
                                    <th key={day} className="p-2 text-white border-1 border-300">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timeSlots.map((slot, slotIndex) => {
                                const breakActivity = getBreakForSlot(slot);

                                if (breakActivity) {
                                    return (
                                        <tr key={`break-${slotIndex}`}>
                                            <td className="p-2 border-1 border-300 font-semibold text-center bg-yellow-50">
                                                {breakActivity.timeStart}
                                                <br />
                                                {breakActivity.timeEnd}
                                            </td>
                                            <td colSpan={6} className="p-3 border-1 border-300 text-center bg-yellow-100">
                                                <div className="font-bold text-lg">
                                                    {breakActivity.activityType === 'lunch' && '🍽️ '}
                                                    {breakActivity.activityType === 'break' && '☕ '}
                                                    {breakActivity.activityType === 'assembly' && '🏛️ '}
                                                    {breakActivity.description.toUpperCase()}
                                                </div>
                                                <small className="text-600">{parseFloat(breakActivity.timeEnd) - parseFloat(breakActivity.timeStart)} minutes</small>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={`slot-${slotIndex}`}>
                                        <td className="p-2 border-1 border-300 font-semibold text-center">{slot}</td>
                                        {WEEKDAYS.slice(0, 6).map((day) => {
                                            const period = getPeriodForSlot(day, slot);

                                            return (
                                                <td key={`${day}-${slot}`} className="p-2 border-1 border-300">
                                                    {period ? (
                                                        <div className="p-2 border-round cursor-pointer hover:surface-100" onClick={() => handleEditPeriod(period)}>
                                                            <div className="flex align-items-center gap-2 mb-1">
                                                                <span className="text-2xl">{getSubjectEmoji(period.subject?.name)}</span>
                                                                <span className="font-semibold">{period.subject?.name}</span>
                                                            </div>
                                                            {period.teacher && (
                                                                <div className="text-sm text-600">
                                                                    {period.teacher.firstName} {period.teacher.lastName}
                                                                </div>
                                                            )}
                                                            {period.room && <div className="text-sm text-500">Room {period.room}</div>}
                                                            <div className="flex gap-1 mt-2">
                                                                <Button
                                                                    icon="pi pi-pencil"
                                                                    className="p-button-text p-button-sm p-button-secondary"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditPeriod(period);
                                                                    }}
                                                                />
                                                                <Button
                                                                    icon="pi pi-trash"
                                                                    className="p-button-text p-button-sm p-button-danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeletePeriod(period._id!);
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-3">
                                                            <Button label="+ Add" className="p-button-text p-button-sm" onClick={() => handleAddPeriod(day, slot)} />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReviewPhase = () => {
        const completion = calculateCompletionPercentage();
        const conflicts = schedule.flatMap((s) => checkConflicts(s));
        const hasConflicts = conflicts.length > 0;
        const isComplete = completion === 100;

        return (
            <div className="grid">
                <div className="col-12">
                    <h3>Review Timetable Before Activation</h3>
                </div>

                <div className="col-12">
                    <Card title="✓ Checklist">
                        <div className="flex flex-column gap-2">
                            <div className="flex align-items-center gap-2">
                                {isComplete ? <i className="pi pi-check-circle text-green-500"></i> : <i className="pi pi-times-circle text-orange-500"></i>}
                                <span>
                                    All periods filled ({schedule.length}/{WEEKDAYS.slice(0, 6).length * schoolDay.numberOfPeriods})
                                </span>
                            </div>
                            <div className="flex align-items-center gap-2">
                                {!hasConflicts ? <i className="pi pi-check-circle text-green-500"></i> : <i className="pi pi-times-circle text-red-500"></i>}
                                <span>No scheduling conflicts</span>
                            </div>
                            <div className="flex align-items-center gap-2">
                                {recessActivities.some((r) => r.activityType === 'lunch') ? <i className="pi pi-check-circle text-green-500"></i> : <i className="pi pi-exclamation-triangle text-orange-500"></i>}
                                <span>Lunch break included</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {hasConflicts && (
                    <div className="col-12">
                        <Message severity="error" text={`${conflicts.length} conflicts found. Please resolve them before activating.`} />
                    </div>
                )}

                <div className="col-12">
                    <Card title="📊 Timetable Summary">
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <p>
                                    <strong>Class:</strong> {setupData.class?.className}
                                </p>
                                <p>
                                    <strong>Site:</strong> {setupData.site?.siteName}
                                </p>
                                <p>
                                    <strong>Term:</strong> Term {setupData.academicTerm}, {setupData.academicYear}
                                </p>
                            </div>
                            <div className="col-12 md:col-6">
                                <p>
                                    <strong>Effective:</strong> {new Date(setupData.effectiveFrom).toLocaleDateString()}
                                    {setupData.effectiveTo && ` - ${new Date(setupData.effectiveTo).toLocaleDateString()}`}
                                </p>
                                <p>
                                    <strong>Total Periods:</strong> {schedule.length}
                                </p>
                                <p>
                                    <strong>Completion:</strong> {completion}%
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="col-12">
                    <Message severity="warn" text="Once activated, this timetable will replace any existing timetable and become visible to students and teachers. To make changes after activation, create a new version." />
                </div>

                <div className="col-12">
                    <div className="flex align-items-center gap-2">
                        <Checkbox inputId="confirm" checked={false} onChange={(e) => {}} />
                        <label htmlFor="confirm">I confirm this timetable is accurate and ready</label>
                    </div>
                </div>
            </div>
        );
    };

    const renderPeriodDialog = () => (
        <Dialog header={editingPeriod?._id ? 'Edit Teaching Period' : 'Add Teaching Period'} visible={showPeriodDialog} style={{ width: '600px' }} onHide={() => setShowPeriodDialog(false)}>
            {editingPeriod && (
                <div className="grid">
                    <div className="col-12">
                        <p className="text-600">
                            {editingPeriod.weekDay}, {editingPeriod.timeStart} - {editingPeriod.timeEnd}
                        </p>
                    </div>

                    <div className="col-12">
                        <label htmlFor="subject" className="block mb-2">
                            Subject *
                        </label>
                        <Dropdown
                            id="subject"
                            value={editingPeriod.subject}
                            options={subjects}
                            onChange={(e) => setEditingPeriod({ ...editingPeriod, subject: e.value })}
                            optionLabel="name"
                            placeholder="Search or select..."
                            className="w-full"
                            filter
                        />
                    </div>

                    <div className="col-12">
                        <label htmlFor="teacher" className="block mb-2">
                            Teacher *
                        </label>
                        <Dropdown
                            id="teacher"
                            value={editingPeriod.teacher}
                            options={teachers}
                            onChange={(e) => setEditingPeriod({ ...editingPeriod, teacher: e.value })}
                            optionLabel={'firstName'}
                            placeholder="Select teacher"
                            className="w-full"
                            filter
                        />
                        {editingPeriod.teacher && <small className="text-green-600">✓ Available this time slot</small>}
                    </div>

                    <div className="col-12">
                        <label htmlFor="room" className="block mb-2">
                            Room/Location
                        </label>
                        <InputText id="room" value={editingPeriod.room || ''} onChange={(e) => setEditingPeriod({ ...editingPeriod, room: e.target.value })} placeholder="e.g., Room 101, Lab 3" className="w-full" />
                    </div>

                    <div className="col-12">
                        <div className="flex align-items-center gap-2">
                            <Checkbox inputId="recurring" checked={editingPeriod.isRecurring} onChange={(e) => setEditingPeriod({ ...editingPeriod, isRecurring: e.checked || false })} />
                            <label htmlFor="recurring">Repeat this period every {editingPeriod.weekDay}</label>
                        </div>
                        {editingPeriod.isRecurring && <small className="text-500 ml-4">(Will apply to all {editingPeriod.weekDay}s in term)</small>}
                    </div>

                    <div className="col-12">
                        <label htmlFor="notes" className="block mb-2">
                            Additional Notes (Optional)
                        </label>
                        <InputTextarea id="notes" value={editingPeriod.notes || ''} onChange={(e) => setEditingPeriod({ ...editingPeriod, notes: e.target.value })} rows={2} className="w-full" placeholder="e.g., Remember to bring calculators" />
                    </div>

                    <div className="col-12 flex justify-content-end gap-2">
                        <Button label="Cancel" className="p-button-text" onClick={() => setShowPeriodDialog(false)} />
                        <Button label={editingPeriod._id ? 'Update' : 'Add to Timetable'} onClick={handleSavePeriod} />
                    </div>
                </div>
            )}
        </Dialog>
    );

    const renderListView = () => (
        <div>
            <div className="flex justify-content-between align-items-center mb-4">
                <h2>Timetable Management</h2>
                <Button
                    label="Create New Timetable"
                    icon="pi pi-plus"
                    onClick={() => {
                        setViewMode('create');
                        setActiveStep(0);
                        setSchedule([]);
                        setRecessActivities([]);
                    }}
                />
            </div>

            <DataTable value={timetables} loading={loading} paginator rows={10} emptyMessage="No timetables found. Create your first timetable to get started.">
                <Column field="class.className" header="Class" sortable />
                <Column field="site.siteName" header="Site" sortable />
                <Column field="academicYear" header="Academic Period" sortable body={(row) => `${row.academicYear} - Term ${row.academicTerm}`} />
                <Column field="isActive" header="Status" body={(row) => <Tag value={row.isActive ? 'Active' : 'Draft'} severity={row.isActive ? 'success' : 'warning'} />} />
                <Column field="version" header="Version" sortable />
                <Column field="effectiveFrom" header="Effective From" body={(row) => new Date(row.effectiveFrom).toLocaleDateString()} sortable />
                <Column
                    header="Actions"
                    body={(row) => (
                        <div className="flex gap-2">
                            <Button
                                icon="pi pi-eye"
                                className="p-button-text"
                                onClick={() => {
                                    setSelectedTimetable(row);
                                    setViewMode('view');
                                }}
                            />
                            <Button
                                icon="pi pi-pencil"
                                className="p-button-text"
                                onClick={() => {
                                    setSelectedTimetable(row);
                                    setViewMode('edit');
                                }}
                            />
                            <Button
                                icon="pi pi-trash"
                                className="p-button-text p-button-danger"
                                onClick={() => handleDelete(row._id, row.isActive)}
                                tooltip={row.isActive ? 'Cannot delete active timetable' : 'Delete timetable'}
                                tooltipOptions={{ position: 'left' }}
                            />
                        </div>
                    )}
                />
            </DataTable>
        </div>
    );

    if (viewMode === 'list') {
        return (
            <>
                <Toast ref={toast} />
                <ConfirmDialog />
                {renderListView()}
            </>
        );
    }

    return (
        <>
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card">
                <div className="flex justify-content-between align-items-center mb-4">
                    <h2>{viewMode === 'edit' ? 'Edit Timetable' : 'Create New Timetable'}</h2>
                    <Button
                        label="Close"
                        icon="pi pi-times"
                        className="p-button-text"
                        onClick={() => {
                            setViewMode('list');
                            setSelectedTimetable(null);
                            setActiveStep(0);
                        }}
                    />
                </div>

                <Steps model={steps} activeIndex={activeStep} className="mb-4" />

                <Card>
                    {activeStep === 0 && renderSetupPhase()}
                    {activeStep === 1 && renderSchoolDayPhase()}
                    {activeStep === 2 && renderScheduleGrid()}
                    {activeStep === 3 && renderReviewPhase()}

                    <Divider />

                    <div className="flex justify-content-between">
                        <Button label="Back" icon="pi pi-arrow-left" className="p-button-text" onClick={handleBack} disabled={activeStep === 0} />
                        <div className="flex gap-2">
                            {activeStep === 2 && <Button label="Save Draft" icon="pi pi-save" className="p-button-outlined" onClick={handleSaveDraft} />}
                            {activeStep < steps.length - 1 ? (
                                <Button label="Next" icon="pi pi-arrow-right" iconPos="right" onClick={handleNext} />
                            ) : (
                                <Button label="Activate Timetable" icon="pi pi-check" onClick={handleActivate} disabled={checkConflicts.length > 0} />
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {renderPeriodDialog()}

            <Dialog header="Upload Timetable from CSV" visible={uploadDialogVisible} style={{ width: '600px' }} onHide={() => setUploadDialogVisible(false)}>
                <div className="grid">
                    <div className="col-12">
                        <Message severity="info" text="Upload a CSV file with your timetable data. Make sure subjects and teachers exist in the system first." />
                    </div>
                    <div className="col-12">
                        <h4>Instructions:</h4>
                        <ol className="text-600">
                            <li>{`Download the template using the 'Download Template' button`}</li>
                            <li>Fill in the CSV with your timetable data</li>
                            <li>Ensure subject names match exactly with existing subjects</li>
                            <li>Teacher names must match first and last names in the system</li>
                            <li>Upload the completed CSV file below</li>
                        </ol>
                    </div>
                    <div className="col-12">
                        <FileUpload mode="basic" name="timetable" accept=".csv" maxFileSize={1000000} onSelect={handleFileUpload} auto chooseLabel="Select CSV File" />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
