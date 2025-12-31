import mongoose, { Schema, Document, Model } from 'mongoose';

export type ScheduleExamType = 'class_test' | 'mid_term' | 'end_of_term' | 'mock' | 'final';
export type ExaminationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';

// Interface for Examination subdocument
export interface IExamination {
    class: mongoose.Types.ObjectId;
    subject: mongoose.Types.ObjectId;
    examDate: Date;
    timeStart: string;
    timeEnd: string;
    duration?: number;
    venue?: string;
    totalMarks: number;
    instructions?: string;
    invigilators: mongoose.Types.ObjectId[];
    status: ExaminationStatus;
}

// Interface for ScheduleModification subdocument
export interface IScheduleModification {
    modifiedBy?: mongoose.Types.ObjectId;
    modifiedAt: Date;
    changes?: any;
}

// Interface for ExamSchedule document
export interface IExamSchedule extends Document {
    school: mongoose.Types.ObjectId;
    site: mongoose.Types.ObjectId;
    academicYear: string;
    academicTerm: number;
    examType: ScheduleExamType;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    examinations: IExamination[];
    generalInstructions?: string;
    isPublished: boolean;
    publishedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    modificationHistory: IScheduleModification[];
    totalExams: number;
    completedExams: number;
    createdAt: Date;
    updatedAt: Date;
    getExamsForClass(classId: mongoose.Types.ObjectId): IExamination[];
    getExamsForDate(date: Date): IExamination[];
    checkConflicts(exam: IExamination): IExamination[];
}

const ExamScheduleSchema = new Schema<IExamSchedule>(
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

        examType: {
            type: String,
            enum: ['class_test', 'mid_term', 'end_of_term', 'mock', 'final'],
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        startDate: {
            type: Date,
            required: true,
            index: true
        },

        endDate: {
            type: Date,
            required: true,
            index: true
        },

        examinations: [
            {
                class: {
                    type: Schema.Types.ObjectId,
                    ref: 'SiteClass',
                    required: true
                },
                subject: {
                    type: Schema.Types.ObjectId,
                    ref: 'Subject',
                    required: true
                },
                examDate: {
                    type: Date,
                    required: true
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
                duration: {
                    type: Number, // in minutes
                    min: 0
                },
                venue: {
                    type: String,
                    trim: true
                },
                totalMarks: {
                    type: Number,
                    default: 100,
                    min: 0
                },
                instructions: {
                    type: String,
                    trim: true
                },
                invigilators: [
                    {
                        type: Schema.Types.ObjectId,
                        ref: 'Person'
                    }
                ],
                status: {
                    type: String,
                    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
                    default: 'scheduled'
                }
            }
        ],

        generalInstructions: {
            type: String,
            trim: true
        },

        isPublished: {
            type: Boolean,
            default: false,
            index: true
        },

        publishedAt: Date,

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },

        modificationHistory: [
            {
                modifiedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Person'
                },
                modifiedAt: {
                    type: Date,
                    default: Date.now
                },
                changes: Schema.Types.Mixed
            }
        ]
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
ExamScheduleSchema.index({ school: 1, site: 1, academicYear: 1, academicTerm: 1, examType: 1 });
ExamScheduleSchema.index({ startDate: 1, endDate: 1 });
ExamScheduleSchema.index({ 'examinations.class': 1 });
ExamScheduleSchema.index({ 'examinations.subject': 1 });
ExamScheduleSchema.index({ 'examinations.examDate': 1 });
// Note: isPublished index is defined inline with index: true

// Virtual for total exams
ExamScheduleSchema.virtual('totalExams').get(function (this: IExamSchedule) {
    return this.examinations ? this.examinations.length : 0;
});

// Virtual for completed exams
ExamScheduleSchema.virtual('completedExams').get(function (this: IExamSchedule) {
    return this.examinations ? this.examinations.filter((exam) => exam.status === 'completed').length : 0;
});

// Method to get exams for a specific class
ExamScheduleSchema.methods.getExamsForClass = function (this: IExamSchedule, classId: mongoose.Types.ObjectId): IExamination[] {
    return this.examinations.filter((exam) => exam.class.toString() === classId.toString()).sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
};

// Method to get exams for a specific date
ExamScheduleSchema.methods.getExamsForDate = function (this: IExamSchedule, date: Date): IExamination[] {
    const targetDate = new Date(date).toDateString();
    return this.examinations
        .filter((exam) => new Date(exam.examDate).toDateString() === targetDate)
        .sort((a, b) => {
            const timeA = a.timeStart.split(':').map(Number);
            const timeB = b.timeStart.split(':').map(Number);
            return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
        });
};

// Method to check for conflicts
ExamScheduleSchema.methods.checkConflicts = function (this: IExamSchedule, exam: IExamination): IExamination[] {
    return this.examinations.filter((existing) => {
        if ((existing as any)._id && (exam as any)._id && (existing as any)._id.toString() === (exam as any)._id.toString()) {
            return false;
        }

        const sameDate = new Date(existing.examDate).toDateString() === new Date(exam.examDate).toDateString();
        const sameVenue = existing.venue === exam.venue;

        if (sameDate && sameVenue) {
            const existingStart = existing.timeStart.split(':').map(Number);
            const existingEnd = existing.timeEnd.split(':').map(Number);
            const examStart = exam.timeStart.split(':').map(Number);
            const examEnd = exam.timeEnd.split(':').map(Number);

            const existingStartMinutes = existingStart[0] * 60 + existingStart[1];
            const existingEndMinutes = existingEnd[0] * 60 + existingEnd[1];
            const examStartMinutes = examStart[0] * 60 + examStart[1];
            const examEndMinutes = examEnd[0] * 60 + examEnd[1];

            return examStartMinutes < existingEndMinutes && examEndMinutes > existingStartMinutes;
        }

        return false;
    });
};

const ExamSchedule: Model<IExamSchedule> = mongoose.models.ExamSchedule || mongoose.model<IExamSchedule>('ExamSchedule', ExamScheduleSchema);

export default ExamSchedule;
