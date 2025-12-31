import mongoose, { Schema, Document, Model } from 'mongoose';
import { ISubmissionFile } from './types';

/**
 * LMS Assignment Schema
 * Course assignments with due dates and scoring
 *
 * Integration Note: Maps to LMS Assignment
 * This is kept separate from SMS Assignment model to support
 * LMS-specific features like self-paced deadlines and module context
 *
 * References:
 *   - Subject (unified from Course)
 *   - CourseModule (Module)
 *   - Chapter
 *   - Lesson (optional)
 *   - SchoolSite (unified from Institution)
 *   - Person (unified from User) for addedBy
 */

export interface ILMSAssignment extends Document {
    subjectId: mongoose.Types.ObjectId;
    moduleId?: mongoose.Types.ObjectId;
    chapterId?: mongoose.Types.ObjectId;
    lessonId?: mongoose.Types.ObjectId;
    schoolSiteId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    instructions?: string;
    dueDate?: Date;
    lateSubmissionDate?: Date;
    maxScore: number;
    passingScore: number;
    addedBy: mongoose.Types.ObjectId;
    allowedFileTypes: string[];
    maxFileSize?: number; // bytes
    maxFiles: number;
    rubric?: string;
    isGroupAssignment: boolean;
    maxGroupSize?: number;
    isPublished: boolean;
    publishedAt?: Date;
    academicYear?: string;
    academicTerm?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    submissionCount?: number;
}

const LMSAssignmentSchema = new Schema<ILMSAssignment>(
    {
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
            index: true
        },
        chapterId: {
            type: Schema.Types.ObjectId,
            ref: 'Chapter',
            index: true
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: 'Lesson',
            index: true
        },
        // UNIFIED: References SchoolSite (replaces institutionId)
        schoolSiteId: {
            type: Schema.Types.ObjectId,
            ref: 'SchoolSite',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            maxlength: 512,
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true
        },
        instructions: {
            type: String,
            trim: true
        },
        dueDate: {
            type: Date,
            index: true
        },
        lateSubmissionDate: {
            type: Date
        },
        maxScore: {
            type: Number,
            required: true,
            min: 0,
            default: 100
        },
        passingScore: {
            type: Number,
            min: 0,
            default: 50
        },
        // UNIFIED: References Person
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Person',
            required: true,
            index: true
        },
        allowedFileTypes: [
            {
                type: String,
                trim: true,
                lowercase: true
            }
        ],
        maxFileSize: {
            type: Number,
            min: 0,
            default: 10485760 // 10MB default
        },
        maxFiles: {
            type: Number,
            default: 5,
            min: 1
        },
        rubric: {
            type: String,
            trim: true
        },
        isGroupAssignment: {
            type: Boolean,
            default: false
        },
        maxGroupSize: {
            type: Number,
            min: 2
        },
        isPublished: {
            type: Boolean,
            default: false,
            index: true
        },
        publishedAt: {
            type: Date
        },
        academicYear: {
            type: String,
            trim: true,
            index: true
        },
        academicTerm: {
            type: Number,
            min: 1,
            max: 3
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
LMSAssignmentSchema.index({ subjectId: 1, dueDate: 1 });
LMSAssignmentSchema.index({ subjectId: 1, isPublished: 1 });
LMSAssignmentSchema.index({ schoolSiteId: 1, academicYear: 1 });

// Virtual for submission count
LMSAssignmentSchema.virtual('submissionCount', {
    ref: 'LMSSubmission',
    localField: '_id',
    foreignField: 'assignmentId',
    count: true
});

// Virtual to check if past due
LMSAssignmentSchema.virtual('isPastDue').get(function () {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate;
});

// Virtual to check if accepting late submissions
LMSAssignmentSchema.virtual('isAcceptingLateSubmissions').get(function () {
    if (!this.lateSubmissionDate) return false;
    return new Date() <= this.lateSubmissionDate;
});

// Backward compatibility virtuals (LMS aliases)
LMSAssignmentSchema.virtual('courseId').get(function () {
    return this.subjectId;
});

LMSAssignmentSchema.virtual('institutionId').get(function () {
    return this.schoolSiteId;
});

const LMSAssignment: Model<ILMSAssignment> = mongoose.models.LMSAssignment || mongoose.model<ILMSAssignment>('LMSAssignment', LMSAssignmentSchema);

export default LMSAssignment;
