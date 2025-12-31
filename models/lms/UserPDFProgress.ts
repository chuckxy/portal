import mongoose, { Schema, Document, Model } from 'mongoose';
import { IPDFRead } from './types';

/**
 * User PDF Progress Schema
 * Tracks which PDFs a user has read in a lesson
 *
 * Integration Note: Maps to LMS UserLessonPDFProgress
 * References:
 *   - Person (unified from User)
 *   - Lesson
 */

export interface IUserPDFProgress extends Document {
    personId: mongoose.Types.ObjectId;
    lessonId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    readPDFs: IPDFRead[];
    totalReadTime: number; // seconds
    lastReadAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserPDFProgressSchema = new Schema<IUserPDFProgress>(
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
        readPDFs: [
            {
                materialId: {
                    type: Schema.Types.ObjectId,
                    ref: 'CourseMaterial',
                    required: false // Optional - primary lesson content may not have a material ID
                },
                contentUrl: {
                    type: String // Store URL when materialId is not available
                },
                pagesRead: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                totalPages: {
                    type: Number,
                    required: true,
                    min: 1
                },
                completedAt: {
                    type: Date
                },
                readPercentage: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 100
                }
            }
        ],
        totalReadTime: {
            type: Number,
            default: 0,
            min: 0
        },
        lastReadAt: {
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
UserPDFProgressSchema.index({ personId: 1, lessonId: 1 }, { unique: true });
// Note: schoolSiteId index is defined inline with index: true

// Virtual for completed PDFs count
UserPDFProgressSchema.virtual('completedPDFsCount').get(function () {
    return this.readPDFs.filter((p) => p.readPercentage >= 90).length;
});

// Virtual for overall read percentage
UserPDFProgressSchema.virtual('overallReadPercentage').get(function () {
    if (this.readPDFs.length === 0) return 0;
    const total = this.readPDFs.reduce((sum, p) => sum + p.readPercentage, 0);
    return Math.round(total / this.readPDFs.length);
});

// Backward compatibility virtuals (LMS aliases)
UserPDFProgressSchema.virtual('userId').get(function () {
    return this.personId;
});

UserPDFProgressSchema.virtual('moduleChapterLessonId').get(function () {
    return this.lessonId;
});

// LMS used readPDFBooks
UserPDFProgressSchema.virtual('readPDFBooks').get(function () {
    return this.readPDFs;
});

// Force model recreation in development to pick up schema changes
if (process.env.NODE_ENV !== 'production' && mongoose.models.UserPDFProgress) {
    delete mongoose.models.UserPDFProgress;
}

const UserPDFProgress: Model<IUserPDFProgress> = mongoose.models.UserPDFProgress || mongoose.model<IUserPDFProgress>('UserPDFProgress', UserPDFProgressSchema);

export default UserPDFProgress;
