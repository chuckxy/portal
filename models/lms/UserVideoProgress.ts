import mongoose, { Schema, Document, Model } from 'mongoose';
import { IVideoWatch } from './types';

/**
 * User Video Progress Schema
 * Tracks which videos a user has watched in a lesson
 *
 * Integration Note: Maps to LMS UserLessonVideoProgress
 * References:
 *   - Person (unified from User)
 *   - Lesson
 */

export interface IUserVideoProgress extends Document {
    personId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    watchedVideos: IVideoWatch[];
    totalWatchTime: number; // seconds
    lastWatchedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserVideoProgressSchema = new Schema<IUserVideoProgress>(
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
        // UNIFIED: References SchoolSite
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        watchedVideos: [
            {
                materialId: {
                    type: Schema.Types.ObjectId,
                    ref: 'CourseMaterial',
                    required: false // Optional - primary lesson content may not have a material ID
                },
                contentUrl: {
                    type: String // Store URL when materialId is not available
                },
                watchedDuration: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                totalDuration: {
                    type: Number,
                    required: true,
                    min: 0
                },
                completedAt: {
                    type: Date
                },
                watchPercentage: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                }
            }
        ],
        totalWatchTime: {
            type: Number,
            default: 0,
            min: 0
        },
        lastWatchedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Compound primary key (unique per user per lesson)
UserVideoProgressSchema.index({ personId: 1, lessonId: 1 }, { unique: true });
// Note: schoolSiteId index is defined inline with index: true

// Virtual for completed videos count
UserVideoProgressSchema.virtual('completedVideosCount').get(function () {
    return this.watchedVideos.filter((v) => v.watchPercentage >= 90).length;
});

// Virtual for overall watch percentage
UserVideoProgressSchema.virtual('overallWatchPercentage').get(function () {
    if (this.watchedVideos.length === 0) return 0;
    const total = this.watchedVideos.reduce((sum, v) => sum + v.watchPercentage, 0);
    return Math.round(total / this.watchedVideos.length);
});

// Backward compatibility virtuals (LMS aliases)
UserVideoProgressSchema.virtual('userId').get(function () {
    return this.personId;
});

UserVideoProgressSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

// Force model recreation in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.UserVideoProgress) {
    delete mongoose.models.UserVideoProgress;
}

const UserVideoProgress: Model<IUserVideoProgress> = mongoose.models.UserVideoProgress || mongoose.model<IUserVideoProgress>('UserVideoProgress', UserVideoProgressSchema);

export default UserVideoProgress;
