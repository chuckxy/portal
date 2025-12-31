import mongoose, { Schema, Document, Model } from 'mongoose';
import { ProgressStatus, IChapterTracking, ILessonTracking } from './types';

/**
 * User Module Progress Schema
 * Tracks user progress through modules
 *
 * Integration Note: Maps to LMS UserModule
 * References:
 *   - Person (unified from User)
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - SchoolSite (unified from Institution)
 */

export interface IUserModuleProgress extends Document {
    personId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    enrollmentId: mongoose.Types.ObjectId;
    startDate: Date;
    completionDate?: Date;
    addedBy: mongoose.Types.ObjectId;
    status: ProgressStatus;
    progressPercentage: number;
    chaptersTracking: IChapterTracking[];
    lessonsTracking: ILessonTracking[];
    totalTimeSpent: number; // seconds
    lastAccessedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserModuleProgressSchema = new Schema<IUserModuleProgress>(
    {
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        moduleId: {
            type: Schema.Types.ObjectId,
            ref: 'CourseModule',
            required: true,
            index: true
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        enrollmentId: {
            type: Schema.Types.ObjectId,
            ref: 'LMSEnrollment',
            required: true,
            index: true
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        completionDate: {
            type: Date
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true
        },
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed'],
            default: 'not_started',
            index: true
        },
        progressPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        // Chapter-level tracking
        chaptersTracking: [
            {
                chapterId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Chapter',
                    required: true
                },
                status: {
                    type: String,
                    enum: ['not_started', 'in_progress', 'completed'],
                    default: 'not_started'
                },
                startedAt: Date,
                completedAt: Date,
                lessonsCompleted: {
                    type: Number,
                    default: 0
                },
                totalLessons: {
                    type: Number,
                    default: 0
                }
            }
        ],
        // Lesson-level tracking (denormalized for quick access)
        lessonsTracking: [
            {
                lessonId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Lesson',
                    required: true
                },
                status: {
                    type: String,
                    enum: ['not_started', 'in_progress', 'completed'],
                    default: 'not_started'
                },
                startedAt: Date,
                completedAt: Date,
                timeSpent: {
                    type: Number,
                    default: 0
                },
                lastAccessedAt: Date
            }
        ],
        totalTimeSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        lastAccessedAt: {
            type: Date
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
UserModuleProgressSchema.index({ personId: 1, moduleId: 1 }, { unique: true });
UserModuleProgressSchema.index({ personId: 1, subjectId: 1, status: 1 });
UserModuleProgressSchema.index({ moduleId: 1, status: 1 });
// Note: enrollmentId index is defined inline with index: true

// Virtual for completed chapters count
UserModuleProgressSchema.virtual('completedChaptersCount').get(function () {
    return this.chaptersTracking.filter((c) => c.status === 'completed').length;
});

// Virtual for completed lessons count
UserModuleProgressSchema.virtual('completedLessonsCount').get(function () {
    return this.lessonsTracking.filter((l) => l.status === 'completed').length;
});

// Backward compatibility virtuals (LMS aliases)
UserModuleProgressSchema.virtual('userId').get(function () {
    return this.personId;
});

UserModuleProgressSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

UserModuleProgressSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

// LMS used different status names
UserModuleProgressSchema.virtual('legacyStatus').get(function () {
    const statusMap: Record<string, string> = {
        not_started: 'Awaiting',
        in_progress: 'Progress',
        completed: 'Completed'
    };
    return statusMap[this.status] || this.status;
});

const UserModuleProgress: Model<IUserModuleProgress> = mongoose.models.UserModuleProgress || mongoose.model<IUserModuleProgress>('UserModuleProgress', UserModuleProgressSchema);

export default UserModuleProgress;
