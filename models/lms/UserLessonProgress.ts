import mongoose, { Schema, Document, Model } from 'mongoose';
import { ProgressStatus } from './types';

/**
 * User Lesson Progress Schema
 * Tracks individual lesson progress for users
 *
 * Integration Note: Maps to LMS UserModuleLesson
 * References:
 *   - Person (unified from User)
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - Chapter
 *   - Lesson
 */

export interface IUserLessonProgress extends Document {
    personId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    subjectId: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    chapterId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    dateStarted: Date;
    dateCompleted?: Date;
    status: ProgressStatus;
    timeSpent: number; // seconds
    lastAccessedAt: Date;
    completionPercentage: number;
    bookmarkPosition?: number; // For videos - seconds, for PDFs - page number
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserLessonProgressSchema = new Schema<IUserLessonProgress>(
    {
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Lesson',
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
        chapterId: {
            type: Schema.Types.ObjectId,
            ref: 'Chapter',
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
        dateStarted: {
            type: Date,
            default: Date.now
        },
        dateCompleted: {
            type: Date
        },
        status: {
            type: String,
            enum: ['not_started', 'in_progress', 'completed'],
            default: 'not_started',
            index: true
        },
        timeSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        lastAccessedAt: {
            type: Date,
            default: Date.now
        },
        completionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        bookmarkPosition: {
            type: Number,
            min: 0
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
UserLessonProgressSchema.index({ personId: 1, lessonId: 1 }, { unique: true });
UserLessonProgressSchema.index({ personId: 1, subjectId: 1, status: 1 });
UserLessonProgressSchema.index({ personId: 1, chapterId: 1 });
UserLessonProgressSchema.index({ lessonId: 1, status: 1 });

// Backward compatibility virtuals (LMS aliases)
UserLessonProgressSchema.virtual('userId').get(function () {
    return this.personId;
});

UserLessonProgressSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

UserLessonProgressSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

// LMS used different status names
UserLessonProgressSchema.virtual('legacyStatus').get(function () {
    const statusMap: Record<string, string> = {
        not_started: 'NotStarted',
        in_progress: 'Progress',
        completed: 'Completed'
    };
    return statusMap[this.status] || this.status;
});

const UserLessonProgress: Model<IUserLessonProgress> = mongoose.models.UserLessonProgress || mongoose.model<IUserLessonProgress>('UserLessonProgress', UserLessonProgressSchema);

export default UserLessonProgress;
