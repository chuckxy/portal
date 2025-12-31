import mongoose, { Schema, Document, Model } from 'mongoose';
import { ISubmissionFile } from './types';

/**
 * LMS Submission Schema
 * Student assignment submissions with files and feedback
 *
 * Integration Note: Maps to LMS Submission
 * References:
 *   - LMSAssignment
 *   - Person (unified from User) for student and grader
 *   - SchoolSite (unified from Institution)
 */

export interface ILMSSubmission extends Document {
    assignmentId: mongoose.Types.ObjectId;
    personId: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    groupMembers?: mongoose.Types.ObjectId[]; // For group assignments
    submissionDate: Date;
    submissionFiles: ISubmissionFile[];
    submissionText?: string;
    submissionUrl?: string;
    score?: number;
    percentageScore?: number;
    isPassed?: boolean;
    feedback?: string;
    feedbackFiles?: ISubmissionFile[];
    rubricScores?: Record<string, number>;
    gradedBy?: mongoose.Types.ObjectId;
    gradedAt?: Date;
    status: 'draft' | 'submitted' | 'graded' | 'returned' | 'resubmitted';
    isLate: boolean;
    latePenalty?: number; // percentage deduction
    attemptNumber: number;
    previousSubmissionId?: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const LMSSubmissionSchema = new Schema<ILMSSubmission>(
    {
        assignmentId: {
            type: Schema.Types.ObjectId,
            ref: 'LMSAssignment',
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
        groupMembers: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Person'
            }
        ],
        submissionDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        submissionFiles: [
            {
                fileName: {
                    type: String,
                    required: true,
                    trim: true
                },
                filePath: {
                    type: String,
                    required: true,
                    trim: true
                },
                fileSize: {
                    type: Number,
                    min: 0
                },
                mimeType: {
                    type: String,
                    trim: true
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        submissionText: {
            type: String,
            trim: true
        },
        submissionUrl: {
            type: String,
            trim: true
        },
        score: {
            type: Number,
            min: 0
        },
        percentageScore: {
            type: Number,
            min: 0,
            max: 100
        },
        isPassed: {
            type: Boolean
        },
        feedback: {
            type: String,
            trim: true
        },
        feedbackFiles: [
            {
                fileName: {
                    type: String,
                    required: true,
                    trim: true
                },
                filePath: {
                    type: String,
                    required: true,
                    trim: true
                },
                fileSize: {
                    type: Number,
                    min: 0
                },
                mimeType: {
                    type: String,
                    trim: true
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        rubricScores: {
            type: Schema.Types.Mixed
        },
        gradedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person'
        },
        gradedAt: {
            type: Date
        },
        status: {
            type: String,
            enum: ['draft', 'submitted', 'graded', 'returned', 'resubmitted'],
            default: 'draft',
            index: true
        },
        isLate: {
            type: Boolean,
            default: false,
            index: true
        },
        latePenalty: {
            type: Number,
            min: 0,
            max: 100
        },
        attemptNumber: {
            type: Number,
            default: 1,
            min: 1
        },
        previousSubmissionId: {
            type: Schema.Types.ObjectId,
            ref: 'LMSSubmission'
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
LMSSubmissionSchema.index({ personId: 1, assignmentId: 1 });
LMSSubmissionSchema.index({ assignmentId: 1, status: 1 });
LMSSubmissionSchema.index({ schoolSiteId: 1, submissionDate: -1 });
LMSSubmissionSchema.index({ assignmentId: 1, submissionDate: -1 });

// Virtual for file count
LMSSubmissionSchema.virtual('fileCount').get(function () {
    return this.submissionFiles?.length || 0;
});

// Virtual for total file size
LMSSubmissionSchema.virtual('totalFileSize').get(function () {
    if (!this.submissionFiles || this.submissionFiles.length === 0) return 0;
    return this.submissionFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
});

// Virtual for final score after late penalty
LMSSubmissionSchema.virtual('finalScore').get(function () {
    if (this.score === undefined || this.score === null) return null;
    if (!this.isLate || !this.latePenalty) return this.score;
    return this.score * (1 - this.latePenalty / 100);
});

// Backward compatibility virtuals (LMS aliases)
LMSSubmissionSchema.virtual('userId').get(function () {
    return this.personId;
});

LMSSubmissionSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const LMSSubmission: Model<ILMSSubmission> = mongoose.models.LMSSubmission || mongoose.model<ILMSSubmission>('LMSSubmission', LMSSubmissionSchema);

export default LMSSubmission;
