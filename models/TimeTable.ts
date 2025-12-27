import mongoose, { Schema, Document, Model } from 'mongoose';

export type WeekDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type ActivityType = 'break' | 'lunch' | 'assembly' | 'other';

// Interface for ScheduleEntry subdocument
export interface IScheduleEntry {
    weekDay: WeekDay;
    subject: mongoose.Types.ObjectId;
    teacher?: mongoose.Types.ObjectId;
    timeStart: string;
    timeEnd: string;
    room?: string;
    periodNumber?: number;
    isRecurring: boolean;
}

// Interface for RecessActivity subdocument
export interface IRecessActivity {
    description: string;
    weekDay?: WeekDay;
    timeStart: string;
    timeEnd: string;
    activityType: ActivityType;
}

// Interface for TimeTable document
export interface ITimeTable {
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    department?: mongoose.Types.ObjectId;
    class: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    effectiveFrom: Date;
    effectiveTo?: Date;
    schedule: IScheduleEntry[];
    recessActivities: IRecessActivity[];
    version: number;
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    getScheduleForDay(weekDay: WeekDay): IScheduleEntry[];
    getUniqueSubjects(): string[];
}

// @ts-ignore
const TimeTableSchema = new Schema<ITimeTable>(
    {
        school: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        site: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: 'Department',
            index: true
        },
        class: {
            type: Schema.Types.ObjectId,
            ref: 'SiteClass',
            required: true,
            index: true
        },

        academicYear: {
            type: String,
            required: true,
            index: true
        },

        academicTerm: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
            index: true
        },

        effectiveFrom: {
            type: Date,
            default: Date.now
        },

        effectiveTo: Date,

        schedule: [
            {
                weekDay: {
                    type: String,
                    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                    required: true
                },
                subject: {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject',
                    required: true
                },
                teacher: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                timeStart: {
                    type: String,
                    required: true,
                    trim: true
                },
                timeEnd: {
                    type: String,
                    required: true,
                    trim: true
                },
                room: {
                    type: String,
                    trim: true
                },
                periodNumber: {
                    type: Number,
                    min: 1
                },
                isRecurring: {
                    type: Boolean,
                    default: true
                }
            }
        ],

        recessActivities: [
            {
                description: {
                    type: String,
                    required: true,
                    trim: true
                },
                weekDay: {
                    type: String,
                    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                },
                timeStart: {
                    type: String,
                    required: true,
                    trim: true
                },
                timeEnd: {
                    type: String,
                    required: true,
                    trim: true
                },
                activityType: {
                    type: String,
                    enum: ['break', 'lunch', 'assembly', 'other'],
                    default: 'break'
                }
            }
        ],

        version: {
            type: Number,
            default: 1
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
TimeTableSchema.index({ school: 1, site: 1, class: 1, academicYear: 1, academicTerm: 1 });
TimeTableSchema.index({ 'schedule.teacher': 1 });
TimeTableSchema.index({ 'schedule.subject': 1 });

// Ensure unique timetable per class per term
TimeTableSchema.index({ class: 1, academicYear: 1, academicTerm: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Method to get schedule for a specific day
TimeTableSchema.methods.getScheduleForDay = function (this: ITimeTable, weekDay: WeekDay): IScheduleEntry[] {
    return this.schedule
        .filter((entry) => entry.weekDay === weekDay)
        .sort((a, b) => {
            const timeA = a.timeStart.split(':').map(Number);
            const timeB = b.timeStart.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
};

// Method to get all subjects in the timetable
TimeTableSchema.methods.getUniqueSubjects = function (this: ITimeTable): string[] {
    const subjectIds = [...new Set(this.schedule.map((entry) => entry.subject.toString()))];
    return subjectIds;
};

const TimeTable: Model<ITimeTable> = mongoose.models.TimeTable || mongoose.model<ITimeTable>('TimeTable', TimeTableSchema);

export default TimeTable;
