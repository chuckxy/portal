import mongoose, { Schema, Document, Model } from 'mongoose';
import { IPageActivity } from './types';

/**
 * User Page Time Schema
 * Tracks user activity and time spent on different pages
 *
 * Integration Note: Maps to LMS UserPageTime
 * References:
 *   - Person (unified from User)
 *   - SchoolSite
 */

export interface IUserPageTime extends Document {
    personId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    visitDate: Date;
    pageActivity: IPageActivity[];
    totalTimeSpent: number; // seconds
    sessionCount: number;
    deviceType?: string;
    browserInfo?: string;
    ipAddress?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserPageTimeSchema = new Schema<IUserPageTime>(
    {
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
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
        visitDate: {
            type: Date,
            required: true,
            index: true
        },
        pageActivity: [
            {
                pagePath: {
                    type: String,
                    required: true,
                    trim: true
                },
                pageTitle: {
                    type: String,
                    trim: true
                },
                timeSpent: {
                    type: Number,
                    default: 0,
                    min: 0
                },
                visits: {
                    type: Number,
                    default: 1,
                    min: 1
                },
                lastVisit: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        totalTimeSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        sessionCount: {
            type: Number,
            default: 1,
            min: 1
        },
        deviceType: {
            type: String,
            trim: true
        },
        browserInfo: {
            type: String,
            trim: true
        },
        ipAddress: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Indexes
UserPageTimeSchema.index({ personId: 1, visitDate: -1 });
UserPageTimeSchema.index({ schoolSiteId: 1, visitDate: -1 });
UserPageTimeSchema.index({ personId: 1, schoolSiteId: 1, visitDate: -1 });

// Virtual for unique pages visited
UserPageTimeSchema.virtual('uniquePagesVisited').get(function () {
    return this.pageActivity?.length || 0;
});

// Virtual for total page visits
UserPageTimeSchema.virtual('totalPageVisits').get(function () {
    if (!this.pageActivity || this.pageActivity.length === 0) return 0;
    return this.pageActivity.reduce((sum, page) => sum + page.visits, 0);
});

// Virtual for average time per page
UserPageTimeSchema.virtual('averageTimePerPage').get(function () {
    if (!this.pageActivity || this.pageActivity.length === 0) return 0;
    return Math.round(this.totalTimeSpent / this.pageActivity.length);
});

// Virtual for formatted total time
UserPageTimeSchema.virtual('formattedTotalTime').get(function () {
    const hours = Math.floor(this.totalTimeSpent / 3600);
    const minutes = Math.floor((this.totalTimeSpent % 3600) / 60);
    const seconds = this.totalTimeSpent % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
});

// Static method to get aggregate analytics for a user
UserPageTimeSchema.statics.getUserAnalytics = async function (personId: mongoose.Types.ObjectId, startDate: Date, endDate: Date) {
    return this.aggregate([
        {
            $match: {
                personId,
                visitDate: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$personId',
                totalDays: { $sum: 1 },
                totalTimeSpent: { $sum: '$totalTimeSpent' },
                totalSessions: { $sum: '$sessionCount' },
                avgTimePerDay: { $avg: '$totalTimeSpent' }
            }
        }
    ]);
};

// Backward compatibility virtuals (LMS aliases)
UserPageTimeSchema.virtual('userId').get(function () {
    return this.personId;
});

const UserPageTime: Model<IUserPageTime> = mongoose.models.UserPageTime || mongoose.model<IUserPageTime>('UserPageTime', UserPageTimeSchema);

export default UserPageTime;
