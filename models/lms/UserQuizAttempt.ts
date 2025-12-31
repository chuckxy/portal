import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUserAnswer } from './types';

/**
 * User Quiz Attempt Schema
 * Tracks student quiz attempts and scores
 *
 * Integration Note: Maps to LMS UserQuizAttempt
 * References:
 *   - Person (unified from User)
 *   - Quiz
 *   - SchoolSite
 */

export interface IUserQuizAttempt extends Document {
    personId: mongoose.Types.ObjectId;
    quizId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    attemptNumber: number;
    userAnswers: IUserAnswer[];
    attemptDate: Date;
    submitDate?: Date;
    quizScore: number;
    maxScore: number;
    percentageScore: number;
    isPassed: boolean;
    timeSpent: number; // seconds
    status: 'in_progress' | 'submitted' | 'graded' | 'abandoned';
    feedbackViewed: boolean;
    feedbackViewedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserQuizAttemptSchema = new Schema<IUserQuizAttempt>(
    {
        // UNIFIED: References Person (replaces userId)
        personId: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        quizId: {
            type: Schema.Types.ObjectId,
            ref: 'Quiz',
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
        attemptNumber: {
            type: Number,
            required: true,
            min: 1
        },
        userAnswers: [
            {
                questionId: {
                    type: Schema.Types.ObjectId,
                    ref: 'QuizQuestion',
                    required: true
                },
                selectedOptions: [
                    {
                        type: String
                    }
                ],
                textAnswer: {
                    type: String,
                    trim: true
                },
                matchingAnswers: {
                    type: Schema.Types.Mixed
                },
                isCorrect: {
                    type: Boolean
                },
                pointsEarned: {
                    type: Number,
                    default: 0,
                    min: 0
                }
            }
        ],
        attemptDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        submitDate: {
            type: Date
        },
        quizScore: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },
        maxScore: {
            type: Number,
            required: true,
            min: 0
        },
        percentageScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        isPassed: {
            type: Boolean,
            default: false
        },
        timeSpent: {
            type: Number,
            default: 0,
            min: 0
        },
        status: {
            type: String,
            enum: ['in_progress', 'submitted', 'graded', 'abandoned'],
            default: 'in_progress',
            index: true
        },
        feedbackViewed: {
            type: Boolean,
            default: false
        },
        feedbackViewedAt: {
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
UserQuizAttemptSchema.index({ personId: 1, quizId: 1, attemptNumber: 1 });
UserQuizAttemptSchema.index({ quizId: 1, quizScore: -1 }); // For leaderboards
UserQuizAttemptSchema.index({ quizId: 1, status: 1 });
UserQuizAttemptSchema.index({ schoolSiteId: 1, attemptDate: -1 });

// Virtual for correct answers count
UserQuizAttemptSchema.virtual('correctAnswersCount').get(function () {
    return this.userAnswers.filter((a) => a.isCorrect).length;
});

// Virtual for incorrect answers count
UserQuizAttemptSchema.virtual('incorrectAnswersCount').get(function () {
    return this.userAnswers.filter((a) => !a.isCorrect).length;
});

// Backward compatibility virtuals (LMS aliases)
UserQuizAttemptSchema.virtual('userId').get(function () {
    return this.personId;
});

// LMS used 'attempts' (number of attempts) differently
UserQuizAttemptSchema.virtual('attempts').get(function () {
    return this.attemptNumber;
});

const UserQuizAttempt: Model<IUserQuizAttempt> = mongoose.models.UserQuizAttempt || mongoose.model<IUserQuizAttempt>('UserQuizAttempt', UserQuizAttemptSchema);

export default UserQuizAttempt;
