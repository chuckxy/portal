import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Course Review Schema
 * Student reviews and ratings for courses (Subjects with LMS enabled)
 *
 * Integration Note: Maps to LMS CourseReview
 * References:
 *   - Subject (unified from Course)
 *   - Person (unified from User)
 *   - SchoolSite (unified from Institution)
 */

export interface ICourseReview extends Document {
    subjectId: mongoose.Types.ObjectId;
    personId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    rating: number;
    reviewTitle?: string;
    reviewText?: string;
    reviewDate: Date;
    pros?: string[];
    cons?: string[];
    wouldRecommend: boolean;
    helpfulCount: number;
    helpfulVoters: mongoose.Types.ObjectId[];
    isVerifiedEnrollment: boolean;
    enrollmentId?: mongoose.Types.ObjectId;
    isEdited: boolean;
    editedAt?: Date;
    isApproved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    isFlagged: boolean;
    flagReason?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseReviewSchema = new Schema<ICourseReview>(
    {
        // UNIFIED: References Subject (replaces courseId)
        subjectId: {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
            required: true,
            index: true
        },
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
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
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            index: true
        },
        reviewTitle: {
            type: String,
            maxlength: 255,
            trim: true
        },
        reviewText: {
            type: String,
            trim: true
        },
        reviewDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        pros: [
            {
                type: String,
                trim: true
            }
        ],
        cons: [
            {
                type: String,
                trim: true
            }
        ],
        wouldRecommend: {
            type: Boolean,
            default: true
        },
        helpfulCount: {
            type: Number,
            default: 0,
            min: 0
        },
        helpfulVoters: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            }
        ],
        isVerifiedEnrollment: {
            type: Boolean,
            default: false
        },
        enrollmentId: {
            type: Schema.Types.ObjectId,
            ref: 'LMSEnrollment'
        },
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: {
            type: Date
        },
        isApproved: {
            type: Boolean,
            default: true, // Auto-approve by default
            index: true
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        approvedAt: {
            type: Date
        },
        isFlagged: {
            type: Boolean,
            default: false,
            index: true
        },
        flagReason: {
            type: String,
            trim: true
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

// Compound index for unique user course reviews
CourseReviewSchema.index({ subjectId: 1, personId: 1 }, { unique: true });
CourseReviewSchema.index({ subjectId: 1, rating: -1, reviewDate: -1 });
CourseReviewSchema.index({ subjectId: 1, isApproved: 1, isActive: 1, helpfulCount: -1 });
CourseReviewSchema.index({ schoolSiteId: 1, isFlagged: 1 });

// Static method to calculate average rating for a course
CourseReviewSchema.statics.getAverageRating = async function (subjectId: mongoose.Types.ObjectId) {
    const result = await this.aggregate([
        { $match: { subjectId, isActive: true, isApproved: true } },
        {
            $group: {
                _id: '$subjectId',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
                recommendPercentage: {
                    $avg: { $cond: ['$wouldRecommend', 1, 0] }
                }
            }
        }
    ]);
    return result[0] || { averageRating: 0, totalReviews: 0, recommendPercentage: 0 };
};

// Backward compatibility virtuals (LMS aliases)
CourseReviewSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

CourseReviewSchema.virtual('userId').get(function () {
    return this.personId;
});

CourseReviewSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const CourseReview: Model<ICourseReview> = mongoose.models.CourseReview || mongoose.model<ICourseReview>('CourseReview', CourseReviewSchema);

export default CourseReview;
